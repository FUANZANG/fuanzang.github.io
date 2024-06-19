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
        test: /.(|ts|tsx|js|jsx)$/,
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

### 缓存

- 在构建过程中，开启缓存提升二次打包速度，可以配置 `babel-loader` 的缓存配置项 `cacheDirectory` 来缓存没有变过的 js 代码

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /.jsx?$/,
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
- 上面的缓存优化只是针对像 `babel-loader` 这样可以配置缓存的 loader，那没有缓存配置的 loader 该怎么使用缓存呢，此时需要 `cache-loader`

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /.jsx?$/,
        use: [
          'cache-loader',
          "babel-loader"
        ],
      }
    ]
  }
}
```

- 编译后同样多一个 `/node_modules/.cache/cache-loader` 缓存目录
