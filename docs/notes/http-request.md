# HTTP 请求与数据层

> 📌 本文件记录前端 HTTP 请求核心知识：fetch API、Axios、拦截器、请求取消、并发控制、React Query/SWR 数据层方案、错误处理与最佳实践。

---

## 1. 基本概念

### 前端 HTTP 请求的演进

```
XMLHttpRequest (XHR)     →  早期方案，回调地狱
  ↓
fetch API                →  原生，Promise，但 API 简陋
  ↓
Axios                    →  拦截器、取消、超时、转换器，最流行
  ↓
React Query / SWR        →  服务端状态管理（缓存、重试、乐观更新）
  ↓
Server Components / RPC  →  框架级数据获取（Next.js Server Components）
```

### 请求生命周期

```
组件触发请求
  ↓
请求拦截器（添加 token、修改 header）
  ↓
发送 HTTP 请求
  ↓
─────────────────────  网络  ─────────────────────
  ↓
收到响应
  ↓
响应拦截器（统一错误处理、数据转换）
  ↓
组件拿到数据 → 渲染 UI
  ↓
缓存 / 失效 / 重新验证
```

---

## 2. XMLHttpRequest（了解原理）

```js
// 基础 XHR 请求
const xhr = new XMLHttpRequest()
xhr.open('GET', '/api/users', true)
xhr.setRequestHeader('Authorization', 'Bearer token')

xhr.onreadystatechange = function () {
  if (xhr.readyState === 4) {  // 请求完成
    if (xhr.status >= 200 && xhr.status < 300) {
      const data = JSON.parse(xhr.responseText)
      console.log(data)
    } else {
      console.error('请求失败:', xhr.status)
    }
  }
}

xhr.onerror = function () {
  console.error('网络错误')
}

xhr.send()

// 取消请求
xhr.abort()
```

```js
// Promise 封装 XHR
function xhrRequest(method, url, data = null) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    xhr.setRequestHeader('Content-Type', 'application/json')

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(`HTTP ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('网络错误'))
    xhr.send(data ? JSON.stringify(data) : null)
  })
}
```

> XHR 的缺点：回调风格、不支持 Promise、API 设计粗糙。现代项目基本不用，但面试常考原理。

---

## 3. fetch API（浏览器原生）

### 基本用法

```js
// GET
const res = await fetch('/api/users')
const data = await res.json()

// POST
const res = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John', age: 25 })
})
const data = await res.json()

// 上传文件
const formData = new FormData()
formData.append('file', fileInput.files[0])
const res = await fetch('/api/upload', {
  method: 'POST',
  body: formData  // 不要手动设 Content-Type，浏览器自动加 boundary
})
```

### Response 对象

```js
const res = await fetch('/api/users')

res.ok          // true if status 200-299
res.status      // 200
res.statusText  // 'OK'
res.headers.get('Content-Type')

// 读取 body（只能读一次！）
await res.json()    // 解析为 JSON
await res.text()    // 解析为文本
await res.blob()    // 解析为 Blob（二进制）
await res.formData() // 解析为 FormData
await res.arrayBuffer() // 解析为 ArrayBuffer
```

### fetch 的坑

```js
// ❌ 坑 1：fetch 不会对 4xx/5xx 抛错！
const res = await fetch('/api/not-found')
// res.ok === false, res.status === 404
// 但不会 throw，代码继续执行！
// 只有网络错误才会 reject

// ✅ 必须手动检查
const res = await fetch('/api/users')
if (!res.ok) throw new Error(`HTTP ${res.status}`)
const data = await res.json()


// ❌ 坑 2：body 只能读取一次
const res = await fetch('/api/users')
const data1 = await res.json()  // ✅
const data2 = await res.json()  // ❌ TypeError: Already read

// ✅ 需要多次读取 → clone
const res = await fetch('/api/users')
const clone = res.clone()
const data1 = await res.json()
const data2 = await clone.json()


// ❌ 坑 3：默认不带 cookie
fetch('/api/users')  // 不带 cookie！

// ✅ 需要配置 credentials
fetch('/api/users', { credentials: 'same-origin' })  // 同源带 cookie
fetch('/api/users', { credentials: 'include' })       // 跨域带 cookie


// ❌ 坑 4：没有超时机制
// fetch 不会超时，请求可以挂起很久

// ✅ 用 AbortController 实现超时
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 5000)
try {
  const res = await fetch('/api/users', { signal: controller.signal })
} finally {
  clearTimeout(timeout)
}
```

### 封装 fetch

```ts
// utils/request.ts — 基于 fetch 的封装
class HttpError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message)
  }
}

interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
  params?: Record<string, any>
  timeout?: number
  signal?: AbortSignal
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, params, timeout = 10000, signal } = options

  // 拼接查询参数
  const fullUrl = params
    ? `${url}?${new URLSearchParams(params).toString()}`
    : url

  // 合并 headers
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  }

  // 添加 token
  const token = localStorage.getItem('token')
  if (token) finalHeaders['Authorization'] = `Bearer ${token}`

  // 超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  // 合并外部 signal
  if (signal) signal.addEventListener('abort', () => controller.abort())

  try {
    const res = await fetch(fullUrl, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal: controller.signal
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => null)
      throw new HttpError(res.status, errorData?.message || res.statusText, errorData)
    }

    return res.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

// 使用
const users = await request<User[]>('/api/users')
const user = await request<User>('/api/users/1', { params: { fields: 'name,email' } })
```

---

## 4. Axios（最流行的 HTTP 库）

### 安装与基本用法

```bash
npm install axios
```

```ts
import axios from 'axios'

// GET
const { data } = await axios.get('/api/users', { params: { page: 1 } })

// POST
const { data } = await axios.post('/api/users', { name: 'John' })

// PUT
const { data } = await axios.put('/api/users/1', { name: 'John' })

// PATCH
const { data } = await axios.patch('/api/users/1', { name: 'John' })

// DELETE
const { data } = await axios.delete('/api/users/1')

// 通用配置
const { data } = await axios({
  url: '/api/users',
  method: 'GET',
  params: { page: 1 },
  headers: { 'X-Custom': 'value' },
  timeout: 5000
})
```

### 创建实例

```ts
// 不同 baseURL 的实例
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,  // '/api'
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true  // 跨域带 cookie
})

// 多个 baseURL
const apiHttp = axios.create({ baseURL: '/api', timeout: 10000 })
const cdnHttp = axios.create({ baseURL: 'https://cdn.example.com', timeout: 5000 })
```

### 响应结构

```ts
interface AxiosResponse<T> {
  data: T           // 响应体（自动 JSON.parse）
  status: number    // HTTP 状态码
  statusText: string
  headers: Record<string, string>
  config: AxiosRequestConfig
  request: XMLHttpRequest
}

// 错误结构
interface AxiosError {
  response?: AxiosResponse   // 有 response 说明服务器返回了（4xx/5xx）
  request?: XMLHttpRequest   // 有 request 无 response 说明请求发出但没收到
  config: AxiosRequestConfig
  message: string
  code?: string              // 'ERR_NETWORK', 'ECONNABORTED', 'ERR_CANCELED'
}
```

### 拦截器（Axios 最强大的功能）

```ts
// 请求拦截器
http.interceptors.request.use(
  (config) => {
    // 添加 token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 添加时间戳防缓存
    if (config.method === 'GET') {
      config.params = { ...config.params, _t: Date.now() }
    }

    // loading 控制
    if (config.showLoading !== false) {
      startLoading()
    }

    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
http.interceptors.response.use(
  (response) => {
    stopLoading()

    // 直接返回 data，省去 .data
    return response.data

    // 或处理后端统一格式 { code, data, message }
    // const { code, data, message } = response.data
    // if (code === 0) return data
    // return Promise.reject(new Error(message))
  },
  (error) => {
    stopLoading()

    // 统一错误处理
    if (!error.response) {
      // 网络错误 / 超时
      if (error.code === 'ECONNABORTED') {
        message.error('请求超时')
      } else {
        message.error('网络异常')
      }
      return Promise.reject(error)
    }

    const { status, data } = error.response

    switch (status) {
      case 401:
        // token 过期 → 刷新 token 或跳登录
        handleUnauthorized()
        break
      case 403:
        message.error('无权限访问')
        break
      case 404:
        message.error('资源不存在')
        break
      case 500:
        message.error('服务器错误')
        break
      default:
        message.error(data?.message || `请求失败 (${status})`)
    }

    return Promise.reject(error)
  }
)
```

### 拦截器顺序

```
请求拦截器：后添加的先执行（LIFO / 栈）
响应拦截器：先添加的先执行（FIFO / 队列）

请求方向：
  请求发出
    ↑
  请求拦截器 2（后添加，先执行）
    ↑
  请求拦截器 1（先添加，后执行）
    ↑
  axios.request()

响应方向：
  收到响应
    ↓
  响应拦截器 1（先添加，先执行）
    ↓
  响应拦截器 2（后添加，后执行）
    ↓
  .then() / await
```

### 移除拦截器

```ts
// 添加时返回 id
const id = http.interceptors.request.use(config => { ... })

// 移除
http.interceptors.request.eject(id)

// 清空所有
http.interceptors.request.clear()
http.interceptors.response.clear()
```

### 请求取消

```ts
// Axios 1.x — AbortController（推荐）
const controller = new AbortController()

axios.get('/api/users', { signal: controller.signal })
  .then(data => console.log(data))
  .catch(err => {
    if (axios.isCancel(err)) {
      console.log('请求被取消')
    }
  })

// 取消
controller.abort()


// 批量取消
const controllers: AbortController[] = []

function fetchWithCancel(url: string) {
  const controller = new AbortController()
  controllers.push(controller)
  return axios.get(url, { signal: controller.signal })
}

// 取消所有
controllers.forEach(c => c.abort())
```

### 请求超时与重试

```ts
// 基础超时
axios.get('/api/users', { timeout: 5000 })

// 手动重试
async function requestWithRetry(config, maxRetries = 3) {
  let lastError
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await axios(config)
    } catch (error) {
      lastError = error
      // 只重试网络错误和 5xx，不重试 4xx
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error
      }
      // 指数退避
      await new Promise(r => setTimeout(r, 1000 * 2 ** i))
    }
  }
  throw lastError
}

// axios-retry 插件
import axiosRetry from 'axios-retry'
axiosRetry(http, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,  // 1s, 2s, 3s
  retryCondition: (error) => {
    // 只重试网络错误和 5xx
    return !error.response || error.response.status >= 500
  }
})
```

### 并发请求

```ts
// Promise.all — 全部成功才成功
const [users, posts, comments] = await Promise.all([
  axios.get('/api/users'),
  axios.get('/api/posts'),
  axios.get('/api/comments')
])

// Promise.allSettled — 全部完成（不管成功失败）
const results = await Promise.allSettled([
  axios.get('/api/users'),
  axios.get('/api/posts')
])
results.forEach(result => {
  if (result.status === 'fulfilled') {
    console.log('成功:', result.value)
  } else {
    console.log('失败:', result.reason)
  }
})

// Promise.race — 最快的那个
const fastest = await Promise.race([
  axios.get('/api/primary'),
  axios.get('/api/backup')
])

// Promise.any — 最先成功的那个（忽略失败的）
const firstSuccess = await Promise.any([
  axios.get('/api/primary'),
  axios.get('/api/backup')
])
```

### 文件上传/下载

```ts
// 上传文件 + 进度
async function uploadFile(file: File, onProgress?: (percent: number) => void) {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await http.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
  })
  return data
}

// 下载文件 + 进度
async function downloadFile(url: string, filename: string) {
  const res = await http.get(url, {
    responseType: 'blob',
    onDownloadProgress: (e) => {
      if (e.total) {
        console.log(`下载进度: ${Math.round((e.loaded / e.total) * 100)}%`)
      }
    }
  })

  // 创建下载链接
  const blob = new Blob([res.data])
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
```

### TypeScript 封装

```ts
// 封装带类型的请求方法
interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

const http = axios.create({ baseURL: '/api' })

// 泛型请求方法
function request<T>(config: AxiosRequestConfig): Promise<T> {
  return http.request<ApiResponse<T>>(config).then(res => res.data.data)
}

// 使用 — 有完整类型推断
const users = await request<User[]>({ url: '/users', method: 'GET' })
//    ↑ User[] 类型
```

---

## 5. Token 无感刷新

```ts
// 场景：access_token 过期（401），用 refresh_token 自动刷新后重试

let isRefreshing = false
let pendingRequests: Array<() => void> = []

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error

    if (response?.status === 401 && !config._isRetry) {
      if (isRefreshing) {
        // 正在刷新 token → 把请求加入队列等待
        return new Promise((resolve) => {
          pendingRequests.push(() => resolve(http(config)))
        })
      }

      config._isRetry = true
      isRefreshing = true

      try {
        // 刷新 token
        const { data } = await axios.post('/api/auth/refresh', {
          refreshToken: localStorage.getItem('refreshToken')
        })
        localStorage.setItem('token', data.accessToken)

        // 执行队列中的请求
        pendingRequests.forEach(cb => cb())
        pendingRequests = []

        // 重试原请求
        return http(config)
      } catch (refreshError) {
        // 刷新失败 → 跳登录
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
```

---

## 6. 并发控制

```ts
// 限制并发请求数（如批量上传 100 个文件，但只同时处理 5 个）
async function concurrentLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = []
  const executing: Promise<void>[] = []

  for (const task of tasks) {
    const p = task().then(result => {
      results.push(result)
    })
    executing.push(p)

    if (executing.length >= limit) {
      await Promise.race(executing)
      // 移除已完成的
      executing.splice(executing.findIndex(e => e === p), 1)
    }
  }

  await Promise.all(executing)
  return results
}

// 使用
const urls = ['/api/1', '/api/2', '/api/3', /* ... 100 个 */]
const tasks = urls.map(url => () => axios.get(url))
const results = await concurrentLimit(tasks, 5)  // 最多同时 5 个
```

```ts
// 更简洁的 p-limit 风格
import pLimit from 'p-limit'

const limit = pLimit(5)  // 并发上限 5
const results = await Promise.all(
  urls.map(url => limit(() => axios.get(url)))
)
```

---

## 7. 请求去重与缓存

### 简单请求去重

```ts
// 相同请求只发一次，多个调用共享结果
const pending = new Map<string, Promise<any>>()

function dedupRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (pending.has(key)) {
    return pending.get(key)!
  }
  const promise = fn().finally(() => pending.delete(key))
  pending.set(key, promise)
  return promise
}

// 使用
const users1 = await dedupRequest('users', () => http.get('/api/users'))
const users2 = await dedupRequest('users', () => http.get('/api/users'))
// 只发一次请求，users1 === users2
```

### 简单内存缓存

```ts
const cache = new Map<string, { data: any, expire: number }>()

async function cachedRequest<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 60000  // 缓存 1 分钟
): Promise<T> {
  const cached = cache.get(key)
  if (cached && cached.expire > Date.now()) {
    return cached.data as T
  }
  const data = await fn()
  cache.set(key, { data, expire: Date.now() + ttl })
  return data
}
```

---

## 8. React Query（服务端状态管理）

React Query 不是 HTTP 客户端，而是**服务端状态管理库**——自动处理缓存、loading、error、重试、失效、乐观更新。

### 安装

```bash
npm install @tanstack/react-query
```

### 基本用法

```tsx
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query'

// 1. 创建 client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,      // 数据新鲜期 1 分钟（不重新请求）
      gcTime: 5 * 60_000,     // 缓存保留 5 分钟
      retry: 3,               // 失败重试 3 次
      refetchOnWindowFocus: true,  // 窗口聚焦时重新请求
    }
  }
})

// 2. Provider
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Users />
    </QueryClientProvider>
  )
}

// 3. 查询
function Users() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  })

  if (isLoading) return <Loading />
  if (error) return <Error message={error.message} />

  return (
    <div>
      {isFetching && <RefreshIndicator />}
      {data.map(u => <UserCard key={u.id} user={u} />)}
      <button onClick={() => refetch()}>刷新</button>
    </div>
  )
}
```

### 带参数查询

```tsx
// 路径参数
function UserDetail({ id }: { id: number }) {
  const { data } = useQuery({
    queryKey: ['users', id],      // id 变了 → 自动重新请求
    queryFn: () => api.getUser(id),
  })
  return <div>{data?.name}</div>
}

// 查询参数
function UserList() {
  const [page, setPage] = useState(1)
  const { data } = useQuery({
    queryKey: ['users', 'list', page],
    queryFn: () => api.getUsers({ page }),
    placeholderData: keepPreviousData,  // 翻页时保持旧数据（不闪烁）
  })
  return (
    <>
      {data.items.map(u => <div key={u.id}>{u.name}</div>)}
      <button onClick={() => setPage(p => p - 1)}>上一页</button>
      <button onClick={() => setPage(p => p + 1)}>下一页</button>
    </>
  )
}
```

### Mutation（增删改）

```tsx
function AddUser() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (newUser: { name: string }) => api.createUser(newUser),
    onSuccess: () => {
      // 操作成功 → 刷新用户列表
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      console.error('添加失败:', error)
    },
  })

  return (
    <button
      onClick={() => mutation.mutate({ name: 'John' })}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? '添加中...' : '添加用户'}
    </button>
  )
}
```

### 乐观更新

```tsx
const mutation = useMutation({
  mutationFn: api.updateUser,
  // 请求发出前 → 先更新 UI
  onMutate: async (newUser) => {
    // 取消正在进行的查询，避免覆盖乐观更新
    await queryClient.cancelQueries({ queryKey: ['users'] })

    // 保存之前的数据（用于回滚）
    const previousUsers = queryClient.getQueryData(['users'])

    // 乐观更新缓存
    queryClient.setQueryData<User[]>(['users'], (old) =>
      old?.map(u => u.id === newUser.id ? { ...u, ...newUser } : u)
    )

    return { previousUsers }  // 传给 onError
  },
  // 失败 → 回滚
  onError: (err, newUser, context) => {
    queryClient.setQueryData(['users'], context?.previousUsers)
  },
  // 完成（不管成功失败）→ 重新验证
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
  },
})
```

### 查询失效策略

```ts
// 1. 手动失效
queryClient.invalidateQueries({ queryKey: ['users'] })

// 2. 精确失效
queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
// ↑ 会失效 ['users', 'list'], ['users', 'list', 1], ['users', 'list', 2] 等

// 3. 按类型失效
queryClient.invalidateQueries({ queryKey: ['users'] })
queryClient.removeQueries({ queryKey: ['users'] })  // 直接移除缓存

// 4. 自动失效（staleTime 到期）
staleTime: 60_000  // 1 分钟后标记为 stale，下次使用时重新请求
```

### 预加载

```tsx
// 鼠标 hover 时预加载详情数据
function UserLink({ user }) {
  const queryClient = useQueryClient()

  return (
    <Link
      to={`/users/${user.id}`}
      onMouseEnter={() => {
        // 预加载，用户点击时数据已就绪
        queryClient.prefetchQuery({
          queryKey: ['users', user.id],
          queryFn: () => api.getUser(user.id),
        })
      }}
    >
      {user.name}
    </Link>
  )
}
```

### 无限滚动

```tsx
function InfiniteUsers() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['users', 'infinite'],
    queryFn: ({ pageParam = 1 }) => api.getUsers({ page: pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 1,
  })

  return (
    <>
      {data.pages.map(page =>
        page.items.map(u => <UserCard key={u.id} user={u} />)
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '加载中...' : '加载更多'}
        </button>
      )}
    </>
  )
}
```

---

## 9. SWR（Vercel 的数据请求库）

SWR (Stale-While-Revalidate) 是 React Query 的轻量替代品，API 更简洁。

```tsx
import useSWR, { useSWRConfig } from 'swr'

// 基本用法
function Users() {
  const { data, error, isLoading, mutate } = useSWR('/api/users', fetcher)

  if (isLoading) return <Loading />
  if (error) return <Error />

  return (
    <div>
      {data.map(u => <div key={u.id}>{u.name}</div>)}
      <button onClick={() => mutate()}>刷新</button>
    </div>
  )
}

// fetcher 函数
const fetcher = (url: string) => fetch(url).then(res => res.json())
// 或用 axios
const fetcher = (url: string) => axios.get(url).then(res => res.data)
```

```tsx
// 带参数
function UserDetail({ id }) {
  const { data } = useSWR(`/api/users/${id}`, fetcher)
  return <div>{data?.name}</div>
}

// 条件请求（id 存在才请求）
const { data } = useSWR(id ? `/api/users/${id}` : null, fetcher)

// 依赖请求（先获取 user，再获取 user 的 posts）
const { data: user } = useSWR('/api/user', fetcher)
const { data: posts } = useSWR(user ? `/api/users/${user.id}/posts` : null, fetcher)

// 全局配置
<SWRConfig value={{
  fetcher,
  refreshInterval: 30000,  // 每 30 秒自动刷新
  revalidateOnFocus: true,  // 窗口聚焦时刷新
}}>
  <App />
</SWRConfig>
```

### SWR vs React Query

| | React Query | SWR |
|---|---|---|
| 体积 | ~50KB | ~5KB |
| API 风格 | useQuery({ queryKey, queryFn }) | useSWR(key, fetcher) |
| DevTools | 完整 | 基础 |
| 无限滚动 | 内置 useInfiniteQuery | 需 useSWRInfinite |
| 乐观更新 | 内置 onMutate | 需手动 |
| 缓存控制 | 丰富（staleTime/gcTime） | 简单 |
| 适合 | 中大型项目 | 中小型项目 |

---

## 10. Vue 中的数据请求

### VueUse useFetch

```ts
import { useFetch } from '@vueuse/core'

// 基本用法
const { data, error, isLoading, isFinished, abort } = useFetch('/api/users').json()

// 带配置
const { data } = useFetch('/api/users', {
  immediate: false,    // 不自动请求，手动调用 execute
  refetch: true,       // URL 变化时重新请求
  timeout: 5000,
}).json()

// 手动触发
const { execute } = useFetch('/api/users', { immediate: false }).json()
async function loadData() {
  await execute()
}
```

### 自定义 composable

```ts
// composables/useRequest.ts
import { ref, watch } from 'vue'

export function useRequest<T>(
  fn: () => Promise<T>,
  options: { immediate?: boolean } = {}
) {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(false)

  async function execute() {
    loading.value = true
    error.value = null
    try {
      data.value = await fn()
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  if (options.immediate !== false) {
    execute()
  }

  return { data, error, loading, execute, refresh: execute }
}

// 使用
const { data: users, loading, error, refresh } = useRequest(
  () => http.get('/api/users')
)
```

### VueUse useSWR

```ts
// Vue 也有 SWR 的 Vue 版本
import { useSWR } from 'swr-vue'

const { data, error, isLoading } = useSWR('/api/users', fetcher)
```

---

## 11. 错误处理策略

### 错误分类

```
请求错误
├── 网络错误 — 断网、DNS 解析失败、CORS 被拒
│   → 提示"网络异常，请检查网络连接"
│   → 可自动重试
│
├── 超时错误 — 请求发出但超时
│   → 提示"请求超时，请稍后重试"
│   → 可自动重试
│
├── 服务器错误 (5xx) — 服务器内部错误
│   → 提示"服务器异常，请稍后重试"
│   → 可自动重试（5xx 是临时问题）
│
├── 客户端错误 (4xx)
│   ├── 401 未认证 → 跳登录页 / 刷新 token
│   ├── 403 无权限 → 提示"无权限"
│   ├── 404 不存在 → 提示"资源不存在"
│   ├── 429 限流   → 提示"操作过于频繁"
│   └── 422 参数错误 → 显示具体字段错误
│   → 不重试（4xx 是永久问题）
│
└── 业务错误 — HTTP 200 但 code != 0
    → 显示后端返回的 message
    → 不重试
```

### 统一错误处理

```ts
// Axios 响应拦截器统一处理
http.interceptors.response.use(
  (response) => {
    // 业务错误 — HTTP 200 但 code != 0
    const { code, message: msg } = response.data
    if (code !== 0) {
      // 不弹 toast，让组件自己处理
      return Promise.reject(new BusinessError(code, msg))
    }
    return response.data.data
  },
  (error) => {
    if (!error.response) {
      // 网络错误 / 超时
      const message = error.code === 'ECONNABORTED'
        ? '请求超时，请稍后重试'
        : '网络异常，请检查网络连接'
      showToast(message)
      return Promise.reject(new NetworkError(message))
    }

    const { status, data } = error.response
    const message = data?.message || `请求失败 (${status})`

    if (status === 401) {
      // 跳登录（不在拦截器里跳，发事件让外层处理）
      emitter.emit('unauthorized')
      return Promise.reject(new AuthError(message))
    }

    showToast(message)
    return Promise.reject(new HttpError(status, message, data))
  }
)
```

### 组件中处理

```ts
// Vue
try {
  const data = await http.get('/api/users')
} catch (error) {
  if (error instanceof BusinessError) {
    // 业务错误 → 显示在表单上
    formError.value = error.message
  } else if (error instanceof AuthError) {
    // 认证错误 → 拦截器已处理，这里不重复处理
  } else {
    // 其他错误 → 拦截器已 toast，这里不需要再处理
  }
}

// React Query — 错误在 hook 返回值中
const { data, error, isError } = useQuery({
  queryKey: ['users'],
  queryFn: () => api.getUsers(),
  retry: (failureCount, error) => {
    // 4xx 不重试
    if (error instanceof HttpError && error.status < 500) return false
    return failureCount < 3
  }
})

if (isError) {
  // error 已经是类型化的
  return <ErrorDisplay error={error} />
}
```

---

## 12. 全部方案对比

| | fetch | Axios | React Query | SWR | VueUse |
|---|---|---|---|---|---|
| **类型** | HTTP 客户端 | HTTP 客户端 | 数据层 | 数据层 | Vue 工具集 |
| **框架** | 原生 | 跨框架 | React | React | Vue |
| **体积** | 0 | ~30KB | ~50KB | ~5KB | 按需 |
| **拦截器** | 无 | ✅ | 无 | 无 | 无 |
| **取消请求** | AbortController | AbortController | 内置 | 内置 | 内置 |
| **超时** | 手动 | 内置 | 内置 | 手动 | 内置 |
| **重试** | 手动 | 手动/插件 | 内置 | 内置 | 手动 |
| **缓存** | 无 | 无 | ✅ 完整 | ✅ | 无 |
| **loading/error** | 手动 | 手动 | 自动 | 自动 | 自动 |
| **乐观更新** | 无 | 无 | 内置 | 手动 | 无 |
| **DevTools** | 无 | 无 | ✅ | 基础 | 无 |
| **适合** | 简单请求 | 通用 HTTP | React 数据层 | React 轻量 | Vue 数据请求 |

---

## 13. 最佳实践

### 分层架构

```
┌─────────────────────────────────┐
│  组件层 (Component)              │  ← 调用 API 函数
│  useQuery / useRequest           │
├─────────────────────────────────┤
│  API 层 (api/)                  │  ← 定义接口，类型安全
│  api/user.ts: getUser(id)       │
├─────────────────────────────────┤
│  HTTP 层 (utils/http)           │  ← Axios 实例 + 拦截器
│  http.get / http.post           │
├─────────────────────────────────┤
│  Axios / fetch                  │  ← 底层
└─────────────────────────────────┘
```

```ts
// api/user.ts — API 层
import { http } from '@/utils/http'
import type { User } from '@/types/user'

export const userApi = {
  getList: (params?: { page?: number }) =>
    http.get<User[]>('/users', { params }),

  getById: (id: number) =>
    http.get<User>(`/users/${id}`),

  create: (data: Omit<User, 'id'>) =>
    http.post<User>('/users', data),

  update: (id: number, data: Partial<User>) =>
    http.patch<User>(`/users/${id}`, data),

  delete: (id: number) =>
    http.delete(`/users/${id}`),
}

// 组件中使用
const users = await userApi.getList({ page: 1 })
```

### 环境变量管理

```ts
// .env.development
VITE_API_BASE_URL=/api

// .env.production
VITE_API_BASE_URL=https://api.example.com

// http.ts
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
})
```

### 请求取消与路由离开

```ts
// Vue — 路由离开时取消请求
import { onBeforeRouteLeave } from 'vue-router'

const controller = new AbortController()

onBeforeRouteLeave(() => {
  controller.abort()  // 取消所有未完成的请求
})

// 发起请求时传入 signal
const data = await http.get('/api/users', { signal: controller.signal })
```

### 防抖搜索

```ts
// Vue
import { useDebounceFn } from '@vueuse/core'

const keyword = ref('')
const results = ref([])

const search = useDebounceFn(async () => {
  if (!keyword.value) return
  results.value = await http.get('/api/search', { params: { q: keyword.value } })
}, 300)

watch(keyword, search)
```

```tsx
// React — useDebounce + useQuery
function Search() {
  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebounce(keyword, 300)

  const { data } = useQuery({
    queryKey: ['search', debouncedKeyword],
    queryFn: () => api.search(debouncedKeyword),
    enabled: !!debouncedKeyword,  // 有值才请求
  })

  return <input value={keyword} onChange={e => setKeyword(e.target.value)} />
}
```

---

## 14. 常见踩坑

### GET 请求带 body

```ts
// ❌ GET 请求不应该有 body
axios.get('/api/users', { data: { page: 1 } })  // 大多数服务器忽略

// ✅ 用 params
axios.get('/api/users', { params: { page: 1 } })
// → /api/users?page=1
```

### Content-Type 与 body 不匹配

```ts
// ❌ JSON body 但 Content-Type 是 form
axios.post('/api/users', { name: 'John' }, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
})

// ✅ 匹配
axios.post('/api/users', { name: 'John' }, {
  headers: { 'Content-Type': 'application/json' }  // 默认就是 JSON
})

// ✅ FormData 不要手动设 Content-Type
const formData = new FormData()
formData.append('file', file)
axios.post('/api/upload', formData)  // 浏览器自动设 multipart/form-data; boundary=...
```

### 跨域问题 (CORS)

```
问题：前端 localhost:5173 → 后端 localhost:3000
      浏览器报 CORS 错误

原因：浏览器同源策略，跨域请求需要后端返回 CORS 头

解决 1：后端配置 CORS
  Access-Control-Allow-Origin: http://localhost:5173
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH
  Access-Control-Allow-Headers: Content-Type, Authorization
  Access-Control-Allow-Credentials: true  // 允许带 cookie

解决 2：开发环境代理（Vite）
  // vite.config.ts
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }

解决 3：Nginx 反向代理（生产）
  location /api/ {
    proxy_pass http://backend:3000/;
  }
```

### 拦截器中 return response.data 的坑

```ts
// 响应拦截器返回 response.data 后
http.interceptors.response.use(res => res.data)

// ❌ 类型不对了
const res = await http.get('/api/users')
// res 类型还是 AxiosResponse，但实际值是 data

// ✅ 需要类型声明
const data = await http.get<User[]>('/api/users')
//    ↑ 实际是 User[]，但 TS 认为是 AxiosResponse<User[]>
// 需要 as 转换或封装泛型方法
```

### React Query queryKey 顺序

```ts
// queryKey 是数组，顺序影响缓存
useQuery({ queryKey: ['users', 'list', { page: 1 }], ... })
useQuery({ queryKey: ['users', { page: 1 }, 'list'], ... })
// ↑ 两个不同的 key，不会共享缓存

// ✅ 保持一致的 key 结构
// ['users']                    → 所有用户
// ['users', 'detail', id]      → 用户详情
// ['users', 'list', page]      → 用户列表
```

---

## 参考

- [Axios 官方文档](https://axios-http.com/)
- [MDN - fetch API](https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API)
- [React Query 官方文档](https://tanstack.com/query/latest)
- [SWR 官方文档](https://swr.vercel.app/)
- [VueUse - useFetch](https://vueuse.org/core/usefetch/)
