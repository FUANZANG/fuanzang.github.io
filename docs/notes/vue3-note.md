# Vue 3 笔记

> 📌 Vue 2 Options API 相关内容请查看 [Vue 2 笔记](/notes/vue2-note)

<!-- 本文件记录 Vue 3 Composition API 的核心概念、实战技巧与常用代码 -->

---

## 1. 响应式核心

### 响应式原理：Object.defineProperty vs Proxy

Vue 2 和 Vue 3 的响应式系统实现方式完全不同，这直接决定了两个版本的 API 设计和使用限制。

#### Vue 2：Object.defineProperty

```javascript
// Vue 2 的响应式实现原理
function defineReactive(obj, key, val) {
  const dep = new Dep() // 每个属性一个依赖收集器
  
  Object.defineProperty(obj, key, {
    get() {
      if (Dep.target) {
        dep.depend() // 收集依赖
      }
      return val
    },
    set(newVal) {
      if (newVal === val) return
      val = newVal
      dep.notify() // 通知更新
    }
  })
}

// 递归遍历对象所有属性
function observe(obj) {
  if (typeof obj !== 'object' || obj === null) return
  
  Object.keys(obj).forEach(key => {
    defineReactive(obj, key, obj[key])
    // 递归处理嵌套对象
    observe(obj[key])
  })
}
```

**Vue 2 的限制：**

```javascript
// ❌ 无法检测新增属性
this.obj.newProp = 'value' // 不触发更新
this.$set(this.obj, 'newProp', 'value') // 必须用 $set

// ❌ 无法检测删除属性
delete this.obj.prop // 不触发更新
this.$delete(this.obj, 'prop') // 必须用 $delete

// ❌ 数组修改检测不完整
this.arr[0] = 'new' // 不触发更新
this.arr.length = 0 // 不触发更新
this.$set(this.arr, 0, 'new') // 必须用 $set
// 或重写数组方法（Vue 2 hack 了 push/pop/shift/unshift/splice/sort/reverse）

// ❌ 初始化时性能问题
// 必须递归遍历对象所有属性，一次性全部转为响应式
// 即使某些属性永远不会被访问，也会被处理
```

#### Vue 3：Proxy

```javascript
// Vue 3 的响应式实现原理
function reactive(target) {
  const handler = {
    get(target, key, receiver) {
      track(target, key) // 收集依赖
      const result = Reflect.get(target, key, receiver)
      // 懒代理：访问时才递归处理嵌套对象
      if (typeof result === 'object' && result !== null) {
        return reactive(result)
      }
      return result
    },
    
    set(target, key, value, receiver) {
      const oldValue = target[key]
      const result = Reflect.set(target, key, value, receiver)
      
      if (oldValue !== value) {
        trigger(target, key) // 触发更新
      }
      return result
    },
    
    deleteProperty(target, key) {
      const hadKey = hasOwn(target, key)
      const result = Reflect.deleteProperty(target, key)
      
      if (hadKey && result) {
        trigger(target, key) // 删除属性也触发更新
      }
      return result
    }
  }
  
  return new Proxy(target, handler)
}
```

**Vue 3 的优势：**

```javascript
// ✅ 自动检测新增属性
this.obj.newProp = 'value' // 自动触发更新

// ✅ 自动检测删除属性
delete this.obj.prop // 自动触发更新

// ✅ 完整支持数组
this.arr[0] = 'new' // 自动触发更新
this.arr.length = 0 // 自动触发更新
this.arr.push(1) // 自动触发更新

// ✅ 懒代理，性能更好
// 只有在访问某个属性时才会将其转为响应式
// 未访问的属性不会被处理

// ✅ 支持 Map/Set/WeakMap 等集合类型
const map = reactive(new Map())
map.set('key', 'value') // 自动触发更新
```

#### 对比总结

| 对比项 | Vue 2 (Object.defineProperty) | Vue 3 (Proxy) |
|--------|------------------------------|---------------|
| **实现方式** | 逐个属性定义 getter/setter | 整个对象代理 |
| **新增属性** | 不支持，需 `$set` | 自动检测 |
| **删除属性** | 不支持，需 `$delete` | 自动检测 |
| **数组索引修改** | 不支持，需 `$set` | 自动检测 |
| **数组 length 修改** | 不支持 | 自动检测 |
| **数组方法** | hack 了 7 个变异方法 | 全部原生支持 |
| **Map/Set** | 不支持 | 完整支持 |
| **初始化性能** | 递归遍历所有属性（慢） | 懒代理，按需处理（快） |
| **内存占用** | 每个属性一个 Dep 实例 | 全局 WeakMap 存储依赖 |
| **嵌套对象** | 初始化时全部递归代理 | 访问时才代理（懒代理） |
| **深层对象性能** | 初始化慢，更新快 | 初始化快，更新也快 |

**核心区别图示：**

```
Vue 2: 对象 → 递归遍历 → 每个属性定义 getter/setter → 依赖收集在 Dep
        ↓
        新增属性？→ 必须手动 $set（重新定义 getter/setter）
        
Vue 3: 对象 → Proxy 代理整个对象 → 拦截 get/set/deleteProperty
        ↓
        新增属性？→ 自动触发 set 拦截器
        ↓
        访问嵌套对象？→ 访问时才创建新的 Proxy（懒代理）
```

> 💡 **为什么 Vue 2 要用 `$set`？** 因为 `Object.defineProperty` 只能对已存在的属性定义 getter/setter，无法拦截对象的新增和删除操作。Vue 3 的 Proxy 是 ES6 标准 API，能拦截对象的所有操作，所以不再需要 `$set`。

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

## 8. Virtual DOM Diff 算法对比

Vue 2 和 Vue 3 的 diff 算法实现完全不同，Vue 3 在性能上有显著提升。

### Vue 2：双端比较 (基于 snabbdom)

Vue 2 的 diff 算法基于 **snabbdom** 库改造，采用**双端比较**策略。

#### 核心思路

同时从新旧列表的**头尾**开始比较，有 4 个指针：

```
旧列表: [A, B, C, D]
        ↑        ↑
      oldStart  oldEnd

新列表: [A, B, C, D]
        ↑        ↑
      newStart  newEnd
```

#### 四种比较

```javascript
// 四种比较方式（按优先级）
1. oldStart vs newStart  // 头头比较
2. oldEnd vs newEnd      // 尾尾比较
3. oldStart vs newEnd    // 头尾比较（oldStart 移到尾部）
4. oldEnd vs newStart    // 尾头比较（oldEnd 移到头部）

// 如果四种都不匹配，用 key 去 Map 里查找
```

#### 代码实现

```javascript
// Vue 2 的 updateChildren 核心逻辑
function updateChildren(parentElm, oldCh, newCh) {
  let oldStartIdx = 0, oldEndIdx = oldCh.length - 1
  let newStartIdx = 0, newEndIdx = newCh.length - 1
  
  let oldStartVnode = oldCh[0]
  let oldEndVnode = oldCh[oldEndIdx]
  let newStartVnode = newCh[0]
  let newEndVnode = newCh[newEndIdx]
  
  // 建立 key → index 的 Map（用于四种比较都不匹配时的查找）
  let oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
  
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    if (oldStartVnode == null) {
      oldStartVnode = oldCh[++oldStartIdx]
    } else if (oldEndVnode == null) {
      oldEndVnode = oldCh[--oldEndIdx]
    }
    // 四种比较
    else if (sameVnode(oldStartVnode, newStartVnode)) {
      patchVnode(oldStartVnode, newStartVnode)
      oldStartVnode = oldCh[++oldStartIdx]
      newStartVnode = newCh[++newStartIdx]
    } else if (sameVnode(oldEndVnode, newEndVnode)) {
      patchVnode(oldEndVnode, newEndVnode)
      oldEndVnode = oldCh[--oldEndIdx]
      newEndVnode = newCh[--newEndIdx]
    } else if (sameVnode(oldStartVnode, newEndVnode)) {
      patchVnode(oldStartVnode, newEndVnode)
      // oldStart 移到 oldEnd 后面
      parentElm.insertBefore(oldStartVnode.elm, oldEndVnode.elm.nextSibling)
      oldStartVnode = oldCh[++oldStartIdx]
      newEndVnode = newCh[--newEndIdx]
    } else if (sameVnode(oldEndVnode, newStartVnode)) {
      patchVnode(oldEndVnode, newStartVnode)
      // oldEnd 移到 oldStart 前面
      parentElm.insertBefore(oldEndVnode.elm, oldStartVnode.elm)
      oldEndVnode = oldCh[--oldEndIdx]
      newStartVnode = newCh[++newStartIdx]
    } else {
      // 四种都不匹配，用 key 去 Map 查找
      let idxInOld = oldKeyToIdx[newStartVnode.key]
      if (idxInOld === undefined) {
        // 新节点，创建 DOM
        createElm(newStartVnode)
      } else {
        // 找到了，移动 DOM
        let vnodeToMove = oldCh[idxInOld]
        patchVnode(vnodeToMove, newStartVnode)
        oldCh[idxInOld] = undefined // 标记已处理
        parentElm.insertBefore(vnodeToMove.elm, oldStartVnode.elm)
      }
      newStartVnode = newCh[++newStartIdx]
    }
  }
  
  // 处理剩余节点
  if (oldStartIdx > oldEndIdx) {
    // 新节点多，插入
    addVnodes(parentElm, newCh, newStartIdx, newEndIdx)
  } else if (newStartIdx > newEndIdx) {
    // 旧节点多，删除
    removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
  }
}
```

#### 性能特点

- **时间复杂度**：O(n)，但实际移动次数可能不是最优
- **适用场景**：头尾变化较多时性能好（如列表头部插入、尾部删除）
- **问题**：某些情况下（如列表中间大量移动），会产生不必要的 DOM 操作

---

### Vue 3：快速 diff (最长递增子序列)

Vue 3 完全重写了 diff 算法，采用**快速 diff** 策略，基于**最长递增子序列 (LIS)** 算法。

#### 核心思路

```
1. 预处理：去掉新旧列表头尾相同的部分
2. 对中间剩余部分用 key 建立 Map
3. 遍历新列表，找出每个节点在旧列表中的位置
4. 用 LIS 算法找出最长递增子序列（不需要移动的节点）
5. 只移动不在 LIS 中的节点（最少移动次数）
```

#### 代码实现

```javascript
// Vue 3 的 patchKeyedChildren 核心逻辑
function patchKeyedChildren(c1, c2, container) {
  // 1. 预处理：去掉头尾相同的部分
  let i = 0, e1 = c1.length - 1, e2 = c2.length - 1
  
  // 从头部开始，跳过相同的前缀
  while (i <= e1 && i <= e2) {
    if (isSameVNodeType(c1[i], c2[i])) {
      patch(c1[i], c2[i], container)
    } else {
      break
    }
    i++
  }
  
  // 从尾部开始，跳过相同的后缀
  while (i <= e1 && i <= e2) {
    if (isSameVNodeType(c1[e1], c2[e2])) {
      patch(c1[e1], c2[e2], container)
    } else {
      break
    }
    e1--
    e2--
  }
  
  // 2. 处理中间不同的部分
  if (i > e1) {
    // 新节点多，插入
    mountChildren(c2.slice(i, e2 + 1), container)
  } else if (i > e2) {
    // 旧节点多，删除
    unmountChildren(c1.slice(i, e1 + 1))
  } else {
    // 中间部分需要 diff
    const s1 = i, s2 = i
    const keyToNewIndexMap = new Map()
    
    // 建立新列表的 key → index Map
    for (let j = s2; j <= e2; j++) {
      keyToNewIndexMap.set(c2[j].key, j)
    }
    
    // 遍历旧列表，找出需要删除/更新的节点
    const newIndexToOldIndexMap = new Array(e2 - s2 + 1).fill(0)
    let maxNewIndexSoFar = 0
    
    for (let j = s1; j <= e1; j++) {
      const prevChild = c1[j]
      const newIndex = keyToNewIndexMap.get(prevChild.key)
      
      if (newIndex === undefined) {
        // 旧节点在新列表中不存在，删除
        unmount(prevChild)
      } else {
        // 记录新旧索引关系（+1 避免 0 被当作未设置）
        newIndexToOldIndexMap[newIndex - s2] = j + 1
        maxNewIndexSoFar = Math.max(maxNewIndexSoFar, newIndex)
        patch(prevChild, c2[newIndex], container)
      }
    }
    
    // 3. 用 LIS 算法找出最长递增子序列
    const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap)
    let j = increasingNewIndexSequence.length - 1
    
    // 4. 从后往前遍历，移动或插入节点
    for (let k = newIndexToOldIndexMap.length - 1; k >= 0; k--) {
      const newIndex = k + s2
      const newChild = c2[newIndex]
      
      if (newIndexToOldIndexMap[k] === 0) {
        // 新节点，插入
        insert(newChild.el, container, c2[newIndex + 1]?.el)
      } else if (j < 0 || k !== increasingNewIndexSequence[j]) {
        // 不在 LIS 中，需要移动
        insert(newChild.el, container, c2[newIndex + 1]?.el)
      } else {
        // 在 LIS 中，不需要移动
        j--
      }
    }
  }
}

// 最长递增子序列算法 (LIS)
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
      // 二分查找
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
  
  // 回溯找出完整序列
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  
  return result
}
```

#### 性能特点

- **时间复杂度**：O(n log n)（LIS 用二分查找）
- **实际性能**：移动次数最少，DOM 操作更精准
- **适用场景**：任何列表操作（插入、删除、排序、移动）都能高效处理
- **优势**：即使列表中间大量移动，也能算出最优解

---

### 对比总结

| 对比项 | Vue 2 (双端比较) | Vue 3 (快速 diff) |
|--------|-----------------|------------------|
| **算法** | snabbdom 改造的双端比较 | 基于最长递增子序列 (LIS) |
| **核心思路** | 头尾四指针同时比较 | 预处理 + LIS 最少移动 |
| **时间复杂度** | O(n) | O(n log n) |
| **移动次数** | 可能不是最优 | **保证最少** |
| **性能** | 头尾变化时快 | 任意位置变化都快 |
| **代码复杂度** | 中等 | 较高（LIS 算法） |
| **静态优化** | 无 | 编译时标记动态节点，跳过静态对比 |

### 举例说明性能差异

假设列表从 `[A, B, C, D, E]` 变为 `[B, A, D, C, E]`（B 和 A 交换，D 和 C 交换）：

**Vue 2 双端比较：**
```
旧: [A, B, C, D, E]
新: [B, A, D, C, E]

1. A vs B ✗ (头头)
2. E vs E ✓ (尾尾) → patch E
3. A vs C ✗ (头尾)
4. E vs D ✗ (尾头)
5. 用 key 查找，移动 B 到头部
6. 继续比较...

实际 DOM 操作：移动 B、移动 D（共 2 次移动）
```

**Vue 3 快速 diff：**
```
旧: [A, B, C, D, E]
新: [B, A, D, C, E]

1. 预处理：E 相同，跳过
2. 中间部分：旧 [A, B, C, D]，新 [B, A, D, C]
3. 建立 Map，找出位置关系：[2, 1, 4, 3]
4. LIS 算法：最长递增子序列是 [1, 3]（即 A 和 C）
5. 只移动不在 LIS 中的节点：B 和 D

实际 DOM 操作：移动 B、移动 D（共 2 次移动）
```

这个例子两者移动次数相同，但在更复杂的场景（如列表倒序），Vue 3 的优势更明显：

**列表倒序 `[A, B, C, D]` → `[D, C, B, A]`：**

- **Vue 2**：移动 D、移动 C、移动 B（3 次移动）
- **Vue 3**：LIS 找出最长递增子序列是任意一个元素（如 A），只移动其他 3 个（3 次移动）

两者移动次数相同，但 Vue 3 的 LIS 算法能保证**理论最优解**。

---

### Vue 3 的编译优化

Vue 3 不仅在运行时 diff 算法上优化，还在**编译时**做了大量静态分析：

#### PatchFlag 标记

```vue
<template>
  <div class="static">
    <p>{{ dynamicText }}</p>
    <span>静态文本</span>
    <p :class="dynamicClass">动态 class</p>
  </div>
</template>

<!-- 编译后 -->
<div class="static">
  <p>{{ dynamicText }}<!-- PatchFlag: TEXT --></p>
  <span>静态文本<!-- 无 PatchFlag，跳过 --></span>
  <p :class="dynamicClass"><!-- PatchFlag: CLASS --></p>
</div>
```

**PatchFlag 类型：**
```javascript
const PatchFlags = {
  TEXT: 1,        // 动态文本
  CLASS: 2,       // 动态 class
  STYLE: 4,       // 动态 style
  PROPS: 8,       // 动态属性
  FULL_PROPS: 16, // 有 key 的动态属性
  HYDRATE_EVENTS: 32, // 有事件监听
  STABLE_FRAGMENT: 64, // 稳定的 Fragment
  KEYED_FRAGMENT: 128, // 有 key 的 Fragment
  UNKEYED_FRAGMENT: 256, // 无 key 的 Fragment
  NEED_PATCH: 512, // 需要 patch
  DYNAMIC_SLOTS: 1024, // 动态插槽
}
```

#### 静态提升 (Static Hoisting)

```vue
<template>
  <div>
    <p>静态文本 1</p>
    <p>静态文本 2</p>
    <p>{{ dynamicText }}</p>
  </div>
</template>

<!-- 编译后（静态节点提升到外部，只创建一次） -->
const _hoisted_1 = createVNode("p", null, "静态文本 1")
const _hoisted_2 = createVNode("p", null, "静态文本 2")

function render(_ctx) {
  return createVNode("div", null, [
    _hoisted_1,
    _hoisted_2,
    createVNode("p", null, _ctx.dynamicText)
  ])
}
```

#### 树摇优化 (Tree-shaking)

Vue 3 的编译输出支持 tree-shaking，未使用的 API 不会被打包：

```javascript
// 源码
import { ref, computed, watch } from 'vue'

// 如果只用了 ref，编译后只包含 ref 相关代码
// computed 和 watch 的实现会被 tree-shaking 移除
```

---

### 性能提升总结

| 优化点 | Vue 2 | Vue 3 | 提升 |
|--------|-------|-------|------|
| **diff 算法** | 双端比较 O(n) | 快速 diff (LIS) | 移动次数最少 |
| **静态分析** | 无 | PatchFlag 标记 | 跳过静态节点对比 |
| **静态提升** | 无 | 静态节点只创建一次 | 减少 VNode 创建 |
| **Tree-shaking** | 不支持 | 完整支持 | 包体积更小 |
| **内存占用** | 较高 | 降低 ~56% | 更省内存 |
| **初始渲染** | 较慢 | 提升 ~55% | 更快首屏 |
| **更新性能** | 较慢 | 提升 ~133% | 更新更快 |

> 💡 **Vue 3 的 diff 优化是多层面的**：不仅有运行时算法优化（LIS），还有编译时静态分析（PatchFlag、静态提升），两者结合才实现了显著的性能提升。

---

## 9. 组件缓存 KeepAlive

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

## 10. Teleport 传送门

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

## 11. 过渡动画

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

## 12. 自定义指令

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

## 13. 异步组件

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

## 14. 编译优化

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

## 15. 插件与生态

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

## 16. 组件二次封装

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

## 17. Vue 3.3~3.5 新特性

> Vue 3 在 3.3、3.4、3.5 版本中引入了多个实用新特性，按版本整理如下。

### 版本速查

| 特性 | 引入版本 | 稳定版本 |
|------|---------|---------|
| `defineSlots()` | 3.3 | 3.3 |
| `defineOptions()` | 3.3 | 3.3 |
| 泛型组件 | 3.3 | 3.3 |
| `toValue()` | 3.3 | 3.3 |
| `defineModel()` | 3.3 (实验) | **3.4** |
| `v-bind` 简写 | 3.4 | 3.4 |
| `useTemplateRef()` | 3.4 (实验) | **3.5** |
| `useId()` | 3.4 (实验) | **3.5** |
| 响应式 Props 解构 | 3.3 (实验) | **3.5** |
| `onWatcherCleanup()` | 3.5 | 3.5 |
| 延迟 Teleport | 3.5 | 3.5 |

### useTemplateRef() (3.5+)

显式声明模板 ref，比传统的 `ref(null)` + 同名变量方式更安全、更清晰。

```vue
<template>
  <input ref="inputRef" />
  <MyComp ref="compRef" />
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'

// ✅ 3.5+ 推荐写法 — 类型安全，明确绑定
const input = useTemplateRef<HTMLInputElement>('inputRef')
const comp = useTemplateRef<InstanceType<typeof MyComp>>('compRef')

onMounted(() => {
  input.value?.focus()
  comp.value?.someMethod()
})
</script>
```

```vue
<!-- ❌ 旧写法 — 变量名必须和 ref 属性名一致，容易出错 -->
<script setup>
import { ref } from 'vue'
const inputRef = ref(null) // 变量名必须叫 inputRef
onMounted(() => {
  inputRef.value?.focus()
})
</script>
```

> 💡 `useTemplateRef` 返回的是 `ShallowRef`，只在 ref 绑定的 DOM/组件变化时更新，不会追踪内部属性变化。

### useId() (3.5+)

生成 SSR 安全的唯一 ID，主要用于无障碍 (a11y) 场景。

```vue
<template>
  <label :for="id">用户名</label>
  <input :id="id" type="text" />
</template>

<script setup lang="ts">
import { useId } from 'vue'

const id = useId()
// 输出类似: "v-0"  "v-1" 等，SSR 和客户端保证一致
</script>
```

+ 解决 SSR 水合 (hydration) 时 ID 不匹配的问题
+ 每个组件实例有独立 ID，不同实例之间不冲突
+ 常用于 `aria-labelledby`、`aria-describedby` 等无障碍属性

### defineSlots() (3.3+)

在 `<script setup>` 中声明插槽类型，提供 IDE 提示和类型检查。

```vue
<script setup lang="ts">
// 声明插槽类型 — 父组件使用插槽时会有类型提示
defineSlots<{
  default(props: { item: string; index: number }): any
  header(): any
  footer(props: { total: number }): any
}>()
</script>

<template>
  <div class="card">
    <div class="card-header">
      <slot name="header" />
    </div>
    <div class="card-body">
      <slot item="hello" :index="0" />
    </div>
    <div class="card-footer">
      <slot name="footer" :total="100" />
    </div>
  </div>
</template>
```

```vue
<!-- 父组件使用时，IDE 会提示可用的插槽名和传入的数据类型 -->
<Card>
  <template #header>
    <h2>标题</h2>
  </template>
  <template #default="{ item, index }">
    <p>{{ item }} - {{ index }}</p>
  </template>
  <template #footer="{ total }">
    <span>共 {{ total }} 条</span>
  </template>
</Card>
```

### 泛型组件 (3.3+)

组件支持 TypeScript 泛型，实现类型安全的数据传递。

```vue
<!-- GenericList.vue -->
<script setup lang="ts" generic="T">
defineProps<{
  items: T[]
}>()

defineSlots<{
  default(props: { item: T; index: number }): any
}>()
</script>

<template>
  <ul>
    <li v-for="(item, index) in items" :key="index">
      <slot :item="item" :index="index" />
    </li>
  </ul>
</template>
```

```vue
<!-- 父组件使用时，TypeScript 会自动推断 item 类型 -->
<GenericList :items="users">
  <template #default="{ item }">
    <!-- item 自动推断为 User 类型 -->
    <span>{{ item.name }}</span>
    <span>{{ item.email }}</span>
  </template>
</GenericList>

<script setup lang="ts">
interface User { name: string; email: string }
const users = ref<User[]>([
  { name: '芥末', email: 'jiemo@example.com' }
])
</script>
```

### 响应式 Props 解构 (3.5+)

直接在 `<script setup>` 中解构 props，解构出的变量保持响应式。

```vue
<script setup lang="ts">
// ✅ 3.5+ 推荐 — 解构后仍是响应式的，还能设默认值
const { count = 0, msg = 'hello' } = defineProps<{
  count?: number
  msg?: string
}>()

// 直接使用，不需要 props.count
watch(() => count, (newVal) => {
  console.log('count changed:', newVal)
})
</script>

<template>
  <p>{{ count }} - {{ msg }}</p>
</template>
```

```vue
<!-- ❌ 3.4 及之前 — 解构会丢失响应式 -->
<script setup>
const props = defineProps(['count', 'msg'])
// 必须用 props.count 访问，不能解构
</script>
```

> ⚠️ 注意：解构出的变量是只读的（单向绑定），不要直接修改。如需双向绑定用 `defineModel()`。

### v-bind 简写 (3.4+)

当属性名和变量名相同时，可以省略值。

```vue
<script setup>
import { ref } from 'vue'
const id = ref('my-input')
const title = ref('请输入')
const disabled = ref(false)
</script>

<template>
  <!-- ✅ 3.4+ 简写 -->
  <input :id :title :disabled />
  <!-- 等价于 -->
  <input :id="id" :title="title" :disabled="disabled" />
</template>
```

> 💡 和 JS 对象简写 `{ id }` 等价于 `{ id: id }` 一样的思路。

### onWatcherCleanup() (3.5+)

watcher 清理函数，在 watcher 重新执行或停止时调用，替代 `onCleanup` 回调参数。

```vue
<script setup lang="ts">
import { watch, onWatcherCleanup, ref } from 'vue'

const id = ref(1)

watch(id, async (newId) => {
  const controller = new AbortController()

  // 注册清理函数 — 在下次 watch 触发前 或 watch 停止时调用
  onWatcherCleanup(() => {
    controller.abort()
  })

  // 发起请求
  const res = await fetch(`/api/data/${newId}`, {
    signal: controller.signal
  })
  const data = await res.json()
  console.log(data)
})
</script>
```

```js
// ❌ 旧写法 — 通过 watch 的第三个参数 onCleanup
watch(id, async (newId, oldId, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  // ...
})

// ✅ 3.5+ 新写法 — onWatcherCleanup 可以在 watch 回调内的任意位置调用
```

> 💡 `onWatcherCleanup` 的好处是可以在异步函数中使用（旧写法必须在同步调用时注册 `onCleanup`）。

### 延迟 Teleport (3.5+)

`<Teleport defer>` 延迟目标解析，解决挂载顺序问题。

```vue
<!-- 场景：弹窗内容要 teleport 到一个容器，但该容器在弹窗之后才渲染 -->

<!-- ❌ 普通 Teleport — 如果 #modal-container 还没挂载，会报错 -->
<Teleport to="#modal-container">
  <div class="modal">弹窗内容</div>
</Teleport>

<!-- ✅ 3.5+ defer — 等整个应用挂载完再解析目标 -->
<Teleport defer to="#modal-container">
  <div class="modal">弹窗内容</div>
</Teleport>
```

> 适用场景：嵌套组件中，子组件的 Teleport 目标由父组件或其他兄弟组件渲染。

### toValue() (3.3+)

通用值提取工具 — 同时支持 ref 和 getter 函数的解包。

```js
import { ref, toValue } from 'vue'

const count = ref(1)
const doubled = () => count.value * 2

// toValue 可以处理三种情况：
toValue(count)    // → 1（解包 ref）
toValue(doubled)  // → 2（执行 getter 函数）
toValue(42)       // → 42（普通值直接返回）
```

```js
// 实用场景：写 composable 时，参数既接受 ref 也接受普通值
function useDouble(source) {
  return computed(() => toValue(source) * 2)
}

const a = useDouble(ref(5))     // computed → 10
const b = useDouble(() => 10)   // computed → 20
const c = useDouble(3)          // computed → 6
```

> 💡 `toValue` 是 `unref` 的增强版，`unref` 只处理 ref，`toValue` 还处理 getter 函数。VueUse 的很多 API 都用了这个模式（`MaybeRefOrGetter` 类型）。

---

## 18. Composables 设计模式

Composable（组合式函数）是 Vue 3 中复用逻辑的核心方式，替代了 Vue 2 的 mixins。写好一个 composable 需要注意以下设计原则。

### 命名规范

```javascript
// ✅ 以 use 开头，表明这是一个 composable
useMouse()
useStorage()
useFetch()
useClipboard()

// ❌ 不要以 get/set/is/has 开头（这些是普通函数）
getMouse()    // 暗示一次性获取
setStorage()  // 暗示设置操作
```

### 基本结构

```javascript
// composables/useMouse.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  // 1. 声明响应式状态
  const x = ref(0)
  const y = ref(0)

  // 2. 定义内部逻辑
  function update(event: MouseEvent) {
    x.value = event.pageX
    y.value = event.pageY
  }

  // 3. 生命周期管理（在 composable 内部处理）
  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  // 4. 返回状态和方法（ref 保持响应式）
  return { x, y }
}
```

### 参数设计：支持 ref 和普通值

```javascript
import { ref, computed, toValue, type MaybeRefOrGetter } from 'vue'

// ✅ 参数用 MaybeRefOrGetter，灵活接受 ref / getter / 普通值
export function useDouble(source: MaybeRefOrGetter<number>) {
  return computed(() => toValue(source) * 2)
}

// 三种调用方式都可以
const a = useDouble(ref(5))      // 响应式
const b = useDouble(() => 10)    // getter
const c = useDouble(3)           // 普通值
```

### 返回值设计

```javascript
// 返回多个值时，返回对象（方便解构 + 命名清晰）
export function useToggle(initialValue = false) {
  const state = ref(initialValue)
  const toggle = () => { state.value = !state.value }
  const setTrue = () => { state.value = true }
  const setFalse = () => { state.value = false }

  return { state, toggle, setTrue, setFalse }
}

// 使用时
const { state: isOpen, toggle: toggleDialog } = useToggle()
```

### 异步 Composable

```javascript
import { ref, watch, type Ref } from 'vue'

export function useFetch<T>(url: MaybeRefOrGetter<string>) {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<Error | null>(null)
  const loading = ref(false)

  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(toValue(url))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      data.value = await res.json()
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      loading.value = false
    }
  }

  // 监听 url 变化自动重新请求
  watch(() => toValue(url), fetchData, { immediate: true })

  // 暴露 refetch 方法
  return { data, error, loading, refetch: fetchData }
}
```

### 可组合的 Composable

```javascript
// useWindowFocus.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useWindowFocus() {
  const focused = ref(document.hasFocus())

  function onFocus() { focused.value = true }
  function onBlur() { focused.value = false }

  onMounted(() => {
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
  })
  onUnmounted(() => {
    window.removeEventListener('focus', onFocus)
    window.removeEventListener('blur', onBlur)
  })

  return { focused }
}

// useActiveUser.ts — 组合其他 composable
import { computed, watch } from 'vue'
import { useWindowFocus } from './useWindowFocus'

export function useActiveUser(userId: Ref<string>) {
  const { focused } = useWindowFocus()
  const { data: user, loading } = useFetch<User>(
    () => `/api/users/${userId.value}`
  )

  // 只有窗口聚焦时才标记为活跃
  const isActive = computed(() => focused.value && !!user.value)

  return { user, loading, isActive }
}
```

### 实战：useLocalStorage

```javascript
import { ref, watch, type Ref } from 'vue'

export function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
  // 读取初始值
  const stored = localStorage.getItem(key)
  const data = ref<T>(
    stored ? JSON.parse(stored) : defaultValue
  ) as Ref<T>

  // 监听变化自动写入
  watch(data, (val) => {
    localStorage.setItem(key, JSON.stringify(val))
  }, { deep: true })

  return data
}

// 使用
const theme = useLocalStorage('theme', 'light')
theme.value = 'dark' // 自动写入 localStorage
```

### 设计检查清单

| 检查项 | 说明 |
|--------|------|
| 命名以 `use` 开头 | `useXxx()` 格式 |
| 内部管理生命周期 | `onMounted` / `onUnmounted` 在 composable 内处理 |
| 参数接受 `MaybeRefOrGetter` | 用 `toValue()` 解包，灵活性高 |
| 返回 ref（不是 reactive） | 方便解构不丢响应式 |
| 返回值用对象 | 命名清晰，支持解构重命名 |
| 处理副作用清理 | 事件监听、定时器在 `onUnmounted` 中清理 |
| 提供 TypeScript 类型 | 导出类型，使用时有完整提示 |

---

## 19. 错误处理

Vue 3 提供了多层错误捕获机制，从组件级到全局级层层兜底。

### app.config.errorHandler — 全局错误捕获

```javascript
// main.ts
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

// 捕获所有未处理的组件错误（渲染、事件、生命周期、setup 等）
app.config.errorHandler = (err, instance, info) => {
  console.error('全局错误:', err)
  console.log('出错组件:', instance?.$options?.name)
  console.log('错误信息:', info)
  // info 可能是：
  // 'render function'
  // 'watcher callback'
  // 'setup function'
  // 'mounted hook'
  // 'component event handler'
  // 等等
  
  // 上报到监控平台（如 Sentry）
  // Sentry.captureException(err, { extra: { info } })
}

app.mount('#app')
```

### onErrorCaptured — 组件级错误捕获

```vue
<!-- ErrorBoundary.vue -->
<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const error = ref<Error | null>(null)

// 捕获所有子组件的错误
onErrorCaptured((err: Error, instance, info: string) => {
  error.value = err
  console.error('子组件错误:', err, info)
  
  // 返回 false 阻止错误继续向上传播
  return false
  // 返回 true（默认）或不返回，错误会继续冒泡到父组件
})
</script>

<template>
  <div v-if="error" class="error-fallback">
    <p>出错了：{{ error.message }}</p>
    <button @click="error = null">重试</button>
  </div>
  <slot v-else />
</template>
```

```vue
<!-- 使用 ErrorBoundary -->
<template>
  <ErrorBoundary>
    <MyComponent />
  </ErrorBoundary>
</template>
```

### ErrorBoundary 完整组件

```vue
<!-- ErrorBoundary.vue — 生产级封装 -->
<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

interface Props {
  fallbackText?: string
  maxRetries?: number
}

const props = withDefaults(defineProps<Props>(), {
  fallbackText: '组件加载失败',
  maxRetries: 3,
})

const emit = defineEmits<{
  error: [error: Error, info: string]
}>()

const error = ref<Error | null>(null)
const retryCount = ref(0)

onErrorCaptured((err: Error, _instance, info: string) => {
  error.value = err
  emit('error', err, info)
  return false // 阻止冒泡
})

function retry() {
  retryCount.value++
  if (retryCount.value <= props.maxRetries) {
    error.value = null
  }
}
</script>

<template>
  <div v-if="error">
    <slot name="fallback" :error="error" :retry="retry">
      <!-- 默认 fallback UI -->
      <div class="error-boundary">
        <p>{{ fallbackText }}</p>
        <p class="error-msg">{{ error.message }}</p>
        <button v-if="retryCount < maxRetries" @click="retry">
          重试 ({{ retryCount }}/{{ maxRetries }})
        </button>
      </div>
    </slot>
  </div>
  <slot v-else />
</template>
```

```vue
<!-- 使用 -->
<ErrorBoundary @error="handleError" :max-retries="5">
  <template #fallback="{ error, retry }">
    <div>
      <p>自定义错误 UI: {{ error.message }}</p>
      <button @click="retry">重新加载</button>
    </div>
  </template>
  <RiskyComponent />
</ErrorBoundary>
```

### app.config.warnHandler — 全局警告捕获

```javascript
// 捕获 Vue 的运行时警告
app.config.warnHandler = (msg, instance, trace) => {
  // 开发环境打印，生产环境上报
  if (import.meta.env.DEV) {
    console.warn(`[Vue warn]: ${msg}${trace}`)
  }
}
```

### Promise 错误处理

```javascript
// Vue 的错误处理器不会捕获 Promise 的未处理拒绝
// 需要单独处理
window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的 Promise 拒绝:', event.reason)
  // event.preventDefault() // 阻止默认行为
})

// 在组件中处理异步错误
async function loadData() {
  try {
    const res = await fetch('/api/data')
    data.value = await res.json()
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(String(err))
  }
}
```

### 错误处理层级

```
组件内 try/catch          ← 最细粒度，推荐异步操作使用
    ↓ 未捕获
onErrorCaptured           ← 组件级，捕获子组件错误
    ↓ return true
app.config.errorHandler   ← 全局级，兜底捕获
    ↓ 未处理
window.onerror            ← 浏览器原生错误
```

---

## 20. Render 函数 / h()

当 `<template>` 无法满足需求时（如高度动态的组件结构），可以使用 render 函数直接操作 VNode。

### 基本用法

```vue
<!-- 模板写法 -->
<template>
  <h1 class="title">{{ title }}</h1>
</template>

<!-- render 函数等价写法 -->
<script setup lang="ts">
import { h } from 'vue'

defineProps<{ title: string }>()

// render 函数接收 props
// <script setup> 中最后一个导出的函数自动作为 render
</script>

<script lang="ts">
export default {
  setup(props) {
    return () => h('h1', { class: 'title' }, props.title)
  }
}
</script>
```

### h() 函数签名

```javascript
import { h } from 'vue'

// h(type, props?, children?)

// 基本元素
h('div')                                    // <div></div>
h('div', { id: 'app' })                     // <div id="app"></div>
h('div', { id: 'app' }, 'hello')            // <div id="app">hello</div>
h('div', { id: 'app' }, ['hello', 'world']) // 多个子节点
h('div', null, [                            // 嵌套
  h('span', 'child 1'),
  h('span', 'child 2'),
])

// 组件
import MyComp from './MyComp.vue'
h(MyComp, { msg: 'hello' })
h(MyComp, { msg: 'hello', onClick: handler })

// Fragment（无包裹元素）
import { Fragment } from 'vue'
h(Fragment, null, [
  h('p', 'first'),
  h('p', 'second'),
])
```

### 实战：动态标题级别

```vue
<!-- DynamicHeading.vue -->
<script lang="ts">
import { defineComponent, h } from 'vue'

export default defineComponent({
  props: {
    level: {
      type: Number,
      default: 1,
      validator: (v: number) => v >= 1 && v <= 6,
    },
  },
  setup(props, { slots }) {
    return () =>
      h(
        `h${props.level}`,
        { class: `heading-${props.level}` },
        slots.default?.()
      )
  },
})
</script>
```

```vue
<!-- 使用 -->
<DynamicHeading :level="3">三级标题</DynamicHeading>
<!-- 渲染为 <h3 class="heading-3">三级标题</h3> -->
```

### 实战：递归树组件

```vue
<!-- TreeView.vue -->
<script lang="ts">
import { defineComponent, h, type PropType } from 'vue'

interface TreeNode {
  label: string
  children?: TreeNode[]
}

export default defineComponent({
  name: 'TreeView', // 递归组件必须有 name
  props: {
    nodes: {
      type: Array as PropType<TreeNode[]>,
      required: true,
    },
  },
  setup(props) {
    return () =>
      h('ul', { class: 'tree-view' },
        props.nodes.map((node) =>
          h('li', [
            h('span', { class: 'tree-label' }, node.label),
            // 递归渲染子节点
            node.children?.length
              ? h(TreeView, { nodes: node.children })
              : null,
          ])
        )
      )
  },
})
</script>
```

### 插槽在 render 函数中的使用

```javascript
setup(props, { slots }) {
  return () => h('div', { class: 'card' }, [
    // 具名插槽
    h('header', slots.header?.()),
    // 默认插槽
    h('main', slots.default?.()),
    // 作用域插槽
    h('footer', slots.footer?.({ total: 100 })),
  ])
}
```

### resolveComponent / resolveDirective

```javascript
import { h, resolveComponent, resolveDirective, withDirectives } from 'vue'

setup() {
  return () => {
    // 解析已注册的组件
    const MyButton = resolveComponent('MyButton')
    
    // 解析指令
    const vLoading = resolveDirective('loading')
    
    // 使用 withDirectives 应用指令
    return withDirectives(
      h(MyButton, { onClick: handler }, '提交'),
      [[vLoading, true]] // [[directive, value, argument, modifiers]]
    )
  }
}
```

### 什么时候用 render 函数？

| 场景 | 推荐方式 |
|------|---------|
| 常规页面/组件 | `<template>` |
| 动态标签名 (`h1`~`h6`) | render 函数 |
| 递归树形结构 | render 函数 |
| 高度动态的 UI 库（如 Table 列） | render 函数 |
| 简单的条件渲染 | `<template>` + `v-if` |

> 💡 **原则：能用 template 就用 template**。render 函数灵活但牺牲了可读性和编译时优化。VueUse 和 Element Plus 的底层组件会用 render，业务代码尽量用 template。

---

## 21. Vue 3 + TypeScript 类型技巧

### 组件实例类型

```typescript
import { ref } from 'vue'
import MyComponent from './MyComponent.vue'

// 获取组件实例类型
type MyComponentInstance = InstanceType<typeof MyComponent>

// 用于 template ref
const compRef = ref<MyComponentInstance | null>(null)

// 使用时有完整的类型提示
compRef.value?.someMethod()
compRef.value?.someProperty
```

### Props 类型

```typescript
// 方式一：运行时声明（有类型校验）
const props = defineProps({
  name: { type: String, required: true },
  count: { type: Number, default: 0 },
  items: { type: Array as PropType<string[]>, default: () => [] },
})

// 方式二：类型声明（推荐，更简洁）
interface Props {
  name: string
  count?: number
  items?: string[]
}
const props = withDefaults(defineProps<Props>(), {
  count: 0,
  items: () => [],
})

// 方式三：3.5+ 响应式解构
const { name, count = 0, items = [] } = defineProps<{
  name: string
  count?: number
  items?: string[]
}>()
```

### Emits 类型

```typescript
// 类型声明（推荐）
const emit = defineEmits<{
  change: [value: string]
  submit: [data: { name: string; age: number }]
  'update:modelValue': [value: boolean]
}>()

emit('change', 'new value')      // ✅ 类型安全
emit('change', 123)              // ❌ 类型错误
emit('submit', { name: '芥末', age: 25 }) // ✅
```

### defineModel 类型

```typescript
// 基本类型
const model = defineModel<string>()  // Ref<string | undefined>

// 带默认值
const model = defineModel<string>({ default: '' }) // Ref<string>

// 具名 model
const title = defineModel<string>('title')
const visible = defineModel<boolean>('visible', { default: false })

// 自定义 modifier
const model = defineModel<string, 'trim' | 'capitalize'>()
// model 的类型: { trim: boolean, capitalize: boolean }
```

### provide / inject 类型

```typescript
import type { InjectionKey, Ref } from 'vue'

// 定义类型安全的 InjectionKey
export const UserKey: InjectionKey<Ref<User>> = Symbol('user')
export const ThemeKey: InjectionKey<'light' | 'dark'> = Symbol('theme')

// provide — 类型安全
provide(UserKey, ref<User>({ name: '芥末' }))
provide(ThemeKey, 'dark')

// inject — 自动推断类型
const user = inject(UserKey)     // Ref<User> | undefined
const theme = inject(ThemeKey)   // 'light' | 'dark' | undefined

// 带默认值
const theme = inject(ThemeKey, 'light') // 'light' | 'dark'
```

### Composable 返回类型

```typescript
import type { Ref, ComputedRef } from 'vue'

// 明确声明返回类型
interface UseFetchReturn<T> {
  data: Ref<T | null>
  error: Ref<Error | null>
  loading: Ref<boolean>
  refetch: () => Promise<void>
}

export function useFetch<T>(url: string): UseFetchReturn<T> {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(false)

  async function refetch() {
    // ...
  }

  return { data, error, loading, refetch }
}
```

### 泛型组件

```vue
<!-- DataTable.vue -->
<script setup lang="ts" generic="T extends Record<string, any>">
interface Props {
  data: T[]
  columns: (keyof T)[]
}

defineProps<Props>()

defineSlots<{
  default(props: { row: T; index: number }): any
  header(props: { column: keyof T }): any
}>()
</script>

<template>
  <table>
    <thead>
      <tr>
        <th v-for="col in columns" :key="String(col)">
          <slot name="header" :column="col">{{ String(col) }}</slot>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, index) in data" :key="index">
        <td v-for="col in columns" :key="String(col)">
          <slot :row="row" :index="index">{{ row[col] }}</slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>
```

```vue
<!-- 使用时自动推断 T 的类型 -->
<DataTable :data="users" :columns="['name', 'email']">
  <template #default="{ row }">
    <!-- row 自动推断为 User 类型 -->
    {{ row.name }}
  </template>
</DataTable>
```

### 常用工具类型

```typescript
import type { ComponentPublicInstance, Ref, ComputedRef, MaybeRefOrGetter } from 'vue'

// ComponentPublicInstance — 组件公共实例类型
type MyCompInstance = ComponentPublicInstance<typeof MyComponent>

// MaybeRefOrGetter — composable 参数常用
type Source<T> = MaybeRefOrGetter<T> // Ref<T> | (() => T) | T

// UnwrapRef — 解包 ref 类型
type Unwrapped = UnwrapRef<Ref<string>> // string

// ExtractPropTypes — 从 props 定义提取类型
const propsDefinition = {
  name: { type: String, required: true as const },
  count: { type: Number, default: 0 },
}
type Props = ExtractPropTypes<typeof propsDefinition>
// { name: string; count: number }
```

### TS 常见问题速查

```typescript
// ❌ 问题：ref 的类型推断不对
const list = ref([]) // Ref<never[]>

// ✅ 解决：显式声明类型
const list = ref<string[]>([])
const list = ref([] as string[])

// ❌ 问题：reactive 数组类型推断
const arr = reactive([]) // never[]

// ✅ 解决：声明类型
const arr = reactive<string[]>([])

// ❌ 问题：模板 ref 可能为 null
const inputRef = ref<HTMLInputElement | null>(null)
inputRef.value.focus() // 报错：可能为 null

// ✅ 解决：可选链
inputRef.value?.focus()

// ❌ 问题：props 解构丢响应式（3.4 及以下）
const { msg } = defineProps(['msg'])
watch(msg, () => {}) // 不触发

// ✅ 解决（3.5+）：直接用解构
// ✅ 解决（3.4 及以下）：用 toRefs
const props = defineProps(['msg'])
const { msg } = toRefs(props)
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
| `toValue()` | 解包 ref / getter 函数（3.3+） |
| `useTemplateRef()` | 显式声明模板 ref（3.5+） |
| `useId()` | SSR 安全唯一 ID（3.5+） |
| `defineSlots()` | 声明插槽类型（3.3+） |
| `onWatcherCleanup()` | watcher 清理函数（3.5+） |
