# WebSocket 与实时通信

> 📌 本文件记录前端实时通信方案：WebSocket API、Server-Sent Events (SSE)、长轮询、Socket.IO、WebRTC 的原理、用法与选型对比。
>
> 📅 基于以下版本：Socket.IO 4.x | ws 8.x | @microsoft/signalr 10.x | 浏览器原生 WebSocket API（Baseline Widely available）
>
> 🔗 WebSocket 协议基础（握手、帧格式）见 [网络协议](/notes/foundations/network-protocol) 第 7 节

---

## 1. 实时通信方案概览

```
前端实时通信方案：

┌──────────────────────────────────────────────────┐
│              实时通信                              │
├──────────────┬───────────────┬───────────────────┤
│  单向         │  双向          │  点对点            │
├──────────────┼───────────────┼───────────────────┤
│ SSE          │ WebSocket     │ WebRTC            │
│ 轮询/长轮询   │ Socket.IO    │                   │
└──────────────┴───────────────┴───────────────────┘

轮询      → 客户端定时请求（最简单，效率最低）
长轮询    → 服务器 hold 住请求直到有数据（兼容性最好）
SSE      → 服务器单向推送（HTTP 协议，简单可靠）
WebSocket → 全双工双向通信（TCP 长连接，最灵活）
WebRTC   → 浏览器间点对点音视频/数据（无需服务器中转）
```

### 选型决策树

```
需要实时通信？
  ├─ 只需要服务器→客户端推送（通知、股票行情）→ SSE
  ├─ 需要双向通信（聊天、协作编辑、游戏）→ WebSocket
  │    ├─ 需要自动重连/房间/广播/降级 → Socket.IO
  │    └─ 简单场景，自己处理重连 → 原生 WebSocket
  ├─ 浏览器间音视频/文件传输 → WebRTC
  └─ 兼容性要求极高（IE、严格代理）→ 长轮询
```

---

## 2. 轮询与长轮询

### 短轮询

客户端定时发请求，服务器立即响应（有数据就返回，没数据返回空）。

```js
// 每 3 秒请求一次
setInterval(async () => {
  const res = await fetch('/api/messages')
  const data = await res.json()
  if (data.length) updateUI(data)
}, 3000)
```

```
优点：实现最简单，无需特殊服务器支持
缺点：
  - 大量无效请求（大多数请求返回空）
  - 实时性取决于轮询间隔
  - 浪费带宽和服务器资源
```

### 长轮询

客户端发请求，服务器 hold 住不响应，直到有数据或超时才返回。客户端收到响应后立即发下一个请求。

```js
// 长轮询客户端
async function longPoll() {
  while (true) {
    try {
      const res = await fetch('/api/messages?wait=true', {
        signal: controller.signal
      })
      const data = await res.json()
      if (data.length) updateUI(data)
    } catch (e) {
      // 网络错误，等待后重试
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}
longPoll()
```

```js
// Node.js 服务器端长轮询
const waitingClients = []

app.get('/api/messages', (req, res) => {
  // 客户端等待，不立即响应
  waitingClients.push(res)

  // 30 秒超时
  req.setTimeout(30000, () => {
    const idx = waitingClients.indexOf(res)
    if (idx > -1) waitingClients.splice(idx, 1)
    res.json([])
  })
})

// 有新消息时，通知所有等待的客户端
function notifyClients(message) {
  waitingClients.forEach(res => res.json([message]))
  waitingClients.length = 0
}
```

```
优点：兼容性极好（就是 HTTP 请求）
缺点：
  - 每次都要建立新 HTTP 连接（开销大）
  - 服务器需要 hold 住大量连接
  - 仍然有请求开销（header 等）
```

---

## 3. Server-Sent Events (SSE)

SSE 是 HTML5 标准，服务器通过 HTTP 连接**单向推送**数据到客户端，基于普通 HTTP、自带重连，适合"只需服务器→客户端推"的场景（通知、行情、日志流）。

协议格式、客户端 `EventSource` API、Node.js SSE 服务端实现、Vue/React 用法等完整内容见专篇：[AI 流式输出](/notes/frontier/ai-streaming)（该篇同时覆盖 SSE 与 fetch + ReadableStream 消费 LLM 流）。

选型速记：

+ 只要服务器单向推（含 AI 逐字输出）→ SSE
+ 需要双向实时（聊天、协同）→ WebSocket

## 4. WebSocket API（浏览器原生）

WebSocket 提供**全双工双向通信**，基于 TCP 长连接。

### 基本用法

```js
// 创建连接
const ws = new WebSocket('ws://localhost:8080')
// 或安全连接
const ws = new WebSocket('wss://localhost:8080')

// 连接打开
ws.addEventListener('open', () => {
  console.log('连接已建立')
  ws.send('Hello Server')
  ws.send(JSON.stringify({ type: 'message', data: 'hello' }))
})

// 接收消息
ws.addEventListener('message', (event) => {
  console.log('收到:', event.data)
  // event.data 可能是 string、Blob 或 ArrayBuffer
})

// 连接关闭
ws.addEventListener('close', (event) => {
  console.log('连接关闭:', event.code, event.reason)
  // event.code: 1000=正常关闭, 1006=异常关闭, 4001-4999=自定义
})

// 连接错误
ws.addEventListener('error', (event) => {
  console.error('连接错误:', event)
})

// 主动关闭
ws.close(1000, '用户离开')
```

### 实例属性

```js
ws.readyState    // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
ws.url           // 连接的 URL
ws.protocol      // 服务器选定的子协议
ws.binaryType    // 'blob'（默认）或 'arraybuffer'
ws.bufferedAmount // 已排队但未发送的字节数
ws.extensions    // 服务器选定的扩展
```

### 发送二进制数据

```js
// 设置接收类型为 ArrayBuffer
ws.binaryType = 'arraybuffer'

// 发送 ArrayBuffer
const buffer = new ArrayBuffer(4)
const view = new DataView(buffer)
view.setInt32(0, 12345)
ws.send(buffer)

// 发送 Blob
ws.send(new Blob(['text'], { type: 'text/plain' }))
```

### 心跳机制

WebSocket 连接可能因为网络中间件（代理、防火墙）超时而断开，需要心跳保持连接。

```js
class HeartbeatWebSocket {
  constructor(url, interval = 30000) {
    this.ws = new WebSocket(url)
    this.interval = interval
    this.timer = null

    this.ws.addEventListener('open', () => {
      this.startHeartbeat()
    })

    this.ws.addEventListener('close', () => {
      this.stopHeartbeat()
    })

    this.ws.addEventListener('message', (e) => {
      // 收到任何消息说明连接正常，重置心跳
      this.resetHeartbeat()
    })
  }

  startHeartbeat() {
    this.timer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, this.interval)
  }

  resetHeartbeat() {
    clearInterval(this.timer)
    this.startHeartbeat()
  }

  stopHeartbeat() {
    clearInterval(this.timer)
  }
}
```

### 自动重连

```js
class ReconnectingWebSocket {
  constructor(url, maxRetries = 5) {
    this.url = url
    this.maxRetries = maxRetries
    this.retries = 0
    this.connect()
  }

  connect() {
    this.ws = new WebSocket(this.url)

    this.ws.addEventListener('open', () => {
      this.retries = 0  // 重置重试计数
      console.log('已连接')
    })

    this.ws.addEventListener('close', () => {
      if (this.retries < this.maxRetries) {
        // 指数退避
        const delay = Math.min(1000 * 2 ** this.retries, 30000)
        this.retries++
        console.log(`${delay}ms 后重连（第 ${this.retries} 次）`)
        setTimeout(() => this.connect(), delay)
      }
    })

    this.ws.addEventListener('error', () => {
      this.ws.close()  // 触发 close 事件
    })
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    }
  }
}
```

### WebSocket 协议握手

```
WebSocket 连接建立过程：

1. 客户端发 HTTP 升级请求：
   GET /chat HTTP/1.1
   Host: server.example.com
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
   Sec-WebSocket-Version: 13

2. 服务器返回 101 Switching Protocols：
   HTTP/1.1 101 Switching Protocols
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

3. 之后改为 WebSocket 协议通信（不再是 HTTP）
```

### 关闭代码

| Code | 含义 |
|------|------|
| 1000 | 正常关闭 |
| 1001 | 端点离开（如页面关闭） |
| 1002 | 协议错误 |
| 1003 | 不支持的数据类型 |
| 1006 | 异常关闭（没有发送关闭帧） |
| 1007 | 数据格式错误 |
| 1008 | 策略违规 |
| 1009 | 消息过大 |
| 1011 | 内部错误 |
| 4000-4999 | 应用自定义 |

---

## 5. Socket.IO

> ⚠️ Socket.IO **不是** WebSocket 的实现。它使用 WebSocket 作为传输层（不可用时降级为 HTTP 长轮询），并添加了额外功能。Socket.IO 客户端不能连接原生 WebSocket 服务器，反之亦然。
>
> 来源：Socket.IO 官方文档

### Socket.IO vs 原生 WebSocket

| | 原生 WebSocket | Socket.IO |
|---|---|---|
| 协议 | WebSocket | 自定义协议（基于 WebSocket/轮询） |
| 自动重连 | 需自己实现 | 内置（指数退避） |
| 心跳 | 需自己实现 | 内置 |
| 降级 | 无 | 自动降级到长轮询 |
| 广播 | 需自己实现 | 内置 io.emit() |
| 房间 | 无 | 内置 io.to(room) |
| 命名空间 | 无 | 内置 io.of('/namespace') |
| 消息确认 | 无 | 内置 callback |
| 二进制 | 支持 | 支持 |
| 体积 | 0（浏览器内置） | ~40KB（client） |

### 安装

```bash
# 服务器端
npm install socket.io

# 客户端
npm install socket.io-client
```

### 服务器端

```js
import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'https://example.com'],
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id)

  // 监听客户端消息
  socket.on('message', (data) => {
    console.log('收到:', data)
  })

  // 广播给所有连接的客户端
  io.emit('broadcast', { msg: '所有人都能收到' })

  // 广播给除发送者外的所有人
  socket.broadcast.emit('broadcast', { msg: '除我之外都能收到' })

  // 房间功能
  socket.on('join-room', (room) => {
    socket.join(room)
    io.to(room).emit('user-joined', socket.id)
  })

  socket.on('leave-room', (room) => {
    socket.leave(room)
  })

  // 消息确认（acknowledgement）
  socket.on('message', (data, callback) => {
    console.log('收到:', data)
    callback({ status: 'ok' })  // 回调通知客户端
  })

  // 断开连接
  socket.on('disconnect', (reason) => {
    console.log('用户断开:', socket.id, reason)
  })
})

httpServer.listen(3000)
```

### 客户端

```js
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000', {
  // 配置
  reconnection: true,          // 自动重连（默认 true）
  reconnectionAttempts: 5,     // 最大重连次数（默认 Infinity）
  reconnectionDelay: 1000,     // 首次重连延迟（默认 1000）
  reconnectionDelayMax: 5000,  // 最大重连延迟（默认 5000）
  timeout: 20000,              // 连接超时（默认 20000）
  transports: ['websocket', 'polling'],  // 传输方式
})

// 连接事件
socket.on('connect', () => {
  console.log('已连接, id:', socket.id)
})

socket.on('disconnect', (reason) => {
  console.log('已断开:', reason)
})

socket.on('connect_error', (error) => {
  console.log('连接错误:', error.message)
})

// 发送消息
socket.emit('message', { text: 'hello' })

// 发送消息并等待确认
socket.emit('message', { text: 'hello' }, (response) => {
  console.log('服务器确认:', response)
})

// 带超时的确认
socket.timeout(5000).emit('message', { text: 'hello' }, (err, response) => {
  if (err) {
    console.log('超时，服务器未响应')
  } else {
    console.log('确认:', response)
  }
})

// 监听广播
socket.on('broadcast', (data) => {
  console.log('广播:', data)
})

// 主动断开
socket.disconnect()

// 重新连接
socket.connect()
```

### 命名空间（Multiplexing）

```js
// 服务器 — 不同命名空间处理不同业务
const chatNs = io.of('/chat')
chatNs.on('connection', (socket) => {
  // 聊天逻辑
})

const adminNs = io.of('/admin')
adminNs.use((socket, next) => {
  // 中间件：鉴权
  if (socket.handshake.auth.token) {
    next()
  } else {
    next(new Error('未认证'))
  }
})
adminNs.on('connection', (socket) => {
  // 管理逻辑
})

// 客户端 — 连接不同命名空间
const chatSocket = io('http://localhost:3000/chat')
const adminSocket = io('http://localhost:3000/admin', {
  auth: { token: 'xxx' }
})
```

### 房间（Rooms）

```js
// 服务器端
io.on('connection', (socket) => {
  // 加入房间
  socket.on('join', (room) => {
    socket.join(room)
    // 给房间内所有人发消息
    io.to(room).emit('message', `新人加入 ${room}`)
  })

  // 私聊（每个用户一个房间）
  socket.on('private-message', (to, message) => {
    io.to(to).emit('private-message', {
      from: socket.id,
      message,
    })
  })

  // 离开房间
  socket.on('leave', (room) => {
    socket.leave(room)
  })
})

// 获取房间内所有 socket
const sockets = await io.in('room1').fetchSockets()
```

### 多节点扩展（Redis Adapter）

```js
// 多个 Node.js 实例间共享事件
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

const pubClient = createClient({ url: 'redis://localhost:6379' })
const subClient = pubClient.duplicate()

await Promise.all([pubClient.connect(), subClient.connect()])

io.adapter(createAdapter(pubClient, subClient))
// 现在广播/房间可以跨多个 Node.js 实例工作
```

---

## 6. WebRTC（点对点通信）

WebRTC 用于浏览器间**点对点**音视频和数据通信，不需要服务器中转数据（仅需服务器协助建立连接）。

### 数据通道

```js
// 创建 RTCPeerConnection
const pc = new RTCPeerConnection(configuration)

// 创建数据通道
const channel = pc.createDataChannel('chat', {
  ordered: true,  // 保证顺序
})

channel.onopen = () => {
  channel.send('Hello!')
}

channel.onmessage = (e) => {
  console.log('收到:', e.data)
}

// 通过信令服务器交换 SDP（_offer/answer）
const offer = await pc.createOffer()
await pc.setLocalDescription(offer)
// 通过 WebSocket 发送 offer 给对方

// 收到对方的 answer
pc.setRemoteDescription(answer)
```

> WebRTC 的完整流程较复杂（信令、ICE、STUN/TURN），这里只展示数据通道基本概念。实际使用建议用 PeerJS 等库简化。

---

## 7. Vue/React 封装

### Vue Composable

```ts
// composables/useWebSocket.ts
import { ref, onUnmounted } from 'vue'

export function useWebSocket(url: string) {
  const data = ref<any>(null)
  const status = ref<'connecting' | 'open' | 'closed'>('connecting')
  const ws = new WebSocket(url)

  ws.addEventListener('open', () => { status.value = 'open' })
  ws.addEventListener('close', () => { status.value = 'closed' })
  ws.addEventListener('message', (e) => {
    data.value = JSON.parse(e.data)
  })

  function send(message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  function close() {
    ws.close()
  }

  onUnmounted(close)

  return { data, status, send, close }
}
```

### React Hook

```tsx
// hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react'

export function useWebSocket(url: string) {
  const [data, setData] = useState<any>(null)
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.addEventListener('open', () => setStatus('open'))
    ws.addEventListener('close', () => setStatus('closed'))
    ws.addEventListener('message', (e) => {
      setData(JSON.parse(e.data))
    })

    return () => ws.close()
  }, [url])

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  return { data, status, send }
}
```

---

## 8. 全部方案对比

| | 短轮询 | 长轮询 | SSE | WebSocket | Socket.IO | WebRTC |
|---|---|---|---|---|---|---|
| **方向** | 双向 | 双向 | 服务器→客户端 | 双向 | 双向 | 点对点 |
| **协议** | HTTP | HTTP | HTTP | WebSocket | WebSocket/轮询 | UDP |
| **连接** | 短连接 | 长连接 | 长连接 | 长连接 | 长连接 | 点对点 |
| **自动重连** | N/A | 需实现 | 内置 | 需实现 | 内置 | 需实现 |
| **二进制** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **浏览器支持** | 全部 | 全部 | 现代浏览器 | 现代浏览器 | 全部 | 现代浏览器 |
| **服务器复杂度** | 低 | 中 | 低 | 中 | 中 | 高 |
| **实时性** | 差 | 中 | 好 | 最好 | 最好 | 最好 |
| **适合场景** | 简单轮询 | 兼容性 | 通知/行情 | 聊天/协作 | 聊天/协作 | 音视频/P2P |

---

## 9. 常见踩坑

### WebSocket 连接被代理/防火墙断开

```
问题：企业网络/反向代理有超时设置，空闲连接被断开
解决：
  1. 心跳机制（定期发送 ping/pong）
  2. Nginx 配置 proxy_read_timeout
     location /ws {
       proxy_pass http://backend;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_read_timeout 86400;  # 24 小时
     }
```

### SSE 跨域问题

```js
// EventSource 不支持自定义 header，跨域需服务器配置 CORS
// 服务器端
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Access-Control-Allow-Origin': '*',  // CORS
})

// 客户端 — EventSource 不支持 credentials
const source = new EventSource('https://api.example.com/events')
// 不能传 header！如果需要认证，用 URL 参数
const source = new EventSource('https://api.example.com/events?token=xxx')
```

### Socket.IO 版本不匹配

```
问题：socket.io 服务器和 socket.io-client 版本差距大，连接失败
解决：保持服务器和客户端大版本一致
  服务器: socket.io@4.8.x
  客户端: socket.io-client@4.8.x
```

### WebSocket 在 Vue 组件中未清理

```ts
// ❌ 组件销毁后 WebSocket 仍然连接
const ws = new WebSocket(url)
// 忘记在 onUnmounted 中 close()

// ✅ 正确清理
onUnmounted(() => ws.close())
```

### 消息顺序问题

```js
// WebSocket 不保证消息顺序（理论上 TCP 保证，但重连后可能乱序）
// 需要消息序号
ws.send(JSON.stringify({ id: ++messageId, data: 'hello' }))

// 接收方按 id 排序处理
```

---

## 10. 最佳实践

### 选择方案

```
1. 只需要服务器推送 → SSE（最简单）
   - 通知、股票行情、日志流、进度条

2. 需要双向通信 → WebSocket
   - 聊天、协作编辑、多人游戏、实时数据

3. 需要可靠性 + 高级功能 → Socket.IO
   - 自动重连、房间、广播、降级

4. 浏览器间直接通信 → WebRTC
   - 音视频通话、P2P 文件传输
```

### 安全性

```
- 使用 wss://（加密）而非 ws://
- 验证 Origin 头防止 CSRF
- 认证：连接时传 token，服务器验证
- 限流：防止消息洪泛
- 输入校验：JSON.parse 包 try-catch
```

```js
// 服务器端认证
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  if (!token || !verifyToken(token)) {
    return next(new Error('未认证'))
  }
  socket.userId = decodeToken(token).userId
  next()
})
```

### 消息格式设计

```js
// 统一消息格式
{
  type: 'message' | 'notification' | 'system',
  id: 'uuid-xxx',           // 消息唯一 ID
  timestamp: 1719705600000, // 时间戳
  data: {                   // 消息体
    // ...
  }
}
```

---

## 参考

- [MDN - WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [MDN - Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Socket.IO 官方文档](https://socket.io/docs/v4/)
- [MDN - WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [ws (Node.js WebSocket 库)](https://github.com/websockets/ws)
