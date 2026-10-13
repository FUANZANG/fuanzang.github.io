# LLM 应用平台（Dify / Coze）

> 本文基于 2026-10 时点（Dify 158k stars、自部署要求 Docker Compose v2.24+；扣子编程 API v3）。

> 关联：[RAG](/notes/ai/rag)（检索管线）、[Agent Harness](/notes/ai/agent-harness)（工具循环）、[MCP 与工具调用](/notes/ai/mcp-tools)（工具协议）、[前端对接 AI](/notes/ai/ai-frontend-integration)（BaaS 怎么调）。

## 这一层解决什么问题

前面几篇讲的都是"原理"：RAG 管线怎么搭（[RAG](/notes/ai/rag)）、工具循环怎么写（[Agent Harness](/notes/ai/agent-harness)）。自己实现一遍要写向量库、切块、检索、工具调度、会话管理、可观测——**一套下来几千行**。

**LLM 应用平台就是把这些做成可视化编排 + 托管运行时**：拖拽连线搭流程，平台负责跑，你只管调它的 API。

```
原理层        RAG 管线、Agent 循环、工具协议      ← 本系列其他篇
   ↓ 组装
平台层        Dify / Coze：可视化编排 + 托管 BaaS  ← 本篇
   ↓ 或自己实现
代码层        LangChain / 手写 fetch + 向量库      ← 见 前端对接 AI
```

**关键认知：平台不是"低配版手写"，而是不同的取舍**——省掉基础设施与运维，换来编排能力的天花板和对平台的依赖。

## 三条路线怎么选

| | 可视化平台（Dify / Coze） | 框架（LangChain 等） | 全手写 |
|---|---|---|---|
| 上手成本 | 小时级 | 天级 | 周级 |
| 灵活度 | 受平台节点限制 | 高（能写代码） | 最高 |
| 运维 | 平台托管（或自部署一套） | 自己搭 | 自己搭 |
| 可观测 | 平台自带 | 自己接 | 自己接 |
| 典型场景 | 内部工具、原型、快速验证 | 生产系统、定制逻辑 | 极致性能/合规要求 |

**判据**：如果需求能用"节点 + 连线"描述清楚，平台就够；一旦需要在流程中间插入任意业务代码、或对延迟/成本有硬约束，就该下沉到代码层。

## Dify

**定位**：开源的 LLM 应用开发平台——工作流 + RAG + Agent + 模型管理 + 可观测（可对接 Langfuse / Opik / Arize Phoenix）装在一个界面里。

### 开源协议：Apache 2.0 + 两条附加条件

用之前必须知道（**这是法律边界，不是细节**）：

| 条件 | 说明 |
|---|---|
| **多租户限制** | 未经书面授权，**不得用 Dify 源码运营多租户服务**（想拿它做 SaaS 卖给多个客户 → 需商业授权） |
| **LOGO / 版权** | 使用其前端时不得移除或修改控制台/应用里的 LOGO 与版权信息（不涉及前端（`web/` 目录）的用法不受此限） |

对个人自用、企业内部单租户部署，两条都不触发——**但"拿开源版套壳做多租户产品"这条路是明确堵死的**。

### 自部署门槛

```bash
cd dify/docker
cp .env.example .env
docker compose up -d      # 需 Docker Compose v2.24.0+
```

最低 **2 核 CPU / 4 GiB 内存**。这套 compose 起的不止一个服务（API、worker、web、Postgres、Redis、向量库、沙箱…），所以"自部署"意味着**你要维护一个多容器系统**——这是选型时最容易低估的成本。

### 应用类型

发布时选形态，**形态决定了 API 端点和是否带会话状态**：

| 类型 | API mode | 有会话？ | 适合 |
|---|---|---|---|
| Chatbot | `chat` | ✅ | 简单对话机器人 |
| Agent | `agent` | ✅ | 模型自主调工具的对话 |
| Chatflow | `advanced-chat` | ✅ | 带编排的对话（分支、记忆、工具节点） |
| Workflow | `workflow` | ❌ 每次调用独立 | 批处理、单次任务（如"总结这段文本"） |
| 文本生成 | `completion` | ❌ | 无对话的生成任务 |
| 知识库 | knowledge API | — | 直接检索，不经过应用 |

### BaaS：每个应用就是一个 REST API

这是对前端最有价值的一点——**搭完即接口**：

```
Dify Cloud：https://api.dify.ai/v1
自部署：    替换为你的实例地址

鉴权：Authorization: Bearer <应用 API 密钥>
（应用密钥与知识库密钥是两套，别混用；一个应用密钥可服务该应用的所有终端用户）
```

| 能力 | 说明 |
|---|---|
| **blocking / streaming** | 同一次调用可选一次性返回或 **SSE 流式**——流式消费方式见 [AI 流式输出](/notes/ai/ai-streaming) |
| **工具接入** | 内置工具 + **导入 OpenAPI(Swagger) 规范**自动生成工具 + **连接 MCP 服务器**导入工具 |
| **工作流转工具** | 把已发布的工作流变成工具，在多个应用间复用同一段逻辑 |
| **运行历史** | 按 `workflow_run_id` 查状态/输出/token 用量，支持断线后**恢复事件流** |

## Coze（扣子）

**定位**：字节跳动的一站式 AI 智能体开发平台，**主打零代码**——不写代码就能搭出机器人，再一键发到各种渠道。分国内站 `coze.cn` 与国际站 `coze.com`（模型与渠道不同，选之前先确认在哪个站）。

### 四个核心概念

| 概念 | 含义 | 前端类比 |
|---|---|---|
| **会话 Conversation** | 一段完整问答交互，自动处理上下文截断 | 一个聊天室 |
| **消息 Message** | 一条用户/智能体消息（文本、图片、文件） | 一条 chat record |
| **对话 Chat** | 对智能体的一次调用，产生若干消息 | 一次 API 请求 |
| **上下文段落 Section** | 会话内独立的上下文分段；清除上下文即新建 Section | 清空上下文按钮 |

这套模型比"messages 数组"重，但换来的是**服务端帮你管上下文**——前端不用每轮重发历史（对照 [LLM 基础概念](/notes/ai/llm-fundamentals)里的无状态 API）。

### 发布渠道：Coze 的护城河

搭好的智能体可以直接发布到（**这是它和 Dify 最大的差异**）：

```
扣子商店        上架让其他开发者发现
飞书            群聊 / 多维表格里直接对话
微信            客服 / 服务号 / 订阅号
掘金            评论区 @ 调用
API             HTTP 直接调（服务端集成）
Chat SDK        一个 JS 库，网页右下角悬浮窗
```

**Chat SDK 是前端最省事的接法**：引一个 JS 库就有完整对话悬浮窗，连 UI 都不用写。

### API 要点

```
Base：https://api.coze.cn
发起对话：POST /v3/chat      （另有工作流执行、文件上传等）
鉴权：Authorization: Bearer pat_xxx   （个人访问令牌；线上建议换 OAuth）
```

额度与限流（个人免费版）：**累计 500 次免费 API 调用**，超出后账号无法再调 API；发起对话 20 QPS、模型 300 RPM。请求体上限：工作流 20MB、其他 15MB。

## Dify vs Coze

| | Dify | Coze 扣子 |
|---|---|---|
| 开源 | ✅ 可自部署（Apache 2.0 + 附加条件） | ❌ 纯托管 |
| 编排能力 | 工作流 / Chatflow / Agent 节点，细 | 插件 + 工作流，偏零代码 |
| 模型自由度 | 高（模型无关，可接任意兼容端点） | 平台提供，可选项随版本变 |
| 渠道分发 | 无（自己接 API） | **强**（飞书/微信/商店/SDK） |
| 数据在哪 | 自部署＝全在自己机器 | 平台侧（国内站数据在境内） |
| 多租户 | 开源版**明确禁止**（需商业授权） | 平台版按套餐 |
| 适合 | 要私有化、要接自家模型、要定制流程 | 要快速上线、要发到社交/办公渠道 |

**一句话**：**要私有化和模型自由度选 Dify，要渠道分发和零代码选 Coze。**

## 前端视角：对接要点

平台的 API 对前端来说就是"多了一个后端"，但有几处和直连模型不同：

+ **密钥仍然不能放前端**——平台 API 密钥同样是凭证，走自有代理或 Serverless（见 [前端对接 AI](/notes/ai/ai-frontend-integration)）
+ **流式消费完全一样**——Dify 的 streaming 和 Coze 的流式接口都是 SSE，[AI 流式输出](/notes/ai/ai-streaming)那套 `fetch + ReadableStream` 直接复用
+ **会话 ID 要前端存**——Dify 的 `conversation_id` / Coze 的 `conversation_id` 都是续接上下文的关键，丢了就等于新开一段对话
+ **错误码要看平台文档**——平台的报错比模型 API 多一层（配额、应用未发布、工作流节点失败），别一律当"网络错误"处理
+ **零代码平台的 UI 别硬套**——Coze Chat SDK 给的悬浮窗开箱即用，但定制能力有限；要自己的交互就得走 API 自己写 UI（见 [AI 交互模式](/notes/ai/ai-interaction-patterns)）

## 选型边界

**用平台**：
+ 内部工具、运营后台的 AI 功能——几天要上线
+ 原型验证阶段，先确认需求成立再谈架构
+ 需要发到飞书/微信等渠道（Coze 这类渠道集成自己写成本很高）

**别用平台**：
+ 流程中间需要插入**任意业务代码**（平台节点表达不了，会被逼到奇怪的工作区）
+ 对延迟、成本有硬指标（多一层平台 = 多一层开销与不可控）
+ **数据不能出内网**且不想维护自部署（那就该走代码层 + 私有模型，见 [本地大模型](/notes/ai/local-llm)）
+ 要拿它做多租户产品（Dify 开源版明文禁止）

**迁移风险要提前想**：平台的编排是**平台特有的 DSL**，导出后换一家基本要重搭。所以**别把核心业务逻辑锁在平台里**——把平台当"编排壳"，真正的规则和数据留在自己这边。

## 学习路径建议

1. 先用 Dify Cloud 免费额度搭一个"上传文档 → 问答"的应用，体会"搭完即 API"
2. 用 `curl` 调它的 streaming 接口，看 SSE 长什么样——和自己手写 RAG 的输出对比
3. 本地 `docker compose up -d` 自部署一次，数一下起了几个容器——这是"自部署"的真实成本
4. 在 Coze 搭同一个问答机器人，发布到飞书，体验渠道分发的省事程度
5. 把同一个需求用三条路线各估一遍工作量（平台 / LangChain / 手写），形成自己的选型直觉

## 参考

+ [Dify 官方文档](https://docs.dify.ai) · [Dify API 快速开始](https://docs.dify.ai/zh/api-reference/guides/get-started) · [GitHub（含 LICENSE）](https://github.com/langgenius/dify)
+ [扣子编程 · API 介绍](https://docs.coze.cn/developer_guides_coze_api_overview) · [了解项目发布](https://docs.coze.cn/guides_publish_overview)
+ 本站：[RAG](/notes/ai/rag) · [Agent Harness](/notes/ai/agent-harness) · [MCP 与工具调用](/notes/ai/mcp-tools) · [前端对接 AI](/notes/ai/ai-frontend-integration)
