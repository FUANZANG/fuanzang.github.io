# 前端对接 AI

> 前端应用中集成 AI 能力的完整指南，涵盖 API 调用、流式响应、交互模式与工程化实践。

## AI API 调用模式

### 主流模型 API 对比

| 特性 | OpenAI | Claude | 通义千问 | DeepSeek |
|------|--------|--------|----------|----------|
| 接口风格 | REST / SSE | REST / SSE | REST / SSE | REST / SSE |
| 兼容 OpenAI 格式 | ✅ 原生 | ❌ 自有格式 | ✅ 兼容 | ✅ 兼容 |
| 流式输出 | SSE | SSE | SSE | SSE |
| 多模态 | 图片/音频 | 图片/文档 | 图片/音频 | 图片 |
| 函数调用 | ✅ | ✅ | ✅ | ✅ |

### 基础调用示例

```typescript
// 统一封装：兼容 OpenAI 格式的 API 调用
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {}
) {
  const { model = 'gpt-4o', temperature = 0.7, maxTokens = 2048 } = options

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  return response.json()
}
```

### API Key 安全策略

```
❌ 前端直存 API Key（泄露风险）
✅ 后端代理转发（推荐）
✅ Serverless Functions（Vercel / Cloudflare Workers）
✅ 环境变量注入（仅构建时可用，运行时无暴露）
```

**后端代理模式（Node.js）：**

```typescript
// server/proxy.ts
import express from 'express'

const app = express()
app.use(express.json())

app.post('/api/chat', async (req, res) => {
  const { messages, model } = req.body

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Key 只存服务端
    },
    body: JSON.stringify({ model, messages }),
  })

  const data = await response.json()
  res.json(data)
})
```

## 流式响应处理

### Server-Sent Events (SSE) 基础

SSE 是 AI 流式输出的标准协议，服务端逐 token 推送，前端实时接收。

```
SSE 数据格式：
data: {"id":"chatcmpl-xxx","choices":[{"delta":{"content":"你"}}]}

data: {"id":"chatcmpl-xxx","choices":[{"delta":{"content":"好"}}]}

data: {"id":"chatcmpl-xxx","choices":[{"delta":{"content":"！"}}]}

data: [DONE]
```

### ReadableStream 解析

```typescript
async function* streamChat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): AsyncGenerator<string> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...options,
      messages,
      stream: true,
    }),
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // 保留未完成的行

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content
        if (content) yield content
      } catch {
        // 忽略解析错误
      }
    }
  }
}
```

### 打字机效果渲染

```typescript
// Vue 3 组合式 API
import { ref } from 'vue'

export function useTypewriter() {
  const displayText = ref('')
  const isStreaming = ref(false)

  async function streamResponse(messages: ChatMessage[]) {
    displayText.value = ''
    isStreaming.value = true

    try {
      for await (const chunk of streamChat(messages)) {
        displayText.value += chunk
      }
    } finally {
      isStreaming.value = false
    }
  }

  function abort() {
    isStreaming.value = false
  }

  return { displayText, isStreaming, streamResponse, abort }
}
```

### 中断流式请求

```typescript
// 使用 AbortController 实现中断
let controller: AbortController | null = null

async function streamWithAbort(messages: ChatMessage[]) {
  controller = new AbortController()

  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, stream: true }),
    signal: controller.signal, // 绑定中断信号
  })

  // ... 读取流
}

function stopGeneration() {
  controller?.abort()
  controller = null
}
```

## 前端 AI SDK

### Vercel AI SDK

最成熟的前端 AI 集成方案，内置流式处理、工具调用、多模型支持。

```typescript
// 安装: npm install ai @ai-sdk/openai

import { generateText, streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

// 简单调用
const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: '解释什么是闭包',
})

// 流式调用
const { textStream } = await streamText({
  model: openai('gpt-4o'),
  messages: [
    { role: 'system', content: '你是一个前端专家' },
    { role: 'user', content: 'Vue 3 的响应式原理' },
  ],
})

for await (const chunk of textStream) {
  console.log(chunk) // 逐 token 输出
}
```

**Vue 集成（useChat）：**

```vue
<script setup lang="ts">
import { useChat } from '@ai-sdk/vue'

const { messages, input, handleSubmit, isLoading, stop } = useChat({
  api: '/api/chat',
})
</script>

<template>
  <div>
    <div v-for="msg in messages" :key="msg.id">
      <span>{{ msg.role === 'user' ? '我' : 'AI' }}:</span>
      <p>{{ msg.content }}</p>
    </div>
    <form @submit="handleSubmit">
      <input v-model="input" placeholder="输入消息..." />
      <button type="submit" :disabled="isLoading">发送</button>
      <button v-if="isLoading" @click="stop">停止</button>
    </form>
  </div>
</template>
```

### OpenAI Node SDK

```typescript
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1', // 可替换为兼容端点
})

// 流式调用
const stream = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
})

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '')
}
```

## 常见交互模式

### 聊天界面

核心设计要点：
- **消息气泡**：区分用户/AI 角色，支持 Markdown 渲染
- **加载状态**：骨架屏 + 流式光标动画
- **历史记录**：本地存储 + 服务端持久化
- **多轮对话**：维护 messages 数组，注意上下文窗口限制

```typescript
// 消息数据结构
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  status: 'pending' | 'streaming' | 'done' | 'error'
}
```

### 智能表单补全

```typescript
// 表单字段智能填充
async function smartFill(form: Record<string, string>) {
  const prompt = `根据以下表单数据，补全缺失的字段：
    ${JSON.stringify(form)}
    返回 JSON 格式。`

  const { text } = await generateText({
    model: openai('gpt-4o-mini'), // 简单任务用小模型，省钱
    prompt,
  })

  return JSON.parse(text)
}
```

### AI 辅助编辑器

```typescript
// 选中文本 → AI 改写/翻译/解释
async function aiAssist(selectedText: string, action: string) {
  const prompts: Record<string, string> = {
    rewrite: `改写以下文本，使其更专业：\n${selectedText}`,
    translate: `将以下文本翻译为英文：\n${selectedText}`,
    explain: `用通俗的语言解释以下概念：\n${selectedText}`,
  }

  const { textStream } = await streamText({
    model: openai('gpt-4o'),
    prompt: prompts[action],
  })

  return textStream
}
```

## 性能与成本优化

### Token 计数与预算控制

```typescript
import { encode } from 'gpt-tokenizer'

function countTokens(text: string): number {
  return encode(text).length
}

function truncateMessages(
  messages: ChatMessage[],
  maxTokens: number
): ChatMessage[] {
  let totalTokens = 0
  const result: ChatMessage[] = []

  // 从最新消息开始，保留 system prompt
  const systemMsg = messages[0]?.role === 'system' ? messages[0] : null
  if (systemMsg) {
    totalTokens += countTokens(systemMsg.content)
  }

  for (let i = messages.length - 1; i >= (systemMsg ? 1 : 0); i--) {
    const tokens = countTokens(messages[i].content)
    if (totalTokens + tokens > maxTokens) break
    result.unshift(messages[i])
    totalTokens += tokens
  }

  if (systemMsg) result.unshift(systemMsg)
  return result
}
```

### 请求防抖与限流

```typescript
// 输入防抖：用户停止输入后才发送请求
function useDebouncedChat(delay = 500) {
  let timer: ReturnType<typeof setTimeout>

  function send(messages: ChatMessage[]) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      chatCompletion(messages)
    }, delay)
  }

  return { send }
}

// 并发限流
function createRateLimiter(maxConcurrent = 3) {
  let active = 0
  const queue: (() => void)[] = []

  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= maxConcurrent) {
      await new Promise<void>(resolve => queue.push(resolve))
    }
    active++
    try {
      return await fn()
    } finally {
      active--
      queue.shift()?.()
    }
  }
}
```

### 响应缓存

```typescript
// 简单 LRU 缓存
class ResponseCache {
  private cache = new Map<string, string>()
  private maxSize: number

  constructor(maxSize = 50) {
    this.maxSize = maxSize
  }

  get(key: string): string | undefined {
    const value = this.cache.get(key)
    if (value) {
      // LRU：访问时移到末尾
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: string, value: string) {
    if (this.cache.size >= this.maxSize) {
      // 删除最久未使用的
      const oldest = this.cache.keys().next().value!
      this.cache.delete(oldest)
    }
    this.cache.set(key, value)
  }

  // 用消息内容生成缓存 key
  static makeKey(messages: ChatMessage[]): string {
    return JSON.stringify(messages.map(m => `${m.role}:${m.content}`))
  }
}
```

## 错误处理与重试

### 重试策略

```typescript
interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  retryableStatuses?: number[]
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOpts: RetryOptions = {}
): Promise<Response> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    retryableStatuses = [429, 500, 502, 503],
  } = retryOpts

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, options)

      if (response.ok) return response

      if (retryableStatuses.includes(response.status)) {
        // 429 用服务端返回的 Retry-After
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : baseDelay * Math.pow(2, attempt - 1) // 指数退避
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      if (attempt === maxAttempts) throw error
      await new Promise(r => setTimeout(r, baseDelay * attempt))
    }
  }

  throw new Error('Max retry attempts reached')
}
```

### 降级方案

```typescript
// 多模型 fallback
const MODEL_CHAIN = [
  { model: 'gpt-4o', name: '主力模型' },
  { model: 'gpt-4o-mini', name: '备用模型' },
  { model: 'deepseek-chat', name: '第三方兜底' },
]

async function chatWithFallback(messages: ChatMessage[]) {
  for (const { model, name } of MODEL_CHAIN) {
    try {
      const result = await chatCompletion(messages, { model })
      return result
    } catch (error) {
      console.warn(`${name} (${model}) 失败，尝试下一个...`, error)
    }
  }
  throw new Error('所有模型均不可用')
}
```

## 安全考虑

### 敏感信息过滤

```typescript
// 发送前过滤用户输入中的敏感信息
function sanitizeInput(input: string): string {
  const patterns = [
    /(\d{17}[\dXx])/, // 身份证号
    /(\d{16,19})/,     // 银行卡号
    /(1[3-9]\d{9})/,   // 手机号（可选）
  ]

  return patterns.reduce(
    (text, pattern) => text.replace(pattern, '[已过滤]'),
    input
  )
}
```

### AI 生成内容的 XSS 防护

```typescript
import DOMPurify from 'dompurify'
import { marked } from 'marked'

function renderAIContent(markdown: string): string {
  // 1. Markdown 转 HTML
  const html = marked(markdown)
  // 2. 过滤 XSS（AI 可能生成恶意 HTML/JS）
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'code', 'pre', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'class'],
  })
}
```

### 输出内容审核

```typescript
// 客户端侧内容审核（敏感词过滤）
function contentFilter(text: string): { safe: boolean; reason?: string } {
  // 可根据业务需求自定义敏感词库
  const blockedPatterns = [
    /注入系统提示|ignore previous instructions/i,
    // ... 业务相关规则
  ]

  for (const pattern of blockedPatterns) {
    if (pattern.test(text)) {
      return { safe: false, reason: '内容包含不当请求' }
    }
  }

  return { safe: true }
}
```
