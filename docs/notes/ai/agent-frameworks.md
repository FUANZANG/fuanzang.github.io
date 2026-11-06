# Agent 框架生态与选型

> 本文基于 2026-11 时点生态（LangGraph 1.x / OpenAI Agents SDK 0.24 / Claude Agent SDK 0.3.x / Google ADK 2.13 / Mastra 1.82 / Microsoft Agent Framework 1.0），版本号取自 2026-11-06 的 npm 与 PyPI。
>
> 关联：[Agent Harness](/notes/ai/agent-harness)（概念与七层）、[Agent 设计模式](/notes/ai/agent-patterns)（循环长什么样）、[MCP 与工具调用](/notes/ai/mcp-tools)（工具协议）、[LLM 应用平台](/notes/ai/llm-app-platforms)（可视化路线）。

## 定位：四条路线之一

平台篇给过"可视化平台 / 框架 / 全手写"的三路线表；本篇把**框架 + 厂商 SDK** 这一层做透。一句话：框架 = "循环怎么写、状态怎么管"的工程底座——设计模式篇的 ReAct / Plan-Execute / Reflexion，在这些框架里都是现成的 API。

## 生态版图（认脸）

| 框架 | 语言 | 核心抽象 | 协议 | 定位一句话 |
|---|---|---|---|---|
| **LangGraph**（1.2.20 py / 1.7.1 js） | Python / TS | 图：节点 + 边 + 共享状态 | MIT | "低层编排运行时"：确定性步骤与模型步骤混编在同一张图；checkpointer 让暂停/恢复/回退免费 |
| **OpenAI Agents SDK**（0.24.0 py / 0.21.0 js） | Python / TS | 四个原语：agent / 工具 / handoff / guardrail | MIT | API 面小；默认 OpenAI，beta 适配器可接 100+ 模型；自带 tracing |
| **Claude Agent SDK**（0.2.17x py / 0.3.318 ts） | Python / TS | "Claude Code 的循环，做成库" | Anthropic 商用条款 | 内置读写/bash/搜索工具 + hooks + 子代理 + MCP + 权限系统；"编码助手"形态的成品 |
| **Google ADK**（2.13.0 py） | Python / Go / Java / Kotlin / TS | agent 图 + 会话服务 | Apache-2.0 | 多语言最宽；A2A 原生；部署走 Vertex |
| **CrewAI**（0.11.2 py） | Python | 角色制 crews + 事件驱动 Flows | 开源 | "给 agent 分角色协作"，另一条状态流 Flows 管确定性流程 |
| **Mastra**（1.82.0） | TS（Node） | agents + 类型化 workflows + memory + evals 全家桶 | Apache-2.0（`ee/` 目录 source-available） | TS 原生首选；长任务 suspend/resume 可接 Inngest / Temporal |
| **Microsoft Agent Framework**（1.0，2026-04 GA） | .NET / Python | agents + 图工作流 + 中间件 | 开源 | AutoGen 与 Semantic Kernel 的**合并继任者**（两者 2025-10 起维护模式）；.NET / Azure 企业的路线 |
| **AG2**（1.2.x py） | Python | 多 agent 会话 | Apache-2.0 | AutoGen 原作者的社区 fork，接手 `autogen` 包名；活跃，但新项目慎作起点 |

认脸即可：**Pydantic AI**（2.66.0，Python 类型安全、结构化输出取向）——不选框架、只想要"类型安全的 LLM 调用 + 工具"时用它（落地写法见 [Python LLM 开发](/notes/ai/python-llm-apps)）。

几个名词：

+ **handoff**：把"对话主导权"移交给另一个 agent（≈ 事件总线的转发）；**guardrail**：输入/输出的护栏校验（≈ axios 拦截器，但校验的是内容不是状态码）
+ **checkpointer**：每个"超级步"（agent 循环的一轮）写一个快照，键是 thread_id——暂停、恢复、时间旅行调试都靠它
+ **durable execution（持久执行）**：agent 循环放在工作流引擎（Temporal / DBOS / Restate）上，保证**副作用只执行一次**——崩溃恢复时不会把"已发的邮件再发一遍"

## 2026 的新维度：durable execution

agent 的真实特征是**长任务 + 副作用**：跑一半进程挂了，"那步已经执行过了吗？"普通工作流的这个问题在 agent 圈叫 durable execution。各家已收敛出同一套原语：

| 框架 | 暂停 / 审批原语 | 恢复方式 |
|---|---|---|
| LangGraph | `interrupt()` | `Command(resume=...)` |
| OpenAI Agents SDK | `needs_approval` | 序列化 `RunState` 存下，重启后 `RunState.approve()`；durable 走 Temporal / DBOS / Restate |
| Claude Agent SDK | `canUseTool` 回调 | `defer` 退出，会话可 resume |
| Mastra | 工具上 `requireApproval` | `suspend()` / resume，Inngest / Temporal 执行器 |

前端类比：这就是把"表单提交幂等键 + 断点续传"搬到了 agent 循环上。**选型时这一维度比"功能列表"更决定生产可用性**——先问"副作用如何保证只执行一次"。

## 选型判据

按"从便宜到贵"问三个问题：

1. **真的要框架吗？** 教学用途 / 需要绝对控制 / 极致省 token → 手写 `fetch + while` 循环（百行以内）；平台篇的 Dify / Coze 能覆盖"节点 + 连线"就先用平台
2. **语言？** TS → **Vercel AI SDK**（轻，只做调用层）或 **Mastra**（全家桶）；Python → **Pydantic AI**（简单任务）或 **LangGraph**（要图化工作流 + 检查点）
3. **是否已押注某模型厂商？** 押了 → 用厂商 SDK（OpenAI Agents SDK / Claude Agent SDK / ADK 对 Gemini）；.NET / Azure 栈 → Microsoft Agent Framework

两个特殊判据：

+ "agent = 编码助手"形态（要内置文件 / shell / 浏览器工具 + 权限体系）→ **Claude Agent SDK** 是成品 harness，别自己搭
+ 锁定的不只是框架本身，是 **"durable execution + 部署"组合**（LangSmith 部署 / Vertex / Azure AI Foundry）——选型前把这一层也看清楚

选完之后的下一步——挂到现有系统、事件驱动触发、会话状态与上线——见 [Agent 接入与部署](/notes/ai/agent-deployment)。

## 语言选型（判据的补充）

+ **生态引力**：agent 工具是 Python 先行——版图里 CrewAI / AG2 / Pydantic AI 只有 Python，LangGraph / ADK / OpenAI Agents SDK 的 Python SDK 是参考实现；记忆层（Mem0 / Letta / Graphiti）同样。TS 是原生第二梯队：Mastra、Vercel AI SDK、@langchain/langgraph-js、Claude Agent SDK TS、E2B JS SDK。Python 选项多，TS 选项少但全是一等公民
+ **跑在哪决定语言**：agent 循环活在持有会话的那个进程里——那个服务用什么语言，agent 就用什么；agent 在浏览器（WebContainer 形态）或边缘（Workers）里跑时，JS/TS 是唯一选项。所以先定"跑在哪"，再回表选框架，而不是先挑语言再想怎么接
+ **前端主场**：用 Node / Vite 写 agent 循环，和你写流式 UI 同构——工具 schema ≈ API 类型，类型贯穿全链路；Python 选项留给数据密集场景

## 协议暗流（认脸）

agent↔agent 的互操作层在 2026 年落了地：**A2A** 2025-06 捐给 Linux Foundation，2026-03 出 v1.0 稳定规范，2026-08 与 MCP、AGENTS.md 一起进入 Linux 基金会 **Agentic AI Foundation**（Growth 项目）。MCP 管 agent↔工具，A2A 管 agent↔agent——mcp-tools 篇说的"MCP 与 A2A 在对齐"已成事实。

## 前端视角

+ Mastra / Vercel AI SDK 是 TS 原生：agent 服务端 ≈ 写一个 Node API，客户端流式消费直接接 [AI 流式输出](/notes/ai/ai-streaming) 那套
+ LangGraph 的 checkpointer ≈ Pinia + undo/redo：每步一个快照，可从任意快照 fork（时间旅行调试）
+ handoff ≈ 事件转发；subagent ≈ Web Worker（主线程不阻塞、只收结果）
+ 框架是 harness 的工程底座：概念在 [Agent Harness](/notes/ai/agent-harness)，循环形态在 [Agent 设计模式](/notes/ai/agent-patterns)，本篇只解决"挑哪个开工"

## 学习路径建议

1. 用 OpenAI Agents SDK（TS）或 Pydantic AI 写一个带两个工具的 agent，体验 handoff 与 guardrail
2. 换成 LangGraph：把同样流程画成图，用 checkpointer + interrupt 实现"跑三步停下等人确认"
3. TS 栈再试 Mastra：给同一 agent 加 memory 与 workflow，体会 suspend/resume 与图执行的区别
4. 接一个记忆后端，见 [Agent 记忆系统](/notes/ai/agent-memory)
5. 选型前必问：副作用如何保证只执行一次（durable execution 怎么落）

## 参考

+ [LangGraph](https://langchain-ai.github.io/langgraph/) · [OpenAI Agents SDK](https://github.com/openai/openai-agents) · [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk)
+ [Google ADK](https://google.github.io/adk-docs/) · [CrewAI](https://docs.crewai.com/) · [Mastra](https://mastra.ai/docs)
+ [Microsoft Agent Framework](https://github.com/microsoft/agent-framework) · [AG2](https://github.com/ag2ai/ag2) · [Pydantic AI](https://ai.pydantic.dev/)
+ [A2A 协议](https://a2a-protocol.org/) · 本站：[Agent Harness](/notes/ai/agent-harness) · [MCP 与工具调用](/notes/ai/mcp-tools)
