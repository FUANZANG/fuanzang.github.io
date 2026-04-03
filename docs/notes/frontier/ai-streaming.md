# AI 流式输出

AI 流式输出指的是：大模型（LLM）生成回答时，**不等待整段文本生成完毕，而是以"逐块/逐字"的方式持续推送给前端**，前端边收边渲染，带来类似打字机的实时体验。

> 本篇聚焦**前端如何消费 LLM 的流式响应**。关于双向实时通信（聊天室、协同编辑等），见 [WebSocket 与实时通信](/notes/practice/websocket-realtime)。

## 为什么用 SSE 而不是 WebSocket

+ **方向不同**：AI 回答是单向流（服务器 → 客户端推 token），客户端发问是另一次独立请求。无需 WebSocket 的双向长连接。
+ **协议更轻**：SSE（Server-Sent Events）基于普通 HTTP，自动重连、原生 `EventSource` 支持，无需额外握手协议。
+ **生态现状**：OpenAI、Anthropic、DeepSeek、通义千问等主流 LLM 的流式接口返回的都是 **SSE 格式**（HTTP 体里的 `text/event-stream`）。
+ **何时仍用 WebSocket**：若你的场景是"双向实时"（如 AI 配音 + 用户实时打断、多人共享对话），才需要 WebSocket。

## SSE 协议格式

服务器以 `Content-Type: text/event-stream` 返回，数据是纯文本，按 `event:` / `data:` 行分隔，以空行结束一条消息：

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

data: {"token": "你"}

data: {"token": "好"}

event: done
data: {"finish": true}
```

## 前端消费方式一：fetch + ReadableStream（推荐）

现代浏览器可用原生 `fetch` 读取响应流，无需 `EventSource`（后者只能用 GET 且不能自定义请求体，而 LLM 调用通常要 POST JSON）。

```js
async function streamChat(messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  })

  if (!res.body) return
  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    // chunk 可能是多条 SSE 消息拼接，需按 \n\n 拆分解析
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data:')) {
        const json = JSON.parse(line.slice(5).trim())
        if (json.token) appendToScreen(json.token)
      }
    }
  }
}
```

> 注意：网络传输按字节分块，`reader.read()` 返回的 `value` 不一定恰好对齐一条完整消息。生产代码应使用**缓冲累加 + 按分隔符切割**的方式解析（见下方健壮版）。

### 健壮的 SSE 解析（缓冲累加）

```js
function parseSSE(buffer) {
  // 返回 [完整的消息行数组, 剩余未完成的缓冲]
  const parts = buffer.split('\n\n')
  const rest = parts.pop()          // 最后一段可能不完整
  return [parts, rest]
}
```

## 前端消费方式二：EventSource（仅 GET）

```js
const es = new EventSource('/api/stream?q=' + encodeURIComponent(text))
es.onmessage = (e) => appendToScreen(e.data)
es.addEventListener('done', () => es.close())
es.onerror = () => es.close()       // 浏览器会自动重连
```

限制：只能 GET、不能带自定义请求体、不能设 `Authorization` 之外的复杂头。故 LLM 场景多用方式一。

## 与 LLM 服务对接（OpenAI 兼容格式）

OpenAI / DeepSeek / 通义（兼容模式）的流式响应是逐 token 的 SSE，每条 `data:` 是一段 JSON，结束时发 `data: [DONE]`：

```js
// 浏览器侧直连需服务端代理（避免暴露 API Key），以下为示意
const res = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${KEY}`   // 实际应放服务端
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    stream: true,                    // 开启流式
    messages: [{ role: 'user', content: '你好' }]
  })
})
// 解析 res.body 流，每条 JSON 形如：
// {"choices":[{"delta":{"content":"你"}}]}
```

前端提取：`json.choices[0].delta.content`（可能为 `undefined`，需判空）。

## 渲染优化（逐字上屏）

+ **增量拼接**：维护一个字符串 `fullText`，每收到 token 就 `fullText += token` 后整体重渲染，或追加到末尾节点。
+ **避免整页重排**：大量文本频繁更新时，用 `requestAnimationFrame` 节流渲染（如每帧只刷新一次）。
+ **Markdown 流式渲染**：若回答是 Markdown，边收边解析可能闪烁；可等句子结束（句号/换行）再重渲染区块，或用支持增量解析的 Markdown 库。
+ **中断/取消**：用 `AbortController` 调用 `reader.cancel()` 终止流式请求。

```js
const controller = new AbortController()
fetch('/api/chat', { signal: controller.signal, ... })
// 用户点"停止"：controller.abort()
```

## 实战：最小可运行结构

```
前端 (fetch + ReadableStream)
   │  POST /api/chat  (messages)
   ▼
后端代理 (Node/Python)
   │  转发到 LLM，stream: true
   ▼
LLM 服务 (SSE: data: {...}\n\n)
   │
   ▼
后端透传流 → 前端逐 token 渲染
```

关键点：**API Key 绝不能放前端**，必须经自有后端代理转发并开启 `stream`。

## 参考

+ [MDN: Streams API](https://developer.mozilla.org/zh-CN/docs/Web/API/Streams_API)
+ [OpenAI Streaming 文档](https://platform.openai.com/docs/guides/streaming)
+ [Server-Sent Events 规范](https://html.spec.whatwg.org/multipage/server-sent-events.html)
