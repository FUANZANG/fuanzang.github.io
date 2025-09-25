# 前端无障碍（a11y）

> 📌 本文件记录前端无障碍相关知识：WCAG 标准、ARIA 角色/状态/属性、语义化 HTML、键盘导航、屏幕阅读器、色彩对比度、焦点管理、无障碍测试与最佳实践。
>
> ⚠️ **边界说明**：`prefers-reduced-motion` 见 [前端动画笔记](/notes/frontend-animation)，`aria-labelledby` 见 [Vue 3 笔记](/notes/vue3-note)。本文聚焦 **a11y 完整体系**。
>
> 📅 基于 WCAG 2.2 AA 标准
>
> 🔗 `prefers-reduced-motion` 见 [前端动画笔记](/notes/frontend-animation)，`aria-labelledby` 见 [Vue 3 笔记](/notes/vue3-note)

---

## 1. 无障碍概述

### 什么是无障碍（Accessibility）

```
无障碍（a11y）= 让所有人（包括残障人士）都能使用你的网站/应用

目标人群：
┌─────────────────────────────────────────────────────────┐
│ 👁  视觉障碍    盲人或低视力用户，依赖屏幕阅读器           │
│ 👂  听觉障碍    听障用户，需要字幕或视觉替代               │
│ 🖐  运动障碍    无法使用鼠标，依赖键盘或辅助输入设备        │
│ 🧠  认知障碍    注意力/阅读障碍用户，需要清晰的导航         │
│ ⏳  暂时性障碍  骨折/术后用户，临时无法使用某些功能         │
└─────────────────────────────────────────────────────────┘

法律要求：
  - 美国：ADA（美国残疾人法案）、Section 508
  - 欧盟：EN 301 549、Web Accessibility Directive
  - 中国：GB/T 37668-2019（等同采用 WCAG 2.1）
  - 国际标准：WCAG 2.1/2.2
```

### WCAG 2.2 四大原则（POUR）

```
┌──────────────────────────────────────────────────┐
│  P - Perceivable     可感知                       │
│  O - Operable        可操作                       │
│  U - Understandable  可理解                       │
│  R - Robust          兼容性强                     │
└──────────────────────────────────────────────────┘

合规级别：
  A     最低级别（必须满足）
  AA    标准级别（大多数网站目标）
  AAA   最高级别（特定场景需要）
```

### WCAG 2.2 AA 核心规则速查

```
1.1 文字替代 — 所有非文字内容都有文字替代
1.2 时间媒体 — 视频有字幕，音频有替代文本
1.3 可兼容 — 内容结构可通过辅助技术理解
1.4 可感知
  1.4.1 使用颜色传达信息（❌ 错误）
  1.4.3 对比度 ≥ 4.5:1（正文）/ ≥ 3:1（大文本）
  1.4.11 非文本对比度 ≥ 3:1
  1.4.13 悬停/焦点可见

2.1 键盘操作 — 所有功能都可键盘操作
2.2 足够时间 — 用户有足够时间阅读和操作
2.3 闪烁 — 无超过 3 次的闪烁
2.4 可导航
  2.4.1 跳过导航链接
  2.4.2 页面标题
  2.4.3 焦点顺序逻辑
  2.4.4 链接用途（通过名称或上下文）
  2.4.5 多重方式（搜索、站点地图等）
  2.4.6 标题和标签
  2.4.7 焦点可见
2.5 输入方式
  2.5.1 指针手势（单指操作）
  2.5.2 指针取消（撤销误触）
  2.5.3 标签名称
  2.5.4 运动操作（禁用运动传感器）
3.1 可读语言 — 页面语言可标识
3.2 可预测 — 导航/输入行为一致
3.3 输入辅助 — 错误提示、自动填充
4.1 兼容 — 解析器正确、状态可程序化确定
```

---

## 2. 语义化 HTML

> 语义化 HTML 是无障碍的第一道防线，比 ARIA 更重要。

### 基础语义元素

```html
<!-- ✅ 正确：使用语义化元素 -->
<header>...</header>
<nav>...</nav>
<main>...</main>
<section>
  <h2>章节标题</h2>
  <p>内容</p>
</section>
<article>...</article>
<aside>...</aside>
<footer>...</footer>

<!-- ❌ 错误：全部用 div -->
<div class="header"></div>
<div class="nav"></div>
<div class="content"></div>
<div class="footer"></div>
```

### 标题层级

```html
<!-- ✅ 正确：遵循层级，不跳级 -->
<h1>页面主标题</h1>
<h2>章节</h2>
<h3>小节</h3>
<h2>另一个章节</h2>
<h3>小节</h3>

<!-- ❌ 错误：跳级 -->
<h1>主标题</h1>
<h3>跳过 h2！（屏幕阅读器用户会困惑）</h3>
```

### 表格无障碍

```html
<!-- ✅ 正确：表头 + 行列关联 -->
<table>
  <caption>2024 年销售数据</caption>
  <thead>
    <tr>
      <th scope="col">产品</th>
      <th scope="col">Q1</th>
      <th scope="col">Q2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>产品 A</td>
      <td>100</td>
      <td>150</td>
    </tr>
  </tbody>
</table>

<!-- ❌ 错误：没有 scope -->
<table>
  <tr><th>产品</th><th>Q1</th></tr>
  <tr><td>产品 A</td><td>100</td></tr>
</table>
```

### 表单无障碍

```html
<!-- ✅ 正确：label + id 配对 -->
<label for="username">用户名</label>
<input id="username" name="username" type="text" required>

<!-- ✅ 正确：fieldset + legend 分组 -->
<fieldset>
  <legend>性别</legend>
  <label><input type="radio" name="gender" value="male"> 男</label>
  <label><input type="radio" name="gender" value="female"> 女</label>
</fieldset>

<!-- ✅ 正确：错误提示关联 -->
<div class="form-group">
  <label for="email">邮箱</label>
  <input
    id="email"
    type="email"
    aria-invalid="true"
    aria-describedby="email-error"
  >
  <span id="email-error" role="alert">请输入有效的邮箱地址</span>
</div>

<!-- ✅ 正确：隐藏标签（有图标按钮时） -->
<button aria-label="搜索">
  <svg><!-- 搜索图标 --></svg>
</button>
```

### 图片无障碍

```html
<!-- ✅ 正确：有意义的 alt -->
<img src="chart.png" alt="2024 年销售额同比增长 23%">

<!-- ✅ 正确：装饰性图片 -->
<img src="divider.png" alt="" role="presentation">

<!-- ❌ 错误：alt 为空 -->
<img src="logo.png" alt="">

<!-- ❌ 错误：alt 等于文件名 -->
<img src="IMG_1234.jpg" alt="IMG_1234.jpg">

<!-- ✅ 正确：复杂图表用 longdesc -->
<img src="complex-chart.png" alt="2024 年各季度销售趋势图"
     longdesc="/descriptions/chart-q4-2024.html">
```

---

## 3. ARIA 角色

> 当语义化 HTML 不够用时，才使用 ARIA。

### 常用角色速查

```html
<!--  landmark 角色 — 页面结构 -->
role="banner"       → <header>
role="navigation"   → <nav>
role="main"         → <main>
role="complementary"→ <aside>
role="contentinfo"  → <footer>
role="search"       → 搜索区域
role="region"       → 带标题的独立区域

<!--  widget 角色 — 交互组件 -->
role="button"       → 非 button 元素的点击区域
role="checkbox"     → 自定义复选框
role="combobox"     → 下拉选择框
role="dialog"       → 对话框
role="grid"         → 表格数据
role="link"         → 非 a 元素的链接
role="menu"         → 菜单
role="menubar"      → 菜单栏
role="progressbar"  → 进度条
role="radio"        → 单选按钮组
role="slider"       → 滑块
role="switch"       → 开关
role="tablist"      → 标签页容器
role="tabpanel"     → 标签页内容
role="textbox"      → 输入框
role="tooltip"      → 提示框

<!--  live region 角色 — 动态内容 -->
role="alert"        → 紧急通知（打断用户）
role="status"       → 状态信息（不打断）
role="log"          → 日志（追加模式）
role="marquee"      → 滚动文本（避免使用）

<!--  window 角色 -->
role="application"  → 桌面应用体验（慎用）
role="document"     → 文档内容
role="treegrid"     → 树形表格
```

### 正确使用示例

```html
<!-- 自定义按钮 -->
<div role="button" tabindex="0" aria-pressed="false">
  点击我
</div>

<!-- 模态对话框 -->
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">确认删除</h2>
  <p>确定要删除这条记录吗？</p>
  <button>确定</button>
  <button>取消</button>
</div>

<!-- 标签页 -->
<div role="tablist" aria-label="产品选项卡">
  <button role="tab" aria-selected="true" aria-controls="panel-1" id="tab-1">
    概述
  </button>
  <button role="tab" aria-selected="false" aria-controls="panel-2" id="tab-2">
    规格
  </button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
  <h3>概述内容</h3>
</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
  <h3>规格内容</h3>
</div>

<!-- 实时通知 -->
<div role="alert" aria-live="assertive">
  数据保存成功！
</div>

<!-- 状态更新 -->
<div role="status" aria-live="polite">
  已加载 10 条记录
</div>
```

### 何时用 ARIA vs 原生 HTML

```
优先使用原生 HTML：
  ✅ <button> 代替 role="button"
  ✅ <a href> 代替 role="link"
  ✅ <input type="checkbox"> 代替 role="checkbox"
  ✅ <nav> 代替 role="navigation"
  ✅ <main> 代替 role="main"
  ✅ <form> + <label> 代替自定义表单

才使用 ARIA：
  ✅ 自定义组件（没有原生 HTML 对应物）
  ✅ 增强已有元素的无障碍信息
  ✅ 动态更新内容的屏幕阅读器通告
  ✅ 复杂交互模式（拖放、自定义键盘导航）

禁止使用：
  ❌ 改变原生元素的行为（如 <button role="link">）
  ❌ 用 ARIA 模拟原生交互
  ❌ 给可聚焦元素加 tabindex="0" 不加键盘处理
```

---

## 4. ARIA 状态与属性

### 常用属性速查

```html
<!-- 可见性 -->
aria-hidden="true"   → 从无障碍树中隐藏（不影响视觉）
aria-hidden="false"  → 可见（默认）

<!-- 状态 -->
aria-checked="true/false/mixed"  → 复选框/单选框状态
aria-disabled="true/false"       → 禁用状态
aria-expanded="true/false"       → 展开/折叠
aria-hidden="true/false"         → 隐藏
aria-invalid="true/false/grave"  → 无效输入
aria-pressed="true/false"        → 按钮按下状态
aria-selected="true/false"       → 选中状态

<!-- 关系 -->
aria-controls="element-id"       → 控制哪个元素
aria-describedby="element-id"    → 描述信息
aria-labelledby="element-id"     → 标签信息
aria-flowto="element-id"         → 焦点流向
aria-owns="element-id"           → 拥有关系

<!-- 值 -->
aria-valuemax="100"              → 最大值
aria-valuemin="0"                → 最小值
aria-valuenow="50"               → 当前值
aria-valuetext="一半"            → 值的文字描述

<!-- 行为 -->
aria-autocomplete="inline/list/both/none"
aria-busy="true/false"           → 加载中
aria-current="page/step/location/time/spans"
aria-dropeffect="copy/link/none"
aria-grabbed="true/false/undefined"
aria-haspopup="true/false/menu/listbox/dialog/text"
aria-keyshortcuts="Alt+H"        → 键盘快捷键
aria-live="off/polite/assertive" → 更新播报策略
aria-atomic="true/false"         → 是否整体播报
aria-relevant="add/remove/text"  → 哪些变化需要播报
aria-sort="ascending/descending/none/other"
```

### 关键属性详解

#### aria-live（实时区域）

```html
<!-- polite: 不打断当前操作，有空闲时播报 -->
<div role="status" aria-live="polite">
  购物车中有 <span id="cart-count">3</span> 件商品
</div>

<!-- assertive: 立即打断播报 -->
<div role="alert" aria-live="assertive">
  订单提交失败，请重试
</div>

<!-- off: 不播报（默认） -->
<div aria-live="off">
  这是一段不会播报的更新
</div>
```

#### aria-hidden vs display:none

```html
<!-- ✅ aria-hidden: 对屏幕阅读器隐藏，但仍可聚焦 -->
<div aria-hidden="true">装饰性图标</div>

<!-- ❌ 不要用 aria-hidden 隐藏可交互内容 -->
<div aria-hidden="true">
  <button>这个按钮对用户不可见！</button>  <!-- 危险！ -->
</div>

<!-- 完全隐藏（屏幕阅读器和视觉都隐藏） -->
<div style="display: none;">...</div>
<div class="sr-only">...</div>  <!-- 屏幕阅读器专用隐藏 -->
```

#### sr-only 工具类

```css
/* 视觉隐藏但屏幕阅读器可读 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

```html
<!-- 按钮有图标，需要文字标签 -->
<button aria-label="关闭">
  <svg><!-- 关闭图标 --></svg>
  <span class="sr-only">关闭</span>
</button>

<!-- 搜索结果计数 -->
<p>找到 123 个结果</p>
<span class="sr-only">共 123 条记录</span>
```

### 组合示例：自定义开关

```html
<!-- 使用原生 <input type="checkbox"> 最无障碍 -->
<label>
  <input type="checkbox" aria-label="启用通知"> 启用通知
</label>

<!-- 如果必须用 div，需要完整 ARIA + 键盘支持 -->
<div
  role="switch"
  aria-checked="false"
  aria-label="启用通知"
  tabindex="0"
  class="toggle-switch"
>
  <span class="toggle-knob"></span>
</div>

<script>
const toggle = document.querySelector('.toggle-switch')

toggle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggleClick()
  }
})

function toggleClick() {
  const isChecked = toggle.getAttribute('aria-checked') === 'true'
  toggle.setAttribute('aria-checked', String(!isChecked))
}
</script>
```

---

## 5. 键盘导航

### 焦点管理

```css
/* ✅ 始终保留可见的焦点指示器 */
*:focus {
  outline: 2px solid #4A90D9;
  outline-offset: 2px;
}

/* ❌ 永远不要全局移除 outline */
*:focus {
  outline: none;  /* 破坏键盘导航！ */
}

/* ✅ 如果必须移除，提供替代样式 */
*:focus {
  outline: none;
}
*:focus-visible {
  outline: 2px solid #4A90D9;
  outline-offset: 2px;
}
```

### 焦点陷阱（Modal）

```js
/**
 * 焦点陷阱：确保 Tab 键在模态框内循环
 */
class FocusTrap {
  constructor(container) {
    this.container = container
    this.focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')
  }

  activate() {
    this.originalElement = document.activeElement
    this.container.setAttribute('tabindex', '-1')
    this.container.focus()

    this.handler = (e) => {
      if (e.key !== 'Tab') return

      const focusableElements = this.container
        .querySelectorAll(this.focusableSelector)
        .filter(el => this.isVisible(el))

      if (focusableElements.length === 0) return

      const firstEl = focusableElements[0]
      const lastEl = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift+Tab：从第一个跳到最后一个
        if (document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        }
      } else {
        // Tab：从最后一个跳回第一个
        if (document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }

    this.container.addEventListener('keydown', this.handler)
  }

  deactivate() {
    this.container.removeEventListener('keydown', this.handler)
    this.originalElement?.focus()
  }

  isVisible(el) {
    return el.offsetParent !== null
  }
}

// 使用
const modal = document.getElementById('modal')
const trap = new FocusTrap(modal)

function openModal() {
  modal.style.display = 'flex'
  trap.activate()
}

function closeModal() {
  modal.style.display = 'none'
  trap.deactivate()
}
```

### 模态框完整实现

```jsx
function Modal({ isOpen, onClose, title, children }) {
  const modalRef = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement
      modalRef.current?.focus()
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      previousFocus.current?.focus()
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    }
    // 焦点陷阱
    if (e.key === 'Tab') {
      const focusable = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable?.length) {
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      ref={modalRef}
    >
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content">
        <h2 id="modal-title">{title}</h2>
        <div>{children}</div>
        <button onClick={onClose} aria-label="关闭对话框">✕</button>
      </div>
    </div>
  )
}
```

### 键盘快捷键

```js
// 全局快捷键管理
class KeyboardShortcuts {
  constructor() {
    this.shortcuts = new Map()
  }

  register(keyCombo, handler, options = {}) {
    this.shortcuts.set(keyCombo, { handler, options })
  }

  setup() {
    document.addEventListener('keydown', (e) => {
      for (const [combo, { handler, options }] of this.shortcuts) {
        if (this.matches(e, combo, options)) {
          e.preventDefault()
          handler(e)
        }
      }
    })
  }

  matches(e, combo, options = {}) {
    const keys = combo.toLowerCase().split('+')
    return keys.every(k => {
      if (k === 'ctrl') return e.ctrlKey || e.metaKey
      if (k === 'alt') return e.altKey
      if (k === 'shift') return e.shiftKey
      return e.key.toLowerCase() === k
    })
  }
}

// 使用
const shortcuts = new KeyboardShortcuts()
shortcuts.register('n', () => console.log('新建'))           // Ctrl+N
shortcuts.register('ctrl+n', () => console.log('Ctrl+N'))
shortcuts.register('escape', () => closeModal())
shortcuts.register('ctrl+s', () => save())
shortcuts.setup()
```

---

## 6. 色彩与对比度

### WCAG 对比度要求

```
对比度要求（WCAG 2.2）：

┌──────────────────┬──────────┬──────────┐
│ 级别             │ 正文     │ 大文本   │
│                  │ (<18pt)  │ (≥18pt)  │
├──────────────────┼──────────┼──────────┤
│ AA 常规          │ 4.5:1    │ 3:1      │
│ AA 增强          │ 7:1      │ 4.5:1    │
│ AAA 常规         │ 7:1      │ 4.5:1    │
│ AAA 增强         │ 10:1     │ 7:1      │
└──────────────────┴──────────┴──────────┘

大文本定义：
  - 粗体 ≥ 14pt (18.66px)
  - 常规 ≥ 18.66pt (24.83px)

组件对比度（AA）：
  - UI 组件（边框、输入框）: ≥ 3:1
  - 可交互元素的焦点状态: ≥ 3:1
```

### 常用配色方案

```css
/* ✅ 通过 AA 标准的配色 */
:root {
  /* 深色文字 + 浅色背景 */
  --text-primary: #1a1a1a;    /* 对比度 16.1:1 */
  --text-secondary: #4a4a4a;  /* 对比度 8.8:1 */
  --text-muted: #6b6b6b;      /* 对比度 5.4:1 */

  /* 品牌色 */
  --brand-primary: #0055cc;   /* 对比度 5.6:1 */
  --brand-light: #e8f0fe;     /* 对比度 3.2:1（仅用于大文本/图形） */

  /* 状态色 */
  --success: #1b7a3d;         /* 对比度 4.6:1 */
  --warning: #9c6700;         /* 对比度 4.5:1 */
  --error: #c62828;           /* 对比度 6.8:1 */
}

/* ❌ 不通过的配色 */
--light-gray: #cccccc;   /* 对比度 1.5:1 */
--light-blue: #aaccff;   /* 对比度 2.1:1 */
```

### 不只是颜色

```css
/* ❌ 只用颜色传达信息 */
.error { color: red; }
.success { color: green; }

/* ✅ 颜色 + 图标/文字 */
.error {
  color: #c62828;
  &::before { content: '⚠ '; }
}
.success {
  color: #1b7a3d;
  &::before { content: '✓ '; }
}

/* ❌ 只用颜色区分状态 */
.tab.active { background: blue; }
.tab.inactive { background: gray; }

/* ✅ 颜色 + 边框/下划线 */
.tab.active {
  background: blue;
  color: white;
  border-bottom: 3px solid white;
}
```

### 色盲友好设计

```css
/* 模拟色盲效果（开发调试用） */
@media (forced-colors: active) {
  /* 高对比度模式 */
  * {
    border-color: ButtonText !important;
    background-color: Canvas !important;
    color: CanvasText !important;
  }
}

/* 色弱模拟滤镜（调试用） */
.protanopia {
  filter: url('#protanopia');
}
.deuteranopia {
  filter: url('#deuteranopia');
}
.tritanopia {
  filter: url('#tritanopia');
}
```

```js
// 检测色觉异常（实验性 API）
if (window.matchMedia('(color-gamut: p3)').matches) {
  // 支持广色域，可以使用更多颜色
}
```

---

## 7. 动态内容无障碍

### Live Regions

```html
<!-- 页面加载时播报 -->
<div aria-live="polite" aria-atomic="true">
  页面已加载，共 10 条记录
</div>

<!-- 用户操作时播报 -->
<div aria-live="assertive" id="notification">
  <!-- 通过 JS 更新内容 -->
</div>

<script>
function showNotification(message) {
  const el = document.getElementById('notification')
  el.textContent = message
  // aria-live 会自动播报变化
}

// 表单提交
form.addEventListener('submit', async (e) => {
  e.preventDefault()
  showNotification('正在保存...')
  await saveData()
  showNotification('保存成功！')
})
</script>
```

### 加载状态

```html
<!-- 按钮加载状态 -->
<button aria-busy="true" disabled>
  <span class="spinner"></span>
  加载中...
</button>

<!-- 列表加载状态 -->
<ul aria-busy="true" aria-live="polite">
  <li>加载中...</li>
</ul>

<!-- 骨架屏 + 加载完成通知 -->
<div aria-live="polite" id="loading-status">
  加载中...
</div>
<!-- JS 完成后更新 -->
document.getElementById('loading-status').textContent = '已加载 50 条记录'
```

### 表单验证无障碍

```html
<div class="form-group">
  <label for="email">邮箱地址</label>
  <input
    id="email"
    type="email"
    required
    aria-required="true"
    aria-invalid="false"
    aria-describedby="email-help email-error"
  >
  <small id="email-help">请输入您的注册邮箱</small>
  <p id="email-error" role="alert" class="error-message" hidden>
    请输入有效的邮箱地址
  </p>
</div>

<script>
const emailInput = document.getElementById('email')
const emailError = document.getElementById('email-error')

emailInput.addEventListener('input', () => {
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)

  emailInput.setAttribute('aria-invalid', String(!isValid))

  if (!isValid && emailInput.value) {
    emailError.hidden = false
    emailError.textContent = '请输入有效的邮箱地址'
  } else {
    emailError.hidden = true
  }
})

// 提交时汇总错误
form.addEventListener('submit', (e) => {
  const errors = []
  if (!emailInput.checkValidity()) {
    errors.push('邮箱地址无效')
  }

  if (errors.length > 0) {
    e.preventDefault()
    // 将错误摘要放到表单顶部
    const summary = document.getElementById('error-summary')
    summary.innerHTML = `<h2>请修正以下错误：</h2><ul>${
      errors.map(e => `<li><a href="#${getFirstInvalidField()}">${e}</a></li>`).join('')
    }</ul>`
    summary.hidden = false
    summary.focus()
  }
})
</script>
```

---

## 8. React 无障碍

### 常见组件无障碍实现

```tsx
// 无障碍按钮
function IconButton({ onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}  // tooltip 也作为备选
    >
      {children}
    </button>
  )
}

// 无障碍链接
function ExternalLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <span className="sr-only">（在新窗口打开）</span>
    </a>
  )
}

// 无障碍图片
function Avatar({ src, name }) {
  return (
    <img
      src={src}
      alt={`${name} 的头像`}
      loading="lazy"
    />
  )
}

// 无障碍进度条
function ProgressBar({ value, max = 100, label }) {
  const percent = Math.round((value / max) * 100)
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      aria-describedby={`${label}-percent`}
    >
      <div style={{ width: `${percent}%` }} />
      <span id={`${label}-percent`}>{percent}%</span>
    </div>
  )
}
```

### React Hook：useFocusTrap

```tsx
import { useEffect, useRef } from 'react'

function useFocusTrap(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const focusableSelector = [
      'a[href]', 'button', 'input', 'select', 'textarea',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusable = Array.from(
        container.querySelectorAll(focusableSelector)
      ).filter(el => el.offsetParent !== null)

      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    container.addEventListener('keydown', handler)
    return () => container.removeEventListener('keydown', handler)
  }, [containerRef])
}
```

### React Hook：useAnnounce（屏幕阅读器播报）

```tsx
import { useRef, useEffect } from 'react'

function useAnnounce() {
  const announcerRef = useRef<HTMLDivElement>(null)

  function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const el = announcerRef.current
    if (!el) return

    el.setAttribute('aria-live', priority)
    el.textContent = ''

    // 强制浏览器重新读取
    requestAnimationFrame(() => {
      el.textContent = message
    })
  }

  return { announcerRef, announce }
}

// 使用
function App() {
  const { announcerRef, announce } = useAnnounce()

  return (
    <>
      <div ref={announcerRef} className="sr-only" aria-live="polite" />
      <button onClick={() => announce('表单保存成功！')}>保存</button>
    </>
  )
}
```

---

## 9. Vue 无障碍

### Vue 无障碍指令

```js
// directives/a11y.js
export const focus = {
  mounted(el) {
    el.focus()
  }
}

export const trapFocus = {
  mounted(el) {
    const focusable = el.querySelectorAll(
      'a[href], button, input, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
      if (e.key === 'Escape') {
        el.dispatchEvent(new CustomEvent('close'))
      }
    })
  },
  beforeUnmount(el) {
    el.removeEventListener('keydown', el._handler)
  }
}
```

### Vue 组件无障碍示例

```vue
<template>
  <!-- 模态框 -->
  <Teleport to="body">
    <div
      v-if="isOpen"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      class="modal"
      @keydown.escape="close"
    >
      <div class="overlay" @click="close" />
      <div class="content" v-focus-trap>
        <h2 :id="titleId">{{ title }}</h2>
        <slot />
        <button @click="close" aria-label="关闭">✕</button>
      </div>
    </div>
  </Teleport>

  <!-- 无障碍播报 -->
  <div ref="announcer" class="sr-only" aria-live="polite" />
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
})

const isOpen = ref(false)
const announcer = ref(null)

function close() {
  isOpen.value = false
  announce('对话框已关闭')
}

function announce(message) {
  if (!announcer.value) return
  announcer.value.textContent = ''
  nextTick(() => {
    announcer.value.textContent = message
  })
}
</script>
```

---

## 10. 无障碍测试

### 自动化测试工具

```bash
# axe-core（最流行的无障碍测试库）
npm install axe-core

# pa11y（命令行工具）
npx pa11y https://example.com

# Lighthouse（Chrome DevTools 内置）
# 打开 DevTools → Lighthouse → 勾选 "Accessibility" → 分析
```

### 自动化测试代码

```js
// 使用 axe-core
import axios from 'axios'
import { axe } from 'axe-core'

async function testAccessibility(url) {
  const html = await axios.get(url).then(r => r.data)
  // 在 DOM 中运行 axe
  const results = axe.run(html)
  return results
}

// Jest 测试
describe('Accessibility', () => {
  it('should not have automatically detectable violations', async () => {
    const results = await testAccessibility('/')
    expect(results.violations).toHaveLength(0)
  })
})
```

### Playwright 键盘测试

```js
// tests/a11y.spec.js
import { test, expect } from '@playwright/test'

test('keyboard navigation', async ({ page }) => {
  await page.goto('/')

  // 测试 Tab 键导航
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toBeVisible()

  // 测试模态框焦点陷阱
  await page.click('#open-modal')
  await page.keyboard.press('Tab')
  await expect(page.locator('.modal :focus')).toBeVisible()

  // 测试 Escape 关闭
  await page.keyboard.press('Escape')
  await expect(page.locator('.modal')).not.toBeVisible()
})

test('focus order', async ({ page }) => {
  await page.goto('/')
  const focusOrder = []

  // 追踪焦点顺序
  page.on('focus', () => {
    focusOrder.push(page.evaluate(() => document.activeElement?.id))
  })

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab')
  }

  // 焦点顺序应符合视觉顺序
  expect(focusOrder).toMatchSnapshot()
})
```

### 手动测试清单

```
键盘测试：
□ 能否只用 Tab/Shift+Tab 导航到所有可交互元素？
□ 焦点顺序是否与视觉顺序一致？
□ 所有交互是否可用 Enter/Space/Arrow Keys 操作？
□ 模态框是否有焦点陷阱？
□ Escape 键是否能关闭模态框/下拉菜单？
□ 自定义焦点样式是否可见？

屏幕阅读器测试（NVDA / VoiceOver / JAWS）：
□ 页面标题是否正确？
□ 导航链接是否可找到？
□ 表单标签是否正确播报？
□ 动态更新是否有 aria-live 播报？
□ 图片 alt 文本是否有意义？
□ 表格是否有 caption 和 scope？

视觉测试：
□ 文字与背景对比度 ≥ 4.5:1？
□ 信息是否仅通过颜色传达？（❌ 否）
□ 焦点指示器是否可见？
□ 缩放 200% 后内容是否可读？
□ 文字是否不重叠？
```

---

## 11. 常见反模式

```
❌ 反模式                          ✅ 正确做法
─────────────────────────────────────────────────────
用 div 做按钮，无键盘支持           用 <button>
用 color 传达状态                 color + 图标/文字
移除所有 outline                  用 :focus-visible 替代
aria-hidden 包裹可交互元素        用 display:none 完全隐藏
标题层级跳跃                      按顺序使用 h1→h6
alt 为空（非装饰图）              有意义的 alt 文本
纯装饰图 alt 为空                 alt="" + role="presentation"
aria-label 与文本重复             aria-label 用于图标按钮
role 改变原生元素行为             保持原生语义
```

---

## 参考

- [MDN - ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [axe-core](https://github.com/dequelabs/axe-core)
- [Pa11y](https://pa11y.org/)
- [Deque University](https://dequeuniversity.com/)
