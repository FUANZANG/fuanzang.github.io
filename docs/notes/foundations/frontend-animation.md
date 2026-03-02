# 前端动画

> 📌 本文件记录前端动画相关知识：CSS 过渡/动画、requestAnimationFrame、Web Animations API、Motion（原 Framer Motion）、GSAP、Vue 过渡、性能优化与最佳实践。
>
> 📅 基于以下版本：Motion 12.x | GSAP 3.x | Web Animations API（Baseline Widely available）
>
> 🔗 Vue 内置过渡系统见 [Vue 3 笔记](/notes/frameworks/vue3)，React 组件动画见 [React 笔记](/notes/frameworks/react)，CSS 基础见 [CSS 笔记](/notes/foundations/css)

---

## 1. 动画方案概览

```
前端动画方案：

┌──────────────┬───────────────┬───────────────────┐
│  CSS 方案      │  JS 原生       │  动画库             │
├──────────────┼───────────────┼───────────────────┤
│ transition   │ rAF           │ GSAP              │
│ animation    │ Web Animations│ Motion (Framer)    │
│ @keyframes   │ API           │ Lottie            │
└──────────────┴───────────────┴───────────────────┘

选型决策：
  简单状态切换（hover、展开收起）→ CSS transition
  循环/复杂关键帧动画           → CSS @keyframes
  交互驱动（拖拽、滚动）        → Motion / GSAP
  复杂时间线编排                → GSAP
  React/Vue 项目               → Motion（推荐）或 GSAP
  设计师交付的动效              → Lottie
```

### 性能核心原则

```
只做合成层动画（compositing）：
  ✅ transform: translate/scale/rotate
  ✅ opacity
  ❌ width/height/top/left/margin（触发 layout）
  ❌ background-color/color（触发 paint）

原因：
  transform 和 opacity 动画在 GPU 合成层执行，
  不触发 layout 和 paint，性能最优。

强制提升合成层：
  .animated { will-change: transform; }
  /* 或 */
  .animated { transform: translateZ(0); }
  /* 注意：不要滥用 will-change，会消耗额外内存 */
```

---

## 2. CSS Transition

### 基本语法

```css
.box {
  /* 简写：property duration timing-function delay */
  transition: transform 0.3s ease-out;
  transition: opacity 0.2s ease;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  /* 分开写 */
  transition-property: transform, opacity;
  transition-duration: 0.3s, 0.2s;
  transition-timing-function: ease-out, ease;
  transition-delay: 0s, 0.1s;
}

.box:hover {
  transform: scale(1.05);
  opacity: 0.8;
}
```

### 常用 timing-function

```css
/* 预设值 */
ease          /* 默认，先快后慢 */
linear        /* 匀速 */
ease-in       /* 先慢后快 */
ease-out      /* 先快后慢 */
ease-in-out   /* 两头慢中间快 */

/* 贝塞尔曲线（自定义） */
cubic-bezier(0.4, 0, 0.2, 1)   /* Material Design 标准 */
cubic-bezier(0.25, 0.1, 0.25, 1) /* 类似 ease */
cubic-bezier(0.55, 0.085, 0.68, 0.53) /* easeInQuad */
cubic-bezier(0.47, 0, 0.745, 0.715)   /* easeOutQuad */

/* 步进 */
steps(4, end)   /* 4 步，每步结束时跳 */
steps(1, start) /* 等同于 step-start */
```

### 实用示例

```css
/* 展开/收起 */
.collapse {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
}
.collapse.open {
  max-height: 500px; /* 足够大的值 */
}

/* 淡入 */
.fade-in {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-in.visible {
  opacity: 1;
  transform: translateY(0);
}

/* 按钮涟漪效果 */
.ripple {
  position: relative;
  overflow: hidden;
}
.ripple::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
  opacity: 0;
  transform: scale(0);
  transition: opacity 0.5s, transform 0.5s;
}
.ripple:active::after {
  opacity: 1;
  transform: scale(2.5);
  transition: 0s;
}
```

---

## 3. CSS @keyframes

### 基本语法

```css
/* 定义关键帧 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 百分比定义 */
@keyframes bounce {
  0%, 20%, 53%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-30px);
  }
  43% {
    transform: translateY(-30px);
  }
  70% {
    transform: translateY(-15px);
  }
  80% {
    transform: translateY(0);
  }
  90% {
    transform: translateY(-4px);
  }
}

/* 使用 */
.box {
  animation: fadeIn 0.5s ease-out forwards;
}

/* 完整属性 */
.box {
  animation-name: fadeIn;
  animation-duration: 0.5s;
  animation-timing-function: ease-out;
  animation-delay: 0s;
  animation-iteration-count: 1;       /* infinite = 无限循环 */
  animation-direction: normal;        /* alternate = 来回 */
  animation-fill-mode: forwards;      /* forwards = 停在最后帧 */
  animation-play-state: running;      /* paused = 暂停 */
}

/* 简写 */
animation: fadeIn 0.5s ease-out 0s 1 normal forwards;
```

### 常用动画模板

```css
/* 脉冲 */
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* 旋转 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 闪烁 */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* 抖动 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

/* 打字机效果 */
@keyframes typing {
  from { width: 0; }
  to { width: 100%; }
}
.typewriter {
  overflow: hidden;
  white-space: nowrap;
  border-right: 2px solid;
  animation: typing 2s steps(20) forwards, blink 0.7s step-end infinite;
}
```

---

## 4. requestAnimationFrame

### 基本用法

```js
// 基本循环
function animate(time) {
  // time 是 DOMHighResTimeStamp（ms，精度到 μs）
  console.log('当前时间:', time)

  // 更新动画状态
  element.style.transform = `translateX(${position}px)`
  position += 2

  // 继续循环
  if (position < 500) {
    requestAnimationFrame(animate)
  }
}

const rafId = requestAnimationFrame(animate)

// 取消动画
cancelAnimationFrame(rafId)
```

### 基于时间的动画（推荐）

```js
// ❌ 基于帧数：不同刷新率下速度不同
function animate() {
  position += 2  // 60fps 下 2px/帧 = 120px/s，120fps 下 = 240px/s
  requestAnimationFrame(animate)
}

// ✅ 基于时间：任何刷新率下速度一致
let lastTime = 0
const speed = 120  // px/s

function animate(currentTime) {
  const deltaTime = (currentTime - lastTime) / 1000  // 转为秒
  lastTime = currentTime

  position += speed * deltaTime
  element.style.transform = `translateX(${position}px)`

  requestAnimationFrame(animate)
}

requestAnimationFrame(animate)
```

### 缓动函数

```js
// 常用缓动函数
const easing = {
  // easeOutCubic
  easeOut: (t) => 1 - Math.pow(1 - t, 3),

  // easeInOutCubic
  easeInOut: (t) => t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2,

  // spring（弹性）
  spring: (t) => {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  }
}

// 带缓动的动画
function animateWithEasing(from, to, duration, easeFn, onUpdate) {
  const startTime = performance.now()

  function tick(now) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easeFn(progress)
    const value = from + (to - from) * easedProgress

    onUpdate(value)

    if (progress < 1) {
      requestAnimationFrame(tick)
    }
  }

  requestAnimationFrame(tick)
}

// 使用
animateWithEasing(0, 300, 1000, easing.easeOut, (value) => {
  element.style.transform = `translateX(${value}px)`
})
```

---

## 5. Web Animations API

浏览器原生 API，可以用 JS 创建和控制 CSS 动画。

### Element.animate()

```js
// 基本用法
const animation = element.animate(
  [
    { opacity: 0, transform: 'translateY(20px)' },  // 起始帧
    { opacity: 1, transform: 'translateY(0)' }       // 结束帧
  ],
  {
    duration: 500,
    easing: 'ease-out',
    fill: 'forwards'  // 保持最后状态
  }
)

// 返回 Animation 对象，可以控制
animation.pause()
animation.play()
animation.reverse()
animation.finish()
animation.cancel()

// 监听事件
animation.onfinish = () => console.log('动画完成')
animation.oncancel = () => console.log('动画取消')
```

### 关键帧与时间线

```js
// 多关键帧
element.animate(
  [
    { offset: 0, transform: 'scale(1)', backgroundColor: '#ff0000' },
    { offset: 0.5, transform: 'scale(1.2)', backgroundColor: '#00ff00' },
    { offset: 1, transform: 'scale(1)', backgroundColor: '#0000ff' }
  ],
  { duration: 2000, iterations: Infinity }
)

// 带延迟和交错
elements.forEach((el, i) => {
  el.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    {
      duration: 300,
      delay: i * 100,  // 交错延迟
      fill: 'forwards'
    }
  )
})
```

### document.getAnimations()

```js
// 获取页面上所有正在运行的动画
const allAnimations = document.getAnimations()
console.log('当前动画数量:', allAnimations.length)

// 暂停所有动画
document.getAnimations().forEach(a => a.pause())

// 恢复所有动画
document.getAnimations().forEach(a => a.play())
```

---

## 6. Motion（原 Framer Motion）

### 安装

```bash
# React
npm install motion
# 或
npm install framer-motion

# Vue
npm install motion
```

### React 基本用法

```tsx
import { motion } from "motion/react"

function Box() {
  return (
    <motion.div
      // 初始状态
      initial={{ opacity: 0, y: 20 }}
      // 目标状态（组件挂载后自动动画）
      animate={{ opacity: 1, y: 0 }}
      // 过渡配置
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      Hello Motion
    </motion.div>
  )
}
```

### 手势动画

```tsx
import { motion } from "motion/react"

function Card() {
  return (
    <motion.div
      whileHover={{ scale: 1.05, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      Hover me
    </motion.div>
  )
}
```

### AnimatePresence（退出动画）

```tsx
import { motion, AnimatePresence } from "motion/react"

function List({ items }) {
  return (
    <AnimatePresence>
      {items.map(item => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          {item.text}
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
```

### Variants（状态编排）

```tsx
import { motion } from "motion/react"

const variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",  // 先执行父元素动画
      staggerChildren: 0.1     // 子元素交错延迟
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

function List() {
  return (
    <motion.ul variants={variants} initial="hidden" animate="visible">
      {items.map(item => (
        <motion.li key={item.id} variants={itemVariants}>
          {item.text}
        </motion.li>
      ))}
    </motion.ul>
  )
}
```

### Layout 动画

```tsx
import { motion } from "motion/react"

function Grid({ layout }) {
  return (
    <motion.div layout className="grid">
      {items.map(item => (
        <motion.div
          key={item.id}
          layout
          layoutId={item.id}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {item.name}
        </motion.div>
      ))}
    </motion.div>
  )
}
```

### 滚动触发动画

```tsx
import { motion, useScroll, useTransform } from "motion/react"

function ParallaxSection() {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -100])

  return (
    <motion.div style={{ y }}>
      Parallax content
    </motion.div>
  )
}

// 元素进入视口时触发动画
import { motion, useInView } from "motion/react"

function FadeInSection({ children }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.div>
  )
}
```

### Vue 中使用 Motion

```vue
<script setup>
import { motion } from "motion-v"
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, y: 20 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5 }"
    :while-hover="{ scale: 1.05 }"
  >
    Hello Motion Vue
  </motion.div>
</template>
```

### 原生 JS 使用 Motion

```js
import { animate, scroll } from "motion"

// 基本动画
animate(
  ".box",
  { opacity: 1, transform: "rotate(45deg)" },
  { duration: 0.5, easing: "ease-out" }
)

// 滚动驱动动画
scroll(
  animate(".progress", { transform: ["scaleX(0)", "scaleX(1)"] })
)
```

---

## 7. GSAP

### 安装

```bash
npm install gsap

# React 专用 hook
npm install @gsap/react
```

### 基本动画

```js
import gsap from "gsap"

// 基本 tween
gsap.to(".box", {
  x: 200,
  rotation: 360,
  duration: 1,
  ease: "power2.out"
})

// 从某状态开始
gsap.from(".box", {
  opacity: 0,
  y: 50,
  duration: 0.5
})

// 从到某状态
gsap.fromTo(".box",
  { opacity: 0, y: 50 },    // from
  { opacity: 1, y: 0, duration: 0.5 }  // to
)
```

### Timeline 编排

```js
const tl = gsap.timeline()

tl.to(".box1", { x: 100, duration: 0.5 })
  .to(".box2", { x: 200, duration: 0.5 }, "-=0.3")  // 提前 0.3s 开始
  .to(".box3", { x: 300, duration: 0.5 }, "+=0.2")  // 延后 0.2s 开始
  .to(".all", { opacity: 0 }, "<")  // 与上一个同时开始

// 控制
tl.pause()
tl.play()
tl.reverse()
tl.seek(1.5)  // 跳到 1.5s
tl.timeScale(2)  // 2 倍速
```

### Stagger（交错）

```js
// 基本交错
gsap.to(".item", {
  y: 100,
  stagger: 0.1  // 每个元素延迟 0.1s
})

// 高级交错
gsap.to(".item", {
  y: 100,
  stagger: {
    amount: 1,        // 总交错时间 1s
    from: "center",   // 从中间开始
    // from: "start",  // 从头开始
    // from: "edges",  // 从两边开始
    // from: "random", // 随机
    grid: [3, 4],     // 网格排列
    axis: "y",        // 按 y 轴交错
    ease: "power2.inOut"
  }
})
```

### ScrollTrigger

```js
import { ScrollTrigger } from "gsap/ScrollTrigger"
gsap.registerPlugin(ScrollTrigger)

// 元素进入视口时触发动画
gsap.to(".box", {
  x: 200,
  scrollTrigger: {
    trigger: ".box",
    start: "top 80%",     // 元素顶部到达视口 80% 时开始
    end: "top 20%",
    scrub: true,           // 动画跟随滚动
    // markers: true,      // 调试标记
    onEnter: () => console.log("进入"),
    onLeave: () => console.log("离开")
  }
})

// Pin（固定元素）
gsap.to(".panel", {
  scrollTrigger: {
    trigger: ".panel",
    pin: true,             // 固定在视口
    start: "top top",
    end: "+=500"           // 固定 500px 的滚动距离
  }
})
```

### React 中使用 GSAP

```tsx
import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

function Box() {
  const boxRef = useRef(null)

  useGSAP(() => {
    gsap.from(boxRef.current, {
      opacity: 0,
      y: 50,
      duration: 0.5
    })
  }, { scope: boxRef })  // 自动清理

  return <div ref={boxRef}>Hello GSAP</div>
}
```

---

## 8. Vue 内置过渡系统

### Transition 组件

```vue
<template>
  <button @click="show = !show">Toggle</button>

  <!-- 基本过渡 -->
  <Transition name="fade">
    <div v-if="show">内容</div>
  </Transition>

  <!-- 带模式 -->
  <Transition name="slide" mode="out-in">
    <component :is="currentComponent" />
  </Transition>
</template>

<style>
/* fade 过渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* slide 过渡 */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-enter-from {
  transform: translateX(20px);
  opacity: 0;
}
.slide-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}
</style>
```

### TransitionGroup（列表过渡）

```vue
<template>
  <TransitionGroup name="list" tag="ul">
    <li v-for="item in items" :key="item.id">
      {{ item.text }}
      <button @click="remove(item.id)">删除</button>
    </li>
  </TransitionGroup>
</template>

<style>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
/* 移动过渡 */
.list-move {
  transition: transform 0.3s ease;
}
</style>
```

### JS 钩子过渡

```vue
<template>
  <Transition
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @before-leave="onBeforeLeave"
    @leave="onLeave"
    @after-leave="onAfterLeave"
    :css="false"
  >
    <div v-if="show">JS 动画</div>
  </Transition>
</template>

<script setup>
function onEnter(el, done) {
  // el 是 DOM 元素
  // done 是回调，动画结束后必须调用
  gsap.from(el, {
    opacity: 0,
    y: 50,
    duration: 0.5,
    onComplete: done
  })
}

function onLeave(el, done) {
  gsap.to(el, {
    opacity: 0,
    y: -50,
    duration: 0.3,
    onComplete: done
  })
}
</script>
```

---

## 9. Lottie 动画

Lottie 是 Airbnb 开发的库，用于播放 After Effects 导出的 JSON 动画。

```bash
npm install lottie-web
# 或 Vue/React 封装
npm install vue3-lottie
npm install react-lottie
```

```js
import lottie from "lottie-web"

const anim = lottie.loadAnimation({
  container: document.getElementById('lottie'),
  renderer: 'svg',  // 'svg' | 'canvas' | 'html'
  loop: true,
  autoplay: true,
  path: '/animations/data.json'  // AE 导出的 JSON
})

// 控制
anim.play()
anim.pause()
anim.stop()
anim.setSpeed(1.5)
anim.goToAndStop(100, true)  // 跳到 100 帧
```

```vue
<!-- Vue 3 -->
<template>
  <Vue3Lottie
    :animation-data="animationJSON"
    :height="200"
    :width="200"
    :loop="true"
    :auto-play="true"
  />
</template>
```

---

## 10. 动画方案对比

| | CSS Transition | CSS Animation | WAAPI | Motion | GSAP |
|---|---|---|---|---|---|
| **触发方式** | 状态变化 | 自动/JS | JS | JS/声明式 | JS |
| **复杂度** | 低 | 低 | 中 | 中 | 中 |
| **时间线** | ❌ | ❌ | 有限 | ✅ | ✅ |
| **缓动函数** | 贝塞尔 | 贝塞尔 | 贝塞尔 | spring+贝塞尔 | 30+ 预设 |
| **滚动驱动** | ❌ | ❌ | ❌ | ✅ | ✅（插件） |
| **手势支持** | ❌ | ❌ | ❌ | ✅ | ✅（插件） |
| **退出动画** | ❌ | ❌ | ❌ | ✅ | 需手动 |
| **Layout 动画** | ❌ | ❌ | ❌ | ✅ | ✅（Flip） |
| **包体积** | 0 | 0 | 0 | ~15KB | ~30KB |
| **框架支持** | 全部 | 全部 | 全部 | React/Vue/JS | 全部 |
| **适合** | 简单状态 | 循环动画 | 精确控制 | React/Vue 项目 | 复杂动画 |

---

## 11. 性能优化

### 选择正确的属性

```css
/* ✅ 高性能：只触发 composite */
.box {
  transition: transform 0.3s, opacity 0.3s;
}
.box:hover {
  transform: scale(1.1);
  opacity: 0.8;
}

/* ❌ 低性能：触发 layout → paint → composite */
.box {
  transition: width 0.3s, height 0.3s, top 0.3s;
}
.box:hover {
  width: 120px;
  height: 120px;
}
```

### 避免强制同步布局

```js
// ❌ 错误：读写交替触发强制同步布局
function bad() {
  element.style.transform = 'translateX(100px)'
  const height = element.offsetHeight  // 强制同步布局！
  element.style.transform = `translateX(100px) translateY(${height}px)`
}

// ✅ 正确：先批量读，再批量写
function good() {
  const height = element.offsetHeight  // 读
  element.style.transform = `translateX(100px) translateY(${height}px)`  // 写
}
```

### 使用 will-change

```css
/* 预提示浏览器优化 */
.animated-element {
  will-change: transform;
  /* 浏览器会提前创建合成层 */
}

/* 动画结束后移除 */
.animated-element.no-longer-animated {
  will-change: auto;
}
```

```js
// 动态管理 will-change
element.addEventListener('mouseenter', () => {
  element.style.willChange = 'transform'
})

element.addEventListener('animationend', () => {
  element.style.willChange = 'auto'
})
```

### 减少重绘区域

```css
/* 使用 contain 限制影响范围 */
.card {
  contain: layout style;  /* 限制 layout 和 style 重绘范围 */
}
```

---

## 12. 常见踩坑

### 动画结束后保持状态

```css
/* ❌ 动画结束后回到初始状态 */
.box {
  animation: slideIn 0.5s ease-out;
}

/* ✅ 使用 fill-mode 保持最后状态 */
.box {
  animation: slideIn 0.5s ease-out forwards;
}
```

### Transition 不生效

```css
/* ❌ 错误：初始状态没有定义 transition */
.box {
  transform: scale(1);
}
.box:hover {
  transform: scale(1.1);
  transition: transform 0.3s;  /* hover 时才加 transition，不生效 */
}

/* ✅ 正确：transition 放在元素上 */
.box {
  transform: scale(1);
  transition: transform 0.3s;
}
.box:hover {
  transform: scale(1.1);
}
```

### 列表动画 key 问题

```vue
<!-- ❌ 错误：用 index 作为 key，删除/排序时动画异常 -->
<TransitionGroup>
  <div v-for="(item, index) in list" :key="index">{{ item }}</div>
</TransitionGroup>

<!-- ✅ 正确：用唯一 id 作为 key -->
<TransitionGroup>
  <div v-for="item in list" :key="item.id">{{ item.name }}</div>
</TransitionGroup>
```

### GSAP 清理问题

```tsx
// ❌ React 中 GSAP 动画不清理，组件卸载后继续执行
useEffect(() => {
  gsap.to(".box", { x: 200 })
}, [])

// ✅ 使用 useGSAP 自动清理
import { useGSAP } from "@gsap/react"

useGSAP(() => {
  gsap.to(".box", { x: 200 })
})
```

---

## 13. 最佳实践

### 选择方案

```
1. 简单 hover/focus 效果 → CSS transition
   - 按钮悬停、卡片放大、菜单展开

2. 循环/加载动画 → CSS @keyframes
   - 旋转加载、脉冲、闪烁

3. React/Vue 项目交互动画 → Motion
   - 列表出入场、页面切换、手势交互

4. 复杂时间线/滚动动画 → GSAP
   - 产品展示页、故事叙述、复杂编排

5. 设计师交付动效 → Lottie
   - 品牌动画、成功/失败动画
```

### 无障碍

```css
/* 尊重用户减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

```tsx
// Motion 中
import { useReducedMotion } from "motion/react"

function Box() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      animate={{ opacity: 1, y: shouldReduceMotion ? 0 : 20 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
    />
  )
}
```

```js
// GSAP 中
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  gsap.globalTimeline.timeScale(100)  // 几乎瞬间完成
}
```

---

## 参考

- [MDN - CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations)
- [MDN - Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
- [Motion 官方文档](https://motion.dev/docs)
- [GSAP 官方文档](https://gsap.com/docs/v3/)
- [MDN - requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)
- [Vue Transition 组件](https://vuejs.org/guide/built-ins/transition.html)
- [Lottie Web](https://github.com/airbnb/lottie-web)
- [CSS Triggers](https://csstriggers.com/) — 查看 CSS 属性触发 layout/paint/composite
