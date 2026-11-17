# 微前端

> 版本锚点（2026-11，npm registry）：`single-spa@6.0.3` · `qiankun@2.10.x` · `garfish@1.19.x`。
> qiankun **3.x** 文档已在 [qiankunjs.com](https://www.qiankunjs.com/) 推进（样式改 `@scope`、移除 `initGlobalState` 等），但 npm 稳定版仍以 2.x 为主；下文默认按 2.x 写，3.x 差异单独标注。

## 什么是微前端

+ 将一个大型前端应用拆分成多个**独立开发、独立部署、独立运行**的子应用，再由一个主应用（基座）统一加载和调度
+ 核心价值：技术栈无关、独立部署、增量升级
+ 常见链路：`single-spa`（生命周期调度底座）→ 工程化封装（`qiankun` / `Garfish` 等）→ 另路隔离方案（`wujie` / `micro-app`）→ 模块级共享（`Module Federation`）

## 主流方案对比

| 方案 | 原理 | 隔离性 | 技术栈限制 | 适用场景 |
|------|------|--------|-----------|---------|
| **single-spa** | 注册应用 + activity 函数调度生命周期 | 不自带沙箱（需自建或上层框架） | 无 | 自研基座、理解底层调度 |
| **qiankun** | 基于 single-spa，JS 沙箱 + CSS 隔离 | 中（Proxy / 快照沙箱） | 无 | 企业级后台、老系统改造 |
| **Garfish** | Loader + Router + VM/快照沙箱 + Store/Channel | 中高（默认 VM；`strictIsolation` 走 Shadow DOM） | 官方主推 UMD 产物 | 多团队后台、要多实例 / 预加载 |
| **micro-app** | WebComponent 容器 | 高（Shadow DOM） | 无 | 京东体系、组件化思维 |
| **wujie** | iframe + WebComponent | 高（iframe 天然隔离） | 无 | 对隔离性要求高的场景 |
| **Module Federation** | Webpack 5 模块共享（1.0）/ 多构建器运行时共享（2.0） | 低（共享运行时） | 1.0 需 Webpack 5；2.0 无构建器限制 | 同技术栈、模块共享 |

## single-spa（底座）

> 官方：[Configuring single-spa](https://single-spa.js.org/docs/configuration/) · [Applications API](https://single-spa.js.org/docs/api/) · [Building applications](https://single-spa.js.org/docs/building-applications/)

+ **只做调度**：何时 load / bootstrap / mount / unmount；**不负责** JS/CSS 沙箱、HTML entry 解析
+ 子应用入口必须导出生命周期：`bootstrap`、`mount`、`unmount`（可选 `unload`）；每个都必须返回 Promise 或写成 async
+ qiankun 在它之上补了 HTML entry、沙箱、样式隔离、全局状态等工程能力

### 根配置注册

```js
import { registerApplication, start } from 'single-spa'

registerApplication({
  name: 'app1',
  app: () => import('./apps/app1.js'), // 或 System.import('app1')
  activeWhen: '/app1', // 也可用 (location) => boolean，或数组
  customProps: { authToken: 'x' }, // 传入各生命周期
})

// 可先 register 再延后 start：先下载代码，等用户信息就绪再挂载
start()
```

### 子应用生命周期

```js
// apps/app1.js
let dom = null

export async function bootstrap() {}

export async function mount(props) {
  dom = document.createElement('div')
  ;(props.domElement || document.getElementById('app')).appendChild(dom)
  dom.textContent = `hello ${props.authToken ?? ''}`
}

export async function unmount() {
  dom?.remove()
  dom = null
}
```

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

> 官方：[生命周期](https://micro-zoe.github.io/doc/zh/life-cycles.html) · [样式隔离](https://micro-zoe.github.io/doc/zh/scopecss.html) · [配置项](https://micro-zoe.github.io/doc/v0/zh/configure.html)

+ 以自定义元素 `<micro-app>` 嵌入子应用；默认 **JS 沙箱 + scopecss**（按 `name` 给选择器加前缀）
+ 组件化心智：一个标签一个子应用，适合「页面里嵌一块别的系统」

### 主应用

```js
import microApp from '@micro-zoe/micro-app'

microApp.start({
  // lifeCycles: { mounted(e) {}, unmount(e) {} }, // 全局钩子可选
})
```

```html
<micro-app
  name="vue-app"
  url="http://localhost:8081/"
  baseroute="/vue-app"
  @created="onCreated"
  @mounted="onMounted"
  @unmount="onUnmount"
  @error="onError"
></micro-app>
```

+ 生命周期：`created` → `beforemount` → `mounted` → `unmount`（致命错误才 `error`）
+ React 监听自定义事件需官方 `jsx-custom-event` polyfill；Vue 用 `@mounted` 即可
+ 子应用路由：history 子应用读 `window.__MICRO_APP_BASE_ROUTE__` 作 basename；基座 history + 子应用 hash 时常可不设

### 隔离与保活

| 能力 | 默认 | 说明 |
|------|------|------|
| scopecss | 开 | `micro-app[name=xx] .cls`；主→子仍可能污染，靠约定/CSS Modules |
| JS 沙箱 | 开 | `disableSandbox` 会连带关掉样式/元素隔离与路径补全，慎用 |
| shadowDOM | 关 | 更强隔离，但 React/部分 UI 库兼容差；开启后默认 scopecss 失效 |
| keep-alive | 关 | 卸载进缓存保状态；与 `destroy` 同开时 keep-alive 失效 |

```html
<!-- 要强隔离且能接受适配成本 -->
<micro-app name="vue-app" url="..." shadowDOM></micro-app>
<!-- 卸载清空缓存资源 -->
<micro-app name="vue-app" url="..." destroy></micro-app>
```

### 子应用通讯与卸载

```js
window.microApp?.addDataListener((data) => {
  console.log('from host', data)
})
window.microApp?.dispatch({ type: 'from-child', payload: 'hello' })

window.onunmount = () => {
  // 清定时器、解绑，避免保活/重挂泄漏
}
```

## wujie（无界）

> 官方：[通信](https://wujie-micro.github.io/doc/guide/communication.html) · [`$wujie`](https://wujie-micro.github.io/doc/api/wujie.html)

+ 原理：**JS 跑在同域 iframe**（天然 Window 隔离），**DOM 渲染到基座 WebComponent / Shadow**——隔离性高、体感接近组件
+ 适合：子应用技术栈杂、样式/全局变量冲突多、又不愿深度改子应用构建

### 接入（Vue 3）

```vue
<template>
  <WujieVue
    name="vue-app"
    :url="url"
    :props="{ token }"
    :alive="true"
    width="100%"
    height="100%"
  />
</template>

<script setup>
import WujieVue from 'wujie-vue3'
const url = 'http://localhost:8081/'
const token = '...'
</script>
```

```bash
npm i wujie-vue3 -S
```

+ `:alive="true"`：切换不销毁，状态保持（对照 qiankun 保活 / micro-app keep-alive）
+ 子应用用 Vite 时，`window.location.host` 可能仍是主应用；读真实地址用 `window.$wujie.location`（官方变量说明）

### 隔离与通讯要点

| 点 | 做法 |
|----|------|
| 样式 | 落在 `$wujie.shadowRoot`；弹层挂 body 的组件要改挂载容器 |
| props | 主应用 `:props` → 子应用 `window.$wujie.props` |
| bus | 主 `WujieVue.bus.$emit/$on`；子 `$wujie.bus`；组件内 `$on` 要在 unmount `$off` |
| window | 同域可 `iframe.contentWindow` / `parent`，耦合高，优先 bus |

详细 API 示例见下文「应用间通信 · wujie」。

## Garfish（字节）

> 官方：[快速开始](https://www.garfishjs.org/guide/quick-start/start.html) · [沙箱](https://www.garfishjs.org/guide/concept/sandbox.html) · [Garfish.channel](https://www.garfishjs.org/api/channel.html)
> npm：`garfish@1.19.x`（2026-11）

+ 头条号场景演进的微前端方案；核心模块：Loader（HTML/JS entry）、Router、Sandbox、Store/Channel、插件
+ 支持路由驱动（`activeWhen`）与手动 `Garfish.loadApp`；可多实例；默认 **VM 沙箱**（`snapshot: false`）

### 主应用

```js
import Garfish from 'garfish'

Garfish.run({
  basename: '/',
  domGetter: '#subApp', // 挂载点须常驻，否则 Invalid domGetter
  apps: [
    {
      name: 'react',
      activeWhen: '/react',
      entry: 'http://localhost:3000', // HTML entry
      props: { msg: 'from host' },
    },
    {
      name: 'vue',
      activeWhen: '/vue',
      entry: 'http://localhost:8080/index.js', // JS entry
    },
  ],
  sandbox: {
    snapshot: false, // false=VM（默认可多实例）；true=快照（不能多实例、难隔离主/子）
    strictIsolation: false, // true 时容器走 Shadow DOM closed，查询/插入限制在作用域内
  },
})
```

### 子应用要点

+ 官方主推 **UMD** 产物：`libraryTarget: 'umd'`、`globalObject: 'window'`、资源 `publicPath` 用绝对地址、开发态 CORS
+ 入口导出 `provider`（`render` / `destroy`）；React 推荐 `@garfish/bridge-react`（v18 用 `@garfish/bridge-react-v18`）
+ 子应用路由要接主应用下发的 `basename`

```js
// 手写 provider（示意）
export const provider = () => ({
  render({ dom, basename, props }) {
    // 挂到 dom 内，Router 设置 basename
  },
  destroy({ dom }) {
    // 卸载框架根节点
  },
})
```

### 手动加载 / 缓存

```js
const app = await Garfish.loadApp('vue-app', {
  domGetter: '#container',
  entry: 'http://localhost:3000',
  cache: true,
})
app.mounted ? app.show() : await app.mount()
```

+ `cache: true` 时二次进入走 `show`（复用执行上下文，只再跑 `render`），性能更好但闭包副作用会残留——官方文档有专门说明

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

先按「协议形态」选型，再套各框架 API：

| 形态 | 适用 | 注意 |
|------|------|------|
| **props 下发** | 初始化配置、注入方法、Token | 多为一次性/随挂载传入；更新要靠框架二次机制或事件 |
| **全局状态 / Store** | 跨子应用共享用户态 | qiankun 2.x 有 `initGlobalState`；3.x 官方改为自行经 props 传 store |
| **事件总线** | 松耦合通知（登录、刷新列表） | 卸载时要 off，防泄漏 |
| **CustomEvent / URL / storage** | 框架无关兜底 | storage 无实时性；URL 只适合少量可序列化数据 |

### qiankun 2.x - initGlobalState / props

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

+ 3.x：内置全局状态 API 已移除，官方建议把自有 store 经 props 传入（见 [Migrating from 2.x](https://www.qiankunjs.com/cookbook/migrate-from-2x)）

### micro-app - dispatch / addDataListener

  ```js
  // 子应用发送
  window.microApp.dispatch({ count: 1 })

  // 基座接收
  const app = document.querySelector('micro-app[name="vue-app"]')
  app.addDataListener((data) => console.log(data))
  ```

### wujie - props / bus / window

> 官方：[通信](https://wujie-micro.github.io/doc/guide/communication.html)

  ```vue
  <!-- 主应用 props -->
  <WujieVue name="vue-app" url="http://localhost:8081" :props="{ user }" />
  ```

  ```js
  // 子应用读 props
  const props = window.$wujie?.props

  // 主应用 bus（wujie-vue3）
  import WujieVue from 'wujie-vue3'
  const { bus } = WujieVue
  bus.$on('user:logout', handler)
  bus.$emit('user:logout', payload)

  // 子应用 bus
  window.$wujie?.bus.$on('user:logout', handler)
  window.$wujie?.bus.$emit('user:logout', payload)
  ```

+ 同域 iframe 还可 `iframe.contentWindow` / `window.parent` 直连；组件内 `$on` 要在 unmount 时 `$off`（保活销毁时框架会清订阅，组件反复挂载仍需自己配对）

### Garfish - props / channel

> 官方：[Garfish.channel](https://www.garfishjs.org/api/channel.html)（EventEmitter2）

  ```js
  // 主应用：注册时 props；运行时 channel
  Garfish.run({
    apps: [{ name: 'vue-app', entry: '...', props: { msg: 'hello' } }],
  })
  window.Garfish.channel.emit('login', { name: 'alice' })

  // 子应用：provider 收到 props；channel 监听
  window.Garfish?.channel.on('login', (userInfo) => {
    console.log(userInfo.name)
  })
  // 卸载时 removeListener，避免泄漏
  ```

### 通用方案

+ **CustomEvent** — 跨应用事件总线，不依赖框架
+ **URL 参数** — 路由传参，适合简单数据
+ **共享存储** — localStorage / sessionStorage，需注意同步问题

## JS 沙箱原理

### 各方案怎么隔离 JS

| 方案 | 机制 | 多实例 | 备注 |
|------|------|--------|------|
| single-spa | 无内置沙箱 | — | 需自建或叠 qiankun/Garfish |
| qiankun | Proxy 沙箱（默认）/ 快照沙箱 | Proxy 可；快照难 | 2.x 文档见官网 API `sandbox` |
| Garfish | 默认 VM；可选快照；可关沙箱 | VM 可；快照不可 | 快照无法隔离主/子；ESM 需插件且有性能代价 |
| wujie | iframe 独立 Window | 天然 | DOM 在主文档 WebComponent / Shadow |
| micro-app | WebComponent + 运行时隔离 | 高 | 以组件方式嵌入 |

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
+ Garfish 还会收集 `setInterval` / `addEventListener` 等副作用，卸载时 `recover`；持久化存储靠命名空间改写（见官方沙箱文）

## CSS 隔离方案

### 通用手段

+ **Shadow DOM** — 天然隔离，但事件冒泡和第三方 UI 库（弹层挂 `body`）常要适配
+ **CSS Scoped / BEM / CSS Modules** — 工程约定或编译期改名，简单但靠自觉 / 构建链
+ **运行时改写选择器 / `@scope`** — 基座在加载时给规则加容器前缀

### 各框架

| 方案 | 做法 | 出处 |
|------|------|------|
| qiankun **2.x** | `sandbox.strictStyleIsolation` → Shadow DOM；`experimentalStyleIsolation` → 选择器加 `div[data-qiankun-appName]` 前缀（`@keyframes` 等不改写） | [qiankun API](https://qiankun.umijs.org/zh/api/) |
| qiankun **3.x** | 上述两项移除；`sandbox.styleIsolation: true` 用原生 CSS `@scope ([data-name="app"])` | [样式隔离](https://www.qiankunjs.com/zh-CN/internals/style-isolation) |
| Garfish | 默认收集/卸载样式副作用；多实例仍可能互染 → `strictIsolation: true`（Shadow DOM closed）或 `@garfish/css-scope` 等插件 | [沙箱机制](https://www.garfishjs.org/guide/concept/sandbox.html) |
| wujie | 子应用样式落在 Shadow 容器（`$wujie.shadowRoot`） | 官方变量说明 |
| micro-app | WebComponent / Shadow DOM 容器隔离 | 方案定位即组件化隔离 |

## 常见问题

### 子应用静态资源加载失败

+ 原因：子应用的 publicPath 未正确设置
+ 解决：设置 `__webpack_public_path__` 或 vite 的 `base` 为运行时动态路径
+ 另一类原因是**版本漂移**（与 publicPath 无关）：子应用独立发版、宿主旧 tab / entry 缓存仍引用子应用旧 chunk，懒加载 404 被 SPA 回退吞成 HTML → MIME 报错。链路排查与客户端兜底见 [懒加载 chunk 版本漂移](/notes/ops/lazy-chunk-version-drift)

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
| **single-spa** | 本身不绑构建器；子应用用 SystemJS / 原生 import / UMD 均可 | 兼容性取决于你怎么实现 `app` 加载函数 |
| **qiankun** | **2.x（next 分支）原生支持 Vite 5+**，通过 `@qiankunjs/bundler-plugin` 的 Vite 插件；子应用以原生 ESM 运行在 qiankun 的 ESM 沙箱里，经 import maps 路由，**不再需要 SystemJS 转换** | 1.x 时代需社区 `vite-plugin-qiankun`（仅 1.0.15，长期未维护），2.x 已官方化；1.x 接 Vite 坑最多（dev 白屏、样式丢失） |
| **Garfish** | 官方主推 UMD；有 Vite 接入指南；ESM 进 VM 沙箱需 `@garfish/es-module`（有性能代价），也可关沙箱 | 新 Vite 子应用要单独评估沙箱策略 |
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

+ 要自己控调度、先理解生命周期 → 从 **single-spa** 看底座，再决定是否上 qiankun/Garfish
+ 新项目想用 qiankun + Vite → **直接用 qiankun 2.x + `@qiankunjs/bundler-plugin`**，别碰已停更的 `vite-plugin-qiankun`；盯紧 3.x 迁移（全局状态、样式 API 会变）
+ 要多实例、预加载、字节系文档习惯 → **Garfish**；Vite/ESM 子应用先确认沙箱策略
+ 隔离性优先、不想折腾沙箱 → micro-app / wujie 对 Vite 更「无感」
+ 走模块共享（不是应用级加载）→ Module Federation 2.0 的 `@module-federation/vite` 才是正解，不要拿 1.0 + Vite 硬凑
