# 网络协议笔记

> 📌 本文件记录前端必须掌握的网络协议知识：HTTP 演进、HTTPS、TCP、WebSocket、缓存、跨域等。

---

## 1. HTTP 基础

### 请求方法

| 方法 | 语义 | 请求体 | 幂等 | 缓存 | 典型用途 |
|------|------|--------|------|------|----------|
| GET | 获取资源 | ❌ | ✅ | ✅ | 查询数据 |
| POST | 提交/创建 | ✅ | ❌ | ❌（需手动配置） | 提交表单、创建资源 |
| PUT | 全量替换 | ✅ | ✅ | ❌ | 更新整个资源 |
| PATCH | 局部修改 | ✅ | ❌ | ❌ | 更新部分字段 |
| DELETE | 删除 | ❌（可带） | ✅ | ❌ | 删除资源 |
| HEAD | 同 GET，只返回头 | ❌ | ✅ | ✅ | 检查资源是否存在/大小 |
| OPTIONS | 查询支持的方法 | ❌ | ✅ | ❌ | CORS 预检 |

### 常见状态码

```
1xx 信息
  100 Continue         继续发送请求体
  101 Switching        协议切换（WebSocket）

2xx 成功
  200 OK               成功
  201 Created          创建成功（POST/PUT）
  204 No Content       成功但无返回体（DELETE）

3xx 重定向
  301 Moved            永久重定向（缓存）
  302 Found            临时重定向（不缓存）
  304 Not Modified     协商缓存命中（资源未变）
  307 Temporary        临时重定向（保持方法不变）
  308 Permanent        永久重定向（保持方法不变）

4xx 客户端错误
  400 Bad Request      请求格式错误
  401 Unauthorized     未认证（需要登录）
  403 Forbidden        无权限（已认证但不够权限）
  404 Not Found        资源不存在
  405 Method Not Allowed 方法不允许
  408 Request Timeout  请求超时
  429 Too Many Requests 请求过于频繁（限流）

5xx 服务端错误
  500 Internal Error   服务器内部错误
  502 Bad Gateway      网关错误（上游服务挂了）
  503 Service Unavailable 服务不可用（过载/维护）
  504 Gateway Timeout  网关超时
```

### 301 vs 302 vs 307 vs 308

```
              永久          临时
保持方法不变   308           307
方法可能变GET  301           302

// 实际影响：
// POST /login → 301/302 重定向：浏览器可能把 POST 改为 GET（历史行为）
// POST /login → 307/308 重定向：严格保持 POST 方法
// 推荐用 307/308 避免方法变更问题
```

---

## 2. HTTP 请求头 / 响应头

### 常见请求头

```
// 通用
Host: example.com
User-Agent: Mozilla/5.0 ...
Accept: text/html, application/json
Accept-Language: zh-CN, en;q=0.9
Accept-Encoding: gzip, deflate, br
Connection: keep-alive

// 缓存相关
Cache-Control: no-cache, max-age=0
If-None-Match: "etag-value"           // 协商缓存：携带 ETag
If-Modified-Since: Wed, 21 Oct 2025   // 协商缓存：携带 Last-Modified

// 认证
Authorization: Bearer <token>
Cookie: sessionId=abc123; theme=dark

// CORS
Origin: https://my-site.com
Referer: https://my-site.com/page

// 内容
Content-Type: application/json; charset=utf-8
Content-Length: 1024
```

### 常见响应头

```
// 通用
Content-Type: application/json; charset=utf-8
Content-Encoding: gzip
Content-Length: 512
Date: Wed, 21 Oct 2025 07:28:00 GMT
Server: nginx/1.21

// 缓存
Cache-Control: max-age=3600, public
ETag: "abc123"
Last-Modified: Wed, 21 Oct 2025 06:00:00 GMT
Expires: Wed, 21 Oct 2025 08:28:00 GMT

// 安全
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'

// CORS
Access-Control-Allow-Origin: https://my-site.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400

// Cookie
Set-Cookie: sessionId=abc; HttpOnly; Secure; SameSite=Strict; Path=/
```

---

## 3. HTTP 缓存

### 缓存流程

```
浏览器请求资源
  │
  ▼
检查强缓存（本地，不发请求）
  ├── Cache-Control: max-age=3600  → 资源未过期 → 使用本地缓存 (200 from cache)
  ├── Expires: <future-time>       → 资源未过期 → 使用本地缓存
  └── 已过期或 no-cache → 进入协商缓存
  │
  ▼
协商缓存（发请求，服务端判断）
  ├── If-None-Match: ETag值  → 服务端对比 ETag
  ├── If-Modified-Since: 时间 → 服务端对比修改时间
  │
  ├── 资源未变 → 304 Not Modified → 使用本地缓存
  └── 资源已变 → 200 + 新资源 + 新 ETag/Last-Modified
```

### 强缓存头

```
// Cache-Control（优先级高，HTTP/1.1）
Cache-Control: max-age=31536000    // 相对时间，缓存 N 秒
Cache-Control: no-cache            // ⚠️ 不是不缓存！是每次都要协商
Cache-Control: no-store            // 真正不缓存（敏感数据用这个）
Cache-Control: public              // 允许中间代理缓存
Cache-Control: private             // 只允许浏览器缓存（CDN 不缓存）
Cache-Control: immutable           // 缓存期间不验证（配合文件名 hash）
Cache-Control: max-age=3600, stale-while-revalidate=60  // 过期后先用缓存，后台更新

// Expires（HTTP/1.0，绝对时间，受客户端时钟影响，优先级低）
Expires: Wed, 21 Oct 2025 08:00:00 GMT

// ⚠️ Cache-Control 优先级 > Expires
```

### 协商缓存头

```
// ETag（优先级高，基于内容 hash）
// 服务端返回
ETag: "5d8c72a5edda8"
// 浏览器请求时带上
If-None-Match: "5d8c72a5edda8"

// Last-Modified（基于修改时间，精度秒级）
// 服务端返回
Last-Modified: Wed, 21 Oct 2025 06:00:00 GMT
// 浏览器请求时带上
If-Modified-Since: Wed, 21 Oct 2025 06:00:00 GMT

// ⚠️ ETag 优先级 > Last-Modified
// ETag 优势：
// 1. 精度更高（内容 hash vs 秒级时间）
// 2. 文件内容未变但修改时间变了 → ETag 不变，Last-Modified 变
// 3. 文件修改时间未变但内容变了（如秒内多次修改）→ ETag 变，Last-Modified 不变
```

### 实际缓存策略

```
// 带 hash 的静态资源（JS/CSS/图片）
// 文件名变化 → 内容一定变化 → 强缓存，永不过期
Cache-Control: max-age=31536000, immutable
// 配合 webpack/vite 的 contenthash

// HTML 入口文件
// 必须每次检查更新 → 协商缓存
Cache-Control: no-cache
// 或
Cache-Control: max-age=0, must-revalidate

// API 响应
// 通常不缓存或短缓存
Cache-Control: no-store          // 敏感数据
Cache-Control: max-age=60        // 可缓存的公共数据
```

---

## 4. HTTPS

### HTTP vs HTTPS

```
HTTP:  明文传输 → 可被窃听、篡改、冒充
HTTPS: HTTP + TLS → 加密传输

HTTPS 解决三个问题：
1. 机密性 — 加密传输，防窃听
2. 完整性 — 数据校验，防篡改
3. 身份认证 — 证书验证，防冒充
```

### TLS 握手流程（TLS 1.3）

```
客户端                                    服务端
  │                                         │
  │──── ClientHello ────────────────────────▶│
  │     (支持的加密套件、随机数 client_random) │
  │                                         │
  │◀──── ServerHello ───────────────────────│
  │      (选定的加密套件、随机数 server_random) │
  │      (证书 Certificate)                  │
  │                                         │
  │  [客户端验证证书链]                        │
  │  [计算预主密钥 Pre-Master Secret]         │
  │  [生成会话密钥 Session Key]               │
  │                                         │
  │──── Finished (加密) ────────────────────▶│
  │                                         │
  │◀──── Finished (加密) ───────────────────│
  │                                         │
  │◀════ 加密通信（对称加密）════════════════▶│

TLS 1.3 vs 1.2:
- 1.3: 1-RTT（一次往返完成握手）
- 1.2: 2-RTT（两次往返）
- 1.3: 0-RTT 恢复连接（之前连接过的可以 0 往返发数据）
- 1.3: 移除不安全的加密套件（RSA 密钥交换、RC4 等）
```

### 证书验证

```
1. 浏览器内置受信任的 CA（Certificate Authority）根证书
2. 服务端返回证书链：站点证书 → 中间证书 → 根证书
3. 浏览器用根证书公钥验证中间证书签名
4. 用中间证书公钥验证站点证书签名
5. 检查域名、有效期、吊销状态（CRL / OCSP）

自签名证书 → 浏览器不信任 → 显示安全警告
Let's Encrypt → 免费受信任证书
```

---

## 5. TCP 三次握手 / 四次挥手

### 三次握手（建立连接）

```
客户端                          服务端
  │                               │
  │── SYN (seq=x) ───────────────▶│   第一次：客户端发 SYN
  │                               │
  │◀── SYN+ACK (seq=y, ack=x+1) ──│   第二次：服务端回 SYN+ACK
  │                               │
  │── ACK (ack=y+1) ─────────────▶│   第三次：客户端回 ACK
  │                               │
  │◀══════ 连接建立，开始通信 ══════▶│

为什么三次？
- 防止历史连接（服务端确认客户端的收发能力都正常）
- 两次：服务端无法确认客户端收到了自己的 SYN+ACK
- 三次：双方都确认了对方的收发能力
```

### 四次挥手（断开连接）

```
客户端                          服务端
  │                               │
  │── FIN (seq=u) ───────────────▶│   第一次：客户端请求断开
  │                               │
  │◀── ACK (ack=u+1) ─────────────│   第二次：服务端确认（可能还有数据要发）
  │                               │
  │    [服务端继续发送剩余数据]      │
  │                               │
  │◀── FIN (seq=w) ───────────────│   第三次：服务端也请求断开
  │                               │
  │── ACK (ack=w+1) ─────────────▶│   第四次：客户端确认
  │                               │
  │    [TIME_WAIT 2MSL]            │   等待 2 个最大报文段生存时间
  │                               │
  │◀══════ 连接断开 ══════════════▶│

为什么四次？
- TCP 全双工：每个方向的关闭是独立的
- 服务端收到 FIN 时可能还有数据没发完，所以 ACK 和 FIN 分开发

为什么 TIME_WAIT？
- 确保最后的 ACK 到达服务端（丢了可以重发）
- 等待网络中该连接的残留报文消失，防止新连接收到旧数据
- 2MSL 通常为 60 秒（MSL = 30 秒）
```

### TCP 关键特性

```
1. 可靠传输 — 序号、确认、重传
2. 流量控制 — 滑动窗口（接收方告知发送方缓冲区大小）
3. 拥塞控制 — 慢启动、拥塞避免、快重传、快恢复
4. 有序传输 — 按序号排列
5. 全双工 — 双向同时通信
```

---

## 6. HTTP 版本演进

### HTTP/1.0 → 1.1

```
HTTP/1.0 问题：
- 每次请求都要新建 TCP 连接（短连接）
- 浏览器限制并发连接数（6-8 个）

HTTP/1.1 改进：
- 持久连接（Connection: keep-alive）— 复用 TCP 连接
- 管道化（Pipelining）— 请求可以连续发，但响应必须按顺序返回
- 分块传输（Transfer-Encoding: chunked）
- Host 头（支持虚拟主机）
- 缓存增强（Cache-Control, ETag）

HTTP/1.1 问题：
- 队头阻塞（Head-of-Line Blocking）
  响应必须按请求顺序返回，一个慢请求阻塞后面所有请求
  解决方案：域名分片（多开域名增加并发）、资源合并（雪碧图、concat）
```

### HTTP/2

```
基于 Google SPDY 协议，二进制分帧层

核心改进：
1. 二进制分帧
   - 将请求/响应拆分为多个帧（Frame）
   - 帧属于不同的流（Stream）
   - 帧可以乱序传输，接收端按流 ID 和序号重组

2. 多路复用（Multiplexing）
   - 一个 TCP 连接上并行多个请求/响应
   - 解决 HTTP 层的队头阻塞
   - 不再需要域名分片和资源合并

3. 头部压缩（HPACK）
   - 维护一个动态字典（已发送过的头部）
   - 后续只发送增量/索引
   - Cookie、User-Agent 等重复头部大幅压缩

4. 服务器推送（Server Push）
   - 服务端主动推送客户端可能需要的资源
   - <link rel="preload"> 更灵活，推送逐渐被弃用

5. 流优先级
   - 客户端可以指定流的优先级
   - 服务端按优先级分配资源
```

### HTTP/3

```
基于 QUIC（UDP），解决 TCP 层的队头阻塞

核心改进：
1. 基于 UDP
   - TCP 层队头阻塞：一个包丢失，所有流都阻塞等待重传
   - QUIC 每个流独立重传，一个流丢包不影响其他流

2. 0-RTT 连接建立
   - TLS 1.3 握手 1-RTT
   - QUIC 恢复连接 0-RTT（首次 1-RTT）
   - HTTP/2 + TLS = 3-RTT（TCP 1 + TLS 2）→ HTTP/3 = 1-RTT

3. 连接迁移
   - TCP 用四元组（源IP、源端口、目标IP、目标端口）标识连接
   - WiFi → 4G 切换 → IP 变了 → TCP 连接断开
   - QUIC 用 Connection ID 标识连接 → 网络切换不断连

4. 内置加密
   - QUIC 头部也加密（TCP + TLS 的头部是明文的）
   - 中间设备无法基于头部做流量控制

现状：
- Chrome、Firefox、Safari 已支持
- Cloudflare、Google 已大规模部署
- 中间设备（防火墙、代理）可能拦截 UDP 流量
```

### 版本对比

| 特性 | HTTP/1.1 | HTTP/2 | HTTP/3 |
|------|----------|--------|--------|
| 传输层 | TCP | TCP | QUIC (UDP) |
| 数据格式 | 文本 | 二进制帧 | 二进制帧 |
| 多路复用 | ❌ | ✅ | ✅ |
| 头部压缩 | ❌ | HPACK | QPACK |
| 队头阻塞 | 应用层 | TCP 层 | ❌ |
| 连接建立 | 1-RTT | 1-RTT + TLS | 0-1 RTT |
| 连接迁移 | ❌ | ❌ | ✅ |
| 服务器推送 | ❌ | ✅ | ✅（逐渐弃用） |

---

## 7. WebSocket

### 原理

```
HTTP 是请求-响应模式（半双工）：客户端发起 → 服务端响应
WebSocket 是全双工：建立连接后，双方可以随时互发数据

适用场景：
- 实时聊天
- 在线协作编辑
- 股票行情推送
- 游戏同步
- 实时通知
```

### 握手过程

```
// 客户端发起（HTTP Upgrade 请求）
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: http://example.com

// 服务端响应
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

// 握手完成后，HTTP 连接升级为 WebSocket 连接
// 后续数据以帧（Frame）形式传输，不再是 HTTP 格式
```

### 前端使用

```js
// 基本用法
const ws = new WebSocket('wss://example.com/chat')

ws.onopen = () => {
  console.log('连接建立')
  ws.send(JSON.stringify({ type: 'join', room: 'general' }))
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('收到消息:', data)
}

ws.onerror = (error) => {
  console.error('WebSocket 错误:', error)
}

ws.onclose = (event) => {
  console.log(`连接关闭: code=${event.code}, reason=${event.reason}`)
  // 自动重连
  if (!event.wasClean) {
    setTimeout(() => reconnect(), 3000)
  }
}

// 发送数据
ws.send('Hello')
ws.send(JSON.stringify({ type: 'message', content: 'Hi' }))
ws.send(new Blob([arrayBuffer]))  // 二进制

// 关闭连接
ws.close(1000, '正常关闭')

// 状态
ws.readyState
// 0: CONNECTING  1: OPEN  2: CLOSING  3: CLOSED
```

### WebSocket vs 轮询 vs SSE

| | 短轮询 | 长轮询 | SSE | WebSocket |
|---|---|---|---|---|
| 方向 | 单向 | 单向 | 单向（服务端→客户端） | 全双工 |
| 实时性 | 差 | 中 | 高 | 最高 |
| 开销 | 大（频繁请求） | 中 | 小 | 最小 |
| 复杂度 | 低 | 低 | 低 | 中 |
| 断线重连 | 自动 | 自动 | 自动 | 需手动 |
| 协议 | HTTP | HTTP | HTTP | WS/WSS |
| 适用 | 简单查询 | 简单通知 | 行情、日志 | 聊天、游戏 |

```js
// SSE（Server-Sent Events）— 服务端单向推送
const source = new EventSource('/api/stream')
source.onmessage = (e) => console.log(e.data)
source.onerror = () => console.error('SSE 错误')

// 服务端响应头
// Content-Type: text/event-stream
// Cache-Control: no-cache
// Connection: keep-alive
```

---

## 8. CORS 跨域

### 同源策略

```
同源 = 协议 + 域名 + 端口 完全相同

https://example.com:443  ←→  https://example.com:443  ✅ 同源
https://example.com      ←→  http://example.com       ❌ 协议不同
https://example.com      ←→  https://api.example.com  ❌ 域名不同
https://example.com      ←→  https://example.com:8080 ❌ 端口不同

限制范围：
- AJAX/Fetch 请求（❌ 跨域请求）
- DOM 访问（iframe 跨域不可访问）
- Cookie/LocalStorage/SessionStorage（跨域不可读取）

不受限制：
- <img> <link> <script> 等标签的 src/href
- <form> 提交
```

### 简单请求 vs 预检请求

```
简单请求（直接发送，无预检）：
1. 方法为 GET / HEAD / POST
2. Content-Type 仅限：
   - application/x-www-form-urlencoded
   - multipart/form-data
   - text/plain
3. 没有自定义请求头（除安全头：Accept, Accept-Language, Content-Type 等）
4. 没有 ReadableStream
5. 没有使用 XMLHttpRequestUpload
→ 满足以上所有条件 → 简单请求，直接发送

预检请求（先发 OPTIONS）：
→ 不满足简单请求条件 → 先发 OPTIONS 预检
→ 服务端返回允许的头部/方法
→ 浏览器确认后再发实际请求
```

### 预检流程

```
客户端                                  服务端
  │                                       │
  │── OPTIONS /api/data ─────────────────▶│  预检请求
  │   Origin: https://my-site.com         │
  │   Access-Control-Request-Method: PUT   │
  │   Access-Control-Request-Headers:      │
  │     Content-Type, Authorization        │
  │                                       │
  │◀── 200/204 ──────────────────────────│  预检响应
  │   Access-Control-Allow-Origin:         │
  │     https://my-site.com               │
  │   Access-Control-Allow-Methods:        │
  │     GET, POST, PUT, DELETE            │
  │   Access-Control-Allow-Headers:        │
  │     Content-Type, Authorization        │
  │   Access-Control-Max-Age: 86400        │
  │                                       │
  │── PUT /api/data ─────────────────────▶│  实际请求
  │   Origin: https://my-site.com         │
  │   Content-Type: application/json       │
  │   Authorization: Bearer xxx            │
  │                                       │
  │◀── 200 ──────────────────────────────│  实际响应
  │   Access-Control-Allow-Origin:         │
  │     https://my-site.com               │
```

### 服务端配置

```js
// Node.js (Express)
const cors = require('cors')

// 允许所有来源（开发环境）
app.use(cors())

// 精确配置
app.use(cors({
  origin: ['https://my-site.com', 'https://admin.my-site.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,       // 允许携带 Cookie
  maxAge: 86400,           // 预检缓存 24 小时
}))

// Nginx 配置
location /api/ {
  add_header 'Access-Control-Allow-Origin' '$http_origin' always;
  add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
  add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
  add_header 'Access-Control-Allow-Credentials' 'true' always;
  add_header 'Access-Control-Max-Age' 86400 always;

  if ($request_method = 'OPTIONS') {
    return 204;
  }

  proxy_pass http://backend;
}
```

### 携带 Cookie 的跨域请求

```js
// 前端
fetch('https://api.example.com/data', {
  credentials: 'include',  // 携带 Cookie
})

// 服务端必须：
// 1. Access-Control-Allow-Credentials: true
// 2. Access-Control-Allow-Origin 不能是 *，必须是具体域名
```

### 跨域解决方案对比

| 方案 | 适用场景 | 说明 |
|------|----------|------|
| CORS | 前后端分离（推荐） | 服务端配置，标准方案 |
| Nginx 反向代理 | 同域部署 | 前端请求同域，Nginx 转发到后端 |
| JSONP | 老项目兼容 | 只支持 GET，已淘汰 |
| postMessage | iframe / 窗口通信 | 跨窗口消息传递 |
| document.domain | 同主域子域 | 仅限子域之间，已废弃 |
| WebSocket | 实时通信 | 不受同源策略限制 |

---

## 9. Cookie / Session / Token

### Cookie

```
// 属性
Name=Value;
Domain=example.com;      // 作用域（包含子域）
Path=/;                  // 路径
Expires=Wed, 21 Oct 2025 // 过期时间（绝对时间）
Max-Age=3600;            // 过期时间（相对秒数，优先级 > Expires）
HttpOnly;                // JS 不可访问（防 XSS）
Secure;                  // 仅 HTTPS 传输
SameSite=Strict|Lax|None // 跨站限制（防 CSRF）

// 大小限制：4KB
// 每次请求自动携带（浪费带宽）
// 数量限制：每个域名约 50 个
```

### Session

```
基于 Cookie 的服务端状态管理

流程：
1. 用户登录 → 服务端创建 Session，生成 Session ID
2. 服务端把 Session ID 通过 Set-Cookie 返回
3. 浏览器后续请求自动携带 Cookie
4. 服务端通过 Session ID 查找 Session 数据

优点：
- 数据存服务端，客户端只有 ID → 安全
- 可随时销毁（服务端删除 Session）

缺点：
- 服务端存储压力（分布式需共享 Session）
- 每次请求都携带 Cookie → 浪费带宽
- 跨域需特殊处理
```

### Token（JWT）

```
基于 Token 的无状态认证

流程：
1. 用户登录 → 服务端验证 → 签发 Token（JWT）
2. 客户端存储 Token（localStorage / Cookie / 内存）
3. 每次请求通过 Authorization 头携带 Token
4. 服务端验证 Token 签名（无需查数据库）

优点：
- 无状态 → 服务端不需要存储 → 天然支持分布式
- 跨域方便（不依赖 Cookie）
- 可携带用户信息（payload）

缺点：
- 无法主动失效（除非维护黑名单）
- Token 泄露风险（存 localStorage 怕 XSS）
- payload 只是 Base64，不是加密

对比：
| | Session | Token (JWT) |
|---|---|---|
| 存储 | 服务端 | 客户端 |
| 状态 | 有状态 | 无状态 |
| 跨域 | 麻烦 | 方便 |
| 分布式 | 需共享 Session | 天然支持 |
| 主动失效 | 容易（删 Session） | 困难（需黑名单） |
| 安全性 | Cookie 可设 HttpOnly | 需防 XSS 窃取 |
```

---

## 10. DNS 解析

### 解析流程

```
1. 浏览器缓存
   浏览器 → 操作系统缓存 → hosts 文件

2. 本地 DNS 服务器（ISP 提供）
   递归查询：客户端 → 本地 DNS → 根 DNS → 顶级 DNS → 权威 DNS

3. 完整流程
   浏览器缓存
     ↓ miss
   操作系统缓存 / hosts
     ↓ miss
   本地 DNS 服务器（递归查询）
     ↓
   根域名服务器（.）
     ↓ 返回 .com 顶级域地址
   顶级域名服务器（.com）
     ↓ 返回 example.com 权威 DNS 地址
   权威域名服务器（example.com）
     ↓ 返回 www.example.com 的 IP
   本地 DNS 缓存结果 → 返回给浏览器
   浏览器缓存结果
```

### DNS 优化

```
// DNS 预解析
<link rel="dns-prefetch" href="//api.example.com">
// 提前解析域名，减少后续请求的 DNS 时间

// 预连接（DNS + TCP + TLS）
<link rel="preconnect" href="https://api.example.com">
// 比 dns-prefetch 更进一步，完成完整握手

// 预获取资源
<link rel="prefetch" href="https://cdn.example.com/data.json">
// 空闲时下载资源，后续页面可能用到

// HTTP/2 和 HTTP/3 下 preconnect 意义减小
// 因为多路复用，一个连接可以发很多请求
```

---

## 11. 从输入 URL 到页面展示

```
1. URL 解析
   - 判断协议、域名、端口、路径、参数

2. DNS 解析
   - 域名 → IP 地址（查缓存 → 递归查询）

3. TCP 连接
   - 三次握手建立连接
   - 如果是 HTTPS → TLS 握手

4. 发送 HTTP 请求
   - 构造请求行、请求头、请求体
   - 通过 TCP 发送

5. 服务端处理请求
   - 路由匹配 → 业务逻辑 → 数据库查询 → 构造响应

6. 返回 HTTP 响应
   - 状态行、响应头、响应体
   - 可能经过 CDN、Nginx、负载均衡

7. TCP 连接处理
   - keep-alive → 保持连接
   - 否则 → 四次挥手断开

8. 浏览器解析渲染
   a. 解析 HTML → 构建 DOM 树
   b. 解析 CSS → 构建 CSSOM 树
   c. 合并 DOM + CSSOM → 渲染树（Render Tree）
   d. 布局（Layout）→ 计算元素位置和大小
   e. 绘制（Paint）→ 像素绘制
   f. 合成（Composite）→ GPU 合成图层

9. 执行 JavaScript
   - <script> 阻塞 HTML 解析
   - defer: HTML 解析完后按顺序执行
   - async: 下载完立即执行（不保证顺序）
   - module: 默认 defer 行为

10. 加载子资源
    - 解析过程中遇到 img/css/js → 发起额外请求
    - 浏览器有预加载扫描器（Preload Scanner）提前发现资源
```

---

## 12. 网络优化

### 连接层面

```
1. 使用 HTTP/2 或 HTTP/3（多路复用）
2. 保持长连接（Connection: keep-alive）
3. DNS 预解析（dns-prefetch / preconnect）
4. 减少域名数量（HTTP/2 下不需要域名分片）
5. 使用 CDN（就近访问）
```

### 传输层面

```
1. 开启 Gzip / Brotli 压缩
2. 启用缓存（强缓存 + 协商缓存）
3. 资源压缩（minify JS/CSS/HTML）
4. 图片优化（WebP/AVIF、懒加载、响应式图片）
5. 按需加载（路由懒加载、组件懒加载）
6. 预加载关键资源（preload / prefetch）
```

### 请求层面

```
1. 合并请求（HTTP/1.1 下）
2. 请求去重（防止重复提交）
3. 请求节流/防抖
4. 接口合并（BFF 层聚合）
5. 数据分页 / 虚拟列表
6. WebSocket 替代轮询（高频更新场景）
```

### 缓存策略总结

```
HTML:       no-cache（每次协商）
JS/CSS:     max-age=31536000, immutable（文件名带 hash）
图片/字体:  max-age=2592000（30 天，文件名带 hash）
API:        no-store（敏感）或短 max-age（公共数据）
Service Worker: 离线缓存（Cache API）
```

---

## 参考资源

- [MDN HTTP](https://developer.mozilla.org/zh-CN/docs/Web/HTTP)
- [HTTP/2 详解](https://hpbn.co/http2/)
- [HTTP/3 详解](https://http3-explained.haxx.se/)
- [QUIC 协议](https://quicwg.org/)
- [CORS 详解](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS)
- [Web 性能权威指南](https://hpbn.co/)（Ilya Grigorik）
- [DNS 解析动画](https://howdns.works/)
