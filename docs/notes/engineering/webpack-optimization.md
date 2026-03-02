# Webpack 性能优化

> 来源：个人学习笔记整理

## 构建时间优化

### 缩小范围

- 使用 loader 的时候配置 `include` `exclude` 缩小 loader 对文件的搜索范围，以此来提高构建速率。`/node_modules` 直接 `exclude` 掉

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        include: path.resolve(__dirname, '../src'),
        use: ['thread-loader', 'babel-loader'],
        exclude: /node_modules/,
      }
    ]
  }
}
```

### 文件后缀

- `resolve.extensions` 是我们常用的一个配置，它可以在导入语句没有带文件后缀时，按照配置的列表自动补上后缀。应该根据项目中文件的实际使用情况设置后缀列表，将使用频率高的放在前面，同时后缀列表也要尽可能的少，减少没有必要的匹配

```javascript
module.exports = {
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  }
}
```

### 别名

- 通过配置 `resolve.alias` 别名的方式，减少引用文件的路径复杂度

```javascript
module.exports = {
  resolve: {
    alias: {
      '@': path.join(__dirname, '../src')
    }
  }
}

// 引入 src 下的某个模块时
import XXX from '@/xxx/xxx.tsx'
```

### 多进程编译（thread-loader）

- `thread-loader` 将它后面的 loader 放到 worker pool 中并行执行，利用多核 CPU 加速编译
- 适合计算密集型的 loader（如 babel-loader、ts-loader）

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: [
          {
            loader: 'thread-loader',
            options: {
              workers: Math.max(1, os.cpus().length - 1),
            },
          },
          'babel-loader',
        ],
        exclude: /node_modules/,
      }
    ]
  }
}
```

+ **注意**：不适合需要共享状态的 loader（如 style-loader），启动 worker 也有开销，小项目可能反而更慢

### 缓存

- 在构建过程中，开启缓存提升二次打包速度

**babel-loader 缓存：**

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
            },
          }
        ]
      }
    ]
  }
}
```

- 编译后，会在 `/node_modules/.cache/babel-loader` 产生对应的缓存文件夹，在下一次编译时，将会尝试读取缓存来避免在每次执行时，可能产生的、高性能消耗的编译过程

**Webpack 5 文件系统缓存：**

+ Webpack 5 内置了持久化缓存，能缓存整个模块图和所有 loader 的处理结果，比单独配置 babel-loader 缓存或 `cache-loader` 更全面
+ ⚠️ `cache-loader` 在 Webpack 5 中已废弃，官方建议使用内置缓存替代

```javascript
module.exports = {
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename], // 配置文件变化时自动失效
    },
  },
}
```

+ 缓存默认存储在 `node_modules/.cache/webpack`，二次构建速度可以提升数倍

## 产物优化

### 代码分割（SplitChunks）

- 将公共模块和第三方库抽离成单独的 chunk，利用浏览器缓存和并行加载

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // 第三方库单独打包
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        // 公共模块（被引用 2 次以上）
        commons: {
          minChunks: 2,
          name: 'commons',
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
    // 将 runtime 代码单独抽离
    runtimeChunk: 'single',
  },
}
```

### Tree Shaking

- 移除未使用的代码，前提是使用 ES Module（`import`/`export`）

```javascript
module.exports = {
  mode: 'production', // 生产模式默认开启
  optimization: {
    usedExports: true, // 标记未使用的导出
  },
}
```

+ **注意**：`package.json` 中设置 `"sideEffects": false` 让 Tree Shaking 更彻底；如果有 CSS 或 polyfill 等副作用文件需要排除：

  ```json
  {
    "sideEffects": ["*.css", "*.scss", "./src/polyfills.js"]
  }
  ```

### 压缩

+ **JS 压缩**：生产模式默认使用 `terser-webpack-plugin`，可进一步配置

  ```javascript
  const TerserPlugin = require('terser-webpack-plugin')

  module.exports = {
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
              drop_debugger: true,
            },
          },
          parallel: true, // 多进程并行压缩
        }),
      ],
    },
  }
  ```

+ **CSS 压缩**：使用 `css-minimizer-webpack-plugin`

  ```javascript
  const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

  module.exports = {
    optimization: {
      minimizer: [
        '...', // 保留默认的 JS 压缩
        new CssMinimizerPlugin(),
      ],
    },
  }
  ```

### 按需加载（Lazy Loading）

+ 路由级别的动态 import，Webpack 自动进行代码分割

  ```javascript
  // React
  const Dashboard = React.lazy(() => import('./views/Dashboard'))

  // Vue
  const routes = [
    {
      path: '/dashboard',
      component: () => import(/* webpackChunkName: "dashboard" */ './views/Dashboard.vue'),
    },
  ]
  ```

+ `webpackChunkName` 魔法注释可以指定生成的 chunk 文件名，方便调试和缓存策略

### 资源处理

+ **图片压缩**：使用 `image-minimizer-webpack-plugin` 或 `image-webpack-loader`
+ **小图片内联**：Webpack 5 内置 Asset Modules

  ```javascript
  module.exports = {
    module: {
      rules: [
        {
          test: /\.(png|jpe?g|gif|svg)$/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 4 * 1024, // 小于 4KB 内联为 base64
            },
          },
        },
      ],
    },
  }
  ```

## 分析工具

### 打包分析

+ 使用 `webpack-bundle-analyzer` 可视化分析产物体积

  ```javascript
  const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

  module.exports = {
    plugins: [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: 'report.html',
      }),
    ],
  }
  ```

### 构建速度分析

+ 使用 `speed-measure-webpack-plugin` 分析每个 loader 和 plugin 的耗时

  ```javascript
  const SpeedMeasurePlugin = require('speed-measure-webpack-plugin')
  const smp = new SpeedMeasurePlugin()

  module.exports = smp.wrap({
    // ... 原有配置
  })
  ```
