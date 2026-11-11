# LangGraph 实战

> 本文基于 2026-11 时点的 LangGraph 1.x（图编排 + CheckPointer + Agent Server）。框架选型见 [Agent 框架生态](/notes/ai/agent-frameworks)；本篇只讲**怎么把图跑起来、状态怎么活、人怎么介入**。
>
> 关联：[Agent 设计模式](/notes/ai/agent-patterns)（ReAct / Plan-Execute）、[Agent 接入与部署](/notes/ai/agent-deployment)（生产化）、[Agent 记忆系统](/notes/ai/agent-memory)（长期记忆 vs 线程状态）、[AI 评测与可观测](/notes/ai/ai-eval-observability)。

## 定位：低层编排运行时

LangGraph 不是「再包一层 Prompt」。它把 agent 循环显式化成**图**：

```
节点（node）= 一步计算（调模型 / 调工具 / 纯代码）
边（edge）  = 下一步去哪（固定边 / 条件边）
状态（state）= 全图共享的 TypedDict / dataclass，经 reducer 合并
编译（compile）→ 可调用的 Runnable / Agent
```

一句话：**确定性步骤与模型步骤可以画在同一张图里**；暂停、恢复、时间旅行靠 CheckPointer，不靠自己手写状态机。

适合上 LangGraph 的信号：多步分支、要 HITL、要可恢复长任务、要子图复用。只做单轮工具调用 → [Python LLM 开发](/notes/ai/python-llm-apps) / Pydantic AI 更轻。

## 核心原语（先认脸）

| 原语 | 干什么 |
|---|---|
| **StateGraph** | 声明状态 schema + 加节点/边 |
| **channel / reducer** | 同一字段多次写入时怎么合并（覆盖 vs 追加消息列表） |
| **条件边** | 按状态走不同节点（路由、重试、结束） |
| **Super-step** | 一次「图推进」的原子单位；并发节点在同一步里一起跑 |
| **CheckPointer** | 每步快照；键通常是 `thread_id` |
| **interrupt** | 图内暂停，等人或外部系统 |
| **Command** | 恢复/改状态/跳转的统一指令（`update` / `goto` 等） |
| **Store** | 跨线程的长期记忆存储（≠ 线程内 checkpoint） |

消息列表几乎总是「追加 reducer」；计数器、当前阶段则是覆盖。schema 设计错了，后面全是合并鬼故事。

## 最小图：工具循环

概念上等价于手写 ReAct，但状态与边显式：

```
START → agent（模型决定：回答 or 调工具）
          ├─ 有 tool_calls → tools → 回到 agent
          └─ 无 tool_calls → END
```

落地时注意三件事：

1. **状态里至少有 messages**（以及你业务需要的槽位：订单号、草稿、重试次数）
2. **ToolNode**（或自写工具节点）负责执行，模型只产出调用意图——原则与 [MCP 与工具调用](/notes/ai/mcp-tools) 一致
3. **Fake / Mock Model** 先测图拓扑，再接真模型——图测的是边与状态，不是文采

最小可跑骨架（先不接真模型，验证「状态 + 条件边 + 编译」）：

```python
# pip: langgraph
from typing import Annotated, Literal, TypedDict
from operator import add
from langgraph.graph import StateGraph, START, END

class State(TypedDict):
    messages: Annotated[list[str], add]  # 追加合并，不是覆盖
    need_tool: bool

def agent(state: State) -> State:
    # 真项目里这里调模型；演示用规则代替
    text = state["messages"][-1]
    return {"need_tool": text.startswith("查："), "messages": [f"agent看了: {text}"]}

def tools(state: State) -> State:
    return {"messages": ["tool结果: ok"], "need_tool": False}

def route(state: State) -> Literal["tools", "__end__"]:
    return "tools" if state["need_tool"] else "__end__"

g = StateGraph(State)
g.add_node("agent", agent)
g.add_node("tools", tools)
g.add_edge(START, "agent")
g.add_conditional_edges("agent", route, {"tools": "tools", "__end__": END})
g.add_edge("tools", "agent")
app = g.compile()

print(app.invoke({"messages": ["查：天气"], "need_tool": False})["messages"])
# → 含 agent看了 / tool结果 / agent看了（第二轮 need_tool=False 结束）
```

## CheckPointer：暂停、恢复、时间旅行

没有 CheckPointer，进程一挂，图就从零开始。有了它：

| 能力 | 含义 |
|---|---|
| **恢复** | 同一 `thread_id` 接着上次快照跑 |
| **时间旅行** | 从某个 checkpoint fork / replay |
| **HITL** | `interrupt` 后把快照挂起，人批准再用 `Command(resume=...)` 继续 |

生产默认把 CheckPointer 放到 **Postgres**（或官方支持的持久后端），别用内存版上线。线程（Thread）≈ 一次会话/一次任务的状态轴；清理策略要显式（保留多久、谁有权删）。

和 [记忆系统](/notes/ai/agent-memory) 切开：

+ **Checkpoint** = 这条线程跑到哪了（执行状态）
+ **Store / 记忆** = 跨线程仍想记住的事实与偏好

内存 CheckPointer + 同线程恢复（生产换成 Postgres 后端即可）：

```python
from langgraph.checkpoint.memory import MemorySaver

# 接上节的 g
app = g.compile(checkpointer=MemorySaver())
cfg = {"configurable": {"thread_id": "demo-1"}}

app.invoke({"messages": ["查：订单"], "need_tool": False}, cfg)
# 进程哪怕重启（持久后端时），同一 thread_id 可从快照继续：
# app.invoke({"messages": ["继续"], "need_tool": False}, cfg)
```

## HITL 与容错

人在回路不是「加个 confirm 按钮」这么简单，图里要预留中断点：

```
高危工具前 interrupt → 人审参数 → resume / 改参数再跑
质量门禁 interrupt → 人改草稿 → 再进下一节点
```

概念代码（节点内打断，外部再 resume）：

```python
from langgraph.types import interrupt, Command

def risky_write(state: State) -> State:
    # 把待执行参数抛给调用方；图在此暂停并落 checkpoint
    decision = interrupt({"action": "write_file", "path": "src/x.ts"})
    if decision.get("approve") is not True:
        return {"messages": ["已拒绝写入"]}
    return {"messages": [f"已写入（备注: {decision.get('note', '')})"]}

# 恢复：app.invoke(Command(resume={"approve": True, "note": "LGTM"}), cfg)
```

容错常用组合：

+ **重试策略**：模型抖动、工具 429——有上限、有退避
+ **超时**：单节点与整图分别设
+ **兜底边**：失败次数超限 → 降级节点或结束并告警
+ **运行取消**：用户点停止 = 取消当前 run，而不是假装跑完

`Command` 把「改状态」「跳节点」「恢复」收成一种出口，避免每个节点私自 `if` 跳转导致图不可读。

## Agent Server 与 Studio

本地库模式适合嵌入你的 FastAPI/业务进程；需要「多团队复用、独立扩缩、带 UI 调试」时，上 **LangGraph Agent Server**：

| 能力 | 用途 |
|---|---|
| Thread / Run / Cron / Assistant API | 会话、一次执行、定时、可配置助手 |
| Studio | 可视化图、断点、看状态 |
| 事件流 | 前端 SSE/流式进度（对接 [AI 流式输出](/notes/ai/ai-streaming)） |
| MCP 暴露 | 把 agent 能力以工具形式给别的 agent（与 [A2A](https://a2a-protocol.org/) 分工：MCP 管工具，A2A 管 agent 对等协作） |

部署形态选择仍回到 [接入与部署](/notes/ai/agent-deployment)：进程内 SDK vs agent-as-service。

## 进阶模式（用到再深挖）

+ **子图**：评审、修订、检索各成子图，主图只编排
+ **dynamic fan-out / map-reduce**：一步拆多任务并行，再汇合
+ **工具遮蔽 / 动态系统提示**：按 Runtime Context 换可用工具与人设
+ **多任务策略**：同线程排队 vs 取消旧 run——产品语义先定死

## 前端视角

+ StateGraph ≈ 显式状态机 + 异步任务队列，而不是隐式 `while` 循环
+ CheckPointer ≈ 带 undo/redo 的持久 store；`thread_id` ≈ 会话主键
+ interrupt / resume ≈ 审批弹窗的前后端协议
+ Studio ≈ 把后端状态机可视化——联调时比只看日志快一个数量级

## 学习路径建议

1. 用官方快速入门跑通「模型 + 一个工具」的图，打印每步 state
2. 加上内存 CheckPointer，故意杀掉进程再 `thread_id` 恢复
3. 在写文件/发请求前加 `interrupt`，用 resume 走通 HITL
4. 把「生成 → 评审 → 不合格则修订」画成子图循环（类似课里的漫剧分镜流）
5. 需要网关、沙箱、评测时分别接 [Agent 基建](/notes/ai/agent-infra)、[Agent 沙箱](/notes/ai/agent-sandbox)、[评测与可观测](/notes/ai/ai-eval-observability)

## 参考

+ [LangGraph 文档](https://langchain-ai.github.io/langgraph/) · [LangGraph Studio](https://langchain-ai.github.io/langgraph/concepts/langgraph_studio/)
+ 本站：[Agent 框架生态](/notes/ai/agent-frameworks) · [Agent 设计模式](/notes/ai/agent-patterns) · [Agent 接入与部署](/notes/ai/agent-deployment)
