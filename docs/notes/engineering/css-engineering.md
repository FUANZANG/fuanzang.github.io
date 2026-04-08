# CSS 工程化方案

> 📌 本文件记录前端 CSS 工程化方案：预处理器、PostCSS、CSS Modules、CSS-in-JS、原子化 CSS（Tailwind/UnoCSS）的原理、用法与选型对比。
>
> 📅 基于以下版本：Tailwind CSS 4.x | UnoCSS 66.x | Sass 1.x | Less 4.x | PostCSS 8.x | styled-components 6.x | Emotion 11.x
>
> 🔗 Sass/SCSS 语法速查见 [CSS ](/notes/foundations/css)

---

## 1. CSS 工程化演进

```
原始 CSS
  ↓ 问题：全局作用域、重复代码、无逻辑能力
预处理器 (Sass/Less/Stylus)
  ↓ 问题：仍是全局作用域，运行时编译慢
后处理器 (PostCSS)
  ↓ 问题：解决了 autoprefixer 等问题，但作用域仍全局
CSS Modules
  ↓ 解决了作用域，但类名不可预测、跨组件复用难
CSS-in-JS (styled-components/Emotion)
  ↓ 问题：运行时性能开销、SSR 复杂
原子化 CSS (Tailwind/UnoCSS)
  ↓ 纯工具类，零运行时，按需生成
```

### 各方案解决的核心问题

| 问题 | 原始 CSS | 预处理器 | PostCSS | CSS Modules | CSS-in-JS | 原子化 CSS |
|------|---------|---------|---------|-------------|-----------|-----------|
| 全局作用域 | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| 样式复用 | ❌ | ✅ mixin | ❌ | ❌ | ✅ | ✅ |
| 自动前缀 | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| 无运行时开销 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| 逻辑能力 | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| SSR 友好 | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |

---

## 2. 预处理器（Sass / Less / Stylus）

预处理器在 CSS 之上添加了变量、嵌套、混入、函数等编程能力，**编译时**转换为原生 CSS。

### Sass / SCSS

> Sass 有两种语法：SCSS（`{}` 分号，兼容 CSS）和 Sass（缩进式）。SCSS 更常用。

```scss
// variables.scss
$primary-color: #409eff;
$breakpoint: 768px;

// 嵌套 + 变量
.button {
  background: $primary-color;

  &:hover {
    background: darken($primary-color, 10%);  // 内置函数
  }

  // 嵌套媒体查询
  @media (max-width: $breakpoint) {
    width: 100%;
  }
}

// mixin — 复用代码块
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  @include flex-center;  // 使用 mixin
  padding: 16px;
}

// 继承
%base-button {
  border: none;
  cursor: pointer;
  padding: 8px 16px;
}

.primary-button {
  @extend %base-button;
  background: $primary-color;
}

// 函数
@function rem($px) {
  @return $px / 16px * 1rem;
}

.title {
  font-size: rem(20px);  // → 1.25rem
}

// 条件与循环
@for $i from 1 through 3 {
  .col-#{$i} {
    width: 100% / 3 * $i;
  }
}
```

### Less

```less
// 语法类似 Sass，但用 @ 而非 $ 声明变量
@primary-color: #409eff;

.button {
  background: @primary-color;

  .child {
    color: white;
  }
}

// mixin（直接用类名）
.flex-center() {
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  .flex-center();  // 调用 mixin
}
```

### Vite 中使用 Sass

```bash
npm install -D sass
```

```ts
// vite.config.ts — Sass 无需额外配置，Vite 内置支持
// 只需在组件中用 <style lang="scss"> 或 import .scss 文件

// 全局注入变量（每个文件都能用 $primary-color）
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`
      }
    }
  }
})
```

### 预处理器的局限

```
✅ 优点：
- 变量、嵌套、mixin 提升开发效率
- 编译时处理，无运行时开销
- 生态成熟，广泛支持

❌ 局限：
- 仍是全局作用域（类名冲突）
- 编译后的 CSS 体积不可控（mixin 展开后重复）
- 无法动态生成样式（不能根据 JS 状态改变样式）
- 不解决样式与组件的关联问题
```

---

## 3. PostCSS

PostCSS 是一个**用 JS 插件转换 CSS 的工具**。本身不做任何事，所有功能通过插件实现。

### 核心概念

```
PostCSS 工作流：

CSS 源码
  ↓ parse → AST（抽象语法树）
  ↓ 插件 1: autoprefixer（加浏览器前缀）
  ↓ 插件 2: postcss-nested（展开嵌套）
  ↓ 插件 3: postcss-preset-env（未来语法 → 现在语法）
  ↓ stringify
输出 CSS
```

### 常用插件

| 插件 | 功能 |
|------|------|
| `autoprefixer` | 自动添加浏览器前缀 |
| `postcss-preset-env` | 将未来 CSS 语法转换为当前浏览器支持的语法 |
| `postcss-nested` | 支持嵌套规则（类似 Sass） |
| `postcss-import` | 处理 `@import` 内联 |
| `postcss-px-to-viewport` | px → vw（移动端适配） |
| `postcss-pxtorem` | px → rem |
| `cssnano` | CSS 压缩 |

### 配置

```js
// postcss.config.js
module.exports = {
  plugins: [
    require('autoprefixer'),           // 自动前缀
    require('postcss-nested'),          // 嵌套
    require('postcss-preset-env')({     // 未来语法
      stage: 3
    }),
    require('cssnano')({                // 压缩（仅生产环境）
      preset: 'default'
    })
  ]
}
```

```ts
// Vite 中配置 PostCSS
export default defineConfig({
  css: {
    postcss: {
      plugins: [
        // 同上
      ]
    }
  }
})
```

### PostCSS vs 预处理器

```
PostCSS：
  - 后处理器，转换已有 CSS
  - 插件化，按需使用
  - 可以处理预处理器输出的 CSS
  - autoprefixer 是最大卖点

Sass/Less：
  - 预处理器，需要自己的语法
  - 功能内置（变量、嵌套、mixin）
  - 编译为 CSS 后还可被 PostCSS 处理

实际项目：Sass + PostCSS 经常一起用
  Sass 处理开发体验（变量/嵌套/mixin）
  PostCSS 处理兼容性（autoprefixer）和优化（cssnano）
```

---

## 4. CSS Modules

CSS Modules 在构建时自动生成**唯一的类名**，实现样式局部作用域。

### 原理

```css
/* Button.module.css */
.button {
  background: blue;
}
```

```tsx
// 编译后：
// .button → ._button_x1y2z3（带 hash 的唯一类名）
// 不同文件的 .button 不会冲突
```

### 使用方式

```tsx
// React
import styles from './Button.module.css'

function Button() {
  return <button className={styles.button}>Click</button>
  // className="_button_x1y2z3"
}
```

```vue
<!-- Vue — 用 <style module> -->
<template>
  <button :class="$style.button">Click</button>
</template>

<style module>
.button {
  background: blue;
}
</style>

<!-- 组合多个类 -->
<template>
  <button :class="[$style.button, $style.primary]">Click</button>
</template>
```

### 全局类名与 composes

```css
/* Button.module.css */
:global(.reset-margin) {  /* 全局类名，不加 hash */
  margin: 0;
}

.button {
  composes: base from './base.module.css';  /* 从其他文件引入 */
  background: blue;
}

/* 同文件内 compose */
.primary {
  composes: button;
  background: blue;
}
```

### CSS Modules 的优缺点

```
✅ 优点：
- 零运行时开销（构建时处理）
- 天然的局部作用域，无类名冲突
- 与框架无关（React/Vue 都支持）
- 学习成本低（就是写 CSS）

❌ 缺点：
- 类名变长（._button_x1y2z3）
- 动态样式困难（不能根据 JS 状态生成样式）
- 跨组件复用样式不方便
- 调试时类名不直观
```

---

## 5. CSS-in-JS

CSS-in-JS 将 CSS 写在 JS 中，利用 JS 的能力实现动态样式、主题切换等。

### styled-components

```tsx
import styled from 'styled-components'

// 基础用法
const Button = styled.button`
  background: ${props => props.primary ? '#409eff' : '#fff'};
  color: ${props => props.primary ? '#fff' : '#333'};
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;

  &:hover {
    opacity: 0.8;
  }
`

// 使用
<Button primary>主要按钮</Button>
<Button>默认按钮</Button>

// 继承
const LargeButton = styled(Button)`
  padding: 12px 24px;
  font-size: 16px;
`

// 传入组件样式（styled(Component)）
const StyledLink = styled(Link)`
  color: #409eff;
  text-decoration: none;
`
```

```tsx
// 主题
import { ThemeProvider } from 'styled-components'

const theme = {
  colors: {
    primary: '#409eff',
    danger: '#f56c6c'
  },
  spacing: {
    md: '16px',
    lg: '24px'
  }
}

<ThemeProvider theme={theme}>
  <App />
</ThemeProvider>

const Button = styled.button`
  background: ${props => props.theme.colors.primary};
  padding: ${props => props.theme.spacing.md};
`
```

### Emotion

```tsx
import { css } from '@emotion/css'
import styled from '@emotion/styled'

// 1. css prop（推荐）
function Button({ primary, children }) {
  return (
    <button
      css={css`
        background: ${primary ? '#409eff' : '#fff'};
        padding: 8px 16px;
      `}
    >
      {children}
    </button>
  )
}

// 2. styled API（类似 styled-components）
const Button = styled.button`
  background: ${props => props.primary ? '#409eff' : '#fff'};
`

// 3. 对象风格
const style = css({
  background: 'blue',
  padding: '8px 16px'
})
```

### CSS-in-JS 的优缺点

```
✅ 优点：
- 真正的局部作用域
- 动态样式（根据 props/state 生成样式）
- 主题系统简单（ThemeProvider）
- 样式与组件绑定，不会遗漏
- SSR 支持（需额外配置）

❌ 缺点：
- 运行时性能开销（JS 解析 + 生成 CSS + 注入）
- 包体积增加（styled-components ~12KB min+gzip）
- 调试困难（类名是 hash，DevTools 不直观）
- 学习曲线
- 不能用常规 CSS 工具（PostCSS 等）
- 与部分库不兼容（如需要提取 CSS 的场景）
```

> ⚠️ CSS-in-JS 运行时方案在 React 19 Server Components 中不兼容（运行时注入样式需要客户端 JS）。React 官方目前推荐转向 CSS Modules 或 Tailwind 等零运行时方案。

---

## 6. 原子化 CSS（Tailwind CSS）

### 核心理念

不写自定义 CSS，而是用**预设的工具类**组合样式：

```tsx
// 传统 CSS
<button class="btn-primary">按钮</button>
/* .btn-primary { background: blue; color: white; padding: 8px 16px; border-radius: 4px; } */

// Tailwind
<button class="bg-blue-500 text-white px-4 py-2 rounded">按钮</button>
```

### Tailwind CSS v4 安装（Vite）

> Tailwind v4 推荐用专用 Vite 插件，不再需要 PostCSS 配置和 `tailwind.config.js`（配置写在 CSS 中）。

```bash
npm install tailwindcss @tailwindcss/vite
```

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()]
})
```

```css
/* main.css — v4 用 @import 替代 @tailwind 指令 */
@import "tailwindcss";

/* 自定义主题（v4 在 CSS 中用 @theme 配置） */
@theme {
  --color-primary: #409eff;
  --color-danger: #f56c6c;
}
```

### Tailwind v4 vs v3 关键变化

| 变化 | v3 | v4 |
|------|-----|---|
| 安装方式 | PostCSS 插件 | 专用 Vite/PostCSS 插件 |
| 配置 | `tailwind.config.js` | CSS 中 `@theme` |
| 引入方式 | `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| 浏览器要求 | 宽松 | Safari 16.4+, Chrome 111+, Firefox 128+ |
| 前缀处理 | 需要 autoprefixer | 内置自动处理 |
| 性能 | 快 | 更快（Oxide 引擎） |

### 常用工具类

```html
<!-- 布局 -->
<div class="flex items-center justify-between">...</div>
<div class="grid grid-cols-3 gap-4">...</div>
<div class="absolute top-0 right-0">...</div>

<!-- 间距 -->
<div class="p-4 m-2">...</div>  <!-- padding: 1rem; margin: 0.5rem -->

<!-- 响应式 -->
<div class="text-sm md:text-lg lg:text-xl">...</div>
<!-- sm: 640px, md: 768px, lg: 1024px, xl: 1280px -->

<!-- 状态 -->
<button class="bg-blue-500 hover:bg-blue-600 active:bg-blue-700">...</button>
<input class="focus:ring-2 focus:ring-blue-500" />

<!-- 暗色模式 -->
<div class="bg-white dark:bg-gray-900">...</div>

<!-- 任意值 -->
<div class="w-[300px] text-[#1da1f2]">...</div>
```

### 自定义配置（v4）

```css
/* 在 CSS 中配置 */
@import "tailwindcss";

@theme {
  /* 自定义颜色 */
  --color-brand: #409eff;
  --color-brand-light: #79bbff;

  /* 自定义间距 */
  --spacing-18: 4.5rem;

  /* 自定义断点 */
  --breakpoint-3xl: 1920px;
}
```

```html
<!-- 使用自定义值 -->
<div class="bg-brand text-spacing-18">...</div>
```

### @apply 和 @layer

```css
/* 在 CSS 文件中复用工具类 */
@import "tailwindcss";

/* @layer components — 自定义组件类 */
@layer components {
  .btn-primary {
    @apply bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600;
  }
}

/* @layer utilities — 自定义工具类 */
@layer utilities {
  .scrollbar-hide {
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

### Vue 中使用

```vue
<template>
  <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
    {{ text }}
  </button>
</template>
```

### Tailwind 的优缺点

```
✅ 优点：
- 零运行时（构建时生成）
- 按需生成（只生成用到的类）
- 不用想类名（直接写工具类）
- 一致性（设计系统内置在配置中）
- 体积小（生产环境通常 10-30KB）
- 响应式/暗色模式/状态变体内置

❌ 缺点：
- HTML 中类名很长（可读性差）
- 学习曲线（要记工具类名）
- 复杂样式仍需自定义 CSS
- 不适合需要大量自定义动画/复杂选择器的场景
- IDE 支持需要插件（Tailwind CSS IntelliSense）
```

---

## 7. UnoCSS（原子化 CSS 引擎）

UnoCSS 是 Tailwind 的替代方案，由 Anthony Fu（Vue/Nuxt 核心团队）开发。**更快、更灵活、可扩展**。

### 安装（Vite）

```bash
npm install -D unocss
```

```ts
// vite.config.ts
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [UnoCSS()]
})
```

```ts
// uno.config.ts
import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),  // Tailwind 兼容的预设
  ],
})
```

```ts
// main.ts
import 'virtual:uno.css'
```

### 与 Tailwind 的区别

| | Tailwind v4 | UnoCSS |
|---|---|---|
| 定位 | 框架 | 引擎 |
| 工具类 | 预定义 | 可自定义规则 |
| 预设 | 内置 | 模块化（presetUno/presetAttributify/presetIcons 等） |
| 速度 | 快（Oxide） | 快 |
| 任意规则 | 不支持 | ✅ 支持自定义 RegExp 规则 |
| 属性模式 | 不支持 | ✅ presetAttributify |
| 图标 | 不支持 | ✅ presetIcons（任意图标集） |

### UnoCSS 特色功能

```ts
// uno.config.ts
import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),         // Tailwind 兼容
    presetAttributify(), // 属性模式
    presetIcons(),       // 图标支持
  ],

  // 自定义规则
  rules: [
    // 静态规则
    ['m-1', { margin: '1px' }],

    // 动态规则（RegExp）
    [/^m-(\d+)$/, ([, num]) => ({ margin: `${num}px` })],
  ],

  // 快捷方式
  shortcuts: {
    'btn': 'px-4 py-2 rounded inline-block cursor-pointer',
    'btn-primary': 'btn bg-blue-500 text-white hover:bg-blue-600',
  },
})
```

```html
<!-- 属性模式（presetAttributify） -->
<button text="sm white" font="bold" p="x-4 y-2" rounded="lg" bg="blue-500">
  按钮
</button>

<!-- 图标（presetIcons） -->
<div class="i-carbon-sun" />
<div class="i-mdi-account-circle text-2xl" />

<!-- 快捷方式 -->
<button class="btn-primary">按钮</button>
```

---

## 8. Scoped CSS（Vue 内置）

Vue 的 `<style scoped>` 是框架内置的样式隔离方案，编译时给元素和选择器加属性标记。

```vue
<template>
  <button class="btn">Click</button>
</template>

<style scoped>
.btn {
  background: blue;
}
/* 编译后：.btn[data-v-x1y2z3] { background: blue; } */
</style>
```

```vue
<!-- 穿透 scoped（影响子组件根元素） -->
<style scoped>
:deep(.child-class) {
  color: red;
}
</style>

<!-- 全局样式 + scoped 混用 -->
<style>
/* 全局 */
</style>

<style scoped>
/* 局部 */
</style>
```

### Scoped CSS 的局限

```
✅ 优点：
- Vue 内置，零配置
- 编译时处理，无运行时开销
- 样式与组件绑定

❌ 缺点：
- 只能影响当前组件
- 跨组件样式需要 :deep()，不直观
- 仍是类名 + 属性选择器，不是真正的 CSS Modules
- 无法动态生成样式
```

---

## 9. 全部方案对比

| | 预处理器 | PostCSS | CSS Modules | CSS-in-JS | Tailwind | UnoCSS | Scoped CSS |
|---|---|---|---|---|---|---|---|
| **作用域** | 全局 | 全局 | 局部 | 局部 | 局部 | 局部 | 局部 |
| **运行时** | 无 | 无 | 无 | 有 | 无 | 无 | 无 |
| **动态样式** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **学习成本** | 低 | 低 | 低 | 中 | 中 | 中 | 低 |
| **框架绑定** | 无 | 无 | 无 | React | 无 | 无 | Vue |
| **SSR** | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| **RSC 兼容** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **体积控制** | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |

---

## 10. 选型建议

### 按项目类型

```
Vue 项目：
  → 简单项目：Scoped CSS（内置，零配置）
  → 中型项目：Scoped CSS + Sass（变量/mixin）
  → 大型项目：UnoCSS 或 Tailwind（原子化）
  → 组件库：Sass + CSS Modules（可控 + 隔离）

React 项目：
  → 简单项目：CSS Modules
  → 中型项目：Tailwind / UnoCSS
  → 大型项目：Tailwind + CSS Modules（复杂组件）
  → 需要 RSC：避免 CSS-in-JS，用 Tailwind 或 CSS Modules

需要动态主题：
  → CSS Variables（零依赖，原生支持）
  → Tailwind dark: 变体
  → 不建议用 CSS-in-JS 仅为主题

需要极致灵活：
  → UnoCSS（自定义规则 + 预设组合）
```

### 组合使用

```
常见组合：

1. Tailwind + 少量自定义 CSS
   → 90% 用工具类，复杂动画/特殊选择器用 @layer
   → 最流行的现代方案

2. Sass + Scoped CSS（Vue）
   → Sass 提供变量/mixin，Scoped 提供隔离
   → 传统 Vue 项目常见

3. CSS Modules + Sass
   → Modules 提供隔离，Sass 提供逻辑
   → React 传统方案

4. UnoCSS + presetIcons
   → 原子化 + 图标一站式
   → Vue 3 / Nuxt 3 常见
```

---

## 11. CSS Variables（原生主题方案）

不依赖任何库，用 CSS 自定义属性实现主题切换。

```css
:root {
  --color-primary: #409eff;
  --color-bg: #ffffff;
  --color-text: #333333;
  --spacing-unit: 4px;
}

/* 暗色主题 — 覆盖变量 */
.dark {
  --color-primary: #79bbff;
  --color-bg: #1a1a1a;
  --color-text: #e0e0e0;
}

/* 使用变量 */
.button {
  background: var(--color-primary);
  color: var(--color-text);
  padding: calc(var(--spacing-unit) * 2);
}

/* JS 动态修改变量 */
```

```ts
// JS 设置 CSS 变量
document.documentElement.style.setProperty('--color-primary', '#ff0000')

// Vue 中
import { ref } from 'vue'
const primaryColor = ref('#409eff')
// <div :style="{ '--color-primary': primaryColor }">
```

```tsx
// React 中
<div style={{ '--color-primary': primaryColor } as React.CSSProperties}>
```

### CSS Variables 的优势

```
✅ 原生支持，零依赖
✅ 运行时可修改（JS 可读写）
✅ 继承和级联（跟随 DOM 树）
✅ Tailwind v4 底层就是用 CSS Variables
✅ 可以实现运行时主题切换（不需要重新构建）

❌ IE 不支持（现在不是问题了）
❌ 没有类型提示（TS 中需要 as CSSProperties）
```

---

## 12. 最佳实践

### 命名规范（BEM）

```css
/* BEM — Block__Element--Modifier */
.card { }              /* Block */
.card__title { }       /* Element */
.card--featured { }    /* Modifier */
.card__title--large { }

/* 在 Sass 中 */
.card {
  &__title {
    &--large { font-size: 1.5rem; }
  }
  &--featured { border: 2px solid gold; }
}
```

### 避免深层嵌套

```scss
// ❌ 过深嵌套（选择器性能差 + 优先级高）
.nav {
  .list {
    .item {
      .link {
        color: blue;
      }
    }
  }
}
// → .nav .list .item .link { color: blue; }

// ✅ 扁平化
.nav-link {
  color: blue;
}
```

### Tailwind 类名管理

```tsx
// ❌ 类名太长，难维护
<button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 active:bg-blue-700 transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none">
  按钮
</button>

// ✅ 提取组件（React）
function Button({ children }) {
  return (
    <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
      {children}
    </button>
  )
}

// ✅ 用 @apply（CSS 中）
@layer components {
  .btn-primary {
    @apply bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors;
  }
}

// ✅ 用 cva（class-variance-authority）
import { cva } from 'class-variance-authority'
const button = cva('px-4 py-2 rounded', {
  variants: {
    variant: {
      primary: 'bg-blue-500 text-white hover:bg-blue-600',
      danger: 'bg-red-500 text-white hover:bg-red-600',
    }
  }
})
<button className={button({ variant: 'primary' })}>按钮</button>
```

### 样式文件组织

```
src/
├── styles/
│   ├── variables.scss       # 全局变量
│   ├── mixins.scss          # 全局 mixin
│   ├── reset.css            # 样式重置
│   └── index.css            # 入口（@import 各模块）
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── Button.module.css  # 组件级样式
│   └── ...
└── App.tsx
```

---

## 13. 常见踩坑

### Tailwind 类名不生效

```
问题：自定义类名或动态拼接的类名不生成 CSS
原因：Tailwind 通过静态分析源码提取类名，动态拼接无法检测

// ❌ 动态拼接 → Tailwind 检测不到
<div class={`bg-${color}-500`}>  // 不生成！

// ✅ 完整类名
<div class={color === 'blue' ? 'bg-blue-500' : 'bg-red-500'}>

// ✅ 或用 safelist（v3）/ safelist 配置
// 或用 UnoCSS 的 safelist
```

### Scoped 样式不生效

```vue
<!-- ❌ scoped 不能影响子组件内部 -->
<ChildComponent class="custom" />
<style scoped>
.custom { color: red; }  /* 只影响 ChildComponent 的根元素 */
</style>

<!-- ✅ 用 :deep() -->
<style scoped>
:deep(.child-inner) { color: red; }
</style>
```

### CSS Modules + 第三方库

```tsx
// 第三方库的类名被 CSS Modules hash 了
import styles from './App.module.css'
<Dialog className={styles.dialog} />  // 第三方组件内部用 .dialog-body 不会被影响

// ✅ 用 :global()
:global(.el-dialog__body) {
  padding: 0;
}
```

### CSS-in-JS SSR 闪烁

```
问题：服务端渲染时样式未注入，客户端 hydrate 后才注入 → 闪烁
解决：
  styled-components: 用 ServerStyleSheet 收集样式注入 HTML
  Emotion: 用 extractCritical 提取关键样式
```

---

## 参考

- [Tailwind CSS 官方文档](https://tailwindcss.com/docs)
- [UnoCSS 官方文档](https://unocss.dev/)
- [Sass 官方文档](https://sass-lang.com/)
- [PostCSS 官方文档](https://postcss.org/)
- [styled-components 官方文档](https://styled-components.com/)
- [Emotion 官方文档](https://emotion.sh/)
- [CSS Modules 规范](https://github.com/css-modules/css-modules)
