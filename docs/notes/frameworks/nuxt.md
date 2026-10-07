# Nuxt

> 基于 Nuxt 4.x（2026-10 时点）。Nuxt 是 Vue 的全栈框架，在纯 SPA 和独立 BFF 之间提供了「一体化」选项。

## 定位：解决什么问题

纯 Vue SPA 的痛点：

+ SEO 不友好（首屏空 HTML）
+ 首屏白屏（等 JS 下载执行完才渲染）
+ 数据获取逻辑分散（组件里 `onMounted` + `fetch`）
+ 服务端和客户端代码混在一起，容易踩坑

Nuxt 在 Vue 之上加了**服务端渲染（SSR）**和**文件路由**，同时保留 Vue 的开发体验。

## 渲染模式

Nuxt 支持多种渲染模式，可以在 `nuxt.config.ts` 中配置：

```ts
export default defineNuxtConfig({
  routeRules: {
    // SSR：每次请求服务端渲染（默认）
    '/': { ssr: true },
    // SSG：构建时生成静态 HTML
    '/blog/**': { prerender: true },
    // ISR：静态生成 + 定时重新生成
    '/products/**': { isr: 3600 },
    // SPA：纯客户端渲染
    '/admin/**': { ssr: false },
    // 混合：首页 SSR，其余 SPA
  },
})
```

| 模式 | 首屏 | SEO | 适用场景 |
|------|------|-----|----------|
| **SSR** | 服务端渲染 HTML | ✅ | 动态内容、SEO 敏感 |
| **SSG** | 构建时生成静态 HTML | ✅ | 博客、文档、营销页 |
| **ISR** | 静态 + 定时重生成 | ✅ | 商品列表、新闻 |
| **SPA** | 客户端渲染 | ❌ | 后台、工具、登录后页面 |

### 混合渲染

Nuxt 4 支持**按路由混合渲染**——同一个应用里，首页 SSR、后台 SPA、博客 SSG：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { ssr: true },           // 首页 SSR
    '/blog/**': { prerender: true }, // 博客 SSG
    '/admin/**': { ssr: false },  // 后台 SPA
  },
})
```

## 数据获取：useAsyncData / useFetch

Nuxt 的核心优势之一：**数据获取在服务端执行，结果随 HTML 一起返回**。

### useFetch

```vue
<script setup>
// 服务端执行，结果序列化到 HTML，客户端直接复用
const { data, pending, error, refresh } = await useFetch('/api/products')

// 带参数
const { data: product } = await useFetch(`/api/products/${id}`)
</script>

<template>
  <div v-if="pending">加载中...</div>
  <div v-else-if="error">错误: {{ error.message }}</div>
  <div v-else>
    <div v-for="p in data" :key="p.id">{{ p.name }}</div>
  </div>
</template>
```

### useAsyncData

更灵活，可以自定义请求逻辑：

```vue
<script setup>
const { data, pending, error, refresh } = await useAsyncData(
  'products', // key：相同 key 自动去重
  () => $fetch('/api/products'),
  {
    lazy: false,        // false = 阻塞路由切换；true = 不阻塞
    server: true,       // true = 服务端执行；false = 仅客户端
    transform: (data) => data.filter(p => p.active),
    watch: [page],      // 依赖变化时重新请求
  }
)
</script>
```

### 关键行为

| 行为 | 说明 |
|------|------|
| **服务端执行** | `useFetch` / `useAsyncData` 默认在服务端执行，结果随 HTML 返回 |
| **自动去重** | 相同 `key` 的请求自动共享，多个组件用同一 key 只发一次请求 |
| **客户端复用** | 客户端导航时，如果 key 相同且未过期，直接复用服务端数据 |
| **lazy 模式** | `lazy: true` 不阻塞路由切换，适合非首屏数据 |
| **transform** | 在服务端转换数据，减少传输体积 |

### 服务端 API 路由

Nuxt 内置 Nitro 服务端，可以直接写 API：

```ts
// server/api/products.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const products = await db.product.findMany({
    where: { active: true },
    take: Number(query.limit) || 20,
  })
  return products
})
```

```vue
<script setup>
// 前端直接调用，Nuxt 自动处理序列化和类型
const { data } = await useFetch('/api/products?limit=10')
</script>
```

## 路由

### 文件路由

Nuxt 基于 `app/pages/` 目录自动生成路由：

```
app/pages/
├── index.vue              → /
├── about.vue              → /about
├── products/
│   ├── index.vue          → /products
│   └── [id].vue           → /products/:id
└── admin/
    ├── index.vue          → /admin
    └── settings.vue       → /admin/settings
```

### 路由中间件

```ts
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated() && to.path !== '/login') {
    return navigateTo('/login')
  }
})
```

```vue
<!-- 页面级中间件 -->
<script setup>
definePageMeta({
  middleware: ['auth'],
  layout: 'admin',
})
</script>
```

### 动态路由与嵌套路由

```
app/pages/
├── users/
│   ├── [id].vue           → /users/:id
│   └── [id]/
│       └── posts.vue      → /users/:id/posts
```

```vue
<!-- app/pages/users/[id].vue -->
<script setup>
const route = useRoute()
const userId = route.params.id
</script>
```

## 服务端 vs 客户端

### 代码环境

Nuxt 代码可能在服务端或客户端执行，需要明确区分：

```vue
<script setup>
// ✅ 两端都执行
const count = ref(0)

// ✅ 仅客户端执行
onMounted(() => {
  window.addEventListener('resize', handleResize)
})

// ✅ 仅服务端执行
if (import.meta.server) {
  console.log('这段只在服务端执行')
}

// ✅ 仅客户端执行
if (import.meta.client) {
  console.log('这段只在客户端执行')
}
</script>
```

### 状态管理

```ts
// composables/useCart.ts
export const useCart = () => {
  // useState 在服务端和客户端之间共享（通过序列化）
  const items = useState<CartItem[]>('cart', () => [])
  
  const addItem = (item: CartItem) => {
    items.value.push(item)
  }
  
  return { items, addItem }
}
```

```vue
<script setup>
// 服务端和客户端都能访问，状态自动同步
const { items, addItem } = useCart()
</script>
```

### 环境变量

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // 服务端私有（不会暴露给客户端）
    apiSecret: process.env.API_SECRET,
    // 客户端可访问
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
    },
  },
})
```

```vue
<script setup>
const config = useRuntimeConfig()
// 服务端：config.apiSecret 可用
// 客户端：config.apiSecret 为 undefined，只有 config.public 可用
</script>
```

## 和纯 SPA / Nest BFF 的边界

### 什么时候用 Nuxt

| 场景 | 推荐 | 理由 |
|------|------|------|
| 官网、博客、营销页 | **Nuxt SSG** | 构建时生成静态 HTML，SEO 最好 |
| 电商、内容平台 | **Nuxt SSR/ISR** | 动态内容 + SEO + 首屏性能 |
| 管理后台 | **Nuxt SPA** 或 **纯 SPA** | 不需要 SEO，交互复杂 |
| 已有 NestJS BFF | **Nuxt SPA** | 后端已有独立服务，前端只需 SPA |
| 全栈小项目 | **Nuxt 全栈** | 一个仓库搞定前后端，部署简单 |

### Nuxt vs 纯 SPA + BFF

| 维度 | Nuxt 全栈 | 纯 SPA + Nest BFF |
|------|-----------|-------------------|
| 部署 | 一个服务 | 两个服务（前端 + BFF） |
| 首屏 | SSR/SSG，首屏快 | SPA，首屏白屏 |
| SEO | ✅ 内置 | ❌ 需要额外处理 |
| 开发效率 | 一个仓库，类型共享 | 两个仓库，需要维护 API 契约 |
| 扩展性 | 前后端耦合 | 前后端独立扩展 |
| 适用 | 中小项目、内容站 | 大型项目、多端复用 API |

### 实际建议

```
内容站/营销页    → Nuxt SSG（或 SSG + SPA 混合）
电商/平台        → Nuxt SSR/ISR + 独立 BFF（如果团队大）
管理后台        → Nuxt SPA 或纯 SPA
已有 NestJS BFF → Nuxt SPA（只做客户端渲染）
全栈小项目      → Nuxt 全栈（server/api + 前端）
```

## Nuxt 4 新特性

+ **app/ 目录结构** — 应用代码统一放 `app/`，更清晰
+ **useAsyncData 改进** — 相同 key 自动共享、自动清理、响应式 key
+ **Nitro 服务端** — 更轻量的服务端运行时，支持 server-agnostic
+ **TypeScript 增强** — 分离的 tsconfig，更好的类型推断
+ **Vue Vapor 支持** — 实验性支持 Vue Vapor 模式

## 参考

+ [Nuxt 官方文档](https://nuxt.com/docs)
+ [Nuxt 4 发布公告](https://nuxt.com/blog/v4)
+ 本站：[Vue 3](/notes/frameworks/vue3) · [SSR / SSG](/notes/engineering/ssr-ssg) · [NestJS](/notes/backend/nestjs)
