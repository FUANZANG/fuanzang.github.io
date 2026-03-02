# PWA（渐进式 Web 应用）

> 📌 本文件记录 PWA 相关知识：Service Worker、Web App Manifest、离线缓存、推送通知、安装提示、后台同步、IndexedDB、性能优化与最佳实践。
>
> ⚠️ **边界说明**：Service Worker 基础注册与缓存策略见 [浏览器笔记](/notes/foundations/browser)，HTTP/缓存见 [网络协议笔记](/notes/foundations/network-protocol)。本文聚焦 **PWA 完整体系**——安装、推送、后台同步、离线优先等进阶能力。
>
> 📅 基于以下版本：Chrome 120+ | Safari 17+ | Firefox 120+
>
> 🔗 Service Worker 基础注册见 [浏览器笔记](/notes/foundations/browser)，HTTP/缓存见 [网络协议笔记](/notes/foundations/network-protocol)

---

## 1. PWA 核心三要素

```
PWA = Service Worker + Web App Manifest + HTTPS

┌─────────────────────────────────────────────────────────┐
│                    PWA 渐进增强                          │
│                                                         │
│  Level 1: 渐进式 — 在任何浏览器都能工作                   │
│  Level 2: 响应式 — 适配任何设备                           │
│  Level 3: 连网性 — Service Worker 拦截网络请求             │
│  Level 4: 像应用 — Standalone 模式                       │
│  Level 5: 可发现 — Web App Manifest 被搜索引擎识别         │
│  Level 6: 可安装 — 用户可添加到主屏幕                      │
│  Level 7: 可分享 — 通过 URL 分享                         │
│  Level 8: 离线优先 — Cache Storage + IndexedDB           │
│  Level 9: 实时更新 — Service Worker 自动更新机制           │
│  Level 10: 推送通知 — Push API + Notification API        │
└─────────────────────────────────────────────────────────┘
```

### 必要条件

```
1. HTTPS（localhost 除外）
2. Service Worker 注册成功
3. Web App Manifest 存在且有效
4. Manifest 至少有一个 192×192 和一个 512×512 的图标
5. 有可注册的 Service Worker（即使空实现）
```

---

## 2. Web App Manifest

### 基本格式

```json
{
  "name": "我的渐进式应用",
  "short_name": " MyApp",
  "description": "一个离线可用的 Web 应用",
  "start_url": "/?utm_source=pwa",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4A90D9",
  "orientation": "any",
  "scope": "/",
  "lang": "zh-CN",
  "categories": ["productivity", "utilities"],
  "icons": [
    {
      "src": "/icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/large.png",
      "sizes": "1920x1080",
      "type": "image/png"
    }
  ],
  "shortcuts": [
    {
      "name": "搜索",
      "short_name": "搜索",
      "description": "打开搜索页面",
      "url": "/search?utm_source=pwa",
      "icons": [{ "src": "/icons/search.png", "sizes": "192x192" }]
    }
  ]
}
```

### display 模式对比

```
display 选项：

┌──────────────┬──────────────────────────────────┐
│ 值           │ 效果                             │
├──────────────┼──────────────────────────────────┤
│ fullscreen   │ 全屏，无浏览器 UI                │
│ standalone   │ 独立应用外观，有自定义标题栏       │
│ minimal-ui   │ 最小化浏览器 UI（前进/后退/刷新）  │
│ browser      │ 普通浏览器标签页（默认）           │
└──────────────┴──────────────────────────────────┘
```

### HTML 中引入

```html
<head>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#4A90D9">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="MyApp">
  <link rel="apple-touch-icon" href="/icons/icon-192.png">
</head>
```

> 💡 iOS 需要额外的 `<meta>` 和 `<link>` 标签才能实现类似 PWA 的体验。

---

## 3. Service Worker 深度

### 生命周期

```
注册 → 等待安装 → 安装完成 → 等待激活 → 激活 → 控制页面

详细流程：

1. 注册 (Register)
   navigator.serviceWorker.register('/sw.js')
   ↓
2. 下载 SW 脚本
   ↓
3. install 事件触发
   → 预缓存资源 (cache.addAll)
   → 初始化 IndexedDB
   ↓
4. 安装完成，进入 waiting 状态
   → 如果这是第一个 SW，直接进入步骤 5
   → 如果有旧版本 SW 控制着页面，等待所有页面关闭
   ↓
5. activate 事件触发
   → 清理旧缓存 (caches.delete)
   → 升级数据库 schema
   → clients.claim() 接管已有页面
   ↓
6. 开始拦截 fetch 事件
```

### 完整 Service Worker 实现

```js
// sw.js — Service Worker 主文件

const CACHE_NAME = 'myapp-v1.2.3'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/logo.png',
  '/assets/fonts/main.woff2',
]

// 安装：预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // 跳过等待，立即激活新版本
  self.skipWaiting()
})

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  // 立即接管所有受控页面
  self.clients.claim()
})

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event

  // 导航请求使用 Network First
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  // 静态资源使用 Cache First
  if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirst(request))
    return
  }

  // API 请求使用 Stale While Revalidate
  if (request.url.includes('/api/')) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // 其他请求走 Network First
  event.respondWith(networkFirst(request))
})

// ==================== 缓存策略 ====================

// Cache First：优先缓存，没有再走网络
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

// Network First：优先网络，失败回退到缓存
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response('Offline', { status: 503 })
  }
}

// Stale While Revalidate：先返回缓存，后台更新
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  })

  return cached || fetchPromise
}

// 判断是否为静态资源
function isStaticAsset(url) {
  return /\.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$/i.test(url)
}

// ==================== 后台消息 ====================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME)
      break
    case 'UPDATE_CHECK':
      // 检查新版本
      navigator.serviceWorker.register('/sw-new.js').then((reg) => {
        if (reg.waiting) {
          self.postMessage({ type: 'UPDATE_AVAILABLE' })
        }
      })
      break
  }
})
```

### 导航预加载（Navigation Preload）

```js
// 启用导航预加载，让主线程不必等待 SW 启动就开始 fetch
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    })
  )
  // 启用导航预加载
  if (self.registration.navigationPreload) {
    self.registration.navigationPreload.enable()
  }
})

// 在 fetch 事件中接收预加载的响应
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // 先尝试导航预加载的响应
        let response = await self.registration.navigationPreload.enableSync?.()
        if (response) return response

        // 回退到缓存匹配
        const cached = await caches.match(event.request)
        if (cached) return cached

        return fetch(event.request)
      })()
    )
  }
})
```

---

## 4. 离线体验

### 离线页面

```js
// sw.js — 离线时返回自定义页面
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功时更新缓存
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(async () => {
        // 离线时返回离线页面
        const cachedOffline = await caches.match('/offline.html')
        return cachedOffline || new Response('你已离线', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      })
  )
})
```

```html
<!-- offline.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>你已离线</title>
  <style>
    body { font-family: system-ui; text-align: center; padding: 40px; }
    .icon { font-size: 64px; }
  </style>
</head>
<body>
  <div class="icon">📡</div>
  <h1>你已离线</h1>
  <p>请检查网络连接后刷新页面。</p>
  <button onclick="location.reload()">重试</button>
</body>
</html>
```

### 在线状态检测

```js
// 检测网络状态
function getNetworkStatus() {
  const online = navigator.onLine
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

  return {
    online,
    effectiveType: connection?.effectiveType,  // 'slow-2g' | '2g' | '3g' | '4g'
    rtt: connection?.rtt,                      // 预估往返时间 (ms)
    downlink: connection?.downlink,            // 预估带宽 (Mbps)
    saveData: connection?.saveData,            // 是否开启省流模式
  }
}

// 监听网络变化
window.addEventListener('online',  () => console.log('网络已恢复'))
window.addEventListener('offline', () => console.log('网络已断开'))

// 或在 SW 中监听
self.addEventListener('message', (event) => {
  if (event.data.type === 'CHECK_ONLINE') {
    const status = getNetworkStatus()
    event.source.postMessage(status)
  }
})
```

### 前端检测在线状态

```js
// 在应用中检测
if (!navigator.onLine) {
  // 离线状态
  showOfflineBanner()
}

// 结合 SW 状态
navigator.serviceWorker.ready.then((reg) => {
  reg.sync.register('sync-data').catch(() => {})
})
```

---

## 5. 推送通知

### 基本流程

```
用户授权 → 订阅 Push → 发送到后端 → 后端推送 → SW 接收 → 显示通知
```

### 前端实现

```js
// 1. 请求通知权限
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('浏览器不支持通知')
    return false
  }

  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

// 2. 订阅推送
async function subscribeToPush(registration) {
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      'BKagOnSREuRiV3P-WTCyb13hL0H3OFaTQmYslEj8FP78w1dSQTmDN4RHGx8SNMfD2a2WPfW7m-OfYiYsXLMiRuk='
    ),
  })

  // 将 subscription 发送到后端
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  })

  return subscription
}

// 3. 监听推送消息
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data.type === 'PUSH_MESSAGE') {
    const { title, body, icon, data } = event.data.payload
    self.registration.showNotification(title, {
      body,
      icon: icon || '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data,  // 点击通知时打开的 URL
      actions: [
        { action: 'open', title: '打开' },
        { action: 'dismiss', title: '忽略' },
      ],
    })
  }
})

// 4. 监听通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'open') {
    // 打开对应页面
    const url = event.notification.data
    event.waitUntil(clients.openWindow(url))
  }
})

// 辅助函数
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
```

### 后端推送示例（Node.js + Web Push）

```js
const webpush = require('web-push')

// 设置 VAPID 密钥对
webpush.setVapidDetails(
  'mailto:admin@example.com',
  'public-key-here',
  'private-key-here'
)

// 发送推送
webpush.sendNotification(subscription, JSON.stringify({
  title: '新消息',
  body: '你有一条新的推送消息',
  icon: '/icons/icon-192.png',
  badge: '/icons/badge-72.png',
  data: { url: '/messages/123' },
}))
```

### 静默推送（数据推送）

```js
// 不显示通知，只唤醒 SW 执行后台任务
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}

  if (data.silent) {
    // 静默推送：更新 IndexedDB，不显示通知
    event.waitUntil(updateDatabase(data.payload))
  } else {
    // 普通推送：显示通知
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon,
        data: data.url,
      })
    )
  }
})
```

---

## 6. 后台同步

> ⚠️ **浏览器兼容性**：Background Sync API 目前仅 Chromium 内核浏览器（Chrome、Edge）支持，Firefox 和 Safari 均不支持。生产使用时需做能力检测。

### 基本用法

```js
// 注册后台同步
async function registerBackgroundSync() {
  const registration = await navigator.serviceWorker.ready

  if ('sync' in registration) {
    await registration.sync.register('sync-messages')
  }
}

// 监听同步事件
self.addEventListener('sync', (event) => {
  switch (event.tag) {
    case 'sync-messages':
      event.waitUntil(syncMessages())
      break
    case 'sync-data':
      event.waitUntil(syncData())
      break
  }
})

// 同步消息队列
async function syncMessages() {
  const db = await openMessageDB()
  const pendingMessages = await db.getAll('pending')

  for (const msg of pendingMessages) {
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      })
      await db.delete(msg.id)
    } catch {
      // 同步失败，稍后重试
      break
    }
  }
}
```

### 定期同步（Periodic Background Sync）

```js
// 注册定期同步
async function registerPeriodicSync() {
  const registration = await navigator.serviceWorker.ready

  if ('periodicSync' in registration) {
    await registration.periodicSync.register('sync-feed', {
      minInterval: 15 * 60 * 1000,  // 最小 15 分钟
      tag: 'sync-feed',
    })
  }
}

// 监听定期同步
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-feed') {
    event.waitUntil(updateFeed())
  }
})

async function updateFeed() {
  const response = await fetch('/api/feed/latest')
  const feed = await response.json()
  const db = await openFeedDB()
  await db.put('feed', feed)
}
```

---

## 7. IndexedDB 存储

### 封装 IndexedDB

```js
class Database {
  constructor(name, version) {
    this.name = name
    this.version = version
    this.db = null
  }

  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, this.version)

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // 创建对象仓库
        if (!db.objectStoreNames.contains('messages')) {
          const store = db.createObjectStore('messages', {
            keyPath: 'id',
            autoIncrement: true,
          })
          store.createIndex('userId', 'userId', { unique: false })
          store.createIndex('status', 'status', { unique: false })
        }

        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' })
        }
      }

      request.onsuccess = (event) => {
        this.db = event.target.result
        resolve(this.db)
      }

      request.onerror = () => reject(request.error)
    })
  }

  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const request = store.put(data)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAll(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const source = indexName
        ? store.index(indexName).getAll(value)
        : store.getAll()
      source.onsuccess = () => resolve(source.result)
      source.onerror = () => reject(source.error)
    })
  }

  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

// 使用
const db = new Database('myapp-db', 1)
await db.open()
await db.put('messages', { userId: 1, status: 'pending', content: 'Hello' })
const messages = await db.getAll('messages', 'status', 'pending')
```

### Cache Storage 与 IndexedDB 对比

```
┌─────────────────┬────────────────────┬────────────────────┐
│                 │   Cache Storage    │   IndexedDB        │
├─────────────────┼────────────────────┼────────────────────┤
│ 存储类型         │ HTTP 响应对象       │ 结构化数据          │
│ 容量            │ ~100MB+            │ ~50MB+（无硬性上限） │
│ 查询方式         │ URL 匹配           │ 索引查询            │
│ 数据结构         │ 扁平键值（URL）     │ 对象仓库 + 索引     │
│ 适用场景         │ 静态资源缓存        │ 业务数据存储         │
│ 离线编辑         │ ❌ 不可变           │ ✅ 可变             │
│ 事务支持         │ ❌                  │ ✅                  │
└─────────────────┴────────────────────┴────────────────────┘

典型组合：
  Cache Storage → 缓存 HTML/CSS/JS/图片/API 响应
  IndexedDB     → 存储用户草稿、离线操作队列、表单数据
```

---

## 8. 安装体验

### 安装提示（Install Prompt）

```js
// 监听 beforeinstallprompt 事件
let deferredPrompt = null

window.addEventListener('beforeinstallprompt', (e) => {
  // 阻止 Chrome 67 之前自动显示安装提示
  e.preventDefault()
  // 保存事件，稍后触发
  deferredPrompt = e
  // 显示自定义安装按钮
  showInstallButton()
})

// 触发安装
async function installApp() {
  if (!deferredPrompt) return

  // 显示安装提示
  deferredPrompt.prompt()
  // 等待用户响应
  const { outcome } = await deferredPrompt.userChoice
  console.log(`用户选择: ${outcome}`)

  // 清除保存的提示
  deferredPrompt = null
  hideInstallButton()
}

// 检测是否已安装
function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

// 监听安装状态变化
window.addEventListener('appinstalled', () => {
  console.log('PWA 已安装')
  hideInstallButton()
})
```

### 自定义安装 UI

```html
<div id="install-banner" class="install-banner" style="display:none;">
  <p>将应用安装到主屏幕以获得更好的体验</p>
  <button id="install-btn">安装</button>
  <button id="dismiss-btn">暂不</button>
</div>

<script>
const banner = document.getElementById('install-banner')
const installBtn = document.getElementById('install-btn')
const dismissBtn = document.getElementById('dismiss-btn')

// 显示安装提示
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  banner.style.display = 'block'
})

// 安装按钮点击
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  console.log(`安装结果: ${outcome}`)
  deferredPrompt = null
  banner.style.display = 'none'
})

// 关闭按钮
dismissBtn.addEventListener('click', () => {
  banner.style.display = 'none'
  localStorage.setItem('install-dismissed', Date.now().toString())
})
</script>
```

### PWA Builder 工具

```bash
# 使用 PWA Builder 自动生成 manifest 和图标
npx @pwabuilder/pwaify ./index.html --output ./public

# 或使用在线工具
# https://www.pwabuilder.com/
```

---

## 9. 应用壳（App Shell）架构

```
App Shell 架构：

┌─────────────────────────────────────────┐
│  App Shell（缓存，几乎不变）              │
│  ├── index.html                         │
│  ├── app.js                             │
│  ├── styles.css                         │
│  └── icons/                             │
├─────────────────────────────────────────┤
│  动态内容（按需缓存）                     │
│  ├── API 响应 (Cache Storage)           │
│  └── 用户数据 (IndexedDB)               │
└─────────────────────────────────────────┘

安装时：缓存 App Shell
首次打开：从缓存加载 App Shell → 极快
后续请求：动态内容按需缓存
```

```js
// sw.js — App Shell 策略
const APP_SHELL = ['/', '/index.html', '/app.js', '/styles.css']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('app-shell').then((cache) => cache.addAll(APP_SHELL))
  )
})

self.addEventListener('fetch', (event) => {
  // App Shell 资源：Cache First
  if (APP_SHELL.includes(new URL(event.request.url).pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request)
      )
    )
    return
  }

  // 其他资源：Network First，失败回退到缓存
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  )
})
```

---

## 10. 离线优先（Offline-First）数据层

```js
// 离线优先的数据获取策略
class OfflineFirstFetcher {
  constructor(db, apiUrl) {
    this.db = db
    this.apiUrl = apiUrl
  }

  // 1. 先尝试网络
  async fetchOnline(key) {
    try {
      const response = await fetch(`${this.apiUrl}/${key}`)
      if (response.ok) {
        const data = await response.json()
        // 2. 同时存入 IndexedDB
        await this.db.put('cache', { key, data, timestamp: Date.now() })
        return data
      }
    } catch {
      // 3. 网络失败，从 IndexedDB 读取
      const cached = await this.db.get('cache', key)
      if (cached) {
        return cached.data
      }
      throw new Error('离线且无缓存数据')
    }
  }

  // 4. 监听网络恢复，自动同步
  async syncOnOnline() {
    return new Promise((resolve) => {
      window.addEventListener('online', async () => {
        const pending = await this.db.getAll('pending', 'status', 'pending')
        for (const item of pending) {
          try {
            await fetch(this.apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.data),
            })
            await this.db.delete('pending', item.id)
          } catch (e) {
            console.error('同步失败:', e)
          }
        }
        resolve()
      }, { once: true })
    })
  }
}
```

---

## 11. 更新与版本管理

### SW 自动更新流程

```js
// 主应用 JS
async function checkForUpdates() {
  if (!navigator.serviceWorker.controller) {
    // 没有活跃的 SW，跳过
    return
  }

  const registration = await navigator.serviceWorker.register('/sw.js')

  // 监听 SW 更新
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing
    newWorker.addEventListener('statechange', () => {
      switch (newWorker.state) {
        case 'installed':
          // 新 SW 已安装，等待接管
          if (navigator.serviceWorker.controller) {
            showUpdateBanner()  // 通知用户有新版本
          }
          break
        case 'activated':
          hideUpdateBanner()
          break
      }
    })
  })
}

function showUpdateBanner() {
  // 显示更新提示
  document.getElementById('update-banner').style.display = 'block'
}

// 用户点击更新
document.getElementById('update-btn').addEventListener('click', () => {
  // 通知等待中的 SW 激活
  navigator.serviceWorker.ready.then((registration) => {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  })
})
```

### SW 中处理更新消息

```js
// sw.js
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
```

---

## 12. 性能优化

### Lighthouse PWA 审计项

```
✅ 满足 PWA 要求的必要条件
✅ 配置了颜色主题的 address bar
✅ 内容大小在 50KB 以内
✅ 配置了离线响应
✅ 包含有效的 web app manifest
✅ 设置了一个 oninstall 处理器
✅ 设置了一个 onactivate 处理器
✅ 包含一个 fetch 处理器来拦截跨域请求
✅ 所有导航都服务自 Service Worker
✅ Service Worker 长度超过 1000 字节

⚡ 性能优化建议：
- 首屏资源 ≤ 105KB
- LCP（最大内容绘制）≤ 2.5s
- FID（首次输入延迟）≤ 100ms
- CLS（累积布局偏移）≤ 0.1
- 使用 preload/prefetch 预加载关键资源
```

### 资源预加载

```html
<head>
  <!-- 预加载关键资源 -->
  <link rel="preload" href="/fonts/main.woff2" as="font" crossorigin>
  <link rel="prefetch" href="/api/user" as="fetch">
  <link rel="preconnect" href="https://cdn.example.com">

  <!-- DNS 预解析 -->
  <link rel="dns-prefetch" href="https://api.example.com">
</head>
```

```js
// SW 中预缓存
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles/main.css',
        '/scripts/app.js',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
      ])
    })
  )
})
```

---

## 13. 测试与调试

### Lighthouse

```bash
# 命令行运行 Lighthouse PWA 审计
npx lighthouse https://example.com --preset=pwa --output=json --output-path=./lighthouse-report.json

# 查看 PWA 评分
# 需要满足：
# - 正确的 manifest.json
# - Service Worker 注册成功
# - HTTPS
# - 可安装
# - 离线可用
```

### Chrome DevTools

```
Application 面板中的 PWA 工具：

1. Manifest — 查看和编辑 manifest.json 内容
2. Service Workers — 查看 SW 状态、强制更新、注销
3. Cache Storage — 查看和管理缓存
4. IndexedDB — 查看和管理数据库
5. Push Messaging — 模拟推送通知
6. Background Sync — 模拟后台同步
7. Offliner — 模拟离线/弱网环境

快捷键：
  Cmd+Shift+P → 输入 "Offline" 切换离线模式
  Cmd+Shift+P → 输入 "Throttling" 设置网络限速
```

---

## 14. 框架集成

### React + PWA（Create React App / Vite）

```js
// CRA 自带 PWA 支持
// src/service-worker.js
// src/service-worker-registration.js

// Vite + PWA 插件
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: '我的 PWA 应用',
        short_name: 'MyApp',
        description: '一个离线可用的 PWA 应用',
        theme_color: '#4A90D9',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.example\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cache: { name: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 } },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cache: { name: 'images-cache', expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 } },
            },
          },
        ],
      },
    }),
  ],
}
```

### Vue + PWA（Vite）

```js
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'prompt',  // 显示安装提示
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'Vue PWA App',
        short_name: 'VuePWA',
        theme_color: '#42b883',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
}
```

---

## 15. PWA 检查清单

```
安装前检查：
□ manifest.json 存在且有效（name, short_name, icons, start_url, display）
□ 至少 192x192 和 512x512 图标
□ 通过 HTTPS 提供服务（localhost 除外）
□ HTML 中引入 <link rel="manifest" href="/manifest.json">
□ Service Worker 注册成功

功能检查：
□ Service Worker 有 install 事件处理
□ Service Worker 有 activate 事件处理
□ Service Worker 有 fetch 事件处理
□ 离线时有 fallback 页面或响应
□ 推送通知权限请求合理（用户授权后再请求）
□ 后台同步已注册

性能检查：
□ 首屏资源 ≤ 105KB
□ 字体已预加载
□ 图片已优化（WebP/AVIF）
□ Lighthouse PWA 评分 ≥ 90

兼容性检查：
□ Chrome / Edge / Firefox / Safari 均测试
□ iOS Safari 的 PWA 支持有限（需额外 meta 标签）
□ 弱网环境下测试
□ 离线后重新上线测试数据同步
```

---

## 参考

- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [MDN - Best practices for PWAs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Best_practices)
- [Google - PWA Checklist](https://web.dev/pwa-checklist)
- [PWA.dev](https://pwa.dev/)
- [vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa)
- [web-push library (Node.js)](https://github.com/web-push-libs/web-push)
