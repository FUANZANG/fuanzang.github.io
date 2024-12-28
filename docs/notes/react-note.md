# React 笔记

> 📌 本文件记录 React 核心概念、实战技巧与常用代码。Vue 对比内容请查看 [Vue vs React 对比](/notes/react-vs-vue)

<!-- 本文件记录 React 18+ 函数组件 + Hooks 的核心知识 -->

---

## 1. JSX 语法与原理

### JSX 本质

JSX 是 `React.createElement()` 的语法糖，编译后生成虚拟 DOM 对象。

```jsx
// JSX 写法
const element = <h1 className="title">Hello</h1>

// 编译后（React 17+ 新转换，不需要 import React）
import { jsx as _jsx } from 'react/jsx-runtime'
const element = _jsx('h1', { className: 'title', children: 'Hello' })

// React 17 之前
const element = React.createElement('h1', { className: 'title' }, 'Hello')
```

### JSX 规则

```jsx
// 1. 必须有一个根元素（或用 Fragment）
// ❌ 错误
return (
  <h1>Hello</h1>
  <p>World</p>
)

// ✅ Fragment（不生成额外 DOM）
return (
  <>
    <h1>Hello</h1>
    <p>World</p>
  </>
)

// ✅ 显式 Fragment（需要 key 时）
import { Fragment } from 'react'
return (
  <Fragment key={item.id}>
    <h1>Hello</h1>
    <p>World</p>
  </Fragment>
)
```

```jsx
// 2. class → className, for → htmlFor
<div className="container">
  <label htmlFor="input">Name</label>
  <input id="input" />
</div>

// 3. 样式用对象（驼峰命名）
<div style={{ fontSize: '16px', backgroundColor: '#f0f0f0' }}>styled</div>

// 4. 事件用驼峰
<button onClick={handleClick}>Click</button>
<input onChange={handleChange} />
```

### 条件渲染

```jsx
// 三元表达式
{isLoggedIn ? <Dashboard /> : <Login />}

// && 短路（注意：0、''、null 都是 falsy）
{count > 0 && <Badge count={count} />}

// ⚠️ 经典坑：count 为 0 时会渲染出 0
{items.length && <List items={items} />}
// ✅ 修复
{items.length > 0 && <List items={items} />}

// 提前 return
function Component({ data }) {
  if (!data) return <Loading />
  if (data.error) return <Error message={data.error} />
  return <Content data={data} />
}
```

### 列表渲染

```jsx
function UserList({ users }) {
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>
          {user.name} - {user.email}
        </li>
      ))}
    </ul>
  )
}
```

### JSX 中的表达式

```jsx
// ✅ 只能用表达式，不能用语句（if/for/switch）
<div>
  {name.toUpperCase()}
  {a + b}
  {getUser()}
  {items.filter(i => i.active).length}
</div>

// ❌ 不行
<div>
  {if (condition) { return <A /> }}  // 语法错误
  {const x = 1}                       // 语法错误
</div>
```

---

## 2. 组件与 Props

### 函数组件

```tsx
// 基本函数组件
function Welcome({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>
}

// 箭头函数
const Welcome = ({ name }: { name: string }) => <h1>Hello, {name}</h1>

// 使用
<Welcome name="芥末" />
```

### Props 传参

```tsx
interface UserCardProps {
  name: string
  age?: number
  avatar?: string
  onFollow?: () => void
  children?: React.ReactNode
}

function UserCard({ name, age = 18, avatar, onFollow, children }: UserCardProps) {
  return (
    <div className="user-card">
      {avatar && <img src={avatar} alt={name} />}
      <h2>{name}</h2>
      <p>{age} 岁</p>
      {onFollow && <button onClick={onFollow}>关注</button>}
      <div>{children}</div>
    </div>
  )
}

// 使用
<UserCard name="芥末" age={25} onFollow={() => console.log('followed')}>
  <p>这是 children 内容</p>
</UserCard>
```

### Props 只读

```tsx
// ❌ 不能直接修改 props
function Component({ count }) {
  count = 10  // 虽然 JS 不报错，但 React 中 props 是只读的
  return <p>{count}</p>
}

// ✅ 需要修改就复制到 state
function Component({ initialCount }) {
  const [count, setCount] = useState(initialCount)
  return <p>{count}</p>
}
```

### children 的多种用法

```tsx
// 1. 普通子元素
<Card>
  <h1>Title</h1>
  <p>Content</p>
</Card>

// 2. 函数作为 children（Render Props 模式）
<MouseTracker>
  {({ x, y }) => <p>Mouse: {x}, {y}</p>}
</MouseTracker>

// 3. React.Children 工具方法
import { Children } from 'react'

function List({ children }) {
  return (
    <ul>
      {Children.map(children, (child, index) => (
        <li key={index}>{child}</li>
      ))}
    </ul>
  )
}
```

### 透传 Props（类似 Vue 的 $attrs）

```tsx
// 将所有 props 透传给子组件
function FancyButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`fancy-btn ${props.className || ''}`}>
      {props.children}
    </button>
  )
}

// 使用
<FancyButton onClick={handleClick} disabled type="submit">
  Submit
</FancyButton>
```

### forwardRef（类似 Vue 的 ref + defineExpose）

```tsx
import { forwardRef, useImperativeHandle, useRef } from 'react'

interface MyInputHandle {
  focus: () => void
  clear: () => void
}

const MyInput = forwardRef<MyInputHandle, { placeholder?: string }>(
  ({ placeholder }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null)

    // 自定义暴露给父组件的方法（类似 defineExpose）
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      clear: () => { if (inputRef.current) inputRef.current.value = '' },
    }))

    return <input ref={inputRef} placeholder={placeholder} />
  }
)

// 父组件使用
function Form() {
  const inputRef = useRef<MyInputHandle>(null)

  return (
    <>
      <MyInput ref={inputRef} placeholder="请输入" />
      <button onClick={() => inputRef.current?.focus()}>聚焦</button>
      <button onClick={() => inputRef.current?.clear()}>清空</button>
    </>
  )
}
```

---

## 3. State 与事件

### useState

```tsx
import { useState } from 'react'

function Counter() {
  // 基本类型
  const [count, setCount] = useState(0)
  const [name, setName] = useState('')
  const [visible, setVisible] = useState(false)

  // 对象类型（更新时必须展开，不能直接修改）
  const [user, setUser] = useState({ name: '芥末', age: 25 })

  // ❌ 错误：直接修改不会触发更新
  user.name = '新名字'

  // ✅ 正确：创建新对象
  setUser({ ...user, name: '新名字' })
  setUser(prev => ({ ...prev, age: prev.age + 1 }))

  // 数组类型
  const [items, setItems] = useState<string[]>([])

  // ✅ 添加
  setItems(prev => [...prev, 'new item'])
  // ✅ 删除
  setItems(prev => prev.filter(item => item !== 'target'))
  // ✅ 修改
  setItems(prev => prev.map(item => item === 'old' ? 'new' : item))
  // ❌ 错误
  items.push('new item')  // 不会触发更新

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={() => setCount(0)}>重置</button>
    </div>
  )
}
```

### useState 的惰性初始化

```tsx
// ❌ 每次渲染都会执行 getInitialData()
const [data, setData] = useState(getInitialData())

// ✅ 只在首次渲染时执行（传入函数）
const [data, setData] = useState(() => getInitialData())
```

### 批处理 (Batching)

```tsx
// React 18+ 自动批处理（之前只在事件处理中批处理）
function handleClick() {
  setCount(c => c + 1)    // 不会立即更新
  setCount(c => c + 1)    // 不会立即更新
  setName('new')           // 不会立即更新
  // 三次 setState 合并为一次渲染
}

// 需要立即获取更新后的 DOM？用 flushSync（一般不需要）
import { flushSync } from 'react-dom'
flushSync(() => setCount(c => c + 1))
// 这里 DOM 已经更新
```

### 合成事件

```tsx
// React 的事件是合成事件（SyntheticEvent），不是原生事件
function Form() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()  // 阻止默认行为
    e.stopPropagation() // 阻止冒泡
  }

  const handleClick = (e: React.MouseEvent) => {
    console.log(e.clientX, e.clientY)
    console.log(e.currentTarget) // 绑定事件的元素
    console.log(e.target)        // 触发事件的元素
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleChange} />
      <button onClick={handleClick} type="button">Click</button>
    </form>
  )
}
```

### 受控组件 vs 非受控组件

```tsx
// 受控组件（React 管理状态，推荐）
function ControlledInput() {
  const [value, setValue] = useState('')
  return (
    <input
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  )
}

// 非受控组件（DOM 管理状态，适合简单场景）
function UncontrolledInput() {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    console.log(inputRef.current?.value)
  }

  return (
    <>
      <input ref={inputRef} defaultValue="initial" />
      <button onClick={handleSubmit}>提交</button>
    </>
  )
}
```

---

## 4. 副作用 useEffect

### 基本用法

```tsx
import { useState, useEffect } from 'react'

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 依赖数组：userId 变化时重新执行
  useEffect(() => {
    let cancelled = false

    async function fetchUser() {
      setLoading(true)
      const res = await fetch(`/api/users/${userId}`)
      const data = await res.json()
      if (!cancelled) {
        setUser(data)
        setLoading(false)
      }
    }

    fetchUser()

    // 清理函数：组件卸载或下次 effect 执行前调用
    return () => { cancelled = true }
  }, [userId])

  if (loading) return <p>加载中...</p>
  return <p>{user?.name}</p>
}
```

### 依赖数组详解

```tsx
// 1. 无依赖数组 → 每次渲染都执行（几乎不该用）
useEffect(() => { console.log('每次渲染') })

// 2. 空数组 → 只在挂载时执行一次
useEffect(() => {
  console.log('组件挂载')
  return () => console.log('组件卸载')
}, [])

// 3. 有依赖 → 依赖变化时执行
useEffect(() => {
  document.title = `Count: ${count}`
}, [count])

// 4. 多个依赖
useEffect(() => {
  fetchData(page, keyword, sort)
}, [page, keyword, sort])
```

### 常见陷阱

```tsx
// ❌ 陷阱 1：无限循环
useEffect(() => {
  setItems([...items, newItem])  // items 是依赖但没写在数组里
}, [newItem])
// 修复：用函数式更新
useEffect(() => {
  setItems(prev => [...prev, newItem])
}, [newItem])

// ❌ 陷阱 2：闭包问题（拿到的是旧值）
useEffect(() => {
  const timer = setInterval(() => {
    console.log(count) // 永远是初始值 0
  }, 1000)
  return () => clearInterval(timer)
}, []) // count 没在依赖里

// ✅ 修复方案 1：加入依赖
useEffect(() => {
  const timer = setInterval(() => {
    console.log(count)
  }, 1000)
  return () => clearInterval(timer)
}, [count])

// ✅ 修复方案 2：用 useRef 保存最新值
const countRef = useRef(count)
countRef.current = count
useEffect(() => {
  const timer = setInterval(() => {
    console.log(countRef.current) // 始终是最新值
  }, 1000)
  return () => clearInterval(timer)
}, [])

// ❌ 陷阱 3：对象/数组作为依赖（每次渲染都是新引用）
useEffect(() => {
  fetchData(options)
}, [options]) // options 是对象，每次渲染引用不同

// ✅ 修复：用 useMemo 稳定引用，或拆开依赖
const options = useMemo(() => ({ page, keyword }), [page, keyword])
useEffect(() => {
  fetchData(options)
}, [options])
```

### useLayoutEffect

```tsx
import { useLayoutEffect } from 'react'

// useEffect: 异步执行，不阻塞渲染（绝大多数场景用这个）
// useLayoutEffect: 同步执行，在 DOM 变更后、浏览器绘制前执行

function Tooltip() {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    // 同步计算位置，避免闪烁
    const rect = elementRef.current?.getBoundingClientRect()
    if (rect) {
      setPosition({ x: rect.left, y: rect.top - 30 })
    }
  }, [])

  return <div style={{ left: position.x, top: position.y }}>tooltip</div>
}
```

---

## 5. 计算与记忆

### useMemo

```tsx
import { useMemo } from 'react'

function ExpensiveList({ items, filter }: { items: Item[]; filter: string }) {
  // 只在 items 或 filter 变化时重新计算
  const filteredItems = useMemo(() => {
    console.log('执行过滤计算...')
    return items
      .filter(item => item.name.includes(filter))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items, filter])

  return (
    <ul>
      {filteredItems.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}
```

### useCallback

```tsx
import { useCallback, memo } from 'react'

// 子组件用 memo 包裹，避免不必要的重渲染
const ListItem = memo(function ListItem({
  item,
  onDelete,
}: {
  item: Item
  onDelete: (id: string) => void
}) {
  return (
    <li>
      {item.name}
      <button onClick={() => onDelete(item.id)}>删除</button>
    </li>
  )
})

function List({ items }: { items: Item[] }) {
  // ❌ 不用 useCallback：每次渲染都创建新函数，导致所有子组件重渲染
  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  // ✅ 用 useCallback：函数引用稳定，子组件 memo 才有效
  const handleDelete = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, []) // 空依赖：用了函数式更新，不需要依赖 items

  return (
    <ul>
      {items.map(item => (
        <ListItem key={item.id} item={item} onDelete={handleDelete} />
      ))}
    </ul>
  )
}
```

### useRef

```tsx
import { useRef } from 'react'

function Timer() {
  // 1. DOM 引用
  const inputRef = useRef<HTMLInputElement>(null)
  const handleClick = () => inputRef.current?.focus()

  // 2. 持久化值（不触发重渲染）
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef(0) // 可以存储任何可变值

  // 3. 保存上一次的值
  const prevValueRef = useRef<string>('')
  const [value, setValue] = useState('')

  useEffect(() => {
    prevValueRef.current = value
  }, [value])

  console.log(`当前: ${value}, 上次: ${prevValueRef.current}`)

  return <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)} />
}
```

### useMemo vs useCallback 使用场景

| 场景 | 用 useMemo | 用 useCallback |
|------|-----------|---------------|
| 复杂计算结果 | ✅ 避免重复计算 | - |
| 传给子组件的回调 | - | ✅ 配合 memo 避免子组件重渲染 |
| 对象/数组作为依赖 | ✅ 稳定引用 | - |
| 简单值计算 | ❌ 开销比收益大 | ❌ 不需要 |

> 💡 **不要滥用**：useMemo/useCallback 本身有开销（闭包创建、依赖比较）。只在有明确性能问题时使用。

---

## 6. Context 上下文

### 基本用法

```tsx
import { createContext, useContext, useState } from 'react'

// 1. 创建 Context
interface ThemeContextType {
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

// 2. Provider
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// 3. 自定义 Hook（封装 useContext，带空值检查）
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

// 4. 消费
function Header() {
  const { theme, toggleTheme } = useTheme()
  return (
    <header className={theme}>
      <button onClick={toggleTheme}>切换主题</button>
    </header>
  )
}

// 5. 在 App 中使用
function App() {
  return (
    <ThemeProvider>
      <Header />
      <Main />
    </ThemeProvider>
  )
}
```

### Context 性能问题与优化

```tsx
// ❌ 问题：value 变化时，所有消费 Context 的组件都会重渲染
// 即使某个组件只用到了 theme，没用 toggleTheme

// ✅ 优化方案 1：拆分 Context
const ThemeValueContext = createContext<'light' | 'dark'>('light')
const ThemeActionContext = createContext<() => void>(() => {})

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const toggleTheme = useCallback(
    () => setTheme(t => (t === 'light' ? 'dark' : 'light')),
    []
  )

  return (
    <ThemeValueContext.Provider value={theme}>
      <ThemeActionContext.Provider value={toggleTheme}>
        {children}
      </ThemeActionContext.Provider>
    </ThemeValueContext.Provider>
  )
}

// ✅ 优化方案 2：use + memo（React 19）
// 用 memo 包裹消费组件，只有用到的值变化时才重渲染
```

### 多层 Provider 嵌套

```tsx
// ❌ Provider 地狱
<AuthProvider>
  <ThemeProvider>
    <LanguageProvider>
      <QueryProvider>
        <App />
      </QueryProvider>
    </LanguageProvider>
  </ThemeProvider>
</AuthProvider>

// ✅ compose 工具函数
function composeProviders(...providers: React.FC<{ children: React.ReactNode }>[]) {
  return providers.reduce(
    (Wrapped, Provider) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider><Wrapped>{children}</Wrapped></Provider>
      ),
    ({ children }) => <>{children}</>
  )
}

const Providers = composeProviders(AuthProvider, ThemeProvider, LanguageProvider, QueryProvider)

// 使用
<Providers><App /></Providers>
```

---

## 7. 条件渲染与列表

### 条件渲染模式

```tsx
// 1. if/else（最灵活）
function Status({ status }: { status: 'loading' | 'error' | 'success' }) {
  if (status === 'loading') return <Spinner />
  if (status === 'error') return <ErrorMessage />
  return <Content />
}

// 2. 三元表达式
{isAdmin ? <AdminPanel /> : <UserPanel />}

// 3. && 短路
{showBanner && <Banner />}
{items.length > 0 && <ItemList items={items} />}

// 4. 对象映射（多条件时更清晰）
const statusComponent: Record<Status, React.ReactNode> = {
  loading: <Spinner />,
  error: <ErrorMessage />,
  success: <Content />,
  empty: <EmptyState />,
}
return <>{statusComponent[status]}</>
```

### 列表渲染与 key

```tsx
// ✅ 用唯一稳定的 ID 作为 key
{users.map(user => (
  <UserCard key={user.id} user={user} />
))}

// ❌ 不要用 index（同 Vue，会导致状态错位）
{users.map((user, index) => (
  <UserCard key={index} user={user} />
))}

// 什么时候可以用 index？
// 1. 列表不会排序/过滤
// 2. 列表项没有内部状态（如 input）
// 3. 没有唯一 ID
```

### 虚拟 DOM 对比：React vs Vue

```
React: setState → 整棵组件树 diff（需要手动 memo 优化）
Vue:   响应式追踪 → 只更新依赖变化的组件（自动精准更新）

这就是为什么 React 需要 memo/useMemo/useCallback，
而 Vue 大部分场景不需要手动优化。
```

---

## 8. 组件通讯

### 父子通讯

```tsx
// 父传子：Props
function Parent() {
  const [count, setCount] = useState(0)
  return <Child count={count} />
}

function Child({ count }: { count: number }) {
  return <p>{count}</p>
}

// 子传父：回调函数（类似 Vue 的 emit）
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

### 双向绑定（类似 Vue 的 v-model）

```tsx
// React 没有 v-model，用 value + onChange 实现
interface InputProps {
  value: string
  onChange: (value: string) => void
}

function MyInput({ value, onChange }: InputProps) {
  return <input value={value} onChange={e => onChange(e.target.value)} />
}

// 使用
function Form() {
  const [name, setName] = useState('')
  return <MyInput value={name} onChange={setName} />
}
```

### 兄弟通讯（状态提升）

```tsx
// React 推荐：状态提升到共同父组件
function Parent() {
  const [selected, setSelected] = useState<string>('')
  return (
    <>
      <List selected={selected} onSelect={setSelected} />
      <Detail id={selected} />
    </>
  )
}

// 复杂场景用 Context 或全局状态管理（Zustand/Redux）
```

### 跨层级通讯 (Context)

```tsx
// 见第 6 章 Context 详细用法
// 简单场景：Context
// 复杂场景：Zustand / Redux / Jotai
```

### Ref 通讯

```tsx
// 父组件调用子组件方法（类似 Vue 的 defineExpose）
// 见第 2 章 forwardRef + useImperativeHandle
```

### 通讯方式对照

| 场景 | Vue | React |
|------|-----|-------|
| 父传子 | `props` / `defineProps` | Props |
| 子传父 | `emit` / `defineEmits` | 回调函数 Props |
| 双向绑定 | `v-model` / `defineModel` | `value` + `onChange` |
| 兄弟通讯 | mitt / Pinia | 状态提升 / Zustand |
| 跨层级 | `provide` / `inject` | Context / Zustand |
| 父操作子 | `ref` + `defineExpose` | `forwardRef` + `useImperativeHandle` |
| 全局状态 | Pinia | Zustand / Redux / Jotai |

---

## 9. 生命周期（Hooks 替代方案）

React 函数组件没有传统生命周期，用 Hooks 实现等价逻辑。

### Vue 2/3 vs React 对照表

| Vue 2 | Vue 3 | React (Hooks) | 说明 |
|-------|-------|---------------|------|
| `beforeCreate` | - | 组件函数体顶部 | setup 之前的逻辑直接写在函数体 |
| `created` | - | `useState` 初始值 | 初始化状态 |
| `beforeMount` | `onBeforeMount` | `useEffect(() => {}, [])` 执行前 | 渲染前的副作用 |
| `mounted` | `onMounted` | `useEffect(() => {}, [])` | 组件挂载后 |
| `beforeUpdate` | `onBeforeUpdate` | 渲染前（函数体） | 没有直接等价 |
| `updated` | `onUpdated` | `useEffect(() => {}, [deps])` | 依赖变化后 |
| `beforeUnmount` | `onBeforeUnmount` | `useEffect` 返回的清理函数 | 组件卸载前 |
| `unmounted` | `onUnmounted` | `useEffect` 返回的清理函数 | 组件卸载后 |

### 代码示例

```tsx
function MyComponent({ userId }: { userId: string }) {
  // ≈ beforeCreate / created — 初始化状态
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // ≈ mounted + beforeUnmount — 挂载时请求，卸载时清理
  useEffect(() => {
    let cancelled = false

    async function fetch() {
      setLoading(true)
      const res = await fetch(`/api/users/${userId}`)
      const json = await res.json()
      if (!cancelled) {
        setData(json)
        setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true } // 清理 ≈ beforeUnmount
  }, [userId])

  // ≈ updated — userId 变化时执行
  useEffect(() => {
    document.title = `User: ${userId}`
  }, [userId])

  // ≈ mounted（只执行一次）
  useEffect(() => {
    console.log('组件已挂载')
    window.addEventListener('resize', handleResize)

    return () => {
      console.log('组件将卸载')
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // 渲染（≈ beforeUpdate / updated 之间）
  if (loading) return <p>加载中...</p>
  return <div>{data?.name}</div>
}
```

### useInsertionEffect（极少用）

```tsx
import { useInsertionEffect } from 'react'

// 在 DOM 变更之后、useLayoutEffect 之前执行
// 主要给 CSS-in-JS 库使用，业务代码不需要
useInsertionEffect(() => {
  // 注入 CSS
}, [])
```

---

## 10. 表单处理

### 受控表单（推荐）

```tsx
function LoginForm() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    remember: false,
  })

  // 通用 handleChange
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('提交:', form)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="username"
        value={form.username}
        onChange={handleChange}
        placeholder="用户名"
      />
      <input
        name="password"
        type="password"
        value={form.password}
        onChange={handleChange}
        placeholder="密码"
      />
      <label>
        <input
          name="remember"
          type="checkbox"
          checked={form.remember}
          onChange={handleChange}
        />
        记住我
      </label>
      <button type="submit">登录</button>
    </form>
  )
}
```

### 非受控表单

```tsx
import { useRef } from 'react'

function SimpleForm() {
  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log({
      username: usernameRef.current?.value,
      password: passwordRef.current?.value,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input ref={usernameRef} defaultValue="" placeholder="用户名" />
      <input ref={passwordRef} type="password" defaultValue="" placeholder="密码" />
      <button type="submit">登录</button>
    </form>
  )
}
```

### Select 和 Textarea

```tsx
function FormWithSelect() {
  const [city, setCity] = useState('beijing')
  const [bio, setBio] = useState('')

  return (
    <form>
      {/* select 用 value 属性（不是 selected） */}
      <select value={city} onChange={e => setCity(e.target.value)}>
        <option value="beijing">北京</option>
        <option value="shanghai">上海</option>
        <option value="guangzhou">广州</option>
      </select>

      {/* textarea 用 children（不是 value 属性） */}
      <textarea value={bio} onChange={e => setBio(e.target.value)} />
    </form>
  )
}
```

### 表单校验

```tsx
function ValidatedForm() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.email.includes('@')) errs.email = '邮箱格式不正确'
    if (form.password.length < 6) errs.password = '密码至少 6 位'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      console.log('提交:', form)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={form.email}
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
      />
      {errors.email && <span className="error">{errors.email}</span>}

      <input
        type="password"
        value={form.password}
        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
      />
      {errors.password && <span className="error">{errors.password}</span>}

      <button type="submit">注册</button>
    </form>
  )
}
```

### useActionState (React 19+ / Actions)

```tsx
import { useActionState } from 'react'

// React 19 新增：简化表单提交
async function submitForm(prevState: string | null, formData: FormData) {
  const name = formData.get('name') as string
  if (!name) return '请输入姓名'

  await fetch('/api/submit', {
    method: 'POST',
    body: formData,
  })

  return '提交成功'
}

function MyForm() {
  const [message, formAction, isPending] = useActionState(submitForm, null)

  return (
    <form action={formAction}>
      <input name="name" />
      <button disabled={isPending}>
        {isPending ? '提交中...' : '提交'}
      </button>
      {message && <p>{message}</p>}
    </form>
  )
}
```
