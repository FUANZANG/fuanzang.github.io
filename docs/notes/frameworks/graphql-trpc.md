# GraphQL 与 tRPC

> 📌 本文件记录前端视角的 API 契约：GraphQL 查询模型、tRPC 端到端类型，以及与 REST 的选型。
>
> ⚠️ **边界说明**：fetch / Axios / React Query 等传输与缓存见 [HTTP 请求与数据层](/notes/frameworks/http-request)；接口 Mock / 文档平台见 [YApi](/notes/deploy/yapi)。本文聚焦 **契约形态与客户端用法**。
>
> 📅 参考：GraphQL 2021 | Apollo Client 3.x | urql | tRPC 11.x

---

## 1. 三种契约对比

| | REST | GraphQL | tRPC |
|--|------|---------|------|
| 契约载体 | URL + Method + JSON Schema/OpenAPI | Schema（SDL） | TypeScript 类型（前后端共享） |
| 拉取形状 | 后端定 DTO，易 over/under-fetch | 客户端选字段 | 过程调用，返回类型推断 |
| 类型安全 | 需代码生成（OpenAPI） | 需 codegen | **原生**（限 TS 全栈） |
| 缓存 | URL 语义清晰，HTTP 缓存友好 | 需规范化缓存（Apollo） | 常配合 React Query |
| 适用 | 公开 API、多端、网关成熟 | BFF、复杂视图拼装 | 单体/内部全栈 TS |

一句话：

+ **REST**：资源与缓存友好，生态最大
+ **GraphQL**：一次请求精确取数，适合复杂前端视图
+ **tRPC**：TS 单体最快路径，不适合对外多语言 API

---

## 2. GraphQL 核心

### Schema 与操作

```graphql
type User {
  id: ID!
  name: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  body: String
}

type Query {
  user(id: ID!): User
  posts(limit: Int = 10): [Post!]!
}

type Mutation {
  createPost(title: String!, body: String): Post!
}

type Subscription {
  postAdded: Post!
}
```

客户端操作：

```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    posts {
      title
    }
  }
}

mutation AddPost($title: String!) {
  createPost(title: $title) {
    id
    title
  }
}
```

+ `Query` 只读；`Mutation` 写；`Subscription` 多用 WebSocket/SSE
+ 字段可嵌套，**按需取字段**是 GraphQL 的核心价值

### 单端点 HTTP

```js
const res = await fetch('/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    query: `query ($id: ID!) { user(id: $id) { id name } }`,
    variables: { id: '1' },
  }),
})
const { data, errors } = await res.json()
if (errors?.length) throw new Error(errors[0].message)
```

注意：HTTP 200 仍可能带 `errors`；业务失败要看 payload，不能只看状态码。

### 常见坑

| 坑 | 说明 |
|----|------|
| N+1 | `user.posts` 每个 user 打一次 DB → 用 DataLoader |
| 巨型查询 | 限制深度/复杂度，防恶意嵌套 |
| 版本 | 少用「v2 URL」，多用字段弃用 `@deprecated` |
| 文件上传 | 需 multipart 扩展或另走 REST/OSS |
| 缓存 | POST 默认难用 CDN；可 persisted query + GET |

---

## 3. GraphQL 前端客户端

### 轻量：自己 fetch + 类型生成

```bash
npm i graphql
npm i -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations
```

把 `.graphql` 文档生成 `types.ts`，再包一层 request 函数即可。适合中小项目。

### Apollo Client（功能全）

```ts
import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client'

const client = new ApolloClient({
  link: new HttpLink({ uri: '/graphql', credentials: 'include' }),
  cache: new InMemoryCache(),
})

const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) { id name }
  }
`

const { data } = await client.query({ query: GET_USER, variables: { id: '1' } })
```

React 中用 `useQuery` / `useMutation`；规范化缓存能自动更新同 `id` 实体。

### urql（更轻）

```ts
import { createClient, cacheExchange, fetchExchange } from 'urql'

export const client = createClient({
  url: '/graphql',
  exchanges: [cacheExchange, fetchExchange],
})
```

选型：要强缓存与生态选 Apollo；想包体小、API 简单选 urql 或纯 fetch。

---

## 4. tRPC 核心

tRPC：**同一套 TypeScript 类型**从服务端 procedure 推到客户端，无代码生成、无 Schema 语言。

### 服务端（示意）

```ts
// server/trpc.ts
import { initTRPC } from '@trpc/server'
import { z } from 'zod'

const t = initTRPC.create()
export const router = t.router
export const publicProcedure = t.procedure

export const appRouter = router({
  user: router({
    byId: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => db.user.find(input.id)),
    create: publicProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(({ input }) => db.user.create(input)),
  }),
})

export type AppRouter = typeof appRouter
```

### 客户端

```ts
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../server/trpc'

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      headers() {
        return { Authorization: `Bearer ${getToken()}` }
      },
    }),
  ],
})

// 全自动类型推断
const user = await trpc.user.byId.query({ id: '1' })
await trpc.user.create.mutate({ name: 'Ada' })
```

### 与 React Query

```ts
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../server/trpc'

export const trpc = createTRPCReact<AppRouter>()

// 组件内
const { data, isLoading } = trpc.user.byId.useQuery({ id: '1' })
```

缓存、重试、失效策略复用 React Query——细节见 [HTTP 请求与数据层](/notes/frameworks/http-request)。

### 约束

+ 前后端应同仓或发布 `AppRouter` 类型包
+ 对外公共 API、多语言客户端 → 不适合 tRPC，改 OpenAPI/GraphQL
+ 鉴权用 middleware：`t.procedure.use(authMiddleware)`

```ts
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { user: ctx.user } })
})
const protectedProcedure = t.procedure.use(isAuthed)
```

---

## 5. 前端工程实践

### 错误处理统一

```ts
// GraphQL
if (result.errors) showToast(result.errors[0].message)

// tRPC
try {
  await trpc.user.create.mutate(form)
} catch (e) {
  if (isTRPCClientError(e)) showToast(e.message)
}
```

### 与 REST 共存

很多系统是「BFF GraphQL + 上传/支付走 REST」或「内部 tRPC + 对外 REST」。前端封装两套 client，按域划分，不要强行一种协议打天下。

### 加载与缓存策略

| 场景 | 建议 |
|------|------|
| 列表筛选频繁 | GraphQL 变量查询 + 防抖；或 REST + React Query `queryKey` |
| 详情页字段多变 | GraphQL 按路由选字段 |
| 表单提交 | Mutation / tRPC mutation，成功后 `invalidate` |
| 实时 | GraphQL Subscription 或 WebSocket 专篇 |

实时通道见 [WebSocket 与实时通信](/notes/practice/websocket-realtime)。

---

## 6. 选型决策树

```
需要对外多语言 / 强 HTTP 缓存 / 网关生态？
  └─ 是 → REST（+ OpenAPI）
  └─ 否 → 全栈都是 TypeScript 且同仓？
            └─ 是 → tRPC（最快）
            └─ 否 → 视图拼装复杂、多端字段需求差大？
                      └─ 是 → GraphQL
                      └─ 否 → REST 通常够用
```

---

## 7. 最小对照示例

同一需求「取用户名」：

```http
GET /api/users/1
```

```graphql
query { user(id: "1") { name } }
```

```ts
await trpc.user.byId.query({ id: '1' }) // → { name: string, ... }
```

---

## 8. 参考

+ [GraphQL 官网](https://graphql.org/learn/)
+ [Apollo Client 文档](https://www.apollographql.com/docs/react/)
+ [tRPC 文档](https://trpc.io/docs)
+ 本站：[HTTP 请求与数据层](/notes/frameworks/http-request) · [YApi](/notes/deploy/yapi)
