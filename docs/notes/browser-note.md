# 浏览器 Note

[Web API](https://wangdoc.com/webapi/)

## 浏览器渲染流程

### URL 输入到页面展示全过程

1. **DNS 解析**：域名 → IP 地址
2. **TCP 连接**：三次握手建立连接
3. **HTTP 请求**：发送请求，服务器返回 HTML 文档
4. **HTML 解析**：逐字节读取，构建 DOM 树
5. **CSS 解析**：解析样式表，构建 CSSOM 树
6. **渲染树构建**：DOM + CSSOM = Render Tree
7. **布局（Layout/Reflow）**：计算每个节点的几何信息
8. **绘制（Paint）**：将节点转为像素
9. **合成（Composite）**：将图层合成为最终页面

### HTML 解析 → DOM 树

```js
// 浏览器将 HTML 转为 Token，再构建 DOM 节点
// <div><p>Hello</p></div> → Document → div → p → "Hello"
console.log(document.documentElement); // <html> 节点
```

### CSS 解析 → CSSOM

```css
/* CSSOM 与 DOM 是两棵独立的树 */
body { font-size: 16px; }
p { color: red; margin: 20px; }
```

### DOM + CSSOM = 渲染树

+ 渲染树只包含可见节点（`display: none` 的元素不在渲染树中）
+ `visibility: hidden` 的元素仍在渲染树中，只是不可见

### 布局 → 绘制 → 合成

```
Layout（计算位置大小）→ Paint（绘制像素）→ Composite（GPU合成图层）
```

### script/link/img 的加载与阻塞行为

| 属性 | 是否阻塞 HTML 解析 | 是否阻塞渲染 | 执行顺序 |
|------|-------------------|-------------|---------|
| `<script>` | ✅ 阻塞 | ✅ 阻塞 | 按顺序 |
| `<script defer>` | ❌ 不阻塞 | ✅ DOMContentLoaded 前执行 | 按顺序 |
| `<script async>` | ❌ 不阻塞 | 下载完即执行 | 无序 |
| `<link rel="stylesheet">` | ❌ 不阻塞 | ✅ 阻塞渲染 | - |
| `<link rel="preload">` | - | 提前加载关键资源 | - |
| `<link rel="prefetch">` | - | 空闲时预加载未来资源 | - |

```html
<!-- defer：DOMContentLoaded 前按顺序执行 -->
<script defer src="app.js"></script>

<!-- async：下载完立即执行，不保证顺序 -->
<script async src="analytics.js"></script>

<!-- preload：提前加载关键资源 -->
<link rel="preload" href="font.woff2" as="font" crossorigin>
```

### 关键渲染路径优化

+ **减少关键资源数量**：内联关键 CSS，延迟加载非关键 JS
+ **减少关键路径长度**：减少往返请求次数（CDN、合并请求）
+ **减少关键字节数**：压缩、Gzip、Tree Shaking

## 重排与重绘

### 重排（Reflow）

几何属性变化导致布局重新计算：`width`, `height`, `margin`, `padding`, `border-width`, `top`, `left`, `font-size` 等。

### 重绘（Repaint）

外观属性变化，不影响布局：`color`, `background`, `visibility`, `box-shadow` 等。

```
重排 → 必定触发重绘
重绘 → 不一定会触发重排
```

### 触发重排的操作

```js
// 读取以下属性会强制同步布局（Force Reflow）
element.offsetHeight
element.offsetWidth
element.clientHeight
element.scrollTop
element.getBoundingClientRect()
window.getComputedStyle(element)
window.scrollX / scrollY
```

### 如何避免/减少重排重绘

**使用 transform/opacity（GPU 合成层，不重排不重绘）**

```css
/* ✅ 推荐：只触发合成，性能最好 */
.moving {
  transform: translateX(100px);
  opacity: 0.5;
}

/* ❌ 避免：触发重排 */
.moving {
  left: 100px;
  margin-left: 10px;
}
```

**will-change 提前告知浏览器**

```css
.animated {
  will-change: transform, opacity; /* 提前创建合成层 */
}
```

**批量 DOM 操作**

```js
// 方式一：DocumentFragment
const fragment = document.createDocumentFragment();
for (let i = 0; i < 100; i++) {
  const li = document.createElement('li');
  li.textContent = `Item ${i}`;
  fragment.appendChild(li);
}
list.appendChild(fragment); // 只触发一次重排

// 方式二：先隐藏再操作
el.style.display = 'none';
// ... 批量修改 ...
el.style.display = 'block';
```

**读写分离（避免布局抖动 Layout Thrashing）**

```js
// ❌ 读写交替，每次读都强制重排
elements.forEach(el => {
  const height = el.offsetHeight; // 强制同步布局
  el.style.height = height * 2 + 'px';
});

// ✅ 先批量读，再批量写
const heights = elements.map(el => el.offsetHeight);
elements.forEach((el, i) => {
  el.style.height = heights[i] * 2 + 'px';
});
```

### 合成层（Composite Layer）

+ 使用 `transform`、`opacity`、`will-change` 等属性可将元素提升为独立合成层
+ 合成层的动画由 GPU 处理，不触发重排和重绘
+ 过多合成层会消耗 GPU 内存，需合理使用

## 事件系统

### 事件冒泡 vs 事件捕获

```
捕获阶段（从外到内）：window → document → html → body → ... → target
冒泡阶段（从内到外）：target → ... → body → html → document → window
```

### addEventListener 第三个参数

```js
// 传统写法：true = 捕获阶段监听
element.addEventListener('click', handler, true);

// 现代写法：options 对象
element.addEventListener('click', handler, {
  capture: false,  // 是否在捕获阶段监听
  once: true,      // 只执行一次后自动移除
  passive: true    // 不会调用 preventDefault（优化滚动性能）
});
```

### 事件委托

```js
// 利用冒泡机制，将事件监听绑定到父元素
document.getElementById('list').addEventListener('click', (e) => {
  const target = e.target.closest('li');
  if (!target) return;
  if (target.matches('.delete-btn')) {
    target.remove();
  }
  console.log('Clicked:', target.textContent);
});
```

+ **优点**：减少事件监听器数量、动态元素自动生效、内存占用更低

### 阻止事件相关方法

```js
e.stopPropagation();          // 阻止事件继续冒泡/捕获
e.preventDefault();           // 阻止默认行为（如链接跳转、表单提交）
e.stopImmediatePropagation(); // 阻止冒泡 + 阻止同元素其他监听器执行
```

### 自定义事件 CustomEvent

```js
// 创建并派发自定义事件
const event = new CustomEvent('myEvent', {
  bubbles: true,
  detail: { userId: 123, action: 'login' }
});
document.dispatchEvent(event);

// 监听
document.addEventListener('myEvent', (e) => {
  console.log(e.detail); // { userId: 123, action: 'login' }
});
```

### 常见事件类型对比

| 事件 | 触发时机 |
|------|---------|
| `DOMContentLoaded` | DOM 解析完成（不等图片/样式表） |
| `load` | 所有资源（图片、样式等）加载完成 |
| `input` | 输入框内容每次变化时立即触发 |
| `change` | 输入框失去焦点且值变化时触发 |

## 浏览器存储

### 存储方案对比

| 特性 | Cookie | localStorage | sessionStorage | IndexedDB |
|------|--------|-------------|---------------|-----------|
| 容量 | ~4KB | ~5-10MB | ~5-10MB | 无上限（GB级） |
| 生命周期 | 可设置 | 永久（需手动清除） | 会话结束清除 | 永久（需手动清除） |
| API | 字符串操作 | 简单 KV | 简单 KV | 异步事务 API |
| 数据类型 | 字符串 | 字符串 | 字符串 | 任意结构化数据 |
| 同源限制 | ✅ | ✅ | ✅（含标签页） | ✅ |
| 自动发送 | 每次 HTTP 请求携带 | 不发送 | 不发送 | 不发送 |

### Cookie 详解

```js
// 设置 Cookie
document.cookie = "name=value; expires=Fri, 31 Dec 2025 23:59:59 GMT; path=/; domain=.example.com; secure; samesite=strict";
```

| 属性 | 说明 |
|------|------|
| `domain` | 指定 Cookie 对哪些域可见 |
| `path` | 指定 Cookie 对哪些路径可见 |
| `expires` / `max-age` | 过期时间（不设则为会话 Cookie） |
| `secure` | 仅 HTTPS 传输 |
| `httpOnly` | JS 无法读取（防御 XSS 窃取） |
| `sameSite` | `Strict` / `Lax` / `None`（防御 CSRF） |

### Cache API（配合 Service Worker）

```js
// 缓存资源
caches.open('v1').then(cache => {
  cache.addAll(['/style.css', '/app.js', '/logo.png']);
});

// 匹配缓存
caches.match('/style.css').then(response => {
  if (response) return response; // 命中缓存
  return fetch('/style.css');    // 未命中，走网络
});
```

### 各方案适用场景

+ **Cookie**：身份认证 Token、服务端需要读取的状态
+ **localStorage**：用户偏好设置、持久化缓存
+ **sessionStorage**：多步表单数据、标签页内临时状态
+ **IndexedDB**：大量结构化数据、离线应用、文件/Blob 存储
+ **Cache API**：PWA 离线缓存、Service Worker 资源管理

## 浏览器安全

### 同源策略（Same-Origin Policy）

同源 = **协议 + 域名 + 端口** 完全相同。

| 操作 | 是否受限 |
|------|---------|
| Cookie/localStorage/IndexDB | ✅ 受限 |
| DOM 访问（iframe） | ✅ 受限 |
| AJAX 请求（非同源） | ✅ 受限（需 CORS） |
| `<script src>` / `<img src>` / `<link href>` | ❌ 不受限 |

### XSS 攻击与防御

**三种类型：**
+ **反射型**：恶意脚本在 URL 参数中，服务端直接回显
+ **存储型**：恶意脚本存入数据库，其他用户访问时执行
+ **DOM 型**：前端 JS 直接操作不安全的数据到 DOM

```js
// ❌ 危险：直接插入 HTML
element.innerHTML = userInput;

// ✅ 安全：使用 textContent
element.textContent = userInput;

// ✅ 安全：输出编码
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}
```

**防御手段：** 输入过滤、输出编码、CSP、HttpOnly Cookie

### CSRF 攻击与防御

```
攻击原理：用户已登录 A 站，访问恶意 B 站，B 站构造请求发送到 A 站
```

**防御手段：**
+ **CSRF Token**：请求携带不可预测的 Token，服务端验证
+ **SameSite Cookie**：设置 `SameSite=Strict` 或 `Lax`
+ **Referer/Origin 检查**：验证请求来源

### CSP（Content Security Policy）

```
Content-Security-Policy: default-src 'self';
  script-src 'self' https://cdn.example.com;
  style-src 'self' 'unsafe-inline';
  img-src * data:;
  connect-src 'self' https://api.example.com;
```

### HTTPS 基础

```
TLS 握手简述：
1. Client Hello（支持的加密算法列表）
2. Server Hello（选定算法 + 证书）
3. 客户端验证证书链 → 生成预主密钥 → 用服务器公钥加密发送
4. 双方生成会话密钥 → 开始加密通信
```

### Clickjacking 与 X-Frame-Options

```
X-Frame-Options: DENY          // 禁止任何页面嵌入
X-Frame-Options: SAMEORIGIN    // 仅允许同源页面嵌入

// 或使用 CSP
Content-Security-Policy: frame-ancestors 'self';
```

## BOM（浏览器对象模型）

### window 对象

```js
// 打开/关闭窗口
window.open('https://example.com', '_blank', 'width=600,height=400');
window.close();

// 定时器
const timerId = setTimeout(() => console.log('1s后'), 1000);
clearTimeout(timerId);

const intervalId = setInterval(() => console.log('每秒'), 1000);
clearInterval(intervalId);

// 动画帧（约 60fps）
function animate() {
  element.style.transform = `translateX(${x}px)`;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

### location

```js
location.href;     // 完整 URL
location.hash;     // #后面的部分
location.search;   // ?后面的查询字符串
location.reload(); // 刷新页面
location.assign('/new-page');  // 跳转（保留历史记录）
location.replace('/new-page'); // 跳转（替换当前历史记录）
```

### history（SPA 路由原理）

```js
// pushState：添加历史记录条目，不刷新页面
history.pushState({ page: 2 }, '', '/page/2');

// replaceState：替换当前历史记录条目
history.replaceState({ page: 1 }, '', '/page/1');

// 监听浏览器前进/后退
window.addEventListener('popstate', (event) => {
  console.log('state:', event.state);
  // 根据 URL 渲染对应页面
});
```

+ **SPA 路由原理**：通过 `pushState` 改变 URL 但不刷新，监听 `popstate` 处理前进后退，前端根据路径渲染对应组件

### navigator

```js
navigator.userAgent;           // 浏览器标识字符串
navigator.geolocation;         // 地理定位 API
navigator.clipboard;           // 剪贴板 API
navigator.onLine;              // 是否在线

// 地理定位
navigator.geolocation.getCurrentPosition(pos => {
  console.log(pos.coords.latitude, pos.coords.longitude);
});

// 剪贴板
navigator.clipboard.writeText('复制的内容');
navigator.clipboard.readText().then(text => console.log(text));
```

### screen

```js
screen.width;       // 屏幕宽度
screen.height;      // 屏幕高度
screen.colorDepth;  // 颜色深度（通常 24）
screen.availWidth;  // 可用宽度（排除任务栏）
```

## 网络请求 API

+ XMLHttpRequest（传统方式）

  ```js
  const xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/data');
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      console.log(JSON.parse(xhr.responseText));
    }
  };
  xhr.send();
  ```

+ Fetch API（现代方式）

  + 基本用法与请求配置

    ```js
    // GET 请求
    const response = await fetch('/api/users');
    const data = await response.json();

    // POST 请求
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John', age: 30 })
    });
    ```

  + 错误处理（fetch 不拒绝 HTTP 错误状态码）

    ```js
    async function fetchData(url) {
      try {
        const response = await fetch(url);
        // 必须手动检查状态码
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('请求失败:', error);
      }
    }
    ```

  + AbortController 取消请求

    ```js
    const controller = new AbortController();
    fetch('/api/data', { signal: controller.signal })
      .then(res => res.json())
      .catch(err => {
        if (err.name === 'AbortError') {
          console.log('请求已取消');
        }
      });

    // 超时取消
    setTimeout(() => controller.abort(), 5000);
    ```

  + 与 XHR 对比：Fetch 基于 Promise，语法更简洁，但不支持上传进度监听，默认不携带 Cookie（需配置 `credentials: 'include'`）

+ WebSocket 双向通信

  ```js
  const ws = new WebSocket('wss://example.com/socket');

  ws.onopen = () => {
    ws.send('Hello Server');
    // 心跳保活
    setInterval(() => ws.send('ping'), 30000);
  };

  ws.onmessage = (event) => {
    console.log('收到消息:', event.data);
  };

  ws.onclose = () => {
    // 自动重连
    setTimeout(() => location.reload(), 3000);
  };
  ```

+ Server-Sent Events（SSE）服务端推送

  ```js
  const source = new EventSource('/api/stream');
  source.onmessage = (event) => {
    console.log('推送数据:', event.data);
  };
  source.onerror = () => source.close();
  ```

+ Beacon API（页面关闭时发送数据）

  ```js
  window.addEventListener('pagehide', () => {
    navigator.sendBeacon('/api/log', JSON.stringify({ action: 'page_close' }));
  });
  ```

## SSE vs WebSocket 对比

### 核心差异

| 特性 | SSE (Server-Sent Events) | WebSocket |
|------|-------------------------|-----------|
| **通信方向** | 单向（服务器 → 客户端） | 双向（全双工） |
| **协议** | HTTP/HTTPS | ws/wss（独立协议） |
| **数据格式** | 纯文本（UTF-8） | 文本/二进制 |
| **自动重连** | ✅ 内置支持 | ❌ 需手动实现 |
| **断点续传** | ✅ Last-Event-ID 机制 | ❌ 需手动实现 |
| **实现复杂度** | 简单（标准 HTTP） | 较复杂（协议升级） |
| **浏览器支持** | 主流浏览器 | 主流浏览器 |
| **代理/防火墙** | 友好（走 HTTP） | 可能被拦截 |
| **适用场景** | 服务器推送、实时通知 | 聊天、游戏、协作编辑 |

### 前端 API 对比

**SSE:**
```javascript
// 基本用法
const source = new EventSource('/api/stream');

source.onopen = () => console.log('连接已建立');

source.onmessage = (event) => {
  console.log('收到消息:', event.data);
};

// 自定义事件
source.addEventListener('user-update', (event) => {
  console.log('用户更新:', JSON.parse(event.data));
});

source.onerror = (error) => {
  console.error('连接错误:', error);
  source.close(); // 手动关闭
};

// 注意：SSE 不支持客户端主动发送数据
// 需要发送数据时，用 fetch/axios 发 POST 请求
```

**WebSocket:**
```javascript
// 基本用法
const ws = new WebSocket('wss://example.com/socket');

ws.onopen = () => {
  console.log('连接已建立');
  ws.send('Hello Server'); // 客户端可以主动发送
};

ws.onmessage = (event) => {
  console.log('收到消息:', event.data);
  
  // 二进制数据处理
  if (event.data instanceof Blob) {
    // 处理文件/图片
  } else if (event.data instanceof ArrayBuffer) {
    // 处理二进制流
  }
};

ws.onclose = (event) => {
  console.log(`连接关闭: code=${event.code}, reason=${event.reason}`);
  // 自动重连逻辑
  if (!event.wasClean) {
    setTimeout(() => reconnect(), 3000);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket 错误:', error);
};

// 心跳保活
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send('ping');
  }
}, 30000);
```

### 后端实现对比

**SSE (Node.js/Express):**
```javascript
app.get('/api/stream', (req, res) => {
  // 设置 SSE 响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // 发送数据
  let id = 0;
  const interval = setInterval(() => {
    res.write(`id: ${id++}\n`);           // 事件 ID（用于断点续传）
    res.write(`event: message\n`);        // 事件类型（可选）
    res.write(`data: ${JSON.stringify({ time: new Date() })}\n\n`); // 数据（必须两个换行结束）
  }, 1000);

  // 客户端断开时清理
  req.on('close', () => {
    clearInterval(interval);
  });
});

// 断点续传支持
app.get('/api/stream', (req, res) => {
  const lastEventId = req.headers['last-event-id'];
  // 从 lastEventId 之后开始发送...
});
```

**WebSocket (Node.js/ws):**
```javascript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws, req) => {
  console.log('客户端已连接');

  ws.on('message', (data) => {
    console.log('收到消息:', data.toString());
    
    // 广播给所有客户端
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  ws.on('close', () => {
    console.log('客户端断开');
  });

  // 发送初始数据
  ws.send(JSON.stringify({ type: 'welcome', message: '连接成功' }));
});
```

### 选择建议

**选 SSE 的场景：**
- ✅ AI 流式输出（ChatGPT 风格）
- ✅ 实时通知/消息推送
- ✅ 股票行情、日志流
- ✅ 服务器状态监控
- ✅ 只需要服务器单向推送

**选 WebSocket 的场景：**
- ✅ 实时聊天室
- ✅ 多人协作编辑（如 Google Docs）
- ✅ 在线游戏
- ✅ 实时音视频信令
- ✅ 需要频繁双向通信

### 性能对比

```
连接建立：
- SSE: HTTP 请求 → 保持连接（快，复用 HTTP 连接池）
- WebSocket: HTTP 升级 → 协议切换（稍慢，需要握手）

数据传输：
- SSE: 文本数据，每条消息有 HTTP 头开销
- WebSocket: 帧协议，开销小（2-14 字节/帧）

并发连接：
- SSE: 受浏览器限制（HTTP/1.1: 6 个，HTTP/2: 100+）
- WebSocket: 无此限制，可以开更多连接

断线重连：
- SSE: 自动重连 + Last-Event-ID 断点续传
- WebSocket: 需要手动实现重连逻辑
```

### 混合使用模式

实际项目中常见的模式：**SSE 接收 + HTTP 发送**

```javascript
// 接收实时推送用 SSE
const source = new EventSource('/api/notifications');
source.onmessage = (event) => {
  updateUI(JSON.parse(event.data));
};

// 发送操作用 HTTP POST
async function sendMessage(content) {
  await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  // 服务器处理后通过 SSE 推送给所有客户端
}
```

这种模式比纯 WebSocket 更简单，适合"读多写少"的场景。

## 页面生命周期

+ visibilitychange（页面可见/隐藏切换）

  ```js
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('页面隐藏，暂停动画/定时器');
    } else {
      console.log('页面显示，恢复动画/定时器');
    }
  });
  ```

+ pagehide / pageshow（bfcache 相关）

  ```js
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) {
      console.log('页面进入 bfcache');
    }
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      console.log('页面从 bfcache 恢复');
    }
  });
  ```

+ beforeunload（离开前确认，现代浏览器限制较多）

  ```js
  window.addEventListener('beforeunload', (event) => {
    // 现代浏览器会忽略自定义文本，仅弹出默认确认框
    event.preventDefault();
    event.returnValue = '';
  });
  ```

+ Page Lifecycle API 状态：active → passive → hidden → frozen → discarded

  + active：页面可见且有焦点
  + passive：页面可见但无焦点
  + hidden：页面不可见
  + frozen：页面被冻结，JS 暂停执行
  + discarded：页面被丢弃以释放内存

+ 实际应用：页面隐藏时暂停动画/定时器、数据上报时机

  ```js
  let timer;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(timer);
      // 页面隐藏时上报数据
      navigator.sendBeacon('/api/analytics', JSON.stringify({ timestamp: Date.now() }));
    } else {
      timer = setInterval(updateUI, 1000);
    }
  });
  ```

## requestAnimationFrame

+ 与 setTimeout/setInterval 的区别：requestAnimationFrame 与浏览器刷新率同步（通常 60fps = 16.7ms/帧），页面不可见时自动暂停，更省电

+ 动画实现示例

  ```js
  // 平滑滚动
  function smoothScrollTo(targetY, duration = 500) {
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * progress);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  // 进度条动画
  let progress = 0;
  function animateProgress() {
    progress += 0.01;
    document.getElementById('bar').style.width = `${progress * 100}%`;
    if (progress < 1) {
      requestAnimationFrame(animateProgress);
    }
  }
  requestAnimationFrame(animateProgress);
  ```

+ cancelAnimationFrame

  ```js
  let rafId = requestAnimationFrame(animate);
  cancelAnimationFrame(rafId); // 取消动画帧
  ```

+ 实际应用：代替 scroll/resize 事件监听做节流

  ```js
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        // 处理滚动逻辑
        console.log('scroll position:', window.scrollY);
        ticking = false;
      });
      ticking = true;
    }
  });
  ```

## Web Components

+ Custom Elements（自定义元素）

  ```js
  class MyComponent extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      // 元素插入 DOM 时调用
      this.shadowRoot.innerHTML = '<p>Hello Web Component!</p>';
    }

    disconnectedCallback() {
      // 元素从 DOM 移除时调用
    }

    attributeChangedCallback(name, oldValue, newValue) {
      // 属性变化时调用
      console.log(`${name}: ${oldValue} -> ${newValue}`);
    }

    static get observedAttributes() {
      return ['data-value'];
    }
  }

  customElements.define('my-component', MyComponent);
  ```

+ Shadow DOM（样式隔离）

  ```js
  const shadow = this.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      p { color: red; } /* 只影响 Shadow DOM 内部 */
    </style>
    <slot name="header"></slot>
    <p>默认内容</p>
  `;
  ```

+ HTML Templates 和 slot 分发

  ```html
  <template id="my-template">
    <slot name="title"></slot>
    <slot></slot>
  </template>

  <my-component>
    <h1 slot="title">标题</h1>
    <p>正文内容</p>
  </my-component>
  ```

+ 完整示例：创建一个简单的自定义组件

  ```js
  class CounterButton extends HTMLElement {
    constructor() {
      super();
      this.count = 0;
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <button>点击次数: <span>0</span></button>
        <style>button { padding: 8px 16px; }</style>
      `;
    }

    connectedCallback() {
      const btn = this.shadowRoot.querySelector('button');
      const span = this.shadowRoot.querySelector('span');
      btn.addEventListener('click', () => {
        this.count++;
        span.textContent = this.count;
      });
    }
  }

  customElements.define('counter-button', CounterButton);
  ```

## Web Vitals（性能指标）

+ Core Web Vitals

  + LCP（Largest Contentful Paint，最大内容绘制）：衡量页面主要内容加载速度
  + INP（Interaction to Next Paint，交互到下一次绘制）：衡量页面响应交互的延迟
  + CLS（Cumulative Layout Shift，累积布局偏移）：衡量页面视觉稳定性

+ 其他指标

  + FCP（First Contentful Paint，首次内容绘制）
  + TTFB（Time to First Byte，首字节时间）

+ 各指标标准

  + LCP：≤2.5s（好）、2.5s~4s（需改进）、>4s（差）
  + INP：≤200ms（好）、200ms~500ms（需改进）、>500ms（差）
  + CLS：≤0.1（好）、0.1~0.25（需改进）、>0.25（差）

+ 用 PerformanceObserver 测量各指标

  ```js
  // 测量 LCP
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.startTime);
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  // 测量 CLS
  let clsValue = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    }
    console.log('CLS:', clsValue);
  }).observe({ type: 'layout-shift', buffered: true });

  // 测量 INP
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('INP:', entry.duration);
    }
  }).observe({ type: 'event', buffered: true });
  ```

+ 优化建议

  + LCP：优化图片加载（懒加载、WebP 格式）、减少关键资源阻塞、使用 CDN
  + INP：减少主线程长任务、使用 Web Worker、优化事件处理函数
  + CLS：为图片/视频设置固定尺寸、避免动态插入内容、使用 transform 做动画

## IndexedDB

+ IndexedDB是一种在浏览器中使用的客户端数据库，它提供了一种存储和检索大量结构化数据的方式
  + 与LocalStorage相比，IndexedDB具有更高的存储容量和更好的性能。LocalStorage通常只能存储几MB的数据，而IndexedDB可以存储GB级别的数据。
  + LocalStorage只能存储字符串类型的数据，而IndexedDB可以存储任意类型的数据。
  + 与WebSQL相比，IndexedDB是一种更为现代化和强大的解决方案。WebSQL是一种基于SQL的关系型数据库，但是它已经不再被推荐使用，因为它的规范已经停止更新，并且在某些浏览器中已经被移除。相比之下，IndexedDB是一种更加标准化和跨浏览器的解决方案，得到了广泛的支持

+ 特点和优势
  + 强大的存储能力：IndexedDB可以存储大量的结构化数据，支持GB级别的存储容量。
  + 高性能的数据检索：IndexedDB支持索引，可以通过索引进行高效的数据查询。
  + 事务支持：IndexedDB支持事务操作，可以在一个原子操作中执行多个数据库操作，保证数据的一致性。
  + 离线访问和数据持久化：IndexedDB可以使得Web应用程序具备离线访问和数据持久化的能力。
  + 跨浏览器支持：IndexedDB得到了主流浏览器的广泛支持，可以在多个平台和设备上使用。

+ 使用示例

  ```js
  // 打开或创建数据库
  var request = indexedDB.open('myDatabase', 1);

  // 数据库打开成功的回调函数
  request.onsuccess = function(event) {
    var db = event.target.result;
    
    // 创建一个事务
    var transaction = db.transaction(['users'], 'readwrite');
    
    // 获取对象存储空间
    var store = transaction.objectStore('users');
    
    // 添加数据
    var user = { id: 1, name: 'John Doe', age: 30 };
    var addUserRequest = store.add(user);
    
    // 添加数据成功的回调函数
    addUserRequest.onsuccess = function(event) {
      console.log('User added successfully');
    };
    
    // 查询数据
    var getUserRequest = store.get(1);
    
    // 查询数据成功的回调函数
    getUserRequest.onsuccess = function(event) {
      var user = event.target.result;
      console.log('User:', user);
    };
    
    // 关闭数据库
    db.close();
  };

  // 数据库打开失败的回调函数
  request.onerror = function(event) {
    console.error('Failed to open database');
  };
  ```

## MutationObserver

+ 用于监听DOM对象的变更（包括子节点），当节点属性发生变化，或执行增删改操作时执行对应的callback

+ 基本使用

  ```js
  // Observer需要一个用于监听的目标DOM
  const targetNode = document.getElementById("app");

  //用于确定mutation监听变化的范围
  const config = { 
    attributes: true, // 监听目标节点的属性变化，例如id，class等属性
    childList: true, // 除目标节点外还要监听目标节点的直接子节点
    subtree: true,  // subtree的范围大于childList，还包括子节点children
    characterData: true   // 监听TextNode需要额外配置，默认TextNode变化不会触发callback
  };

  // 当观察到变动时执行的回调函数，mutationsList包含本次变更的信息
  const callback = function (mutationsList, observer) {
    console.log(mutationsList)
  };

  const observer = new MutationObserver(callback);
  observer.observe(targetNode, config);
  ```

+ API

  + `observe` 用于开启对某个DOM的监听，一个MutationObserver可以通过多次调用observe监听多个DOM的变化。
  + `disconnect` 调用observer.disconnect后Observer将不再监听target，如果不需要监听请及时调用该方法，以免产生预期之外的行为以及内存泄漏
  + `takeRecords` 用于获取在事件队列中但还未传递给callback的mutation对象，通常使用在调用disconnect时又不想丢失之前的mutationRecords（如果mutation连续触发，可能出现mutation还在队列中但未传递给callback的情况）

## IntersectionObserver

+ 用于监听一个元素的可见比例（一个DOM元素被另一个DOM元素遮挡百分比）变化

+ 基本使用

  ```js

  const target = document.getElementById('app');

  const options = {
    root: null, // 相对于某个元素进行遮挡计算，传入具体DOM元素；传null则相对于浏览器视口
    rootMargin: '0px', // 进行计算的边界范围，通过rootMargin可以实现提前计算或延迟计算（相对于root原本尺寸）的效果
    threshold: 0.5 // 触发callback时的遮挡比例，0.5代表元素被遮挡50%时触发callback。由于浏览器事件循环机制的影响，callback触发时遮挡比例通常不会是精确的50%。
  };

  const intersectionObserver = new IntersectionObserver((entries, observer) => {
    //和MutationObserver相同，也是产生一个array
    entries.forEach(entry => {
      console.log(entry)
    });
  }, options);

  intersectionObserver.observe(target);

  ```

+ API

  + `observe & options` observe方法用于启动一个Observer对DOM元素的监听。在创建IntersectionObserver时可以通过传入option改变监听的行为

    ```js
    const options = {
      root: root, 
      rootMargin: '100px', 
      threshold: 0.7
    };
    ```

    > 在上面的配置中，通过配置rootMargin为100px在target距离root元素100px时即可判定为被遮挡，通过threshold设置为0.7，当遮挡比例超过70%时执行callback。

  + `entry` callback第一个param是entry对象构成的array，entry包含了触发callback时DOM的位置信息

## ResizeObserver

+ 用于监听DOM尺寸变化的observer，当DOM尺寸变化时执行callback

+ 基本使用

  ```js
  const box = document.getElementById('box');

  const resizeObserver = new ResizeObserver(entries => {
    entries.forEach(entry => {
      console.log(entry)
    });
  });

  resizeObserver.observe(box);
  ```

+ API

  + `entry` 对象包含resize相关的信息，下面看一下entry的结构

    ```js
    {
      // 不同box-sizing下的尺寸
      borderBoxSize: [{
        blockSize: 200,
        inlineSize: 200,
      }],
      contentBoxSize: [{
        blockSize: 200,
        inlineSize: 200,
      }],
      contentRect: {
        bottom: 200,
        height: 200,
        left: 0,
        right: 200,
        top: 0,
        width: 200,
        x: 0,
        y: 0
      },
      // 在物理设备像素上的大小, 在不同的屏幕上尺寸不同例如Retina
      devicePixelContentBoxSize: [{
          blockSize: 300,
          inlineSize: 300
        }
      ],
      target: div#resizable-box
    }
    ```

## PerformanceObserver

+ 用于监听浏览器的performance事件，方便在performance事件触发时作统一处理，监听页面性能指标的变化，包括页面加载时间、资源加载时间、页面渲染时间等

+ 基本使用
  
  ```js
  // mdn demo
  function perf_observer(list, observer) {
    console.log(list)
  }
  var observer2 = new PerformanceObserver(perf_observer);
  // entryTypes用于指定要监听的事件类型
  observer2.observe({ entryTypes: ["measure"] });
  ```

+ API
  常见的 `entryTypes`
  + mark：用于标记时间戳的事件
  + measure：performance.measure触发的事件
  + frame：网页渲染的事件
  + navigation：导航的事件，例如页面加载或重新加载
  + resource：资源加载事件
  + longtask：长任务事件
  + paint：绘制事件，例如FP，FCP
  + layout-shift：用于监视布局变化的事件
  + largest-contentful-paint：LCP 最大内容绘制事件
  + first-input：FID 首次输入延迟事件
  + interaction：交互事件（INP 使用）

+ `buffered` 选项

  > 默认情况下，PerformanceObserver 只能观察到它创建**之后**产生的 performance entry。如果 Observer 创建得较晚（比如在页面加载完成后才初始化监控脚本），就会错过早期的关键指标（如 FCP）。设置 `buffered: true` 后，Observer 回调会立即收到创建前已经缓冲的所有历史 entry。

  ```js
  // buffered: true 确保即使 Observer 初始化较晚也不会错过已发生的性能事件
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => {
      console.log(`${entry.name}: ${entry.startTime}ms`);
    });
  });
  observer.observe({ type: 'paint', buffered: true });
  ```

  > 注意：`buffered` 只能与单个 `type` 一起使用，不能与 `entryTypes`（数组）同时使用。如果需要监听多种类型，应分别创建多个 Observer 实例。

+ 使用 `performance.mark()` 和 `performance.measure()` 自定义计时

  > `mark` 用于在时间线上打一个标记点，`measure` 用于测量两个 mark 之间的耗时。适合对业务关键路径（如接口请求、组件渲染）进行精确计时。

  ```js
  // 标记起点
  performance.mark('api-start');

  // 模拟一个异步操作
  fetch('/api/data').then(res => res.json()).then(data => {
    // 标记终点
    performance.mark('api-end');

    // 测量两个 mark 之间的耗时
    performance.measure('api-request', 'api-start', 'api-end');

    const measure = performance.getEntriesByName('api-request')[0];
    console.log(`API 请求耗时: ${measure.duration}ms`);

    // 清理，避免内存泄漏
    performance.clearMarks('api-start');
    performance.clearMarks('api-end');
    performance.clearMeasures('api-request');
  });
  ```

  ```js
  // 也可以用 PerformanceObserver 统一收集所有 measure 事件
  const measureObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => {
      // 上报自定义计时数据
      reportToServer({
        name: entry.name,
        duration: entry.duration,
        startTime: entry.startTime
      });
    });
  });
  measureObserver.observe({ type: 'measure', buffered: true });
  ```

+ 实战：监控 Web Vitals 核心指标（FCP、LCP、CLS）

  ```js
  // --- FCP (First Contentful Paint) ---
  const fcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
    if (fcpEntry) {
      console.log(`FCP: ${fcpEntry.startTime}ms`);
      // 上报 FCP
      reportMetric('FCP', fcpEntry.startTime);
      fcpObserver.disconnect(); // FCP 只会触发一次，可以断开
    }
  });
  fcpObserver.observe({ type: 'paint', buffered: true });

  // --- LCP (Largest Contentful Paint) ---
  // LCP 可能会多次触发（随着更大元素渲染），取最后一次
  let lcpValue = 0;
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    // 每次回调都更新 LCP 值（浏览器保证递增）
    lcpValue = entries[entries.length - 1].startTime;
  });
  lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

  // 在用户交互或页面隐藏时上报最终 LCP
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      console.log(`LCP: ${lcpValue}ms`);
      reportMetric('LCP', lcpValue);
      lcpObserver.disconnect();
    }
  });

  // --- CLS (Cumulative Layout Shift) ---
  // 累加所有没有用户交互导致的布局偏移
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => {
      // hadRecentInput 为 true 表示用户主动触发的布局变化（如点击），不计入 CLS
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    });
  });
  clsObserver.observe({ type: 'layout-shift', buffered: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      console.log(`CLS: ${clsValue}`);
      reportMetric('CLS', clsValue);
      clsObserver.disconnect();
    }
  });
  ```

+ 实战：监控长任务（Long Tasks）

  > 长任务是指执行时间超过 50ms 的 JavaScript 任务。长任务会阻塞主线程，导致页面卡顿、交互延迟，是影响 INP（Interaction to Next Paint）指标的重要因素。

  ```js
  const longTaskObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => {
      console.warn(`检测到长任务:`, {
        startTime: entry.startTime,
        duration: entry.duration,
        name: entry.name,
        // attribution 可帮助定位长任务来源（部分浏览器支持）
        attribution: entry.attribution
      });

      // 上报长任务信息
      reportToServer({
        type: 'longtask',
        startTime: Math.round(entry.startTime),
        duration: Math.round(entry.duration),
        url: location.href
      });
    });
  });

  longTaskObserver.observe({ type: 'longtask', buffered: true });

  // 最佳实践：在页面卸载前断开 Observer
  window.addEventListener('pagehide', () => {
    longTaskObserver.disconnect();
  });
  ```

  > 优化长任务的常见手段：使用 `requestIdleCallback` 或 `setTimeout` 拆分任务、将计算移到 Web Worker、使用 `scheduler.yield()`（实验性）让出主线程。

## ReportingObserver

+ 用于监听浏览器报告的事件，例如废弃API，过时特性、CSP 违规、浏览器干预等。做监控SDK的同学应该经常能用到，日常业务代码用的比较少

+ 基本使用

  ```js
  const observer = new ReportingObserver((reports, observer) => {
    reports.forEach(report => {
      console.log(report);
    });
  });

  // 监听过时特性
  observer.observe({ types: ['deprecation'] });
  ```

+ 报告类型（Report Types）

  + `deprecation`：使用了已废弃的 API 或特性时触发
  + `intervention`：浏览器主动干预页面行为时触发（如阻止自动播放音频、强制滚动恢复等）
  + `crash`：页面崩溃报告（通过 Reporting API 的 `crash` 端点，需要配合 `Report-To` HTTP 头）
  + `csp-violation`：违反 Content-Security-Policy 策略时触发
  + `document-policy-violation`：违反 Document-Policy 时触发
  + `permissions-policy-violation`：违反 Permissions-Policy 时触发
  + `coep-frame-object` / `coop`：跨域隔离策略相关报告

+ 报告对象结构

  ```js
  // 一个 report 对象的基本结构
  {
    type: 'deprecation',          // 报告类型
    url: 'https://example.com/',  // 触发报告的页面 URL
    body: {
      id: 'FeatureName',          // 废弃特性的标识
      message: '详细错误信息',
      lineNumber: 10,             // 触发代码行号
      columnNumber: 5,            // 触发代码列号
      sourceFile: 'app.js',       // 触发代码文件
      anticipatedRemoval: '2025-01-01'  // 预计移除时间（如有）
    }
  }
  ```

+ 实战：收集废弃 API 警告并上报

  ```js
  // 收集所有 deprecation 类型的报告，批量上报到监控平台
  const deprecationReports = [];
  const BATCH_INTERVAL = 10000; // 每 10 秒批量上报一次

  const observer = new ReportingObserver((reports, obs) => {
    reports.forEach(report => {
      deprecationReports.push({
        type: report.type,
        url: report.url,
        body: report.body,
        timestamp: Date.now()
      });
    });
  }, { buffered: true }); // buffered: true 可以获取 Observer 创建之前的报告

  observer.observe({ types: ['deprecation'] });

  // 定时批量上报
  setInterval(() => {
    if (deprecationReports.length > 0) {
      const batch = deprecationReports.splice(0);
      navigator.sendBeacon('/api/reports/deprecation', JSON.stringify({
        reports: batch,
        pageUrl: location.href,
        userAgent: navigator.userAgent
      }));
    }
  }, BATCH_INTERVAL);

  // 页面卸载前确保上报剩余报告
  window.addEventListener('pagehide', () => {
    if (deprecationReports.length > 0) {
      navigator.sendBeacon('/api/reports/deprecation', JSON.stringify({
        reports: deprecationReports,
        pageUrl: location.href
      }));
    }
    observer.disconnect();
  });
  ```

+ 实战：监听 CSP 违规并发送告警

  ```js
  const cspObserver = new ReportingObserver((reports) => {
    reports.forEach(report => {
      const { blockedURL, violatedDirective, originalPolicy } = report.body;
      
      // 发送告警到安全监控服务
      fetch('/api/security/csp-violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: report.url,
          blockedURL,
          violatedDirective,
          originalPolicy,
          timestamp: Date.now()
        })
      });
    });
  }, { buffered: true });

  cspObserver.observe({ types: ['csp-violation'] });
  ```

+ 实战：综合监控 —— 同时监听多种报告类型

  ```js
  // 一个统一的报告收集器
  const reportObserver = new ReportingObserver((reports) => {
    reports.forEach(report => {
      switch (report.type) {
        case 'deprecation':
          console.warn(`[Deprecation] ${report.body.message}`);
          break;
        case 'intervention':
          console.warn(`[Intervention] ${report.body.message}`);
          break;
        case 'csp-violation':
          console.error(`[CSP Violation] blocked: ${report.body.blockedURL}`);
          break;
        default:
          console.log(`[${report.type}]`, report.body);
      }

      // 统一上报
      sendReport(report);
    });
  }, { buffered: true });

  // 同时监听多种报告类型
  reportObserver.observe({
    types: ['deprecation', 'intervention', 'csp-violation']
  });

  function sendReport(report) {
    // 使用 sendBeacon 确保页面卸载时也能发出
    navigator.sendBeacon('/api/monitoring/reports', JSON.stringify({
      type: report.type,
      url: report.url,
      body: report.body,
      timestamp: Date.now()
    }));
  }
  ```

  > 注意：ReportingObserver 的浏览器兼容性有限，目前主要在 Chrome/Edge 中支持。Firefox 和 Safari 的支持程度不一。在生产环境中建议配合 `Report-To` HTTP 响应头做服务端收集作为兜底方案。

## 浏览器缓存机制

### 缓存流程总览

```
浏览器发起请求
  → 检查强缓存（本地）
    → 命中 → 直接使用缓存（不发请求）
    → 未命中 → 发送 HTTP 请求
      → 检查协商缓存（服务器）
        → 304 Not Modified → 使用本地缓存
        → 200 OK → 返回新资源 + 更新缓存
```

### 强缓存（不与服务器通信）

通过响应头控制，浏览器直接判断缓存是否过期：

| 字段 | 示例 | 说明 |
|------|------|------|
| `Cache-Control` | `max-age=31536000` | 相对时间（秒），优先级最高 |
| `Expires` | `Wed, 21 Oct 2026 07:28:00 GMT` | 绝对时间，受客户端时钟影响 |

```
Cache-Control 常用指令：
  max-age=3600        → 缓存有效期 3600 秒
  no-cache            → 不走强缓存，每次走协商缓存
  no-store            → 完全不缓存（敏感数据）
  public              → 所有节点（CDN、浏览器）都可缓存
  private             → 仅浏览器可缓存（CDN 不缓存）
  must-revalidate     → 过期后必须向服务器验证
```

> `Cache-Control` 优先级高于 `Expires`，两者同时存在时以 `Cache-Control` 为准。

### 协商缓存（与服务器通信，返回 304）

强缓存未命中时，浏览器带上缓存标识向服务器验证：

| 方案 | 请求头 | 响应头 | 对比方式 |
|------|--------|--------|---------|
| 最后修改时间 | `If-Modified-Since` | `Last-Modified` | 时间比较（秒级精度） |
| 内容哈希 | `If-None-Match` | `ETag` | 字符串比较（精确） |

```
服务器判断逻辑：

ETag 方案（优先）：
  请求头 If-None-Match: "abc123"
  → 服务器计算当前资源 ETag
  → 相同 → 304（用缓存）
  → 不同 → 200 + 新资源

Last-Modified 方案：
  请求头 If-Modified-Since: Wed, 21 Oct 2025 07:28:00 GMT
  → 服务器对比文件最后修改时间
  → 未修改 → 304
  → 已修改 → 200 + 新资源
```

> `ETag` 优先级高于 `Last-Modified`。`ETag` 更精确（解决了 1 秒内多次修改、文件未变但修改时间变了等问题），但计算成本更高。

### 缓存策略实践

| 资源类型 | 推荐策略 | 原因 |
|---------|---------|------|
| HTML | `no-cache` 或 `max-age=0` | 入口文件，需要实时验证 |
| CSS/JS（带 hash） | `max-age=31536000, immutable` | 文件名含 hash，内容变则文件名变 |
| 图片/字体（带 hash） | `max-age=31536000, immutable` | 同上 |
| API 响应 | `no-store` 或短时 `max-age` | 数据变化频繁或敏感 |

```nginx
# Nginx 配置示例
location /assets/ {
    # 带 hash 的静态资源，强缓存一年
    add_header Cache-Control "public, max-age=31536000, immutable";
}

location / {
    # HTML 入口，每次都协商验证
    add_header Cache-Control "no-cache";
}
```

### 用户行为对缓存的影响

| 操作 | 强缓存 | 协商缓存 |
|------|--------|---------|
| 地址栏回车 / 链接跳转 | ✅ 生效 | ✅ 生效 |
| Ctrl+F5 强制刷新 | ❌ 跳过 | ❌ 跳过 |
| F5 刷新 | ❌ 跳过 | ✅ 生效 |
| 前进/后退 | ✅ 生效 | ✅ 生效 |

## 跨域方案详解

### 什么是跨域

同源策略要求 **协议 + 域名 + 端口** 完全一致，否则就是跨域：

```
https://www.example.com:443
  ↓
https://api.example.com:443    → 域名不同 ✗
http://www.example.com:443     → 协议不同 ✗
https://www.example.com:8080   → 端口不同 ✗
https://www.example.com:443/path → 路径不同 ✅（路径不参与同源判断）
```

### CORS 详解

CORS（Cross-Origin Resource Sharing）是浏览器和服务端协商的跨域机制。

**简单请求 vs 预检请求：**

```
简单请求（不发 OPTIONS）：
  条件：GET/HEAD/POST + Content-Type 仅限以下三种：
    - application/x-www-form-urlencoded
    - multipart/form-data
    - text/plain
  且不包含自定义请求头

预检请求（先 OPTIONS，再正式请求）：
  条件：PUT/DELETE/PATCH 等方法
    或 Content-Type 为 application/json
    或包含自定义请求头（如 Authorization）
```

**预检请求流程：**

```
浏览器                          服务器
  |                               |
  |--- OPTIONS 请求 ------------>|
  |    Origin: https://a.com      |
  |    Access-Control-Request-    |
  |      Method: PUT              |
  |    Access-Control-Request-    |
  |      Headers: Authorization   |
  |                               |
  |<-- 204 响应 ------------------|
  |    Access-Control-Allow-      |
  |      Origin: https://a.com    |
  |    Access-Control-Allow-      |
  |      Methods: PUT, GET        |
  |    Access-Control-Allow-      |
  |      Headers: Authorization   |
  |    Access-Control-Max-Age:    |
  |      86400                    |
  |                               |
  |--- PUT 正式请求 ------------>|  ← 预检通过后发送
  |                               |
```

**服务端关键响应头：**

```
Access-Control-Allow-Origin: https://a.com    // 允许的来源（不能设 * 同时带 Cookie）
Access-Control-Allow-Methods: GET, POST, PUT  // 允许的方法
Access-Control-Allow-Headers: Authorization   // 允许的请求头
Access-Control-Allow-Credentials: true        // 允许携带 Cookie
Access-Control-Max-Age: 86400                 // 预检结果缓存时间（秒）
Access-Control-Expose-Headers: X-Total-Count  // 允许前端 JS 读取的响应头
```

**前端配置（携带 Cookie）：**

```js
// fetch
fetch('https://api.example.com/data', {
  credentials: 'include'  // 携带 Cookie（同源用 same-origin，跨域用 include）
});

// axios
axios.defaults.withCredentials = true;
```

**Nginx 反向代理（开发/生产通用）：**

```nginx
# 开发环境：前端 dev server 代理
server {
    listen 3000;

    # API 请求代理到后端
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
    }

    # 前端静态资源
    location / {
        root /dist;
    }
}

# 生产环境：同域部署，从根本上避免跨域
server {
    listen 80;
    server_name example.com;

    location /api/ {
        proxy_pass http://backend:8080/;
    }

    location / {
        root /dist;
        try_files $uri $uri/ /index.html;
    }
}
```

**Webpack/Vite devServer proxy：**

```js
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,  // 修改请求头的 Host
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

### JSONP（了解即可，已过时）

```html
<!-- 利用 <script> 不受同源策略限制 -->
<script>
function handleData(data) {
  console.log('收到数据:', data);
}
</script>
<script src="https://api.example.com/data?callback=handleData"></script>
```

服务器返回：`handleData({"name": "John"})`

**缺点：** 只支持 GET、存在安全风险（XSS）、无法设置请求头。现代项目应使用 CORS。

### postMessage 跨窗口通信

```js
// 父页面 → iframe
const iframe = document.getElementById('child');
iframe.contentWindow.postMessage('hello', 'https://child.example.com');

// iframe 中接收
window.addEventListener('message', (event) => {
  // 安全校验：验证来源
  if (event.origin !== 'https://parent.example.com') return;
  console.log(event.data); // 'hello'

  // 回复
  event.source.postMessage('received', event.origin);
});
```

**适用场景：** 同一页面内不同域的 iframe 通信、`window.open` 打开的窗口间通信。

### 跨域方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| CORS | 标准方案，支持所有 HTTP 方法 | 需要服务端配合 | 首选方案 |
| Nginx 反向代理 | 前端无感知，彻底解决 | 需要运维配置 | 生产环境 |
| devServer proxy | 开发环境零配置 | 仅开发环境 | 本地开发 |
| JSONP | 兼容性好 | 只支持 GET，不安全 | 已淘汰 |
| postMessage | 不依赖服务器 | 仅限窗口间 | iframe 通信 |

## 事件循环（Event Loop）

### 浏览器中的 Event Loop

JavaScript 是单线程的，通过事件循环实现异步非阻塞：

```
┌──────────────────────────────────┐
│          Call Stack              │  ← 同步代码在这里执行
│  ┌────────────────────────────┐  │
│  │ main() → foo() → bar()     │  │
│  └────────────────────────────┘  │
└──────────┬───────────────────────┘
           │ 栈空时，从任务队列取任务
           ▼
┌──────────────────┐  ┌──────────────────────┐
│  Microtask Queue │  │   Macrotask Queue    │
│  (微任务队列)     │  │   (宏任务队列)        │
│                  │  │                      │
│  Promise.then    │  │  setTimeout          │
│  MutationObserver│  │  setInterval         │
│  queueMicrotask  │  │  I/O                 │
│                  │  │  UI rendering        │
│                  │  │  script（整体代码）    │
└──────────────────┘  └──────────────────────┘
```

### 执行顺序规则

```
1. 执行同步代码（当前宏任务）
2. 同步代码执行完毕，清空微任务队列（全部执行完）
3. 执行一个宏任务
4. 重复 2-3
```

关键区别：
- **微任务**：在当前宏任务结束后、下一个宏任务开始前 **全部执行**
- **宏任务**：每次只执行 **一个**，然后检查微任务队列

### 代码执行顺序题

```js
console.log('1');                           // 同步 → 立即输出

setTimeout(() => {
  console.log('2');                          // 宏任务
}, 0);

Promise.resolve().then(() => {
  console.log('3');                          // 微任务
  setTimeout(() => {
    console.log('4');                        // 宏任务（第二轮）
  }, 0);
});

console.log('5');                           // 同步 → 立即输出

// 输出顺序：1 → 5 → 3 → 2 → 4
```

**解析过程：**

```
第 1 轮宏任务（script 整体代码）：
  1. console.log('1')           → 输出 1
  2. setTimeout(fn)             → fn 放入宏任务队列
  3. Promise.then(fn)           → fn 放入微任务队列
  4. console.log('5')           → 输出 5
  同步代码执行完毕

  清空微任务队列：
    Promise.then → console.log('3') → 输出 3
    内部 setTimeout(fn) → fn 放入宏任务队列

第 2 轮宏任务：
  setTimeout(fn) → console.log('2') → 输出 2

第 3 轮宏任务：
  setTimeout(fn) → console.log('4') → 输出 4

最终：1, 5, 3, 2, 4
```

### 更复杂的例子

```js
async function async1() {
  console.log('async1 start');    // 同步
  await async2();                 // await 后的代码相当于 .then()
  console.log('async1 end');      // 微任务
}

async function async2() {
  console.log('async2');          // 同步
}

console.log('script start');
async1();
new Promise(resolve => {
  console.log('promise1');        // 同步
  resolve();
}).then(() => {
  console.log('promise2');        // 微任务
});
console.log('script end');

// 输出：script start → async1 start → async2 → promise1 → script end
//       → async1 end → promise2
```

### MutationObserver 与微任务

```js
const observer = new MutationObserver(() => {
  console.log('mutation');  // 微任务
});
observer.observe(document.body, { childList: true });

document.body.appendChild(document.createElement('div'));

Promise.resolve().then(() => {
  console.log('promise');   // 微任务
});

// 输出顺序：promise → mutation
// MutationObserver 回调是微任务，但比 Promise.then 优先级略低
// 实际上两者都在同一轮微任务清空阶段执行，按入队顺序来
```

### 浏览器 Event Loop vs Node Event Loop

| | 浏览器 | Node.js |
|---|---|---|
| 宏任务队列 | 一个 | 多个阶段（timers → pending → poll → check） |
| 微任务 | Promise.then / MutationObserver | Promise.then / process.nextTick |
| 微任务优先级 | 统一 | `process.nextTick` > `Promise.then` |
| `setTimeout(fn, 0)` | 最小延迟 ~4ms | 最小延迟 ~1ms |
| `setImmediate` | ❌ 不支持 | ✅ 在 check 阶段执行 |

```js
// Node.js 中的特殊行为
process.nextTick(() => console.log('nextTick'));  // 微任务，最高优先级
Promise.resolve().then(() => console.log('promise'));

// Node 输出：nextTick → promise
// 浏览器没有 process.nextTick
```

### requestAnimationFrame 在 Event Loop 中的位置

```
宏任务 → 微任务清空 → rAF 回调 → 渲染（Style → Layout → Paint）→ 下一个宏任务
```

`requestAnimationFrame` 在渲染前执行，不在宏任务也不在微任务队列中，而是由浏览器的渲染管线调度。这也是它比 `setTimeout` 更适合做动画的原因。

## Web Worker / SharedWorker

### Web Worker 基本用法

```js
// main.js — 主线程
const worker = new Worker('./worker.js');

// 发送数据给 Worker
worker.postMessage({ type: 'compute', data: largeArray });

// 接收 Worker 的结果
worker.onmessage = (event) => {
  console.log('Worker 返回:', event.data);
};

// 错误处理
worker.onerror = (error) => {
  console.error('Worker 出错:', error.message);
};

// 终止 Worker
worker.terminate();
```

```js
// worker.js — Worker 线程
// Worker 中可用的 API：self, setTimeout, fetch, IndexedDB, Cache API
// Worker 中不可用：DOM, window, document, alert

self.onmessage = (event) => {
  const { type, data } = event.data;

  if (type === 'compute') {
    // 耗时计算
    const result = data.reduce((sum, n) => sum + n, 0);
    self.postMessage(result);
  }
};
```

### 内联 Worker

```js
// 不需要单独文件，用 Blob 创建
const workerCode = `
  self.onmessage = (e) => {
    const result = e.data * 2;
    self.postMessage(result);
  };
`;

const blob = new Blob([workerCode], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));

worker.postMessage(21);
worker.onmessage = (e) => console.log(e.data); // 42
```

### Transferable Objects（零拷贝传输）

```js
// 默认 postMessage 使用结构化克隆（拷贝）
// 对于大数据（ArrayBuffer），可以用 Transferable 转移所有权，零拷贝

const buffer = new ArrayBuffer(1024 * 1024 * 100); // 100MB

// 转移后，主线程中的 buffer 不可再使用
worker.postMessage(buffer, [buffer]);

console.log(buffer.byteLength); // 0，已经被转移走了
```

```js
// Worker 端接收
self.onmessage = (event) => {
  const buffer = event.data;
  console.log(buffer.byteLength); // 100MB，完整可用
  // 处理完后可以转回去
  self.postMessage(buffer, [buffer]);
};
```

### SharedWorker（多标签共享）

```js
// main.js — 多个标签页共享同一个 Worker
const shared = new SharedWorker('./shared.js');

shared.port.postMessage('hello');
shared.port.onmessage = (event) => {
  console.log('来自 SharedWorker:', event.data);
};
shared.port.start(); // 必须调用 start 才能接收消息
```

```js
// shared.js
const connections = [];

self.onconnect = (event) => {
  const port = event.ports[0];
  connections.push(port);

  port.onmessage = (e) => {
    // 广播给所有连接的标签页
    connections.forEach(p => {
      p.postMessage(`收到消息: ${e.data}`);
    });
  };

  port.start();
};
```

### 实际应用场景

```js
// 1. 大文件 Hash 计算（上传前去重）
const worker = new Worker('./hash-worker.js');
worker.postMessage(fileArrayBuffer);
worker.onmessage = (e) => {
  const hash = e.data; // SHA-256 hash
  // 先检查服务端是否已有该文件（秒传）
};

// 2. 图片处理（压缩、裁剪、滤镜）
const imgWorker = new Worker('./image-worker.js');
imgWorker.postMessage({ imageData, operation: 'compress', quality: 0.8 });

// 3. 实时数据聚合（WebSocket 数据在 Worker 中处理）
const dataWorker = new Worker('./data-worker.js');
ws.onmessage = (e) => dataWorker.postMessage(JSON.parse(e.data));
dataWorker.onmessage = (e) => updateChart(e.data);
```

### Worker 的限制

| 特性 | 支持情况 |
|------|---------|
| DOM 操作 | ❌ 不可用 |
| window/document | ❌ 不可用 |
| fetch / XMLHttpRequest | ✅ |
| IndexedDB / Cache API | ✅ |
| setTimeout / setInterval | ✅ |
| importScripts() | ✅（经典 Worker） |
| ES Modules | ✅（`new Worker(url, { type: 'module' })`） |
| 嵌套 Worker | 部分浏览器支持 |

## Service Worker 与 PWA

### Service Worker 生命周期

```
注册 (register)
  → 下载 SW 文件
  → install 事件（缓存资源）
  → waiting（等待旧 SW 控制的页面关闭）
  → activate 事件（清理旧缓存）
  → 激活，开始拦截 fetch 请求
```

```js
// main.js — 注册 Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(registration => {
    console.log('SW 注册成功，作用域:', registration.scope);
  }).catch(error => {
    console.error('SW 注册失败:', error);
  });
}
```

```js
// sw.js — Service Worker 文件

const CACHE_NAME = 'app-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/logo.png'
];

// 安装阶段：预缓存关键资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  // 安装完成后立即激活，不等旧 SW 控制的页面关闭
  self.skipWaiting();
});

// 激活阶段：清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  // 立即接管所有页面
  self.clients.claim();
});

// 拦截请求：返回缓存或网络资源
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});
```

### 缓存策略

| 策略 | 逻辑 | 适用场景 |
|------|------|---------|
| **Cache First** | 优先缓存，缓存没有再走网络 | 静态资源（字体、图标） |
| **Network First** | 优先网络，网络失败用缓存兜底 | API 数据（要新鲜，离线可降级） |
| **Stale While Revalidate** | 先返回缓存，同时后台更新 | 文章内容（快速展示，下次刷新） |
| **Cache Only** | 只走缓存 | 预缓存的离线页面 |
| **Network Only** | 只走网络 | 实时数据、支付接口 |

```js
// Stale While Revalidate 实现
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cached => {
        // 先返回缓存（快），同时后台更新
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
        return cached || fetchPromise;
      });
    })
  );
});
```

### PWA 配置 — manifest.json

```json
{
  "name": "我的应用",
  "short_name": "MyApp",
  "description": "一个渐进式 Web 应用",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4A90D9",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

```html
<!-- HTML 中引入 -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#4A90D9">
```

`display` 模式：
- `standalone` — 独立应用外观（无地址栏）
- `fullscreen` — 全屏
- `minimal-ui` — 最小化浏览器 UI
- `browser` — 普通浏览器标签页

### Service Worker 的限制

- 必须在 HTTPS 下运行（localhost 除外）
- 无法访问 DOM
- 闲置时会被浏览器终止（不能依赖全局变量保存状态，用 IndexedDB 持久化）
- 作用域受限于注册路径（`/app/sw.js` 只能控制 `/app/` 下的页面）

## HTTP 协议演进

### HTTP/1.1 的痛点

```
1. 队头阻塞（Head-of-Line Blocking）
   - 同一 TCP 连接上，请求必须排队，前一个没响应，后面的都得等
   - 浏览器解决方案：开多个 TCP 连接（6-8 个），但有连接数上限

2. 头部冗余
   - 每个请求都带完整的 Cookie、User-Agent 等，重复数据多
   - 一个 Cookie 可能就几百字节，每次请求都重复发送

3. 服务端无法主动推送
   - 服务器知道页面接下来需要什么资源，但无法主动发送
   - 只能用 HTTP/1.1 的 Link: rel=preload 做提示
```

### HTTP/2 核心特性

**多路复用（Multiplexing）：**

```
HTTP/1.1:
  连接 1: 请求 A → 响应 A → 请求 B → 响应 B
  连接 2: 请求 C → 响应 C

HTTP/2（单连接多路复用）:
  连接 1: ┌ 请求 A ─┐
          │ 请求 B ─┼→ 响应 B（先完成）
          │ 请求 C ─┼→ 响应 A
          └─────────┘→ 响应 C

  多个请求在同一个 TCP 连接上并行发送，响应可以乱序返回
```

**头部压缩（HPACK）：**

```
HTTP/1.1 每个请求：
  GET /api/users HTTP/1.1
  Host: example.com
  User-Agent: Mozilla/5.0 ...（100+ bytes）
  Cookie: session=abc123; ...（200+ bytes）
  Accept: application/json
  ... （每次 500+ bytes 重复头部）

HTTP/2（HPACK 压缩后）：
  首次请求：发送完整头部，建立索引表
  后续请求：只发送差异部分（增量编码）
  → 头部开销从 500 bytes 降到几十字节
```

**二进制帧（Binary Framing）：**

```
HTTP/1.1：文本协议，解析复杂、容易出错
HTTP/2：二进制协议，所有数据拆分为小的 Frame

  ┌─────────────┐
  │   HEADERS   │  ← 头部帧（HPACK 压缩）
  │   Frame     │
  ├─────────────┤
  │   DATA      │  ← 数据帧（请求体/响应体）
  │   Frame     │
  ├─────────────┤
  │   DATA      │  ← 可以拆分成多个 DATA 帧
  │   Frame     │
  └─────────────┘
```

**服务器推送（Server Push）：**

```
浏览器请求 index.html
  → 服务器返回 index.html
  → 同时主动推送 style.css 和 app.js（服务器预判浏览器需要）
  → 浏览器收到后存入缓存，解析 HTML 时直接从缓存取

注意：服务器推送在实践中效果有限（可能推送浏览器已缓存的资源），
Chrome 已不鼓励使用，HTTP/3 中移除了此特性。
```

### HTTP/3 与 QUIC

```
HTTP/1.1 → 基于 TCP
HTTP/2   → 基于 TCP（多路复用解决了应用层队头阻塞，但 TCP 层仍有）
HTTP/3   → 基于 QUIC（UDP）
```

**QUIC 解决的问题：**

| 问题 | TCP 的表现 | QUIC 的方案 |
|------|-----------|------------|
| TCP 队头阻塞 | 一个包丢了，整个连接阻塞等重传 | 各 Stream 独立，丢包只影响对应 Stream |
| 握手延迟 | TCP 三次握手 + TLS 握手 = 2-3 RTT | 0-RTT 或 1-RTT 建连 |
| 连接迁移 | IP/端口变化（WiFi→4G）连接断开 | 基于 Connection ID，换网不断连 |
| 安全性 | TLS 是可选的附加层 | 强制加密，TLS 1.3 内置于 QUIC |

```
连接建立对比：

HTTP/1.1 + TLS：
  TCP 握手 (1 RTT) + TLS 握手 (1-2 RTT) + HTTP 请求 = 3-4 RTT

HTTP/2 + TLS：
  TCP 握手 (1 RTT) + TLS 握手 (1-2 RTT) + HTTP 请求 = 3-4 RTT

HTTP/3（首次连接）：
  QUIC 握手 + TLS 1.3 (1 RTT) + 数据 = 1 RTT

HTTP/3（再次连接，0-RTT）：
  QUIC 握手 + 数据 = 0 RTT（利用之前的会话密钥）
```

### HTTP 版本对比总结

| 特性 | HTTP/1.1 | HTTP/2 | HTTP/3 |
|------|----------|--------|--------|
| 传输层 | TCP | TCP | QUIC (UDP) |
| 多路复用 | ❌（排队） | ✅ | ✅（独立 Stream） |
| 头部压缩 | ❌ | HPACK | QPACK |
| 服务器推送 | ❌ | ✅（已不推荐） | ❌（移除） |
| 队头阻塞 | ✅（应用层+TCP层） | 解决应用层 | 完全解决 |
| 连接迁移 | ❌ | ❌ | ✅ |
| 握手延迟 | 2-3 RTT | 2-3 RTT | 0-1 RTT |
| 安全 | 可选 TLS | 通常 TLS | 强制加密 |

## Chrome DevTools 调试技巧

### 断点类型

Chrome DevTools 提供多种断点，远比 `debugger` 语句灵活：

| 断点类型 | 触发条件 | 适用场景 |
|---------|---------|---------|
| **行断点** | 执行到指定代码行 | 基本调试 |
| **条件断点** | 条件为 true 时暂停 | 循环中特定条件触发 |
| **日志断点** | 执行到该行时输出日志（不暂停） | 替代 console.log |
| **DOM 断点** | DOM 节点被修改/移除/子节点变化 | 排查谁改了 DOM |
| **XHR/Fetch 断点** | 匹配的请求发出时暂停 | 定位接口调用来源 |
| **事件监听断点** | 指定事件触发时暂停 | 排查事件处理逻辑 |
| **异常断点** | 抛出异常时暂停（含/不含 caught） | 定位报错位置 |

**条件断点 vs 日志断点：**

```js
// 条件断点：右键行号 → Add conditional breakpoint
// 输入条件表达式，为 true 时才暂停
i === 999

// 日志断点：右键行号 → Add logpoint
// 执行到此处时输出，不会暂停，可以嵌入表达式
`User ${user.id} logged in at ${Date.now()}`

// 等价于在代码里写 console.log，但不需要改源码、不需要重新部署
```

**DOM 断点三种子类型：**

```
右键 DOM 节点 → Break on:
  → subtree modifications  // 子节点增删改
  → attribute modifications // 属性变化（class、style 等）
  → node removal            // 节点被移除
```

适用场景：页面某个元素莫名消失或被修改，加 DOM 断点直接定位修改来源。

**XHR/Fetch 断点：**

```
Sources → XHR/fetch Breakpoints → 点 + 号
  输入 URL 片段（如 /api/user）
  → 任何匹配的请求发出时自动暂停在发起请求的代码行
```

### console 高级用法

```js
// console.table — 表格形式展示数组/对象
console.table([
  { name: 'Alice', age: 25, role: 'admin' },
  { name: 'Bob', age: 30, role: 'user' },
  { name: 'Charlie', age: 28, role: 'user' }
]);
// 可选第二参数指定显示列：
console.table(users, ['name', 'role']);

// console.time / console.timeEnd / console.timeLog — 计时
console.time('data-fetch');
await fetchData();
console.timeLog('data-fetch');  // 中间打印：data-fetch: 123.45ms
await processData();
console.timeEnd('data-fetch');  // 结束并打印：data-fetch: 456.78ms

// console.group / console.groupEnd — 分组折叠
console.group('用户操作');
console.log('点击了按钮');
console.log('发起了请求');
console.groupEnd();

// console.groupCollapsed — 默认折叠
console.groupCollapsed('详细数据');
console.log({ ...largeObject });
console.groupEnd();

// %c — CSS 样式输出
console.log('%c ERROR %c Something went wrong',
  'background: red; color: white; padding: 2px 6px; border-radius: 3px;',
  'color: red;'
);

// console.count / console.countReset — 调用计数
function render() {
  console.count('render');  // render: 1, render: 2, ...
}

// console.trace — 打印调用栈
function foo() { bar(); }
function bar() { console.trace('追踪调用链'); }
foo();
// 输出：追踪调用链 → bar → foo → (anonymous)

// console.assert — 断言（false 时输出）
console.assert(user.age >= 0, '年龄不能为负数', user);

// console.dir — 以对象形式展示（查看 DOM 元素的 JS 属性）
console.dir(document.body);  // 比 console.log 更适合看 JS 属性
```

### Sources 面板调试

```
Sources 面板布局：
┌──────────────────────────────────────────────┐
│  文件树          │  代码编辑器                │
│  (左侧)         │  (中间)                    │
│                  │                           │
│                  │  ┌─────────────────────┐  │
│                  │  │ Scope (局部变量)     │  │
│                  │  │ Watch (监视表达式)   │  │
│                  │  │ Call Stack (调用栈)  │  │
│                  │  │ Breakpoints (断点列表)│  │
│                  │  └─────────────────────┘  │
└──────────────────────────────────────────────┘
```

**调试控制按钮：**

| 按钮 | 快捷键 | 功能 |
|------|--------|------|
| ▶ Resume | F8 | 继续执行到下一个断点 |
| ⏭ Step Over | F10 | 执行当前行，不进入函数 |
| ⬇ Step Into | F11 | 进入当前函数内部 |
| ⬆ Step Out | Shift+F11 | 执行完当前函数，返回调用处 |

**实用技巧：**

```js
// 1. 暂停时直接修改代码（Live Edit）
//    在 Sources 面板直接改代码 → Cmd+S 保存 → 立即生效（无需刷新）

// 2. Copy as fetch — 右键 Network 中的请求
//    直接生成可粘贴到 Console 重放的 fetch 代码

// 3. Blackbox Script — 屏蔽第三方库的断点
//    右键文件 → Blackbox script → 调试时自动跳过 jQuery/lodash 等

// 4. 在 Console 中访问暂停时的变量
//    暂停状态下，Console 的上下文就是当前断点处的 Scope
//    可以直接访问局部变量、调用函数
```

### 调试实战流程

```
Bug：点击按钮后数据没有更新

排查步骤：
1. 事件监听断点 → 选择 click → 确认事件是否触发
2. 在事件处理函数入口加行断点 → 确认函数是否执行
3. 单步执行 → 观察变量变化
4. 检查异步回调 → 在 then/catch 里加断点
5. 检查网络请求 → Network 面板确认请求是否发出、响应是否正确
6. 检查 DOM 更新 → Elements 面板观察 DOM 是否变化

常见断点策略：
  接口没数据 → XHR 断点 → 看请求有没有发
  数据有但页面没变 → DOM 断点 → 看 DOM 有没有更新
  循环中某个值异常 → 条件断点 → i === 异常索引
  第三方代码出问题 → Event Listener 断点 → 追踪事件链
```

## Performance 面板（性能分析）

### 录制与分析流程

```
操作步骤：
1. 打开 DevTools → Performance 面板
2. 点 Record（●）开始录制
3. 执行要分析的操作（页面加载 / 滚动 / 点击）
4. 点 Stop 结束录制
5. 分析生成的性能报告

快捷方式：
  Cmd+E → 开始/停止录制
  Cmd+Shift+E → 录制并刷新页面（分析首屏加载）
```

### 火焰图解读

```
Performance 面板结构（从上到下）：

┌─ Filmstrip ─────────────────────────────────┐
│  [截图1]  [截图2]  [截图3]  [截图4]  [截图5]  │  ← 每隔几帧截一张图
└─────────────────────────────────────────────┘

┌─ Timings ───────────────────────────────────┐
│  FP    FCP    LCP    DCL    L               │  ← 关键时间节点标记
└─────────────────────────────────────────────┘

┌─ Main Thread（火焰图）────────────────────────┐
│  ┌──────┐                                     │
│  │Script│ ┌──┐                                │
│  │Parse │ │Fn│ ┌──────────────────┐           │
│  │      │ │  │ │Layout│Paint│Comp│           │  ← 函数调用栈可视化
│  └──────┘ └──┘ └──────────────────┘           │
│                                               │
│  颜色含义：                                     │
│  蓝色   = 脚本执行（Scripting）                  │
│  紫色   = 渲染计算（Rendering / Layout）          │
│  绿色   = 绘制与合成（Painting / Compositing）     │
│  灰色   = 空闲（Idle）                           │
│  黄色   = 垃圾回收（GC）                          │
└───────────────────────────────────────────────┘

┌─ Summary ───────────────────────────────────┐
│  Scripting: 45%  Rendering: 20%  Painting: 5% │
│  Other: 10%            Idle: 20%               │  ← 时间分布饼图
└─────────────────────────────────────────────┘
```

### 性能问题定位

**Long Task（长任务）：**

```
火焰图中宽度 > 50ms 的色块会被标红角标记 ⚠
→ 表示这个任务阻塞了主线程超过 50ms
→ 直接影响 INP 指标和交互流畅度

优化方式：
  1. 拆分任务（用 setTimeout / requestIdleCallback 分段执行）
  2. 移到 Web Worker
  3. 减少不必要的计算
```

**强制同步布局（紫色警告）：**

```
火焰图中紫色色块带 ⚠ 标记 = Forced Reflow
→ 在 JS 中先写了样式，又立即读取布局属性
→ 浏览器被迫同步计算布局，非常耗时

// 典型问题代码：
elements.forEach(el => {
  el.style.width = '100px';      // 写
  const h = el.offsetHeight;     // 读 → 强制同步布局！
});

// 修复：读写分离
const heights = elements.map(el => el.offsetHeight); // 批量读
elements.forEach((el, i) => {
  el.style.height = heights[i] + 'px';               // 批量写
});
```

**首屏加载性能分析：**

```
关注指标：
  FP (First Paint)           → 首次像素绘制
  FCP (First Contentful Paint) → 首次有意义内容绘制
  LCP (Largest Contentful Paint) → 最大内容绘制（核心指标）
  DCL (DOMContentLoaded)     → DOM 解析完成
  L (Load)                   → 所有资源加载完成

首屏优化检查清单：
  □ LCP 元素是什么？（通常是 hero 图片）→ 优化其加载
  □ 关键 CSS 是否内联？非关键 CSS 是否异步？
  □ JS 是否使用了 defer/async？
  □ 图片是否用了合适格式（WebP/AVIF）和尺寸？
  □ 是否有不必要的第三方脚本阻塞渲染？
```

### Performance Monitor（实时监控）

```
更多工具 → Performance Monitor

实时显示：
  - CPU 使用率
  - JS 堆内存大小
  - DOM 节点数量（持续增长 = 泄漏）
  - JS 事件监听器数量

适用场景：快速判断是否存在内存泄漏或 CPU 占用过高
```

## Memory 面板（内存泄漏排查）

### 三种分析模式

| 模式 | 用途 | 适用场景 |
|------|------|---------|
| **Heap Snapshot** | 内存快照，查看所有对象及其引用关系 | 分析内存占用分布 |
| **Allocation Timeline** | 时间线，显示内存分配随时间的变化 | 定位内存泄漏发生的时间点 |
| **Allocation Sampling** | 采样分析，低开销 | 长时间运行的性能分析 |

### Heap Snapshot 使用

```
操作流程：
1. 执行某个操作（如打开弹窗）
2. 拍快照 1（Snapshot 1）
3. 关闭弹窗
4. 拍快照 2（Snapshot 2）
5. 对比快照：选择 Snapshot 2 → 视图切换为 Comparison
6. 查看 # New（新增）和 # Deleted（删除）
   → 如果某个类型的对象 New > Deleted，说明没有正确释放

筛选方式：
  Summary   → 按构造函数分组（最常用）
  Containment → 按引用链展示（从 window 到目标对象）
  Comparison → 对比两个快照的差异
  Statistics → 内存占比饼图
```

### 常见内存泄漏模式

```js
// 1. 未清理的事件监听器
class MyComponent {
  constructor() {
    // 绑定了事件但组件销毁时没移除
    window.addEventListener('resize', this.handleResize);
  }
  // 缺少：destroy() { window.removeEventListener('resize', this.handleResize); }
}

// 2. 闭包持有大对象引用
function createHandler() {
  const hugeData = new Array(1000000).fill('x'); // 1MB
  return function smallHandler() {
    console.log('hello'); // 虽然没用到 hugeData，但闭包仍然持有引用
    // 修复：将 hugeData 设为 null，或重构避免闭包捕获
  };
}

// 3. 分离的 DOM 节点（Detached DOM）
let detachedNode;
function removeElement() {
  const el = document.getElementById('myDiv');
  detachedNode = el;  // JS 变量仍然引用这个 DOM
  el.remove();        // DOM 树中已移除，但 GC 无法回收
}
// 修复：detachedNode = null

// 4. 未清除的定时器
setInterval(() => {
  updateUI(data); // 组件已销毁，定时器还在跑，引用也不会释放
}, 1000);
// 修复：组件销毁时 clearInterval

// 5. 全局变量累积
const cache = [];
function processItem(item) {
  cache.push(item); // 只进不出，永远增长
}
// 修复：加容量限制，定期清理，或用 Map + LRU 策略
```

### Detached DOM 排查步骤

```
1. 拍 Heap Snapshot
2. 在筛选框输入 "detached" 或选择 "Detached DOM" 过滤
3. 展开引用链（Retainers 列），查看谁还持有这个 DOM 节点的引用
4. 沿着引用链找到根因（通常是某个变量/闭包没清理）
5. 在代码中清除引用 → 重新验证
```

## Network 面板与资源分析

### 瀑布流（Waterfall）各阶段

```
Network 面板中每个请求的 Waterfall 列展示请求生命周期：

| 阶段 | 颜色 | 含义 |
|------|------|------|
| Queueing | 灰色 | 浏览器排队等待（连接数已满、优先级低） |
| Stalled | 灰色 | 等待可用连接（TCP 连接复用协商） |
| DNS Lookup | 橙色 | 域名解析为 IP |
| Initial Connection | 橙色 | TCP 三次握手 |
| SSL | 紫色 | TLS 握手（仅 HTTPS） |
| Request sent | 绿色 | 发送请求数据（通常很短） |
| Waiting (TTFB) | 绿色 | 等待服务器首字节响应（关键指标） |
| Content Download | 蓝色 | 下载响应体 |
```

**TTFB（Time to First Byte）分析：**

```
TTFB 高 → 服务器处理慢
  → 检查后端逻辑、数据库查询、中间件
  → 考虑 CDN 缓存、服务端缓存

DNS Lookup 高 → DNS 解析慢
  → 使用 DNS 预解析：<link rel="dns-prefetch" href="//api.example.com">
  → 或使用 CDN（减少解析跳数）

Content Download 高 → 响应体太大
  → 开启 Gzip/Brotli 压缩
  → 分页加载、懒加载
```

### 资源分析与优化

```
Network 面板底部状态栏：
  X requests | X.X MB transferred | X.X MB resources
  → transferred: 实际传输大小（经过压缩）
  → resources: 解压后大小

按类型筛选：
  All | Fetch/XHR | CSS | JS | Font | Img | Media | Doc | WS

大文件定位：
  1. 按 Size 列降序排列
  2. 找出最大的几个资源
  3. 分析是否可以：
     - 代码分割（Code Splitting）
     - Tree Shaking 去除死代码
     - 图片压缩或换格式（WebP/AVIF）
     - 字体子集化（只包含用到的字符）
```

### 模拟弱网（Throttling）

```
Network 面板 → Throttling 下拉菜单：

| 预设 | 下载 | 上传 | RTT | 场景 |
|------|------|------|-----|------|
| Fast 4G | 4 Mb/s | 3 Mb/s | 20ms | 城市 4G |
| Slow 4G | 1.5 Mb/s | 750 Kb/s | 150ms | 郊区 4G |
| 3G | 400 Kb/s | 400 Kb/s | 300ms | 移动 3G |
| Offline | 0 | 0 | - | 断网 |

自定义：点击 Add 创建自己的网络配置

用途：
  - 验证加载骨架屏/Skeleton 是否正常显示
  - 测试离线/弱网降级策略
  - 排查"为什么我这边正常但用户那边卡"
```

### Coverage 面板（代码覆盖率）

```
更多工具 → Coverage → 点 Record

结果展示：
  每个文件的使用率条形图：
  ████████░░░░ 72% used
  
  绿色 = 已执行的代码
  红色 = 未执行的代码

优化方向：
  - JS 文件覆盖率低 → 检查是否引入了整个库但只用了一部分
    如：import _ from 'lodash' → import debounce from 'lodash/debounce'
  - CSS 覆盖率低 → 用 PurgeCSS / UnCSS 移除未使用样式
  - 首屏未使用代码多 → 路由级 Code Splitting + 懒加载
```

## Lighthouse 审计

### 运行方式

```
方式一：DevTools → Lighthouse 面板
  选择设备（Mobile / Desktop）
  选择审计类别
  点击 Analyze page load

方式二：命令行
  npm install -g lighthouse
  lighthouse https://example.com --view

方式三：PageSpeed Insights（在线）
  https://pagespeed.web.dev/
  → 可以看到真实用户数据（CrUX）+ 实验室数据
```

### 四大审计维度

| 维度 | 关注点 | 常见扣分项 |
|------|--------|-----------|
| **Performance** | 加载速度、交互响应、视觉稳定 | LCP/INP/CLS 不达标、阻塞资源多 |
| **Accessibility** | 可访问性（无障碍） | 图片缺 alt、对比度不够、无 ARIA |
| **Best Practices** | 最佳实践 | HTTP 不安全、控制台报错、过时 API |
| **SEO** | 搜索引擎优化 | 缺 meta description、无 viewport、爬虫不可达 |

### 常见优化建议对照

```
Lighthouse 建议                    → 对应操作
─────────────────────────────────────────────────────
Eliminate render-blocking resources → CSS/JS 加 defer/async，内联关键 CSS
Reduce unused JavaScript            → Code Splitting，Tree Shaking
Reduce unused CSS                   → PurgeCSS，按需引入
Serve images in next-gen formats    → 转 WebP/AVIF，用 <picture> 降级
Properly size images                → 响应式图片（srcset），不加载过大图片
Enable text compression             → 服务端开启 Gzip/Brotli
Preconnect to required origins      → <link rel="preconnect" href="...">
Avoid enormous network payloads     → 分页、懒加载、减少首屏资源
Minimize main-thread work           → 减少 JS 执行时间，用 Worker
Reduce JavaScript execution time     → 移除未使用代码，延迟非关键脚本
```

### 性能评分计算权重（Lighthouse v10+）

```
指标     权重     达标标准
────────────────────────────
FCP      10%     ≤ 1.8s
SI       10%     ≤ 3.4s  (Speed Index)
LCP      25%     ≤ 2.5s
TBT      30%     ≤ 200ms (Total Blocking Time)
CLS      25%     ≤ 0.1
INP      评估中   ≤ 200ms（逐步纳入权重）

评分区间：
  90-100 → 🟢 Good
  50-89  → 🟠 Needs Improvement
  0-49   → 🔴 Poor
```

### Lighthouse 报告实战解读

```
拿到报告后的优化优先级：

1. 先看 Opportunities（优化机会）
   → 这些是直接能提升分数的操作，按潜在节省时间排序
   → 优先处理节省时间最多的几项

2. 再看 Diagnostics（诊断信息）
   → 了解页面加载的详细数据
   → 如 Main-thread work breakdown、DOM size

3. 最后看 Passed audits（已通过项）
   → 确认已做好的部分，保持住

注意：
  - Lighthouse 是实验室数据，每次跑可能略有波动
  - 真机弱网下的体验比跑分更重要
  - Mobile 分数通常比 Desktop 低很多（CPU throttling 更严格）
  - 关注趋势而非单次分数
```
