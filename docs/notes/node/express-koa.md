# Express / Koa / Fastify：轻量框架对照

> 本文基于 express 5.3.0、koa 3.3.0、fastify 5.12.8（2026-11 时点；Node 26 为活跃 LTS、24 为维护 LTS；express/koa 的 engines 均要求 node ≥18）。Express 基础（路由/中间件/错误处理）在 [Node.js](/notes/node/node) 篇"Web 开发"节；结构化中大型 API 见 [NestJS](/notes/node/nestjs)；Python 侧对照见 [FastAPI](/notes/python/fastapi)。

> 本篇补两个债：Koa 此前没有专篇（Node 篇里只有"洋葱模型"一句）；Node 篇的 Express 示例是 4.x 时代，这里补齐 5.x 迁移要点。

## 什么时候用这三个

| 场景 | 选择 |
|---|---|
| 脚本、BFF、原型、十几个路由以内的小服务 | Express / Koa / Fastify 任选 |
| 中大型 API、团队协作 | NestJS（模块 + DI，见 [NestJS](/notes/node/nestjs) 篇） |
| 高吞吐内部 JSON 服务、契约严格 | Fastify（schema 校验 + 序列化） |
| 先建立中间件心智模型 | Express（生态最大、教程最多） |

## Koa：极简 + 洋葱模型

Koa（2014，Express 同团队的新世代框架）两大设计支柱：**核心极小**（路由、body 解析全靠自己加插件）和 **async/await 原生**（Koa 1.x 时代 Node 没有 async/await，得写 generator；2.x 起改 async，3.x 彻底移除 generator 支持）。

与 Express 最大的差异在中间件模型（Node 篇"中间件机制"是线性模型，这里对照）：

| | Express | Koa |
|---|---|---|
| 中间件模型 | 线性管道，`next()` 传递控制权 | 洋葱模型，`next()` 之后还能写"后"逻辑 |
| 请求上下文 | `req` / `res` 分开传 | 统一 `ctx`（ctx.request / ctx.response） |
| 路由 | 内置 `app.get(...)` | 核心不带，加 `@koa/router` |
| body 解析 | 内置 `express.json()` | 自配 `koa-bodyparser` |

```js
// 洋葱模型：next() 前后都能写——≈ HOC 包一层，"后"处理是招牌用法
app.use(async ctx => {
  const start = Date.now()
  await ctx.next()
  ctx.set('X-Response-Time', `${Date.now() - start}ms`)  // 响应已发完才执行
})
```

**Koa 3（当前 3.3.0，2026-11-03 发布）相对 2.x 的迁移点**：generator 支持彻底移除（engines node ≥18）；query 解析换成 WHATWG `URLSearchParams`；`ctx.throw` / `ctx.assert` 归一到 http-errors v2 体系；`ctx.back()` 取代 `res.redirect('back')`；`.req.origin` 语义改为读 `Origin` 请求头。老 2.x 代码搬家先查这几处。

## Express 5：4→5 迁移要点

2026-11 `npm install express` 装到 5.3.0（4.x 在 `latest-4` dist-tag 延续维护，最后补丁 4.22.3）。主要 breaking（4.x → 5.x）：

| 变化 | 4.x | 5.x |
|---|---|---|
| 异步错误 | rejected Promise 进不了错误中间件（要自己 try/catch 或包一层） | **自动转给错误中间件**，四参 `(err, req, res, next)` 写法回归本意 |
| 通配路由 | `app.get('*')` 可用 | 特殊 `*` 行为移除，改用 `/*` splat |
| 正则路由 | `app.get(/^\/a\|b$/)` 可用 | 正则只能写在匹配组内，路径语法变了 |
| `res.status(code)` | 宽松（字符串也行） | 只接受 100–999 整数，否则抛 RangeError / TypeError |
| `res.redirect('back')` | 魔法字符串可用 | 移除，自己写 `req.get('Referrer') \|\| '/'` |

Node 篇的基础示例（路由、错误中间件）在 5.x 下原样可用；真正改变写法的只有一条：**异步错误不用再手动 try/catch 了**。

## Fastify：schema 先行，用到才付费

Fastify（5.12.8；6.0 已出 alpha，5.x 是稳定选择）两个核心设计：

+ **JSON Schema 校验 + 序列化**：路由注册时声明入参/响应 schema，自动校验（≈ [FastAPI](/notes/python/fastapi) 里 Pydantic 的运行时校验心智，JS 侧对应 Zod 但 schema 驱动）；响应按 schema 序列化，省掉 `JSON.stringify`
+ **No-op 中间件 + 插件封装作用域**：没被任何路由用到的中间件构建期直接剪掉（≈ Vite 的 tree-shaking，但作用于中间件）；插件有独立作用域，同名互不污染（≈ Nest 模块边界，但粒度更小）

```js
fastify.get('/user/:id', {
  schema: {
    params: { type: 'object', properties: { id: { type: 'integer' } } },
    response: { 200: { type: 'object', properties: { name: { type: 'string' } } } }
  }
}, async (req, reply) => ({ name: 'fuanzang' }))
```

## 三框架 + NestJS 横比

| | Express 5 | Koa 3 | Fastify 5 | NestJS |
|---|---|---|---|---|
| 定位 | 标准答案、生态最大 | 极简、模型教材 | schema 性能 | 结构化、团队规模 |
| 路由 | 内置 | `@koa/router` | 内置 | `@Controller` / `@Get` |
| body 解析 | 内置 | `koa-bodyparser` | 内置（schema） | Pipes |
| 校验 | 手写 | 手写 | JSON Schema | class-validator / DTO |
| 拦截模型 | 线性中间件 | 洋葱中间件 | no-op + 封装作用域 | Interceptor / Guard |
| 引擎要求 | node ≥18 | node ≥18 | — | 引擎可换（Express / Fastify） |

NestJS 底层引擎可换 Express / Fastify（见 [NestJS](/notes/node/nestjs) 篇），所以四个不是互斥关系：结构化的壳 + 选定的引擎。

## 选型建议（2026-11）

+ 新项目结构化 API → **NestJS**（默认；理由在 NestJS 篇）
+ 原型 / BFF / 小服务 → **Express 5**（生态最大、零学习成本）
+ 低频业务、要干净的中间件模型、依赖越少越好 → **Koa**
+ 高 QPS 内部 JSON 服务、契约严格 → **Fastify**
+ 已经在用 NestJS 且性能吃紧 → 把底层引擎切 Fastify，不必整体换框架

## 学习路径建议

1. 重读 Node 篇"中间件机制"，手写一个日志中间件（线性模型）
2. 把同一中间件搬到 Koa 洋葱模型（X-Response-Time 后处理）
3. 把一个 4.x 路由迁到 5.x，对照上面迁移表（`*` 通配与异步错误是易踩的两处）
4. 给一个接口加 Fastify schema 校验，对照 Pydantic / Zod 的体感（[FastAPI](/notes/python/fastapi)、[Django](/notes/python/django) 两篇）

## 参考

+ [Express 官方文档（5.x）](https://expressjs.com/) / [Express 5.0.0 官方 changelog](https://github.com/expressjs/express/blob/master/History.md)
+ [Koa 官网](https://koajs.com/) / [Koa Releases（3.x changelog）](https://github.com/koajs/koa/releases)
+ [Fastify 官方文档](https://fastify.dev/)
+ 站内：[Node.js（Web 开发节）](/notes/node/node)、[NestJS](/notes/node/nestjs)
