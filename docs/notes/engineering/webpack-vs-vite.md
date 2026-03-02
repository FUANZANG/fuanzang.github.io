# Webpack vs Vite

## 开发服务器

| | Webpack | Vite |
|---|---------|------|
| **启动方式** | 打包全部模块 → 启动服务器 | 启动服务器 → 按需编译 |
| **冷启动** | 慢（3-30s，项目越大越慢） | 快（200-500ms，与项目大小无关） |
| **HMR** | 重新编译受影响模块，随项目增长变慢 | 基于 ESM，只更新变更模块，速度稳定 |
| **底层工具** | Webpack 自身 | esbuild（预构建） + Rollup（生产构建） |

## 原理差异

```
Webpack 开发流程：
  源码 → 解析依赖 → 全部编译 → 打包成 bundle → 启动服务器 → 浏览器请求

Vite 开发流程：
  启动服务器 → 浏览器请求某个模块 → 只编译这个模块 → 返回给浏览器
               ↓
  利用浏览器原生 ESM（<script type="module">）
```

+ **Webpack**：先打包再服务（bundle first），所有模块都要经过编译才能运行
+ **Vite**：利用浏览器原生 ESM，模块按需请求、按需编译（native ESM + on-demand）

## 依赖处理

| | Webpack | Vite |
|---|---------|------|
| **node_modules** | 全部参与打包编译 | 用 esbuild 预构建为 ESM，缓存结果 |
| **CommonJS 兼容** | 原生支持 | 预构建阶段转换为 ESM |
| **热更新粒度** | 模块级，但受依赖图影响 | 精确到单个模块，边界清晰 |

## 生产构建

| | Webpack | Vite |
|---|---------|------|
| **打包工具** | Webpack 自身 | Rollup |
| **Tree Shaking** | 支持（需配置） | 原生支持，更彻底 |
| **代码分割** | splitChunks 配置灵活 | 基于 Rollup，配置更简洁 |
| **生态插件** | 非常丰富，积累多年 | 快速增长中，主流场景已覆盖 |
| **配置复杂度** | 高（loader + plugin 体系庞大） | 低（开箱即用，约定大于配置） |

## 适用场景

| 场景 | 推荐 | 原因 |
|------|------|------|
| 新项目 | **Vite** | 开箱即用，开发体验好 |
| 老项目迁移 | **Webpack** | 生态成熟，渐进式迁移风险低 |
| 大型 monorepo | 看情况 | Webpack 的 Module Federation 更成熟；Vite 生态在追赶 |
| 微前端 | 都行 | Webpack 有 Module Federation；Vite 可用 vite-plugin-federation |
| 需要高度定制 | **Webpack** | 插件体系更强大，几乎能控制编译的每个阶段 |
| SSR / 框架集成 | **Vite** | Nuxt 3、Astro、SvelteKit 等默认使用 Vite |

## 迁移注意事项（Webpack → Vite）

+ Vite 不支持 `require()`，必须用 ES Module（`import`/`export`）
+ Webpack 特有的 `require.context` 需要用 `import.meta.glob` 替代：

  ```js
  // Webpack
  const modules = require.context('./views', true, /\.vue$/)

  // Vite
  const modules = import.meta.glob('./views/**/*.vue', { eager: true })
  ```

+ 环境变量：Webpack 用 `process.env`，Vite 用 `import.meta.env`：

  ```js
  // Webpack
  console.log(process.env.NODE_ENV)
  console.log(process.env.VUE_APP_API_URL)

  // Vite
  console.log(import.meta.env.MODE)
  console.log(import.meta.env.VITE_API_URL) // 前缀必须是 VITE_
  ```

+ 全局变量：Webpack 用 `DefinePlugin`，Vite 内置 `define` 配置项：

  ```js
  // Vite
  export default defineConfig({
    define: {
      __APP_VERSION__: JSON.stringify('1.0.0'),
    },
  })
  ```

+ CSS 预处理：都支持，但 Vite 需要手动安装 `sass`/`less` 等依赖
+ `path` 相关：Webpack 有 `require.resolve`、`__dirname` 等，Vite 中需使用 `import.meta.url` 或 Node ESM 的 `fileURLToPath`

## 性能对比（参考值）

| 指标 | Webpack 5 | Vite |
|------|-----------|------|
| 冷启动（中型项目） | 10-20s | 200-500ms |
| HMR 响应 | 200ms-2s | 50-200ms |
| 生产构建 | 30-90s | 15-40s |
| 配置文件行数 | 通常 100+ | 通常 30-50 |

+ 以上数据为参考值，实际取决于项目规模、插件数量和硬件配置
