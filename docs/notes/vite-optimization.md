# Vite 性能优化

## 开发时优化

### 依赖预构建（Dep Pre-bundling）

+ Vite 使用 esbuild 将 CommonJS/UMD 依赖转为 ESM，首次启动时需要扫描和转换
+ 优化：手动指定需要预构建的依赖，减少自动扫描开销

  ```js
  // vite.config.js
  export default defineConfig({
    optimizeDeps: {
      // 强制预构建指定依赖（默认 Vite 自动检测）
      include: ['vue', 'vue-router', 'axios', 'lodash-es'],

      // 排除某些依赖不预构建
      exclude: ['@my-local-pkg'],

      // 预构建时使用的 esbuild 配置
      esbuildOptions: {
        target: 'es2020',
      },
    },
  })
  ```

+ **效果**：冷启动从几秒降到几百毫秒

### 路由懒加载 & 动态导入

+ Vite 开发时只转换访问到的模块，配合动态 import 减少初始加载量

  ```js
  // router/index.js
  const routes = [
    {
      path: '/dashboard',
      component: () => import('@/views/Dashboard.vue'),
    },
  ]
  ```

### 减少文件系统监听

  ```js
  export default defineConfig({
    server: {
      watch: {
        // 排除不需要监听的目录
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      },
    },
  })
  ```

### HMR 优化

+ 大项目中 HMR 可能成为瓶颈，可以针对性优化

  ```js
  export default defineConfig({
    server: {
      hmr: {
        overlay: false, // 关闭错误覆盖层
      },
    },
    plugins: [
      {
        name: 'disable-hmr-for-large-files',
        handleHotUpdate({ file, modules }) {
          if (file.includes('large-data.json')) {
            return [] // 不触发 HMR
          }
        },
      },
    ],
  })
  ```

## 构建时优化

### 代码分割（Code Splitting）

  ```js
  export default defineConfig({
    build: {
      rollupOptions: {
        output: {
          // 方式一：函数式分包
          manualChunks(id) {
            if (id.includes('node_modules')) {
              const pkgName = id.match(/node_modules\/([^/]+)/)?.[1]
              return `vendor-${pkgName}`
            }
          },

          // 方式二：手动指定分包（更可控）
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            'ui-vendor': ['element-plus'],
            'utils': ['lodash-es', 'dayjs'],
          },
        },
      },
    },
  })
  ```

+ **效果**：利用浏览器并行加载，缓存命中率高，某个依赖更新不影响其他 chunk

### 压缩优化

  ```js
  export default defineConfig({
    build: {
      // esbuild 压缩（默认，速度快）
      minify: 'esbuild',

      // 或 terser 压缩（更慢但压缩率更高）
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
  })
  ```

+ **选择建议**：一般项目用 esbuild 即可；对包体积极度敏感时用 terser

### CSS 优化

  ```js
  export default defineConfig({
    build: {
      cssCodeSplit: true, // 按需提取 CSS（默认开启）
      cssMinify: 'lightningcss', // 比 esbuild 更快
    },
    css: {
      // 使用 lightningcss 替代 PostCSS
      transformer: 'lightningcss',
      lightningcss: {
        targets: 'defaults and supports es6-module',
      },
    },
  })
  ```

### 资源内联阈值

  ```js
  export default defineConfig({
    build: {
      // 小于 4KB 的资源内联成 base64（默认 4096 字节）
      assetsInlineLimit: 4096,
    },
  })
  ```

+ 小图片/字体内联减少 HTTP 请求，大文件不内联避免增大 JS 体积

### 构建目标优化

  ```js
  export default defineConfig({
    build: {
      // 目标环境越新，polyfill 越少，体积越小
      target: 'es2020',

      // 或针对具体浏览器版本
      target: ['chrome89', 'edge89', 'firefox89', 'safari15'],
    },
  })
  ```

### Tree Shaking

+ Vite 默认开启，确保使用 ES 模块导入

  ```js
  import { debounce } from 'lodash-es' // ✓ 只引入 debounce
  import _ from 'lodash'               // ✗ 引入整个 lodash
  ```

+ 检查打包产物，确认没用到的代码被正确移除

### 外部化依赖（CDN）

  ```js
  export default defineConfig({
    build: {
      rollupOptions: {
        external: ['vue', 'vue-router', 'axios'],
        output: {
          globals: {
            vue: 'Vue',
            'vue-router': 'VueRouter',
            axios: 'axios',
          },
        },
      },
    },
  })
  ```

+ 需要在 HTML 中引入对应的 CDN 脚本
+ **适用场景**：大型库且用户大概率有缓存（如 Vue、React）

### 生产环境关闭 source map

  ```js
  export default defineConfig({
    build: {
      sourcemap: false, // 默认就是 false
    },
  })
  ```

## 插件优化

### Gzip / Brotli 预压缩

  ```js
  import viteCompression from 'vite-plugin-compression'

  export default defineConfig({
    plugins: [
      viteCompression({
        algorithm: 'gzip', // 或 'brotliCompress'
        threshold: 10240, // 大于 10KB 才压缩
        ext: '.gz',
      }),
    ],
  })
  ```

+ 配合 Nginx `gzip_static on` 或 CDN 直接使用预压缩文件，省去运行时压缩开销

### 图片压缩

  ```js
  import viteImagemin from 'vite-plugin-imagemin'

  export default defineConfig({
    plugins: [
      viteImagemin({
        gifsicle: { optimizationLevel: 7 },
        optipng: { optimizationLevel: 7 },
        mozjpeg: { quality: 75 },
        pngquant: { quality: [0.65, 0.9] },
        svgo: {
          plugins: [
            { name: 'removeViewBox' },
            { name: 'removeEmptyAttrs', active: false },
          ],
        },
      }),
    ],
  })
  ```

+ **注意**：`vite-plugin-imagemin` 安装可能有依赖问题，备选方案：`sharp`、`squoosh`、或在 CI 中预处理

### 组件库按需引入

  ```js
  import Components from 'unplugin-vue-components/vite'
  import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

  export default defineConfig({
    plugins: [
      Components({
        resolvers: [ElementPlusResolver()],
      }),
    ],
  })
  ```

+ 避免全量引入 Element Plus / Ant Design Vue 等组件库

## 性能分析

### 打包分析

  ```js
  import { visualizer } from 'rollup-plugin-visualizer'

  export default defineConfig({
    plugins: [
      visualizer({
        open: true,
        filename: 'stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ],
  })
  ```

+ 构建后自动打开可视化报告，直观看到每个模块的体积占比

### 构建时间分析

  ```bash
  DEBUG=vite:plugin viteite build
  ```

+ 查看每个插件的耗时，定位慢插件

## 实战配置模板

  ```js
  // vite.config.js 生产优化配置
  import { defineConfig } from 'vite'
  import vue from '@vitejs/plugin-vue'
  import Components from 'unplugin-vue-components/vite'
  import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
  import viteCompression from 'vite-plugin-compression'
  import { visualizer } from 'rollup-plugin-visualizer'

  export default defineConfig(({ mode }) => ({
    plugins: [
      vue(),
      Components({
        resolvers: [ElementPlusResolver()],
      }),
      mode === 'production' && viteCompression({
        algorithm: 'gzip',
        threshold: 10240,
      }),
      mode === 'analyze' && visualizer({ open: true }),
    ],

    build: {
      target: 'es2020',
      minify: 'esbuild',
      cssCodeSplit: true,
      cssMinify: 'lightningcss',
      sourcemap: false,
      assetsInlineLimit: 4096,

      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            'ui-vendor': ['element-plus'],
          },
        },
      },
    },

    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', 'axios', 'dayjs'],
    },

    server: {
      watch: {
        ignored: ['**/node_modules/**', '**/dist/**'],
      },
    },
  }))
  ```

## 优化效果对比

| 优化项 | 优化前 | 优化后 | 提升 |
|-------|-------|-------|------|
| 冷启动 | 3-5s | 200-500ms | 10x |
| HMR 响应 | 200-500ms | 50-100ms | 3-5x |
| 构建时间 | 30-60s | 10-20s | 2-3x |
| 产物体积 | 2MB | 800KB | 60%↓ |
