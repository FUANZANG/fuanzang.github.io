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

---

## 11. 自定义 Hooks

### 设计规范

```typescript
// 1. 以 use 开头
// 2. 返回有意义的值或方法
// 3. 内部管理状态和副作用
// 4. 考虑清理（返回 cleanup 函数或在 useEffect 中清理）

// 命名规范
useXxx()          // ✅ 标准命名
getXxx()          // ❌ 这是普通函数
handleXxx()       // ❌ 这是事件处理函数
```

### useDebounce — 防抖值

```typescript
import { useState, useEffect } from 'react'

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// 使用：搜索框防抖
function SearchBox() {
  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebounce(keyword, 500)

  useEffect(() => {
    if (debouncedKeyword) {
      fetchSearchResults(debouncedKeyword)
    }
  }, [debouncedKeyword])

  return <input value={keyword} onChange={e => setKeyword(e.target.value)} />
}
```

### useFetch — 数据请求

```typescript
import { useState, useEffect } from 'react'

interface UseFetchReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

function useFetch<T>(url: string): UseFetchReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refetchCount, setRefetchCount] = useState(0)

  const refetch = () => setRefetchCount(c => c + 1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
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
  }, [url, refetchCount])

  return { data, loading, error, refetch }
}

// 使用
function UserList() {
  const { data, loading, error, refetch } = useFetch<User[]>('/api/users')

  if (loading) return <p>加载中...</p>
  if (error) return <p>错误: {error.message} <button onClick={refetch}>重试</button></p>
  return <ul>{data?.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```

### useLocalStorage — 本地存储

```typescript
import { useState, useEffect } from 'react'

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue]
}

// 使用
function Settings() {
  const [theme, setTheme] = useLocalStorage('theme', 'light')
  const [language, setLanguage] = useLocalStorage('language', 'zh-CN')

  return (
    <>
      <select value={theme} onChange={e => setTheme(e.target.value)}>
        <option value="light">浅色</option>
        <option value="dark">深色</option>
      </select>
    </>
  )
}
```

### useClickOutside — 点击外部

```typescript
import { useEffect, useRef } from 'react'

function useClickOutside<T extends HTMLElement>(
  handler: () => void
): React.RefObject<T> {
  const ref = useRef<T>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler()
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [handler])

  return ref
}

// 使用：下拉菜单点击外部关闭
function Dropdown() {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false))

  return (
    <div ref={ref}>
      <button onClick={() => setOpen(!open)}>菜单</button>
      {open && (
        <ul>
          <li>选项 1</li>
          <li>选项 2</li>
        </ul>
      )}
    </div>
  )
}
```

### useWindowSize — 窗口尺寸

```typescript
import { useState, useEffect } from 'react'

function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return size
}

// 使用
function Responsive() {
  const { width } = useWindowSize()
  return <p>窗口宽度: {width}px {width < 768 ? '(移动端)' : '(桌面端)'}</p>
}
```

---

## 12. 状态管理对比

### 方案对比

| 方案 | 适用场景 | 复杂度 | 包体积 |
|------|---------|--------|--------|
| `useState` | 组件内部状态 | ⭐ | 0 |
| `useReducer` | 复杂组件状态逻辑 | ⭐⭐ | 0 |
| Context | 跨层级共享（主题、语言） | ⭐⭐ | 0 |
| Zustand | 中小型全局状态 | ⭐⭐ | ~1KB |
| Jotai | 原子化状态 | ⭐⭐ | ~2KB |
| Redux Toolkit | 大型企业应用 | ⭐⭐⭐ | ~10KB |

### useReducer

```tsx
import { useReducer } from 'react'

interface State {
  count: number
  step: number
}

type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'setStep'; payload: number }
  | { type: 'reset' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step }
    case 'decrement':
      return { ...state, count: state.count - state.step }
    case 'setStep':
      return { ...state, step: action.payload }
    case 'reset':
      return { count: 0, step: 1 }
    default:
      return state
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 })

  return (
    <>
      <p>Count: {state.count} (step: {state.step})</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
      <input
        type="number"
        value={state.step}
        onChange={e => dispatch({ type: 'setStep', payload: Number(e.target.value) })}
      />
      <button onClick={() => dispatch({ type: 'reset' })}>重置</button>
    </>
  )
}
```

### Zustand（推荐）

```typescript
// stores/userStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  user: User | null
  token: string | null
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  logout: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'user-storage' } // 持久化到 localStorage
  )
)

// 使用
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

// 选择器（避免不必要的重渲染）
function UserAvatar() {
  // ✅ 只订阅 avatar，user 其他属性变化不会重渲染
  const avatar = useUserStore(state => state.user?.avatar)
  return <img src={avatar} />
}
```

### Jotai（原子化状态）

```typescript
import { atom, useAtom } from 'jotai'

// 定义原子
const countAtom = atom(0)
const doubleCountAtom = atom((get) => get(countAtom) * 2)

// 异步原子
const userAtom = atom(async () => {
  const res = await fetch('/api/user')
  return res.json()
})

// 使用
function Counter() {
  const [count, setCount] = useAtom(countAtom)
  const [doubleCount] = useAtom(doubleCountAtom)

  return (
    <>
      <p>{count} × 2 = {doubleCount}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </>
  )
}
```

### Redux Toolkit

```typescript
// store/index.ts
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'

interface TodoState {
  items: { id: string; text: string; done: boolean }[]
}

const todoSlice = createSlice({
  name: 'todos',
  initialState: { items: [] } as TodoState,
  reducers: {
    addTodo: (state, action: PayloadAction<string>) => {
      state.items.push({ id: Date.now().toString(), text: action.payload, done: false })
    },
    toggleTodo: (state, action: PayloadAction<string>) => {
      const todo = state.items.find(t => t.id === action.payload)
      if (todo) todo.done = !todo.done
    },
  },
})

export const { addTodo, toggleTodo } = todoSlice.actions

export const store = configureStore({
  reducer: {
    todos: todoSlice.reducer,
  },
})

// 类型
type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// 使用
function TodoList() {
  const todos = useAppSelector(state => state.todos.items)
  const dispatch = useAppDispatch()

  return (
    <>
      <button onClick={() => dispatch(addTodo('新任务'))}>添加</button>
      <ul>
        {todos.map(todo => (
          <li key={todo.id} onClick={() => dispatch(toggleTodo(todo.id))}>
            {todo.done ? '✅' : '⬜'} {todo.text}
          </li>
        ))}
      </ul>
    </>
  )
}
```

---

## 13. React Router 6

### 基本配置

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      {
        path: 'users',
        element: <Users />,
        children: [
          { path: ':id', element: <UserDetail /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}
```

### 嵌套路由与 Outlet

```tsx
import { Outlet, NavLink } from 'react-router-dom'

function Layout() {
  return (
    <div>
      <nav>
        <NavLink to="/" end>首页</NavLink>
        <NavLink to="/about">关于</NavLink>
        <NavLink to="/users">用户</NavLink>
      </nav>
      <main>
        <Outlet /> {/* 子路由渲染在这里 */}
      </main>
    </div>
  )
}

// NavLink 高亮样式
<NavLink
  to="/users"
  className={({ isActive }) => isActive ? 'active' : ''}
>
  用户
</NavLink>
```

### 路由参数与导航

```tsx
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'

function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  const page = searchParams.get('page') || '1'
  const keyword = searchParams.get('keyword') || ''

  return (
    <div>
      <p>User ID: {id}</p>
      <p>Page: {page}</p>
      <button onClick={() => navigate('/users')}>返回列表</button>
      <button onClick={() => navigate(-1)}>返回上一页</button>
      <button onClick={() => setSearchParams({ page: '2', keyword: 'vue' })}>
        设置查询参数
      </button>
    </div>
  )
}
```

### Loader / Action（数据加载）

```tsx
import { createBrowserRouter, useLoaderData, Form, useActionData } from 'react-router-dom'

// Loader：路由加载时执行（类似 Next.js 的 getServerSideProps）
async function userLoader({ params }: { params: { id: string } }) {
  const res = await fetch(`/api/users/${params.id}`)
  if (!res.ok) throw new Response('Not Found', { status: 404 })
  return res.json()
}

// Action：表单提交时执行
async function userAction({ request }: { request: Request }) {
  const formData = await request.formData()
  const name = formData.get('name')

  if (!name) return { error: '姓名不能为空' }

  await fetch('/api/users', {
    method: 'POST',
    body: formData,
  })

  return redirect('/users')
}

const router = createBrowserRouter([
  {
    path: '/users/:id',
    element: <UserDetail />,
    loader: userLoader,
    action: userAction,
  },
])

function UserDetail() {
  const user = useLoaderData()
  const actionData = useActionData()

  return (
    <>
      <h1>{user.name}</h1>

      <Form method="post">
        <input name="name" defaultValue={user.name} />
        <button type="submit">保存</button>
      </Form>

      {actionData?.error && <p className="error">{actionData.error}</p>}
    </>
  )
}
```

### 权限路由（Protected Route）

```tsx
import { Navigate, useLocation } from 'react-router-dom'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    // 重定向到登录页，携带回调地址
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

// 路由配置
const router = createBrowserRouter([
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <RoleGuard roles={['admin']}>
          <AdminPanel />
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
])

// 角色守卫
function RoleGuard({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth()

  if (!roles.includes(user?.role || '')) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}
```

---

## 14. 性能优化

### React.memo

```tsx
import { memo } from 'react'

// 默认浅比较 props，相同则跳过渲染
const ExpensiveComponent = memo(function ExpensiveComponent({
  data,
  onClick,
}: {
  data: Item[]
  onClick: () => void
}) {
  console.log('渲染 ExpensiveComponent')
  return <div>{/* 复杂渲染 */}</div>
})

// 自定义比较函数
const CustomCompare = memo(
  function Component({ data }: { data: Item }) {
    return <div>{data.name}</div>
  },
  (prevProps, nextProps) => {
    // 返回 true 表示 props 相同，跳过渲染
    return prevProps.data.id === nextProps.data.id
  }
)
```

### useMemo 优化计算

```tsx
function ProductList({ products, filter }: { products: Product[]; filter: string }) {
  // 只在 products 或 filter 变化时重新计算
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => p.name.includes(filter))
      .sort((a, b) => b.sales - a.sales)
  }, [products, filter])

  return (
    <ul>
      {filteredProducts.map(p => (
        <li key={p.id}>{p.name} - ¥{p.price}</li>
      ))}
    </ul>
  )
}
```

### useCallback 优化回调

```tsx
const List = memo(function List({
  items,
  onDelete,
}: {
  items: Item[]
  onDelete: (id: string) => void
}) {
  return (
    <ul>
      {items.map(item => (
        <Item key={item.id} item={item} onDelete={onDelete} />
      ))}
    </ul>
  )
})

function App() {
  const [items, setItems] = useState<Item[]>([])

  // ✅ 用 useCallback 稳定函数引用
  const handleDelete = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  return <List items={items} onDelete={handleDelete} />
}
```

### 代码分割 (lazy + Suspense)

```tsx
import { lazy, Suspense } from 'react'

// 懒加载组件
const Dashboard = lazy(() => import('./Dashboard'))
const Settings = lazy(() => import('./Settings'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  )
}

// 预加载
const Dashboard = lazy(() => import('./Dashboard'))

function HomePage() {
  const [showDashboard, setShowDashboard] = useState(false)

  const handleMouseEnter = () => {
    // 鼠标悬停时预加载
    import('./Dashboard')
  }

  return (
    <button
      onMouseEnter={handleMouseEnter}
      onClick={() => setShowDashboard(true)}
    >
      打开仪表盘
    </button>
  )
}
```

### 虚拟列表

```tsx
// 使用 react-window 处理大数据列表
import { FixedSizeList } from 'react-window'

function VirtualList({ items }: { items: string[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={35}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          {items[index]}
        </div>
      )}
    </FixedSizeList>
  )
}
```

### 优化检查清单

```tsx
// 1. 避免在渲染中创建对象/数组/函数
// ❌
<List
  options={{ page: 1, size: 10 }}  // 每次渲染都是新对象
  onClick={() => handleClick()}     // 每次渲染都是新函数
/>

// ✅
const options = useMemo(() => ({ page: 1, size: 10 }), [])
const handleClick = useCallback(() => handleClick(), [])
<List options={options} onClick={handleClick} />

// 2. 使用 children 避免不必要的重渲染
// ❌
<Parent>
  <ExpensiveChild />
</Parent>

// ✅ Parent 用 memo 包裹，children 不会因 Parent 重渲染而重渲染
const Parent = memo(({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>
})
```

---

## 15. 错误边界

### 类组件实现

```tsx
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    // 上报错误到监控平台
    // Sentry.captureException(error, { extra: errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div>
          <h2>出错了</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// 使用
<ErrorBoundary fallback={<ErrorFallback />}>
  <Dashboard />
</ErrorBoundary>
```

### react-error-boundary（推荐）

```tsx
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert">
      <h2>出错了</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>重试</button>
    </div>
  )
}

// 使用
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onError={(error, info) => {
    console.error(error, info)
    // 上报错误
  }}
  onReset={() => {
    // 重置导致错误的状态
  }}
>
  <Dashboard />
</ErrorBoundary>
```

### 全局错误处理

```tsx
// window.onerror 捕获未处理的错误
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global error:', error)
  // 上报到监控平台
}

// window.onunhandledrejection 捕获未处理的 Promise 拒绝
window.onunhandledrejection = (event) => {
  console.error('Unhandled rejection:', event.reason)
  event.preventDefault()
}
```

---

## 16. Transition 与并发特性

### useTransition

```tsx
import { useTransition, useState } from 'react'

function SearchResults() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value) // 高优先级：立即更新输入框

    // 低优先级：延迟更新搜索结果
    startTransition(() => {
      const filtered = allItems.filter(item =>
        item.toLowerCase().includes(value.toLowerCase())
      )
      setResults(filtered)
    })
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending ? (
        <Loading />
      ) : (
        <ul>
          {results.map(item => <li key={item}>{item}</li>)}
        </ul>
      )}
    </>
  )
}
```

### useDeferredValue

```tsx
import { useDeferredValue, useState, useMemo } from 'react'

function SearchResults({ query }: { query: string }) {
  // 延迟更新 query，让输入框保持响应
  const deferredQuery = useDeferredValue(query)

  const results = useMemo(() => {
    return allItems.filter(item =>
      item.toLowerCase().includes(deferredQuery.toLowerCase())
    )
  }, [deferredQuery])

  return (
    <ul>
      {results.map(item => <li key={item}>{item}</li>)}
    </ul>
  )
}

function App() {
  const [query, setQuery] = useState('')

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <SearchResults query={query} />
    </>
  )
}
```

### startTransition

```tsx
import { startTransition } from 'react'

// 在事件处理函数外部使用
function navigate(url: string) {
  startTransition(() => {
    window.history.pushState({}, '', url)
  })
}

// 在 useEffect 中使用
useEffect(() => {
  startTransition(() => {
    setHeavyData(computeHeavyData())
  })
}, [dependency])
```

### Suspense 数据加载

```tsx
import { Suspense } from 'react'

// 配合 React.lazy 使用
const Dashboard = lazy(() => import('./Dashboard'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}

// 嵌套 Suspense（渐进式加载）
function App() {
  return (
    <Suspense fallback={<BigSpinner />}>
      <Layout>
        <Suspense fallback={<SmallSpinner />}>
          <Dashboard />
        </Suspense>
        <Suspense fallback={<SmallSpinner />}>
          <Sidebar />
        </Suspense>
      </Layout>
    </Suspense>
  )
}
```

---

## 17. React 18+ 新特性

### use() — 读取 Promise 或 Context

```tsx
import { use } from 'react'

// 读取 Promise（只能在组件或 Hook 中使用，不能在事件处理函数中）
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise)
  return (
    <ul>
      {comments.map(c => <li key={c.id}>{c.text}</li>)}
    </ul>
  )
}

// 读取 Context（可以在条件语句中使用，这是 useContext 做不到的）
function ThemeButton() {
  if (someCondition) {
    const theme = use(ThemeContext)
    return <button className={theme}>Click</button>
  }
  return <button>Click</button>
}
```

### useFormStatus

```tsx
import { useFormStatus } from 'react-dom'

// 获取父级 <form> 的提交状态
function SubmitButton() {
  const { pending, data, method } = useFormStatus()

  return (
    <button disabled={pending}>
      {pending ? '提交中...' : '提交'}
    </button>
  )
}

// 使用
function MyForm() {
  async function handleSubmit(formData: FormData) {
    await submitToServer(formData)
  }

  return (
    <form action={handleSubmit}>
      <input name="name" />
      <SubmitButton />
    </form>
  )
}
```

### useOptimistic

```tsx
import { useOptimistic, useRef } from 'react'

function MessageList({ messages, sendMessage }) {
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (state, newMessage: string) => [...state, { text: newMessage, sending: true }]
  )

  async function handleSend(formData: FormData) {
    const message = formData.get('message') as string
    addOptimistic(message) // 立即显示乐观更新
    await sendMessage(message) // 实际发送
  }

  return (
    <>
      <ul>
        {optimisticMessages.map((msg, i) => (
          <li key={i} style={{ opacity: msg.sending ? 0.5 : 1 }}>
            {msg.text}
          </li>
        ))}
      </ul>
      <form action={handleSend}>
        <input name="message" />
        <button type="submit">发送</button>
      </form>
    </>
  )
}
```

### Server Components (RSC)

```tsx
// Server Component（默认，在服务器执行）
async function PostList() {
  // 直接访问数据库、文件系统、环境变量
  const posts = await db.posts.findMany()
  const apiKey = process.env.API_KEY // 安全，不会暴露给客户端

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>
          <PostTitle id={post.id} />
        </li>
      ))}
    </ul>
  )
}

// Client Component（需要交互性时标记）
'use client'

import { useState } from 'react'

function PostTitle({ id }: { id: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? '收起' : '展开'}
      </button>
      {expanded && <PostContent id={id} />}
    </div>
  )
}
```

### Actions（表单提交简化）

```tsx
// 传统方式
function Form() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    try {
      const formData = new FormData(e.target as HTMLFormElement)
      await submitToServer(formData)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" />
      <button disabled={isPending}>提交</button>
      {error && <p>{error}</p>}
    </form>
  )
}

// Actions 方式（React 19）
function Form() {
  const [error, submitAction, isPending] = useActionState(
    async (prevState: string | null, formData: FormData) => {
      try {
        await submitToServer(formData)
        return null
      } catch (err) {
        return err.message
      }
    },
    null
  )

  return (
    <form action={submitAction}>
      <input name="name" />
      <button disabled={isPending}>提交</button>
      {error && <p>{error}</p>}
    </form>
  )
}
```

---

## 18. React + TypeScript

### 组件类型

```tsx
// 函数组件类型
type FC<P = {}> = React.FC<P>  // 已不推荐用 React.FC（children 问题）

// 推荐：直接声明 Props 类型
interface ButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}

function Button({ variant = 'primary', size = 'md', ...props }: ButtonProps) {
  return <button className={`btn btn-${variant} btn-${size}`} {...props} />
}
```

### 事件类型

```tsx
// 常用事件类型
type MouseEventHandler = React.MouseEventHandler<HTMLButtonElement>
type ChangeEventHandler = React.ChangeEventHandler<HTMLInputElement>
type FormEventHandler = React.FormEventHandler<HTMLFormElement>
type KeyboardEventHandler = React.KeyboardEventHandler<HTMLInputElement>

// 具体使用
function Form() {
  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    console.log(e.currentTarget) // HTMLButtonElement
  }

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    console.log(e.target.value) // string
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      console.log('Enter pressed')
    }
  }

  return (
    <form>
      <input onChange={handleChange} onKeyDown={handleKeyDown} />
      <button onClick={handleClick}>Click</button>
    </form>
  )
}
```

### Ref 类型

```tsx
import { useRef, forwardRef } from 'react'

// DOM Ref
function Input() {
  const inputRef = useRef<HTMLInputElement>(null)
  const divRef = useRef<HTMLDivElement>(null)

  const focus = () => inputRef.current?.focus()

  return (
    <div ref={divRef}>
      <input ref={inputRef} />
    </div>
  )
}

// forwardRef 泛型（支持自定义组件 ref 类型）
interface FancyInputProps {
  placeholder?: string
}

interface FancyInputHandle {
  focus: () => void
  clear: () => void
}

const FancyInput = forwardRef<FancyInputHandle, FancyInputProps>(
  ({ placeholder }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      clear: () => { if (inputRef.current) inputRef.current.value = '' },
    }))

    return <input ref={inputRef} placeholder={placeholder} />
  }
)
```

### 泛型组件

```tsx
// 列表组件，自动推断 item 类型
interface ListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T) => string
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  )
}

// 使用：自动推断 T 为 User
<List
  items={users}
  keyExtractor={user => user.id}
  renderItem={user => <span>{user.name}</span>}
/>
```

### 常见 TS 坑

```tsx
// ❌ 问题 1：children 类型
// React.FC 不再自动包含 children（React 18+）
const Component: React.FC = ({ children }) => <div>{children}</div> // 报错

// ✅ 解决：显式声明
interface Props {
  children: React.ReactNode
}
const Component: React.FC<Props> = ({ children }) => <div>{children}</div>

// ✅ 或者直接声明
function Component({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

// ❌ 问题 2：可选 props 的解构
interface Props {
  name?: string
  age?: number
}
// TypeScript 会报错：age 可能为 undefined
function Component({ name, age = 18 }: Props) {
  return <p>{name} - {age}</p>
}

// ✅ 解决：用 defaultProps 或在解构时给默认值
function Component({ name = '', age = 18 }: Props) {
  return <p>{name} - {age}</p>
}

// ❌ 问题 3：事件处理函数的 this
class MyComponent extends React.Component {
  handleClick() {
    console.log(this) // undefined（严格模式）
  }

  render() {
    return <button onClick={this.handleClick}>Click</button>
  }
}

// ✅ 解决：用箭头函数
class MyComponent extends React.Component {
  handleClick = () => {
    console.log(this) // 组件实例
  }

  render() {
    return <button onClick={this.handleClick}>Click</button>
  }
}
```

---

## 19. 样式方案

### CSS Modules（推荐）

```tsx
// Button.module.css
.button {
  padding: 8px 16px;
  border-radius: 4px;
}

.primary {
  background: blue;
  color: white;
}

.secondary {
  background: gray;
}

// Button.tsx
import styles from './Button.module.css'

function Button({ variant = 'primary', children }: ButtonProps) {
  return (
    <button className={`${styles.button} ${styles[variant]}`}>
      {children}
    </button>
  )
}

// 或用 clsx / classnames 库
import clsx from 'clsx'

function Button({ variant = 'primary', children }: ButtonProps) {
  return (
    <button className={clsx(styles.button, styles[variant])}>
      {children}
    </button>
  )
}
```

### Tailwind CSS

```tsx
function Button({ variant = 'primary', size = 'md' }: ButtonProps) {
  const baseStyles = 'rounded font-semibold transition-colors'

  const variants = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-500 text-white hover:bg-gray-600',
  }

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button className={clsx(baseStyles, variants[variant], sizes[size])}>
      Click me
    </button>
  )
}
```

### styled-components

```tsx
import styled from 'styled-components'

const StyledButton = styled.button<{ variant: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;

  ${({ variant }) =>
    variant === 'primary'
      ? `
        background: blue;
        color: white;
      `
      : `
        background: gray;
        color: white;
      `}

  &:hover {
    opacity: 0.8;
  }
`

function Button({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
  return <StyledButton variant={variant}>Click me</StyledButton>
}
```

### 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| CSS Modules | 隔离好、无运行时开销 | 不支持动态样式 | 中小型项目 |
| Tailwind | 快速开发、无需写 CSS | HTML 臃肿、学习成本 | 快速原型、设计系统 |
| styled-components | 动态样式、组件化 | 运行时开销、包体积大 | 复杂动态 UI |
| CSS-in-JS (emotion) | 灵活、性能好 | 学习成本 | 大型应用 |

---

## 20. 数据请求

### useEffect 请求的坑

```tsx
// ❌ 问题：竞态条件（race condition）
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data))
  }, [userId])

  // 如果 userId 快速变化（1 → 2 → 3），请求 1 可能比请求 3 晚返回
  // 导致显示错误的用户数据

  return <div>{user?.name}</div>
}

// ✅ 解决：用 cleanup 函数取消过期请求
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

// ✅ 更好的解决：用 AbortController
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error(err)
        }
      })

    return () => controller.abort()
  }, [userId])

  return <div>{user?.name}</div>
}
```

### SWR（推荐）

```tsx
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

function UserProfile({ userId }: { userId: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/users/${userId}`,
    fetcher
  )

  if (isLoading) return <Loading />
  if (error) return <Error message={error.message} />

  return (
    <div>
      <h1>{data.name}</h1>
      <button onClick={() => mutate()}>刷新</button>
    </div>
  )
}

// SWR 特性：
// 1. 自动缓存和去重
// 2. 窗口聚焦时自动重新验证
// 3. 轮询支持
// 4. 乐观更新

// 乐观更新
function TodoList() {
  const { data, mutate } = useSWR('/api/todos', fetcher)

  const addTodo = async (text: string) => {
    // 乐观更新 UI
    mutate([...data, { id: Date.now(), text, done: false }], false)

    // 实际请求
    await fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })

    // 重新验证
    mutate()
  }

  return <div>{/* ... */}</div>
}
```

### React Query (TanStack Query)

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// 查询
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(res => res.json()),
    staleTime: 5 * 60 * 1000, // 5 分钟内不重新请求
    cacheTime: 10 * 60 * 1000, // 缓存 10 分钟
  })

  if (isLoading) return <Loading />
  if (error) return <Error message={error.message} />

  return (
    <div>
      <h1>{data.name}</h1>
      <button onClick={() => refetch()}>刷新</button>
    </div>
  )
}

// 变更
function CreateTodo() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (text: string) =>
      fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }).then(res => res.json()),

    onSuccess: () => {
      // 成功后刷新 todos 列表
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  return (
    <form onSubmit={e => {
      e.preventDefault()
      const formData = new FormData(e.target as HTMLFormElement)
      mutation.mutate(formData.get('text') as string)
    }}>
      <input name="text" />
      <button disabled={mutation.isPending}>
        {mutation.isPending ? '创建中...' : '创建'}
      </button>
    </form>
  )
}

// 在 App 中配置 QueryClient
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProfile userId="123" />
    </QueryClientProvider>
  )
}
```

### 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| useEffect + fetch | 无依赖、灵活 | 手动处理缓存/竞态/重试 | 简单场景 |
| SWR | 轻量、自动缓存 | 功能较少 | 中小型项目 |
| React Query | 功能全面、生态好 | 包体积大、学习成本 | 大型应用 |
| Axios | 拦截器、取消请求 | 不处理缓存 | 配合其他方案 |

---

## 附录：常用 API 速查

### Hooks

| Hook | 用途 |
|------|------|
| `useState` | 组件状态 |
| `useEffect` | 副作用（数据请求、订阅、DOM 操作） |
| `useContext` | 消费 Context |
| `useReducer` | 复杂状态逻辑 |
| `useCallback` | 缓存回调函数 |
| `useMemo` | 缓存计算结果 |
| `useRef` | DOM 引用 / 持久化值 |
| `useImperativeHandle` | 自定义 ref 暴露的方法 |
| `useLayoutEffect` | 同步副作用（DOM 测量） |
| `useTransition` | 标记低优先级更新 |
| `useDeferredValue` | 延迟更新值 |
| `useId` | 生成唯一 ID（无障碍） |
| `use()` | 读取 Promise 或 Context (React 19) |
| `useActionState` | 表单 Action 状态 (React 19) |
| `useFormStatus` | 表单提交状态 (React 19) |
| `useOptimistic` | 乐观更新 (React 19) |

### 组件 API

| API | 用途 |
|-----|------|
| `memo` | 缓存组件渲染 |
| `forwardRef` | 转发 ref 到子组件 |
| `lazy` | 懒加载组件 |
| `Suspense` | 加载状态 |
| `startTransition` | 标记低优先级更新 |
| `createContext` | 创建 Context |

### 常用模式

```tsx
// 1. 状态提升
<Parent>
  <ChildA value={value} onChange={setValue} />
  <ChildB value={value} />
</Parent>

// 2. Render Props
<DataFetcher url="/api/data">
  {({ data, loading }) => loading ? <Loading /> : <Data data={data} />}
</DataFetcher>

// 3. Compound Components
<Select value={value} onChange={setValue}>
  <Select.Option value="1">选项 1</Select.Option>
  <Select.Option value="2">选项 2</Select.Option>
</Select>

// 4. Higher-Order Components (HOC)
const EnhancedComponent = withAuth(MyComponent)

// 5. Custom Hooks（推荐）
const { data, loading } = useFetch('/api/data')
```

### React vs Vue 速查

| 功能 | React | Vue 3 |
|------|-------|-------|
| 组件 | 函数 + Hooks | `<script setup>` |
| 状态 | `useState` | `ref` / `reactive` |
| 计算 | `useMemo` | `computed` |
| 副作用 | `useEffect` | `watch` / `watchEffect` |
| 生命周期 | `useEffect` | `onMounted` 等 |
| Props | 函数参数 | `defineProps` |
| Emits | 回调函数 Props | `defineEmits` |
| 双向绑定 | `value` + `onChange` | `v-model` / `defineModel` |
| Ref | `useRef` | `ref` + `useTemplateRef` |
| 插槽 | `children` / Render Props | `<slot>` |
| 跨层级 | Context | `provide` / `inject` |
| 全局状态 | Zustand / Redux | Pinia |
| 路由 | React Router | Vue Router |


