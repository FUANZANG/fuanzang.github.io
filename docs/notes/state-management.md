# 状态管理

> 📌 本文件记录前端状态管理核心知识：基本概念、Vue 状态管理（Vuex/Pinia）、React 状态管理（Redux/Zustand/Jotai）、MobX、选型对比与最佳实践。
>
> 📅 基于以下版本：Pinia 3.x | Redux Toolkit 2.x | Zustand 5.x | Jotai 2.x | MobX 6.x | React Query 5.x
>
> 🔗 Pinia 速查见 [Vue 3 笔记](/notes/vue3-note)，Zustand vs Pinia 对比见 [React vs Vue](/notes/react-vs-vue) 第 5 节

---

## 1. 基本概念

### 什么是状态

**状态** = 应用中随时间变化的数据。前端状态通常分为三类：

```
┌─────────────────────────────────────────────────┐
│                  前端状态                         │
├──────────────┬──────────────┬───────────────────┤
│  组件状态      │  共享状态      │  服务端状态       │
│  (Local)     │  (Shared)    │  (Server)        │
├──────────────┼──────────────┼───────────────────┤
│ 单组件内部     │ 跨组件共享     │ 来源于后端 API    │
│ count, input │ user, theme  │ 列表数据, 详情     │
│ useState     │ Pinia/Redux  │ React Query/SWR  │
└──────────────┴──────────────┴───────────────────┘
```

### 为什么需要状态管理

```
❌ 没有状态管理：

    A 组件
      ↓ props (用户信息)
    B 组件 (中间层，只用到了 1 个字段，但要透传全部)
      ↓ props
    C 组件 (真正需要用户信息的组件)

    → props 逐层传递（prop drilling），中间组件被迫参与
    → 兄弟组件通信需要通过共同父组件中转
    → 状态散落各处，难以追踪数据流


✅ 有状态管理：

    A 组件 ──┐
    B 组件 ──┼──→ Store (集中管理) ──→ 后端 API
    C 组件 ──┘

    → 任何组件直接读写 Store，无需逐层传递
    → 数据流清晰：组件 → action → state → 组件
    → 可追踪、可调试（DevTools 时间旅行）
```

### 何时需要状态管理

```
✅ 需要的场景：
- 跨多个组件共享的状态（用户登录信息、主题、语言）
- 多个组件需要同步操作同一份数据（购物车）
- 状态变更逻辑复杂，需要集中管理（多步骤表单）
- 需要持久化状态（localStorage 同步）
- 需要状态历史记录（撤销/重做）

❌ 不需要的场景：
- 仅单个组件使用的状态 → useState / ref
- 父子组件简单通信 → props / emits
- 仅两层嵌套 → provide / inject
- 服务端数据缓存 → React Query / SWR（专门处理）
```

---

## 2. Flux 思想

大多数状态管理方案都源自 **Flux 架构**（Facebook 提出），核心是**单向数据流**：

```
         ┌──────────┐
         │  Action  │  ← 用户操作触发（点击、输入、API 返回）
         │ (动作)   │
         └────┬─────┘
              │ dispatch
              ▼
         ┌──────────┐
         │ Reducer  │  ← 纯函数，根据 action 计算新 state
         │ (处理器) │     (state, action) => newState
         └────┬─────┘
              │
              ▼
         ┌──────────┐
         │  Store   │  ← 集中存储，保存当前 state
         │ (仓库)   │
         └────┬─────┘
              │ subscribe
              ▼
         ┌──────────┐
         │  View    │  ← UI 根据 state 渲染
         │ (视图)   │     state 变化 → 自动更新
         └──────────┘
```

**核心规则**：
- 数据**单向流动**，不能反向
- **唯一数据源**（Single Source of Truth）：所有状态存在一个 Store 里
- **只读 state**：不能直接修改，必须通过 action → reducer
- **纯函数 reducer**：相同输入永远得到相同输出，无副作用

---

## 3. Vuex（Vue 2 时代）

Vuex 是 Vue 官方的状态管理库，严格遵循 Flux 架构。

### 核心结构

```js
// store/index.js
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  // 1. State — 存储数据
  state: {
    count: 0,
    user: null,
    cart: []
  },

  // 2. Getters — 计算属性（从 state 派生数据）
  getters: {
    cartTotal: state => state.cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    isLoggedIn: state => !!state.user
  },

  // 3. Mutations — 唯一可以修改 state 的地方（同步）
  mutations: {
    INCREMENT(state) {
      state.count++
    },
    SET_USER(state, user) {
      state.user = user
    },
    ADD_TO_CART(state, product) {
      state.cart.push(product)
    }
  },

  // 4. Actions — 处理异步操作，提交 mutation
  actions: {
    async login({ commit }, credentials) {
      const user = await api.login(credentials)
      commit('SET_USER', user)
      return user
    },
    async fetchCart({ commit, state }) {
      const cart = await api.getCart(state.user.id)
      commit('SET_CART', cart)
    }
  },

  // 5. Modules — 分模块管理大型 Store
  modules: {
    user: userModule,
    cart: cartModule
  }
})
```

### 组件中使用

```vue
<template>
  <div>
    <p>计数: {{ count }}</p>
    <p>购物车总价: {{ cartTotal }}</p>
    <button @click="increment">+1</button>
    <button @click="login({ username, password })">登录</button>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  computed: {
    // 从 state 映射
    ...mapState(['count']),
    // 从 getters 映射
    ...mapGetters(['cartTotal'])
  },
  methods: {
    // 从 mutations 映射
    ...mapMutations(['INCREMENT']),  // this.INCREMENT()
    // 从 actions 映射
    ...mapActions(['login'])          // this.login()
  }
}
</script>
```

### Module 分模块

```js
// store/modules/user.js
const userModule = {
  namespaced: true,  // 命名空间，避免命名冲突
  state: () => ({ info: null, token: '' }),
  mutations: {
    SET_INFO(state, info) { state.info = info },
    SET_TOKEN(state, token) { state.token = token }
  },
  actions: {
    async login({ commit }, { username, password }) {
      const { user, token } = await api.login(username, password)
      commit('SET_INFO', user)
      commit('SET_TOKEN', token)
      localStorage.setItem('token', token)
    }
  }
}

// 组件中使用命名空间
this.$store.dispatch('user/login', { username, password })
this.$store.state.user.info
```

### Vuex 的痛点

```
1. 样板代码多 — 每个功能都要写 state + mutation + action + getter
2. Mutation 必须同步 — 异步逻辑只能放 action，心智负担重
3. TypeScript 支持差 — 类型推断弱，需要大量类型声明
4. 嵌套模块路径长 — dispatch('user/cart/items/add', payload)
5. 命名空间容易写错 — 字符串路径没有类型提示
```

> ⚠️ Vuex 4 支持 Vue 3，但 API 基本不变，上述痛点依然存在。Vue 3 官方推荐用 Pinia 替代。

---

## 4. Pinia（Vue 3 官方推荐）

Pinia 是 Vue 官方新一代状态管理库，Vuex 的继任者。**更简单、更好的 TypeScript 支持、更少的样板代码**。

### 为什么选 Pinia

| | Vuex | Pinia |
|---|------|-------|
| Mutation | 必须有，同步修改 | **没有 Mutation**，直接改 |
| TypeScript | 弱，需大量类型声明 | **完美推断**，几乎不用写类型 |
| 模块 | modules + namespaced | **每个 store 就是一个模块** |
| 体积 (min+gzip) | ~1.5KB | ~1.2KB |
| DevTools | 支持 | 支持（时间旅行） |
| SSR | 需要额外处理 | 原生支持 |
| API 风格 | Options API | **Options + Setup 两种写法** |

### 定义 Store — Options 写法

```ts
// stores/counter.ts
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  // state
  state: () => ({
    count: 0,
    name: 'Eduardo'
  }),

  // getters（相当于计算属性）
  getters: {
    doubleCount: (state) => state.count * 2,
    // 访问其他 getter
    doublePlusOne(): number {
      return this.doubleCount + 1
    }
  },

  // actions（同步 + 异步都写这里，没有 mutation）
  actions: {
    increment() {
      this.count++  // 直接修改，不需要 commit
    },
    async fetchCount() {
      const res = await api.getCount()
      this.count = res.data
    }
  }
})
```

### 定义 Store — Setup 写法（推荐）

```ts
// stores/counter.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  // state → ref
  const count = ref(0)
  const name = ref('Eduardo')

  // getters → computed
  const doubleCount = computed(() => count.value * 2)
  const doublePlusOne = computed(() => doubleCount.value + 1)

  // actions → function
  function increment() {
    count.value++
  }

  async function fetchCount() {
    const res = await api.getCount()
    count.value = res.data
  }

  return { count, name, doubleCount, doublePlusOne, increment, fetchCount }
})
```

> Setup 写法更像 Vue 3 Composition API，灵活度更高，可以在 store 内使用 `watch`、`watchEffect` 等。

### 组件中使用

```vue
<template>
  <div>
    <p>计数: {{ counter.count }}</p>
    <p>双倍: {{ counter.doubleCount }}</p>
    <button @click="counter.increment()">+1</button>
  </div>
</template>

<script setup>
import { useCounterStore } from '@/stores/counter'

// 直接调用，不需要传 app 实例
const counter = useCounterStore()

// 解构需要保持响应性 → storeToRefs
import { storeToRefs } from 'pinia'
const { count, doubleCount } = storeToRefs(counter)  // 响应式
const { increment } = counter                          // actions 直接解构
</script>
```

### 多 Store 协作

```ts
// stores/user.ts
export const useUserStore = defineStore('user', () => {
  const id = ref(null)
  const name = ref('')
  return { id, name }
})

// stores/cart.ts
export const useCartStore = defineStore('cart', () => {
  const items = ref([])

  function checkout() {
    // 在一个 store 中调用另一个 store
    const userStore = useUserStore()
    return api.checkout(userStore.id, items.value)
  }

  return { items, checkout }
})
```

### 持久化插件

```ts
// pinia-plugin-persistedstate
import { createPinia } from 'pinia'
import persist from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(persist)

// store 中声明持久化
export const useUserStore = defineStore('user', {
  state: () => ({ token: '', info: null }),
  persist: true,  // 默认存到 localStorage
  // 或自定义
  persist: {
    key: 'user',
    storage: sessionStorage,
    paths: ['token']  // 只持久化 token
  }
})
```

### Pinia 重置 State

```ts
const counter = useCounterStore()

// 重置到初始值（Options 写法支持）
counter.$reset()

// Setup 写法没有 $reset，手动实现
function $reset() {
  count.value = 0
  name.value = 'Eduardo'
}

// 批量修改
counter.$patch({ count: 10, name: 'John' })
counter.$patch((state) => {
  state.count += 10
})
```

---

## 5. Redux Toolkit（React 官方推荐）

Redux 是 React 生态最经典的状态管理库。**Redux Toolkit (RTK)** 是官方推荐的写法，解决了传统 Redux 样板代码多的问题。

### 传统 Redux vs Redux Toolkit

```
传统 Redux：
  1. 定义 action types (常量)
  2. 定义 action creators (函数)
  3. 定义 reducer (switch case)
  4. 配置 store
  5. connect / useSelector / useDispatch

  → 一个简单的 counter 要写 50+ 行代码


Redux Toolkit：
  1. createSlice (一步到位)
  2. configureStore
  3. useSelector / useDispatch

  → 同样的 counter 只需 15 行
```

### createSlice

```ts
// features/counter/counterSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    // 自动生成 action creators
    increment: (state) => {
      state.value++  // 直接修改！RTK 内部用 Immer 处理不可变更新
    },
    decrement: (state) => {
      state.value--
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload
    }
  }
})

// 导出 action creators
export const { increment, decrement, incrementByAmount } = counterSlice.actions
export default counterSlice.reducer
```

### configureStore + 异步 (createAsyncThunk)

```ts
// store.ts
import { configureStore, createAsyncThunk } from '@reduxjs/toolkit'
import counterReducer from './features/counter/counterSlice'

export const store = configureStore({
  reducer: {
    counter: counterReducer
  }
})

// 类型导出
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch


// 异步 action
export const fetchCount = createAsyncThunk(
  'counter/fetchCount',
  async (amount: number) => {
    const response = await fetch(`/api/count?amount=${amount}`)
    return response.json()
  }
)

// slice 中处理异步
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0, status: 'idle' },
  reducers: { /* 同步 actions */ },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCount.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchCount.fulfilled, (state, action) => {
        state.status = 'idle'
        state.value = action.payload
      })
      .addCase(fetchCount.rejected, (state) => {
        state.status = 'failed'
      })
  }
})
```

### 组件中使用

```tsx
import { useSelector, useDispatch } from 'react-redux'
import { increment, fetchCount } from './features/counter/counterSlice'
import type { RootState, AppDispatch } from './store'

// 类型安全的 hooks（推荐）
import { useAppSelector, useAppDispatch } from './hooks'

function Counter() {
  const count = useAppSelector((state) => state.counter.value)
  const dispatch = useAppDispatch()

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => dispatch(increment())}>+1</button>
      <button onClick={() => dispatch(fetchCount(10))}>异步+10</button>
    </div>
  )
}
```

### RTK Query（数据获取 + 缓存）

```ts
// RTK Query 自动处理服务端状态（loading/error/cache）
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/users'
    }),
    getUserById: builder.query<User, number>({
      query: (id) => `/users/${id}`
    })
  })
})

// 组件中使用 — 自动管理 loading/error/cache
const { data, isLoading, error } = api.useGetUsersQuery()
```

> 💡 **服务端状态 vs 客户端状态**：RTK Query 专门处理服务端状态（API 数据缓存、loading、error），和 Pinia/Redux 管理的客户端状态是不同维度。React 生态中常用 React Query/SWR 替代 RTK Query。

---

## 6. Zustand（React 轻端轻量方案）

Zustand 是一个极简的状态管理库，API 非常简洁，适合中小型项目。

### 基本用法

```ts
// store.ts
import { create } from 'zustand'

interface BearStore {
  bears: number
  increase: () => void
  reset: () => void
}

const useBearStore = create<BearStore>((set) => ({
  bears: 0,
  increase: () => set((state) => ({ bears: state.bears + 1 })),
  reset: () => set({ bears: 0 })
}))
```

```tsx
// 组件中使用
function BearCounter() {
  const bears = useBearStore((state) => state.bears)  // 选择器，按需订阅
  const increase = useBearStore((state) => state.increase)

  return <button onClick={increase}>{bears}</button>
}
```

### 异步 action

```ts
// Zustand 不区分同步/异步，直接写 async function
const useUserStore = create((set) => ({
  user: null,
  login: async (credentials) => {
    const user = await api.login(credentials)
    set({ user })
  }
}))
```

### 中间件

```ts
import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

const useStore = create(
  devtools(  // DevTools 支持
    persist(  // 持久化
      (set) => ({
        count: 0,
        increment: () => set((s) => ({ count: s.count + 1 }))
      }),
      { name: 'my-store' }  // localStorage key
    )
  )
)
```

### 跨组件/跨 React 使用

```ts
// Zustand 可以在 React 组件外使用
const useStore = create(() => ({ count: 0 }))

// 在非组件代码中直接调用
useStore.getState().count           // 读取
useStore.setState({ count: 10 })    // 修改
useStore.subscribe((state) => {     // 订阅
  console.log('count changed:', state.count)
})
```

### Zustand vs Redux Toolkit

| | Redux Toolkit | Zustand |
|---|---|---|
| 体积 (min+gzip) | ~12KB | ~1.1KB |
| 样板代码 | 中等（createSlice） | 极少 |
| TypeScript | 好 | 好 |
| DevTools | 完整时间旅行 | 支持 |
| 中间件 | 丰富 | 够用 |
| 生态/插件 | 非常丰富 | 基本够用 |
| 适合 | 中大型项目、复杂状态 | 中小型项目、快速开发 |

---

## 7. Jotai（React 原子化方案）

Jotai 采用**原子化（Atomic）**模型，和 Redux 的 Store 模型不同——状态拆成最小粒度的 atoms，组件直接订阅需要的 atom。

### 基本用法

```ts
import { atom, useAtom } from 'jotai'

// 定义原子 — 最小状态单元
const countAtom = atom(0)
const doubleAtom = atom((get) => get(countAtom) * 2)  // 派生 atom

// 组件中使用
function Counter() {
  const [count, setCount] = useAtom(countAtom)
  const [double] = useAtom(doubleAtom)

  return (
    <div>
      <p>{count} / 双倍: {double}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  )
}
```

### 异步 atom

```ts
// 自动处理 loading/error
const userAtom = atom(async (get) => {
  const id = get(userIdAtom)
  const res = await fetch(`/api/users/${id}`)
  return res.json()
})

// 组件中
import { useAtomValue } from 'jotai'
import { Suspense } from 'react'

function UserProfile() {
  const user = useAtomValue(userAtom)  // 需要外层 Suspense
  return <div>{user.name}</div>
}

<Suspense fallback={<Loading />}>
  <UserProfile />
</Suspense>
```

### Jotai vs Zustand

```
Zustand：Store 模型
  → 一个 store 管理多个状态
  → 用选择器按需订阅
  → 类似 Pinia / Redux

Jotai：Atom 模型
  → 状态拆成最小粒度
  → 组件直接订阅 atom
  → 无 Store 概念，更去中心化
  → 自动追踪依赖，精确更新
```

---

## 8. MobX（响应式方案，跨框架）

MobX 采用**响应式编程**模型，通过可观察对象（observable）自动追踪依赖。

### 核心概念

```
MobX 三要素：

1. Observable State — 可观察状态
   → state = observable({ count: 0 })

2. Computed — 计算值（自动追踪依赖）
   → double = computed(() => state.count * 2)
   → 当 count 变化时，double 自动重算

3. Action — 修改状态的操作
   → increment = action(() => state.count++)
   → 批量触发，避免多次重渲染

4. Observer — 观察组件
   → @observer 自动订阅用到的 observable
   → 精确到字段级别的更新
```

### React 中使用

```tsx
import { makeAutoObservable } from 'mobx'
import { observer } from 'mobx-react-lite'

class CounterStore {
  count = 0

  constructor() {
    makeAutoObservable(this)  // 自动把所有属性变 observable
  }

  get double() {
    return this.count * 2  // computed
  }

  increment() {
    this.count++  // action
  }
}

const counter = new CounterStore()

// observer 包裹组件，自动订阅
const Counter = observer(() => (
  <div>
    <span>{counter.count} / {counter.double}</span>
    <button onClick={() => counter.increment()}>+1</button>
  </div>
))
```

### Vue 中使用 MobX

```ts
// Vue 也可以用 MobX（虽然更推荐 Pinia）
import { makeAutoObservable } from 'mobx'
import { observer } from 'mobx-vue-lite'

class Store {
  count = 0
  constructor() { makeAutoObservable(this) }
  increment() { this.count++ }
}

const store = new Store()

export default observer({
  template: `<button @click="store.increment()">{{ store.count }}</button>`,
  data: () => ({ store })
})
```

### MobX 的优缺点

```
✅ 优点：
- 自动依赖追踪，精确更新（组件只用到了 count，就只订阅 count）
- 写法直观，像写普通对象
- 跨框架支持（React/Vue/Angular）
- 性能好（细粒度更新）

❌ 缺点：
- 不可预测性 — 直接修改 observable，数据流不如 Redux 清晰
- 调试困难 — 追踪不到完整的 action → state 变更链
- 隐式依赖 — 组件依赖哪些 observable 不直观
- 适合中大型项目，小项目杀鸡用牛刀
```

---

## 9. Vue 的 provide/inject（轻量替代）

对于简单的跨层级共享，不一定需要 Pinia，Vue 内置的 `provide/inject` 就够用。

```ts
// 父组件 provide
import { provide, ref, readonly } from 'vue'

const theme = ref('dark')
const toggleTheme = () => theme.value = theme.value === 'dark' ? 'light' : 'dark'

// provide readonly state + mutation function
provide('theme', readonly(theme))
provide('toggleTheme', toggleTheme)
```

```ts
// 子/孙组件 inject
import { inject } from 'vue'

const theme = inject('theme', 'dark')        // 第二个参数是默认值
const toggleTheme = inject('toggleTheme')

// 使用 InjectionKey 做类型安全
import type { InjectionKey, Ref } from 'vue'
const ThemeKey: InjectionKey<Readonly<Ref<string>>> = Symbol('theme')
const theme = inject(ThemeKey)  // 有类型推断
```

### provide/inject vs Pinia

```
provide/inject：
  ✅ 零依赖，Vue 内置
  ✅ 适合简单场景（主题、语言、局部共享）
  ❌ 没有 DevTools 支持
  ❌ 没有时间旅行
  ❌ 状态散落，不集中
  ❌ 组件树外无法访问

Pinia：
  ✅ 集中管理，全局可访问
  ✅ DevTools 支持
  ✅ 持久化、插件
  ✅ 适合中大型项目
  ❌ 需要安装依赖
```

---

## 10. React Context（轻量替代）

React 内置的 Context API 适合简单的全局共享。

```tsx
import { createContext, useContext, useState, ReactNode } from 'react'

// 1. 创建 Context
const ThemeContext = createContext<{
  theme: string
  toggle: () => void
} | null>(null)

// 2. Provider 组件
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('dark')
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

// 3. 消费
function Header() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('必须在 ThemeProvider 内使用')
  return <div className={ctx.theme}>...</div>
}
```

### Context 的性能陷阱

```tsx
// ⚠️ 问题：Context value 变化时，所有 useContext 消费者都会重渲染
const AppContext = createContext({ count: 0, name: 'a' })

// 即使组件只用 name，count 变了也会重渲染
function Name() {
  const { name } = useContext(AppContext)  // count 变了也会重渲染！
  return <div>{name}</div>
}

// 解决方案：
// 1. 拆成多个 Context（ThemeContext + UserContext）
// 2. 用 use-context-selector（支持选择器）
// 3. 状态复杂时直接用 Zustand/Jotai（天然支持选择器）
```

---

## 11. 服务端状态 vs 客户端状态

```
┌─────────────────────────────────────────────────┐
│              状态管理的两个维度                   │
├──────────────────┬──────────────────────────────┤
│  客户端状态        │  服务端状态                   │
│  (Client State)  │  (Server State)             │
├──────────────────┼──────────────────────────────┤
│ 用户输入           │ API 返回的列表数据            │
│ UI 状态（弹窗/Tab）│ 详情页数据                   │
│ 主题/语言          │ 搜索结果                     │
│ 购物车（前端维护） │ 分页数据                     │
├──────────────────┼──────────────────────────────┤
│ Pinia / Redux    │ React Query / SWR            │
│ Zustand / Jotai  │ RTK Query / VueUse           │
└──────────────────┴──────────────────────────────┘
```

### React Query（服务端状态之王）

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// 自动处理 loading / error / cache / retry / 乐观更新
function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers()
  })

  if (isLoading) return <Loading />
  if (error) return <Error />
  return <ul>{data.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}

// Mutation + 自动刷新
function AddUser() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: api.addUser,
    onSuccess: () => {
      // 自动刷新用户列表
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
  return <button onClick={() => mutation.mutate({ name: 'John' })}>添加</button>
}
```

### VueUse 的 useFetch / 自定义 composable

```ts
// Vue 生态中处理服务端状态
import { useFetch } from '@vueuse/core'

// 自动处理 loading/error/abort
const { data, error, isLoading } = useFetch('/api/users').json()

// 或自定义 composable
function useUsers() {
  const users = ref<User[]>([])
  const loading = ref(false)

  async function fetchUsers() {
    loading.value = true
    try {
      users.value = await api.getUsers()
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchUsers)
  return { users, loading, fetchUsers }
}
```

---

## 12. 全部方案对比

| | Vuex | Pinia | Redux Toolkit | Zustand | Jotai | MobX |
|---|------|-------|---|---|---|---|
| **框架** | Vue 2/3 | Vue 3 | React | React | React | 跨框架 |
| **模型** | Flux | Flux | Flux | Store | Atomic | Reactive |
| **体积 (min+gzip)** | ~1.5KB | ~1.2KB | ~12KB | ~1.1KB | ~2KB | ~16KB |
| **样板代码** | 多 | 少 | 中 | 极少 | 少 | 少 |
| **TypeScript** | 弱 | 优秀 | 好 | 好 | 优秀 | 好 |
| **DevTools** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **持久化** | 插件 | 插件 | 插件 | 中间件 | 插件 | 插件 |
| **SSR** | 需处理 | 原生 | 需处理 | 需处理 | 支持 | 需处理 |
| **学习曲线** | 中 | 低 | 中 | 极低 | 低 | 中 |
| **适合项目** | Vue2 老项目 | Vue3 新项目 | React 中大型 | React 中小型 | React 原子化 | 跨框架/中大型 |

---

## 13. 选型建议

### Vue 项目

```
Vue 2 老项目：
  → Vuex 3（没得选，Vue 2 生态）
  → 或升级到 Vue 3 + Pinia

Vue 3 新项目：
  → Pinia（官方推荐，没有理由不用）
  → 简单场景：provide/inject
  → 服务端数据：VueUse useFetch / 自定义 composable
```

### React 项目

```
小型项目：
  → useState + useContext（内置，零依赖）
  → 状态稍多：Zustand（3KB，极简）

中型项目：
  → Zustand / Jotai（轻量、灵活）
  → 服务端数据：React Query / SWR

大型项目：
  → Redux Toolkit（生态丰富、中间件、时间旅行）
  → RTK Query 处理服务端状态
  → 或 Zustand + React Query 组合

需要精确更新：
  → Jotai（原子化，自动追踪依赖）
  → MobX（响应式，细粒度更新）
```

### 通用原则

```
1. 先用框架内置能力（useState/ref + Context/provide-inject）
2. 状态真正复杂了再引入状态管理库
3. 服务端状态和客户端状态分开管理
   → 客户端状态：Pinia / Zustand / Redux
   → 服务端状态：React Query / SWR / VueUse
4. 不要为了用而用 — 3 个组件共享 1 个状态不需要 Redux
```

---

## 14. 最佳实践

### Store 结构设计

```ts
// ✅ 按业务领域分 Store，不要按技术分层
// stores/
//   user.ts        → 用户相关
//   cart.ts        → 购物车相关
//   theme.ts       → 主题相关
//   notification.ts → 通知相关

// ❌ 不要这样分
// stores/
//   state.ts       → 所有 state 塞一起
//   actions.ts     → 所有 actions 塞一起
```

### 不要把所有状态都放 Store

```ts
// ✅ 组件私有状态留在组件内
const isOpen = ref(false)  // 弹窗开关，放组件内
const inputValue = ref('') // 输入框值，放组件内

// ✅ 跨组件共享的状态才放 Store
const userStore = useUserStore()  // 用户信息，多组件共享
const cartStore = useCartStore()  // 购物车，多组件共享
```

### Action 命名规范

```ts
// ✅ 动词开头，描述意图
actions: {
  fetchUserList() {},
  addToCart() {},
  removeFromCart() {},
  updateQuantity() {},
  clearCart() {},
  toggleTheme() {}
}

// ❌ 不要这样命名
actions: {
  data() {},      // 什么 data？
  handle() {},    // handle 什么？
  change() {}     // change 什么？
}
```

### 异步错误处理

```ts
// Pinia
async function login(credentials) {
  try {
    const user = await api.login(credentials)
    this.user = user
  } catch (error) {
    this.loginError = error.message
    throw error  // 让组件也能 catch
  }
}

// 组件中
try {
  await userStore.login(credentials)
  router.push('/dashboard')
} catch {
  // 错误已在 store 中处理，这里只处理 UI 跳转
}
```

### 状态持久化策略

```ts
// 只持久化必要的状态
persist: {
  paths: ['token', 'user.id']  // 只存 token 和用户 ID
  // 不存：loading 状态、错误信息、临时 UI 状态
}
```

---

## 15. 常见踩坑

### Pinia 解构丢失响应性

```ts
// ❌ 直接解构 state/getter 会丢失响应性
const store = useCounterStore()
const { count } = store  // count 不是响应式的！

// ✅ 用 storeToRefs
const { count, doubleCount } = storeToRefs(store)
// actions 可以直接解构（函数不需要响应性）
const { increment } = store
```

### Redux 不必要的重渲染

```tsx
// ❌ 每次都返回新对象，导致无限重渲染
const data = useSelector((state) => state.items.filter(i => i.active))

// ✅ 用 reselect 的 createSelector 做记忆化
import { createSelector } from 'reselect'
const selectActiveItems = createSelector(
  (state) => state.items,
  (items) => items.filter(i => i.active)
)
const data = useSelector(selectActiveItems)
```

### Context 性能问题

```tsx
// ❌ 一个大 Context 包含所有状态
const AppContext = createContext({ user, theme, cart, notifications, ... })
// 任何一个字段变了，所有消费者都重渲染

// ✅ 按领域拆分
const UserContext = createContext(user)
const ThemeContext = createContext(theme)
const CartContext = createContext(cart)
```

### MobX 直接修改 observable

```ts
// ❌ 在 action 外直接修改（严格模式下报错）
const store = new Store()
store.count++  // 如果 configure({ enforceActions: 'always' })，会报错

// ✅ 在 action 内修改
class Store {
  increment() {  // action
    this.count++
  }
}
```

---

## 参考

- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Redux Toolkit 官方文档](https://redux-toolkit.js.org/)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Jotai GitHub](https://github.com/pmndrs/jotai)
- [MobX 官方文档](https://mobx.js.org/)
- [React Query 官方文档](https://tanstack.com/query/latest)
