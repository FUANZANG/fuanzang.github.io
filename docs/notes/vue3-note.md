# Vue 3 笔记

> 📌 Vue 2 Options API 相关内容请查看 [Vue 2 笔记](/notes/vue2-note)

<!-- 本文件记录 Vue 3 Composition API 的核心概念、实战技巧与常用代码 -->

---

## 1. 响应式核心

### ref vs reactive

**ref**
- 用于包装**基本类型**（`string`、`number`、`boolean`）和**对象**
- 在 JS 中通过 `.value` 访问，模板中自动解包不需要 `.value`
- 底层对基本类型进行包装，对对象类型内部调用 `reactive`

**reactive**
- 用于包装**对象 / 数组**，直接访问属性
- 不能包装基本类型（会报错）
- 解构或赋值会**丢失响应式**

**选择建议**：基本类型用 `ref`，对象用 `reactive`。但实际开发中推荐**统一用 `ref`**，因为解构不会丢失响应式，心智负担更小。

```vue
<script setup lang="ts">
import { ref, reactive } from 'vue'

// ref —— 基本类型
const count = ref(0)
console.log(count.value) // 0
count.value++

// ref —— 对象（内部自动 reactive）
const user = ref({ name: '张三', age: 25 })
console.log(user.value.name) // '张三'
user.value.age = 26

// reactive —— 对象
const state = reactive({
  title: 'Vue 3',
  list: [1, 2, 3],
})
console.log(state.title) // 'Vue 3'
state.list.push(4)

// ⚠️ reactive 解构会丢失响应式
const { title } = state // title 不再是响应式
</script>

<template>
  <!-- 模板中 ref 自动解包 -->
  <p>{{ count }}</p>
  <p>{{ user.name }}</p>
  <p>{{ state.title }}</p>
</template>
```

### toRef / toRefs

- **toRef**：从 `reactive` 对象中提取**单个属性**为 `ref`，保持响应式连接
- **toRefs**：将整个 `reactive` 对象的**所有属性**转为 `ref` 对象（解构不丢响应式）

```vue
<script setup lang="ts">
import { reactive, toRef, toRefs } from 'vue'

const state = reactive({ name: '李四', age: 30 })

// toRef —— 提取单个属性
const nameRef = toRef(state, 'name')
console.log(nameRef.value) // '李四'
nameRef.value = '王五' // state.name 也会变为 '王五'

// toRefs —— 整体解构
const { name, age } = toRefs(state)
console.log(name.value, age.value) // '王五' 30

// 配合函数返回值使用
function useUser() {
  const user = reactive({ name: '赵六', role: 'admin' })
  // ...some logic
  return toRefs(user)
}
const { name: userName, role } = useUser()
</script>
```

### shallowRef / shallowReactive

浅层响应式，**只追踪第一层属性**的变化，深层属性不再被追踪。

**适用场景**：大列表数据、第三方库对象（如地图实例、编辑器实例）、不需要深层响应的配置对象。

```vue
<script setup lang="ts">
import { shallowRef, shallowReactive, triggerRef } from 'vue'

// shallowRef —— 只有替换整个 .value 时才触发更新
const bigList = shallowRef([1, 2, 3])
bigList.value.push(4) // ❌ 不会触发视图更新
bigList.value = [1, 2, 3, 4] // ✅ 替换整个值，触发更新

// 手动触发更新
const data = shallowRef({ count: 0 })
data.value.count++ // ❌ 深层修改不触发
triggerRef(data) // ✅ 手动触发

// shallowReactive —— 只代理第一层
const config = shallowReactive({
  theme: 'dark',
  nested: { fontSize: 14 },
})
config.theme = 'light' // ✅ 第一层，响应式
config.nested.fontSize = 16 // ❌ 深层，非响应式
</script>
```

### readonly / shallowReadonly

创建一个**只读代理**，对原对象的任何修改操作都会被拦截并给出警告。

```vue
<script setup lang="ts">
import { reactive, readonly, shallowReadonly } from 'vue'

const original = reactive({ count: 0, nested: { value: 1 } })

// readonly —— 深层只读
const copy = readonly(original)
copy.count++ // ❌ 警告：Set operation on key "count" failed: target is readonly
copy.nested.value++ // ❌ 深层也是只读

// shallowReadonly —— 仅第一层只读
const shallow = shallowReadonly(original)
shallow.count++ // ❌ 第一层只读
shallow.nested.value++ // ✅ 深层可以修改

// 常见用法：向子组件传递不可变数据
// defineProps 传入的数据本身就是 readonly 的
</script>
```

---

## 2. 组件通讯

### 父传子 (props / defineProps)

```vue
<!-- Parent.vue -->
<script setup lang="ts">
import Child from './Child.vue'
import { ref } from 'vue'

const msg = ref('来自父组件的消息')
</script>

<template>
  <Child :title="'Vue 3 通讯'" :count="100" :msg="msg" />
</template>
```

```vue
<!-- Child.vue -->
<script setup lang="ts">
// 方式一：运行时声明
// const props = defineProps({
//   title: String,
//   count: { type: Number, default: 0 },
//   msg: String,
// })

// 方式二：基于类型声明（推荐，TypeScript 友好）
const props = withDefaults(
  defineProps<{
    title: string
    count?: number
    msg: string
  }>(),
  {
    count: 0,
  }
)

console.log(props.title) // 'Vue 3 通讯'
console.log(props.count) // 100
</script>

<template>
  <h2>{{ title }}</h2>
  <p>数量：{{ count }}</p>
  <p>消息：{{ msg }}</p>
</template>
```

### 子传父 (emits / defineEmits)

```vue
<!-- Child.vue -->
<script setup lang="ts">
// 基于类型声明 emits
const emit = defineEmits<{
  change: [value: string]
  update: [id: number, name: string]
}>()

function handleClick() {
  emit('change', '子组件传递的值')
  emit('update', 1, '新名字')
}
</script>

<template>
  <button @click="handleClick">通知父组件</button>
</template>
```

```vue
<!-- Parent.vue -->
<script setup lang="ts">
import Child from './Child.vue'

function handleChange(value: string) {
  console.log('收到子组件消息：', value)
}

function handleUpdate(id: number, name: string) {
  console.log(`ID: ${id}, Name: ${name}`)
}
</script>

<template>
  <Child @change="handleChange" @update="handleUpdate" />
</template>
```

### 双向绑定 (v-model / defineModel)

**v-model 原理**：本质上是 `:modelValue` + `@update:modelValue` 的语法糖。

#### 传统写法（3.4 之前）

```vue
<!-- Child.vue -->
<script setup lang="ts">
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <input :value="modelValue" @input="onInput" />
</template>
```

#### defineModel() 宏（3.4+，推荐）

```vue
<!-- Child.vue (3.4+) -->
<script setup lang="ts">
// 默认 model（对应 v-model）
const model = defineModel<string>()

// 命名 model（对应 v-model:title）
const title = defineModel<string>('title')
</script>

<template>
  <input v-model="model" />
  <input v-model="title" />
</template>
```

```vue
<!-- Parent.vue -->
<script setup lang="ts">
import Child from './Child.vue'
import { ref } from 'vue'

const text = ref('')
const heading = ref('标题')
</script>

<template>
  <!-- 默认 v-model -->
  <Child v-model="text" />
  <p>输入内容：{{ text }}</p>

  <!-- 命名 v-model -->
  <Child v-model:title="heading" />
  <p>标题：{{ heading }}</p>
</template>
```

### 兄弟通讯 (mitt)

```bash
npm install mitt
```

```ts
// utils/emitter.ts
import mitt from 'mitt'

// 定义事件类型
type Events = {
  'user-login': { name: string }
  'cart-update': number
  refresh: void
}

export const emitter = mitt<Events>()
```

```vue
<!-- ComponentA.vue —— 发送 -->
<script setup lang="ts">
import { emitter } from '@/utils/emitter'

function notify() {
  emitter.emit('user-login', { name: '张三' })
  emitter.emit('refresh')
}
</script>

<template>
  <button @click="notify">通知兄弟组件</button>
</template>
```

```vue
<!-- ComponentB.vue —— 接收 -->
<script setup lang="ts">
import { emitter } from '@/utils/emitter'
import { onMounted, onUnmounted } from 'vue'

function onLogin(data: { name: string }) {
  console.log('用户登录：', data.name)
}

onMounted(() => {
  emitter.on('user-login', onLogin)
  emitter.on('refresh', () => console.log('刷新'))
})

onUnmounted(() => {
  // ⚠️ 务必在卸载时移除监听，防止内存泄漏
  emitter.off('user-login', onLogin)
  emitter.off('refresh')
})
</script>
```

### $attrs (useAttrs)

Vue 3 将 `$listeners` 合并到 `$attrs` 中，`$attrs` 包含**未被 props 和 emits 声明**的所有属性和事件监听器。

```vue
<!-- MyInput.vue —— 子组件透传 -->
<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({ inheritAttrs: false }) // 关闭默认继承

const attrs = useAttrs()
console.log(attrs) // { class: '...', placeholder: '...', onFocus: fn }
</script>

<template>
  <!-- 手动将 attrs 绑定到目标元素 -->
  <div class="my-input-wrapper">
    <input v-bind="$attrs" />
  </div>
</template>
```

```vue
<!-- Parent.vue -->
<template>
  <!-- class, placeholder, onfocus 等会自动透传到子组件 -->
  <MyInput
    class="custom-input"
    placeholder="请输入..."
    @focus="handleFocus"
  />
</template>
```

### ref 传参 (defineExpose)

`<script setup>` 默认是**封闭**的，子组件的变量和方法不会暴露给父组件。需要通过 `defineExpose` 显式暴露。

```vue
<!-- ChildForm.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const formData = ref({ username: '', password: '' })
const errors = ref<string[]>([])

function validate() {
  errors.value = []
  if (!formData.value.username) {
    errors.value.push('用户名不能为空')
  }
  if (!formData.value.password) {
    errors.value.push('密码不能为空')
  }
  return errors.value.length === 0
}

function reset() {
  formData.value = { username: '', password: '' }
  errors.value = []
}

// 显式暴露给父组件
defineExpose({ formData, validate, reset })
</script>

<template>
  <div>
    <input v-model="formData.username" placeholder="用户名" />
    <input v-model="formData.password" type="password" placeholder="密码" />
    <p v-for="err in errors" :key="err" class="error">{{ err }}</p>
  </div>
</template>
```

```vue
<!-- Parent.vue -->
<script setup lang="ts">
import ChildForm from './ChildForm.vue'
import { ref } from 'vue'

const formRef = ref<InstanceType<typeof ChildForm> | null>(null)

function handleSubmit() {
  if (formRef.value?.validate()) {
    console.log('提交数据：', formRef.value.formData)
  }
}

function handleReset() {
  formRef.value?.reset()
}
</script>

<template>
  <ChildForm ref="formRef" />
  <button @click="handleSubmit">提交</button>
  <button @click="handleReset">重置</button>
</template>
```

### provide / inject

用于**跨层级**组件通讯，无需逐层传递 props。

```vue
<!-- App.vue 或任意祖先组件 -->
<script setup lang="ts">
import { provide, ref, readonly } from 'vue'

const theme = ref<'light' | 'dark'>('light')

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

// 注入时可以注入响应式数据 + 修改方法
provide('theme', readonly(theme))
provide('toggleTheme', toggleTheme)

// 推荐使用 Symbol 或独立 key 文件避免命名冲突
export const THEME_KEY = Symbol('theme')
provide(THEME_KEY, readonly(theme))
</script>
```

```vue
<!-- DeepChild.vue —— 任意后代组件 -->
<script setup lang="ts">
import { inject } from 'vue'
import type { Ref } from 'vue'

// 基本注入
const theme = inject<Ref<'light' | 'dark'>>('theme')
const toggleTheme = inject<() => void>('toggleTheme')

// 带默认值的注入
const count = inject('count', 0)

// 带工厂函数的默认值
const config = inject('config', () => ({ api: '/api' }), true)
</script>

<template>
  <div :class="theme">
    <p>当前主题：{{ theme }}</p>
    <button @click="toggleTheme">切换主题</button>
  </div>
</template>
```

### 路由传参

```ts
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/detail',
      component: () => import('@/views/Detail.vue'),
    },
    {
      // ⚠️ params 路径参数 (Vue Router 4.1.4 已移除命名路由传 params)
      path: '/user/:id',
      component: () => import('@/views/User.vue'),
    },
  ],
})

export default router
```

```vue
<!-- List.vue —— 跳转 -->
<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

// query 传参（参数出现在 URL 中）
function goToDetail(id: number) {
  router.push({
    path: '/detail',
    query: { id, from: 'list' },
  })
}

// state 传参（不出现在 URL，类似 history.state）
function goToUser(id: number) {
  router.push({
    path: `/user/${id}`,
    state: { name: '张三', role: 'admin' },
  })
}
</script>
```

```vue
<!-- Detail.vue —— 接收 query -->
<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
console.log(route.query.id) // '123'
console.log(route.query.from) // 'list'
</script>
```

```vue
<!-- User.vue —— 接收 params + state -->
<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
console.log(route.params.id) // '123'（路径参数）

// state 通过 history API 获取
const historyState = history.state
console.log(historyState.name) // '张三'
console.log(historyState.role) // 'admin'
</script>
```

### Pinia (状态管理)

#### 安装

```bash
npm install pinia
```

```ts
// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

#### Option Store（选项式）

```ts
// stores/counter.ts
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  // state —— 响应式状态
  state: () => ({
    count: 0,
    name: '计数器',
  }),

  // getters —— 计算属性（支持 this 访问 state）
  getters: {
    doubleCount: (state) => state.count * 2,
    // getter 访问另一个 getter
    doublePlusName(): string {
      return `${this.doubleCount} - ${this.name}`
    },
  },

  // actions —— 方法（支持同步 / 异步）
  actions: {
    increment() {
      this.count++
    },
    async fetchCount() {
      const res = await fetch('/api/count')
      const data = await res.json()
      this.count = data.count
    },
  },
})
```

#### Composition Store（组合式）

```ts
// stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // ref() => state
  const token = ref('')
  const userInfo = ref({ name: '', role: '' })

  // computed() => getters
  const isLoggedIn = computed(() => !!token.value)
  const displayName = computed(() => userInfo.value.name || '游客')

  // function() => actions
  function setToken(val: string) {
    token.value = val
  }

  async function login(username: string, password: string) {
    const res = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    token.value = data.token
    userInfo.value = data.user
  }

  function logout() {
    token.value = ''
    userInfo.value = { name: '', role: '' }
  }

  return { token, userInfo, isLoggedIn, displayName, setToken, login, logout }
})
```

#### 使用 Store

```vue
<script setup lang="ts">
import { useCounterStore } from '@/stores/counter'
import { storeToRefs } from 'pinia'

const counter = useCounterStore()

// ⚠️ 直接解构会丢失响应式，需要用 storeToRefs
const { count, doubleCount } = storeToRefs(counter)
// actions 可以直接解构（它们只是函数）
const { increment } = counter

// $patch 批量修改
counter.$patch({ count: 100, name: '新名字' })

// $patch 函数形式（适合数组操作）
counter.$patch((state) => {
  state.count += 10
  state.name = '批量修改'
})

// $reset 重置状态（仅 Option Store 支持）
counter.$reset()

// $subscribe 订阅状态变化
counter.$subscribe((mutation, state) => {
  console.log('变化类型：', mutation.type) // 'direct' | 'patch object' | 'patch function'
  console.log('当前状态：', state)
  // 持久化到 localStorage
  localStorage.setItem('counter', JSON.stringify(state))
})
</script>

<template>
  <p>{{ count }} | 双倍：{{ doubleCount }}</p>
  <button @click="increment">+1</button>
</template>
```

#### 持久化 (pinia-plugin-persist)

```bash
npm install pinia-plugin-persistedstate
```

```ts
// main.ts
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
```

```ts
// stores/settings.ts
import { defineStore } from 'pinia'

export const useSettingsStore = defineStore(
  'settings',
  {
    state: () => ({
      theme: 'light',
      lang: 'zh-CN',
    }),
    // 开启持久化（默认存 localStorage）
    persist: {
      key: 'app-settings',
      // 只持久化部分字段
      pick: ['theme'],
      // 或排除部分字段
      // omit: ['temp'],
    },
  }
)
```

---

## 3. 生命周期

### Vue 2 vs Vue 3 对照表

| Vue 2 | Vue 3 | 说明 |
|------|------|------|
| beforeCreate | - | `setup()` 替代 |
| created | - | `setup()` 替代 |
| beforeMount | onBeforeMount | 挂载前 |
| mounted | onMounted | 挂载后（DOM 可用） |
| beforeUpdate | onBeforeUpdate | 更新前 |
| updated | onUpdated | 更新后 |
| beforeDestroy | onBeforeUnmount | 卸载前（重命名） |
| destroyed | onUnmounted | 卸载后（重命名） |
| errorCaptured | onErrorCaptured | 捕获后代组件错误 |
| renderTracked | onRenderTracked | 调试：追踪渲染依赖 |
| renderTriggered | onRenderTriggered | 调试：触发渲染的依赖变化 |
| activated | onActivated | KeepAlive 激活 |
| deactivated | onDeactivated | KeepAlive 失活 |

### 代码示例

```vue
<script setup lang="ts">
import {
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  onErrorCaptured,
  onActivated,
  onDeactivated,
  ref,
} from 'vue'

const data = ref<string[]>([])

// setup() 本身就相当于 beforeCreate + created
console.log('setup 执行（等同 beforeCreate + created）')

onBeforeMount(() => {
  console.log('组件即将挂载，DOM 还未生成')
})

onMounted(() => {
  console.log('组件已挂载，可以操作 DOM')
  // 常见操作：请求数据、初始化第三方库、添加事件监听
  fetchData()
})

onBeforeUpdate(() => {
  console.log('数据即将更新，DOM 还未变化')
})

onUpdated(() => {
  console.log('DOM 已更新')
})

onBeforeUnmount(() => {
  console.log('组件即将卸载，清理工作放这里')
  // 常见操作：移除事件监听、清除定时器、取消请求
})

onUnmounted(() => {
  console.log('组件已卸载')
})

// 捕获后代组件抛出的错误
onErrorCaptured((err, instance, info) => {
  console.error('捕获到错误：', err)
  console.log('错误来源组件：', instance)
  console.log('错误信息：', info)
  return false // 返回 false 阻止错误继续向上传播
})

// KeepAlive 激活/失活
onActivated(() => {
  console.log('组件被激活（从缓存恢复）')
})

onDeactivated(() => {
  console.log('组件被缓存（未销毁）')
})

async function fetchData() {
  const res = await fetch('/api/data')
  data.value = await res.json()
}
</script>
```

---

## 4. watch / watchEffect

### watch

```vue
<script setup lang="ts">
import { ref, reactive, watch } from 'vue'

// ① 监听 ref
const count = ref(0)
watch(count, (newVal, oldVal) => {
  console.log(`count: ${oldVal} -> ${newVal}`)
})

// ② 监听 reactive 对象（自动深度监听）
const state = reactive({ name: '张三', info: { age: 25 } })
watch(state, (newState) => {
  console.log('state 变化了：', newState)
}) // 默认 deep: true

// ③ 监听 reactive 的某个属性（用 getter 函数）
watch(
  () => state.name,
  (newName, oldName) => {
    console.log(`name: ${oldName} -> ${newName}`)
  }
)

// ④ 监听多个源
const a = ref(1)
const b = ref('hello')
watch(
  [a, b],
  ([newA, newB], [oldA, oldB]) => {
    console.log(`a: ${oldA} -> ${newA}, b: ${oldB} -> ${newB}`)
  }
)

// ⑤ 立即执行（immediate）
watch(
  count,
  (val) => {
    console.log('立即执行，当前值：', val)
  },
  { immediate: true }
)

// ⑥ 深度监听（ref 包装的对象）
const obj = ref({ nested: { value: 1 } })
watch(
  obj,
  (newVal) => {
    console.log('深层变化：', newVal)
  },
  { deep: true }
)

// ⑦ 停止监听
const stop = watch(count, () => {
  console.log('变化了')
})
// 当不再需要时调用
stop()

// ⑧ onCleanup —— 清理上一次的副作用
watch(
  () => state.name,
  async (newName, oldName, onCleanup) => {
    let cancelled = false
    onCleanup(() => {
      cancelled = true // 在下一次 watch 回调执行前调用
    })

    const result = await fetch(`/api/search?q=${newName}`)
    if (!cancelled) {
      console.log(await result.json())
    }
  }
)
</script>
```

### watchEffect

自动收集回调中使用到的响应式依赖，**不需要手动指定监听源**，且**立即执行一次**。

```vue
<script setup lang="ts">
import { ref, watchEffect } from 'vue'

const keyword = ref('')
const result = ref<string[]>([])

// 自动追踪 keyword 的变化
const stop = watchEffect(async (onCleanup) => {
  if (!keyword.value) {
    result.value = []
    return
  }

  const controller = new AbortController()
  onCleanup(() => {
    // 组件卸载或下次执行前，取消上一次请求
    controller.abort()
  })

  const res = await fetch(`/api/search?q=${keyword.value}`, {
    signal: controller.signal,
  })
  result.value = await res.json()
})

// 停止 watchEffect
// stop()
</script>

<template>
  <input v-model="keyword" placeholder="搜索..." />
  <ul>
    <li v-for="item in result" :key="item">{{ item }}</li>
  </ul>
</template>
```

**watch vs watchEffect 对比**：

| 特性 | watch | watchEffect |
|------|-------|-------------|
| 监听源 | 需明确指定 | 自动收集 |
| 初始执行 | 默认不执行 | 立即执行一次 |
| 获取旧值 | 可以 | 不可以 |
| 精确控制 | ✅ | ❌（依赖自动收集） |

---

## 5. computed

### 基本用法

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const price = ref(100)
const quantity = ref(3)

// 只读计算属性
const total = computed(() => price.value * quantity.value)
console.log(total.value) // 300
</script>

<template>
  <p>单价：{{ price }} × 数量：{{ quantity }} = {{ total }}</p>
</template>
```

### 可写计算属性

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const firstName = ref('张')
const lastName = ref('三')

// 可写计算属性
const fullName = computed({
  get() {
    return firstName.value + lastName.value
  },
  set(newValue: string) {
    firstName.value = newValue[0] || ''
    lastName.value = newValue.slice(1)
  },
})

fullName.value = '李四' // firstName = '李', lastName = '四'
</script>
```

### computed vs watch

| 特性 | computed | watch |
|------|----------|-------|
| 用途 | 派生值（有返回值） | 执行副作用（无返回值） |
| 缓存 | ✅ 依赖不变不重新计算 | ❌ 每次触发都执行 |
| 场景 | 模板中多次使用的派生数据 | 数据变化后执行请求、操作 DOM 等 |

---

## 6. nextTick

`nextTick` 等待**下一次 DOM 更新完成后**执行回调。常用于在数据修改后立即获取更新后的 DOM。

```vue
<script setup lang="ts">
import { ref, nextTick } from 'vue'

const msg = ref('初始内容')
const msgRef = ref<HTMLElement | null>(null)

async function updateMsg() {
  msg.value = '更新后的内容'

  // ❌ 此时 DOM 还未更新
  console.log(msgRef.value?.textContent) // '初始内容'

  // ✅ 等待 DOM 更新
  await nextTick()
  console.log(msgRef.value?.textContent) // '更新后的内容'
}

// 回调形式
function updateMsg2() {
  msg.value = '再次更新'
  nextTick(() => {
    // DOM 已更新
    console.log(msgRef.value?.textContent)
  })
}
</script>

<template>
  <p ref="msgRef">{{ msg }}</p>
  <button @click="updateMsg">更新消息</button>
</template>
```

---

## 7. key 的作用

`key` 是 Virtual DOM **diff 算法**的核心标识。Vue 通过 key 判断节点是"同一个"还是"不同的"，从而决定是**复用**还是**销毁重建**。

### 为什么不能用 index 作为 key

当列表发生**插入、删除、排序**时，index 与数据的对应关系会变化，导致：
1. 错误复用 DOM，状态混乱（如 input 内容错位）
2. 性能下降（无法高效 diff）

```vue
<!-- ❌ 错误示范：用 index 作为 key -->
<template>
  <ul>
    <li v-for="(item, index) in list" :key="index">
      <input v-model="item.name" />
      <button @click="list.splice(index, 1)">删除</button>
    </li>
  </ul>
</template>
```

假设列表为 `[{name:'A'}, {name:'B'}, {name:'C'}]`，删除第一项后：
- Vue 认为 key=0 还在（复用了 A 的 input DOM），key=1 还在，key=2 被删
- 实际表现：删除了 C 的 DOM，但 A 的 input 还显示"A"（因为复用了）

```vue
<!-- ✅ 正确示范：用唯一 ID 作为 key -->
<script setup lang="ts">
import { ref } from 'vue'

const list = ref([
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' },
])
</script>

<template>
  <ul>
    <li v-for="item in list" :key="item.id">
      <input v-model="item.name" />
      <button @click="list = list.filter(i => i.id !== item.id)">
        删除
      </button>
    </li>
  </ul>
</template>
```

**规则**：key 必须是**唯一且稳定**的标识（如数据库 ID、UUID），不要用 index。

---

## 8. 组件缓存 KeepAlive

`KeepAlive` 缓存不活跃的组件实例，而非销毁它们，避免重复创建和请求。

### 基本用法

```vue
<template>
  <!-- 缓存所有动态组件 -->
  <KeepAlive>
    <component :is="currentTab" />
  </KeepAlive>
</template>
```

### include / exclude

```vue
<template>
  <!-- 只缓存名字匹配的组件（需要组件有 name） -->
  <KeepAlive include="Home,About">
    <component :is="currentTab" />
  </KeepAlive>

  <!-- 排除某些组件 -->
  <KeepAlive :exclude="['HeavyComponent']">
    <component :is="currentTab" />
  </KeepAlive>

  <!-- 正则匹配 -->
  <KeepAlive :include="/^Base/">
    <component :is="currentTab" />
  </KeepAlive>
</template>
```

### max 最大缓存数

```vue
<template>
  <!-- 最多缓存 5 个组件实例，超出后按 LRU 淘汰 -->
  <KeepAlive :max="5">
    <component :is="currentTab" />
  </KeepAlive>
</template>
```

### activated / deactivated 钩子

```vue
<!-- CachedComponent.vue -->
<script setup lang="ts">
import { onActivated, onDeactivated, ref } from 'vue'

const data = ref<string[]>([])

// 组件从缓存中恢复时调用
onActivated(() => {
  console.log('组件被激活')
  // 每次激活时刷新数据
  fetchData()
})

// 组件进入缓存时调用
onDeactivated(() => {
  console.log('组件被缓存')
  // 可以做一些清理工作（如暂停轮询）
})

async function fetchData() {
  const res = await fetch('/api/data')
  data.value = await res.json()
}
</script>
```

### 配合路由使用

```vue
<!-- App.vue -->
<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <router-view v-slot="{ Component }">
    <KeepAlive :include="['Home', 'About']">
      <component :is="Component" :key="route.fullPath" />
    </KeepAlive>
  </router-view>
</template>
```

---

## 9. Teleport 传送门

将组件的模板内容渲染到 DOM 中的**其他位置**，常用于弹窗、通知、Tooltip 等需要脱离当前层级的场景。

```vue
<script setup lang="ts">
import { ref } from 'vue'

const showModal = ref(false)
</script>

<template>
  <button @click="showModal = true">打开弹窗</button>

  <!-- 内容会被渲染到 body 下，而非当前组件内 -->
  <Teleport to="body">
    <div v-if="showModal" class="modal-overlay" @click="showModal = false">
      <div class="modal-content" @click.stop>
        <h2>弹窗标题</h2>
        <p>这个弹窗通过 Teleport 渲染到 body 下</p>
        <button @click="showModal = false">关闭</button>
      </div>
    </div>
  </Teleport>

  <!-- 使用 CSS 选择器 -->
  <Teleport to="#notifications">
    <div class="toast">这是一条通知</div>
  </Teleport>

  <!-- disabled 属性：条件性禁用传送 -->
  <Teleport to="body" :disabled="!showModal">
    <div v-if="showModal">条件传送</div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  min-width: 300px;
}
</style>
```

---

## 10. 过渡动画

### Transition（单元素/组件过渡）

```vue
<script setup lang="ts">
import { ref } from 'vue'

const show = ref(true)
</script>

<template>
  <button @click="show = !show">切换</button>

  <!-- name 属性会自动生成 .fade-enter-active 等类名 -->
  <Transition name="fade">
    <p v-if="show">我是一个可以淡入淡出的段落</p>
  </Transition>

  <!-- mode: 'out-in' 先出后进，'in-out' 先进后出 -->
  <Transition name="slide" mode="out-in">
    <p v-if="show">内容 A</p>
    <p v-else>内容 B</p>
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

/* slide 滑动过渡 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
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

#### 自定义过渡类名（结合 Animate.css）

```vue
<template>
  <link
    href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
    rel="stylesheet"
  />

  <Transition
    enter-active-class="animate__animated animate__bounceIn"
    leave-active-class="animate__animated animate__bounceOut"
  >
    <p v-if="show">Animate.css 动画</p>
  </Transition>
</template>
```

#### JavaScript 钩子

```vue
<script setup lang="ts">
import { ref } from 'vue'

const show = ref(true)

function onBeforeEnter(el: Element) {
  (el as HTMLElement).style.opacity = '0'
  (el as HTMLElement).style.transform = 'scale(0.5)'
}

function onEnter(el: Element, done: () => void) {
  // 触发 reflow
  ;(el as HTMLElement).offsetHeight
  ;(el as HTMLElement).style.transition = 'all 0.5s ease'
  ;(el as HTMLElement).style.opacity = '1'
  ;(el as HTMLElement).style.transform = 'scale(1)'
  // 动画结束后调用 done
  el.addEventListener('transitionend', done, { once: true })
}

function onAfterEnter(el: Element) {
  console.log('进入动画完成')
}

function onLeave(el: Element, done: () => void) {
  ;(el as HTMLElement).style.transition = 'all 0.3s ease'
  ;(el as HTMLElement).style.opacity = '0'
  ;(el as HTMLElement).style.transform = 'scale(0.8)'
  el.addEventListener('transitionend', done, { once: true })
}
</script>

<template>
  <Transition
    :css="false"
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @leave="onLeave"
  >
    <div v-if="show">JS 控制的过渡</div>
  </Transition>
</template>
```

### TransitionGroup（列表过渡）

```vue
<script setup lang="ts">
import { ref } from 'vue'

const items = ref([
  { id: 1, text: '学习 Vue 3' },
  { id: 2, text: '学习 TypeScript' },
  { id: 3, text: '学习 Vite' },
])

let nextId = 4

function addItem() {
  const index = Math.floor(Math.random() * (items.value.length + 1))
  items.value.splice(index, 0, {
    id: nextId++,
    text: `新任务 ${nextId}`,
  })
}

function removeItem(id: number) {
  items.value = items.value.filter((item) => item.id !== id)
}

function shuffle() {
  items.value.sort(() => Math.random() - 0.5)
}
</script>

<template>
  <button @click="addItem">添加</button>
  <button @click="shuffle">打乱</button>

  <TransitionGroup name="list" tag="ul" move-class="list-move">
    <li v-for="item in items" :key="item.id" class="list-item">
      {{ item.text }}
      <button @click="removeItem(item.id)">删除</button>
    </li>
  </TransitionGroup>
</template>

<style>
.list-item {
  transition: all 0.5s ease;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* 移动动画（FLIP 技术） */
.list-move {
  transition: transform 0.5s ease;
}

/* 确保离开的元素不影响布局 */
.list-leave-active {
  position: absolute;
}
</style>
```

---

## 11. 自定义指令

### 钩子函数

| 钩子 | 调用时机 |
|------|----------|
| created | 元素的 attribute 或事件监听器被应用之前 |
| beforeMount | 元素被插入 DOM 之前 |
| mounted | 元素被插入父 DOM 之后 |
| beforeUpdate | 元素本身更新之前 |
| updated | 元素本身及子元素更新之后 |
| beforeUnmount | 元素被卸载之前 |
| unmounted | 元素被卸载之后 |

### 全局指令

```ts
// main.ts
import { createApp } from 'vue'

const app = createApp(App)

// v-focus —— 自动聚焦
app.directive('focus', {
  mounted(el: HTMLElement) {
    el.focus()
  },
})

app.mount('#app')
```

### 局部指令

```vue
<script setup lang="ts">
import type { Directive } from 'vue'

// v-focus
const vFocus: Directive = {
  mounted(el: HTMLElement) {
    el.focus()
  },
}

// v-loading —— 加载遮罩
const vLoading: Directive<HTMLElement, boolean> = {
  mounted(el, binding) {
    const mask = document.createElement('div')
    mask.className = 'loading-mask'
    mask.innerHTML = '<span>加载中...</span>'
    mask.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.7); z-index: 999;
    `
    el.style.position = 'relative'
    el.appendChild(mask)
    mask.style.display = binding.value ? 'flex' : 'none'
    ;(el as any)._loadingMask = mask
  },
  updated(el, binding) {
    const mask = (el as any)._loadingMask
    if (mask) mask.style.display = binding.value ? 'flex' : 'none'
  },
  unmounted(el) {
    const mask = (el as any)._loadingMask
    if (mask) mask.remove()
  },
}

// v-permission —— 权限控制
const vPermission: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    const userPermissions = ['read', 'write'] // 从 store 获取
    if (!userPermissions.includes(binding.value)) {
      el.parentNode?.removeChild(el)
    }
  },
}

// v-debounce —— 防抖点击
const vDebounce: Directive<HTMLElement, Function> = {
  mounted(el, binding) {
    let timer: ReturnType<typeof setTimeout> | null = null
    const delay = 300

    el.addEventListener('click', () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        binding.value()
      }, delay)
    })
  },
}
</script>

<template>
  <input v-focus placeholder="自动聚焦" />

  <div v-loading="isLoading" style="padding: 20px;">
    内容区域
  </div>

  <button v-permission="'admin'">管理员操作</button>
  <button v-permission="'write'">编辑</button>

  <button v-debounce="handleSubmit">防抖提交</button>
</template>
```

---

## 12. 异步组件

### defineAsyncComponent

```vue
<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'

// 基本用法
const AsyncDialog = defineAsyncComponent(
  () => import('./components/HeavyDialog.vue')
)

// 高级选项
const AsyncHeavy = defineAsyncComponent({
  // 加载函数
  loader: () => import('./components/HeavyChart.vue'),
  // 加载中显示的组件
  loadingComponent: () => import('./components/LoadingSpinner.vue'),
  // 加载失败显示的组件
  errorComponent: () => import('./components/ErrorFallback.vue'),
  // 延迟显示 loading（毫秒，避免闪烁）
  delay: 200,
  // 超时时间（毫秒）
  timeout: 10000,
  // 自定义错误/重试逻辑
  onError(error, retry, fail) {
    if (error.message.includes('fetch')) {
      // 网络错误，重试
      retry()
    } else {
      fail()
    }
  },
})
</script>

<template>
  <AsyncDialog />
  <AsyncHeavy />
</template>
```

### 配合 Suspense 使用

```vue
<script setup lang="ts">
import { ref, defineAsyncComponent } from 'vue'

const AsyncPage = defineAsyncComponent(
  () => import('./views/Dashboard.vue')
)

const error = ref<Error | null>(null)

function onResolve() {
  error.value = null
  console.log('异步组件加载完成')
}

function onFallback() {
  console.log('显示 fallback')
}
</script>

<template>
  <Suspense @resolve="onResolve" @fallback="onFallback">
    <!-- 默认插槽：异步内容 -->
    <template #default>
      <AsyncPage />
    </template>

    <!-- fallback 插槽：加载中 -->
    <template #fallback>
      <div class="loading-container">
        <div class="spinner"></div>
        <p>页面加载中...</p>
      </div>
    </template>
  </Suspense>
</template>
```

---

## 13. 编译优化

### v-once

元素内容**只渲染一次**，后续数据变化不会触发重新渲染。适合静态内容优化。

```vue
<template>
  <!-- 静态标题，不会随数据变化 -->
  <h1 v-once>{{ staticTitle }}</h1>

  <!-- 列表中的不变项 -->
  <ul>
    <li v-for="item in list" :key="item.id">
      <span v-once>{{ item.label }}</span>
      <input v-model="item.value" />
    </li>
  </ul>
</template>
```

### v-memo (3.2+)

缓存模板子树，当指定依赖**没有变化**时跳过该区域的更新，适用于大列表中部分不变项的性能优化。

```vue
<template>
  <div
    v-for="item in list"
    :key="item.id"
    v-memo="[item.selected]"
  >
    <!-- 只有 item.selected 变化时才重新渲染 -->
    <p>{{ item.name }}</p>
    <p :class="{ active: item.selected }">
      {{ item.selected ? '已选中' : '未选中' }}
    </p>
    <!-- 以下复杂计算也会被缓存 -->
    <ComplexComponent :data="item" />
  </div>
</template>
```

**v-memo 与 v-once 的区别**：
- `v-once`：只渲染一次，**永远不更新**
- `v-memo`：依赖变化时会**重新渲染**，依赖不变时跳过

### v-pre

跳过该元素及其子元素的编译，直接输出原始模板语法。

```vue
<template>
  <!-- 输出原始 {{ message }}，不会被编译 -->
  <div v-pre>
    这里不会被编译：{{ message }}
  </div>
</template>
```

---

## 14. 插件与生态

### unplugin-auto-import

自动引入 `vue`、`vue-router`、`@vueuse/core` 等 API，无需手动 `import`。

```bash
npm install -D unplugin-auto-import
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
  plugins: [
    AutoImport({
      // 自动导入的模块
      imports: [
        'vue',
        'vue-router',
        'vue-i18n',
        '@vueuse/core',
        'pinia',
      ],
      // 生成 TypeScript 声明文件
      dts: 'src/auto-imports.d.ts',
      // ESLint 兼容
      eslintrc: {
        enabled: true,
        filepath: './.eslintrc-auto-import.json',
      },
    }),
  ],
})
```

```vue
<!-- 使用后无需 import ref, computed, onMounted 等 -->
<script setup lang="ts">
const count = ref(0) // 自动导入
const double = computed(() => count.value * 2) // 自动导入
const route = useRoute() // vue-router 自动导入

onMounted(() => {
  // 自动导入
  console.log('mounted')
})
</script>
```

### defineOptions (3.3+)

在 `<script setup>` 中设置组件选项（如 `name`、`inheritAttrs`），Vue 3.3+ 内置支持。

```vue
<script setup lang="ts">
// Vue 3.3+ 内置，无需额外插件
defineOptions({
  name: 'MyComponent',
  inheritAttrs: false,
})

// ... 正常写 setup 逻辑
</script>
```

**旧版方案** (Vue 3.3 之前)：

```bash
npm install -D unplugin-vue-define-options
```

```ts
// vite.config.ts
import DefineOptions from 'unplugin-vue-define-options/vite'

export default defineConfig({
  plugins: [DefineOptions()],
})
```

### vite-plugin-vue-setup-extend

在 `<script>` 标签上直接写 `name` 属性。

```bash
npm install -D vite-plugin-vue-setup-extend
```

```ts
// vite.config.ts
import VueSetupExtend from 'vite-plugin-vue-setup-extend'

export default defineConfig({
  plugins: [VueSetupExtend()],
})
```

```vue
<script setup lang="ts" name="UserProfile">
// 组件名为 UserProfile
</script>
```

### VueUse 常用 Hooks

```bash
npm install @vueuse/core
```

#### useStorage（本地存储）

```vue
<script setup lang="ts">
import { useStorage } from '@vueuse/core'

// 自动存取 localStorage，响应式
const theme = useStorage('app-theme', 'light')
const userSettings = useStorage('settings', {
  fontSize: 14,
  lang: 'zh-CN',
})

// 使用 sessionStorage
const tempData = useStorage('temp', null, sessionStorage)

// 删除
theme.value = null // 自动移除 localStorage 中的 key
</script>
```

#### useMouse（鼠标位置）

```vue
<script setup lang="ts">
import { useMouse } from '@vueuse/core'

const { x, y } = useMouse()
</script>

<template>
  <p>鼠标位置：({{ x }}, {{ y }})</p>
</template>
```

#### useFetch（数据请求）

```vue
<script setup lang="ts">
import { useFetch } from '@vueuse/core'
import { ref } from 'vue'

const userId = ref(1)

// 响应式 URL，userId 变化自动重新请求
const { data, error, isFetching, statusCode } = useFetch(
  () => `/api/users/${userId.value}`,
  {
    refetch: true, // URL 变化时自动重新请求
  }
).json()

// POST 请求
const { execute } = useFetch('/api/users', {
  immediate: false, // 不立即执行
}).post({ name: '张三' }).json()
</script>

<template>
  <div v-if="isFetching">加载中...</div>
  <div v-else-if="error">请求失败</div>
  <div v-else>{{ data }}</div>
</template>
```

#### useDebounceFn / useThrottleFn

```vue
<script setup lang="ts">
import { useDebounceFn, useThrottleFn } from '@vueuse/core'
import { ref } from 'vue'

const keyword = ref('')
const result = ref('')

// 防抖：停止输入 500ms 后执行
const debouncedSearch = useDebounceFn(async () => {
  const res = await fetch(`/api/search?q=${keyword.value}`)
  result.value = await res.text()
}, 500)

// 节流：至少间隔 200ms 执行一次
const throttledScroll = useThrottleFn((e: Event) => {
  console.log('滚动位置：', (e.target as HTMLElement).scrollTop)
}, 200)
</script>

<template>
  <input v-model="keyword" @input="debouncedSearch" />
  <div @scroll="throttledScroll">
    <!-- 长列表内容 -->
  </div>
</template>
```

#### useEventListener

```vue
<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { ref } from 'vue'

const target = ref<HTMLElement | null>(null)

// 自动在组件卸载时移除事件监听
useEventListener(window, 'resize', () => {
  console.log('窗口大小：', window.innerWidth, window.innerHeight)
})

useEventListener(target, 'click', (e) => {
  console.log('点击了目标元素', e)
})

// 也支持 MediaQueryList
useEventListener(
  window.matchMedia('(prefers-color-scheme: dark)'),
  'change',
  (e) => {
    console.log('暗色模式：', e.matches)
  }
)
</script>

<template>
  <div ref="target">点击区域</div>
</template>
```

#### useClipboard

```vue
<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { ref } from 'vue'

const source = ref('要复制的文本')
const { text, copy, copied, isSupported } = useClipboard({ source })

async function handleCopy() {
  if (isSupported) {
    await copy(source.value)
    // copied.value 会在 1.5s 后自动变回 false
  }
}
</script>

<template>
  <input v-model="source" />
  <button @click="handleCopy">
    {{ copied ? '已复制 ✓' : '复制' }}
  </button>
  <p>剪贴板内容：{{ text }}</p>
</template>
```

---

## 15. 组件二次封装

### 属性与事件传递 ($attrs)

```vue
<!-- MyButton.vue —— 封装 Element Plus 按钮 -->
<script setup lang="ts">
import { ElButton } from 'element-plus'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <!-- 透传所有未声明的属性和事件 -->
  <ElButton v-bind="$attrs" class="my-button">
    <slot />
  </ElButton>
</template>

<style scoped>
.my-button {
  border-radius: 8px;
}
</style>
```

```vue
<!-- 使用 -->
<template>
  <MyButton type="primary" size="large" @click="handleClick">
    提交
  </MyButton>
</template>
```

### 插槽传递 ($slots 遍历)

```vue
<!-- MyTable.vue —— 封装表格组件 -->
<script setup lang="ts">
import { useSlots } from 'vue'

defineProps<{
  data: any[]
  columns: { prop: string; label: string }[]
}>()

const slots = useSlots()
</script>

<template>
  <table class="my-table">
    <thead>
      <tr>
        <th v-for="col in columns" :key="col.prop">{{ col.label }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, rowIndex) in data" :key="rowIndex">
        <td v-for="col in columns" :key="col.prop">
          <!-- 动态具名插槽传递 -->
          <slot :name="col.prop" :row="row" :index="rowIndex">
            {{ row[col.prop] }}
          </slot>
        </td>
      </tr>
    </tbody>

    <!-- 透传底部插槽 -->
    <tfoot v-if="$slots.footer">
      <slot name="footer" />
    </tfoot>
  </table>
</template>
```

```vue
<!-- 使用 -->
<script setup lang="ts">
const users = [
  { id: 1, name: '张三', role: '管理员' },
  { id: 2, name: '李四', role: '编辑' },
]

const columns = [
  { prop: 'id', label: 'ID' },
  { prop: 'name', label: '姓名' },
  { prop: 'role', label: '角色' },
]
</script>

<template>
  <MyTable :data="users" :columns="columns">
    <!-- 自定义 name 列 -->
    <template #name="{ row }">
      <strong>{{ row.name }}</strong>
    </template>

    <!-- 底部插槽 -->
    <template #footer>
      <tr>
        <td colspan="3">共 {{ users.length }} 条记录</td>
      </tr>
    </template>
  </MyTable>
</template>
```

### ref 暴露

```vue
<!-- MyForm.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const formRef = ref()
const formData = ref({ name: '', email: '' })

async function validate() {
  // 调用底层组件的验证方法
  return await formRef.value?.validate()
}

function resetFields() {
  formData.value = { name: '', email: '' }
  formRef.value?.resetFields()
}

function submit() {
  return formData.value
}

// 暴露方法给父组件
defineExpose({ validate, resetFields, submit, formData })
</script>

<template>
  <form ref="formRef">
    <slot :data="formData" />
  </form>
</template>
```

### v-model 封装 (useVModel composable)

以下是一个基于 `Proxy + WeakMap` 的通用 `useVModel` 封装，适用于任意组件二次封装时双向绑定的需求：

```ts
// composables/useVModel.ts
import { ref, watch, getCurrentInstance } from 'vue'
import type { Ref, UnwrapRef } from 'vue'

/**
 * 通用 useVModel composable
 * 支持 v-model 的双向绑定，适用于组件二次封装
 *
 * @param props - 组件的 props 对象
 * @param key - props 中对应 v-model 的字段名，默认 'modelValue'
 * @param emit - 组件的 emit 函数
 * @returns 一个可双向同步的 ref
 */
export function useVModel<T, K extends keyof T>(
  props: T,
  key: K = 'modelValue' as K,
  emit?: (event: string, ...args: any[]) => void
): Ref<UnwrapRef<T[K]>> {
  // 获取当前组件实例，自动取 emit
  const instance = getCurrentInstance()
  const _emit = emit || instance?.emit

  // 事件名：modelValue -> update:modelValue, value -> update:value
  const eventName = `update:${String(key)}`

  // 创建内部响应式副本
  const internalValue = ref(props[key]) as Ref<UnwrapRef<T[K]>>

  // 监听 props 变化 → 同步到内部值
  watch(
    () => props[key],
    (newVal) => {
      internalValue.value = newVal as UnwrapRef<T[K]>
    }
  )

  // 使用 Proxy 拦截 set 操作，自动触发 emit
  const proxyValue = new Proxy(internalValue, {
    get(target, prop) {
      return Reflect.get(target, prop)
    },
    set(target, prop, value) {
      const result = Reflect.set(target, prop, value)
      if (prop === 'value') {
        _emit?.(eventName, value)
      }
      return result
    },
  })

  return proxyValue as Ref<UnwrapRef<T[K]>>
}

/**
 * WeakMap 缓存版本 —— 避免重复创建 Proxy
 * 适用于同一 props 对象多次调用 useVModel 的场景
 */
const proxyCache = new WeakMap<object, Map<string, Ref>>()

export function useVModelCached<T extends object, K extends keyof T>(
  props: T,
  key: K = 'modelValue' as K,
  emit?: (event: string, ...args: any[]) => void
): Ref<UnwrapRef<T[K]>> {
  const instance = getCurrentInstance()
  const _emit = emit || instance?.emit
  const eventName = `update:${String(key)}`
  const keyStr = String(key)

  // 从缓存中获取
  if (!proxyCache.has(props)) {
    proxyCache.set(props, new Map())
  }
  const cache = proxyCache.get(props)!

  if (cache.has(keyStr)) {
    return cache.get(keyStr)! as Ref<UnwrapRef<T[K]>>
  }

  // 创建新的 proxy
  const internalValue = ref(props[key]) as Ref<UnwrapRef<T[K]>>

  watch(
    () => props[key],
    (newVal) => {
      internalValue.value = newVal as UnwrapRef<T[K]>
    }
  )

  const proxyValue = new Proxy(internalValue, {
    get(target, prop) {
      return Reflect.get(target, prop)
    },
    set(target, prop, value) {
      const result = Reflect.set(target, prop, value)
      if (prop === 'value') {
        _emit?.(eventName, value)
      }
      return result
    },
  }) as Ref<UnwrapRef<T[K]>>

  cache.set(keyStr, proxyValue)
  return proxyValue
}
```

#### 使用示例

```vue
<!-- MyInput.vue —— 封装输入组件 -->
<script setup lang="ts">
import { useVModel } from '@/composables/useVModel'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// 自动同步 v-model
const value = useVModel(props, 'modelValue', emit)
</script>

<template>
  <div class="my-input">
    <input v-model="value" :placeholder="placeholder" />
  </div>
</template>
```

```vue
<!-- MyDialog.vue —— 封装弹窗组件，多个 v-model -->
<script setup lang="ts">
import { useVModel } from '@/composables/useVModel'

const props = defineProps<{
  modelValue: boolean  // v-model
  title: string        // v-model:title
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:title': [value: string]
}>()

const visible = useVModel(props, 'modelValue', emit)
const title = useVModel(props, 'title', emit)

function close() {
  visible.value = false
}
</script>

<template>
  <div v-if="visible" class="dialog-overlay" @click="close">
    <div class="dialog" @click.stop>
      <input v-model="title" class="dialog-title" />
      <slot />
      <button @click="close">关闭</button>
    </div>
  </div>
</template>
```

```vue
<!-- Parent.vue -->
<script setup lang="ts">
import MyInput from './MyInput.vue'
import MyDialog from './MyDialog.vue'
import { ref } from 'vue'

const inputVal = ref('')
const dialogVisible = ref(false)
const dialogTitle = ref('编辑信息')
</script>

<template>
  <MyInput v-model="inputVal" placeholder="请输入" />
  <p>输入值：{{ inputVal }}</p>

  <button @click="dialogVisible = true">打开弹窗</button>
  <MyDialog v-model="dialogVisible" v-model:title="dialogTitle">
    <p>弹窗内容</p>
  </MyDialog>
  <p>弹窗标题：{{ dialogTitle }}</p>
</template>
```

---

## 附录：常用 API 速查

| API | 用途 |
|-----|------|
| `ref()` | 创建响应式引用（基本类型 / 对象） |
| `reactive()` | 创建响应式对象 |
| `computed()` | 计算属性 |
| `watch()` | 侦听特定数据源 |
| `watchEffect()` | 自动追踪依赖的副作用 |
| `provide()` / `inject()` | 跨层级注入 |
| `defineProps()` | 声明组件 Props |
| `defineEmits()` | 声明组件事件 |
| `defineModel()` | 声明 v-model（3.4+） |
| `defineExpose()` | 暴露组件内部 |
| `defineOptions()` | 设置组件选项（3.3+） |
| `defineSlots()` | 声明插槽类型（3.3+） |
| `onMounted()` 等 | 生命周期钩子 |
| `nextTick()` | DOM 更新后回调 |
| `toRef()` / `toRefs()` | 保持响应式的解构 |
| `shallowRef()` / `shallowReactive()` | 浅层响应式 |
| `readonly()` | 只读代理 |
| `triggerRef()` | 手动触发 shallowRef 更新 |
| `customRef()` | 自定义 ref 逻辑 |
| `markRaw()` | 标记对象不被代理 |
| `toRaw()` | 获取响应式对象的原始值 |
