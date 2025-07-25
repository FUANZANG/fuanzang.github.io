# 前端路由

> 📌 本文件记录前端路由核心知识：路由原理、hash vs history、Vue Router、React Router、动态路由、导航守卫、懒加载与最佳实践。

---

## 1. 基本概念

### 什么是前端路由

传统后端路由：每次跳转都向服务器发请求，服务器返回新 HTML 页面，浏览器整页刷新。

前端路由：**URL 变化但不刷新页面**，由 JS 监听 URL 变化并切换组件，所有渲染在客户端完成。

```
后端路由：
  浏览器 → GET /users → 服务器 → 返回完整 HTML → 浏览器整页刷新

前端路由：
  浏览器 → URL 变为 /users → JS 监听到变化 → 渲染 Users 组件 → 无刷新
```

### SPA 与路由的关系

```
SPA（单页应用）= 一个 HTML + 前端路由 + 动态组件渲染

┌──────────────────────────────────────┐
│            index.html               │
│  ┌────────────────────────────────┐ │
│  │         <div id="app">         │ │
│  │  ┌──────────────────────────┐  │ │
│  │  │    <RouterView />        │  │ │  ← 根据当前 URL 渲染对应组件
│  │  │    (当前路由的组件)       │  │ │
│  │  └──────────────────────────┘  │ │
│  │         </div>                  │ │
│  └────────────────────────────────┘ │
│         <script src="app.js">       │  ← 包含所有路由逻辑
└──────────────────────────────────────┘
```

### 前端路由的核心能力

```
1. URL → 组件映射     — 不同路径渲染不同组件
2. 导航               — 编程式跳转（push/replace）+ 声明式跳转（<router-link>）
3. 参数传递           — 路径参数 /users/:id + 查询参数 /users?page=1
4. 嵌套路由           — 路由树，父子布局
5. 导航守卫           — 跳转前/后的钩子（鉴权、日志、确认）
6. 懒加载             — 按路由分割代码，首屏只加载需要的 chunk
7. 滚动行为           — 切换路由后滚动到顶部或恢复位置
8. 过渡动画           — 路由切换时的过渡效果
```

---

## 2. 实现原理：hash vs history

### Hash 模式

利用 URL 的 `#`（hash）变化不会触发服务器请求的特性。

```
URL: https://example.com/#/users/123
                         ↑
                     hash 部分（# 后面的内容）

浏览器行为：
  - hash 变化 → 触发 hashchange 事件 → 不向服务器发请求
  - 页面不刷新
```

```js
// 手写 hash 路由核心逻辑
class HashRouter {
  constructor() {
    this.routes = {}
    // 监听 hash 变化
    window.addEventListener('hashchange', this.handleHashChange.bind(this))
  }

  // 注册路由
  route(path, callback) {
    this.routes[path] = callback
  }

  // 处理 hash 变化
  handleHashChange() {
    const hash = window.location.hash.slice(1) || '/'  // 去掉 #
    const handler = this.routes[hash]
    if (handler) handler()
  }

  // 编程式跳转
  push(path) {
    window.location.hash = path
  }
}

// 使用
const router = new HashRouter()
router.route('/home', () => render(HomeComponent))
router.route('/users', () => render(UsersComponent))
router.push('/users')  // URL 变为 #/users
```

**Hash 模式优缺点**：

```
✅ 优点：
- 兼容性好（IE8+ 都支持）
- 不需要服务器配置（hash 不发请求）
- 部署简单，任何静态服务器都能用

❌ 缺点：
- URL 有 # 不美观（https://example.com/#/users）
- SEO 不友好（搜索引擎可能忽略 hash 部分）
- hash 本身有其他用途（锚点定位）
```

### History 模式

利用 HTML5 History API（`pushState` / `replaceState`）操作 URL，不触发服务器请求。

```
URL: https://example.com/users/123
     ↑ 没有井号，看起来像正常 URL

浏览器行为：
  - pushState/replaceState → 修改 URL 但不刷新页面
  - popstate 事件 → 监听前进/后退按钮
  - 但直接访问 /users/123 → 会向服务器发请求！
```

```js
// 手写 history 路由核心逻辑
class HistoryRouter {
  constructor() {
    this.routes = {}
    // 监听前进/后退
    window.addEventListener('popstate', this.handlePopState.bind(this))
  }

  route(path, callback) {
    this.routes[path] = callback
  }

  handlePopState() {
    const path = window.location.pathname
    const handler = this.routes[path]
    if (handler) handler()
  }

  // 编程式跳转
  push(path) {
    // 修改 URL 但不刷新页面
    window.history.pushState({}, '', path)
    // 手动触发渲染（pushState 不会触发 popstate）
    const handler = this.routes[path]
    if (handler) handler()
  }
}
```

**History 模式服务器配置**：

```
问题：用户直接访问 https://example.com/users/123
      → 服务器收到 GET /users/123 请求
      → 服务器上没有这个文件 → 404

解决：所有未匹配的路径都返回 index.html
      → 前端路由接管，渲染对应组件
```

```nginx
# Nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

```js
// Express
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})
```

```js
// Vite 开发服务器
export default defineConfig({
  server: {
    historyApiFallback: true  // 开发环境自动处理
  }
})
```

**History 模式优缺点**：

```
✅ 优点：
- URL 美观（无 #）
- SEO 友好
- 符合正常 URL 语义

❌ 缺点：
- 需要服务器配置（否则刷新 404）
- IE9 以下不支持（现在不是问题了）
```

### 两种模式对比

| | Hash | History |
|---|------|---------|
| URL 形式 | `/#/users` | `/users` |
| 服务器请求 | 不发 | 发（需配置 fallback） |
| SEO | 不友好 | 友好 |
| 兼容性 | IE8+ | IE10+ |
| 服务器配置 | 不需要 | 需要 |
| 推荐 | 老项目/简单部署 | **现代项目推荐** |

---

## 3. Vue Router（Vue 官方路由）

### 安装与初始化

```bash
# Vue 3
npm install vue-router@4

# Vue 2
npm install vue-router@3
```

```ts
// Vue 3 — router/index.ts
import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import About from '@/views/About.vue'

const router = createRouter({
  // 模式选择
  history: createWebHistory('/app/'),  // History 模式，可传 base
  // history: createWebHashHistory(),  // Hash 模式

  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/about', name: 'about', component: About }
  ]
})

export default router
```

```ts
// main.ts
import { createApp } from 'vue'
import router from './router'
const app = createApp(App)
app.use(router)
app.mount('#app')
```

### 声明式导航

```vue
<template>
  <!-- router-link 渲染为 <a> 标签 -->
  <router-link to="/home">首页</router-link>

  <!-- 命名路由 -->
  <router-link :to="{ name: 'user', params: { id: 123 }}">用户</router-link>

  <!-- 带查询参数 -->
  <router-link :to="{ path: '/users', query: { page: 2 }}">第2页</router-link>

  <!-- active class 自动添加 -->
  <router-link to="/home" active-class="active" exact-active-class="exact">
    首页
  </router-link>

  <!-- replace 不留历史记录 -->
  <router-link to="/home" replace>首页</router-link>

  <!-- 自定义标签 -->
  <router-link to="/home" custom v-slot="{ navigate, href, isActive }">
    <li :class="{ active: isActive }" @click="navigate">
      <a :href="href">首页</a>
    </li>
  </router-link>
</template>
```

### 编程式导航

```ts
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()  // 当前路由信息（不要解构，会丢响应性）

// push — 保留历史记录，可后退
router.push('/home')
router.push({ name: 'user', params: { id: 123 } })
router.push({ path: '/users', query: { page: 2 } })
router.push({ path: '/login', hash: '#section' })

// replace — 替换当前记录，不可后退
router.replace('/home')

// go — 前进/后退
router.go(-1)  // 后退
router.go(1)   // 前进
router.back()  // 后退
router.forward() // 前进
```

### 路由参数

```ts
// 路径参数
const routes = [
  { path: '/users/:id', component: UserDetail },
  // 多个参数
  { path: '/posts/:year/:month', component: PostArchive },
  // 可选参数（Vue Router 4）
  { path: '/users/:id?', component: UserList },
  // 参数后缀匹配
  { path: '/files/:path(.*)*', component: FileBrowser }
]
```

```ts
// 组件中获取参数
import { useRoute } from 'vue-router'

const route = useRoute()
route.params.id        // 路径参数 /users/123 → '123'
route.query.page       // 查询参数 ?page=2 → '2'
route.hash             // hash #section → '#section'
route.name             // 路由名称
route.path             // 完整路径
route.fullPath         // 含 query 和 hash
route.meta             // 路由元信息
```

```ts
// ⚠️ 路径参数变化时组件不会重建（同一个组件实例）
// /users/1 → /users/2 → UserDetail 组件不重新创建

// 解决方案 1：watch params
watch(() => route.params.id, (newId) => {
  fetchUser(newId)
})

// 解决方案 2：beforeRouteUpdate 守卫
onBeforeRouteUpdate((to) => {
  fetchUser(to.params.id)
})
```

### 嵌套路由

```ts
const routes = [
  {
    path: '/dashboard',
    component: DashboardLayout,  // 布局组件
    children: [
      { path: '', component: Overview },           // /dashboard
      { path: 'analytics', component: Analytics },  // /dashboard/analytics
      { path: 'settings', component: Settings },    // /dashboard/settings
      {
        path: 'users',
        component: UserLayout,
        children: [
          { path: '', component: UserList },        // /dashboard/users
          { path: ':id', component: UserDetail },   // /dashboard/users/:id
        ]
      }
    ]
  }
]
```

```vue
<!-- DashboardLayout.vue -->
<template>
  <div class="dashboard">
    <Sidebar />
    <main>
      <router-view />  <!-- 子路由渲染在这里 -->
    </main>
  </div>
</template>
```

```vue
<!-- 多个 <router-view>（命名视图） -->
<template>
  <div>
    <router-view name="header" />
    <router-view />            <!-- default -->
    <router-view name="footer" />
  </div>
</template>

<!-- 路由配置 -->
{ path: '/', components: {
  default: Home,
  header: Header,
  footer: Footer
}}
```

### 动态路由与路由匹配

```ts
// 动态添加路由（权限路由常用）
router.addRoute('admin', {
  path: 'users',
  component: AdminUsers
})
// 等价于在 admin 的 children 中添加

// 动态删除路由
router.removeRoute('admin-users')

// 获取所有路由
router.getRoutes()

// 路由匹配优先级 — 更具体的路径优先
const routes = [
  { path: '/users/:id', component: UserDetail },  // 静态优先
  { path: '/users/create', component: UserCreate }, // ⚠️ 会被上面的 :id 匹配！
]
// 解决：把静态路径放前面
const routes = [
  { path: '/users/create', component: UserCreate }, // 先匹配
  { path: '/users/:id', component: UserDetail },
]
```

### 路由懒加载

```ts
// 静态导入 — 所有路由打包到一个 chunk
import Home from '@/views/Home.vue'

// 懒加载 — 每个路由单独打包，按需加载
const routes = [
  {
    path: '/',
    component: () => import('@/views/Home.vue')  // 动态 import → 独立 chunk
  },
  {
    path: '/about',
    component: () => import('@/views/About.vue')
  }
]

// 命名 chunk（便于分析）
const routes = [
  {
    path: '/dashboard',
    component: () => import(/* webpackChunkName: "dashboard" */ '@/views/Dashboard.vue')
  }
]
```

```
懒加载效果：

不懒加载：
  app.js (2MB) — 包含所有页面组件
  → 首屏加载 2MB

懒加载：
  app.js   (500KB) — 只含核心代码 + 路由配置
  Home.js  (50KB)  — 首屏加载
  About.js (30KB)  — 访问 /about 时加载
  User.js  (80KB)  — 访问 /users 时加载
  → 首屏只加载 550KB
```

### 路由元信息 (meta)

```ts
const routes = [
  {
    path: '/dashboard',
    component: Dashboard,
    meta: {
      title: '控制台',
      requiresAuth: true,    // 需要登录
      roles: ['admin', 'user'], // 允许的角色
      keepAlive: true,       // 缓存组件
      icon: 'dashboard',     // 菜单图标
    }
  },
  {
    path: '/admin',
    component: Admin,
    meta: {
      title: '管理后台',
      requiresAuth: true,
      roles: ['admin'],      // 仅管理员
    }
  }
]

// 组件中访问
const route = useRoute()
route.meta.title       // '控制台'
route.meta.requiresAuth // true

// 子路由会合并父路由的 meta
// /dashboard/analytics 的 meta = dashboard.meta + analytics.meta
```

### 滚动行为

```ts
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 前进/后退 → 恢复位置
    if (savedPosition) return savedPosition

    // 有 hash → 滚动到锚点
    if (to.hash) return { el: to.hash, behavior: 'smooth' }

    // 默认 → 滚动到顶部
    return { top: 0, left: 0, behavior: 'smooth' }
  }
})
```

---

## 4. Vue Router 导航守卫

导航守卫是路由跳转过程中的钩子函数，用于鉴权、日志、确认等。

### 完整导航解析流程

```
1. 导航被触发
2. 在失活的组件里调用 beforeRouteLeave
3. 调用全局 beforeEach
4. 在重用的组件里调用 beforeRouteUpdate
5. 调用路由配置里的 beforeEnter
6. 解析异步路由组件
7. 在被激活的组件里调用 beforeRouteEnter
8. 调用全局 beforeResolve
9. 导航被确认
10. 调用全局 afterEach
11. 触发 DOM 更新
12. beforeRouteEnter 中传给 next 的回调被调用
```

### 全局守卫

```ts
// 前置守卫 — 最常用（鉴权）
router.beforeEach((to, from) => {
  const userStore = useUserStore()

  // 需要登录但未登录 → 跳转登录页
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 已登录访问登录页 → 跳转首页
  if (to.path === '/login' && userStore.isLoggedIn) {
    return { path: '/' }
  }

  // 角色权限
  if (to.meta.roles && !to.meta.roles.includes(userStore.role)) {
    return { path: '/403' }
  }

  // 返回 true 或不返回 → 放行
  // 返回 false → 取消导航
  // 返回路由地址 → 重定向
})

// 后置钩子 — 跳转完成后执行（不能改变导航）
router.afterEach((to, from) => {
  // 更新页面标题
  document.title = to.meta.title ? `${to.meta.title} - MyApp` : 'MyApp'
})

// 解析守卫 — 所有组件内守卫和异步路由组件解析之后
router.beforeResolve((to) => {
  // 可以在这里做最后的检查
})
```

### 路由独享守卫

```ts
const routes = [
  {
    path: '/admin',
    component: Admin,
    beforeEnter: (to, from) => {
      // 仅此路由的守卫
      if (!hasAdminRole()) return '/403'
    }
  }
]
```

### 组件内守卫

```ts
// Vue 3 Composition API
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'

// 离开当前路由前（可阻止离开）
onBeforeRouteLeave((to, from) => {
  if (hasUnsavedChanges()) {
    const answer = confirm('有未保存的更改，确定离开？')
    if (!answer) return false  // 取消导航
  }
})

// 同组件不同参数跳转（/users/1 → /users/2）
onBeforeRouteUpdate((to, from) => {
  // 组件不重建，手动处理参数变化
  fetchUser(to.params.id)
})
```

```ts
// Vue 2 Options API
export default {
  beforeRouteEnter(to, from, next) {
    // 进入前 — 此时组件实例还未创建，不能用 this
    // 通过 next(vm => {}) 在组件创建后访问实例
    next(vm => {
      vm.fetchData(to.params.id)
    })
  },
  beforeRouteUpdate(to, from, next) {
    this.fetchData(to.params.id)
    next()
  },
  beforeRouteLeave(to, from, next) {
    if (this.hasUnsavedChanges) {
      if (!confirm('确定离开？')) return next(false)
    }
    next()
  }
}
```

### 实战：完整的鉴权流程

```ts
// router/index.ts
router.beforeEach(async (to) => {
  const userStore = useUserStore()
  const token = localStorage.getItem('token')

  // 1. 白名单
  const whiteList = ['/login', '/register', '/forgot-password']
  if (whiteList.includes(to.path)) return true

  // 2. 未登录 → 跳登录页
  if (!token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 3. 有 token 但没用户信息 → 获取用户信息
  if (!userStore.info) {
    try {
      await userStore.fetchUserInfo()
    } catch {
      // token 过期
      localStorage.removeItem('token')
      return { path: '/login' }
    }
  }

  // 4. 动态路由 — 如果还没添加动态路由
  if (!router.hasRoute('dashboard') && userStore.menus) {
    userStore.menus.forEach(menu => {
      router.addRoute({
        path: menu.path,
        name: menu.name,
        component: () => import(`@/views/${menu.component}.vue`),
        meta: { title: menu.title, roles: menu.roles }
      })
    })
    return to  // 重新导航，匹配刚添加的路由
  }

  // 5. 权限检查
  if (to.meta.roles && !to.meta.roles.includes(userStore.role)) {
    return { path: '/403' }
  }

  return true
})
```

---

## 5. React Router（React 官方路由）

### 安装

```bash
npm install react-router-dom
```

### 基本用法 — Routes & Route

```tsx
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <nav>
        {/* 声明式导航 */}
        <Link to="/">首页</Link>
        <Link to="/about">关于</Link>

        {/* NavLink — 自动 active class */}
        <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
          用户
        </NavLink>
      </nav>

      {/* 路由匹配 — 最具体的路径优先匹配 */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
```

### 编程式导航

```tsx
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom'

function Component() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  // 跳转
  navigate('/home')
  navigate('/users/123')
  navigate(-1)           // 后退
  navigate(1)            // 前进
  navigate('/login', { replace: true })  // replace 模式

  // 带状态跳转（不显示在 URL 中）
  navigate('/detail', { state: { from: 'list' } })

  // 获取信息
  location.pathname       // 当前路径
  location.search         // 查询字符串
  location.state          // 传递的状态
  params.id               // 路径参数
  searchParams.get('page') // 查询参数

  return <div>...</div>
}
```

### 嵌套路由

```tsx
// React Router 6 — 嵌套路由
function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardLayout />}>
        {/* index 路由 — /dashboard */}
        <Route index element={<Overview />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="users" element={<UserLayout />}>
          <Route index element={<UserList />} />
          <Route path=":id" element={<UserDetail />} />
        </Route>
      </Route>
    </Routes>
  )
}

// 父布局组件中用 <Outlet /> 渲染子路由
function DashboardLayout() {
  return (
    <div className="dashboard">
      <Sidebar />
      <main>
        <Outlet />  {/* 子路由渲染在这里 */}
      </main>
    </div>
  )
}
```

### 路由懒加载

```tsx
import { lazy, Suspense } from 'react'

// React.lazy + 动态 import
const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))
const UserDetail = lazy(() => import('./pages/UserDetail'))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/users/:id" element={<UserDetail />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

### 导航守卫 — 自定义 ProtectedRoute

```tsx
// React 没有内置守卫，用组件包裹实现
function ProtectedRoute({ children, roles }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <Loading />

  if (!user) {
    // 记录来源路径，登录后跳回
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return children
}

// 使用
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/dashboard" element={
    <ProtectedRoute><Dashboard /></ProtectedRoute>
  } />
  <Route path="/admin" element={
    <ProtectedRoute roles={['admin']}><Admin /></ProtectedRoute>
  } />
</Routes>
```

### React Router 数据加载（v6.4+ loader/action）

```tsx
// 新版数据路由 — 类似 Remix 的 loader 模式
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: '/users/:id',
    element: <UserDetail />,
    // 路由进入前自动调用 loader
    loader: async ({ params }) => {
      const res = await fetch(`/api/users/${params.id}`)
      if (!res.ok) throw new Response('Not Found', { status: 404 })
      return res.json()
    },
    // 处理表单提交
    action: async ({ request, params }) => {
      const formData = await request.formData()
      const res = await fetch(`/api/users/${params.id}`, {
        method: 'PATCH',
        body: formData
      })
      return res.json()
    },
    // 错误边界
    errorElement: <ErrorBoundary />
  }
])

function UserDetail() {
  // 直接读取 loader 返回的数据
  const user = useLoaderData()
  return <div>{user.name}</div>
}

function App() {
  return <RouterProvider router={router} />
}
```

---

## 6. Vue Router vs React Router 对比

| | Vue Router 4 | React Router 6 |
|---|---|---|
| **配置方式** | 路由表（routes 数组） | JSX 声明式 `<Route>` |
| **导航组件** | `<router-link>` | `<Link>` / `<NavLink>` |
| **渲染出口** | `<router-view>` | `<Outlet />` |
| **编程式导航** | `useRouter().push()` | `useNavigate()` |
| **获取参数** | `useRoute().params` | `useParams()` |
| **嵌套路由** | children 配置 | 嵌套 `<Route>` |
| **导航守卫** | 内置 beforeEach 等 | 无，用组件包裹 |
| **懒加载** | `() => import()` | `lazy(() => import())` |
| **数据加载** | 无内置（用组件内 onMounted） | loader/action（v6.4+） |
| **模式** | history / hash | BrowserRouter / HashRouter |
| **动态路由** | `addRoute()` | 需要手动处理 |

---

## 7. 动态路由与权限路由

### 后端返回菜单 → 前端动态生成路由

```ts
// Vue 实现
async function setupDynamicRoutes() {
  const userStore = useUserStore()

  // 1. 从后端获取用户菜单权限
  const menus = await api.getUserMenus()

  // 2. 递归生成路由
  function generateRoutes(menus, parentPath = '') {
    return menus.map(menu => {
      const route = {
        path: parentPath + menu.path,
        name: menu.name,
        component: () => import(`@/views/${menu.component}.vue`),
        meta: {
          title: menu.title,
          icon: menu.icon,
          roles: menu.roles
        }
      }
      if (menu.children) {
        route.children = generateRoutes(menu.children, route.path)
      }
      return route
    })
  }

  // 3. 动态添加路由
  const routes = generateRoutes(menus)
  routes.forEach(route => {
    router.addRoute('layout', route)  // 添加到布局路由的 children
  })

  // 4. 添加 404 兜底（必须在最后）
  router.addRoute({
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/404.vue')
  })
}
```

### 前端静态路由 + meta 权限标记

```ts
// 所有路由前端定义，通过 meta.roles 控制访问
const routes = [
  {
    path: '/dashboard',
    component: Dashboard,
    meta: { roles: ['admin', 'user'] }
  },
  {
    path: '/admin',
    component: Admin,
    meta: { roles: ['admin'] }
  }
]

// 守卫中检查
router.beforeEach((to) => {
  if (to.meta.roles && !to.meta.roles.includes(userStore.role)) {
    return '/403'
  }
})
```

```
两种方案对比：

后端驱动（动态路由）：
  ✅ 菜单完全由后端控制，灵活
  ✅ 新增页面不需要前端发版
  ❌ 前端需要约定 component 路径映射
  ❌ 路由懒加载路径不能动态拼接（Vite 不支持纯变量 import）

前端驱动（静态路由 + meta）：
  ✅ 简单直接，类型安全
  ✅ 路由懒加载正常工作
  ❌ 新增页面需要前端发版
  ❌ 菜单变化需要改代码
```

### Vite 动态 import 的坑

```ts
// ❌ Vite 不支持纯变量动态 import
const component = () => import(`@/views/${menu.component}.vue`)
// → 开发环境可能行，生产构建会丢失文件

// ✅ 方案 1：用 import.meta.glob 预扫描
const modules = import.meta.glob('@/views/**/*.vue')

const route = {
  component: modules[`/src/views/${menu.component}.vue`]
}

// ✅ 方案 2：静态映射表
const componentMap = {
  'dashboard': () => import('@/views/Dashboard.vue'),
  'user-list': () => import('@/views/UserList.vue'),
  'user-detail': () => import('@/views/UserDetail.vue'),
}

const route = {
  component: componentMap[menu.component]
}
```

---

## 8. 路由过渡动画

### Vue Router 过渡

```vue
<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
```

```vue
<!-- 基于路由 meta 控制不同动画 -->
<template>
  <router-view v-slot="{ Component, route }">
    <transition :name="route.meta.transition || 'fade'" mode="out-in">
      <component :is="Component" :key="route.path" />
    </transition>
  </router-view>
</template>
```

### React Router 过渡

```tsx
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Home />
          </motion.div>
        } />
      </Routes>
    </AnimatePresence>
  )
}
```

---

## 9. 路由缓存 (Keep-Alive)

### Vue Keep-Alive

```vue
<template>
  <!-- 缓存所有路由组件 -->
  <router-view v-slot="{ Component }">
    <keep-alive>
      <component :is="Component" />
    </keep-alive>
  </router-view>

  <!-- 按条件缓存 -->
  <router-view v-slot="{ Component, route }">
    <keep-alive :include="cachedViews">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>

<script setup>
// 根据 meta.keepAlive 决定缓存哪些
const cachedViews = computed(() => {
  return router.getRoutes()
    .filter(r => r.meta.keepAlive)
    .map(r => r.name)
})
</script>
```

```ts
// 组件内 — onActivated / onDeactivated
import { onActivated, onDeactivated } from 'vue'

onActivated(() => {
  // 从缓存恢复时调用（不是重新创建）
  refreshData()
})

onDeactivated(() => {
  // 被缓存（离开但未销毁）时调用
})
```

### React 路由缓存

```tsx
// React 没有内置 Keep-Alive，需要第三方库或手动实现
// 方案 1：react-activation 库
import { KeepAlive } from 'react-activation'

function App() {
  return (
    <Routes>
      <Route path="/list" element={
        <KeepAlive><UserList /></KeepAlive>
      } />
      <Route path="/detail" element={<UserDetail />} />
    </Routes>
  )
}

// 方案 2：用 display:none 切换（简单但不够优雅）
function App() {
  return (
    <>
      <div style={{ display: location.pathname === '/list' ? 'block' : 'none' }}>
        <UserList />
      </div>
      <Routes>
        <Route path="/detail" element={<UserDetail />} />
      </Routes>
    </>
  )
}
```

---

## 10. 常见踩坑

### History 模式刷新 404

```
问题：部署后直接访问 /users/123 → 404
原因：服务器收到 GET /users/123，找不到对应文件
解决：配置服务器 fallback 到 index.html

Nginx:     try_files $uri $uri/ /index.html;
Express:   app.get('*', sendFile('index.html'))
Vercel:    自动处理
GitHub Pages: 需要 404.html 重定向技巧（或用 Hash 模式）
```

### 路由参数变化组件不更新

```ts
// Vue: /users/1 → /users/2，UserDetail 组件不重建
// 原因：同一个组件实例被复用

// 解决 1：watch
watch(() => route.params.id, (id) => fetchUser(id))

// 解决 2：beforeRouteUpdate
onBeforeRouteUpdate((to) => fetchUser(to.params.id))

// 解决 3：给 router-view 加 key（强制重建，性能差）
<router-view :key="$route.fullPath" />
```

### 动态路由 404 兜底顺序

```ts
// ❌ 404 路由放前面，所有路径都被 404 匹配
const routes = [
  { path: '/:pathMatch(.*)*', component: NotFound },  // 会拦截所有！
  { path: '/', component: Home },
]

// ✅ 404 路由放最后
const routes = [
  { path: '/', component: Home },
  { path: '/users/:id', component: UserDetail },
  { path: '/:pathMatch(.*)*', component: NotFound },  // 最后兜底
]

// ⚠️ 动态添加路由后，404 需要重新添加到最后
router.addRoute({ path: '/:pathMatch(.*)*', component: NotFound })
```

### Vue Router 解构丢失响应性

```ts
// ❌ 解构 route 会丢失响应性
const route = useRoute()
const { params } = route  // params 不再响应式

// ✅ 直接访问或用 toRefs
const route = useRoute()
route.params.id  // 响应式

// 或用 computed
const userId = computed(() => route.params.id)
```

### React Router 嵌套路由路径

```tsx
// React Router 6 子路由路径不需要加父路径前缀
<Route path="/dashboard" element={<Layout />}>
  <Route path="analytics" element={<Analytics />} />
  {/* ✅ 实际路径是 /dashboard/analytics */}
  {/* ❌ 不要写 path="/dashboard/analytics" */}
</Route>
```

### 懒加载路由闪烁

```vue
<!-- Vue: 路由组件加载时有空白 -->
<template>
  <router-view v-slot="{ Component }">
    <Suspense>
      <component :is="Component" />
      <template #fallback>
        <Loading />  <!-- 加载中显示 -->
      </template>
    </Suspense>
  </router-view>
</template>
```

---

## 11. 最佳实践

### 路由文件组织

```
src/
├── router/
│   ├── index.ts          # 路由实例 + 全局守卫
│   ├── routes.ts         # 静态路由表
│   ├── dynamic.ts        # 动态路由生成
│   └── guards/
│       ├── auth.ts       # 鉴权守卫
│       ├── title.ts      # 标题守卫
│       └── permission.ts # 权限守卫
├── views/                # 路由级页面组件
│   ├── Home.vue
│   ├── UserList.vue
│   └── UserDetail.vue
└── components/           # 通用组件（非路由级）
```

### 路由命名

```ts
// ✅ 使用 name 而不是 path 跳转（path 变了不用改代码）
const routes = [
  { path: '/users/:id', name: 'user-detail', component: UserDetail }
]

router.push({ name: 'user-detail', params: { id: 123 } })
// 比 router.push('/users/123') 更可维护
```

### 路由拆分

```ts
// 大型项目 — 按模块拆分路由
// router/modules/user.ts
export default [
  {
    path: '/users',
    component: UserLayout,
    children: [
      { path: '', component: UserList },
      { path: ':id', component: UserDetail },
      { path: 'create', component: UserCreate },
    ]
  }
]

// router/modules/order.ts
export default [
  { path: '/orders', component: OrderList },
  { path: '/orders/:id', component: OrderDetail },
]

// router/index.ts
import userRoutes from './modules/user'
import orderRoutes from './modules/order'

const routes = [
  ...userRoutes,
  ...orderRoutes,
  { path: '/:pathMatch(.*)*', component: NotFound }
]
```

### 页面标题管理

```ts
// 全局 afterEach 统一设置标题
router.afterEach((to) => {
  const base = 'MyApp'
  document.title = to.meta.title ? `${to.meta.title} - ${base}` : base
})
```

### 路由预加载

```ts
// 鼠标 hover 时预加载路由组件（减少点击后等待）
const routes = [
  {
    path: '/dashboard',
    component: () => import('@/views/Dashboard.vue'),
    // Vite 支持注释指令预加载
    // 实际在 Vite 中会自动 prefetch
  }
]

// 手动预加载（hover 时）
function preloadRoute(path) {
  // Vite 会自动处理动态 import 的预加载
  router.resolve(path).matched.forEach(record => {
    if (record.components?.default) {
      // 触发组件加载
      record.components.default()
    }
  })
}
```

---

## 参考

- [Vue Router 官方文档](https://router.vuejs.org/)
- [React Router 官方文档](https://reactrouter.com/)
- [MDN - History API](https://developer.mozilla.org/zh-CN/docs/Web/API/History_API)
