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

## 2. 响应式系统对比

### React：无响应式 + 手动更新

React 没有真正的"响应式系统"，采用**不可变数据 + 手动 setState** 的方式触发更新。

```tsx
// React 更新流程
function Counter() {
  const [count, setCount] = useState(0)
  
  const handleClick = () => {
    // 1. 调用 setState，创建新状态
    setCount(count + 1)
    
    // 2. React 标记组件为"脏"，加入更新队列
    
    // 3. React 调度更新（Fiber 架构）
    //    - 批量合并多个 setState
    //    - 异步执行，避免阻塞主线程
    
    // 4. 重新执行整个组件函数
    //    - 重新创建所有 Hooks
    //    - 重新计算所有局部变量
    
    // 5. Diff 新旧 VDOM，更新真实 DOM
  }
  
  // 每次渲染都会执行这行代码
  const expensiveValue = computeExpensiveValue(count)
  
  return <button onClick={handleClick}>{count}</button>
}
```

**特点：**
- ❌ 每次 setState 触发整个组件树重新渲染
- ❌ 需要手动优化（memo / useMemo / useCallback）
- ✅ 心智模型简单，易于调试
- ✅ 不可变数据便于时间旅行、撤销重做

### Vue 2：Object.defineProperty

```javascript
// Vue 2 响应式原理
function defineReactive(obj, key, val) {
  const dep = new Dep() // 依赖收集器
  
  Object.defineProperty(obj, key, {
    get() {
      // 依赖收集：当前正在执行的 Watcher 订阅这个数据
      if (Dep.target) {
        dep.depend()
      }
      return val
    },
    set(newVal) {
      if (val === newVal) return
      val = newVal
      // 派发更新：通知所有订阅者
      dep.notify()
    }
  })
}

// 使用示例
const vm = new Vue({
  data: { count: 0 }
})

// 当模板中访问 vm.count 时：
// 1. 触发 getter，收集依赖（当前组件的 Watcher）
// 2. 当 count 变化时，触发 setter
// 3. 通知 Watcher，只更新用到 count 的组件
```

**特点：**
- ✅ 精准更新，只更新依赖变化的组件
- ❌ 无法检测新增/删除属性（需要 $set / $delete）
- ❌ 无法直接监听数组索引变化（需要 Vue.set）

### Vue 3：Proxy

```typescript
// Vue 3 响应式原理
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      // 依赖收集
      track(target, key)
      const result = Reflect.get(target, key, receiver)
      // 惰性代理：访问时才代理嵌套对象
      if (isObject(result)) {
        return reactive(result)
      }
      return result
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver)
      // 派发更新
      trigger(target, key)
      return result
    },
    deleteProperty(target, key) {
      const result = Reflect.deleteProperty(target, key)
      trigger(target, key)
      return result
    }
  })
}

// 使用示例
const state = reactive({ count: 0 })

// 当模板中访问 state.count 时：
// 1. 触发 Proxy getter，收集依赖
// 2. 当 count 变化时，触发 Proxy setter
// 3. 通知所有依赖这个属性的 effect，精准更新
```

**特点：**
- ✅ 精准更新 + 支持动态新增/删除属性
- ✅ 支持数组索引、length 变化
- ✅ 支持 Map/Set/WeakMap 等集合类型

### 更新机制对比

| 特性 | React | Vue 2 | Vue 3 |
|------|-------|-------|-------|
| **触发方式** | 手动 setState | 自动依赖追踪 | 自动依赖追踪 |
| **更新粒度** | 整个组件树 | 组件级别 | 组件级别 |
| **依赖收集** | 无（全量 Diff） | getter 时收集 | Proxy get 时收集 |
| **更新派发** | 调度器批量更新 | setter 时通知 | Proxy set 时通知 |
| **手动优化** | 必需（memo 等） | 不需要 | 不需要 |
| **新增属性** | 支持 | 不支持（$set） | 支持 |
| **数组监听** | 支持 | 部分（7 个变异方法） | 完整支持 |

---

## 3. Diff 算法对比

### React：单端比较 + Fiber

React 采用**单端比较**策略，配合 Fiber 架构实现可中断的增量渲染。

```tsx
// React Diff 核心逻辑（简化）
function reconcileChildren(current, workInProgress, nextChildren) {
  // 1. 单端比较：从前往后逐个比较
  let oldFiber = current.child
  let newFiber = null
  
  for (let i = 0; oldFiber && i < nextChildren.length; i++) {
    const newChild = nextChildren[i]
    
    // 比较 key 和 type
    if (oldFiber.key === newChild.key && oldFiber.type === newChild.type) {
      // 复用节点，更新 props
      newFiber = createWorkInProgress(oldFiber, newChild.props)
    } else {
      // 不匹配，标记删除/创建
      if (oldFiber) {
        deleteChild(workInProgress, oldFiber)
      }
      newFiber = createFiberFromElement(newChild)
    }
    
    oldFiber = oldFiber.sibling
  }
  
  // 2. 处理剩余节点
  // 3. 使用 Map 优化乱序场景（key 索引）
}
```

**Fiber 架构特点：**
- ✅ 可中断渲染：将渲染任务拆分成多个小任务
- ✅ 优先级调度：高优先级更新（用户输入）可以打断低优先级更新
- ✅ 增量渲染：不需要一次性完成整个树的 Diff

### Vue 2：双端比较

```javascript
// Vue 2 Diff 核心逻辑（简化）
function updateChildren(parentElm, oldCh, newCh) {
  let oldStartIdx = 0
  let newStartIdx = 0
  let oldEndIdx = oldCh.length - 1
  let newEndIdx = newCh.length - 1
  
  let oldStartVnode = oldCh[0]
  let oldEndVnode = oldCh[oldEndIdx]
  let newStartVnode = newCh[0]
  let newEndVnode = newCh[newEndIdx]
  
  // 双端比较：同时从两端向中间比较
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    // 4 种比较策略
    if (sameVnode(oldStartVnode, newStartVnode)) {
      // 头头匹配
      patchVnode(oldStartVnode, newStartVnode)
      oldStartVnode = oldCh[++oldStartIdx]
      newStartVnode = newCh[++newStartIdx]
    } else if (sameVnode(oldEndVnode, newEndVnode)) {
      // 尾尾匹配
      patchVnode(oldEndVnode, newEndVnode)
      oldEndVnode = oldCh[--oldEndIdx]
      newEndVnode = newCh[--newEndIdx]
    } else if (sameVnode(oldStartVnode, newEndVnode)) {
      // 头尾匹配（节点向右移动）
      patchVnode(oldStartVnode, newEndVnode)
      insertBefore(parentElm, oldStartVnode.elm, oldEndVnode.elm.nextSibling)
      oldStartVnode = oldCh[++oldStartIdx]
      newEndVnode = newCh[--newEndIdx]
    } else if (sameVnode(oldEndVnode, newStartVnode)) {
      // 尾头匹配（节点向左移动）
      patchVnode(oldEndVnode, newStartVnode)
      insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
      oldEndVnode = oldCh[--oldEndIdx]
      newStartVnode = newCh[++newStartIdx]
    } else {
      // 都不匹配，使用 key 索引
      // ...
    }
  }
}
```

**双端比较特点：**
- ✅ 高效处理列表头尾插入/删除
- ✅ 4 种匹配策略覆盖大部分场景
- ❌ 复杂乱序场景性能不如 LIS

### Vue 3：最长递增子序列 (LIS)

```typescript
// Vue 3 Diff 核心逻辑（简化）
function patchKeyedChildren(c1, c2, container) {
  let i = 0
  let e1 = c1.length - 1
  let e2 = c2.length - 1
  
  // 1. 从头部开始比较，跳过相同的前缀
  while (i <= e1 && i <= e2) {
    if (isSameVNodeType(c1[i], c2[i])) {
      patch(c1[i], c2[i], container)
    } else {
      break
    }
    i++
  }
  
  // 2. 从尾部开始比较，跳过相同的后缀
  while (i <= e1 && i <= e2) {
    if (isSameVNodeType(c1[e1], c2[e2])) {
      patch(c1[e1], c2[e2], container)
    } else {
      break
    }
    e1--
    e2--
  }
  
  // 3. 处理中间乱序部分
  if (i > e1 && i <= e2) {
    // 新增节点
    mountChildren(c2.slice(i, e2 + 1), container)
  } else if (i > e2 && i <= e1) {
    // 删除节点
    unmountChildren(c1.slice(i, e1 + 1))
  } else {
    // 乱序场景：使用最长递增子序列 (LIS)
    const s1 = i
    const s2 = i
    const keyToNewIndexMap = new Map()
    
    // 建立 key 到索引的映射
    for (let i = s2; i <= e2; i++) {
      keyToNewIndexMap.set(c2[i].key, i)
    }
    
    let j
    let patched = 0
    const toBePatched = e2 - s2 + 1
    const newIndexToOldIndexMap = new Array(toBePatched).fill(0)
    
    // 遍历旧节点
    for (let i = s1; i <= e1; i++) {
      const prevChild = c1[i]
      const newIndex = keyToNewIndexMap.get(prevChild.key)
      
      if (newIndex === undefined) {
        // 旧节点在新列表中不存在，删除
        unmount(prevChild)
      } else {
        // 记录新旧索引映射
        newIndexToOldIndexMap[newIndex - s2] = i + 1
        patch(prevChild, c2[newIndex], container)
        patched++
      }
    }
    
    // 计算最长递增子序列
    const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap)
    j = increasingNewIndexSequence.length - 1
    
    // 从后向前遍历，移动或新增节点
    for (let i = toBePatched - 1; i >= 0; i--) {
      const nextIndex = s2 + i
      const nextChild = c2[nextIndex]
      const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null
      
      if (newIndexToOldIndexMap[i] === 0) {
        // 新增节点
        mount(nextChild, container, anchor)
      } else if (j < 0 || i !== increasingNewIndexSequence[j]) {
        // 需要移动
        move(nextChild, container, anchor)
      } else {
        // 不需要移动
        j--
      }
    }
  }
}

// 最长递增子序列算法
function getSequence(arr) {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}
```

**LIS 特点：**
- ✅ 最优移动策略：最少 DOM 操作
- ✅ 高效处理复杂乱序场景
- ✅ 预处理头尾相同部分，减少计算量

### 三者对比

| 特性 | React | Vue 2 | Vue 3 |
|------|-------|-------|-------|
| **比较策略** | 单端比较 | 双端比较 | LIS + 头尾预处理 |
| **时间复杂度** | O(n) | O(n) | O(n log n)（LIS 部分） |
| **乱序优化** | key 索引 Map | 4 种匹配策略 | 最长递增子序列 |
| **DOM 移动** | 可能不是最优 | 较优 | 最优 |
| **架构支持** | Fiber（可中断） | 同步渲染 | 同步渲染 |
| **优先级调度** | 支持 | 不支持 | 不支持 |

**性能场景对比：**

```tsx
// 场景 1：列表头部插入
// React:  O(n) - 单端比较，逐个移动
// Vue 2:  O(1) - 头头匹配，直接插入
// Vue 3:  O(1) - 头尾预处理，跳过相同部分

// 场景 2：列表尾部删除
// React:  O(n) - 单端比较，逐个标记删除
// Vue 2:  O(1) - 尾尾匹配，直接删除
// Vue 3:  O(1) - 头尾预处理，跳过相同部分

// 场景 3：复杂乱序
// React:  O(n) - Map 索引，移动次数可能不是最优
// Vue 2:  O(n) - 4 种策略，较优但不是最优
// Vue 3:  O(n log n) - LIS 算法，移动次数最优
```

---

## 4. 组件 API 对照表

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

## 5. 状态管理对比

> 📖 更系统的状态管理知识（Pinia、Redux Toolkit、Zustand、Jotai、MobX）请查看 [状态管理](/notes/state-management)

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

## 6. 生命周期对照

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

## 7. Hooks vs Composition API

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

## 8. 组件通讯对比

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

## 9. 状态管理库对比

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

## 10. 路由对比

> 📖 更系统的前端路由知识（路由原理、Vue Router、React Router、动态路由、导航守卫）请查看 [前端路由](/notes/frontend-routing)

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

## 11. 性能优化对比

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

## 12. 生态对比

| 领域 | React | Vue 3 |
|------|-------|-------|
| **UI 库** | Ant Design、MUI、Chakra UI | Element Plus、Vuetify、Naive UI |
| **状态管理** | Zustand、Jotai、Redux Toolkit | Pinia |
| **路由** | React Router 6、TanStack Router | Vue Router 4 |
| **数据请求** | SWR、React Query、Axios | Vue Query、Axios |
| **表单** | React Hook Form、Formik | VeeValidate、FormKit |
| **SSR 框架** | Next.js | Nuxt 3 |
| **移动端** | React Native | uni-app、Capacitor（小程序跨端见 [小程序开发](/notes/mini-program)） |
| **构建工具** | Vite、Create React App (已废弃) | Vite、Vue CLI (已废弃) |
| **测试** | Vitest + Testing Library | Vitest + Testing Library |
| **TypeScript** | 原生支持 | 原生支持 |

---

## 13. 选择建议

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
