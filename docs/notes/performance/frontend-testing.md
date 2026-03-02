# 前端测试笔记

> 📌 本文件记录前端测试体系：单元测试、组件测试、E2E 测试、Mock 技术、测试策略与最佳实践。

---

## 1. 测试金字塔

```
        ╱╲
       ╱  ╲        E2E 测试（少量）
      ╱ E2E╲       模拟真实用户操作，验证完整流程
     ╱──────╲      慢、贵、脆弱
    ╱        ╲
   ╱ 集成测试  ╲    集成测试（中量）
  ╱            ╲   组件交互、API 调用、路由
 ╱──────────────╲  中等速度
╱                ╲
╱   单元测试       ╲  单元测试（大量）
╱──────────────────╲ 函数、工具类、Hooks、纯逻辑
                    快、便宜、稳定
```

### 各层职责

| 层级 | 测试对象 | 工具 | 占比 | 速度 |
|------|----------|------|------|------|
| 单元测试 | 纯函数、工具类、Hooks | Vitest / Jest | 70% | 毫秒级 |
| 集成/组件测试 | 组件渲染、交互 | Testing Library | 20% | 秒级 |
| E2E 测试 | 完整用户流程 | Playwright / Cypress | 10% | 10s+ |

### 测试什么

```
✅ 该测的：
- 业务逻辑（纯函数、计算、转换）
- 边界条件（空值、极值、异常输入）
- 组件交互（点击、输入、状态变化）
- 关键用户流程（登录、下单、支付）
- 工具函数（格式化、校验、解析）

❌ 不该测的：
- 第三方库的内部实现
- 框架本身的行为（Vue/React 已有测试）
- 纯样式（除非设计系统需要）
- 实现细节（应该测行为而非实现）
```

---

## 2. Vitest（单元测试框架）

### 基础配置

```js
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',       // 或 'happy-dom'（更快）
    globals: true,              // 全局注入 describe/it/expect
    include: ['src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',           // 或 'istanbul'
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{js,ts,vue}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts'],
    },
    setupFiles: ['./src/test/setup.ts'],  // 全局 setup
  },
})

// src/test/setup.ts
import '@testing-library/jest-dom'  // 扩展 DOM 断言
```

### 基础 API

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// describe — 分组
describe('MathUtils', () => {
  // it / test — 测试用例
  it('should add two numbers', () => {
    expect(add(1, 2)).toBe(3)
  })

  // 常用断言
  it('basic assertions', () => {
    expect(1 + 1).toBe(2)              // 严格相等
    expect({ a: 1 }).toEqual({ a: 1 }) // 深度相等
    expect([1, 2, 3]).toContain(2)     // 包含
    expect('hello').toMatch(/ell/)      // 正则匹配
    expect(true).toBeTruthy()           // truthy
    expect(null).toBeFalsy()            // falsy
    expect(undefined).toBeUndefined()
    expect(null).toBeNull()
    expect(NaN).toBeNaN()
    expect(() => { throw new Error('fail') }).toThrow('fail')
    expect([1, 2, 3]).toHaveLength(3)
    expect({ name: 'Tom' }).toHaveProperty('name', 'Tom')
    expect(0.1 + 0.2).toBeCloseTo(0.3)  // 浮点数比较
  })

  // 异步测试
  it('should fetch data', async () => {
    const data = await fetchData()
    expect(data).toEqual({ id: 1 })
  })

  // Promise 写法
  it('promise resolves', () => {
    return expect(fetchData()).resolves.toEqual({ id: 1 })
  })

  // Promise 拒绝
  it('promise rejects', () => {
    return expect(fetchDataFail()).rejects.toThrow('error')
  })
})
```

### 钩子函数

```ts
describe('UserService', () => {
  let service: UserService

  // 每个 test 前执行
  beforeEach(() => {
    service = new UserService()
  })

  // 每个 test 后执行
  afterEach(() => {
    vi.restoreAllMocks()  // 恢复所有 mock
  })

  // 整个 describe 前执行一次
  beforeAll(() => {
    // 初始化数据库连接等
  })

  // 整个 describe 后执行一次
  afterAll(() => {
    // 关闭连接
  })

  it('should create user', () => {
    const user = service.create({ name: 'Tom' })
    expect(user.name).toBe('Tom')
  })
})
```

### 测试纯函数

```ts
// src/utils/format.ts
export function formatPrice(price: number, currency = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
  }).format(price)
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: number
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timer)
    timer = window.setTimeout(() => fn.apply(this, args), delay)
  }
}

// src/utils/__tests__/format.test.ts
import { formatPrice, debounce } from '../format'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('formatPrice', () => {
  it('formats CNY by default', () => {
    expect(formatPrice(100)).toBe('¥100.00')
  })

  it('formats USD', () => {
    expect(formatPrice(99.9, 'USD')).toBe('US$99.90')
  })

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('¥0.00')
  })

  it('handles negative', () => {
    expect(formatPrice(-50)).toBe('-¥50.00')
  })

  it('handles large numbers', () => {
    expect(formatPrice(1234567.89)).toBe('¥1,234,567.89')
  })
})

describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('delays function execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 300)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('resets timer on subsequent calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 300)

    debounced()
    vi.advanceTimersByTime(200)
    debounced()  // 重置计时
    vi.advanceTimersByTime(200)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
```

---

## 3. Mock 技术

### vi.mock — 模块 Mock

```ts
// src/api/user.ts
export async function getUser(id: number) {
  const res = await fetch(`/api/users/${id}`)
  return res.json()
}

// src/api/__tests__/user.test.ts
import { vi, describe, it, expect } from 'vitest'
import { getUser } from '../user'

// 整个模块 mock
vi.mock('../user', () => ({
  getUser: vi.fn().mockResolvedValue({ id: 1, name: 'Tom' }),
}))

it('returns mocked user', async () => {
  const user = await getUser(1)
  expect(user).toEqual({ id: 1, name: 'Tom' })
})
```

### vi.fn — 函数 Mock

```ts
import { vi, describe, it, expect } from 'vitest'

// 创建 mock 函数
const mockFn = vi.fn()
mockFn('hello')
mockFn('world')

expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).toHaveBeenCalledWith('hello')
expect(mockFn.mock.calls).toEqual([['hello'], ['world']])

// 带返回值
const mockAdd = vi.fn((a: number, b: number) => a + b)
expect(mockAdd(1, 2)).toBe(3)

// 链式返回值
const mockGet = vi.fn()
  .mockReturnValueOnce('first')
  .mockReturnValueOnce('second')
  .mockReturnValue('default')

expect(mockGet()).toBe('first')
expect(mockGet()).toBe('second')
expect(mockGet()).toBe('default')

// 异步返回值
const mockFetch = vi.fn().mockResolvedValue({ data: [1, 2, 3] })
const result = await mockFetch()
expect(result.data).toEqual([1, 2, 3])

// 抛出错误
const mockFail = vi.fn().mockRejectedValue(new Error('network error'))
await expect(mockFail()).rejects.toThrow('network error')

// 查看调用信息
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith('hello')
expect(mockFn).toHaveBeenLastCalledWith('world')
expect(mockFn).toHaveBeenNthCalledWith(1, 'hello')
expect(mockFn).not.toHaveBeenCalledWith('foo')
```

### vi.spyOn — 监听方法

```ts
import { vi, describe, it, expect } from 'vitest'
import * as math from '../utils/math'

// 监听真实方法（可以查看调用，也可以 mock 返回值）
const spy = vi.spyOn(math, 'add')

math.add(1, 2)
expect(spy).toHaveBeenCalledWith(1, 2)

// mock 返回值（不执行原方法）
spy.mockReturnValue(999)
expect(math.add(1, 2)).toBe(999)

// mock 实现
spy.mockImplementation((a, b) => a * b)
expect(math.add(2, 3)).toBe(6)

// 恢复原方法
spy.mockRestore()
expect(math.add(1, 2)).toBe(3)
```

### Mock 全局对象

```ts
// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ id: 1 }),
})

// Mock Date
vi.useFakeTimers()
vi.setSystemTime(new Date('2025-01-01'))
expect(new Date().getFullYear()).toBe(2025)
vi.useRealTimers()

// Mock Math.random
vi.spyOn(Math, 'random').mockReturnValue(0.5)
```

### Mock 定时器

```ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('timer tests', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('setTimeout', () => {
    const fn = vi.fn()
    setTimeout(fn, 1000)

    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalled()
  })

  it('setInterval', () => {
    const fn = vi.fn()
    setInterval(fn, 500)

    vi.advanceTimersByTime(1500)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  // 快进到所有定时器执行完
  it('runAllTimers', () => {
    const fn = vi.fn()
    setTimeout(fn, 100)
    setTimeout(fn, 200)
    setTimeout(fn, 300)

    vi.runAllTimers()
    expect(fn).toHaveBeenCalledTimes(3)
  })

  // 快进到指定数量的定时器
  it('advanceTimersByTimeAsync', async () => {
    const fn = vi.fn()
    setTimeout(async () => {
      await Promise.resolve()
      fn()
    }, 100)

    await vi.advanceTimersByTimeAsync(100)
    expect(fn).toHaveBeenCalled()
  })
})
```

---

## 4. 组件测试（Vue）

### Vue Test Utils

```ts
// src/components/Counter.vue
<template>
  <div>
    <p data-testid="count">Count: {{ count }}</p>
    <button @click="increment">+1</button>
    <button @click="decrement">-1</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
const increment = () => count.value++
const decrement = () => count.value--
</script>

// src/components/__tests__/Counter.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Counter from '../Counter.vue'

describe('Counter', () => {
  it('renders initial count', () => {
    const wrapper = mount(Counter)
    expect(wrapper.find('[data-testid="count"]').text()).toBe('Count: 0')
  })

  it('increments count on button click', async () => {
    const wrapper = mount(Counter)
    const buttons = wrapper.findAll('button')

    await buttons[0].trigger('click')
    expect(wrapper.find('[data-testid="count"]').text()).toBe('Count: 1')

    await buttons[0].trigger('click')
    expect(wrapper.find('[data-testid="count"]').text()).toBe('Count: 2')
  })

  it('decrements count', async () => {
    const wrapper = mount(Counter)
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.find('[data-testid="count"]').text()).toBe('Count: -1')
  })

  it('emits event on increment', async () => {
    const wrapper = mount(Counter)
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted()).toHaveProperty('update:count')
  })
})
```

### Props 与 Slots

```ts
// 传入 Props
const wrapper = mount(UserCard, {
  props: {
    name: 'Tom',
    age: 25,
    role: 'admin',
  },
})
expect(wrapper.text()).toContain('Tom')

// 测试 Props 验证
it('requires name prop', () => {
  expect(() => mount(UserCard, { props: {} })).toThrow()
})

// 测试 Slots
const wrapper = mount(Card, {
  slots: {
    default: '<p>Card content</p>',
    header: '<h1>Title</h1>',
    footer: '<button>OK</button>',
  },
})
expect(wrapper.find('h1').text()).toBe('Title')

// 具名插槽作用域
const wrapper = mount(DataList, {
  slots: {
    item: '<template #item="{ item }"><span>{{ item.name }}</span></template>',
  },
  props: { items: [{ name: 'Tom' }] },
})
```

### 事件与异步

```ts
// 触发事件
await wrapper.find('input').setValue('hello')
await wrapper.find('form').trigger('submit')
await wrapper.find('select').setValue('option1')
await wrapper.find('input[type="checkbox"]').setValue(true)

// 测试 emit
const wrapper = mount(SearchInput)
await wrapper.find('input').setValue('test')
await wrapper.find('form').trigger('submit')
expect(wrapper.emitted('search')).toBeTruthy()
expect(wrapper.emitted('search')![0]).toEqual(['test'])

// 异步操作
it('fetches data on mount', async () => {
  const wrapper = mount(UserList)

  // 等待异步操作完成
  await flushPromises()  // 或 vi.waitFor
  // 或
  await vi.waitFor(() => {
    expect(wrapper.find('.user-item').exists()).toBe(true)
  })

  expect(wrapper.findAll('.user-item')).toHaveLength(3)
})
```

### Mock 子组件与依赖

```ts
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'

// Mock 子组件（避免测试子组件内部实现）
const wrapper = mount(ParentComponent, {
  global: {
    stubs: {
      ChildComponent: { template: '<div data-testid="mock-child">Mock</div>' },
    },
  },
})

// Mock Pinia Store
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '@/stores/user'

beforeEach(() => {
  setActivePinia(createPinia())
})

it('uses user store', () => {
  const store = useUserStore()
  store.user = { name: 'Tom', role: 'admin' }

  const wrapper = mount(UserProfile, {
    global: { plugins: [createPinia()] },
  })

  expect(wrapper.text()).toContain('Tom')
})

// Mock 路由
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: { template: 'Home' } }],
})

const wrapper = mount(MyComponent, {
  global: { plugins: [router] },
})
```

---

## 5. 组件测试（React）

### React Testing Library

```tsx
// src/components/Counter.tsx
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p data-testid="count">Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={() => setCount(c => c - 1)}>-1</button>
    </div>
  )
}

// src/components/__tests__/Counter.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Counter } from '../Counter'

describe('Counter', () => {
  it('renders initial count', () => {
    render(<Counter />)
    expect(screen.getByTestId('count')).toHaveTextContent('Count: 0')
  })

  it('increments on click', () => {
    render(<Counter />)
    fireEvent.click(screen.getByText('+1'))
    expect(screen.getByTestId('count')).toHaveTextContent('Count: 1')
  })

  it('decrements on click', () => {
    render(<Counter />)
    fireEvent.click(screen.getByText('-1'))
    expect(screen.getByTestId('count')).toHaveTextContent('Count: -1')
  })
})
```

### 查询方式（优先级从高到低）

```tsx
import { screen } from '@testing-library/react'

// ✅ 推荐：模拟用户行为查找
screen.getByRole('button', { name: /submit/i })   // 角色 + 可访问名称
screen.getByLabelText('Username')                   // label 文本
screen.getByPlaceholderText('Enter email')          // 占位文本
screen.getByText('Hello World')                     // 文本内容

// ⚠️ 可用：data-testid
screen.getByTestId('submit-btn')

// ❌ 不推荐：实现细节
screen.getByClassName('btn')                        // 不存在此 API
container.querySelector('.btn')                     // 避免

// getBy vs queryBy vs findBy
screen.getByText('Hello')       // 找不到 → 报错
screen.queryByText('Hello')     // 找不到 → 返回 null（用于断言不存在）
await screen.findByText('Hello') // 异步查找，等待出现

// 多个匹配
screen.getAllByRole('listitem')
screen.queryAllByText('error')
screen.findAllByTestId('item')
```

### 用户交互

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// userEvent（推荐，更接近真实用户行为）
const user = userEvent.setup()

await user.click(screen.getByRole('button'))
await user.dblClick(screen.getByText('item'))
await user.type(screen.getByRole('textbox'), 'hello')  // 逐字输入
await user.clear(screen.getByRole('textbox'))
await user.selectOptions(screen.getByRole('combobox'), 'option1')
await user.hover(screen.getByText('tooltip trigger'))
await user.unhover(screen.getByText('tooltip trigger'))
await user.tab()  // Tab 键切换焦点

// fireEvent（更底层）
fireEvent.click(screen.getByRole('button'))
fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })
fireEvent.submit(screen.getByRole('form'))
fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', code: 'Enter' })
```

### 异步测试

```tsx
import { render, screen, waitFor, act } from '@testing-library/react'

// 等待异步更新
it('loads data asynchronously', async () => {
  render(<UserList />)

  // 等待元素出现
  const item = await screen.findByText('Tom')
  expect(item).toBeInTheDocument()

  // 或 waitFor 等待条件
  await waitFor(() => {
    expect(screen.getAllByTestId('user-item')).toHaveLength(3)
  })
})

// Mock fetch 测试异步组件
it('fetches and displays users', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([
      { id: 1, name: 'Tom' },
      { id: 2, name: 'Jerry' },
    ]),
  })

  render(<UserList />)

  // 等待加载完成
  expect(await screen.findByText('Tom')).toBeInTheDocument()
  expect(screen.getByText('Jerry')).toBeInTheDocument()

  // 验证 fetch 被调用
  expect(global.fetch).toHaveBeenCalledWith('/api/users')
})

// act 包裹状态更新
import { act } from 'react'

await act(async () => {
  render(<Counter />)
})
```

### Mock 模块与 Hooks

```tsx
// Mock 自定义 Hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Tom', role: 'admin' },
    logout: vi.fn(),
  }),
}))

// Mock 第三方库
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: { id: 1 } }),
  },
}))

// Mock Context
const wrapper = ({ children }) => (
  <ThemeProvider value={{ theme: 'dark' }}>
    {children}
  </ThemeProvider>
)
render(<MyComponent />, { wrapper })
```

---

## 6. E2E 测试（Playwright）

### 安装与配置

```bash
npm install -D @playwright/test
npx playwright install  # 安装浏览器
```

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

### 基础测试

```ts
// e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Login', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login')

    // 填写表单
    await page.getByLabel('用户名').fill('admin')
    await page.getByLabel('密码').fill('123456')
    await page.getByRole('button', { name: '登录' }).click()

    // 验证跳转
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('欢迎回来')).toBeVisible()
  })

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('用户名').fill('wrong')
    await page.getByLabel('密码').fill('wrong')
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page.getByText('用户名或密码错误')).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page.getByText('请输入用户名')).toBeVisible()
    await expect(page.getByText('请输入密码')).toBeVisible()
  })
})
```

### 定位器

```ts
// 推荐：语义化定位（接近用户视角）
page.getByRole('button', { name: '提交' })
page.getByRole('heading', { name: '欢迎', level: 1 })
page.getByRole('link', { name: '首页' })
page.getByRole('textbox', { name: '搜索' })
page.getByRole('checkbox', { name: '记住我' })

page.getByLabel('用户名')              // <label>用户名</label> 关联的 input
page.getByPlaceholder('请输入邮箱')    // placeholder 属性
page.getByText('确认删除')             // 文本内容
page.getByAltText('头像')              // img alt 属性
page.getByTitle('设置')                // title 属性

// data-testid（兜底方案）
page.getByTestId('submit-button')

// CSS / XPath（不推荐，但可用）
page.locator('.btn-primary')
page.locator('#main-nav > ul > li')
page.locator('xpath=//div[@class="card"]')
```

### 交互操作

```ts
// 点击
await page.click('button')
await page.getByRole('button').click()
await page.getByRole('button').dblclick()
await page.getByRole('button').click({ button: 'right' })  // 右键

// 输入
await page.fill('input[name="email"]', 'test@example.com')
await page.getByLabel('邮箱').fill('test@example.com')
await page.getByLabel('搜索').press('Enter')
await page.getByLabel('内容').type('逐字输入')  // 模拟真实打字

// 选择
await page.selectOption('select#city', 'beijing')
await page.getByLabel('城市').selectOption({ label: '北京' })
await page.getByLabel('同意').check()     // 勾选
await page.getByLabel('同意').uncheck()   // 取消勾选

// 文件上传
await page.getByLabel('上传').setInputFiles('path/to/file.png')
await page.getByLabel('上传').setInputFiles(['file1.png', 'file2.png'])  // 多文件

// 键盘
await page.keyboard.press('Enter')
await page.keyboard.press('Control+A')
await page.keyboard.type('hello')

// 鼠标
await page.mouse.move(100, 200)
await page.mouse.click(100, 200)
await page.mouse.wheel(0, 500)  // 滚动

// 拖拽
await page.getByText('拖我').dragTo(page.getByTestId('drop-zone'))

// 悬停
await page.getByText('悬停显示').hover()
```

### 断言

```ts
import { expect } from '@playwright/test'

// 自动等待断言（内置重试）
await expect(page.getByText('加载完成')).toBeVisible()
await expect(page.getByTestId('count')).toHaveText('5')
await expect(page).toHaveURL(/dashboard/)
await expect(page).toHaveTitle(/首页/)

// 元素状态
await expect(page.getByRole('button')).toBeEnabled()
await expect(page.getByRole('button')).toBeDisabled()
await expect(page.getByRole('checkbox')).toBeChecked()
await expect(page.getByRole('textbox')).toHaveValue('hello')
await expect(page.getByRole('list')).toContainText('Tom')

// 数量
await expect(page.getByRole('listitem')).toHaveCount(5)

// 可见性
await expect(page.getByText('弹窗')).toBeVisible()
await expect(page.getByText('加载中')).toBeHidden()

// CSS
await expect(page.getByTestId('box')).toHaveCSS('color', 'rgb(255, 0, 0)')
await expect(page.getByTestId('box')).toHaveCSS('display', 'flex')

// 属性
await expect(page.getByRole('link')).toHaveAttribute('href', '/about')

// 截图对比（视觉回归）
await expect(page).toHaveScreenshot('homepage.png', {
  maxDiffPixelRatio: 0.01,
})
```

### 网络拦截

```ts
// Mock API 响应
await page.route('**/api/users', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { id: 1, name: 'Tom' },
      { id: 2, name: 'Jerry' },
    ]),
  })
})

// 修改请求
await page.route('**/api/data', async (route) => {
  const request = route.request()
  const headers = { ...request.headers(), 'Authorization': 'Bearer test-token' }
  await route.continue({ headers })
})

// 拦截并等待请求
const responsePromise = page.waitForResponse('**/api/users')
await page.getByRole('button', { name: '加载' }).click()
const response = await responsePromise
expect(response.status()).toBe(200)

// 等待请求完成
await page.waitForRequest('**/api/submit')
await page.waitForResponse(res => res.url().includes('/api/submit') && res.ok())
```

### 认证状态复用

```ts
// global-setup.ts — 全局登录一次，所有测试复用
import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:5173/login')
  await page.getByLabel('用户名').fill('admin')
  await page.getByLabel('密码').fill('123456')
  await page.getByRole('button', { name: '登录' }).click()

  // 保存认证状态
  await page.context().storageState({ path: './e2e/.auth/user.json' })
  await browser.close()
}

export default globalSetup

// playwright.config.ts
export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  projects: [
    {
      name: 'authenticated',
      use: { storageState: './e2e/.auth/user.json' },
    },
    {
      name: 'unauthenticated',
      use: { storageState: { cookies: [], origins: [] } },
    },
  ],
})
```

### Page Object Model

```ts
// e2e/pages/LoginPage.ts
import { Page, Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly usernameInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.usernameInput = page.getByLabel('用户名')
    this.passwordInput = page.getByLabel('密码')
    this.submitButton = page.getByRole('button', { name: '登录' })
    this.errorMessage = page.getByTestId('error-message')
  }

  async goto() {
    await this.page.goto('/login')
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}

// e2e/login.spec.ts
import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'

test('login flow', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login('admin', '123456')
  await expect(page).toHaveURL('/dashboard')
})
```

---

## 7. E2E 测试（Cypress）

### 安装与配置

```bash
npm install -D cypress
npx cypress open  # 交互式打开
npx cypress run   # 命令行运行
```

```js
// cypress.config.js
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {},
  },
})
```

### 基础测试

```js
// cypress/e2e/login.cy.js
describe('Login', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  it('should login successfully', () => {
    cy.get('[data-testid="username"]').type('admin')
    cy.get('[data-testid="password"]').type('123456')
    cy.get('button[type="submit"]').click()

    cy.url().should('include', '/dashboard')
    cy.contains('欢迎回来').should('be.visible')
  })

  it('should show error on invalid login', () => {
    cy.get('[data-testid="username"]').type('wrong')
    cy.get('[data-testid="password"]').type('wrong')
    cy.get('button[type="submit"]').click()

    cy.get('[data-testid="error"]').should('contain', '用户名或密码错误')
  })
})
```

### Cypress vs Playwright

| 特性 | Cypress | Playwright |
|------|---------|------------|
| 浏览器 | 主要 Chrome/Firefox | Chrome/Firefox/Safari/移动端 |
| 运行方式 | 浏览器内运行 | 浏览器外控制（CDP/WebDriver） |
| 多标签 | ❌ 不支持 | ✅ 支持 |
| iframe | 有限支持 | ✅ 完整支持 |
| 调试 | 时间旅行（Time Travel） | Trace Viewer |
| 速度 | 中等 | 更快 |
| 并行 | 付费（Dashboard） | 免费内置 |
| 社区 | 成熟，文档好 | 增长快，微软支持 |
| 推荐 | 中小型项目 | 中大型项目（推荐） |

---

## 8. Mock Server（MSW）

### 安装与配置

```bash
npm install -D msw
npx msw init public/ --save  # 生成 mockServiceWorker.js
```

```ts
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Tom', role: 'admin' },
      { id: 2, name: 'Jerry', role: 'user' },
    ])
  }),

  http.get('/api/users/:id', ({ params }) => {
    const { id } = params
    return HttpResponse.json({ id: Number(id), name: 'Tom' })
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { id: 3, ...body },
      { status: 201 }
    )
  }),

  http.delete('/api/users/:id', ({ params }) => {
    return new HttpResponse(null, { status: 204 })
  }),

  // 模拟错误
  http.get('/api/error', () => {
    return HttpResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }),

  // 模拟网络错误
  http.get('/api/offline', () => {
    return HttpResponse.error()
  }),

  // 模拟延迟
  http.get('/api/slow', async () => {
    await new Promise(r => setTimeout(r, 2000))
    return HttpResponse.json({ data: 'slow response' })
  }),
]

// src/mocks/browser.ts — 浏览器环境
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
export const worker = setupWorker(...handlers)

// src/mocks/server.ts — Node 环境（测试）
import { setupServer } from 'msw/node'
import { handlers } from './handlers'
export const server = setupServer(...handlers)
```

### 测试中使用

```ts
// src/test/setup.ts
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '../mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// 测试中覆盖 handler
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'

it('handles empty user list', async () => {
  server.use(
    http.get('/api/users', () => HttpResponse.json([]))
  )

  render(<UserList />)
  await screen.findByText('暂无用户')
})

it('handles server error', async () => {
  server.use(
    http.get('/api/users', () => HttpResponse.json(
      { message: 'Server Error' },
      { status: 500 }
    ))
  )

  render(<UserList />)
  await screen.findByText('加载失败')
})
```

### 开发环境启用

```ts
// src/main.ts
async function bootstrap() {
  if (process.env.NODE_ENV === 'development') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }

  const app = createApp(App)
  app.mount('#app')
}

bootstrap()
```

---

## 9. Hook 测试

### Vue Composable 测试

```ts
// src/composables/useCounter.ts
import { ref, computed } from 'vue'

export function useCounter(initial = 0) {
  const count = ref(initial)
  const double = computed(() => count.value * 2)
  const increment = () => count.value++
  const decrement = () => count.value--
  const reset = () => count.value = initial

  return { count, double, increment, decrement, reset }
}

// src/composables/__tests__/useCounter.test.ts
import { describe, it, expect } from 'vitest'
import { useCounter } from '../useCounter'

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { count } = useCounter()
    expect(count.value).toBe(0)
  })

  it('initializes with custom value', () => {
    const { count } = useCounter(10)
    expect(count.value).toBe(10)
  })

  it('increments', () => {
    const { count, increment } = useCounter()
    increment()
    expect(count.value).toBe(1)
  })

  it('computes double', () => {
    const { count, double, increment } = useCounter(5)
    expect(double.value).toBe(10)
    increment()
    expect(double.value).toBe(12)
  })

  it('resets to initial', () => {
    const { count, increment, reset } = useCounter(5)
    increment()
    increment()
    reset()
    expect(count.value).toBe(5)
  })
})
```

### React Hook 测试

```tsx
// src/hooks/useCounter.ts
import { useState, useCallback } from 'react'

export function useCounter(initial = 0) {
  const [count, setCount] = useState(initial)
  const increment = useCallback(() => setCount(c => c + 1), [])
  const decrement = useCallback(() => setCount(c => c - 1), [])
  return { count, increment, decrement }
}

// src/hooks/__tests__/useCounter.test.tsx
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCounter } from '../useCounter'

describe('useCounter', () => {
  it('initializes with default', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.count).toBe(0)
  })

  it('increments', () => {
    const { result } = renderHook(() => useCounter())
    act(() => result.current.increment())
    expect(result.current.count).toBe(1)
  })

  it('decrements', () => {
    const { result } = renderHook(() => useCounter(10))
    act(() => result.current.decrement())
    expect(result.current.count).toBe(9)
  })
})
```

### 异步 Hook

```ts
// src/hooks/useFetch.ts
import { useState, useEffect } from 'react'

export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Fetch failed')
        return res.json()
      })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [url])

  return { data, loading, error }
}

// 测试
import { renderHook, waitFor } from '@testing-library/react'

it('fetches data successfully', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ name: 'Tom' }),
  })

  const { result } = renderHook(() => useFetch('/api/user'))

  expect(result.current.loading).toBe(true)

  await waitFor(() => {
    expect(result.current.loading).toBe(false)
  })

  expect(result.current.data).toEqual({ name: 'Tom' })
  expect(result.current.error).toBeNull()
})

it('handles fetch error', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false })

  const { result } = renderHook(() => useFetch('/api/user'))

  await waitFor(() => {
    expect(result.current.loading).toBe(false)
  })

  expect(result.current.error).toBeTruthy()
  expect(result.current.data).toBeNull()
})
```

---

## 10. 覆盖率

### 配置

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',           // 'v8'（快）或 'istanbul'（准）
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',

      include: ['src/**/*.{js,ts,vue,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/main.ts',           // 入口文件
        'src/types/**',          // 类型定义
      ],

      // 覆盖率阈值（CI 中低于阈值会报错）
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
})
```

### 运行覆盖率

```bash
# 生成覆盖率报告
npx vitest run --coverage

# 输出示例
# ----------|---------|----------|---------|---------|
# File      | % Stmts | % Branch | % Funcs | % Lines |
# ----------|---------|----------|---------|---------|
# All files |   85.71 |    78.57 |   90.00 |   85.71 |
#  add.ts   |  100.00 |   100.00 |  100.00 |  100.00 |
#  sub.ts   |   71.43 |    57.14 |   80.00 |   71.43 |
# ----------|---------|----------|---------|---------|
```

### 覆盖率指标

```
Statements（语句覆盖率）— 多少语句被执行了
Branches（分支覆盖率）  — 多少 if/else/switch 分支被覆盖
Functions（函数覆盖率） — 多少函数被调用
Lines（行覆盖率）       — 多少代码行被执行

建议阈值：
- 新项目：60-70%
- 成熟项目：80%+
- 核心业务逻辑：90%+

⚠️ 不要追求 100%！
- 边际效益递减
- getter/setter、类型定义等不需要测
- 关注有意义的覆盖率而非数字
```

---

## 11. CI 集成

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### package.json 脚本

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:all": "npm run test:run && npm run test:e2e"
  }
}
```

---

## 12. 测试最佳实践

### 原则

```
1. 测行为，不测实现
   ✅ 用户点击按钮后显示结果
   ❌ 组件调用了 setState 方法

2. 测试应该像用户使用一样
   ✅ getByRole('button', { name: '提交' })
   ❌ container.querySelector('.btn-submit')

3. AAA 模式
   Arrange（准备）→ Act（执行）→ Assert（断言）

4. 一个测试只测一件事
   ✅ it('should increment count')
   ✅ it('should decrement count')
   ❌ it('should increment and decrement count')

5. 测试命名清晰
   it('should return empty array when no items match filter')
   it('should disable submit button when form is invalid')
```

### 常见反模式

```ts
// ❌ 测试实现细节
expect(wrapper.vm.count).toBe(1)        // 直接访问组件内部状态
expect(instance.handleClick).toHaveBeenCalled()  // 测试方法调用

// ✅ 测试用户可见行为
expect(screen.getByText('Count: 1')).toBeInTheDocument()

// ❌ 测试间相互依赖
let wrapper
beforeEach(() => { wrapper = mount(Counter) })
it('test 1', () => { wrapper.find('button').trigger('click') })
it('test 2', () => { expect(wrapper.text()).toContain('1') })  // 依赖 test 1

// ✅ 每个测试独立
it('test 1', () => {
  const wrapper = mount(Counter)
  wrapper.find('button').trigger('click')
  expect(wrapper.text()).toContain('1')
})

// ❌ 过度 Mock（测的不是真实代码）
vi.mock('vue')  // Mock 框架本身
vi.mock('./Component', () => ({ default: {} }))

// ✅ 只 Mock 外部依赖
vi.mock('axios')  // Mock HTTP 请求
vi.mock('localStorage')  // Mock 浏览器 API

// ❌ 脆弱的测试（依赖 DOM 结构）
expect(wrapper.find('div > div > span').text()).toBe('hello')

// ✅ 稳定的测试（依赖语义）
expect(screen.getByText('hello')).toBeInTheDocument()
```

### 测试数据工厂

```ts
// src/test/factories.ts
export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: Math.random().toString(36).slice(2),
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

// 使用
const admin = createUser({ role: 'admin', name: 'Admin' })
const users = Array.from({ length: 5 }, (_, i) =>
  createUser({ name: `User ${i}` })
)
```

---

## 参考资源

- [Vitest](https://vitest.dev/) — Vite 原生测试框架
- [Vue Test Utils](https://test-utils.vuejs.org/) — Vue 官方组件测试库
- [Testing Library](https://testing-library.com/) — 以用户视角测试
- [Playwright](https://playwright.dev/) — 微软 E2E 测试框架
- [Cypress](https://www.cypress.io/) — E2E 测试框架
- [MSW](https://mswjs.io/) — API Mock 库
- [Testing Trophy](https://kentcdodds.com/blog/write-tests/) — Kent C. Dodds 测试策略
- [Common Testing Antipatterns](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
