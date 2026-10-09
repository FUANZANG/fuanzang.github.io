# 性能分析案例

> 指标定义见 [Web Vitals](/notes/performance/web-vitals)，面板怎么点见 [Chrome DevTools](/notes/performance/debug-devtools)。下面是一次示意录制：数字用来说明怎么读，不是某次线上报告。

目标只有两个：LCP 降到 2.5s 以内，INP 降到 200ms 以内。一次 Lighthouse 分数不够，改完要用字段数据看趋势，见 [前端监控](/notes/performance/frontend-monitoring)。

## 录之前

1. 打开无痕窗口，禁用会注入脚本的扩展
2. DevTools → Performance，勾选 Screenshots 和 Web Vitals
3. 用 Slow 4G、CPU 4× slowdown 录首屏点击。实验室条件故意更差，方便把问题放大

## 案例：LCP 是一张没设尺寸的大图

录制里 LCP 标记落在首屏主图，时间约 4.1s（示意）。Network 里这张图是 1.8MB 的 PNG，并且 HTML 里没有 `width` / `height`，图片到达后把下面的文字顶下去，CLS 也跟着跳。

改法，按收益从高到低：

1. 压成 WebP / AVIF，宽度只保留布局需要的那一档
2. `img` 写上宽高，或用 `aspect-ratio` 占位，避免图片到达后撑开布局
3. 这张图就是 LCP 元素时，给它 `fetchpriority="high"`，不要懒加载
4. 带内容哈希后走长缓存，见 [前端部署](/notes/ops/frontend-deployment)

再录一次：LCP 标记还在这张图上，但时间落到 2s 这一档（示意），CLS 不再在图片出现时跳。若 LCP 换成了一块很晚才插入的文字，说明阻塞它的是 JS 或字体，而不是图片。

## 案例：点击后主线程卡 300ms

INP 示意值 380ms。Performance 里这次点击后面挂着一条超过 200ms 的长任务，火焰图堆在「过滤并重排两千行表格」的同步函数上，期间没有绘制。

改法：

1. 输入用防抖，不要每次按键都全量过滤
2. 单次仍超过 50ms 时，把计算拆开，或丢进 [Web Worker](/notes/practice/web-workers)
3. 列表本身很长时用 [虚拟列表](/notes/practice/virtual-list)，少创建 DOM

再点一次：长任务拆成几段 30ms 左右的任务，中间能插入绘制，INP 落到 200ms 以内（示意）。

## 怎么算改完

+ 实验室：同一台机器、同一种限速，前后各录三次，看 LCP / INP 的方向，不看某一帧的个位数
+ 线上：把 `web-vitals` 报到 [前端监控](/notes/performance/frontend-monitoring)，看 P75，而不是自己电脑上的一次刷新
+ Lighthouse 分数可以当清单，不当验收线。它是实验室数据，和用户机器上的字段数据会有差距
