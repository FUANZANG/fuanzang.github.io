# 状态管理框架对比

前端"状态管理"解决的是：**跨组件、跨页面的共享状态如何集中维护与高效更新**。本篇横向对比三套主流方案——**Pinia（Vue 生态）、Zustand（React 生态）、Jotai（React 原子化）**，并给出选型建议。

> 单篇原理见 [状态管理](/notes/frameworks/state-management)；本篇聚焦"用什么、怎么选"。

## 概览对比

| 维度 | Pinia | Zustand | Jotai |
|---|---|---|---|
| 生态 | Vue 3 官方推荐 | React（社区主流） | React（原子化） |
| 心智模型 | **集中式 Store** | **集中式 Store**（hook 形态） | **原子（Atom）分散式** |
| API 风格 | `defineStore` + `setup` | `create` 返回 hook | `atom()` + `useAtom` |
| TypeScript | 一流（自动推断） | 一流 | 一流 |
| 样板代码 | 极少 | 极少 | 极少 |
| 适合规模 | 中大型 Vue 应用 | 中大型 React 应用 | 细粒度/局部状态多的 React 应用 |

## Pinia（Vue）

Vue 官方状态库，取代旧版 Vuex。核心概念：`state`（数据）、`getters`（派生）、`actions`（修改）。

```ts
// stores/counter.ts
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (s) => s.count * 2
  },
  actions: {
    increment() {
      this.count++
    }
  }
})
```

```ts
// 组件中使用
import { useCounterStore } from '@/stores/counter'
const store = useCounterStore()
store.increment()
console.log(store.double)
```

特点：
+ **去 Mutation**：Vuex 的 `mutations` 被取消，修改直接写在 `actions` 里，心智负担更低。
+ **组合式写法**：也可用 `defineStore('id', () => { const count = ref(0); ... })` 的 setup 风格。
+ **DevTools 支持**：原生集成 Vue DevTools，带时间旅行调试。
+ **模块化天然**：每个 `defineStore` 就是一个独立 store，无需嵌套 modules。

## Zustand（React）

轻量、无 Provider 包裹的 React 状态库。Store 就是一个 hook。

```ts
// store.ts
import { create } from 'zustand'

interface State {
  count: number
  increment: () => void
}
export const useStore = create<State>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 }))
}))
```

```tsx
// 组件中使用（自动按需重渲染）
const count = useStore((s) => s.count)
const increment = useStore((s) => s.increment)
```

特点：
+ **无需 Context Provider**：直接在组件调用 hook，避免 React Context 的"大范围重渲染"问题。
+ **精准订阅**：选择器 `useStore(s => s.count)` 只在 `count` 变化时重渲染，性能好。
+ **支持中间件**：`persist`（持久化到 localStorage）、`immer`、`devtools` 等。
+ **跨框架**：除 React 外也有 Vue/Svelte 的兼容层（非官方主力）。

## Jotai（React 原子化）

源自 Recoil 思路，以 **atom（原子）** 为基本单位，组件订阅单个 atom，状态自动按依赖图更新。

```ts
import { atom } from 'jotai'
import { useAtom } from 'jotai'

const countAtom = atom(0)                 // 基础原子
const doubleAtom = atom((get) => get(countAtom) * 2)  // 派生原子

function Counter() {
  const [count, setCount] = useAtom(countAtom)
  const [double] = useAtom(doubleAtom)
  return <button onClick={() => setCount((c) => c + 1)}>{count} / {double}</button>
}
```

特点：
+ **细粒度**：状态分散成 atom，哪个组件用到哪个 atom 才订阅，避免无关重渲染。
+ **派生/异步原子**：`atom(async (get) => ...)` 原生支持异步，无需额外中间件。
+ **组合性强**：原子可组合成新原子，适合复杂依赖关系。
+ **适合场景**：状态局部性强、组件间耦合少、需要大量独立小状态的界面。

## 选型建议

+ **Vue 项目** → 直接用 **Pinia**（官方、生态完整、零犹豫）。
+ **React 中大型应用、集中式数据**（如用户、购物车、全局配置）→ **Zustand**（样板少、性能好）。
+ **React 状态高度分散、局部状态多、需要细粒度更新** → **Jotai**（原子化更自然）。
+ **需要时间旅行/强 DevTools** → Pinia 原生最佳；Zustand/Jotai 通过 `redux-devtools` 中间件也可接入。
+ **避免"为用而用"**：局部状态优先用组件自身 `useState`/`ref`；只有**真正跨组件共享**才上全局方案。

## 与 Redux 的关系

+ Redux 仍是 React 生态的"重量级标准"，但样板多、学习曲线陡。
+ Zustand 设计上吸收了 Redux 的 `store + reducer` 思想但大幅简化；多数新项目优先 Zustand/Redux Toolkit（RTK）而非裸 Redux。
+ Jotai 与 Redux 思路不同（原子 vs 单一 store），不构成直接替代。

## 参考

+ [Pinia 官方文档](https://pinia.vuejs.org/)
+ [Zustand 官方文档](https://zustand-demo.pmnd.rs/)
+ [Jotai 官方文档](https://jotai.org/)
