# Web Vitals

Web Vitals 是 Google 提出的一套**用户体验量化指标**，用于统一衡量网页的加载速度、交互响应与视觉稳定性。其中核心的三项称为 **Core Web Vitals（核心网页指标）**，直接影响 SEO 排名。

> 本篇聚焦指标定义与前端优化方向；更宽泛的性能手段见 [前端性能优化](/notes/performance/performance-optimization)。

## 三大核心指标（Core Web Vitals）

| 指标 | 全称 | 衡量什么 | 良好阈值 | 测量 API |
|---|---|---|---|---|
| **LCP** | Largest Contentful Paint | 加载性能（最大内容渲染） | ≤ 2.5s | PerformanceObserver |
| **INP** | Interaction to Next Paint | 交互响应 | ≤ 200ms | PerformanceObserver（event 类型） |
| **CLS** | Cumulative Layout Shift | 视觉稳定性 | ≤ 0.1 | PerformanceObserver |

> INP 于 2024 年 3 月取代旧的 **FID（First Input Delay）** 成为核心指标。FID 只测"首次交互的延迟"，INP 则评估**整个会话期间所有交互**的响应表现，更全面。

### LCP（最大内容绘制）

页面**视口内最大文本块或图片元素**渲染完成的时间点。

优化方向：

+ 图片使用现代格式（WebP/AVIF）、压缩、设置 `width/height` 防抖动
+ 关键资源加 `preload`，首屏 CSS/JS 内联或提前
+ 使用 CDN 就近分发，启用 HTTP 缓存
+ 服务端渲染（SSR）缩短首屏可见时间

### INP（交互到下次绘制）

用户交互（点击、输入、按键）到浏览器**实际绘制下一帧**的耗时。关注"主线程是否拥堵"。

优化方向：

+ 拆分长任务（Long Tasks），避免单次 JS 执行超过 50ms
+ 用 `requestIdleCallback` / `scheduler.yield()` 让出主线程
+ 防抖节流用户输入处理
+ 减少大型重排重绘，复杂动画用 `transform`/`opacity`（合成层）

### CLS（累积布局偏移）

页面生命周期内所有**意外布局偏移**的分数累加。得分 = 影响范围 × 位移距离。

优化方向：

+ 图片、视频、iframe 始终声明 `width` 和 `height`（或 `aspect-ratio`）
+ 为动态插入的内容（广告、弹窗）预留占位空间
+ 避免用 JS 在已渲染内容上方插入元素
+ 使用 `font-display: optional` 或预加载字体，避免字体切换导致重排

## 其他重要指标

+ **FCP（First Contentful Paint）**：首次渲染任意内容（文本/图片）的时间。
+ **TTFB（Time to First Byte）**：浏览器收到服务器首字节的耗时，反映后端/网络。
+ **TBT（Total Blocking Time）**：FCP 到 TTI 之间主线程被阻塞的总时长，INP 的辅助参考。
+ **TTI（Time to Interactive）**：页面达到可稳定交互的时间。

## 如何测量

### 字段数据（真实用户，RUM）

+ **PageSpeed Insights**（pagespeed.web.dev）：同时给字段数据与实验室数据
+ **Chrome UX Report（CrUX）**：基于真实 Chrome 用户，驱动搜索排名
+ 自采集：通过 `web-vitals` JS 库上报

```js
import { onLCP, onINP, onCLS } from 'web-vitals'

onLCP(console.log)
onINP(console.log)
onCLS(console.log)
```

### 实验室数据（合成测试）

+ **Lighthouse**：DevTools / CI 中跑，给评分与诊断建议
+ **Chrome DevTools Performance 面板**：手动录制定位瓶颈

## 实战建议

1. 以 **CrUX / PageSpeed Insights 的字段数据**为真实目标（实验室数据只是近似）。
2. 优先优化 **LCP**（加载）与 **INP**（交互），这两项对排名和体感影响最大。
3. 图片与字体是 LCP/CLS 的重灾区，先从此下手性价比最高。
4. 把 `web-vitals` 接入监控，建立**长期趋势**而非一次性达标。

## 参考

+ [Web Vitals 官方文档](https://web.dev/articles/vitals)
+ [web-vitals npm 库](https://github.com/GoogleChrome/web-vitals)
