# Chrome DevTools 使用指南

> 📌 本文件记录 Chrome DevTools 各面板的核心用法：Console、Elements、Network、Performance、Memory、Sources、Application。
>
> 📅 参考：Chrome DevTools Documentation (developer.chrome.com/docs/devtools)

---

## 1. 打开 DevTools

```
F12 / Cmd+Option+I（Mac）   — 打开/关闭 DevTools
Cmd+Shift+C / Ctrl+Shift+C — 打开并进入元素检查模式
Cmd+Shift+J / Ctrl+Shift+J — 打开并聚焦到 Console
Cmd+P / Ctrl+P             — 快速打开文件
Cmd+Shift+P / Ctrl+Shift+P — 命令菜单（Command Menu）
```

---

## 2. Console 面板

### 基础输出

```js
console.log('普通信息')
console.info('提示信息')
console.warn('警告')
console.error('错误')

// 带样式
console.log('%c大标题', 'font-size: 24px; color: red; font-weight: bold')

// 输出对象（折叠展示）
console.log({ name: 'Alice', age: 25 })

// 输出表格
console.table([
  { name: 'Alice', score: 95 },
  { name: 'Bob', score: 87 }
])

// 分组
console.group('用户信息')
console.log('姓名: Alice')
console.log('年龄: 25')
console.groupEnd()

// 计时
console.time('fetch')
await fetch('/api/users')
console.timeEnd('fetch')   // fetch: 123.45ms

// 计数
console.count('click')  // click: 1
console.count('click')  // click: 2
console.countReset('click')
```

### Console 面板快捷操作

```js
// $0 — 最近在 Elements 面板中选中的元素
$0.style.border = '2px solid red'

// $1, $2... — 之前选中的元素（历史）

// $() — document.querySelector 的简写
$('body')
$$('.card')  // document.querySelectorAll

// $_ — 上一个表达式的结果
2 + 3   // 5
$_ * 2  // 10

// copy() — 复制到剪贴板
copy(location.href)
copy(JSON.stringify(someObject, null, 2))
```

### 过滤与搜索

Console 面板顶部可过滤：
- 输入文字过滤日志
- 按级别过滤（Verbose / Info / Warnings / Errors）
- 勾选"Preserve log"保留页面跳转后的日志

---

## 3. Elements 面板

### 操作 DOM

- 双击元素文本或属性可直接编辑
- 右键元素 → "Edit as HTML" 编辑整段 HTML
- 拖拽元素可移动位置
- `Del` 键删除选中元素
- 右键 → "Scroll into view" 滚动页面到元素位置
- 右键 → "Copy" → "Copy selector" 获取 CSS 选择器

### Styles 子面板

- 查看和修改元素的所有 CSS 样式
- 灰色的样式是被覆盖的（有删除线）
- 点击颜色值打开颜色选择器
- 点击 `+` 按钮添加新规则
- 勾选框可临时禁用某条样式

### Computed 子面板

展示元素最终计算后的 CSS 值，点击属性旁的箭头可跳转到来源规则。

### Box Model 可视化

Styles 面板下方的矩形图显示 margin / border / padding / content 的实际像素值，可直接点击数值修改。

### 强制元素状态

右键元素 → "Force state"，或在 Styles 面板点击 `:hov` 按钮，可强制激活 `:hover`、`:focus`、`:active`、`:visited` 等伪类，便于调试悬停样式。

---

## 4. Network 面板

### 基本用法

- **过滤栏**：按类型（XHR、Fetch、JS、CSS、Img）或关键字过滤请求
- **Preserve log**：勾选后页面跳转不清空请求列表
- **Disable cache**：禁用缓存，确保每次都从服务器加载
- **Throttling**：模拟慢网络（3G、离线等）

### 请求详情

点击某个请求可查看：
- **Headers** — 请求/响应头
- **Payload** — 请求体（POST 数据）
- **Response** — 响应内容
- **Timing** — 请求时间线（DNS、TCP、TTFB、Content Download）

### Timing 分析

```
Queueing          — 等待发出（受并发限制，HTTP/1.1 同域最多 6 个）
Stalled           — 等待连接可用
DNS Lookup        — DNS 解析时间
Initial connection — TCP 建立时间
SSL               — TLS 握手时间
Request sent      — 发送请求
Waiting (TTFB)    — 等待服务器首字节（服务端处理时间 + 网络延迟）
Content Download  — 下载响应体
```

**TTFB 过高** → 服务端性能问题或网络延迟
**Content Download 过高** → 响应体太大，考虑压缩或分页

### 复制请求为 curl

右键请求 → "Copy" → "Copy as cURL"，可在终端直接重放请求。

---

## 5. Performance 面板

用于分析页面运行时性能，定位卡顿和长任务。

### 录制

1. 点击 ⏺ 开始录制（或 `Ctrl+E`）
2. 执行要分析的操作
3. 点击 ⏹ 停止录制

### 分析火焰图

```
Main 轨道（主线程）：
  - 每个矩形是一个函数调用，宽度代表耗时
  - 颜色：黄色=脚本执行，紫色=样式计算/布局，绿色=绘制
  - 红色三角 = 长任务（> 50ms，会阻塞主线程导致卡顿）

顶部 FPS 图：
  - 绿色越高越好
  - 红色条表示帧率下降，用户会感受到卡顿
```

### 识别性能瓶颈

```
脚本执行时间长  → 查看 Bottom-Up / Call Tree 找耗时最多的函数
Layout Shift   → 检查是否有强制同步布局（读写 DOM 交替）
Paint 耗时长   → 检查是否有不必要的 CSS 属性触发重绘（如 box-shadow 变化）
```

### Long Tasks

Performance 面板会标记 > 50ms 的长任务（红色角标）。长任务会阻塞用户交互，优化方向：
- 将长任务拆分（`setTimeout(fn, 0)` 或 `scheduler.yield()`）
- 将计算密集型任务移到 Web Worker

---

## 6. Memory 面板

用于排查内存泄漏。

### 堆快照（Heap Snapshot）

```
1. 执行操作前拍快照
2. 触发可能泄漏的操作（如打开/关闭弹窗多次）
3. 触发 GC（垃圾回收）后再拍快照
4. 对比两个快照，看 Delta 列中增加的对象
```

### 常见内存泄漏场景

```js
// 1. 未清除的全局变量
window.data = largeArray   // 永远不会被回收

// 2. 未移除的事件监听器
element.addEventListener('click', handler)
// 如果 element 被移除但 handler 还引用着外部对象 → 泄漏
// 修复：
element.removeEventListener('click', handler)

// 3. 定时器未清除
const timer = setInterval(() => {
  // 引用外部对象
}, 1000)
// 修复：组件卸载时 clearInterval(timer)

// 4. 闭包持有大对象引用
function createLeak() {
  const bigData = new Array(1000000).fill('x')
  return () => bigData.length  // 闭包持有 bigData
}
```

### Allocation Timeline

录制一段时间内的内存分配，定位分配频繁但未释放的对象。

---

## 7. Sources 面板

### 断点调试

- 点击行号设置断点
- 右键行号 → "Add conditional breakpoint" — 条件断点（满足条件才暂停）
- 右键行号 → "Add logpoint" — 日志点（不暂停，但输出日志，不污染代码）

### 调试快捷键

```
F8 / Cmd+\      — Resume（继续执行到下一个断点）
F10 / Cmd+'     — Step over（跳过，不进入函数）
F11 / Cmd+;     — Step into（进入函数）
Shift+F11       — Step out（跳出当前函数）
```

### Scope 面板

暂停时可在右侧 Scope 面板查看当前作用域、闭包和全局变量的值，支持直接修改变量值。

### Watch 表达式

在 Watch 面板添加表达式，每次暂停时自动计算并显示值，方便追踪变量变化。

### Override（本地覆盖）

Sources → Overrides → 选择本地目录，之后对线上文件的修改会保存到本地：
- 无需搭建本地开发环境，直接调试线上页面
- 刷新后修改仍然保留

---

## 8. Application 面板

### Storage

查看和修改当前页面的所有存储：
- Local Storage / Session Storage — 可直接编辑键值
- Cookies — 可查看所有属性（Domain、Path、Secure、HttpOnly、SameSite、过期时间）
- IndexedDB — 展示数据库结构，可浏览记录
- Cache Storage — Service Worker 的缓存内容

### Service Workers

- 查看注册的 SW 状态（activating / activated / redundant）
- "Update on reload" — 每次刷新都更新 SW，开发时勾选
- "Bypass for network" — 绕过 SW 缓存，直接从网络加载
- 手动发送 Push 事件用于测试推送通知

### Manifest

查看 PWA 的 `manifest.json` 解析结果和图标预览。

---

## 9. 实用技巧

### 模拟移动设备

点击工具栏中的手机图标（`Ctrl+Shift+M`）进入设备模拟模式：
- 选择预设设备（iPhone、Pixel 等）
- 自定义分辨率和 DPR
- 模拟触摸事件
- 限制网速和 CPU

### 截图

Command Menu（`Cmd+Shift+P`）→ 搜索 "screenshot"：
- "Capture full size screenshot" — 整页截图
- "Capture node screenshot" — 截取指定元素
- "Capture screenshot" — 截取当前视口

### 设计模式（即时编辑任意文字）

```js
// 在 Console 输入，可直接编辑页面上任意文字
document.designMode = 'on'
```

### 查看 JavaScript 执行覆盖率

Coverage 面板（More Tools → Coverage）：录制后显示哪些 JS/CSS 代码实际被执行，红色部分是未执行的代码，辅助 Tree-shaking 和按需加载优化。
