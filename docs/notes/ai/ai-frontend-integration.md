# 前端对接 AI

> 本文基于 2026-10 时点（Vercel AI SDK `ai@7` / OpenAI Node SDK `openai@7`）。本篇是 AI 系列的**接入层**：模型 API 怎么调、SDK 怎么选、Key 怎么不泄露。

> 关联：[LLM 基础概念](/notes/ai/llm-fundamentals)（token / 消息结构 / 结构化输出）、[AI 流式输出](/notes/ai/ai-streaming)（SSE 怎么消费）、[AI 交互模式](/notes/ai/ai-interaction-patterns)（聊天界面等 UI 形态）、[AI 应用工程化](/notes/ai/ai-app-engineering)（成本 / 错误 / 安全）。

## 三条接入路线

前端要接 AI，第一个决策不是"用哪家模型"，而是**请求从哪出去**：

```
① 前端直连模型 API            ❌ Key 暴露在浏览器，只能本地 demo
② 前端 → 自有后端代理 → 模型   ✅ 生产默认：Key 在服务端，可加鉴权/限流/审计/缓存
③ 前端 → 平台 BaaS API        ✅ 不想自己搭后端时（见 LLM 应用平台篇）
```

**API Key 绝不放前端**——前端代码、构建产物、网络面板全都对用户可见。所谓"环境变量注入"只解决构建期问题：Vite 里带 `VITE_` 前缀的变量**照样会被打进 bundle**，任何人 View Source 都能读到。

| 放法 | 安全 |
|---|---|
| 前端硬编码 / `.env` + `VITE_` 前缀 | ❌ 进产物，人人可读 |
| Serverless Function（Vercel / Cloudflare Workers） | ✅ Key 在平台侧，前端只调自家路径 |
| 自有后端代理（Node / Nginx 反代） | ✅ 生产首选，还能顺手做限流与日志 |

前端类比：这跟你**不会把数据库密码写进 axios 的 baseURL** 是同一件事。模型 Key 就是新的数据库密码。

## 主流模型 API 对比

| 特性 | OpenAI | Claude | 通义千问 | DeepSeek |
|---|---|---|---|---|
| 接口风格 | REST / SSE | REST / SSE | REST / SSE | REST / SSE |
| 兼容 OpenAI 消息格式 | ✅ 原生 | ❌ 自有格式 | ✅ 兼容模式 | ✅ 兼容 |
| 流式输出 | SSE | SSE | SSE | SSE |
| 多模态 | 图片 / 音频 | 图片 / 文档 | 图片 / 音频 | 图片 |
| 工具调用 | ✅ | ✅ | ✅ | ✅ |

**"OpenAI 兼容"是行业事实标准**（消息结构见 [LLM 基础概念](/notes/ai/llm-fundamentals)）。它带来的工程红利：换模型只改 `baseURL` + `model` 两个字段，请求体结构不动——所以业务代码里**别把某家的特有字段写死**。

## 基础调用：统一封装

走自有代理路径（`/api/chat`），前端只认自家路径：

```ts
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function chatCompletion(
  messages: ChatMessage[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model ?? 'gpt-5',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
  })

  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  return res.json()
}
```

> 注意区分**请求体字段名**（`max_tokens`）和 **SDK 参数名**（AI SDK v5 起叫 `maxOutputTokens`），两者不一致，见下文。

### 后端代理最小实现

```ts
// server/proxy.ts
import express from 'express'

const app = express()
app.use(express.json())

app.post('/api/chat', async (req, res) => {
  const { messages, model } = req.body

  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,   // Key 只存服务端
    },
    body: JSON.stringify({ model, input: messages }),
  })

  res.status(upstream.status).json(await upstream.json())
})
```

要流式就在代理里**透传上游响应体**（别 `await json()` 再吐出来），前端消费方式见 [AI 流式输出](/notes/ai/ai-streaming)。

## 多模态：图片输入（Vision）

截图提问、OCR、扫题识别——前端高频场景。图片以 `image_url` 消息传入（base64 或公网 URL 二选一）：

```ts
const body = {
  model: 'gpt-5',
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: '这张报错截图里的问题是什么？' },
      { type: 'image_url', image_url: {
        url: `data:image/png;base64,${base64Str}`   // 本地图走 base64；公网图直接给 https URL
      } }
    ]
  }]
}
```

工程要点：

+ **成本**：图片按分辨率折算 token（一张高清图 ≈ 数百到上千 token，比同尺寸文字贵得多）——前端先压缩/降采样再上传是省钱第一步
+ **多图**：一次请求可传多张（数组里多个 `image_url`），上限各家不同（几十到几百张）
+ **格式**：PNG / JPEG / WebP / GIF 通用；PDF 部分模型支持（按页折算）
+ **前端链路**：`<input type="file">` → `FileReader` / `canvas.toDataURL` 压缩 → base64 上传；大图走 URL 更省请求体
+ **局限**：密集小字表格的精确识别不如专用 OCR，先试再选型

## Batch API：异步批处理半价

不要求实时的任务（离线打标、批量翻译、日志分析）走 Batch 接口：提交任务队列，24 小时内返回结果，**价格约五折**。前端无感知，纯后端成本优化——量大的离线任务必用。

## 结构化输出

让模型输出严格合法的 JSON（表单填充、数据提取、分类打标的刚需），三档实现按可靠性从高到低：

```ts
// ① JSON Schema 约束——服务端强制解码，100% 合法，首选
response_format: {
  type: 'json_schema',
  json_schema: {
    name: 'resume',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        skills: { type: 'array', items: { type: 'string' } },
        years: { type: 'number' }
      },
      required: ['name', 'skills'],
      additionalProperties: false
    }
  }
}
// ② JSON mode：只保证是合法 JSON，不保证字段结构（需 prompt 里给示例）
// ③ 纯 prompt 约定 + 前端兜底校验（Zod parse 失败就重试/降级）
```

各家参数名不同（OpenAI `response_format`、Claude 走 tool 强制调用、DeepSeek `json_object`）——**原理与选型详见 [LLM 基础概念](/notes/ai/llm-fundamentals)**，本篇只留调用形态。

## 前端 AI SDK

### Vercel AI SDK（`ai@7`）

定位：**把"各家模型差异"抽象掉的 TypeScript 工具箱**——统一 provider 接口 + 流式 + 工具调用 + 现成 UI hooks。分三层：

| 层 | 包 | 干什么 |
|---|---|---|
| AI SDK Core | `ai` | `generateText` / `streamText` / `Output.object` / 工具与 agent |
| AI SDK UI | `@ai-sdk/vue`（或 react / svelte…） | `useChat` 等框架 hook：管消息状态 + 流式渲染 |
| Provider | `@ai-sdk/openai` 等 | 各家模型的适配器 |

> ⚠️ **AI SDK 5→6→7 连续三版大改，网上大量旧版教程已失效**。读资料先看版本号：

| 变化点 | v4（旧） | v5+（当前） |
|---|---|---|
| `useChat` 管输入状态 | `input` / `handleInputChange` / `handleSubmit` 由 hook 提供 | **不再管**，自己 `ref` + `sendMessage({ text })` |
| 发消息 | `append()` | `sendMessage()` |
| 消息内容 | `message.content`（字符串） | `message.parts`（有序数组，含 text / tool-call / reasoning） |
| 最大输出 | `maxTokens` | `maxOutputTokens` |
| 消息转换 | `convertToCoreMessages` | `convertToModelMessages` |
| 工具定义 | `parameters` | `inputSchema` |
| 流协议 | 私有协议 | **SSE** |
| 服务端返回 | `toDataStreamResponse()` | `createUIMessageStreamResponse({ stream: toUIMessageStream(...) })` |

**Vue 端 `useChat`**——注意 Vue 版返回的是 **ref**，`<script setup>` 里要 `.value`，模板里自动解包：

```vue
<script setup lang="ts">
import { useChat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import { ref } from 'vue'

const input = ref('')
const { messages, sendMessage, status, stop, error, regenerate } = useChat({
  transport: new DefaultChatTransport({ api: '/api/chat' })
})

function submit(e: Event) {
  e.preventDefault()
  if (!input.value.trim()) return
  sendMessage({ text: input.value })
  input.value = ''
}
</script>

<template>
  <!-- v5 起没有 .content，必须遍历 parts -->
  <div v-for="m in messages" :key="m.id">
    <b>{{ m.role === 'user' ? '我' : 'AI' }}：</b>
    <template v-for="(part, i) in m.parts" :key="i">
      <span v-if="part.type === 'text'">{{ part.text }}</span>
    </template>
  </div>

  <p v-if="error">出错了 <button @click="regenerate()">重试</button></p>

  <form @submit="submit">
    <input v-model="input" :disabled="status !== 'ready'" />
    <button type="submit" :disabled="status !== 'ready'">发送</button>
    <button
      v-if="status === 'submitted' || status === 'streaming'"
      type="button"
      @click="stop()"
    >停止</button>
  </form>
</template>
```

`status` 只有四个取值：`submitted`（已发出、等首包）→ `streaming`（正在收）→ `ready`（可再发）／`error`。界面的禁用、loading、停止按钮全挂在这一个状态机上——这也是 [AI 交互模式](/notes/ai/ai-interaction-patterns)里那张状态机的现成实现。

**服务端路由**（`streamText` + UI 消息流）：

```ts
import {
  convertToModelMessages, createUIMessageStreamResponse,
  streamText, toUIMessageStream, type UIMessage
} from 'ai'

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: 'openai/gpt-5',   // AI Gateway 字符串；也可用 provider 实例 openai('gpt-5')
    instructions: '你是简洁的技术助手。',
    messages: await convertToModelMessages(messages),   // UIMessage → 模型消息
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
```

**为什么用 SDK 而不是手写 fetch**：多轮消息的 `parts` 结构、流式分片解析、工具调用的多步循环、错误与重连——这些在 [AI 流式输出](/notes/ai/ai-streaming)里都得自己写，SDK 替你实现了。代价是版本升级频繁（v4→v5→v6→v7 连续大改），**锁定风险**要自己权衡。

### OpenAI Node SDK（`openai@7`）

⚠️ **新项目请用 Responses API**（`/v1/responses`）。Chat Completions 虽仍受支持，但已是"兼容层"：

| | Chat Completions | Responses（推荐） |
|---|---|---|
| 端点 | `/v1/chat/completions` | `/v1/responses` |
| 状态 | 仍支持，无下线日期 | 新项目推荐 |
| 工具调用 | **GPT-5.4 起仅 `reasoning_effort: 'none'` 时可用；GPT-6 Astra 完全不可用** | 完整支持，含内置工具（web search / file search / code interpreter / 远程 MCP） |
| 多轮状态 | 每次全量重发（无状态） | `store: true` 或 `previous_response_id` 续接 |
| 输出结构 | `choices[]` 消息数组 | 带类型的 `output` 数组 |

```ts
import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// 流式（Responses API）
const stream = await client.responses.create({
  model: 'gpt-5',
  input: [{ role: 'user', content: '你好' }],
  stream: true,
})

for await (const event of stream) {
  if (event.type === 'response.output_text.delta') process.stdout.write(event.delta)
}
```

> Assistants API 已宣布弃用（目标下线 2026 年中），迁移目标是 Responses API——读到 Assistants 教程时注意这点。

## 学习路径建议

1. 用 20 行 fetch 直连一次模型 API（**只在本地**，Key 写 `.env` 且别提交）
2. 加上自有后端代理，把 Key 挪到服务端，前端改调 `/api/chat`——体会"Key 出前端"这一步
3. 换一次模型（OpenAI → DeepSeek），确认只改了 `baseURL` + `model`——验证"OpenAI 兼容"的价值
4. 装 `ai` + `@ai-sdk/vue`，用 `useChat` 重写步骤 2 的聊天，对比手写流式解析的代码量
5. 接着读 [AI 流式输出](/notes/ai/ai-streaming)（协议层）、[AI 交互模式](/notes/ai/ai-interaction-patterns)（UI 层）、[AI 应用工程化](/notes/ai/ai-app-engineering)（成本/错误/安全）

## 参考

+ [AI SDK 官方文档](https://ai-sdk.dev/docs/introduction)（含 [useChat API](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) 与 [4→5 迁移指南](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0)）
+ [OpenAI · Responses API 迁移指南](https://developers.openai.com/api/docs/guides/migrate-to-responses)
+ [OpenAI · Function Calling](https://platform.openai.com/docs/guides/function-calling)
+ 本站：[LLM 基础概念](/notes/ai/llm-fundamentals) · [AI 流式输出](/notes/ai/ai-streaming) · [AI 应用工程化](/notes/ai/ai-app-engineering)
