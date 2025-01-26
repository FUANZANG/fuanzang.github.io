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
