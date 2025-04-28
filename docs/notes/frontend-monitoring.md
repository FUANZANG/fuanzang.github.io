# 前端监控笔记

> 📌 本文件记录前端监控体系：错误监控、性能监控、埋点方案、SourceMap、监控平台搭建与最佳实践。

---

## 1. 监控体系概览

### 三大方向

```
前端监控
├── 错误监控 — JS 异常、资源加载失败、接口异常、Promise 未捕获
├── 性能监控 — 加载性能、运行时性能、Core Web Vitals
└── 行为监控 — PV/UV、点击埋点、用户路径、停留时长
```

### 数据采集流程

```
SDK 采集 → 数据清洗/聚合 → 上报（sendBeacon / fetch / img）→ 服务端接收
→ 存储（ClickHouse / ES）→ 分析/告警 → 可视化大盘
```

---

## 2. 错误监控

### JS 运行时错误

```js
// window.onerror — 捕获同步/异步 JS 错误
window.onerror = function (message, source, lineno, colno, error) {
  report({
    type: 'js-error',
    message,           // 错误信息
    source,            // 出错文件 URL
    lineno,            // 行号
    colno,             // 列号
    error: {
      name: error?.name,
      stack: error?.stack,  // 调用栈
    },
    url: location.href,
    ua: navigator.userAgent,
    timestamp: Date.now(),
  })
}

// ⚠️ 注意：
// 1. 跨域脚本错误只能拿到 "Script error."（无详细信息）
//    解决：script 标签加 crossorigin 属性 + 服务端返回 CORS 头
// 2. 不会捕获 Promise 未处理异常
// 3. 不会捕获资源加载错误
```

### Promise 未捕获异常

```js
// unhandledrejection — 捕获未处理的 Promise rejection
window.addEventListener('unhandledrejection', (event) => {
  report({
    type: 'promise-error',
    reason: event.reason,
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack,
    url: location.href,
    timestamp: Date.now(),
  })

  // event.preventDefault() 可阻止控制台报错
})

// 常见场景：
// fetch('/api').then(r => r.json())  // 网络错误 → unhandledrejection
// async function foo() { throw new Error('fail') }
// foo()  // 未 await → unhandledrejection
```

### 资源加载错误

```js
// 捕获 img/script/link 等加载失败（不会冒泡，需 capture 模式）
window.addEventListener('error', (event) => {
  const target = event.target
  if (!target || !target.tagName) return  // 过滤 JS 错误（已由 onerror 处理）

  // 只处理资源加载错误
  const tagName = target.tagName.toLowerCase()
  if (['img', 'script', 'link', 'video', 'audio', 'iframe'].includes(tagName)) {
    report({
      type: 'resource-error',
      tagName,
      url: target.src || target.href,
      pageUrl: location.href,
      timestamp: Date.now(),
    })
  }
}, true)  // ⚠️ 必须用 capture 模式（第三个参数 true）

// 区分 JS 错误 vs 资源错误：
// - window.onerror 捕获 JS 运行时错误
// - window.addEventListener('error', ..., true) 捕获资源加载错误
// - 两者互补，不重复
```

### 接口请求错误

```js
// 方案一：重写 XMLHttpRequest
const originalOpen = XMLHttpRequest.prototype.open
const originalSend = XMLHttpRequest.prototype.send

XMLHttpRequest.prototype.open = function (method, url) {
  this._monitor = { method, url, startTime: Date.now() }
  return originalOpen.apply(this, arguments)
}

XMLHttpRequest.prototype.send = function (body) {
  this.addEventListener('load', function () {
    const { method, url, startTime } = this._monitor
    report({
      type: 'api-error',
      method,
      url,
      status: this.status,
      duration: Date.now() - startTime,
      response: this.status >= 400 ? this.responseText?.slice(0, 500) : undefined,
      timestamp: Date.now(),
    })
  })

  this.addEventListener('error', function () {
    const { method, url, startTime } = this._monitor
    report({
      type: 'api-error',
      method,
      url,
      status: 0,  // 网络错误
      duration: Date.now() - startTime,
      message: 'Network Error',
      timestamp: Date.now(),
    })
  })

  this.addEventListener('timeout', function () {
    const { method, url } = this._monitor
    report({
      type: 'api-error',
      method,
      url,
      status: 0,
      message: 'Timeout',
      timestamp: Date.now(),
    })
  })

  return originalSend.apply(this, arguments)
}

// 方案二：重写 fetch（推荐，更现代）
const originalFetch = window.fetch
window.fetch = async function (input, init) {
  const url = typeof input === 'string' ? input : input.url
  const method = init?.method || 'GET'
  const startTime = Date.now()

  try {
    const response = await originalFetch(input, init)
    const duration = Date.now() - startTime

    if (!response.ok) {
      const clone = response.clone()
      const text = await clone.text().catch(() => '')
      report({
        type: 'api-error',
        method, url,
        status: response.status,
        duration,
        response: text.slice(0, 500),
        timestamp: Date.now(),
      })
    }
    return response
  } catch (error) {
    report({
      type: 'api-error',
      method, url,
      status: 0,
      duration: Date.now() - startTime,
      message: error.message,
      timestamp: Date.now(),
    })
    throw error
  }
}

// 方案三：Axios 拦截器（项目已用 Axios 时最方便）
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    report({
      type: 'api-error',
      method: error.config?.method,
      url: error.config?.url,
      status: error.response?.status || 0,
      message: error.message,
      timestamp: Date.now(),
    })
    return Promise.reject(error)
  }
)
```

### 跨域脚本 "Script error." 问题

```html
<!-- 原因：浏览器的同源策略，跨域脚本的错误信息被隐藏 -->
<script src="https://cdn.example.com/lib.js"></script>
<!-- onerror 只能拿到 "Script error.", "", 0, 0, null -->

<!-- 解决：script 加 crossorigin 属性 -->
<script src="https://cdn.example.com/lib.js" crossorigin></script>

<!-- 同时 CDN 必须返回 CORS 头 -->
<!-- Access-Control-Allow-Origin: * (或具体域名) -->

<!-- 如果 CDN 不支持 CORS → 只能部署同源脚本 -->
```

### React / Vue 框架错误

```js
// React Error Boundary
class ErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    report({
      type: 'react-error',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,  // 组件层级栈
      timestamp: Date.now(),
    })
  }

  render() {
    if (this.state.hasError) return <FallbackUI />
    return this.props.children
  }
}

// Vue errorHandler
const app = createApp(App)
app.config.errorHandler = (err, instance, info) => {
  report({
    type: 'vue-error',
    message: err.message,
    stack: err.stack,
    info,  // Vue 特定的错误信息（如 "render function"）
    componentName: instance?.$options?.name,
    timestamp: Date.now(),
  })
}

// ⚠️ Error Boundary 不会捕获：
// - 事件处理函数中的错误（用 try/catch）
// - 异步代码（setTimeout, Promise）
// - SSR 错误
// - Error Boundary 自身的错误
```

### 错误聚合与去重

```js
// 问题：同一个错误可能触发多次（循环中的错误、频繁触发的事件）
// 解决：基于错误指纹去重

function getErrorFingerprint(error) {
  // 用 message + source + lineno + colno 生成指纹
  // 或用 stack trace 的前几行
  const key = `${error.message}|${error.source}|${error.lineno}|${error.colno}`
  return simpleHash(key)
}

// 采样上报（避免大量重复错误淹没服务器）
const reportedErrors = new Map()  // fingerprint → { count, lastTime }

function reportWithDedup(error) {
  const fingerprint = getErrorFingerprint(error)
  const existing = reportedErrors.get(fingerprint)

  if (existing) {
    existing.count++
    existing.lastTime = Date.now()
    // 定期批量上报累计次数
    return
  }

  reportedErrors.set(fingerprint, { count: 1, lastTime: Date.now() })
  report(error)
}
```

---

## 3. 性能监控

### Core Web Vitals（核心性能指标）

```
LCP (Largest Contentful Paint) — 最大内容绘制时间
  衡量：首屏加载速度
  目标：< 2.5s 良好 | 2.5-4s 需改进 | > 4s 差
  元素：最大的 <img>、<video>、背景图、块级文本元素

INP (Interaction to Next Paint) — 交互到下一帧绘制
  衡量：交互响应延迟（替代 FID）
  目标：< 200ms 良好 | 200-500ms 需改进 | > 500ms 差
  计算：所有交互延迟的第 98 百分位值

CLS (Cumulative Layout Shift) — 累计布局偏移
  衡量：视觉稳定性
  目标：< 0.1 良好 | 0.1-0.25 需改进 | > 0.25 差
  原因：图片无尺寸、动态插入内容、字体加载闪烁
```

### 性能指标采集

```js
// web-vitals 库（Google 官方，推荐）
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals'

onLCP(report => report({ type: 'web-vital', name: 'LCP', value: report.value }))
onINP(report => report({ type: 'web-vital', name: 'INP', value: report.value }))
onCLS(report => report({ type: 'web-vital', name: 'CLS', value: report.value }))
onFCP(report => report({ type: 'web-vital', name: 'FCP', value: report.value }))
onTTFB(report => report({ type: 'web-vital', name: 'TTFB', value: report.value }))
```

### Performance API 手动采集

```js
// Navigation Timing — 页面加载各阶段耗时
const [nav] = performance.getEntriesByType('navigation')
const timing = {
  // DNS
  dns: nav.domainLookupEnd - nav.domainLookupStart,
  // TCP
  tcp: nav.connectEnd - nav.connectStart,
  // TLS（HTTPS）
  tls: nav.connectEnd - nav.secureConnectionStart,
  // TTFB（首字节时间）
  ttfb: nav.responseStart - nav.requestStart,
  // 响应下载
  response: nav.responseEnd - nav.responseStart,
  // DOM 解析
  dom: nav.domComplete - nav.domInteractive,
  // DOMContentLoaded
  domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
  // load
  load: nav.loadEventEnd - nav.loadEventStart,
  // 总耗时
  total: nav.loadEventEnd - nav.fetchStart,
}

// Resource Timing — 资源加载耗时
const resources = performance.getEntriesByType('resource')
resources.forEach(r => {
  // 慢资源检测（> 1s）
  if (r.duration > 1000) {
    report({
      type: 'slow-resource',
      name: r.name,           // 资源 URL
      initiatorType: r.initiatorType,  // script/link/img/xmlhttprequest
      duration: Math.round(r.duration),
      transferSize: r.transferSize,    // 传输大小
    })
  }
})

// Long Task — 长任务检测（> 50ms 阻塞主线程）
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    report({
      type: 'long-task',
      startTime: entry.startTime,
      duration: entry.duration,
    })
  }
})
observer.observe({ type: 'longtask', buffered: true })

// Paint Timing — FCP / LCP
const paintObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name === 'first-contentful-paint') {
      report({ type: 'paint', name: 'FCP', value: entry.startTime })
    }
  }
})
paintObserver.observe({ type: 'paint', buffered: true })
```

### 白屏检测

```js
// 方案：检测关键 DOM 节点是否渲染
function detectBlankScreen() {
  // 延迟检测（确保页面已渲染）
  setTimeout(() => {
    const root = document.getElementById('app') || document.getElementById('root')
    if (!root || root.children.length === 0) {
      report({ type: 'blank-screen', url: location.href, timestamp: Date.now() })
    }
  }, 3000)
}

// 方案二：采样点检测（更通用）
function detectBlankScreenBySampling() {
  setTimeout(() => {
    const points = []
    // 在页面上均匀取 9 个点（3x3 网格）
    const width = window.innerWidth
    const height = window.innerHeight
    for (let i = 1; i <= 3; i++) {
      for (let j = 1; j <= 3; j++) {
        points.push({ x: width * i / 4, y: height * j / 4 })
      }
    }

    const hasContent = points.some(({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      // 排除 body/html 等根节点
      return el && el.tagName !== 'HTML' && el.tagName !== 'BODY' && el.tagName !== 'SCRIPT'
    })

    if (!hasContent) {
      report({ type: 'blank-screen', url: location.href })
    }
  }, 3000)
}
```

---

## 4. 行为/埋点监控

### PV / UV

```js
// PV（Page View）— 页面访问次数
function trackPV() {
  report({
    type: 'pv',
    url: location.href,
    title: document.title,
    referrer: document.referrer,
    timestamp: Date.now(),
  })
}

// SPA 路由变化监听
// Vue Router
router.afterEach((to) => {
  report({ type: 'pv', url: to.fullPath, title: to.meta?.title })
})

// React Router
useEffect(() => {
  report({ type: 'pv', url: location.pathname, title: document.title })
}, [location.pathname])

// 通用：监听 popstate + 重写 pushState/replaceState
const originalPush = history.pushState
history.pushState = function (...args) {
  originalPush.apply(this, args)
  report({ type: 'pv', url: args[2], title: document.title })
}
window.addEventListener('popstate', () => {
  report({ type: 'pv', url: location.href, title: document.title })
})

// UV（Unique Visitor）— 独立访客数
// 基于用户 ID 或设备指纹去重
// 设备指纹：UA + 屏幕分辨率 + 语言 + 时区 → hash
```

### 点击埋点

```js
// 方案一：手动埋点
<button onClick={() => track('click', { action: 'buy', itemId: '123' })}>
  购买
</button>

// 方案二：声明式埋点（data 属性）
<button data-track="click-buy" data-track-item-id="123">购买</button>

// 全局事件委托采集
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-track]')
  if (!target) return

  const trackValue = target.dataset.track
  const params = {}
  for (const [key, value] of Object.entries(target.dataset)) {
    if (key.startsWith('track') && key !== 'track') {
      // data-track-item-id → itemId
      const paramKey = key.replace('track', '').replace(/^./, c => c.toLowerCase())
      params[paramKey] = value
    }
  }

  report({ type: 'track', event: trackValue, params, timestamp: Date.now() })
}, true)

// 方案三：全量采集（无埋点）
// 自动采集所有点击事件 + DOM 路径
// 后续在后台配置哪些事件需要分析
document.addEventListener('click', (e) => {
  const path = getDomPath(e.target)  // ['div.container', 'ul.list', 'li.item', 'button']
  report({
    type: 'auto-track',
    xpath: path.join(' > '),
    text: e.target.textContent?.slice(0, 50),
    timestamp: Date.now(),
  })
}, true)
```

### 页面停留时长

```js
// 方案：visibilitychange + beforeunload
let enterTime = Date.now()

// 页面隐藏/关闭时上报
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    report({
      type: 'page-duration',
      url: location.href,
      duration: Date.now() - enterTime,
    })
  }
  if (document.visibilityState === 'visible') {
    enterTime = Date.now()  // 重新进入，重置
  }
})

// SPA 路由切换时也需上报
router.beforeEach(() => {
  report({
    type: 'page-duration',
    url: location.href,
    duration: Date.now() - enterTime,
  })
})
router.afterEach(() => {
  enterTime = Date.now()
})
```

### 用户行为回放

```js
// rrweb（Record and Replay the Web）
// 录制用户操作（DOM 变化、鼠标、键盘）→ 回放
import { record } from 'rrweb'

const events = []
const stopRecording = record({
  emit(event) {
    events.push(event)
    // 批量上报
    if (events.length >= 50) {
      report({ type: 'rrweb-events', events: events.splice(0) })
    }
  },
})

// 回放
import { Replayer } from 'rrweb'
const replayer = new Replayer(events)
replayer.play()
```

---

## 5. 数据上报

### 上报方式

```js
// 1. sendBeacon（推荐，页面卸载时可靠）
// 异步、不阻塞页面关闭、保证发送
navigator.sendBeacon('/api/monitor', JSON.stringify(data))

// 带自定义 header
const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
navigator.sendBeacon('/api/monitor', blob)

// 2. img 信标（传统方案，兼容性好）
const img = new Image()
img.src = `https://monitor.example.com/report?data=${encodeURIComponent(JSON.stringify(data))}`
// GET 请求，有长度限制（URL 最大约 2KB-8KB）

// 3. fetch（适合批量上报）
fetch('/api/monitor', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  keepalive: true,  // 页面卸载后继续发送（类似 sendBeacon）
})

// 4. XMLHttpRequest（不推荐，同步会阻塞页面关闭）
```

### 上报策略

```js
// 1. 批量上报（减少请求次数）
const buffer = []
const MAX_BUFFER = 20
const FLUSH_INTERVAL = 5000  // 5s

function report(data) {
  buffer.push(data)
  if (buffer.length >= MAX_BUFFER) flush()
}

function flush() {
  if (buffer.length === 0) return
  const data = buffer.splice(0)
  navigator.sendBeacon('/api/monitor', JSON.stringify(data))
}

// 定时刷新
setInterval(flush, FLUSH_INTERVAL)

// 页面卸载时刷新
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush()
})
window.addEventListener('beforeunload', flush)

// 2. 采样上报（减少数据量）
const SAMPLE_RATE = 0.1  // 10% 用户上报
if (Math.random() < SAMPLE_RATE) {
  report(data)
}

// 3. 错误立即上报，性能/行为数据批量上报
// 错误需要实时性，性能/行为可以延迟
```

---

## 6. SourceMap 还原

### 原理

```
生产代码经过压缩混淆，错误堆栈中的行列号指向压缩后的文件
SourceMap 记录了压缩前后代码的映射关系
通过 SourceMap 可以将压缩后的行列号还原为源码位置

压缩后: app.a1b2c3.js:1:5432
还原后: src/components/UserProfile.vue:42:15
```

### 服务端还原

```js
// source-map 库（Mozilla 官方）
import { SourceMapConsumer } from 'source-map'

async function restoreErrorPosition(file, line, column) {
  // 下载 SourceMap 文件
  const rawSourceMap = await fetch(`https://cdn.example.com/sourcemaps/${file}.map`)
    .then(r => r.json())

  const consumer = await new SourceMapConsumer(rawSourceMap)
  const original = consumer.originalPositionFor({ line, column })

  console.log(original)
  // {
  //   source: 'webpack:///src/components/UserProfile.vue',
  //   line: 42,
  //   column: 15,
  //   name: 'handleClick'
  // }

  consumer.destroy()  // 释放内存
  return original
}

// ⚠️ SourceMap 不要部署到生产环境！
// 1. 暴露源码 → 安全风险
// 2. 文件很大（几 MB）→ 浪费带宽
// 正确做法：
// - 构建时生成 SourceMap，上传到内部服务器
// - 错误上报后，服务端用 SourceMap 还原
// - 前端只展示还原后的错误信息
```

### 构建配置

```js
// Webpack
module.exports = {
  devtool: 'hidden-source-map',  // 生成 .map 文件，但不在 JS 中引用
  // 'source-map'      → 生成 .map + JS 末尾引用（❌ 暴露）
  // 'hidden-source-map' → 生成 .map，不引用（✅ 推荐生产）
  // 'nosources-source-map' → 生成 .map，不含源码内容
  // false             → 不生成（❌ 无法还原）
}

// Vite
export default defineConfig({
  build: {
    sourcemap: 'hidden',  // 同上
  },
})

// 上传 SourceMap 到内部服务器
// CI/CD 流程中自动上传
// webpack 插件: sentry-webpack-plugin / @sentry/webpack-plugin
```

### Sentry SourceMap 上传

```js
// sentry-webpack-plugin
const { sentryWebpackPlugin } = require('@sentry/webpack-plugin')

module.exports = {
  plugins: [
    sentryWebpackPlugin({
      org: 'my-org',
      project: 'my-project',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: { name: process.env.GIT_COMMIT },
      sourcemaps: {
        assets: './dist/**',
        urlPrefix: '~/static/js/',  // 对应线上路径
      },
    }),
  ],
}
```

---

## 7. 监控 SDK 设计

### 架构

```js
// 核心架构
class MonitorSDK {
  constructor(options) {
    this.options = {
      dsn: '',            // 上报地址
      appId: '',          // 应用标识
      sampleRate: 1,      // 采样率
      enableError: true,  // 错误监控
      enablePerformance: true,
      enableBehavior: true,
      maxBufferSize: 20,
      flushInterval: 5000,
      ...options,
    }

    this.buffer = []
    this.plugins = []
  }

  // 安装插件
  use(plugin) {
    plugin.install(this)
    this.plugins.push(plugin)
    return this
  }

  // 上报数据
  send(data) {
    // 采样
    if (Math.random() > this.options.sampleRate) return

    const payload = {
      ...data,
      appId: this.options.appId,
      url: location.href,
      ua: navigator.userAgent,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
    }

    this.buffer.push(payload)
    if (this.buffer.length >= this.options.maxBufferSize) {
      this.flush()
    }
  }

  // 立即发送
  flush() {
    if (this.buffer.length === 0) return
    const data = this.buffer.splice(0)
    navigator.sendBeacon(this.options.dsn, JSON.stringify(data))
  }

  // 会话 ID（同一次访问）
  getSessionId() {
    if (!sessionStorage.getItem('_monitor_sid')) {
      sessionStorage.setItem('_monitor_sid', generateId())
    }
    return sessionStorage.getItem('_monitor_sid')
  }

  // 初始化
  init() {
    // 页面卸载时刷新
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush()
    })
    window.addEventListener('beforeunload', () => this.flush())

    return this
  }
}

// 使用
const monitor = new MonitorSDK({
  dsn: 'https://monitor.example.com/report',
  appId: 'my-app',
  sampleRate: 0.5,
})

monitor
  .use(ErrorPlugin())
  .use(PerformancePlugin())
  .use(BehaviorPlugin())
  .init()
```

### 插件化设计

```js
// 错误监控插件
function ErrorPlugin() {
  return {
    name: 'error',
    install(sdk) {
      // JS 错误
      window.onerror = (message, source, lineno, colno, error) => {
        sdk.send({
          type: 'js-error',
          message, source, lineno, colno,
          stack: error?.stack,
        })
      }

      // Promise 错误
      window.addEventListener('unhandledrejection', (event) => {
        sdk.send({
          type: 'promise-error',
          message: String(event.reason),
          stack: event.reason?.stack,
        })
      })

      // 资源错误
      window.addEventListener('error', (event) => {
        const target = event.target
        if (target?.tagName) {
          sdk.send({
            type: 'resource-error',
            tagName: target.tagName.toLowerCase(),
            url: target.src || target.href,
          })
        }
      }, true)
    },
  }
}

// 性能监控插件
function PerformancePlugin() {
  return {
    name: 'performance',
    install(sdk) {
      // 页面加载完成后采集
      window.addEventListener('load', () => {
        setTimeout(() => {
          const [nav] = performance.getEntriesByType('navigation')
          if (nav) {
            sdk.send({
              type: 'navigation-timing',
              ttfb: nav.responseStart - nav.requestStart,
              domReady: nav.domContentLoadedEventEnd - nav.fetchStart,
              load: nav.loadEventEnd - nav.fetchStart,
            })
          }
        }, 0)
      })
    },
  }
}
```

---

## 8. 监控平台

### 开源方案

| 平台 | 特点 | 适合 |
|------|------|------|
| Sentry | 功能最全，错误追踪 + 性能 + Session Replay | 中大型项目 |
| Grafana + Prometheus | 自定义指标 + 可视化大盘 | 自建监控 |
| Matomo | 开源 Google Analytics 替代，隐私友好 | 行为分析 |
| OpenReplay | 开源 Session Replay | 用户行为回放 |
| AEM (Adobe) | 企业级 RUM（Real User Monitoring） | 大型企业 |

### Sentry 接入

```js
// 安装
npm install @sentry/vue  // 或 @sentry/react

// Vue 接入
import * as Sentry from '@sentry/vue'
import { BrowserTracing } from '@sentry/tracing'

Sentry.init({
  app,
  dsn: 'https://xxx@o0.ingest.sentry.io/0',
  integrations: [
    new BrowserTracing({
      routingInstrumentation: Sentry.vueRouterInstrumentation(router),
      tracePropagationTargets: ['api.example.com'],
    }),
    new Sentry.Replay({ maskAllText: false }),
  ],
  tracesSampleRate: 0.2,    // 性能采样 20%
  replaysSessionSampleRate: 0.1,  // Session Replay 10%
  replaysOnErrorSampleRate: 1.0,  // 出错时 100% 录制
  release: `my-app@${process.env.GIT_COMMIT}`,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // 过滤/修改事件
    if (event.message?.includes('ResizeObserver')) return null
    return event
  },
})

// 手动上报
Sentry.captureMessage('Something happened')
Sentry.captureException(new Error('Custom error'))
Sentry.setUser({ id: '123', email: 'user@example.com' })
Sentry.setTag('page', 'checkout')
```

### 自建监控后端

```
技术选型：
├── 数据接收层：Nginx → Node.js / Go 接收服务
├── 消息队列：Kafka / RabbitMQ（削峰）
├── 存储层：
│   ├── ClickHouse（时序数据，适合大量写入和分析）
│   ├── Elasticsearch（全文检索，适合日志）
│   └── Redis（实时告警、去重）
├── 计算层：Flink / Spark（实时聚合）
└── 展示层：Grafana / 自建 Dashboard

核心表设计（ClickHouse）：
- error_log: 错误日志（appId, type, message, stack, url, ua, timestamp）
- performance_log: 性能数据（appId, lcp, inp, cls, ttfb, url, timestamp）
- behavior_log: 行为数据（appId, event, params, url, sessionId, timestamp）
- page_view: PV 数据（appId, url, referrer, uv, timestamp）
```

---

## 9. 告警与排查

### 告警策略

```
错误告警：
- 错误率突增（5 分钟内错误率 > 5%）
- 新增错误类型（之前没出现过的错误）
- 错误量突增（相比昨日同期增长 200%）

性能告警：
- LCP P75 > 4s
- INP P75 > 500ms
- CLS P75 > 0.25
- TTFB P75 > 800ms

接口告警：
- 错误率 > 1%
- 平均耗时 > 2s
- 超时率 > 5%

告警通道：
- 企业微信 / 钉钉 / 飞书
- 邮件
- 短信（P0 级别）
- PagerDuty / OpsGenie
```

### 排查流程

```
1. 发现告警
   ↓
2. 确认影响范围（影响用户数、页面、时间段）
   ↓
3. 查看错误详情（堆栈、SourceMap 还原、用户环境）
   ↓
4. 复现问题（根据用户环境 UA、URL、操作步骤）
   ↓
5. 定位代码（通过 SourceMap 定位到源码文件和行号）
   ↓
6. 修复上线
   ↓
7. 验证修复（监控错误率是否下降）
   ↓
8. 复盘（根因分析、改进措施）
```

### 用户级排查

```js
// 通过 sessionId / userId 查看单个用户的完整行为链路
// 1. 该用户的 PV 路径
// 2. 该用户的点击行为
// 3. 该用户遇到的错误
// 4. 该用户的性能数据
// 5. Session Replay 回放（如果有）

// Sentry 示例
Sentry.setUser({ id: userId, email, username })
// 在 Sentry 后台可以按用户筛选所有事件
```

---

## 10. 隐私与合规

### 数据脱敏

```js
// 上报前过滤敏感信息
function sanitize(data) {
  // 过滤 URL 中的敏感参数
  if (data.url) {
    data.url = data.url.replace(/token=[^&]+/g, 'token=***')
    data.url = data.url.replace(/password=[^&]+/g, 'password=***')
  }

  // 过滤请求头中的认证信息
  if (data.headers?.Authorization) {
    data.headers.Authorization = '***'
  }

  // 过滤用户输入（可能包含手机号、身份证等）
  if (data.message) {
    data.message = data.message
      .replace(/\d{11}/g, '***')           // 手机号
      .replace(/\d{17}[\dXx]/g, '***')     // 身份证
  }

  return data
}

// Session Replay 脱敏
// Sentry Replay
new Sentry.Replay({
  maskAllText: true,         // 遮盖所有文本
  maskAllInputs: true,       // 遮盖所有输入
  blockClass: 'sentry-block', // 带此 class 的元素完全遮盖
  ignoreClass: 'sentry-ignore', // 带此 class 的元素不录制
})
```

### 合规要求

```
GDPR（欧盟）:
- 需要用户同意才能收集数据
- 用户有权要求删除数据
- 数据最小化原则

个人信息保护法（中国）:
- 收集个人信息需明示同意
- 设备指纹属于个人信息
- 数据出境需评估

最佳实践：
1. 首次访问弹出隐私政策同意
2. 不收集不必要的个人信息
3. 提供关闭监控的选项
4. 数据定期清理
5. 数据存储在合规区域
```

---

## 参考资源

- [web-vitals](https://github.com/GoogleChrome/web-vitals) — Google 官方性能指标库
- [Sentry](https://docs.sentry.io/) — 错误监控平台
- [rrweb](https://github.com/rrweb-io/rrweb) — 用户行为录制/回放
- [Performance API](https://developer.mozilla.org/zh-CN/docs/Web/API/Performance)
- [Core Web Vitals](https://web.dev/articles/vitals) — Google 性能指标
- [source-map](https://github.com/mozilla/source-map) — Mozilla SourceMap 解析库
- [OpenTelemetry](https://opentelemetry.io/) — 可观测性标准
