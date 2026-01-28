# Web Components

> 📌 本文件记录 Web Components 三大核心技术：Custom Elements、Shadow DOM、HTML Templates，以及与框架的配合使用。
>
> 📅 参考：MDN Web Docs — Web Components | Baseline Widely Available

---

## 1. 概述

Web Components 是一套**浏览器原生**的组件化标准，无需任何框架即可创建可复用的自定义元素。由三项技术组成：

```
Custom Elements   — 定义自定义 HTML 元素及其行为
Shadow DOM        — 为元素附加隔离的 DOM 子树（样式和 JS 不泄漏）
HTML Templates    — <template> 和 <slot> 定义可复用的 HTML 片段
```

浏览器兼容性：三项技术均为 **Baseline Widely Available**，所有现代浏览器全面支持。

---

## 2. Custom Elements

### 定义自主自定义元素

```js
class MyButton extends HTMLElement {
  // 声明要监听的属性变化（必须是静态属性）
  static observedAttributes = ['disabled', 'variant']

  constructor() {
    super()
    // 在 constructor 中只做最小化初始化
    // 不要在这里读取/设置属性或子元素，此时元素尚未升级完成
    this.attachShadow({ mode: 'open' })
  }

  // 元素连接到 DOM 时调用
  connectedCallback() {
    this.render()
  }

  // 元素从 DOM 移除时调用（清理事件监听、定时器等）
  disconnectedCallback() {
    // cleanup
  }

  // 元素被移到新 document 时调用
  adoptedCallback() {}

  // observedAttributes 中的属性发生变化时调用
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render()
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        button { padding: 8px 16px; border-radius: 4px; }
      </style>
      <button ?disabled="${this.hasAttribute('disabled')}">
        <slot></slot>
      </button>
    `
  }
}

// 注册：元素名必须包含连字符
customElements.define('my-button', MyButton)
```

```html
<!-- 使用 -->
<my-button variant="primary">点击我</my-button>
```

### 自定义内置元素（Customized Built-in）

扩展现有 HTML 元素的行为：

```js
class FancyButton extends HTMLButtonElement {
  connectedCallback() {
    this.style.background = 'linear-gradient(45deg, #667eea, #764ba2)'
    this.style.color = '#fff'
  }
}

customElements.define('fancy-button', FancyButton, { extends: 'button' })
```

```html
<button is="fancy-button">花式按钮</button>
```

> ⚠️ Safari 不支持自定义内置元素，仅支持自主自定义元素。

### 生命周期回调总结

| 回调 | 触发时机 |
|------|---------|
| `constructor()` | 元素创建时 |
| `connectedCallback()` | 元素插入 DOM 时（可能多次触发） |
| `disconnectedCallback()` | 元素从 DOM 移除时 |
| `adoptedCallback()` | 元素被移到新 document 时 |
| `attributeChangedCallback(name, old, new)` | `observedAttributes` 中的属性变化时 |

### 查询注册状态

```js
// 检查是否已注册
customElements.get('my-button')  // 返回类或 undefined

// 等待元素升级
await customElements.whenDefined('my-button')
console.log('my-button 已注册')

// 强制同步升级未升级的元素
customElements.upgrade(document.querySelector('my-button'))
```

---

## 3. Shadow DOM

Shadow DOM 为元素创建一个隔离的 DOM 子树，内部样式不影响外部，外部样式也不影响内部。

### 附加 Shadow Root

```js
class MyCard extends HTMLElement {
  constructor() {
    super()
    // mode: 'open'  — JS 可通过 element.shadowRoot 访问
    // mode: 'closed' — element.shadowRoot 返回 null（更强封装）
    const shadow = this.attachShadow({ mode: 'open' })
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
        }
        h2 { margin: 0 0 8px; }
      </style>
      <h2><slot name="title">默认标题</slot></h2>
      <div><slot></slot></div>
    `
  }
}
customElements.define('my-card', MyCard)
```

```html
<my-card>
  <span slot="title">自定义标题</span>
  <p>卡片内容</p>
</my-card>
```

### 样式穿透

Shadow DOM 隔离了大部分 CSS，但以下方式可以跨边界影响样式：

```css
/* 从外部设置 Shadow Host 本身的样式 */
my-card {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* CSS 自定义属性（变量）可以穿透 Shadow DOM */
/* 外部定义 */
:root {
  --card-border-color: #4caf50;
}

/* 内部使用 */
/* shadow 内的 style */
:host {
  border-color: var(--card-border-color, #e0e0e0);
}

/* ::part() — 暴露内部元素给外部样式化 */
/* 内部标记 part */
/* <button part="submit-btn">提交</button> */

/* 外部样式化 */
my-form::part(submit-btn) {
  background: blue;
}
```

### :host 选择器

```css
/* 选中 Shadow Host 元素本身 */
:host { display: block; }

/* 带条件 */
:host([disabled]) { opacity: 0.5; }
:host(.highlighted) { outline: 2px solid gold; }

/* 宿主上下文 */
:host-context(.dark-theme) { background: #333; color: #fff; }
```

---

## 4. HTML Templates

### `<template>`

`<template>` 内的内容不会被渲染，但可以被克隆复用：

```html
<template id="user-card-template">
  <div class="card">
    <img class="avatar" />
    <span class="name"></span>
  </div>
</template>
```

```js
const template = document.getElementById('user-card-template')

function createUserCard(name, avatarUrl) {
  // cloneNode(true) 深克隆
  const clone = template.content.cloneNode(true)
  clone.querySelector('.name').textContent = name
  clone.querySelector('.avatar').src = avatarUrl
  return clone
}

document.body.appendChild(createUserCard('Alice', '/alice.jpg'))
```

### `<slot>`

`<slot>` 是占位符，允许使用者向 Shadow DOM 内部插入内容：

```html
<!-- 定义 Web Component 内部结构 -->
<template id="my-dialog-template">
  <div class="dialog">
    <header><slot name="title">对话框</slot></header>
    <main><slot></slot></main>  <!-- 默认 slot -->
    <footer><slot name="actions"></slot></footer>
  </div>
</template>
```

```html
<!-- 使用时填充 slot -->
<my-dialog>
  <h2 slot="title">确认删除</h2>
  <p>此操作不可撤销，是否继续？</p>
  <div slot="actions">
    <button>取消</button>
    <button>确认</button>
  </div>
</my-dialog>
```

### slotchange 事件

```js
const slot = shadowRoot.querySelector('slot')
slot.addEventListener('slotchange', () => {
  const nodes = slot.assignedNodes()
  console.log('slot 内容变化', nodes)
})
```

---

## 5. 完整示例

```js
class CounterElement extends HTMLElement {
  static observedAttributes = ['value']

  #count = 0

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.#count = Number(this.getAttribute('value') ?? 0)
    this.render()
    this.shadowRoot.querySelector('#inc').addEventListener('click', () => {
      this.#count++
      this.render()
      this.dispatchEvent(new CustomEvent('change', { detail: this.#count, bubbles: true }))
    })
    this.shadowRoot.querySelector('#dec').addEventListener('click', () => {
      this.#count--
      this.render()
      this.dispatchEvent(new CustomEvent('change', { detail: this.#count, bubbles: true }))
    })
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-flex; align-items: center; gap: 8px; }
        button { width: 28px; height: 28px; cursor: pointer; }
        span { min-width: 32px; text-align: center; }
      </style>
      <button id="dec">-</button>
      <span>${this.#count}</span>
      <button id="inc">+</button>
    `
  }
}

customElements.define('x-counter', CounterElement)
```

```html
<x-counter value="5"></x-counter>
<script>
  document.querySelector('x-counter').addEventListener('change', (e) => {
    console.log('当前值:', e.detail)
  })
</script>
```

---

## 6. 与框架配合

### 在 Vue 中使用 Web Components

```js
// vite.config.js — 告知 Vue 哪些是自定义元素，不要当作 Vue 组件处理
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // 以 x- 开头的标签都视为自定义元素
          isCustomElement: (tag) => tag.startsWith('x-')
        }
      }
    })
  ]
})
```

### 用 Vue / React 构建 Web Components

Vue 3.2+ 提供 `defineCustomElement`：

```js
import { defineCustomElement } from 'vue'

const MyVueElement = defineCustomElement({
  props: ['name'],
  template: `<p>Hello, {{ name }}!</p>`,
  styles: [`:host { color: red; }`]
})

customElements.define('my-vue-element', MyVueElement)
```

---

## 7. 适用场景

| 场景 | 说明 |
|------|------|
| 设计系统 / 组件库 | 跨框架复用，一次实现，Angular / Vue / React 均可用 |
| 微前端 | 不同框架的子应用以 Web Component 形式嵌入 |
| 独立小部件 | 评论框、聊天气泡、嵌入第三方页面的组件 |
| 框架内部使用 | 通常不如直接用框架组件方便，框架生态更成熟 |
