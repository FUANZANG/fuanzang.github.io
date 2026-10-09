# Vue 笔记

Vue 是一套渐进式框架：可以只给一个页面挂上数据，也可以做成单页应用，再往上是 [Nuxt](/notes/frameworks/nuxt) 的服务端渲染。模板、响应式和组件是它的三块核心。

## 现在该学哪一版

新项目用 **Vue 3**。Vue 2 的官方维护已经结束，只在还要改旧仓库时才需要看。

| | Vue 2 | Vue 3 |
|---|---|---|
| 组件写法 | Options API（`data` / `methods`） | Composition API（`setup`、`ref`）为主，Options 仍可用 |
| 响应式 | `Object.defineProperty`，新增属性要 `Vue.set` | `Proxy`，增删属性直接能追踪 |
| 多根节点、Teleport、Suspense | 没有或靠插件 | 内置 |
| 构建 | Vue CLI / Webpack 常见 | Vite 是默认 |

本站按版本拆开，避免两套 API 写在同一页里互相打架：

+ [Vue 2](/notes/frameworks/vue2)：旧项目里的路由守卫、列表刷新、树形状态
+ [Vue 3](/notes/frameworks/vue3)：响应式、组件通讯、组合式函数，当前要掌握的正文

## 生态地图

| 要解决的事 | 去哪篇 |
|---|---|
| 路由 | [前端路由](/notes/frameworks/frontend-routing) |
| 跨组件状态 | [状态管理](/notes/frameworks/state-management)（Vue 侧是 Pinia） |
| 请求数据 | [HTTP 请求与数据层](/notes/frameworks/http-request) |
| 首屏和 SEO | 先读 [SSR / SSG](/notes/engineering/ssr-ssg)，再读 [Nuxt](/notes/frameworks/nuxt) |
| 和 React 怎么选 | [React vs Vue 对比](/notes/frameworks/react-vs-vue) |

## 怎么读

1. Vue 3 的响应式和组件通讯
2. 路由、状态管理两篇专篇
3. 项目需要服务端渲染时，再读 SSR / SSG 和 Nuxt
