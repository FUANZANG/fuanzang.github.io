# 性能分析案例

> 指标定义见 [Web Vitals](/notes/performance/web-vitals)，面板怎么点见 [Chrome DevTools](/notes/performance/debug-devtools)。下面是示意录制：数字用来说明怎么读，不是某次线上报告。

目标：LCP ≤ 2.5s，INP ≤ 200ms。Lighthouse 分数不够当验收；改完用字段数据看趋势，见 [前端监控](/notes/performance/frontend-monitoring)。

## 录之前（可照抄）

1. 无痕窗口，关掉会注入脚本的扩展  
2. DevTools → **Performance**：勾选 Screenshots、Web Vitals；Network 条件选 **Slow 4G**，CPU **4× slowdown**  
3. 点录制 → 硬刷新（首屏）或完成一次点击（交互）→ 停录  
4. 时间轴上方找 **LCP / INP / CLS** 标记；点标记会跳到对应主线程活动

读图口诀（和 [Web Vitals](/notes/performance/web-vitals) 对齐）：

| 标记 | 先看哪 | 坏信号 |
|------|--------|--------|
| LCP | 哪个元素、Network 里该资源大小与排队 | 超大图、无尺寸、被长任务拖晚 |
| INP | 点击后有没有 >50ms 的长任务（红色条） | 同步过滤/排序整表、强制布局 |
| CLS | Experience 轨布局偏移 | 图片无宽高、晚插入的顶栏广告 |

## 案例 A：LCP 是没设尺寸的大图

**现象（示意）**：LCP ≈ 4.1s，落在首屏主图。Network 里该 PNG ≈ 1.8MB；HTML 无 `width`/`height`，图到达后顶开下文，CLS 跟着跳。

**Performance 上怎么确认**

1. 点 LCP 标记 → Summary 里看 element（常是 `img`）  
2. Network 按 Size 排序，对上同一 URL  
3. 火焰图在图片下载结束前若有大段 Evaluate Script，说明 JS 也在抢主线程

**改法（收益从高到低）**

1. 压成 WebP/AVIF，宽度只保留布局档  
2. `img` 写宽高或 `aspect-ratio` 占位  
3. 该图即 LCP 时：`fetchpriority="high"`，**不要**懒加载  
4. 带内容哈希长缓存，见 [前端部署](/notes/ops/frontend-deployment)

**再录验收**：LCP 仍在该图上但落到 ~2s 档；图片到达时 CLS 不再跳。若 LCP 换成很晚才出现的文字块 → 瓶颈在字体/JS，不是图。

## 案例 B：点击后主线程卡 300ms+

**现象（示意）**：INP ≈ 380ms。点击后一条 >200ms 长任务，堆栈在「同步过滤并重排两千行表格」，中间无绘制。

**Performance 上怎么确认**

1. 点 INP / 交互标记 → 看 Interaction 到 Next Paint 的间隙  
2. Main 轨找红色长任务 → Bottom-Up / Call Tree 看自耗时函数名  
3. 若伴随紫色 Recalculate Style / Layout 尖刺，还有强制同步布局

**改法**

1. 输入防抖，勿每次按键全量过滤  
2. 单次仍 >50ms：拆任务，或丢 [Web Worker](/notes/practice/web-workers)  
3. 长列表用 [虚拟列表](/notes/practice/virtual-list)

**再录验收**：长任务拆成多段 ~30ms，中间能插入绘制，INP ≤ 200ms。

## 怎么算改完

| 环境 | 做法 |
|------|------|
| 实验室 | 同机、同限速，前后各录 **3** 次，看 LCP/INP **方向**，不抠个位数 |
| 线上 | `web-vitals` 报到监控，看 **P75**（[前端监控](/notes/performance/frontend-monitoring)） |
| Lighthouse | 当清单，不当验收线（实验室 ≠ 字段数据） |

## 参考

+ [Web Vitals](/notes/performance/web-vitals) · [Chrome DevTools](/notes/performance/debug-devtools) · [前端性能优化](/notes/performance/performance-optimization)
