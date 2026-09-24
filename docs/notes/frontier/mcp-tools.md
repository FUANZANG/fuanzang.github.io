# MCP 与工具调用

> 本文基于 MCP 2026-07-28 规范（2026 年最大改版：协议无状态化）。工具调用是 [Agent Harness](/notes/frontier/agent-harness) 的 T 层核心，MCP 是工具生态的事实标准协议。

## Function Calling：模型怎么"动手"

LLM 本体只会输出文本，**Function Calling**（工具调用）协议让它能"请求"调用外部函数——注意：**模型只发出调用意图，执行永远在你的应用里**：

```
1. 应用声明工具（JSON Schema 描述）
2. 模型判断需要工具，输出结构化调用意图
3. 应用执行真实函数
4. 结果回喂模型，继续生成
```

```jsonc
// 1. 请求里声明工具
{
  "messages": [{ "role": "user", "content": "北京今天多少度？" }],
  "tools": [{
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "查询指定城市当前天气",
      "parameters": {                       // JSON Schema——前端就是干这个的
        "type": "object",
        "properties": { "city": { "type": "string" } },
        "required": ["city"]
      }
    }
  }]
}

// 2. 模型不直接回答，返回调用意图
{ "tool_calls": [{ "function": { "name": "get_weather", "arguments": "{\"city\":\"北京\"}" } }] }

// 3. 应用执行，把结果以 role=tool 回喂
{ "role": "tool", "tool_call_id": "...", "content": "{\"temp\": 22}" }

// 4. 模型基于真实数据生成最终回答："北京今天 22 度……"
```

关键理解：

+ 模型**看不见也执行不了**任何函数——它只是被训练过"看到工具定义时，输出符合 schema 的调用 JSON"
+ `description` 写得好坏直接决定模型用不用、怎么用这个工具（≈ 给同事写接口文档）
- 前端类比：模型像"只会填表单的用户"，你的应用是"处理表单的后端"

## MCP：工具生态的 USB-C

Function Calling 解决了"单次会话怎么调工具"，但每个 AI 应用 × 每个工具都要单独适配（M×N 问题）。**MCP（Model Context Protocol，Anthropic 2024-11 推出）把它变成 M+N**：

```
没有 MCP：Claude 接 GitHub 要写一遍适配，Cursor 接 GitHub 再写一遍……
有了 MCP：工具方写一次 MCP Server，所有支持 MCP 的客户端都能用
```

**≈ 浏览器与网站的协议**：任何人按 HTML/HTTP 标准建站，任何浏览器都能访问——MCP 之于 AI 工具生态，就是这个协议层。你每天用的 Claude Code、Cursor、Hermes 连接外部能力，走的都是 MCP。

### 架构：Host / Client / Server

```
Host（AI 应用：Claude Code / Cursor / Hermes）
  ├─ Client A ←──→ MCP Server A（GitHub：仓库操作）
  ├─ Client B ←──→ MCP Server B（数据库：查询）
  └─ Client C ←──→ MCP Server C（你自己的业务工具）
```

+ **Host**：跑模型的应用，管权限、管生命周期
+ **Client**：Host 内的连接器，一对一连一个 Server
+ **Server**：暴露能力的独立进程/服务——**看不到完整对话**，只收到必要的调用请求（安全设计）

### 三种原语

| 原语 | 类比 | 谁控制 |
|---|---|---|
| **Tools** | POST 接口（有副作用） | 模型决定调用 |
| **Resources** | GET 接口（读上下文：文件/记录） | 应用挂载 |
| **Prompts** | 预置模板（斜杠命令） | 用户主动触发 |

消息层是 JSON-RPC 2.0；传输两种：本地 **stdio**（子进程，开发工具默认）和远程 **Streamable HTTP**（生产/云端）。

### 2026-07-28 大改版要点

2026 年 7 月的规范是发布以来最大重构，**核心变化：协议无状态化**——

+ 删掉了 initialize 握手和会话头：每个请求自包含（版本/能力放 `_meta` 字段），**任意实例可响应任意请求**——MCP Server 从此可以像普通无状态微服务一样水平扩展、上 K8s、跑 Serverless（Cloudflare Workers 一个 Worker 就是一个 MCP Server）
+ Multi Round-Trip Requests：工具中途要用户确认（"确认支付？"）不再需要挂着长连接
- 旧教程里的 initialize/session 内容已过时，读资料时注意区分"2025-11-25 及以前（有状态）"和"2026-07-28 起（无状态）"两个时代

### 前端/Node 视角：写一个 MCP Server

官方 TypeScript SDK 一小时能跑起来一个：

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({ name: "weather", version: "1.0.0" });

server.tool(
  "get_weather",                                    // 工具名
  "查询指定城市当前天气",                              // 描述——给模型看的
  { city: z.string().describe("城市名") },            // zod schema 自动转 JSON Schema
  async ({ city }) => ({
    content: [{ type: "text", text: JSON.stringify(await fetchWeather(city)) }]
  })
);
```

技能栈完全重叠：schema 定义（zod≈前端表单校验）、stdio/HTTP 服务、类型安全——**给 AI 写工具是前端自然延伸的赛道**。

## 相关协议认脸

+ **A2A**（Agent2Agent，Google 推）：agent 之间互相对话的协议（MCP 是 agent↔工具，A2A 是 agent↔agent）
+ **AGENTS.md**：仓库里的说明文件，告诉 agent 这个项目怎么构建/测试（≈ README 的 agent 版）
+ **Skill**（`SKILL.md`）：可按需加载的「怎么做某类事」流程包——和 MCP（双手）不同，见 [Agent Skill](/notes/frontier/agent-skills)
- 2026 年趋势：MCP 与 A2A 在对齐（MCP Server 也能作为 agent 对等体），边界还在演化

## 参考

+ [MCP 官方规范](https://modelcontextprotocol.io/)
+ [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
+ [OpenAI Function Calling 文档](https://platform.openai.com/docs/guides/function-calling)
