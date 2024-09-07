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
| **Module Federation** | Webpack 5 模块共享 | 低（共享运行时） | 需 Webpack 5 | 同技术栈、模块共享 |

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
