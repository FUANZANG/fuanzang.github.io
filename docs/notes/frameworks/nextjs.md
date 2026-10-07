# Next.js

> 基于 Next.js 16.x（2026-10 时点）。Next.js 是 React 的全栈框架，和 Nuxt 对 Vue 的定位对称。

## 定位：解决什么问题

纯 React SPA 的痛点：

+ SEO 不友好（首屏空 HTML）
+ 首屏白屏（等 JS 下载执行完才渲染）
+ 数据获取逻辑分散（组件里 `useEffect` + `fetch`）
+ 服务端和客户端代码混在一起，容易踩坑

Next.js 在 React 之上加了**服务端渲染（SSR）**和**文件路由**，同时保留 React 的开发体验。

## 渲染模式

Next.js 16 支持多种渲染模式，可以在路由段配置中指定：

```ts
// app/page.tsx
export const dynamic = 'force-dynamic'  // 每次请求渲染（SSR）
export const revalidate = 3600          // ISR：每小时重新生成
// 不配置 = 构建时静态生成（SSG）
```

| 模式 | 首屏 | SEO | 适用场景 |
|------|------|-----|----------|
| **SSR** | 服务端渲染 HTML | ✅ | 动态内容、SEO 敏感 |
| **SSG** | 构建时生成静态 HTML | ✅ | 博客、文档、营销页 |
| **ISR** | 静态 + 定时重生成 | ✅ | 商品列表、新闻 |
| **SPA** | 客户端渲染 | ❌ | 后台、工具、登录后页面 |

### 混合渲染

Next.js 支持**按路由混合渲染**——同一个应用里，首页 SSR、后台 SPA、博客 SSG：

```
app/
├── page.tsx              → / (SSG)
├── blog/
│   └── [slug]/
│       └── page.tsx      → /blog/:slug (ISR)
├── admin/
│   └── page.tsx          → /admin (Client Component, 'use client')
└── api/
    └── route.ts          → /api/* (API 路由)
```

## 数据获取

### Server Components（默认）

Next.js App Router 中，组件默认是 **Server Component**，在服务端执行：

```tsx
// app/products/page.tsx — Server Component（默认）
export default async function ProductsPage() {
  // 直接在服务端 fetch，不需要 useEffect
  const products = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600 }, // ISR 缓存
  }).then(r => r.json())

  return (
    <div>
      {products.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
```

### Client Components

需要交互（useState、useEffect、事件处理）时，加 `'use client'`：

```tsx
'use client'

import { useState } from 'react'

export function SearchBar() {
  const [query, setQuery] = useState('')
  return <input value={query} onChange={e => setQuery(e.target.value)} />
}
```

### 数据获取方式对比

| 方式 | 环境 | 适用 |
|------|------|------|
| **直接 `fetch`** | Server Component | 服务端数据获取，支持缓存 |
| **Route Handler** | 服务端 | API 路由，替代独立 BFF |
| **Server Actions** | 服务端 | 表单提交、数据变更 |
| **useEffect + fetch** | Client Component | 客户端交互后获取 |

### Server Actions

```tsx
// app/actions.ts
'use server'

export async function createProduct(formData: FormData) {
  const name = formData.get('name')
  await db.product.create({ data: { name } })
  revalidatePath('/products')
}
```

```tsx
// app/products/new/page.tsx
import { createProduct } from './actions'

export default function NewProduct() {
  return (
    <form action={createProduct}>
      <input name="name" />
      <button type="submit">创建</button>
    </form>
  )
}
```

## 路由

### 文件路由（App Router）

Next.js 16 默认使用 App Router，基于 `app/` 目录：

```
app/
├── layout.tsx             → 根布局
├── page.tsx               → /
├── loading.tsx            → 加载 UI
├── error.tsx              → 错误边界
├── not-found.tsx          → 404
├── about/
│   └── page.tsx           → /about
├── products/
│   ├── page.tsx           → /products
│   └── [id]/
│       └── page.tsx       → /products/:id
└── api/
    └── route.ts           → /api/*
```

### 动态路由与嵌套路由

```tsx
// app/products/[id]/page.tsx
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>  // Next.js 16：params 是 Promise
}) {
  const { id } = await params
  const product = await getProduct(id)
  return <div>{product.name}</div>
}
```

### 路由处理器（API 路由）

```ts
// app/api/products/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit')) || 20
  const products = await db.product.findMany({ take: limit })
  return NextResponse.json(products)
}

export async function POST(request: Request) {
  const body = await request.json()
  const product = await db.product.create({ data: body })
  return NextResponse.json(product, { status: 201 })
}
```

### 中间件（Proxy）

Next.js 16 中 `middleware.ts` 更名为 `proxy.ts`：

```ts
// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const isAuthenticated = request.cookies.get('token')
  if (!isAuthenticated && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

## 服务端 vs 客户端

### 组件环境

| 指令 | 环境 | 特点 |
|------|------|------|
| 无（默认） | Server Component | 服务端执行，不能交互 |
| `'use client'` | Client Component | 客户端执行，可交互 |
| `'use server'` | Server Action | 服务端执行，表单/数据变更 |

### 缓存策略

Next.js 16 引入了 **Cache Components**（PPR + `use cache`）：

```tsx
// app/page.tsx
import { cache } from 'react'

const getProducts = cache(async () => {
  return db.product.findMany()
})

export default async function Page() {
  const products = await getProducts()
  return <ProductList products={products} />
}
```

| 缓存级别 | 配置 | 说明 |
|----------|------|------|
| **请求级** | `next: { revalidate: 3600 }` | fetch 缓存 |
| **路由级** | `export const revalidate = 3600` | 页面 ISR |
| **组件级** | `use cache` | 细粒度缓存 |
| **全量静态** | 不配置 | 构建时生成 |

### 环境变量

```bash
# .env.local（服务端私有）
DATABASE_URL=postgres://...

# .env.local（客户端可访问，必须加 NEXT_PUBLIC_ 前缀）
NEXT_PUBLIC_API_URL=https://api.example.com
```

```tsx
// 服务端
const dbUrl = process.env.DATABASE_URL

// 客户端
const apiUrl = process.env.NEXT_PUBLIC_API_URL
```

## 和纯 SPA / Nest BFF 的边界

| 场景 | 推荐 | 理由 |
|------|------|------|
| 官网、博客、营销页 | **Next.js SSG** | 构建时生成静态 HTML，SEO 最好 |
| 电商、内容平台 | **Next.js SSR/ISR** | 动态内容 + SEO + 首屏性能 |
| 管理后台 | **Next.js SPA** 或 **纯 SPA** | 不需要 SEO，交互复杂 |
| 已有 NestJS BFF | **Next.js SPA** | 后端已有独立服务，前端只需 SPA |
| 全栈小项目 | **Next.js 全栈** | 一个仓库搞定前后端，部署简单 |

### Next.js vs 纯 SPA + BFF

| 维度 | Next.js 全栈 | 纯 SPA + Nest BFF |
|------|-------------|-------------------|
| 部署 | 一个服务 | 两个服务（前端 + BFF） |
| 首屏 | SSR/SSG，首屏快 | SPA，首屏白屏 |
| SEO | ✅ 内置 | ❌ 需要额外处理 |
| 开发效率 | 一个仓库，类型共享 | 两个仓库，需要维护 API 契约 |
| 扩展性 | 前后端耦合 | 前后端独立扩展 |
| 适用 | 中小项目、内容站 | 大型项目、多端复用 API |

## Next.js 16 新特性

+ **Turbopack 默认** — dev 和 build 都用 Turbopack，更快
+ **Cache Components** — PPR + `use cache`，细粒度缓存
+ **异步 API** — `cookies()` / `headers()` / `params` / `searchParams` 必须 `await`
+ **proxy.ts** — `middleware.ts` 更名为 `proxy.ts`
+ **React Compiler 稳定** — 自动 memoization
+ **Node 20.9+** — 最低版本要求提升

## 参考

+ [Next.js 官方文档](https://nextjs.org/docs)
+ [Next.js 16 升级指南](https://nextjs.org/docs/app/guides/upgrading/version-16)
+ 本站：[React](/notes/frameworks/react) · [Nuxt](/notes/frameworks/nuxt) · [SSR / SSG](/notes/engineering/ssr-ssg)
