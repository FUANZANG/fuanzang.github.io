# SSR / SSG 笔记

> 📌 本文件记录服务端渲染（SSR）、静态生成（SSG）、增量静态再生（ISR）的核心原理、框架实践与性能优化。

---

## 1. 渲染模式概览

### CSR（Client-Side Rendering）

```
浏览器请求 HTML → 返回空壳 HTML + JS bundle → 浏览器执行 JS → 请求 API 获取数据 → 渲染页面
```

- 典型：SPA（Vue CLI / Create React App 创建的项目）
- 首屏慢：需下载、解析、执行全部 JS 后才能看到内容
- SEO 差：搜索引擎爬虫看到的是空 HTML
- 优点：交互体验好、服务器压力小、部署简单

### SSR（Server-Side Rendering）

```
浏览器请求 HTML → 服务端执行 JS 生成完整 HTML → 返回给浏览器 → 浏览器立即显示内容 → JS 加载后水合（Hydration）激活交互
```

- 典型：Next.js / Nuxt.js
- 首屏快：HTML 到达时已包含完整内容
- SEO 好：爬虫能直接抓取完整 HTML
- 缺点：服务器负载高、每次请求都要服务端渲染

### SSG（Static Site Generation）

```
构建时执行 JS → 生成静态 HTML 文件 → 部署到 CDN → 用户请求直接返回静态文件
```

- 典型：VitePress / Astro / Hugo / Gatsby
- 最快：CDN 直接返回静态文件，零服务端计算
- SEO 好：完整 HTML
- 缺点：内容更新需重新构建（或配合 ISR）

### ISR（Incremental Static Regeneration）

```
首次请求 → 返回缓存的静态页面
缓存过期 → 后台重新生成静态页面 → 下次请求返回新页面
```

- 典型：Next.js `revalidate`
- 兼顾 SSG 的速度和 SSR 的实时性
- 用户始终看到静态页面的速度，内容在后台渐进更新

### SPA vs SSR vs SSG 对比

| | CSR (SPA) | SSR | SSG |
|---|-----------|-----|-----|
| **首屏速度** | 慢（等 JS 执行） | 快（HTML 直达） | 最快（CDN 静态） |
| **SEO** | 差（空 HTML） | 好 | 好 |
| **服务器压力** | 低 | 高（每请求都渲染） | 最低（静态文件） |
| **内容实时性** | 好（客户端请求） | 最好（每次最新） | 差（构建时固定） |
| **交互体验** | 好 | 好（水合后等同 SPA） | 好 |
| **部署复杂度** | 低 | 高（需 Node 服务器） | 低（静态托管） |
| **适用场景** | 后台管理、工具类 | 电商、社交、内容平台 | 文档、博客、官网 |

---

## 2. SSR 核心原理

### 同构渲染（Universal / Isomorphic Rendering）

同一份 JavaScript 代码同时在服务端和客户端运行：

```
服务端：Vue/React 组件 → renderToString() → HTML 字符串 → 发送给浏览器
客户端：Vue/React 组件 → 水合（Hydration）→ 绑定事件 → 变成可交互的页面
```

```javascript
// 服务端（Node.js）
import { renderToString } from 'vue/server-renderer'
import { createSSRApp } from 'vue'
import App from './App.vue'

const app = createSSRApp(App)
const html = await renderToString(app)
// 返回完整 HTML 给浏览器
res.send(`
  <!DOCTYPE html>
  <html>
    <head><title>SSR App</title></head>
    <body>
      <div id="app">${html}</div>
      <script src="/client.js"></script>
    </body>
  </html>
`)
```

```javascript
// 客户端（浏览器）
import { createSSRApp } from 'vue'
import App from './App.vue'

const app = createSSRApp(App)
// 水合：不重新创建 DOM，而是将已有的 HTML 与组件实例关联
// 并绑定事件监听器，使页面变得可交互
app.mount('#app')
```

### 水合（Hydration）

```
服务端返回的 HTML 是「静态的」— 有内容但无事件绑定
水合过程：
1. 客户端 JS 加载完成
2. 重新执行组件逻辑（setup / render）
3. 将虚拟 DOM 与已有 HTML 对比（patch）
4. 绑定事件监听器（@click、@input 等）
5. 激活响应式系统
→ 页面从「静态展示」变成「可交互应用」
```

```
时间线：
HTML 到达 ──── JS 下载中 ──── JS 执行 ──── 水合完成
   │                │              │            │
   ▼                ▼              ▼            ▼
 可见内容         可看不可点      正在激活      完全交互
 (FCP)          (TTI 进行中)                 (TTI)
```

### 水合的问题

```
1. 水合耗时（Time to Interactive）
   - JS 必须下载 + 解析 + 执行完毕后才能交互
   - 大型应用水合可能需要数秒

2. 水合不匹配（Hydration Mismatch）
   - 服务端和客户端渲染结果不一致
   - 常见原因：
     - 使用了 Date.now() / Math.random() 等每次不同的值
     - 浏览器特有 API（window/document）在服务端不存在
     - 条件渲染依赖客户端状态（如 localStorage）
   - 后果：Vue/React 会放弃已有 DOM，重新创建（性能退化等同 CSR）

3. 避免水合不匹配
   - 使用 onMounted 钩子中访问浏览器 API
   - 用 <ClientOnly> 包裹纯客户端组件
   - 避免在 setup 中使用时间/随机数
```

```vue
<!-- Vue: 避免水合不匹配 -->
<script setup>
import { ref, onMounted } from 'vue'

// ❌ 水合不匹配：服务端和客户端值不同
const time = ref(Date.now())
const isMobile = ref(window.innerWidth < 768)

// ✅ 在 onMounted 中获取客户端值
const time = ref(null)
const isMobile = ref(false)
onMounted(() => {
  time.value = Date.now()
  isMobile.value = window.innerWidth < 768
})
</script>

<template>
  <!-- ✅ ClientOnly: 仅在客户端渲染 -->
  <ClientOnly>
    <MapComponent />
    <template #fallback>
      <p>加载地图中...</p>
    </template>
  </ClientOnly>
</template>
```

---

## 3. 流式 SSR（Streaming SSR）

### 传统 SSR 的问题

```
传统 SSR：
  服务端渲染整个页面 → 一次性返回 HTML
  问题：如果某个组件数据获取慢（如第三方 API），整个页面都被阻塞

时间线：
  请求 ─── 获取所有数据 ─── 渲染整个页面 ─── 返回 HTML
  │                                              │
  用户等待 ..................................... 看到内容
```

### 流式 SSR 原理

```
流式 SSR：
  服务端先返回页面骨架（header + 已就绪的内容）
  慢组件通过 <Suspense> 异步加载，就绪后通过同一连接推送

时间线：
  请求 ─ 骨架 HTML ─→ 用户立即看到大部分内容
              │
              ├─ 组件 A 就绪 ─→ 推送组件 A 的 HTML
              │
              └─ 组件 B 慢 ───→ ... ─→ 推送组件 B 的 HTML
```

### Vue 流式 SSR

```javascript
// 服务端
import { renderToStream } from 'vue/server-renderer'
import { createSSRApp } from 'vue'
import App from './App.vue'

const app = createSSRApp(App)
const stream = renderToStream(app)
stream.pipe(res)  // 流式写入 HTTP 响应
```

```vue
<!-- App.vue — 配合 Suspense 实现流式 -->
<template>
  <Header />
  <Suspense>
    <template #default>
      <SlowComponent />  <!-- 异步组件，数据就绪后流式推送 -->
    </template>
    <template #fallback>
      <LoadingSkeleton />  <!-- 占位内容，先返回给浏览器 -->
    </template>
  </Suspense>
  <Footer />
</template>
```

### React 流式 SSR

```jsx
// React 18+ — renderToPipeableStream
import { renderToPipeableStream } from 'react-dom/server'

app.get('*', (req, res) => {
  const { pipe } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/main.js'],
    onShellReady() {
      // Shell（骨架）就绪，立即开始发送
      res.setHeader('Content-Type', 'text/html')
      pipe(res)
    },
    onShellError() {
      res.statusCode = 500
      res.send('<!DOCTYPE html><p>加载失败</p>')
    },
  })
})
```

```jsx
// React Server Components（RSC）— Next.js App Router
// 组件默认是 Server Component，在服务端执行，不发送 JS 到客户端
async function ProductPage({ id }) {
  // 直接在组件中访问数据库/API（仅服务端执行）
  const product = await db.product.findUnique({ where: { id } })
  const reviews = await fetch(`/api/reviews/${id}`).then(r => r.json())

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      {/* 交互组件标记为 Client Component */}
      <AddToCartButton productId={id} />
      <ReviewList reviews={reviews} />
    </div>
  )
}

// 需要交互的组件用 'use client' 指令
'use client'
function AddToCartButton({ productId }) {
  const [loading, setLoading] = useState(false)
  return (
    <button onClick={() => { setLoading(true); addToCart(productId) }}>
      {loading ? '添加中...' : '加入购物车'}
    </button>
  )
}
```

---

## 4. 框架里怎么落地

渲染模式和取数差异：

+ React 侧见 [Next.js](/notes/frameworks/nextjs)：App Router、服务端组件、缓存边界。
+ Vue 侧见 [Nuxt](/notes/frameworks/nuxt)：`useAsyncData` / `useFetch`、路由规则。

本篇不再重复这两套框架的目录结构和 API。选型见文末。

---

## 5. SSR 性能优化

### 数据预取策略

```
优化前：
  服务端渲染 HTML → 客户端水合 → 客户端请求数据 → 显示内容
  问题：SSR 的 HTML 中没有数据，水合后才请求，首屏闪烁

优化后：
  服务端获取数据 → 渲染完整 HTML（含数据）→ 序列化数据到 window.__NUXT__
  → 客户端水合时直接使用已有数据，无需重复请求
```

```javascript
// Nuxt: useAsyncData 自动处理数据序列化
const { data } = await useAsyncData('posts', () => $fetch('/api/posts'))
// 服务端：数据获取后渲染，序列化到 HTML 中的 <script> 标签
// 客户端：水合时从 window.__NUXT__ 读取，不重复请求

// Next.js: Server Component 直接在服务端获取
async function Page() {
  const data = await fetch('...')
  return <Component data={data} />
}
```

### 组件懒加载与代码分割

```javascript
// 路由级懒加载（框架自动处理）
// Nuxt: pages/ 目录自动按路由分割
// Next.js: app/ 目录自动按路由分割

// 组件级懒加载
import { defineAsyncComponent } from 'vue'

const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'))

// Next.js
import dynamic from 'next/dynamic'
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  ssr: false,       // 不在服务端渲染（纯客户端组件）
  loading: () => <p>加载中...</p>,
})
```

### 缓存策略

```
1. 页面级缓存
   - HTTP Cache-Control: max-age=60, s-maxage=3600
   - CDN 缓存静态页面
   - 服务端渲染结果缓存（LRU Cache）

2. 数据级缓存
   - 服务端数据缓存（Redis / 内存缓存）
   - 避免每次 SSR 都查数据库

3. 组件级缓存
   - Vue: <KeepAlive> 缓存组件实例
   - Nuxt: <NuxtPage :keepalive="true" />
```

```javascript
// Next.js — 路由级缓存
// app/layout.tsx
export const revalidate = 3600  // 布局每小时重新验证

// app/page.tsx
export const dynamic = 'force-static'  // 强制静态生成
export const revalidate = 86400         // 每天重新验证

// 服务端缓存
import { cache } from 'react'

const getUser = cache(async (id: string) => {
  // 同一请求中多次调用只执行一次
  return db.user.findUnique({ where: { id } })
})
```

### 减少 JavaScript 体积

```
1. Tree Shaking — 确保使用 ESM 的依赖
2. 按需引入 — 组件库只导入用到的部分
3. 动态导入 — 非首屏组件懒加载
4. 分析包体积 — @next/bundle-analyzer / nuxt analyze
```

```javascript
// Next.js — Bundle Analyzer
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer({ /* config */ })

// Nuxt — 内置分析
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    analyze: true,
  },
})
```

---

## 6. SEO 优化

### Meta 标签

```vue
<!-- Nuxt: useHead / useSeoMeta -->
<script setup>
useSeoMeta({
  title: '页面标题',
  description: '页面描述',
  ogTitle: '社交分享标题',
  ogDescription: '社交分享描述',
  ogImage: 'https://example.com/image.jpg',
  twitterCard: 'summary_large_image',
})

// 更灵活的 useHead
useHead({
  title: '页面标题',
  htmlAttrs: { lang: 'zh-CN' },
  link: [
    { rel: 'canonical', href: 'https://example.com/page' },
  ],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(schema) },
  ],
})
</script>
```

```jsx
// Next.js — Metadata API
export const metadata = {
  title: '页面标题',
  description: '页面描述',
  openGraph: {
    title: '社交分享标题',
    description: '社交分享描述',
    images: ['https://example.com/image.jpg'],
  },
  alternates: {
    canonical: 'https://example.com/page',
  },
}

// 动态 metadata
export async function generateMetadata({ params }) {
  const post = await getPost(params.slug)
  return {
    title: post.title,
    description: post.excerpt,
  }
}
```

### 结构化数据

```vue
<!-- JSON-LD 结构化数据 -->
<script setup>
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: '文章标题',
      author: { '@type': 'Person', name: '作者' },
      datePublished: '2026-06-09',
    }),
  }],
})
</script>
```

### Sitemap 与 Robots

```typescript
// Nuxt: @nuxtjs/sitemap 模块
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/sitemap'],
  site: { url: 'https://example.com' },
})

// Next.js: app/sitemap.ts
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts()
  return [
    { url: 'https://example.com', lastModified: new Date() },
    ...posts.map(post => ({
      url: `https://example.com/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
    })),
  ]
}

// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: 'https://example.com/sitemap.xml',
  }
}
```

---

## 7. SSR 的挑战与解决方案

### 服务端与客户端环境差异

```javascript
// 问题：某些 API 只在浏览器中可用
// window, document, localStorage, navigator 等

// 解决 1：条件判断
if (import.meta.client) {  // Nuxt
  localStorage.setItem('key', 'value')
}
if (typeof window !== 'undefined') {  // 通用
  // 浏览器代码
}

// 解决 2：ClientOnly 组件
<ClientOnly>
  <BrowserOnlyComponent />
</ClientOnly>

// 解决 3：动态导入 + ssr: false
const Map = defineAsyncComponent({
  loader: () => import('./Map.vue'),
  ssr: false,
})
```

### 服务端内存泄漏

```
问题：
  Node.js 进程是长驻的，不像浏览器每次刷新都是新环境
  如果在全局作用域存储数据（如模块级变量），会导致内存泄漏

解决：
  - 每个请求创建独立的组件实例（createSSRApp 而非全局 app）
  - 避免模块级副作用
  - 使用请求级上下文存储数据
```

```javascript
// ❌ 模块级变量 — 所有请求共享，内存泄漏
let cache = {}

// ✅ 请求级上下文
// Nuxt: useRequestEvent() 获取当前请求上下文
// Next.js: 使用 Request-scoped 的 cache
import { cache } from 'react'
const getData = cache(async () => { /* ... */ })
```

### 第三方库兼容性

```
问题：
  某些 npm 包假设运行在浏览器环境（访问 window/document）
  在 Node.js 服务端会报错

解决：
  1. 使用 transpile 配置让框架处理
  2. 动态导入 + ssr: false
  3. 用 process.browser / import.meta.client 条件加载
```

```typescript
// Nuxt: nuxt.config.ts
export default defineNuxtConfig({
  // 需要转译的包（解决 SSR 兼容）
  transpile: ['some-incompatible-lib'],
})
```

### 服务器成本与扩展

```
问题：SSR 每次请求都需要服务端计算，成本高

解决方案：
  1. 缓存 — 渲染结果缓存、数据缓存
  2. CDN 边缘渲染 — Cloudflare Workers / Vercel Edge
  3. 混合渲染 — 大部分页面 SSG，少数动态页面 SSR
  4. 增量静态 — ISR 减少服务端压力
  5. 边缘缓存 — stale-while-revalidate
```

---

## 8. 部署方案

### Vercel（推荐 Next.js）

```bash
# 零配置部署
npx vercel

# 或连接 GitHub 仓库自动部署
# 支持 Preview Deployments（PR 预览）
```

### Netlify

```bash
npx netlify deploy --prod --dir=.output/public
```

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".output/public"

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/server"
  status = 200
```

### Docker 自托管

```dockerfile
# Nuxt 3
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.output .output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

```dockerfile
# Next.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 9. 选型建议

### Next.js vs Nuxt.js

| | Next.js | Nuxt.js |
|---|---------|---------|
| **框架** | React | Vue |
| **路由** | App Router（文件系统） | pages/ 文件系统 |
| **数据获取** | Server Components / fetch | useAsyncData / useFetch |
| **API 路由** | Route Handlers | Server Routes |
| **SSR 模式** | Server / Static / Streaming | SSR / SSG / SPA / ISR |
| **生态** | 更大（React 生态） | 较小但够用（Vue 生态） |
| **部署** | Vercel 优先 | 任意 Node 平台 |
| **学习曲线** | 中高（RSC 概念多） | 中（Vue 开发者友好） |

### 渲染模式选择

```
1. 内容不常变的页面（文档、博客、官网）
   → SSG（最快、最便宜）

2. 内容需要实时更新（新闻、社交、电商）
   → SSR 或 ISR

3. 不需要 SEO 的页面（后台管理、Dashboard）
   → CSR（SPA 模式）

4. 混合方案（推荐）
   → 首页 SSG + 文章页 ISR + 后台 CSR
   → Nuxt: routeRules 按路由配置
   → Next.js: 每个页面独立配置
```

---

## 相关笔记

+ [Nuxt](/notes/frameworks/nuxt) — Vue 全栈框架，SSR/SSG/ISR 实践
+ [Next.js](/notes/frameworks/nextjs) — React 全栈框架，App Router 与 Server Components

## 参考资源

- [Next.js 官方文档](https://nextjs.org/docs)
- [Nuxt 3 官方文档](https://nuxt.com/docs)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [Vue SSR 指南](https://vuejs.org/guide/scaling-up/ssr.html)
- [Patterns.dev — Rendering Patterns](https://www.patterns.dev/)
- [Web.dev — SSR](https://web.dev/rendering-on-the-web/)
