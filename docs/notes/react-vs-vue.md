# React vs Vue 对比

> 📌 本文档帮助同时使用 React 和 Vue 的开发者快速切换，提供 API 对照和常见场景代码对比。

<!-- React 详细笔记见 [React 笔记](/notes/react-note)，Vue 详细笔记见 [Vue 3 笔记](/notes/vue3-note) -->

---

## 1. 核心理念对比

| 对比项 | React | Vue 3 |
|--------|-------|-------|
| **设计哲学** | UI = f(state)，强调不可变性 | 渐进式框架，响应式自动追踪 |
| **状态更新** | 不可变 (Immutable) — 必须创建新对象 | 可变 (Mutable) — 直接修改响应式对象 |
| **模板语法** | JSX (JavaScript XML) | 模板 (HTML-like) 或 JSX |
| **响应式** | 手动 setState 触发重渲染 | 自动依赖追踪，精准更新 |
| **组件风格** | 函数组件 + Hooks | `<script setup>` + Composition API |
| **学习曲线** | 陡峭（需要理解 JS 闭包、Hooks 规则） | 平缓（模板直观，API 少） |

### 不可变 vs 可变

```tsx
// React — 不可变，必须创建新对象
const [user, setUser] = useState({ name: '芥末', age: 25 })

// ❌ 错误：直接修改不会触发更新
user.name = '新名字'

// ✅ 正确：创建新对象
setUser({ ...user, name: '新名字' })
setUser(prev => ({ ...prev, age: prev.age + 1 }))
```

```vue
<!-- Vue 3 — 可变，直接修改响应式对象 -->
<script setup>
import { reactive } from 'vue'

const user = reactive({ name: '芥末', age: 25 })

// ✅ 直接修改，自动触发更新
user.name = '新名字'
user.age++
</script>
```

---

## 2. 组件 API 对照表

| 功能 | React | Vue 3 |
|------|-------|-------|
| **定义组件** | `function Component() {}` | `<script setup>` |
| **Props 声明** | 函数参数 `{ name }: Props` | `defineProps<Props>()` |
| **Props 默认值** | 解构时赋值 `{ name = 'default' }` | `withDefaults(defineProps<Props>(), {})` |
| **Emits 声明** | 回调函数 Props `onSubmit: () => void` | `defineEmits<{ submit: [] }>()` |
| **双向绑定** | `value` + `onChange` | `v-model` / `defineModel()` |
| **Ref (DOM)** | `useRef<HTMLInputElement>(null)` | `useTemplateRef<HTMLInputElement>('ref')` (3.5+) |
| **暴露方法** | `forwardRef` + `useImperativeHandle` | `defineExpose({ method })` |
| **Slots** | `children` / Render Props | `<slot>` / `<slot name="xxx">` |
| **透传属性** | `{...props}` | `v-bind="$attrs"` |
| **组件名** | 文件名 / 函数名 | `defineOptions({ name: 'MyComp' })` (3.3+) |

---

## 3. 状态管理对比

### 基本状态

```tsx
// React
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  const [user, setUser] = useState({ name: '芥末', age: 25 })

  return (
    <>
      <p>{count}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={() => setUser({ ...user, age: user.age + 1 })}>
        年龄+1
      </button>
    </>
  )
}
```

```vue
<!-- Vue 3 -->
<script setup>
import { ref, reactive } from 'vue'

const count = ref(0)
const user = reactive({ name: '芥末', age: 25 })
</script>

<template>
  <p>{{ count }}</p>
  <button @click="count++">+1</button>
  <button @click="user.age++">年龄+1</button>
</template>
```

### 计算属性

```tsx
// React — useMemo
import { useMemo } from 'react'

function UserList({ users, filter }: { users: User[]; filter: string }) {
  const filteredUsers = useMemo(() => {
    return users.filter(u => u.name.includes(filter))
  }, [users, filter])

  return <ul>{filteredUsers.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```

```vue
<!-- Vue 3 — computed -->
<script setup>
import { computed } from 'vue'

const props = defineProps<{ users: User[]; filter: string }>()

const filteredUsers = computed(() => {
  return props.users.filter(u => u.name.includes(props.filter))
})
</script>

<template>
  <ul>
    <li v-for="user in filteredUsers" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
```

### 副作用

```tsx
// React — useEffect
import { useEffect } from 'react'

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setUser(data)
      })

    return () => { cancelled = true }
  }, [userId])

  return <div>{user?.name}</div>
}
```

```vue
<!-- Vue 3 — watch -->
<script setup>
import { ref, watch } from 'vue'

const props = defineProps<{ userId: string }>()
const user = ref(null)

watch(
  () => props.userId,
  async (newId) => {
    const res = await fetch(`/api/users/${newId}`)
    user.value = await res.json()
  },
  { immediate: true }
)
</script>

<template>
  <div>{{ user?.name }}</div>
</template>
```

---

## 4. 生命周期对照

| Vue 3 | React | 说明 |
|-------|-------|------|
| `onMounted` | `useEffect(() => {}, [])` | 组件挂载后 |
| `onUnmounted` | `useEffect` 返回的清理函数 | 组件卸载前 |
| `onUpdated` | `useEffect(() => {}, [deps])` | 依赖变化后 |
| `onBeforeMount` | 渲染前的逻辑（函数体顶部） | 挂载前 |
| `onBeforeUpdate` | 渲染前的逻辑（函数体） | 更新前 |
| `onBeforeUnmount` | `useEffect` 返回的清理函数 | 卸载前 |

```tsx
// React
import { useEffect } from 'react'

function MyComponent({ userId }: { userId: string }) {
  // ≈ onBeforeMount / onMounted
  useEffect(() => {
    console.log('组件已挂载')

    // ≈ onBeforeUnmount / onUnmounted
    return () => {
      console.log('组件将卸载')
    }
  }, [])

  // ≈ onUpdated（userId 变化时）
  useEffect(() => {
    console.log('userId 变化:', userId)
  }, [userId])

  return <div>{userId}</div>
}
```

```vue
<!-- Vue 3 -->
<script setup>
import { onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{ userId: string }>()

onMounted(() => {
  console.log('组件已挂载')
})

onUnmounted(() => {
  console.log('组件将卸载')
})

watch(
  () => props.userId,
  (newId) => {
    console.log('userId 变化:', newId)
  }
)
</script>

<template>
  <div>{{ userId }}</div>
</template>
```

---

## 5. Hooks vs Composition API

| React Hooks | Vue Composition API | 说明 |
|-------------|---------------------|------|
| `useState` | `ref` / `reactive` | 状态声明 |
| `useEffect` | `watch` / `watchEffect` | 副作用 |
| `useMemo` | `computed` | 计算属性 |
| `useCallback` | 不需要（Vue 自动优化） | 缓存函数 |
| `useRef` | `ref` / `useTemplateRef` (3.5+) | DOM 引用 / 持久化值 |
| `useContext` | `inject` | 消费上下文 |
| `createContext` | `provide` | 提供上下文 |
| `useReducer` | `reactive` + 函数 | 复杂状态逻辑 |
| `useTransition` | 无直接等价 | 并发特性 |
| `useDeferredValue` | 无直接等价 | 延迟更新 |

### 自定义 Hook vs Composable

```tsx
// React — useFetch
import { useState, useEffect } from 'react'

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch(url)
      .then(res => res.json())
      .then(json => {
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [url])

  return { data, loading, error }
}

// 使用
function UserList() {
  const { data, loading, error } = useFetch<User[]>('/api/users')
  if (loading) return <p>加载中...</p>
  if (error) return <p>错误: {error.message}</p>
  return <ul>{data?.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```

```vue
<!-- Vue 3 — useFetch -->
<script setup lang="ts">
import { ref, watch } from 'vue'

function useFetch<T>(url: string) {
  const data = ref<T | null>(null)
  const loading = ref(true)
  const error = ref<Error | null>(null)

  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(url)
      data.value = await res.json()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
    } finally {
      loading.value = false
    }
  }

  watch(() => url, fetchData, { immediate: true })

  return { data, loading, error, refetch: fetchData }
}

// 使用
const { data, loading, error } = useFetch<User[]>('/api/users')
</script>

<template>
  <p v-if="loading">加载中...</p>
  <p v-else-if="error">错误: {{ error.message }}</p>
  <ul v-else>
    <li v-for="u in data" :key="u.id">{{ u.name }}</li>
  </ul>
</template>
```

---

## 6. 组件通讯对比

### 父传子

```tsx
// React
function Parent() {
  const [count, setCount] = useState(0)
  return <Child count={count} />
}

function Child({ count }: { count: number }) {
  return <p>{count}</p>
}
```

```vue
<!-- Vue 3 -->
<!-- Parent.vue -->
<script setup>
import { ref } from 'vue'
import Child from './Child.vue'

const count = ref(0)
</script>

<template>
  <Child :count="count" />
</template>

<!-- Child.vue -->
<script setup>
defineProps<{ count: number }>()
</script>

<template>
  <p>{{ count }}</p>
</template>
```

### 子传父

```tsx
// React
function Parent() {
  const handleDelete = (id: string) => {
    console.log('删除:', id)
  }
  return <Child onDelete={handleDelete} />
}

function Child({ onDelete }: { onDelete: (id: string) => void }) {
  return <button onClick={() => onDelete('123')}>删除</button>
}
```

```vue
<!-- Vue 3 -->
<!-- Parent.vue -->
<script setup>
import Child from './Child.vue'

const handleDelete = (id: string) => {
  console.log('删除:', id)
}
</script>

<template>
  <Child @delete="handleDelete" />
</template>

<!-- Child.vue -->
<script setup>
const emit = defineEmits<{ delete: [id: string] }>()
</script>

<template>
  <button @click="emit('delete', '123')">删除</button>
</template>
```

### 双向绑定

```tsx
// React — value + onChange
function Parent() {
  const [name, setName] = useState('')
  return <MyInput value={name} onChange={setName} />
}

function MyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={e => onChange(e.target.value)} />
}
```

```vue
<!-- Vue 3 — v-model -->
<!-- Parent.vue -->
<script setup>
import { ref } from 'vue'
import MyInput from './MyInput.vue'

const name = ref('')
</script>

<template>
  <MyInput v-model="name" />
</template>

<!-- MyInput.vue -->
<script setup>
const model = defineModel<string>()
</script>

<template>
  <input v-model="model" />
</template>
```

### 跨层级 (Context / Provide-Inject)

```tsx
// React — Context
import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext<'light' | 'dark'>('light')

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  return (
    <ThemeContext.Provider value={theme}>
      <Header />
    </ThemeContext.Provider>
  )
}

function Header() {
  const theme = useContext(ThemeContext)
  return <header className={theme}>Header</header>
}
```

```vue
<!-- Vue 3 — provide/inject -->
<!-- App.vue -->
<script setup>
import { ref, provide } from 'vue'
import Header from './Header.vue'

const theme = ref<'light' | 'dark'>('light')
provide('theme', theme)
</script>

<template>
  <Header />
</template>

<!-- Header.vue -->
<script setup>
import { inject } from 'vue'

const theme = inject<'light' | 'dark'>('theme')
</script>

<template>
  <header :class="theme">Header</header>
</template>
```

---

## 7. 状态管理库对比

| 功能 | React | Vue 3 |
|------|-------|-------|
| **官方方案** | Context + useReducer | Pinia |
| **轻量级** | Zustand (~1KB) | Pinia (~1KB) |
| **原子化** | Jotai (~2KB) | Vue Reactivity |
| **企业级** | Redux Toolkit (~10KB) | Vuex (已废弃) |
| **推荐** | Zustand / Jotai | Pinia |

### Zustand vs Pinia

```tsx
// React — Zustand
import { create } from 'zustand'

const useUserStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}))

function UserProfile() {
  const { user, logout } = useUserStore()
  if (!user) return <Login />
  return (
    <div>
      <p>{user.name}</p>
      <button onClick={logout}>退出</button>
    </div>
  )
}
```

```vue
<!-- Vue 3 — Pinia -->
<script setup lang="ts">
// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({ user: null as User | null }),
  actions: {
    setUser(user: User) { this.user = user },
    logout() { this.user = null },
  },
})

// 组件中使用
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
</script>

<template>
  <Login v-if="!userStore.user" />
  <div v-else>
    <p>{{ userStore.user.name }}</p>
    <button @click="userStore.logout()">退出</button>
  </div>
</template>
```

---

## 8. 路由对比

| 功能 | React Router 6 | Vue Router 4 |
|------|----------------|--------------|
| **创建路由** | `createBrowserRouter` | `createRouter` |
| **路由配置** | `[{ path, element }]` | `[{ path, component }]` |
| **嵌套路由** | `<Outlet />` | `<router-view />` |
| **导航** | `useNavigate()` | `useRouter().push()` |
| **参数** | `useParams()` | `useRoute().params` |
| **查询** | `useSearchParams()` | `useRoute().query` |
| **编程式导航** | `navigate('/path')` | `router.push('/path')` |
| **守卫** | `<Navigate />` 组件 | `router.beforeEach()` |

```tsx
// React Router 6
import { createBrowserRouter, useNavigate, useParams } from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: 'users/:id', element: <UserDetail /> },
    ],
  },
])

function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <>
      <p>User ID: {id}</p>
      <button onClick={() => navigate('/users')}>返回列表</button>
    </>
  )
}
```

```vue
<!-- Vue Router 4 -->
<script setup lang="ts">
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      children: [
        { path: 'users/:id', component: UserDetail },
      ],
    },
  ],
})

// UserDetail.vue
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <p>User ID: {{ route.params.id }}</p>
  <button @click="router.push('/users')">返回列表</button>
</template>
```

---

## 9. 性能优化对比

| 优化手段 | React | Vue 3 |
|----------|-------|-------|
| **避免重渲染** | `React.memo` | 自动（响应式追踪） |
| **缓存计算** | `useMemo` | `computed` |
| **缓存函数** | `useCallback` | 不需要 |
| **代码分割** | `React.lazy` + `Suspense` | `defineAsyncComponent` |
| **虚拟列表** | `react-window` / `react-virtual` | `vue-virtual-scroller` |
| **手动优化** | 需要大量 memo/useMemo | 几乎不需要 |

### 为什么 Vue 不需要手动优化？

```tsx
// React — 需要手动 memo 避免重渲染
const ExpensiveComponent = memo(({ data, onClick }) => {
  return <div>{/* 复杂渲染 */}</div>
})

const Parent = () => {
  const [count, setCount] = useState(0)
  const [data, setData] = useState([])

  // 必须用 useCallback，否则子组件每次都会重渲染
  const handleClick = useCallback(() => {
    console.log('click')
  }, [])

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <ExpensiveComponent data={data} onClick={handleClick} />
    </>
  )
}
```

```vue
<!-- Vue 3 — 自动精准更新 -->
<script setup>
import { ref } from 'vue'

const count = ref(0)
const data = ref([])

// 不需要 useCallback，Vue 自动追踪依赖
const handleClick = () => {
  console.log('click')
}
</script>

<template>
  <button @click="count++">Count: {{ count }}</button>
  <!-- 只有 data 变化时才重渲染，count 变化不影响 -->
  <ExpensiveComponent :data="data" @click="handleClick" />
</template>
```

**原因：**
- React：`setState` 触发整棵组件树 diff，需要手动 `memo` 跳过不需要更新的子树
- Vue：响应式系统自动追踪依赖，只更新用到该数据的组件

---

## 10. 生态对比

| 领域 | React | Vue 3 |
|------|-------|-------|
| **UI 库** | Ant Design、MUI、Chakra UI | Element Plus、Vuetify、Naive UI |
| **状态管理** | Zustand、Jotai、Redux Toolkit | Pinia |
| **路由** | React Router 6、TanStack Router | Vue Router 4 |
| **数据请求** | SWR、React Query、Axios | Vue Query、Axios |
| **表单** | React Hook Form、Formik | VeeValidate、FormKit |
| **SSR 框架** | Next.js | Nuxt 3 |
| **移动端** | React Native | uni-app、Capacitor |
| **构建工具** | Vite、Create React App (已废弃) | Vite、Vue CLI (已废弃) |
| **测试** | Vitest + Testing Library | Vitest + Testing Library |
| **TypeScript** | 原生支持 | 原生支持 |

---

## 11. 选择建议

### 选 React 的场景
- 团队熟悉 React
- 需要 React Native 跨平台
- 大型企业应用（Redux 生态成熟）
- 招聘市场更广

### 选 Vue 的场景
- 快速原型开发
- 团队新手多（学习曲线平缓）
- 中小型项目
- 需要更好的开发体验（自动优化、模板直观）

### 双修建议
- **React 转 Vue**：重点学习响应式系统、`<script setup>`、Pinia
- **Vue 转 React**：重点学习不可变数据、Hooks 规则、手动优化
- **共同点**：Composition API 和 Hooks 思路相似，状态管理、路由概念互通

---

## 附录：快速切换速查

### 从 Vue 切到 React

```tsx
// Vue 的 ref → React 的 useState
const count = ref(0)  →  const [count, setCount] = useState(0)

// Vue 的 reactive → React 的 useState（对象）
const user = reactive({ name: '' })  →  const [user, setUser] = useState({ name: '' })

// Vue 的 computed → React 的 useMemo
const doubled = computed(() => count.value * 2)  →  const doubled = useMemo(() => count * 2, [count])

// Vue 的 watch → React 的 useEffect
watch(() => count.value, () => {})  →  useEffect(() => {}, [count])

// Vue 的 onMounted → React 的 useEffect
onMounted(() => {})  →  useEffect(() => {}, [])

// Vue 的 provide/inject → React 的 Context
provide('key', value)  →  <Context.Provider value={value}>
inject('key')  →  useContext(Context)
```

### 从 React 切到 Vue

```vue
// React 的 useState → Vue 的 ref
const [count, setCount] = useState(0)  →  const count = ref(0)

// React 的对象 state → Vue 的 reactive
const [user, setUser] = useState({ name: '' })  →  const user = reactive({ name: '' })

// React 的 useMemo → Vue 的 computed
const doubled = useMemo(() => count * 2, [count])  →  const doubled = computed(() => count.value * 2)

// React 的 useEffect → Vue 的 watch
useEffect(() => {}, [count])  →  watch(() => count.value, () => {})

// React 的 useEffect([], []) → Vue 的 onMounted
useEffect(() => {}, [])  →  onMounted(() => {})

// React 的 Context → Vue 的 provide/inject
<Context.Provider value={value}>  →  provide('key', value)
useContext(Context)  →  inject('key')
```
