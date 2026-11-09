# 网络模型笔记

> 本文基于 ISO/IEC 7498-1（OSI 参考模型）、RFC 791/793/768（IP/TCP/UDP）、RFC 8200/1918/8305（IPv6/NAT 私有段/Happy Eyeballs）、RFC 9000/9001（QUIC）（2026-11 时点：TCP/UDP 仍是传输层事实标准，QUIC 已随 HTTP/3 大规模部署）。
> 关联：[网络协议](/notes/foundations/network-protocol)（HTTP 缓存/HTTPS/TCP 握手/CORS 等协议细节）· [WebSocket 与实时通信](/notes/practice/websocket-realtime)（实时方案对比）

## 1. 为什么要分层

```
互联网的设计铁律：中间是黑盒。
- 两端的协议栈保证正确收发，中间的路由器/交换机/防火墙对上层透明
- 任何一层可以独立演进（以太网换光纤、IPv4 换 IPv6、TCP 换 QUIC），
  只要层间接口（服务）不变，其它层无感知

类比 JS：
- 每层只调用相邻层的服务，就像你只调 Vue 的 render API 而不关心调度器怎么 tick
- Promise 链：每一环只认识上一环的 thenable 接口，不关心实现
```

**分层 = 松耦合 + 标准化接口 + 可独立演进。** 代价是每层都要处理一遍数据（封装开销），且排障时要在层间"翻译"。

---

## 2. OSI 七层模型

> OSI（Open Systems Interconnection）是 ISO 在 1984 年定义的**理论参考模型**，七层是教科书语言；实际互联网跑的是 TCP/IP 模型（TCP/IP 是 1970 年代先落地、OSI 是后来画的"理想图"）。OSI 的价值是**统一术语**，不是工程实现。

| 层 | 职责 | 数据单位 | 典型协议 |
|----|------|----------|----------|
| 7 应用层 | 为应用程序提供网络服务接口 | 数据（Data/Message） | HTTP、HTTPS、DNS、DHCP、SMTP、WebSocket |
| 6 表示层 | 数据格式转换、编码、加解密 | PDU | （TLS 实际工作在此层位置，JPEG/Protobuf 序列化） |
| 5 会话层 | 建立/管理/终止会话（对话的"连接"） | PDU | （实际由应用层协议承担，如 TLS 会话、QUIC 连接） |
| 4 传输层 | 端到端可靠/快速传输，端口复用 | 段（TCP 段）/ 用户数据报（UDP 数据报） | TCP、UDP、QUIC |
| 3 网络层 | 寻址 + 路由（把包从源主机送到目标主机） | 包（IP 数据报） | IPv4、IPv6、ICMP、（ARP 严格说工作在链路层） |
| 2 链路层 | 相邻节点（同一条链路内）的帧传输 | 帧（Frame） | 以太网、Wi-Fi（802.11）、PPP、ARP |
| 1 物理层 | 比特流在介质上的电气/光信号 | 比特（Bit） | 双绞线、光纤、无线电波 |

**两个要点：**

```
1. OSI 的 5/6 层（会话/表示）没有对应的实际协议实现 ——
   TCP/IP 直接把它们并入应用层。所以工程上常用「五层教学模型」：
   应用层 / 传输层 / 网络层 / 数据链路层 / 物理层

2. 术语「PDU」（Protocol Data Unit，协议数据单元）= 对等层之间交换数据的统称：
   上层叫 data/message，传输层叫 segment（TCP）/ datagram（UDP），
   网络层叫 packet（IP 包），链路层叫 frame（帧）
```

---

## 3. TCP/IP 模型与对照

```
OSI 七层                TCP/IP 四层（工程常用）
─────────────────────   ─────────────────────
  应用/表示/会话   ──▶  应用层（HTTP/DNS/TLS/WebSocket…）
      传输          ──▶  传输层（TCP/UDP/QUIC）
      网络          ──▶  网际层（IP/ICMP）
  链路/物理        ──▶  网络接入层（以太网 + Wi-Fi + 物理）
```

```
- RFC 791（IPv4）/ RFC 793（TCP）/ RFC 768（UDP）是网际层/传输层的经典定义
- 记忆口诀：OSI「7 层」是理想的，TCP/IP「4 层」是真实的
- 排障说"第 N 层问题"时，先确认对方说的是 OSI 的 N 还是 TCP/IP 的 N
```

---

## 4. 封装与解封装

> 封装（encapsulation）：数据每向下一层传递，就被加上该层的头部（有时还有尾部），形成该层的 PDU。接收端逐层剥头，叫解封装。

```
发送端（自上而下逐层加头）            接收端（自下而上逐层剥头）

  [ HTTP 请求体 ]
  [ 应用层  │ HTTP 头  + 请求体 ]
  [ 传输层  │ TCP 头   + HTTP ]      段（Segment）
  [ 网络层  │ IP 头    + 上述    ]    包（Packet）
  [ 链路层  │ 以太网头 + 上述 + FCS ] 帧（Frame）
  [ 物理层  │  比特流               ]

每一层只理解"本层头部"，其余当作不透明的载荷 —— 这就是黑盒原则
```

```
MTU（Maximum Transmission Unit，最大传输单元）：一条链路单跳能通过的最大帧长
- 以太网标准 MTU = 1500 字节
- IP 包超过 MTU 时，网络层做「分片」（fragmentation）：切成多个包，
  目标主机按 标识 + 片偏移 重组；任一片丢失 = 整个 IP 包丢失（所以 UDP 应用层
  要控制单包大小：IPv4 下安全上限 = 1500 - 20(IP) - 8(UDP) = 1472 字节）
- IPv6 端点不分片，超限直接丢弃并回 ICMP 报「需要分片」，由发送端调小
```

---

## 5. IPv4 vs IPv6（与 NAT）

> IPv4（RFC 791）/ IPv6（RFC 8200）。今天的互联网跑**双栈**（dual-stack）：一台机器同时持有两种地址，内核按目标选一种。

| | IPv4 | IPv6 |
|---|------|------|
| 地址长度 | 32 bit（4 字节），共 43 亿 | 128 bit（16 字节），约 3.4×10³⁸ |
| 写法 | 192.168.1.1 | 2001:db8::1（连续零段可压缩为 `::`） |
| IP 头 | 20 字节（含选项最大 60） | 固定 40 字节（无选项字段，路由转发更简单） |
| 最小链路 MTU | 68 字节 | 1280 字节（RFC 8200 保证） |
| 地址分配 | DHCP / 静态 | SLAAC（Stateless 自动配置，RFC 4862：路由器下发前缀 + 本端接口 ID 自拼） |
| NAT | 普遍需要 | 理论上不需要（地址管够） |
| 环回 | 127.0.0.0/8 | ::1 |
| 链路本地地址 | — | fe80::/10（不经路由器、同局域网通信用） |

**CIDR**（无类别域间路由，斜杠记法）：`/24` = 前 24 位是网络前缀，192.168.1.0/24 即 192.168.1.0 ~ 192.168.1.255。A/B/C 有类别划分是历史产物（RFC 4632/4633 于 2006 年正式废止）。

### 为什么 NAT 存在

```
公共 IPv4 地址耗尽（IANA 全球池 2011 年分完）
  → ISP / 家用路由器把整个内网藏在 NAT 后面（RFC 1918 私有地址段）：
      10.0.0.0/8、172.16.0.0/12、192.168.0.0/16
  → NAT（Network Address Translation，网络地址转换）：
      内网多台机器共用 1 个公网 IP，路由器维护「内网IP+端口 ↔ 公网IP+端口」映射表
  → 代价：端到端直连被打破
    - 外部无法主动连进内网（需要端口映射/公网 IP）
    - UDP NAT 状态复杂 → WebRTC P2P 要 STUN/ICE「打洞」
    - 运营商级 NAT（CGN/444）再叠一层，雪上加霜

前端视角：浏览器 → 公网服务器 的方向完全透明（是服务器侧在做映射）；
「家里/公司内网服务外网访问不了」几乎一定是 NAT 问题，不是代码问题。
```

### 前端实际会碰到的三件事

```js
// 1. IPv6 字面量必须加方括号，否则第一个冒号会被解析成端口
new URL('http://[::1]:3000')   // ✓
new URL('http://::1:3000')     // ✗ TypeError: Invalid URL

// 2. localhost 其实是一对：127.0.0.1 + ::1
//    浏览器用 Happy Eyeballs 算法（RFC 8305，取代 RFC 6555）建连：
//    并行查 A + AAAA 记录，优先 IPv6、间隔 ~250ms 竞赛尝试，谁先通用谁
//    → Vite dev server 监听 ::1 与 127.0.0.1 不是同一件事；
//      IPv6 网络坏了的主机连接会先卡几秒（等 IPv6 超时再 race 到 IPv4）

// 3. Anycast（任播）：全球多台服务器共享「同一个 IP 地址」——
//    8.8.8.8（Google DNS）、1.1.1.1（Cloudflare）、Cloudflare 104.x 段，
//    BGP 把流量路由到地理最近的节点 → CDN / 公共 DNS「全球都快」的原理之一
//    对照单播（unicast）：一个地址唯一投递到一台主机
```

---

## 6. 传输层：TCP vs UDP

> 这是"网络模型"里前端最常撞到的选择题。两者跑在同一个 IP 层之上，靠 IP 头的 protocol 字段（TCP=6 / UDP=17）区分，**端口号各自独立**（同一台机器上 TCP 80 和 UDP 80 可以是两个完全不同的服务）。

### 对比表

| | TCP | UDP |
|---|-----|-----|
| 定义 | RFC 793 | RFC 768 |
| 连接 | 有连接（三次握手建立、四次挥手断开，见[网络协议 §5](/notes/foundations/network-protocol#_5-tcp-三次握手-四次挥手)） | 无连接（发完即走，无状态） |
| 数据语义 | **字节流**（stream）：无消息边界，100 次 send 可能 1 次收全 | **数据报**（datagram）：保留消息边界，一条 send = 一条收 |
| 可靠性 | 可靠（序号 + 确认 + 超时重传） | 不可靠（丢了就丢了，重发靠应用层） |
| 有序 | 按序交付（乱序到达会重排） | 不保证 |
| 流控 | 滑动窗口（接收方通告窗口大小 wnd） | 无 |
| 拥塞控制 | 有（慢启动、拥塞避免、快重传、快恢复） | 无 |
| 组播/广播 | 不支持 | 支持 |
| 头部 | 最小 20 字节（含选项最大 60） | 固定 8 字节 |
| 校验和 | 必须 | IPv4 可选（全 0 = 不校验），**IPv6 必须** |
| 单包上限 | 理论 2³²-1（实际受 MTU 限制） | 理论 65535，IPv4 下实际 65507 |
| 延迟 | 高（握手 RTT + 重传等待 + 队头阻塞） | 低（无握手、无重传、无队头阻塞） |
| 典型应用 | HTTP/1-2、WebSocket、SSH、FTP、SMTP、MySQL、Redis | DNS、DHCP、NTP、TFTP、WebRTC、QUIC/HTTP3、在线游戏、实时音视频 |

```
队头阻塞（head-of-line blocking）：TCP 一个包丢了，后面再好的包也要等重传
才能交付 → 对实时音视频致命；UDP 直接丢弃过期帧 → 画面卡顿但声音不断
```

### 为什么"反直觉"地选 UDP

```
1. DNS 用 UDP：查询短小（一般 < 512B）且 QPS 极高，省掉连接开销；
   响应超过 512B 时置 TC 截断位 → 客户端自动改用 TCP 53 端口重试
2. QUIC/HTTP3 用 UDP（RFC 9000）：
   - 直接在 UDP 上造出"可靠 + 多路复用 + 内置 TLS 1.3"的新传输，绕开
     网络层 TCP 的队头阻塞（每个流独立重传）
   - 走 UDP 443 端口 → 中间盒（middlebox，路径中检查/改包的设备：防火墙、
     企业网关）大多放行 UDP 443，而新协议端口常被拦截 —— 用"伪装"换生存
3. WebRTC（RTCPeerConnection）：音视频帧过期即废，要的是低延迟不是可靠，
   用 SRTP（加密 RTP）跑在 UDP 上，经 ICE 打洞协商连通路径
```

### JS / Node 视角

```js
// 浏览器里你几乎只碰得到 TCP：fetch/XHR/WebSocket/SSE 底层全是 TCP 连接
// 唯一默认的 UDP 出口是 WebRTC：
const pc = new RTCPeerConnection({ iceServers: [] })
// SRTP/RTP 音频视频帧 = UDP；数据通道（DataChannel）可选可靠/不可靠模式

// Node 里传输层协议是显式的：
import net from 'node:net'    // TCP：net.createServer() / net.connect()
import dgram from 'node:dgram' // UDP：dgram.createSocket('udp4')
// 写一个 UDP 服务：
const socket = dgram.createSocket('udp4')
socket.on('message', (msg, rinfo) => socket.send('pong', rinfo.port, rinfo.address))
socket.bind(4000)
```

```
记住一条：浏览器 API 不暴露传输层选择（你没法 fetch() 走 UDP），
但「为什么这个 API 快/慢/断不断」的答案一半在 TCP/UDP 的特性里。
```

---

## 7. QUIC：跑在 UDP 上的"新 TCP"

```
RFC 9000（2021）/ RFC 9001（TLS 集成），Chrome/Cloudflare 大规模部署：

1. 传输层特性打包进 UDP：可靠交付、流多路复用（每个流独立重传，
   一个流丢包不卡其它流）、拥塞控制 —— 相当于"重写了 TCP"
2. 连接迁移：用 Connection ID（而非 IP+端口四元组）标识连接，
   WiFi → 4G 切换不断连（TCP 做不到，四元组一变连接就没了）
3. 握手更快：新连接 1-RTT（TCP 1 + TLS1.2 2 = 3-RTT）；
   复访连接 0-RTT（客户端首包直接带应用数据，需服务端发过 session ticket）
   ⚠️ 0-RTT 数据可被重放 → 只适合幂等请求（GET），带副作用的操作别走 0-RTT
4. 默认端口 = UDP 443（与 HTTPS 同端口号），服务端靠 alt-svc 响应头告知客户端
   "我支持 h3"，浏览器升级后复用

HTTP/3 = HTTP 语义 + QUIC 传输；协议细节（帧/流/优先级）见
[网络协议 §6](/notes/foundations/network-protocol#_6-http-版本演进)
```

---

## 8. 前端排障：按层定位

```
请求失败的报错文本基本就是"在第几层断的"：

1. DNS 层（网络层应用）：
   - "DNS_PROBE_FINISHED_NXDOMAIN" / "getaddrinfo ENOTFOUND"
   - 检查：域名拼写、hosts、DNS 服务器、内网/海外域名解析

2. TCP 层（传输层）：
   - "Failed to connect" / "ECONNREFUSED" / 握手卡住
   - 检查：端口是否通（telnet host port / nc -vz）、防火墙、服务器是否 listen

3. TLS 层（表示层位置）：
   - "ERR_CERT_AUTHORITY_INVALID" / "握手失败"
   - 检查：证书链、域名匹配、有效期、HSTS

4. 应用层（HTTP）：
   - 4xx/5xx、CORS 报错（CORS 是浏览器策略，网络层实际是通的）
   - 检查：状态码语义、请求头（见[网络协议 §8](/notes/foundations/network-protocol#_8-cors-跨域)）

DevTools Network 面板按请求（应用层视角）组织，但每个请求的 Timing 条
（Queuing → DNS → Connect → SSL → Wait）就是分层排障的时间轴。
```

---

## 参考

- [ISO/IEC 7498-1:1994（OSI 参考模型）](https://www.iso.org/standard/12320.html)
- [RFC 791 (IPv4) / RFC 793 (TCP) / RFC 768 (UDP)](https://www.rfc-editor.org/)
- [RFC 8200 (IPv6) / RFC 1918 (私有地址段) / RFC 8305 (Happy Eyeballs v2)](https://www.rfc-editor.org/rfc/rfc8200.html)
- [RFC 9000 (QUIC) / RFC 9001 (QUIC over TLS)](https://www.rfc-editor.org/rfc/rfc9000.html)
- [MDN：传输层](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebSocket)
- [Computer Networking: A Top-Down Approach (Kurose & Ross) 第 1 章](https://gaia.cs.umass.edu/kurose/website/index.html)
