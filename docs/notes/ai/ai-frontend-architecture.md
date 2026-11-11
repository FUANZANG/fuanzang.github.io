# AI 应用前端架构

> 本文基于 2026-11 时点。对接与协议见 [前端对接 AI](/notes/ai/ai-frontend-integration)、[AI 流式输出](/notes/ai/ai-streaming)；单点交互形态见 [AI 交互模式](/notes/ai/ai-interaction-patterns)。本篇讲**整页怎么搭**：会话壳、状态边界、工具/审批/产物区、和 BFF 的分工。
>
> 关联：[AI 应用工程化](/notes/ai/ai-app-engineering)、[Agent 沙箱](/notes/ai/agent-sandbox)、[LangGraph](/notes/ai/langgraph)（HITL）、[Agent 基建](/notes/ai/agent-infra)。

## 定位：不是再做一个 Chat Demo

通用前端架构（路由 / 状态库 / 微前端）另有专篇；AI 产品额外要一起设计的是这几块：

```
┌─ 会话壳（thread 列表 / 当前会话 / 新建与归档）─────────────┐
│  ┌─ 消息轨（用户 / 助手 / 系统 / 工具结果）──────────────┐ │
│  │  流式区 · 停止 · 重生成 · 引用 / 来源                  │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌─ 过程轨（可选）步骤流 / 工具卡片 / 审批条 ───────────┐ │
│  └────────────────────────────────────────────────────┘ │
│  ┌─ 产物区（可选）预览、下载、版本 ─────────────────────┐ │
│  └────────────────────────────────────────────────────┘ │
│  输入区（附件 · 模式切换 · 预算提示）                      │
└─────────────────── 经 BFF / Agent API 出入 ───────────────┘
```

判据：用户要的是「对话」「结果」还是「过程」——形态选型仍看 [交互模式](/notes/ai/ai-interaction-patterns)；本篇假定你要做**可持续演进的 Agent / 助手页**，而不是一次性玩具聊天框。

## 四条边界（先画清再写组件）

| 边界 | 放前端 | 放 BFF / 后端 |
|---|---|---|
| **密钥与模型路由** | 永不放 | 代理、限流、审计（[对接篇](/notes/ai/ai-frontend-integration)） |
| **会话权威状态** | 可缓存展示 | `thread_id` / run 状态以服务端为准 |
| **工具真实执行** | 只展示意图与结果 | 执行与权限在信任域 / 沙箱 |
| **高危副作用** | 审批 UI | interrupt / 策略引擎决定能否继续 |

前端类比：浏览器是「观察者 + 操作台」，不是「带密钥的执行器」。

## 信息架构：三轨而不是一坨消息

把 UI 拆成三条轨，比「一个 `messages[]` 塞万物」好演进：

1. **对话轨**：对人读的文本（含流式中的 partial）
2. **过程轨**：tool_call / 日志 / 审批（默认可折叠）
3. **产物轨**：文件、预览 URL、图表、代码工件

协议层若用 UI Message Stream / AG-UI，一类 `part` 对应一类轨——渲染时按 type 分流，而不是全打成气泡。

```ts
type UiPart =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; args: unknown; status: 'running' | 'done' | 'error'; result?: unknown }
  | { type: 'approval'; id: string; action: string; payload: unknown }
  | { type: 'artifact'; id: string; kind: 'html' | 'file' | 'image'; url: string }

type UiMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  parts: UiPart[]
  status: 'pending' | 'streaming' | 'ready' | 'error'
}
```

会话壳只持有：`threads`、`activeThreadId`、当前 run 的 `status`（含 `needs-approval`）。消息细节进按 thread 分片的 store，避免一个巨型全局数组。

## 状态机：一页一个 Run

一次用户发送 = 一次 **run**（可与后端 run / LangGraph thread 对齐）：

```
idle → submitting → streaming ─┬→ ready
                               ├→ needs-approval → streaming / ready / failed
                               └→ failed / aborted
```

| 状态 | UI 要做什么 |
|---|---|
| `streaming` | 开停止键；禁用重复发送或明确「排队」策略 |
| `needs-approval` | 高亮审批条；展示参数可编辑；approve / deny / edit |
| `aborted` | 保留已上屏内容；标记「用户停止」 |
| `failed` | 可重试；不要清掉上文 |

停止用 `AbortController`（或 SDK 等价物）；重生成 = 新 run + 可选丢弃最后一条助手消息——规则写死在一处，别每个按钮各写一套。

## BFF：AI 页的默认后端形状

生产默认仍是「前端 → 自有 BFF → 模型 / Agent」：

```
浏览器
  → POST /api/threads/:id/runs   （鉴权 Cookie / JWT）
  → SSE / stream                 （token + tool + approval 事件）
  → POST /api/approvals/:id      （resume）
  → GET  /api/artifacts/:id      （预签名或同域代理）
```

BFF 职责：

+ 藏 Key、做用户鉴权与配额
+ 把上游事件收成前端稳定协议（换模型不换 UI）
+ 会话持久化与权限（用户只能看自己的 thread）
+ 可选：聚合检索引用、打 `trace_id` 方便 [评测与可观测](/notes/ai/ai-eval-observability)

不要把领域规则全塞进 BFF；长图编排仍放 Agent 服务（[接入与部署](/notes/ai/agent-deployment)）。BFF 是适配层。

## 工具卡片与审批

过程轨的最小组件契约：

```ts
type ToolCardProps = {
  name: string
  args: unknown
  status: 'running' | 'done' | 'error'
  result?: unknown
}

type ApprovalBarProps = {
  action: string
  payload: unknown
  onApprove: (edited?: unknown) => void
  onDeny: () => void
}
```

原则：

+ **参数默认可读、高危可改**：改的是 resume 载荷，不是让模型「再猜一次」代替人审
+ **审批是按钮，不是 Prompt**：后端 interrupt，前端只渲染（见 [交互模式 · Agentic](/notes/ai/ai-interaction-patterns)、[LangGraph HITL](/notes/ai/langgraph)）
+ **权限文案要人话**：「将在沙箱执行 `npm test`」比丢一坨 JSON 有用

## 产物区

Coding / 漫剧 / 报表类助手需要第三轨：

+ 列表：本 run / 本 thread 的 artifact（名、类型、时间、版本）
+ 预览：iframe / 图片 / 下载；注意 CSP 与临时 URL 过期（[沙箱](/notes/ai/agent-sandbox)、[基建](/notes/ai/agent-infra)）
+ 与对话交叉引用：消息里 `[产物 #3]` 可点进产物轨

产物元数据进后端；前端只持 URL 与展示态，避免大文件进 IndexedDB。

## 目录与模块（建议）

按**轨 / 用例**切，而不是按技术层切太碎：

```
src/
  features/ai-assistant/
    session/          # thread 列表、切换、新建
    chat/             # 对话轨 + 输入区
    process/          # 工具卡片、步骤流
    approval/         # 审批条
    artifacts/        # 产物列表与预览
    api/              # BFF 客户端（stream / resume）
    model/            # UiMessage 类型与 reducer
  shared/ui/          # 按钮、折叠、Markdown
```

路由常见两种：

+ `/assistant` 单页三栏（会话 | 对话 | 产物）
+ `/assistant/:threadId` 可分享深链——刷新后靠服务端 hydrate

## 和现有笔记怎么叠

| 问题 | 去哪篇 |
|---|---|
| Key、SDK、代理 | [前端对接 AI](/notes/ai/ai-frontend-integration) |
| SSE / 背压 / 解析 | [AI 流式输出](/notes/ai/ai-streaming) |
| 对话 / 内嵌 / 生成 / Agent 形态 | [AI 交互模式](/notes/ai/ai-interaction-patterns) |
| 成本、超时、安全 | [AI 应用工程化](/notes/ai/ai-app-engineering) |
| 沙箱执行与权限 | [Agent 沙箱](/notes/ai/agent-sandbox) |
| 网关与预签名 | [Agent 基建](/notes/ai/agent-infra) |

本篇只定**骨架与边界**；实现细节不重复抄。

## 学习路径建议

1. 用现有聊天 demo，把 `content: string` 改成 `parts[]`，先分流 text / tool
2. 加假审批：流里推一个 `approval` part，UI 点批准后再 `POST resume`
3. 接上真实 BFF 流式，刷新页面后从 `threadId` 恢复消息
4. 加产物轨：跑通「生成 HTML → 预览 URL → 消息内锚点」
5. 对照 [交互模式](/notes/ai/ai-interaction-patterns) 检查：停止、重生成、失败降级是否都挂在同一 run 状态机上

## 参考

+ [AI SDK UI · Chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) · [AG-UI / 事件流思路](https://ai-sdk.dev/)
+ 本站：[前端对接 AI](/notes/ai/ai-frontend-integration) · [AI 流式输出](/notes/ai/ai-streaming) · [AI 交互模式](/notes/ai/ai-interaction-patterns) · [AI 应用工程化](/notes/ai/ai-app-engineering)
