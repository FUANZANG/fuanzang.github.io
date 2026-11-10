# 前端包体积与 Bundle 分析

> 构建优化手段见 [Vite 性能优化](/notes/engineering/vite-optimization)、[Webpack 性能优化](/notes/engineering/webpack-optimization)。分析工具：Vite/Rollup 生态常用 [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer)（亦列于 [Vite Plugin Registry](https://registry.vite.dev/plugins)）。运行时指标见 [Web Vitals](/notes/performance/web-vitals)。

## 1. 先分清看什么

| 数字 | 含义 |
|------|------|
| **产物体积**（磁盘） | `dist` 里 JS/CSS 多大 |
| **传输体积** | gzip / brotli 后用户下载多少（更贴近网络） |
| **解析/执行** | 主线程成本；和大包、长任务相关 |

终端里 `vite build` 打印的 chunk 大小是入口；**为什么大**要看模块组成图。

## 2. Vite：用 visualizer 看组成

安装（以该插件 README 为准）：

```bash
npm i -D rollup-plugin-visualizer
```

```ts
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'stats.html',
      template: 'treemap', // 或 sunburst / network
      gzipSize: true,
      brotliSize: true,
      open: true
    })
  ]
})
```

然后 **`vite build`**（dev server 不会出完整 Rollup 产物报告）。打开生成的 `stats.html`。

读图：

- 绿色块常为 `node_modules` 依赖，蓝色多为项目源码（插件 README 说明）。  
- `network` 模板有助于看「谁引进来的」。  
- 关注：**重复打包的库**、误进主包的巨型依赖（图表、编辑器、polyfill）。

> 社区有讨论应挂在 `build.rollupOptions.plugins` 还是顶层 `plugins`；以你当前 Vite 版本实测为准——**报告能稳定生成且体积合理**即可。官方 registry 示例多为顶层 `plugins: [visualizer()]`。

Webpack 项目可用 `webpack-bundle-analyzer`（见 Webpack 优化文习惯用法）。

## 3. 常见肥点与对策

| 现象 | 对策 |
|------|------|
| 整库引入 UI / lodash | 按需导入或换轻量 API |
| 路由级大页进主包 | 路由懒加载 `import()` |
| 编辑器 / 图表仅少数页用 | 动态 import + 分 chunk |
| moment 等历史库 | dayjs 等更小替代（评估后再换） |
| polyfill 全家桶 | 按 browserslist 收敛 |

体积优化要和缓存策略一起看：带 hash 的长缓存 chunk 即使用户多下一次，也优于每次都下巨大无缓存主包——见 [HTTP 缓存](/notes/foundations/http-caching)。

## 4. 预算与 CI

建议：

1. 定 **主包 / 首屏相关 chunk** 的 gzip 上限。  
2. CI 构建后对比 PR 体积（可解析 build 输出或 stats）。  
3. 超预算必须说明原因（新依赖、临时放开）。

## 5. 清单

- [ ] 定期看 treemap，不只看「构建成功」  
- [ ] 新增大依赖前先估体积  
- [ ] 路由与重型组件懒加载  
- [ ] 同时看 gzip，不只看原始 KB  

## 参考

- [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer)
- [Vite Plugin Registry · visualizer](https://registry.vite.dev/plugins)
