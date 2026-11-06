# Agent 接入与部署

> 本文基于 2026-11 时点的接入与部署实践（MCP 2026-07-28 无状态规范、LangGraph 生产 checkpointer 配置、OpenAI Agents SDK 0.24 的 durable execution 集成）。
>
> 关联：[Agent 框架生态](/notes/ai/agent-frameworks)（选型）、[Agent 设计模式](/notes/ai/agent-patterns)（循环与沙箱）、[LLM 应用平台](/notes/ai/llm-app-platforms)（BaaS 路线）、[AI 前端对接](/notes/ai/ai-frontend-integration)（客户端接入）。

## 定位：从"选好了"到"跑在生产里"

框架篇回答了"挑哪个"，本篇回答挑完之后的三个问题：

1. **agent 住哪**：接入现有系统的三种形态
2. **谁触发它**：交互式只是其一，还有无人值守的事件驱动
3. **怎么活下来**：会话状态、进程重启、超时、凭据——agent 生产化与普通服务化的差别

## 接入三形态

| 形态 | 循环住哪 | 怎么连 | 状态谁管 | 适合 |
|---|---|---|---|---|
| **进程内 SDK** | 你自己服务的进程里（库） | 直接函数调用 | 你（DB 在你手里） | 定制深、单团队；TS：Mastra / Vercel AI SDK，Python：LangGraph / Pydantic AI |
| **agent-as-service** | 独立服务 | REST + SSE | 那个服务 | 多团队复用、前后端分离；LangGraph 自托管 / 厂商托管 agent / 自建服务 |
| **BaaS 平台** | 厂商云 | REST + SSE | 平台 | Dify / Coze"搭完即接口"，见 [平台篇](/notes/ai/llm-app-platforms) |

判据就一条：**谁拥有循环、谁拥有会话状态**——拥有 = 能定制但要自己运维；对方拥有 = 开箱即用但被锁定。

前端类比：进程内 ≈ 写 composable；agent-as-service ≈ 写 axios 客户端；BaaS ≈ 接地图 / 支付 SDK。

## 触发形态：交互不是全部

| 触发 | 形态 | 人机界面 | 例子 |
|---|---|---|---|
| 交互式 | 用户聊天 | 聊天面板 + 流式 + 审批按钮 | 编码助手、客服 |
| 内嵌式 | 页面里触发 | 行内 / 浮层 | 智能表单补全（[交互模式篇](/notes/ai/ai-interaction-patterns)） |
| **事件驱动** | cron / webhook / 队列 | **没有 UI**：fire-and-forget，结果回推 | 夜间报表、监控告警根因、订单 webhook 触发退款流 |

**webhook**（事件回调）：别的系统在某事发生后主动调你的 URL 通知你——agent 接到通知后自行开跑。

事件驱动的关键差异：agent **无人值守**运行 → 三道护栏是必需品而非选项：步数预算、权限审批（高危动作停下等人工，或降级为"先草拟、人来批"）、失败告警。触发器本身可以很薄（Vercel cron、GitHub Actions、队列消费者），但主体必须满足下面生产化四件。

## 生产化四件（与普通服务化的差别）

1. **会话状态**：agent 是长任务，循环是**有状态**的——checkpointer（把每个"超级步"存成快照的机制，框架篇有定义）要放 Postgres / Redis（LangGraph 生产配置）；进程重启时没有快照就得从头跑或崩
2. **durable execution**：有副作用（发邮件、改单）时接工作流引擎（Temporal / DBOS / Restate），保证崩溃恢复时**副作用只执行一次**——不然重启 = 重复发邮件
3. **超时矛盾**：serverless 函数超时（常见上限 15 分钟）vs 24h agent 会话 → serverless 只做**入口层**（收请求、起任务、转发），循环主体住常驻进程；代码执行住托管沙箱（E2B Pro 会话上限 24h，[模式篇](/notes/ai/agent-patterns)）
4. **凭据与出口**：secrets 留在循环层、不进沙箱，按需注入；出站白名单、默认封死云元数据端点

扩展性上，MCP 2026-07 无状态化（[MCP 篇](/notes/ai/mcp-tools)）让**工具层**可以像普通无状态微服务一样水平扩；瓶颈在会话状态层——先按会话分片，而不是无脑加机器。

## 部署形态一图流

```
入口层     serverless / 边缘 / 定时任务：收请求、起任务、转发（不跑循环）
   ↓
循环层     常驻进程 / 容器：agent 主体
   ├─ 状态：Postgres / Redis（checkpointer）
   ├─ durable：Temporal / DBOS（有副作用时）
   └─ 凭据：留在这一层，注入沙箱但不驻留
   ↓
执行层     沙箱：代码 / shell 进 E2B / microVM（模式篇隔离阶梯）
   ↓
观测层     trace / token / 工具失败率 → 评测门禁（AI 评测与可观测篇）
```

## 前端视角

+ agent-as-service ≈ 你写过的任何 Node 服务，只是响应从"请求-响应"变成"会话 + 流"——流式消费直接复用 [AI 流式输出](/notes/ai/ai-streaming) 那套
+ 事件驱动 agent 的结果回推 ≈ 你的通知中心：队列 → 邮件 / IM / webhook
+ 审批 UI = 框架 interrupt + 确认按钮（模式篇），前端心智模型不变
+ BaaS 形态下前端的全部工作：连 REST + 流式 + 会话 ID——其余平台包了

## 学习路径建议

1. 取一个进程内 agent（Vite/Node），checkpointer 先落 SQLite，验证"暂停 → 重启进程 → 从检查点继续"
2. 给一步加副作用（发邮件 / 写文件），中途 `kill -9`，看是否重复执行——体会 durable execution 在防什么
3. 改成事件驱动：cron 触发"夜间摘要 agent"，结果写文件 / IM，体验无人值守三道护栏
4. 接 [AI 评测与可观测](/notes/ai/ai-eval-observability) 的 trace + 成本监控
5. 需要多团队复用时抽成独立服务，前端只留 REST / SSE + 会话 ID

## 参考

+ [LangGraph（含 checkpointer 生产配置）](https://langchain-ai.github.io/langgraph/) · [OpenAI Agents SDK（durable execution 集成）](https://github.com/openai/openai-agents)
+ [Temporal](https://temporal.io) · [DBOS](https://www.dbos.dev) · [Restate](https://restate.dev)
+ 本站：[Agent 框架生态](/notes/ai/agent-frameworks) · [Agent 设计模式](/notes/ai/agent-patterns) · [LLM 应用平台](/notes/ai/llm-app-platforms) · [AI 评测与可观测](/notes/ai/ai-eval-observability)
