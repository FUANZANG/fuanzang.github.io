# 前端设计模式

> 📌 本文件记录前端通用设计模式：组件模式（HOC、Render Props、Compound、Slot/Children）、Hooks/Composable 模式、响应式模式（Observer、Pub/Sub）、单例/工厂/策略/代理等经典模式在前端的应用。
>
> ⚠️ **边界说明**：React 自定义 Hooks 详见 [React ](/notes/frameworks/react)，Vue Composables 详见 [Vue 3 ](/notes/frameworks/vue3)，状态管理详见 [状态管理](/notes/frameworks/state-management)。本文聚焦**跨框架的设计模式思想**和通用实现。
>
> 📅 基于以下版本：React 19.2 | Vue 3.5 | TypeScript 5.x
>
> 🔗 React 自定义 Hooks 见 [React ](/notes/frameworks/react)，Vue Composables 见 [Vue 3 ](/notes/frameworks/vue3)，状态管理见 [状态管理](/notes/frameworks/state-management)

---

## 1. 组件模式

### 1.1 受控 vs 非受控模式

```tsx
// 受控模式：外部管理状态
function ControlledInput({ value, onChange }) {
  return <input value={value} onChange={onChange} />
}

// 非受控模式：组件内部管理状态
function UncontrolledInput() {
  const ref = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  return (
    <>
      <input ref={ref} defaultValue={value} onChange={e => setValue(e.target.value)} />
      <button onClick={() => console.log(ref.current?.value)}>提交</button>
    </>
  )
}

// 混合：提供 defaultValue + onChange 接口（推荐）
function Input({ defaultValue, value, onChange }) {
  const isControlled = value !== undefined
  const [internal, setInternal] = useState(defaultValue ?? '')

  return (
    <input
      value={isControlled ? value : internal}
      onChange={e => {
        if (!isControlled) setInternal(e.target.value)
        onChange?.(e.target.value)
      }}
    />
  )
}
```

### 1.2 Compound Component（复合组件）

> 将一组组件关联起来共享状态，内部组件通过 context 通信。

```tsx
import { createContext, useContext, useState, Children, isValidElement } from 'react'

const TabsContext = createContext(null)

// 外层组件
function Tabs({ children, defaultIndex = 0 }) {
  const [index, setIndex] = useState(defaultIndex)
  return (
    <TabsContext.Provider value={{ index, setIndex }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  )
}

// 标签头
function TabsList({ children }) {
  return <div className="tabs-list">{children}</div>
}

// 单个标签
function Tab({ index, children }) {
  const { index: activeIndex, setIndex } = useContext(TabsContext)
  return (
    <button
      className={activeIndex === index ? 'active' : ''}
      onClick={() => setIndex(index)}
    >
      {children}
    </button>
  )
}

// 标签面板
function TabsPanel({ index, children }) {
  const { index: activeIndex } = useContext(TabsContext)
  if (activeIndex !== index) return null
  return <div className="tabs-panel">{children}</div>
}

// 使用
<Tabs defaultIndex={0}>
  <TabsList>
    <Tab index={0}>概述</Tab>
    <Tab index={1}>详情</Tab>
  </TabsList>
  <TabsPanel index={0}><h2>概述内容</h2></TabsPanel>
  <TabsPanel index={1}><p>详情内容</p></TabsPanel>
</Tabs>
```

### 1.3 Slot / Children 模式

```tsx
// 1. 默认 children
function Card({ children }) {
  return <div className="card">{children}</div>
}

// 2. 具名插槽（通过 props 传递）
function Modal({ title, children, footer }) {
  return (
    <div className="modal">
      <div className="modal-header">{title}</div>
      <div className="modal-body">{children}</div>
      <div className="modal-footer">{footer}</div>
    </div>
  )
}

// 3. 函数式 children（Render Props 的简化版）
function List({ items, renderItem }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{renderItem(item)}</li>
      ))}
    </ul>
  )
}

// 使用
<List
  items={users}
  renderItem={(user) => (
    <span>{user.name} — {user.email}</span>
  )}
/>
```

### 1.4 条件渲染模式

```tsx
// 1. 三元运算符
{isLoggedIn ? <Dashboard /> : <Login />}

// 2. 短路求值（谨慎使用，值为 0 时可能出问题）
{isLoading && <Spinner />}  // isLoading 为 true 时渲染 Spinner

// 3. 错误边界
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>

// 4. 策略模式替代大量 if-else
const renderers = {
  text: (val) => <span>{val}</span>,
  number: (val) => <strong>{val}</strong>,
  link: (val) => <a href={val}>{val}</a>,
}
{renderers[type]?.(value) || <span>{value}</span>}
```

---

## 2. HOC（高阶组件）模式

> 接收组件并返回新组件的模式，用于**横切关注点**的逻辑复用。

### 2.1 基本实现

```tsx
// 日志 HOC
function withLogger(WrappedComponent) {
  return function WithLogger(props) {
    console.log('[withLogger] 渲染:', WrappedComponent.name, props)
    return <WrappedComponent {...props} />
  }
}

// 权限 HOC
function withAuth(WrappedComponent) {
  return function WithAuth(props) {
    const user = useAuth()
    if (!user?.isAdmin) {
      return <Redirect to="/403" />
    }
    return <WrappedComponent {...props} />
  }
}

// 使用
const AdminPanel = withAuth(withLogger(Panel))
```

### 2.2 Props 注入

```tsx
// 注入 props
function withTheme(WrappedComponent) {
  return function WithTheme(props) {
    const theme = useTheme()
    return <WrappedComponent {...props} theme={theme} />
  }
}

// 透传 props + 额外 props
function withProps(WrappedComponent, extraProps) {
  return function WithProps(props) {
    return <WrappedComponent {...extraProps} {...props} />
  }
}
```

### 2.3 Props 聚合

```tsx
// 收集 props 到数组
function withHandlers(WrappedComponent) {
  return function WithHandlers(props) {
    const [handlers, setHandlers] = useState([])
    const registerHandler = useCallback((handler) => {
      setHandlers(prev => [...prev, handler])
    }, [])
    const clearHandlers = useCallback(() => setHandlers([]), [])

    return (
      <WrappedComponent
        {...props}
        handlers={handlers}
        registerHandler={registerHandler}
        clearHandlers={clearHandlers}
      />
    )
  }
}
```

### 2.4 何时用 HOC vs Hooks

```
HOC 适用场景：
  ✅ 需要修改组件的渲染行为（包裹、增强）
  ✅ 需要在组件树外层注入逻辑
  ✅ 需要保持组件的 props 类型安全
  ✅ 需要与 class 组件兼容

Hooks 适用场景（优先）：
  ✅ 逻辑复用（更直观，无嵌套地狱）
  ✅ 状态逻辑（更灵活）
  ✅ 现代 React 项目

结论：Hooks 是 HOC 的现代替代品，新项目优先用 Hooks。
```

---

## 3. Render Props 模式

> 将渲染逻辑通过 prop 传递给子组件，子组件决定如何渲染。

```tsx
// 基本用法
function MouseTracker({ render }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMove = (e) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  return <>{render(pos)}</>
}

// 使用
<MouseTracker render={({ x, y }) => (
  <p>鼠标位置: {x}, {y}</p>
)} />

// 等价写法：使用 children 函数
function MouseTracker2({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  // ...同上
  return <>{children(pos)}</>
}

<MouseTracker2>{({ x, y }) => <p>鼠标位置: {x}, {y}</p>}</MouseTracker2>
```

### 3.1 Render Props vs Hooks 对比

```tsx
// Render Props 写法
class Timer extends React.Component {
  render() {
    return this.props.render(this.state.seconds)
  }
}
// 使用：<Timer render={seconds => <span>{seconds}s</span>} />

// Hooks 写法（更简洁）
function Timer() {
  const seconds = useSeconds()
  return <span>{seconds}s</span>
}
// 使用：<Timer />
```

**结论**：Hooks 解决了 Render Props 的嵌套问题（"回调地狱"），是现代前端的首选。

---

## 4. Custom Hooks / Composable 模式

> React Hooks 和 Vue Composables 本质上是同一模式在不同框架中的实现——**将状态和逻辑提取为可复用的函数**。

### 4.1 命名约定

```ts
// React Custom Hook
function useLocalStorage(key, initialValue) { ... }
function useDebounce(value, delay) { ... }
function useIntersectionObserver(ref, options) { ... }

// Vue Composable
function useMouse() { ... }
function useFetch(url) { ... }
function useToggle(initial = false) { ... }
```

### 4.2 状态管理 Hook

```tsx
// useLocalStorage
function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(stored))
  }, [key, stored])

  return [stored, setStored]
}

// 使用
const [theme, setTheme] = useLocalStorage('theme', 'light')
```

### 4.3 防抖 Hook

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

// 搜索场景
function SearchInput() {
  const [keyword, setKeyword] = useState('')
  const debounced = useDebounce(keyword, 500)
  const results = useFetch(`/api/search?q=${debounced}`)

  return (
    <input value={keyword} onChange={e => setKeyword(e.target.value)} />
    {/* results 只在停止输入 500ms 后触发 */}
  )
}
```

### 4.4 响应式 Hook（跨框架通用）

```tsx
// 检测窗口大小
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return size
}

// 检测元素可见性
function useIntersectionObserver(ref, options = {}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting)
    }, { threshold: 0.1, ...options })

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, options])

  return isVisible
}
```

---

## 5. 响应式设计模式

### 5.1 Observer（观察者）模式

```ts
// 简易 EventEmitter
class EventEmitter {
  private handlers: Map<string, Function[]> = new Map()

  on(event: string, handler: Function) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler)
    return () => this.off(event, handler) // 返回取消订阅函数
  }

  off(event: string, handler: Function) {
    const handlers = this.handlers.get(event)
    if (handlers) {
      const idx = handlers.indexOf(handler)
      if (idx >= 0) handlers.splice(idx, 1)
    }
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.handlers.get(event)
    handlers?.forEach(h => h(...args))
  }

  once(event: string, handler: Function) {
    const wrapper = (...args: any[]) => {
      handler(...args)
      this.off(event, wrapper)
    }
    this.on(event, wrapper)
  }
}

// 使用
const bus = new EventEmitter()
const unsubscribe = bus.on('data', (payload) => console.log(payload))
bus.emit('data', { id: 1 })
unsubscribe() // 取消订阅
```

### 5.2 Pub/Sub 模式

```ts
// 带通道的 Pub/Sub
class PubSub {
  private channels: Map<string, Set<Function>> = new Map()

  subscribe(channel: string, callback: Function) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set())
    }
    this.channels.get(channel)!.add(callback)
    return () => this.unsubscribe(channel, callback)
  }

  unsubscribe(channel: string, callback: Function) {
    this.channels.get(channel)?.delete(callback)
  }

  publish(channel: string, data?: any) {
    this.channels.get(channel)?.forEach(cb => cb(data))
  }
}

// 典型应用场景
const pubsub = new PubSub()

// 表单验证模块
pubsub.subscribe('form:input', (field) => validateField(field))
pubsub.subscribe('form:submit', (data) => handleSubmit(data))

// 模块间解耦通信
pubsub.publish('form:input', { name: 'email', value: 'test@example.com' })
```

### 5.3 命令模式

```ts
// 将请求封装为对象，支持撤销/重做
interface Command {
  execute(): void
  undo(): void
}

class TextEditorCommand implements Command {
  private textarea: HTMLTextAreaElement
  private prevText: string
  private newText: string

  constructor(textarea: HTMLTextAreaElement, newText: string) {
    this.textarea = textarea
    this.prevText = textarea.value
    this.newText = newText
  }

  execute() {
    this.textarea.value = this.newText
  }

  undo() {
    this.textarea.value = this.prevText
  }
}

// 撤销栈
class UndoManager {
  private stack: Command[] = []
  private redoStack: Command[] = []

  execute(cmd: Command) {
    cmd.execute()
    this.stack.push(cmd)
    this.redoStack = [] // 清空重做栈
  }

  undo() {
    const cmd = this.stack.pop()
    if (cmd) {
      cmd.undo()
      this.redoStack.push(cmd)
    }
  }

  redo() {
    const cmd = this.redoStack.pop()
    if (cmd) {
      cmd.execute()
      this.stack.push(cmd)
    }
  }
}
```

---

## 6. 工厂模式

### 6.1 简单工厂

```ts
// 根据类型创建不同的组件配置
type ComponentType = 'button' | 'input' | 'select' | 'textarea'

interface ComponentConfig {
  tag: string
  className: string
  defaultProps: Record<string, any>
}

const componentFactory: Record<ComponentType, ComponentConfig> = {
  button: {
    tag: 'button',
    className: 'btn btn-primary',
    defaultProps: { type: 'button' }
  },
  input: {
    tag: 'input',
    className: 'form-input',
    defaultProps: { type: 'text' }
  },
  select: {
    tag: 'select',
    className: 'form-select',
    defaultProps: {}
  },
  textarea: {
    tag: 'textarea',
    className: 'form-textarea',
    defaultProps: {}
  }
}

function createComponent(type: ComponentType): ComponentConfig {
  return componentFactory[type]
}
```

### 6.2 工厂函数（React 场景）

```tsx
// 根据配置动态生成组件
interface FieldConfig {
  type: 'text' | 'email' | 'number' | 'password' | 'date'
  label: string
  placeholder?: string
  required?: boolean
}

function createField(config: FieldConfig) {
  const { type, label, placeholder, required } = config

  return (
    <div className="field">
      <label>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}

// 表单字段配置
const fields: FieldConfig[] = [
  { type: 'text', label: '姓名', required: true },
  { type: 'email', label: '邮箱', required: true },
  { type: 'password', label: '密码', required: true },
  { type: 'date', label: '生日' },
]

// 渲染
{fields.map((f, i) => (
  <React.Fragment key={i}>{createField(f)}</React.Fragment>
))}
```

---

## 7. 策略模式

> 定义一系列算法/行为，让它们可以互相替换。

```tsx
// 排序策略
type SortStrategy = (a: any, b: any) => number

const strategies: Record<string, SortStrategy> = {
  asc: (a, b) => a - b,
  desc: (a, b) => b - a,
  alpha: (a, b) => a.name.localeCompare(b.name),
  date: (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime(),
}

function sortData(data: any[], strategyName: string) {
  const strategy = strategies[strategyName]
  if (!strategy) throw new Error(`Unknown strategy: ${strategyName}`)
  return [...data].sort(strategy)
}

// 使用
sortData(users, 'alpha')       // 按名字排序
sortData(products, 'date')     // 按日期排序
sortData(scores, 'desc')       // 降序
```

### 7.1 验证策略

```ts
type Validator = (value: string) => string | null

const validators: Validator[] = [
  (v) => v.length < 3 ? '至少 3 个字符' : null,
  (v) => !v.includes('@') ? '包含 @ 符号' : null,
  (v) => v.length > 50 ? '最多 50 个字符' : null,
]

function validate(input: string): string[] {
  return validators
    .map(v => v(input))
    .filter(Boolean) as string[]
}
```

---

## 8. 代理模式

### 8.1 基础 Proxy

```ts
// 数据访问代理
const dataProxy = new Proxy({}, {
  get(target, key) {
    console.log(`读取属性: ${String(key)}`)
    return target[key as keyof typeof target]
  },
  set(target, key, value) {
    console.log(`设置属性: ${String(key)} = ${value}`)
    target[key as keyof typeof target] = value
    return true
  }
})

dataProxy.name = 'Alice'  // 控制台: 设置属性: name = Alice
console.log(dataProxy.name) // 控制台: 读取属性: name → Alice
```

### 8.2 表单验证代理

```ts
function createValidatedProxy(obj: Record<string, any>, rules: Record<string, (v: any) => string | null>) {
  return new Proxy(obj, {
    set(target, key, value) {
      const rule = rules[key as string]
      if (rule) {
        const error = rule(value)
        if (error) {
          console.warn(`验证失败: ${error}`)
          return false
        }
      }
      target[key as keyof typeof target] = value
      return true
    }
  })
}

const user = createValidatedProxy(
  { name: '', email: '' },
  {
    name: (v) => v.length < 2 ? '名字至少 2 个字符' : null,
    email: (v) => !v.includes('@') ? '邮箱格式不正确' : null,
  }
)

user.name = 'A'  // 警告: 名字至少 2 个字符
user.name = 'Alice'  // ✅ 通过
```

### 8.3 虚拟列表代理（惰性加载）

```ts
function createVirtualList(items: any[], pageSize: number) {
  let currentPage = 0
  const totalPages = Math.ceil(items.length / pageSize)

  return new Proxy(
    { currentItems: items.slice(0, pageSize) },
    {
      get(target, key) {
        if (key === 'next') {
          currentPage = Math.min(currentPage + 1, totalPages - 1)
          target.currentItems = items.slice(
            currentPage * pageSize,
            (currentPage + 1) * pageSize
          )
          return target.currentItems
        }
        if (key === 'prev') {
          currentPage = Math.max(currentPage - 1, 0)
          target.currentItems = items.slice(
            currentPage * pageSize,
            (currentPage + 1) * pageSize
          )
          return target.currentItems
        }
        return Reflect.get(target, key)
      }
    }
  )
}
```

---

## 9. 装饰器模式

### 9.1 函数装饰器

```ts
// 日志装饰器
function withLogging(fn: Function) {
  return function (...args: any[]) {
    const start = performance.now()
    console.log(`调用: ${fn.name}(${args.map(a => JSON.stringify(a)).join(', ')})`)
    const result = fn.apply(this, args)
    console.log(`结果: ${result}, 耗时: ${(performance.now() - start).toFixed(2)}ms`)
    return result
  }
}

// 缓存装饰器
function withCache(fn: Function) {
  const cache = new Map<string, any>()
  return function (...args: any[]) {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      console.log(`缓存命中: ${key}`)
      return cache.get(key)
    }
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
}

// 组合装饰器
function expensiveCalculation(n: number): number {
  let sum = 0
  for (let i = 0; i < n * 1000000; i++) sum += i
  return sum
}

const loggedCached = withLogging(withCache(expensiveCalculation))
loggedCached(100)  // 首次：计算 + 缓存
loggedCached(100)  // 第二次：缓存命中
```

### 9.2 React 组件装饰器

```tsx
// 包装组件添加样式
function withPadding(WrappedComponent, padding = '16px') {
  return function WithPadding(props) {
    return (
      <div style={{ padding }}>
        <WrappedComponent {...props} />
      </div>
    )
  }
}

// 包装组件添加 loading 状态
function withLoading(WrappedComponent) {
  return function WithLoading(props) {
    const { data, loading, error } = useApi(props.url)
    if (loading) return <Spinner />
    if (error) return <ErrorMessage error={error} />
    return <WrappedComponent {...props} data={data} />
  }
}

// 叠加使用
const UserProfile = withLoading(withPadding(UserProfileRaw, '24px'))
```

---

## 10. 单例模式

```ts
// 简易单例
class EventBus {
  private static instance: EventBus
  private handlers: Map<string, Function[]> = new Map()

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  on(event: string, handler: Function) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler)
    return () => this.off(event, handler)
  }

  emit(event: string, ...args: any[]) {
    this.handlers.get(event)?.forEach(h => h(...args))
  }

  off(event: string, handler: Function) {
    this.handlers.get(event)?.splice(
      this.handlers.get(event)!.indexOf(handler), 1
    )
  }
}

// 使用
const bus = EventBus.getInstance()
bus.on('event', handler)
```

---

## 11. 适配器模式

```ts
// 统一不同数据源的接口
interface DataAdapter {
  getData(): Promise<any[]>
}

// API 适配器
class ApiAdapter implements DataAdapter {
  constructor(private url: string) {}

  async getData(): Promise<any[]> {
    const res = await fetch(this.url)
    return res.json()
  }
}

// Mock 适配器（开发环境）
class MockAdapter implements DataAdapter {
  private data: any[]

  constructor(data: any[]) {
    this.data = data
  }

  async getData(): Promise<any[]> {
    return new Promise(resolve => {
      setTimeout(() => resolve(this.data), 300)
    })
  }
}

// 使用
const adapter: DataAdapter = import.meta.env.DEV
  ? new MockAdapter(mockData)
  : new ApiAdapter('/api/users')

const users = await adapter.getData()
```

---

## 12. 中介者模式

> 用中介者对象封装一组对象的通信，避免对象间直接引用。

```ts
class ChatMediator {
  private users: Map<string, User> = new Map()

  addUser(user: User) {
    this.users.set(user.name, user)
    user.setMediator(this)
  }

  sendMessage(sender: string, message: string) {
    this.users.forEach((user, name) => {
      if (name !== sender) {
        user.receive(message, sender)
      }
    })
  }
}

class User {
  private mediator?: ChatMediator
  constructor(public name: string) {}

  setMediator(mediator: ChatMediator) {
    this.mediator = mediator
  }

  send(message: string) {
    this.mediator?.sendMessage(this.name, message)
  }

  receive(message: string, from: string) {
    console.log(`${this.name} 收到来自 ${from}: ${message}`)
  }
}

// 使用
const chat = new ChatMediator()
const alice = new User('Alice')
const bob = new User('Bob')
chat.addUser(alice)
chat.addUser(bob)
alice.send('你好 Bob!')  // Bob 收到: 你好 Bob!
```

---

## 13. 前端模式选型决策树

```
需要复用逻辑？
  ├── 组件状态/副作用 → Custom Hook / Composable
  ├── 横切关注点（日志、权限） → HOC（旧代码）或 Hook（新代码）
  └── 跨组件通信 → Context / 状态管理库

需要动态创建组件？
  ├── 同类型不同样式 → Props 配置 + 工厂函数
  ├── 运行时选择行为 → 策略模式
  └── 数据驱动渲染 → 模板/条件渲染

需要优化性能？
  ├── 避免不必要的渲染 → memo / React.memo / Object.is
  ├── 节流/防抖 → useDebounce / useThrottle Hook
  └── 大数据列表 → 虚拟滚动（Window Virtualization）

需要表单？
  ├── 简单表单 → 受控组件 + 本地状态
  ├── 复杂表单 → 表单库（React Hook Form / VeeValidate）
  └── 动态表单 → 模式配置 + 工厂渲染

需要动画？
  ├── 简单过渡 → CSS transition / Vue Transition
  ├── 交互动画 → Motion / GSAP
  └── 复杂编排 → GSAP Timeline
```

---

## 14. 最佳实践

### 14.1 Hook 设计原则

```ts
// ✅ 单一职责：一个 Hook 解决一个问题
function useDebounce(value, delay) { ... }
function useLocalStorage(key, initial) { ... }

// ❌ 不要：一个 Hook 做所有事
function useFormAndValidationAndAPIAndAnalytics(...) { ... }

// ✅ 组合使用
function useSearch() {
  const [keyword, setKeyword] = useState('')
  const debounced = useDebounce(keyword, 300)
  const data = useFetch(`/api/search?q=${debounced}`)
  return { keyword, setKeyword, data }
}

// ✅ Hook 返回值使用对象解构
function useCounter(initial = 0) {
  const [count, setCount] = useState(initial)
  const increment = () => setCount(c => c + 1)
  const decrement = () => setCount(c => c - 1)
  const reset = () => setCount(initial)
  return { count, increment, decrement, reset }  // 对象，不是数组
}
```

### 14.2 模式选择原则

```
1. 优先使用框架原生能力
   - React: Hooks > HOC > Render Props
   - Vue: Composables > Mixins（已废弃）

2. 避免过度抽象
   - 只有当逻辑需要复用 2+ 次时才抽取
   - 保持代码可读性 > 保持代码复用性

3. 类型安全
   - TypeScript 项目中，HOC/工厂函数要保留类型推断
   - 使用泛型参数化

4. 组合优于继承
   - Hook 组合 > 深层嵌套 HOC
   - Compound Component > Props 地狱
```

---

## 参考

- [React 官方文档 - Hooks](https://react.dev/reference/react/hooks)
- [Vue 官方文档 - Composables](https://vuejs.org/guide/reusability/composables)
- [React Patterns](https://reactpatterns.com/)
- [Pattern.js - 设计模式集合](https://www.patterns.dev/)
- [Refactoring UI - 组件模式](https://refactoringui.com/)
