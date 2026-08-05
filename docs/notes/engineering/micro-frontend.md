# 微前端

## 什么是微前端

+ 将一个大型前端应用拆分成多个**独立开发、独立部署、独立运行**的子应用，再由一个主应用（基座）统一加载和调度
+ 核心价值：技术栈无关、独立部署、增量升级

## 主流方案对比

| 方案 | 原理 | 隔离性 | 技术栈限制 | 适用场景 |
|------|------|--------|-----------|---------|
| **qiankun** | 基于 single-spa，JS 沙箱 + CSS 隔离 | 中（Proxy 沙箱） | 无 | 企业级后台、老系统改造 |
| **micro-app** | WebComponent 容器 | 高（Shadow DOM） | 无 | 京东体系、组件化思维 |
| **wujie** | iframe + WebComponent | 高（iframe 天然隔离） | 无 | 对隔离性要求高的场景 |
| **Module Federation** | Webpack 5 模块共享（1.0）/ 多构建器运行时共享（2.0） | 低（共享运行时） | 1.0 需 Webpack 5；2.0 无构建器限制 | 同技术栈、模块共享 |

## qiankun

### 主应用配置

+ 安装 `npm i qiankun -S`

  ```js
  // main-app/src/micro-apps.js
  import { registerMicroApps, start } from 'qiankun'

  const apps = [
    {
      name: 'vue-app',
      entry: '//localhost:8081',
      container: '#container',
      activeRule: '/vue-app',
    },
    {
      name: 'react-app',
      entry: '//localhost:8082',
      container: '#container',
      activeRule: '/react-app',
    },
  ]

  registerMicroApps(apps)
  start({ prefetch: 'all' })
  ```

### 子应用配置（Vue 为例）

+ 入口文件导出生命周期钩子

  ```js
  // sub-app/src/main.js
  import { createApp } from 'vue'
  import App from './App.vue'
  import router from './router'

  let app = null

  function render(props = {}) {
    app = createApp(App)
    app.use(router)
    app.mount(props.container ? props.container.querySelector('#app') : '#app')
  }

  // 独立运行时直接渲染
  if (!window.__POWERED_BY_QIANKUN__) {
    render()
  }

  // qiankun 生命周期
  export async function bootstrap() {
    console.log('vue-app bootstrap')
  }

  export async function mount(props) {
    render(props)
  }

  export async function unmount() {
    app.unmount()
    app = null
  }
  ```

+ 2.x 简化（官方 `@qiankunjs/bundler-plugin`，Vite 5+）：不再需要上面的 UMD 包装和 `window.__POWERED_BY_QIANKUN__` 判断。子应用 `vite.config` 加 `qiankun()` 插件后，入口直接导出生命周期即可，独立运行 / 被基座加载都正常（详见文末「微前端 × Vite 兼容性问题」节）

  ```ts
  // sub-app/src/main.ts —— 直接导出生命周期，无需 __POWERED_BY_QIANKUN__ 判断
  export async function bootstrap() {}
  export async function mount(props) {
    // render into props.container
  }
  export async function unmount(props) {
    // tear down
  }
  ```

+ vite.config 配置

  ```js
  // sub-app/vite.config.js
  import { defineConfig } from 'vite'

  export default defineConfig({
    server: {
      port: 8081,
      cors: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
    build: {
      // 打包成 UMD 格式供 qiankun 加载
      rollupOptions: {
        output: {
          entryFileNames: 'js/[name].js',
          chunkFileNames: 'js/[name].js',
          assetFileNames: 'css/[name].[ext]',
        },
      },
    },
  })
  ```

## micro-app（京东）

### 主应用

+ 安装 `npm i @micro-zoe/micro-app`

  ```js
  // main-app/src/main.js
  import microApp from '@micro-zoe/micro-app'

  microApp.start()
  ```

  ```html
  <!-- 在模板中使用自定义元素加载子应用 -->
  <micro-app name="vue-app" url="http://localhost:8081"></micro-app>
  ```

### 子应用

+ 监听基座数据 & 生命周期

  ```js
  // sub-app/src/main.js
  window.microApp?.addDataListener((data) => {
    console.log('收到基座数据:', data)
  })

  // 向基座发送数据
  window.microApp?.dispatch({ type: 'from-child', payload: 'hello' })
  ```

## wujie（无界）

+ 安装 `npm i wujie-vue3 -S`

  ```vue
  <template>
    <WujieVue
      name="vue-app"
      url="http://localhost:8081"
      :props="{ data: 'hello' }"
    />
  </template>

  <script setup>
  import WujieVue from 'wujie-vue3'
  </script>
  ```

+ 核心原理：子应用运行在 iframe 的 JS 沙箱中，DOM 渲染在基座的 WebComponent 容器内，兼得 iframe 的隔离性和 WebComponent 的体验

## Module Federation（Webpack 5）

### 主应用（消费方）

  ```js
  // webpack.config.js
  const { ModuleFederationPlugin } = require('webpack').container

  module.exports = {
    plugins: [
      new ModuleFederationPlugin({
        name: 'host',
        remotes: {
          app1: 'app1@http://localhost:8081/remoteEntry.js',
        },
        shared: ['vue', 'vue-router'],
      }),
    ],
  }
  ```

  ```js
  // 使用远程模块
  const Button = () => import('app1/Button')
  ```

### 子应用（提供方）

  ```js
  // webpack.config.js
  new ModuleFederationPlugin({
    name: 'app1',
    filename: 'remoteEntry.js',
    exposes: {
      './Button': './src/components/Button.vue',
    },
    shared: ['vue', 'vue-router'],
  })
  ```

## Module Federation 2.0

> 版本说明：截至 2026-08，对应包版本为 `@module-federation/enhanced` / `@module-federation/runtime` `2.8.x`、`@module-federation/vite` `1.20.x`。1.0 是 Webpack 5 内置能力；2.0 由 module-federation 官方维护（`@module-federation/*` 系列），**解耦了构建器**。

### 1.0 与 2.0 的核心差异

| 维度 | 1.0（Webpack 5 内置） | 2.0（`@module-federation/*`） |
|------|----------------------|-------------------------------|
| 构建器 | 仅 Webpack 5 | Webpack / Rspack / **Vite** / Rollup / Rsbuild / Esbuild / Metro 均可 |
| 插件体系 | 无（纯配置） | **Runtime Plugin System**（`runtimePlugins`），可在运行时拦截/扩展 |
| 类型安全 | 远程模块无类型 | `mf dts` 自动生成/拉取远程模块 `.d.ts` |
| 共享依赖 | 静态 `shared` | 更智能的共享 + `sharedStrategy`，支持 `singleton`/`requiredVersion`/`eager` |
| 运行时 | 编译期注入到 `remoteEntry.js` | 独立 `@module-federation/runtime`，支持**运行时动态注册 remote** |
| 产物描述 | 仅靠 `remoteEntry.js` | 额外产出 **Manifest**（运行时可被工具消费） |

### 关键新概念

+ **Federation Runtime**：独立运行时包，可在代码里动态注册/加载 remote，不必写死在配置里
+ **Runtime Plugins**：`runtimePlugins` 字段注入插件，能做加载重试、缓存、监控等
+ **Manifest**：构建产物清单，配套 Chrome Devtool 做可视化调试
+ **动态类型提示**：`@module-federation/dts-plugin` + `mf dts` 命令，消费方可拿到远程模块类型

### 在 Vite 下使用（官方包：`@module-federation/vite`）

> 这是 2.0 解决「MF 只能 Webpack」痛点的关键。配置与 1.0 概念一致，但导入的是 `@module-federation/vite` 的 `federation`。

+ 安装

  ```bash
  npm i @module-federation/vite -D
  ```

+ 推荐把 MF 配置抽到独立文件（`createModuleFederationConfig`）

  ```ts
  // module-federation.config.ts
  import { createModuleFederationConfig } from '@module-federation/vite'

  export default createModuleFederationConfig({
    name: 'remote',
    filename: 'remoteEntry.js',
    exposes: {
      './remote-app': './src/App.vue',
    },
    shared: ['vue'],
  })
  ```

+ remote（提供方）

  ```ts
  // remote/vite.config.ts
  import { defineConfig } from 'vite'
  import { federation } from '@module-federation/vite'
  import moduleFederationConfig from './module-federation.config'

  export default defineConfig({
    plugins: [federation(moduleFederationConfig)],
    server: {
      // 必须显式设置 origin，否则 remoteEntry 里的资源地址会错
      origin: 'http://localhost:8081',
    },
  })
  ```

+ host（消费方）

  ```ts
  // host/vite.config.ts
  import { defineConfig } from 'vite'
  import { federation } from '@module-federation/vite'

  export default defineConfig({
    plugins: [
      federation({
        name: 'host',
        remotes: {
          remote: {
            type: 'module', // Vite remote 推荐 'module'；兼容老 'var' 需对方开 varFilename
            name: 'remote',
            entry: 'http://localhost:8081/remoteEntry.js',
            shareScope: 'default',
          },
        },
        shared: ['vue'],
      }),
    ],
  })
  ```

+ 消费远程模块

  ```ts
  const RemoteApp = () => import('remote/remote-app')
  ```

### 运行时动态注册（Runtime 用法）

> 不需要在构建配置里写死 `remotes` 时，用 `@module-federation/runtime` 在运行时注册。

  ```ts
  import { init, loadRemote } from '@module-federation/runtime'

  init({
    name: 'host',
    remotes: [
      { name: 'app2', entry: 'http://localhost:8082/remoteEntry.js' },
    ],
  })

  // 任意位置按需加载
  const mod = await loadRemote('app2/Button')
  ```

### 与 1.0 互通

+ 2.0 的 Vite remote 默认产出 ESM（`type: 'module'`）；要被 Webpack 5（1.0）host 消费，需在 remote 配 `varFilename`，host 侧 `type: 'var'`
+ `@originjs/vite-plugin-federation`（1.4.x）是社区对 1.0 协议的 Vite 实现，与 2.0 协议大体兼容但**无 runtime 插件/类型安全**，迁移到 2.0 官方包需复查动态 remote、共享依赖、混合构建器场景

## 应用间通信

### qiankun - initGlobalState

  ```js
  // 主应用
  import { initGlobalState } from 'qiankun'
  const actions = initGlobalState({ user: 'admin' })

  actions.onGlobalStateChange((state, prev) => {
    console.log('状态变更:', state, prev)
  })

  actions.setGlobalState({ user: 'guest' })
  ```

  ```js
  // 子应用 mount(props) 中
  export async function mount(props) {
    props.onGlobalStateChange((state) => {
      console.log('收到全局状态:', state)
    }, true)
  }
  ```

### micro-app - dispatch / addDataListener

  ```js
  // 子应用发送
  window.microApp.dispatch({ count: 1 })

  // 基座接收
  const app = document.querySelector('micro-app[name="vue-app"]')
  app.addDataListener((data) => console.log(data))
  ```

### 通用方案

+ **CustomEvent** — 跨应用事件总线，不依赖框架
+ **URL 参数** — 路由传参，适合简单数据
+ **共享存储** — localStorage / sessionStorage，需注意同步问题

## JS 沙箱原理

### Proxy 沙箱（qiankun 默认）

  ```js
  // 简化版 Proxy 沙箱
  class ProxySandbox {
    constructor() {
      this.proxy = null
      this.fakeWindow = Object.create(null)
      const rawWindow = window

      this.proxy = new Proxy(this.fakeWindow, {
        get(target, key) {
          // 优先从 fakeWindow 取，取不到从真实 window 取
          return key in target ? target[key] : rawWindow[key]
        },
        set(target, key, value) {
          target[key] = value
          return true
        },
      })
    }

    active() {
      // 将子应用的 window 指向 proxy
    }

    inactive() {
      // 恢复，子应用的修改不影响全局
    }
  }
  ```

+ **多实例沙箱**：每个子应用独立的 fakeWindow，互不影响
+ **快照沙箱**（兼容模式）：激活时记录 window 快照，卸载时恢复

## CSS 隔离方案

+ **Shadow DOM** — 天然隔离，但事件冒泡和第三方 UI 库有兼容问题
+ **CSS Scoped / BEM** — 约定命名空间，简单但靠自觉
+ **CSS Modules** — 编译时生成唯一类名
+ **qiankun strictStyleIsolation** — 使用 Shadow DOM
+ **qiankun experimentalStyleIsolation** — 给所有样式加前缀选择器（类似 Angular 方案）

## 常见问题

### 子应用静态资源加载失败

+ 原因：子应用的 publicPath 未正确设置
+ 解决：设置 `__webpack_public_path__` 或 vite 的 `base` 为运行时动态路径

### 路由冲突

+ 主应用和子应用的路由 base 不能重叠
+ 子应用路由模式建议用 `history`，base 设置为 `activeRule` 对应路径

### 样式污染

+ 全局样式（如 reset.css、UI 库全局样式）容易穿透沙箱
+ 解决：子应用避免写全局样式，或使用 Shadow DOM 隔离

## 状态保持（实战经验）

微前端的状态保持是工作中最容易踩坑的地方。子应用切换时组件卸载，状态默认丢失。

### 状态分类与策略

| 状态类型 | 生命周期 | 推荐方案 |
|---------|---------|---------|
| 路由状态 | 需跨刷新 | URL 参数 / History API |
| 用户态 / Token | 需跨刷新 + 跨应用 | 全局状态 + localStorage |
| 业务数据（列表、详情） | 子应用内 | 子应用 store + sessionStorage 兜底 |
| 跨应用共享数据 | 跨应用实时同步 | initGlobalState / CustomEvent |
| 表单草稿 | 子应用切换不丢 | sessionStorage 或 keep-alive |

### 场景一：子应用切换后回来，表单数据丢了

+ **问题**：用户在 A 子应用填了一半表单，切到 B 子应用再切回来，表单空了
+ **原因**：子应用卸载时组件销毁，组件内 `ref()`/`reactive()` 状态丢失
+ **解决**：

  ```js
  // 方案 1：表单数据实时存 sessionStorage
  const formKey = `draft_${appName}_${route.path}`

  // 初始化时恢复
  const saved = sessionStorage.getItem(formKey)
  if (saved) Object.assign(formData, JSON.parse(saved))

  // 表单变化时保存（加防抖）
  watch(formData, (val) => {
    sessionStorage.setItem(formKey, JSON.stringify(val))
  }, { deep: true })

  // 提交成功后清除
  function onSubmit() {
    sessionStorage.removeItem(formKey)
  }
  ```

  ```vue
  <!-- 方案 2：wujie 直接用 keepAlive，子应用不销毁 -->
  <WujieVue name="app-a" url="http://localhost:8081" :alive="true" />
  ```

### 场景二：登录态 / Token 跨子应用共享

+ **问题**：主应用登录后，子应用拿不到 Token；或者 Token 刷新了子应用还在用旧的
+ **解决**：

  ```js
  // 主应用：全局状态管理 Token
  const actions = initGlobalState({
    token: localStorage.getItem('token'),
    userInfo: JSON.parse(localStorage.getItem('userInfo') || '{}'),
  })

  // Token 刷新后同步
  async function refreshToken() {
    const { token } = await api.refresh()
    localStorage.setItem('token', token)
    actions.setGlobalState({ token }) // 通知所有子应用
  }

  // 子应用：监听 Token 变化
  export async function mount(props) {
    // 拿到初始 Token
    const { token } = props.getGlobalState()
    axios.defaults.headers.Authorization = `Bearer ${token}`

    // 监听后续变化
    props.onGlobalStateChange((state) => {
      axios.defaults.headers.Authorization = `Bearer ${state.token}`
    })
  }
  ```

+ **注意**：Token 过期时的刷新竞争问题 — 多个子应用同时发现 401，不能每个都去刷新。用 Promise 单例或全局锁：

  ```js
  // 共享的 refreshToken Promise，避免并发刷新
  let refreshPromise = null
  function sharedRefresh() {
    if (!refreshPromise) {
      refreshPromise = refreshToken().finally(() => {
        refreshPromise = null
      })
    }
    return refreshPromise
  }
  ```

### 场景三：子应用 A 改了数据，子应用 B 没更新

+ **问题**：A 子应用里修改了用户信息，切到 B 子应用还是旧数据
+ **解决**：

  ```js
  // 方案 1：CustomEvent 事件总线（框架无关）
  // 子应用 A 修改后发布
  window.dispatchEvent(new CustomEvent('user:updated', {
    detail: { name: '新名字', avatar: '...' }
  }))

  // 子应用 B 监听
  window.addEventListener('user:updated', (e) => {
    store.commit('UPDATE_USER', e.detail)
  })

  // 方案 2：qiankun initGlobalState
  actions.setGlobalState({ userInfo: newUserInfo })
  // 所有监听的子应用自动收到
  ```

+ **注意**：子应用卸载时记得 `removeEventListener`，否则内存泄漏

### 场景四：页面刷新后状态全丢

+ **问题**：全局状态存在内存里，刷新后子应用拿到的是空值
+ **解决**：全局状态 + localStorage 双写

  ```js
  // 封装一个带持久化的全局状态
  function createPersistedState(key, initial) {
    const saved = localStorage.getItem(key)
    const state = saved ? JSON.parse(saved) : initial

    const actions = initGlobalState(state)

    // 每次变更自动持久化
    actions.onGlobalStateChange((newState) => {
      localStorage.setItem(key, JSON.stringify(newState))
    })

    return actions
  }

  const globalState = createPersistedState('app:global', {
    token: '',
    userInfo: {},
    permissions: [],
  })
  ```

### 场景五：子应用加载顺序 & 状态竞争

+ **问题**：子应用 mount 时主应用的全局状态还没准备好（比如权限列表还没拉完）
+ **解决**：

  ```js
  // 子应用 mount 时等全局状态 ready
  export async function mount(props) {
    const state = props.getGlobalState()

    if (!state.permissions?.length) {
      // 等主应用准备好
      await new Promise((resolve) => {
        props.onGlobalStateChange((s) => {
          if (s.permissions?.length) resolve()
        })
      })
    }

    // 此时权限数据已就绪，正常渲染
    render(props)
  }
  ```

### 实战总结

```
状态保持决策树：

  需要跨刷新吗？
  ├── 是 → localStorage / sessionStorage / URL
  └── 否 → 内存就行
        │
        需要跨应用吗？
        ├── 是 → initGlobalState / CustomEvent
        └── 否 → 子应用自己的 store
              │
              切换回来需要保留吗？
              ├── 是 → sessionStorage 兜底 / keepAlive
              └── 否 → 不管，让它重建
```

## 微前端 × Vite 兼容性问题

> 版本说明：截至 2026-08。Vite 走原生 ESM（`<script type="module">`），与「基于 Webpack 打包 / 快照沙箱 / SystemJS」的传统微前端方案存在根本性摩擦。下面按方案梳理真实坑点与官方现状。

### 为什么会有兼容性问题

+ **模块格式差异**：qiankun 1.x / 传统方案大多假设子应用被打包成 IIFE / UMD，并在一个被劫持的 `window`（Proxy 沙箱）里 `eval` 执行；Vite dev 下是原生 ESM，模块通过 `import` 加载，沙箱劫持 `window` 对 ESM 行为影响不一致
+ **`import.meta` / `import()` 动态导入**：Vite 的 HMR、裸模块（`import vue from 'vue'`）走 dev server 重写，被沙箱包裹时路径/作用域容易出错
+ **`document.currentScript` / `publicPath`**：Vite 不用 `__webpack_public_path__`，子应用资源定位逻辑要改

### 各方案在 Vite 下的真实情况

| 方案 | Vite 支持现状（官方口径） | 注意点 |
|------|--------------------------|--------|
| **qiankun** | **2.x（next 分支）原生支持 Vite 5+**，通过 `@qiankunjs/bundler-plugin` 的 Vite 插件；子应用以原生 ESM 运行在 qiankun 的 ESM 沙箱里，经 import maps 路由，**不再需要 SystemJS 转换** | 1.x 时代需社区 `vite-plugin-qiankun`（仅 1.0.15，长期未维护），2.x 已官方化；1.x 接 Vite 坑最多（dev 白屏、样式丢失） |
| **micro-app** | 基于 WebComponent 容器，对 Vite 友好（官方文档站本身就是 VitePress）；子应用 `vite.config` 基本照常，无需特殊打包格式 | 注意子应用 `vite.config` 的 `base` 设为基座下挂载路径，dev 下 `@micro-zoe/micro-app` 直接 fetch ESM 即可 |
| **wujie** | 官方明确「支持 vite 框架」；子应用 JS 跑在 iframe 沙箱、DOM 渲染在基座 WebComponent，天然隔离与构建器无关 | 子应用 Vite 配置照常，挂载到基座用 `<WujieVue :url>` 即可 |
| **Module Federation** | 1.0 只能 Webpack 5；Vite 下用社区 `@originjs/vite-plugin-federation`（1.4.x，兼容 1.0 协议）；**2.0 有官方 `@module-federation/vite`**，原生支持 | 见上「Module Federation 2.0」节 |

### qiankun 2.x + Vite 标准接法（官方）

> 子应用直接 export 生命周期，不再手写 `window.__POWERED_BY_QIANKUN__` 那套 UMD 包装。

+ 主应用 / 子应用安装构建插件

  ```bash
  npm i @qiankunjs/bundler-plugin -D
  ```

+ 子应用 `vite.config.ts`

  ```ts
  import { defineConfig } from 'vite'
  import { qiankun } from '@qiankunjs/bundler-plugin/vite'

  export default defineConfig({
    plugins: [qiankun()], // 自动给 dev/preview 加 CORS、给入口 script 打 entry 标记
    server: {
      cors: true, // 主应用跨域拉入口 HTML / 模块图需要
    },
  })
  ```

+ 子应用入口直接导出生命周期（dev 独立运行也正常）

  ```ts
  export async function bootstrap() {}
  export async function mount(props) {
    // render into props.container
  }
  export async function unmount(props) {
    // tear down
  }
  ```

+ 主应用 `registerMicroApps` 写法与 1.x 一致，`entry` 指向子应用 dev/preview 地址

### 1.x 时代接 Vite 的典型坑（历史参考，新项目请用 2.x）

+ **dev 白屏 / `strictOrigin` 报错**：Vite dev server 没开 CORS，主应用跨域拉不到模块图 → 子应用 `server.cors = true`
+ **`import.meta.env` / 动态 `import()` 在沙箱里失效**：1.x Proxy 沙箱 + Vite ESM 冲突，社区 `vite-plugin-qiankun` 用 `vite` 模式改写入口解决，但仍脆弱
+ **`__webpack_public_path__` 无效**：Vite 不用该变量，资源定位要靠 `base` 或运行时路径
+ **生产构建格式**：1.x 子应用需打成能被 `import-html-entry` 解析的格式，Vite 默认 ESM 产物需额外处理

### 选型建议

+ 新项目想用 qiankun + Vite → **直接用 qiankun 2.x + `@qiankunjs/bundler-plugin`**，别碰已停更的 `vite-plugin-qiankun`
+ 隔离性优先、不想折腾沙箱 → micro-app / wujie 对 Vite 更「无感」
+ 走模块共享（不是应用级加载）→ Module Federation 2.0 的 `@module-federation/vite` 才是正解，不要拿 1.0 + Vite 硬凑
