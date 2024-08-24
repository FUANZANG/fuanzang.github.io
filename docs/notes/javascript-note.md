# JavaScript Note

[JavaScript 教程](https://wangdoc.com/javascript/)

## 数据类型与类型转换

### 原始类型与引用类型

7 种原始类型：`string`、`number`、`boolean`、`null`、`undefined`、`symbol`、`bigint`

引用类型：`Object`、`Array`、`Function`、`Date`、`RegExp`、`Map`、`Set` 等

```js
// 原始类型按值传递，引用类型按引用传递
let a = 1
let b = a
b = 2 // a 仍为 1

let obj1 = { x: 1 }
let obj2 = obj1
obj2.x = 2 // obj1.x 也变为 2
```

### typeof 的坑

```js
typeof null        // 'object'（历史遗留 bug）
typeof function(){} // 'function'（规范特殊处理）
typeof []          // 'object'
typeof undefined   // 'undefined'
```

### instanceof 原理

沿原型链查找，检查构造函数的 `prototype` 是否出现在实例的 `__proto__` 链上：

```js
function myInstanceof(left, right) {
  let proto = Object.getPrototypeOf(left)
  while (proto) {
    if (proto === right.prototype) return true
    proto = Object.getPrototypeOf(proto)
  }
  return false
}
```

### 隐式类型转换规则

| 转换目标 | 规则示例 |
|---------|---------|
| ToBoolean | `''`→false, `0`→false, `null`→false, `undefined`→false, `NaN`→false，其余→true |
| ToNumber | `true`→1, `false`→0, `''`→0, `'123'`→123, `null`→0, `undefined`→NaN |
| ToString | `null`→'null', `undefined`→'undefined', `[]`→'', `[1,2]`→'1,2' |

### == vs ===

```js
// == 会进行隐式转换，=== 不会
[] == false    // true  → [].toString()===''→''==0→0==0
null == undefined // true（规范特殊规定）
'0' == false   // true  → '0'→0→0==0
NaN == NaN     // false（NaN 不等于任何值）
0 == ''        // true
0 == '0'       // true
```

## 作用域与闭包

### 作用域层级

- **全局作用域**：顶层声明的变量
- **函数作用域**：`var` 声明的变量，函数内可见
- **块级作用域**：`let`/`const` 声明的变量，`{}` 内可见

### 作用域链查找

从当前作用域逐级向上查找，直到全局作用域：

```js
var x = 10
function outer() {
  var y = 20
  function inner() {
    var z = 30
    console.log(x + y + z) // 沿作用域链找到 x, y, z
  }
  inner()
}
```

### 闭包定义与原理

闭包 = 函数 + 其引用的词法环境。内部函数持有对外部变量的引用。

```js
function createCounter() {
  let count = 0
  return {
    increment() { return ++count },
    getCount() { return count }
  }
}
const counter = createCounter()
counter.increment() // 1
counter.getCount()  // 1
```

### 闭包应用场景

**数据私有化：**
```js
function createWallet(initial) {
  let balance = initial
  return {
    deposit(amount) { balance += amount },
    getBalance() { return balance }
  }
}
```

**函数柯里化：**
```js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn(...args)
    return (...args2) => curried(...args, ...args2)
  }
}
const add = curry((a, b, c) => a + b + c)
add(1)(2)(3) // 6
```

**防抖与节流：**
```js
function debounce(fn, delay) {
  let timer
  return function(...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}
```

### 闭包内存泄漏风险

闭包会阻止被引用变量的垃圾回收，需注意：
- 及时将不用的闭包引用设为 `null`
- 避免在循环中创建大量闭包
- DOM 引用导致的循环引用（老版本 IE）

## this 指向

### 4 种绑定规则

| 规则 | 触发条件 | this 指向 |
|------|---------|----------|
| 默认绑定 | 独立函数调用 | 非严格模式→window，严格模式→undefined |
| 隐式绑定 | `obj.fn()` | 调用点的前一个对象 `obj` |
| 显式绑定 | `fn.call(obj)` | 传入的对象 `obj` |
| new 绑定 | `new Fn()` | 新创建的实例对象 |

```js
function greet() { console.log(this.name) }
const user = { name: 'Alice', greet }

greet()          // 默认绑定 → undefined (或 window.name)
user.greet()     // 隐式绑定 → 'Alice'
greet.call(user) // 显式绑定 → 'Alice'
new greet()      // new 绑定 → 新实例
```

### call / apply / bind 区别

```js
fn.call(ctx, arg1, arg2)      // 立即执行，逐个传参
fn.apply(ctx, [arg1, arg2])   // 立即执行，数组传参
const bound = fn.bind(ctx)     // 返回新函数，不立即执行
```

### 箭头函数的 this

箭头函数没有自己的 `this`，继承外层词法作用域的 `this`：

```js
const obj = {
  name: 'Bob',
  greet: () => console.log(this.name),  // this 指向外层（window/module）
  greet2() {
    const inner = () => console.log(this.name) // this → obj
    inner()
  }
}
```

### this 丢失的常见坑

```js
const obj = {
  name: 'Alice',
  getName() { return this.name }
}

// 坑1：赋值丢失
const fn = obj.getName
fn() // undefined（默认绑定）

// 坑2：回调丢失
setTimeout(obj.getName, 100) // undefined

// 解决方案：bind 或箭头函数
setTimeout(obj.getName.bind(obj), 100)
setTimeout(() => obj.getName(), 100)
```

## 原型与原型链

### 三角关系

```
实例对象.__proto__  →  构造函数.prototype
构造函数.prototype.constructor  →  构造函数
实例对象.constructor  →  构造函数（通过原型链）
```

```js
function Person(name) { this.name = name }
const p = new Person('Tom')

p.__proto__ === Person.prototype         // true
Person.prototype.constructor === Person  // true
p.constructor === Person                 // true（沿原型链找到）
```

### 原型链查找机制

访问属性时，沿 `__proto__` 链逐级查找，直到 `null`：

```js
p.name        // 实例自身
p.toString()  // 实例没有 → Person.prototype 没有 → Object.prototype 找到
p.xxx         // 整条链都没有 → undefined
```

### Object.create() vs new

```js
// Object.create：纯原型继承，不执行构造函数
const proto = { greet() { return 'hi' } }
const obj = Object.create(proto)

// new：执行构造函数 + 设置原型
function Fn() { this.x = 1 }
const inst = new Fn() // 执行了 Fn 内部代码
```

### 继承的实现方式

```js
// ES6 class（推荐）
class Animal {
  constructor(name) { this.name = name }
  speak() { return `${this.name} makes a sound` }
}
class Dog extends Animal {
  speak() { return `${this.name} barks` }
}

// 组合继承（ES5）
function Parent(name) { this.name = name }
Parent.prototype.sayName = function() { return this.name }
function Child(name, age) {
  Parent.call(this, name)  // 继承属性
  this.age = age
}
Child.prototype = Object.create(Parent.prototype)
Child.prototype.constructor = Child
```

### hasOwnProperty vs in

```js
const obj = { a: 1 }
obj.hasOwnProperty('a')        // true（仅检查自身）
obj.hasOwnProperty('toString') // false
'a' in obj                     // true（自身+原型链）
'toString' in obj              // true（原型链上有）
```

## 执行上下文与变量提升

### 执行上下文栈（EC Stack）

```
[ 全局执行上下文 ]          ← 栈底
[ foo() 执行上下文 ]
[ bar() 执行上下文 ]        ← 栈顶（当前执行）
```

每次函数调用创建新的执行上下文压栈，执行完毕出栈。

### 变量提升：var vs let/const

```js
console.log(a) // undefined（var 提升声明，但不提升赋值）
var a = 1

console.log(b) // ReferenceError: Cannot access 'b' before initialization
let b = 2      // TDZ（暂时性死区）

console.log(c) // ReferenceError（const 同样有 TDZ）
const c = 3
```

### 函数声明 vs 函数表达式

```js
// 函数声明：整体提升（声明+定义）
hoisted() // ✅ 可以调用
function hoisted() { return 'ok' }

// 函数表达式：仅 var 提升变量名，值为 undefined
notHoisted() // ❌ TypeError: notHoisted is not a function
var notHoisted = function() { return 'ok' }
```

### 经典题目

```js
var a = 1
function foo() {
  console.log(a) // undefined（局部 var a 提升，遮蔽外层）
  var a = 2
}
foo()

// 等价于：
function foo() {
  var a       // 提升
  console.log(a) // undefined
  a = 2
}
```

## Promise 深入

### 状态机

```
pending → fulfilled（成功，不可变）
pending → rejected（失败，不可变）
```

状态一旦变更不可逆转，且只能变更一次。

### 链式调用原理

`.then()` 始终返回一个新的 Promise：

```js
Promise.resolve(1)
  .then(v => v + 1)    // 返回 Promise<2>
  .then(v => v * 3)    // 返回 Promise<6>
  .then(v => console.log(v)) // 6
```

### 常用组合方法

```js
// Promise.all：全部成功才成功，任一失败即失败（并发请求）
Promise.all([fetchA(), fetchB()]).then(([a, b]) => { /* 并行结果 */ })

// Promise.race：取最快完成的结果（超时控制）
Promise.race([fetchData(), timeout(5000)])

// Promise.allSettled：等待全部完成，不短路
Promise.allSettled([api1(), api2()]).then(results => {
  results.forEach(r => console.log(r.status, r.value || r.reason))
})

// Promise.any：任一成功即成功，全部失败才失败
Promise.any([cdn1(), cdn2(), cdn3()]).then(fastest => {})
```

### async/await 错误处理

```js
// try/catch 方式
async function loadUser() {
  try {
    const res = await fetch('/api/user')
    const data = await res.json()
    return data
  } catch (err) {
    console.error('加载失败', err)
  }
}

// wrapper 函数方式（避免 try/catch 嵌套）
function to(promise) {
  return promise.then(data => [null, data]).catch(err => [err, null])
}
const [err, data] = await to(fetch('/api/user'))
if (err) return handleError(err)
```

### 常见反模式

```js
// ❌ 嵌套地狱（失去 Promise 链的优势）
getUser().then(user => {
  getOrders(user.id).then(orders => {
    getDetails(orders[0].id).then(details => { /* ... */ })
  })
})

// ✅ 链式调用
const user = await getUser()
const orders = await getOrders(user.id)
const details = await getDetails(orders[0].id)

// ❌ 忘记 await（返回 Promise 而非值）
async function bad() {
  const data = fetch('/api') // 没有 await！
  return data.json() // data 是 Promise，不是 Response
}
```

## 事件循环深入

### 宏任务与微任务的执行顺序

JavaScript 的事件循环中，任务被分为两类：**宏任务（Macrotask）** 和 **微任务（Microtask）**。

- **宏任务**：`setTimeout`、`setInterval`、I/O、UI 渲染、`setImmediate`（Node.js）
- **微任务**：`Promise.then/catch/finally`、`MutationObserver`、`queueMicrotask()`、`process.nextTick`（Node.js）

**执行顺序规则**：
1. 执行当前同步代码（属于第一个宏任务）
2. 同步代码执行完毕后，清空所有微任务队列
3. 执行一个宏任务
4. 再次清空所有微任务队列
5. 如此循环

### 浏览器事件循环流程

```
┌─────────────────────────────┐
│   执行全局同步代码（宏任务）    │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│   检查微任务队列是否为空？     │
│   不为空 → 依次执行所有微任务   │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│   是否需要 UI 渲染？           │
│   是 → 执行渲染              │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│   从宏任务队列取出一个任务执行  │
└──────────────┬──────────────┘
               ↓
           回到微任务检查...
```

### 经典面试题

```js
console.log('1')

setTimeout(() => {
  console.log('2')
  Promise.resolve().then(() => console.log('3'))
}, 0)

Promise.resolve().then(() => {
  console.log('4')
  setTimeout(() => console.log('5'), 0)
}).then(() => console.log('6'))

console.log('7')

// 输出顺序：1 → 7 → 4 → 6 → 2 → 3 → 5
```

**解析**：
1. 同步代码先执行：输出 `1`、`7`
2. 微任务队列：`Promise.then` 回调输出 `4`，产生新的 `then` 和 `setTimeout`
3. 继续清空微任务：输出 `6`
4. 宏任务：`setTimeout` 回调输出 `2`，产生微任务
5. 清空微任务：输出 `3`
6. 下一个宏任务：输出 `5`

### 浏览器 vs Node.js 事件循环差异

| 特性 | 浏览器 | Node.js（libuv） |
|------|--------|-----------------|
| 宏任务队列 | 单队列 | 多个阶段（timers、poll、check 等） |
| 微任务执行时机 | 每个宏任务后 | 每个阶段切换时及回调执行后 |
| `process.nextTick` | 无 | 优先级高于其他微任务 |
| `setImmediate` | 无 | 在 check 阶段执行 |
| `setTimeout(fn, 0)` | 最小 4ms 延迟 | 在 timers 阶段执行，无最小延迟限制 |

## 深拷贝实现

### structuredClone()（现代浏览器原生方案，推荐）

```js
const original = {
  name: '张三',
  date: new Date(),
  regex: /hello/gi,
  nested: { arr: [1, 2, { a: 3 }] },
  map: new Map([['key', 'value']]),
  set: new Set([1, 2, 3]),
}

// 原生深拷贝，支持大多数内置类型
const cloned = structuredClone(original)

console.log(cloned.date instanceof Date) // true
console.log(cloned.map instanceof Map)   // true
console.log(cloned.nested === original.nested) // false（完全独立）

// 支持循环引用
const obj = { a: 1 }
obj.self = obj
const clonedObj = structuredClone(obj)
console.log(clonedObj.self === clonedObj) // true
```

> **注意**：`structuredClone()` 不能拷贝函数、DOM 节点、Symbol、以及某些特殊对象（如 `WeakMap`）。

### 手写递归深拷贝（处理循环引用）

```js
function deepClone(obj, cache = new WeakMap()) {
  // 基本类型和 null 直接返回
  if (obj === null || typeof obj !== 'object') return obj

  // 处理循环引用
  if (cache.has(obj)) return cache.get(obj)

  // 处理特殊类型
  if (obj instanceof Date) return new Date(obj)
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags)
  if (obj instanceof Map) {
    const map = new Map()
    cache.set(obj, map)
    obj.forEach((val, key) => map.set(deepClone(key, cache), deepClone(val, cache)))
    return map
  }
  if (obj instanceof Set) {
    const set = new Set()
    cache.set(obj, set)
    obj.forEach(val => set.add(deepClone(val, cache)))
    return set
  }

  // 处理数组和普通对象
  const clone = Array.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj))
  cache.set(obj, clone)

  for (const key of Reflect.ownKeys(obj)) {
    clone[key] = deepClone(obj[key], cache)
  }

  return clone
}

// 使用示例
const original = { a: 1, b: { c: 2 } }
original.b.self = original.b // 循环引用
const cloned = deepClone(original)
console.log(cloned.b.self === cloned.b) // true
console.log(cloned.b === original.b) // false
```

### JSON.parse(JSON.stringify()) 的局限性

| 问题 | 示例 |
|------|------|
| 无法处理 `undefined` | `{ a: undefined }` → `{}` |
| 无法处理函数 | `{ fn: () => {} }` → `{}` |
| 无法处理 `Symbol` | `{ [Symbol()]: 1 }` → `{}` |
| `Date` 变成字符串 | `{ d: new Date() }` → `{ d: "2024-..." }` |
| `RegExp` 变成空对象 | `{ r: /abc/ }` → `{ r: {} }` |
| 无法处理循环引用 | 直接报错 `TypeError` |
| `NaN`/`Infinity` 变成 `null` | `{ n: NaN }` → `{ n: null }` |

**解决方案**：优先使用 `structuredClone()`，需要兼容旧环境时使用手写递归深拷贝。

## 迭代器与生成器

### Symbol.iterator 协议

```js
// 内置可迭代对象：Array、Map、Set、String、arguments、NodeList
const arr = [1, 2, 3]
const iterator = arr[Symbol.iterator]()

console.log(iterator.next()) // { value: 1, done: false }
console.log(iterator.next()) // { value: 2, done: false }
console.log(iterator.next()) // { value: 3, done: false }
console.log(iterator.next()) // { value: undefined, done: true }
```

### 可迭代协议 vs 迭代器协议

| 协议 | 要求 | 用途 |
|------|------|------|
| **可迭代协议** | 对象实现 `[Symbol.iterator]()` 方法，返回一个迭代器 | 能被 `for...of` 遍历 |
| **迭代器协议** | 对象实现 `next()` 方法，返回 `{ value, done }` | 定义遍历的具体行为 |

```js
// 自定义可迭代对象
const range = {
  from: 1,
  to: 5,
  [Symbol.iterator]() {
    let current = this.from
    const last = this.to
    return {
      next() {
        return current <= last
          ? { value: current++, done: false }
          : { value: undefined, done: true }
      }
    }
  }
}

for (const num of range) {
  console.log(num) // 1, 2, 3, 4, 5
}
```

### for...of 原理

```js
// for...of 内部等价于：
const arr = ['a', 'b', 'c']
const iterator = arr[Symbol.iterator]()

while (true) {
  const { value, done } = iterator.next()
  if (done) break
  console.log(value)
}
```

### Generator 函数基础

```js
function* fibonacci() {
  let a = 0, b = 1
  while (true) {
    yield a;
    [a, b] = [b, a + b]
  }
}

const fib = fibonacci()
console.log(fib.next().value) // 0
console.log(fib.next().value) // 1
console.log(fib.next().value) // 1
console.log(fib.next().value) // 2
console.log(fib.next().value) // 3

// 传值与返回值
function* calculator() {
  const x = yield '请输入 x'
  const y = yield '请输入 y'
  return x + y
}

const calc = calculator()
console.log(calc.next())      // { value: '请输入 x', done: false }
console.log(calc.next(10))    // { value: '请输入 y', done: false }
console.log(calc.next(20))    // { value: 30, done: true }
```

### Generator 应用场景（异步流程控制）

```js
// 用 Generator 实现异步流程控制（类 co 库原理）
function co(genFn) {
  const gen = genFn()
  return new Promise((resolve, reject) => {
    function step(arg) {
      let result
      try {
        result = gen.next(arg)
      } catch (e) {
        return reject(e)
      }
      if (result.done) return resolve(result.value)
      Promise.resolve(result.value).then(step, reject)
    }
    step()
  })
}

// 使用
co(function* () {
  const user = yield fetch('/api/user').then(r => r.json())
  const posts = yield fetch(`/api/posts?uid=${user.id}`).then(r => r.json())
  console.log(user, posts)
  return posts
}).then(posts => console.log('完成', posts))
```

## 错误处理

### try/catch/finally

```js
function parseJSON(str) {
  try {
    return JSON.parse(str)
  } catch (error) {
    console.error('解析失败:', error.message)
    return null
  } finally {
    // 无论成功与否都会执行
    console.log('解析操作结束')
  }
}

// try/catch 只能捕获同步错误和 async/await 中的异步错误
// 无法捕获：setTimeout 回调中的错误、未处理的 Promise 异常
```

### Error 类型体系

| 类型 | 触发场景 | 示例 |
|------|----------|------|
| `Error` | 基类，通用错误 | `new Error('出错了')` |
| `TypeError` | 值类型不符合预期 | `null.foo`、`undefined()` |
| `RangeError` | 值超出有效范围 | `new Array(-1)`、递归爆栈 |
| `SyntaxError` | 代码语法错误 | `eval('{')` |
| `ReferenceError` | 引用未定义变量 | `console.log(xyz)` |
| `URIError` | URI 处理函数参数错误 | `decodeURIComponent('%')` |
| `EvalError` | `eval()` 使用错误（现代已少见） | 保留用于向后兼容 |

```js
try {
  null.toString()
} catch (e) {
  console.log(e instanceof TypeError) // true
  console.log(e.name)    // "TypeError"
  console.log(e.message) // "Cannot read properties of null"
  console.log(e.stack)   // 完整的调用栈信息
}
```

### 自定义 Error 类

```js
class ValidationError extends Error {
  constructor(message, field) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

// 使用
function validateAge(age) {
  if (typeof age !== 'number') {
    throw new ValidationError('年龄必须是数字', 'age')
  }
  if (age < 0 || age > 150) {
    throw new ValidationError('年龄超出范围', 'age')
  }
}

try {
  validateAge('abc')
} catch (e) {
  if (e instanceof ValidationError) {
    console.log(`字段 ${e.field} 校验失败: ${e.message}`)
  }
}
```

### 全局错误捕获

```js
// 浏览器 - 捕获同步错误和异步错误（setTimeout 等）
window.onerror = function(message, source, lineno, colno, error) {
  console.log('全局捕获:', message, error?.stack)
  // 上报错误到监控平台
  return true // 阻止默认行为
}

// 浏览器 - 捕获未处理的 Promise rejection
window.onunhandledrejection = function(event) {
  console.log('未处理的 Promise 异常:', event.reason)
  event.preventDefault() // 阻止控制台报错
}

// 浏览器 - 捕获资源加载错误（img、script 等）
window.addEventListener('error', (event) => {
  if (event.target !== window) {
    console.log('资源加载失败:', event.target.src || event.target.href)
  }
}, true) // 必须用捕获阶段

// Node.js
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err)
  // 记录日志后优雅退出
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason)
})
```

### Promise 全局错误处理

```js
// 推荐方式：在每个 Promise 链末尾添加 catch
fetchData()
  .then(processData)
  .then(saveData)
  .catch(err => {
    console.error('请求链路出错:', err)
    showErrorMessage(err.message)
  })

// 全局兜底（防止遗漏的未处理 rejection）
window.addEventListener('unhandledrejection', (event) => {
  // 生产环境中上报到 Sentry 等平台
  reportError(event.reason)
  event.preventDefault()
})
```

## WeakMap 与 WeakSet

### 弱引用特性

```js
// WeakMap 的键必须是对象，且是弱引用
// 当键对象没有其他引用时，会被垃圾回收，对应的键值对自动移除
const wm = new WeakMap()

let obj = { name: '张三' }
wm.set(obj, '一些关联数据')

console.log(wm.get(obj)) // '一些关联数据'

obj = null // 原对象没有其他引用了
// 下次 GC 后，wm 中对应的条目会被自动清除
```

### vs Map/Set 对比

| 特性 | Map | WeakMap | Set | WeakSet |
|------|-----|---------|-----|---------|
| 键/值类型 | 任意 | 键必须是对象 | 任意 | 必须是对象 |
| 弱引用 | ❌ | ✅（键） | ❌ | ✅ |
| 可遍历 | ✅ | ❌ | ✅ | ❌ |
| `size` 属性 | ✅ | ❌ | ✅ | ❌ |
| `forEach` | ✅ | ❌ | ✅ | ❌ |
| 支持的方法 | get/set/has/delete/clear | get/set/has/delete | add/has/delete/clear | add/has/delete |
| 垃圾回收影响 | 无 | 键对象可能被回收 | 无 | 元素可能被回收 |

### 应用场景

```js
// 场景1：缓存计算结果（避免内存泄漏）
const cache = new WeakMap()

function expensiveCalc(obj) {
  if (cache.has(obj)) {
    console.log('命中缓存')
    return cache.get(obj)
  }
  const result = /* 复杂计算 */ obj.value * 2
  cache.set(obj, result)
  return result
}

// 场景2：为 DOM 元素关联数据（元素移除后自动清理）
const domData = new WeakMap()

function bindData(element, data) {
  domData.set(element, data)
}

function getData(element) {
  return domData.get(element)
}

// 当 DOM 元素被移除且没有其他引用时，关联数据自动被 GC 回收

// 场景3：实现私有属性
class Counter {
  #count = new WeakMap()

  constructor() {
    this.#count.set(this, 0)
  }

  increment() {
    this.#count.set(this, this.#count.get(this) + 1)
  }

  get value() {
    return this.#count.get(this)
  }
}

// WeakSet 应用场景：跟踪对象是否已处理
const processed = new WeakSet()

function processItem(item) {
  if (processed.has(item)) return // 避免重复处理
  processed.add(item)
  // 处理逻辑...
}
```

## 模块化

### CommonJS vs ESM 详细对比

| 特性 | CommonJS | ESM（ES Modules） |
|------|----------|-------------------|
| 语法 | `require()` / `module.exports` | `import` / `export` |
| 加载时机 | 运行时加载（同步） | 编译时静态分析（异步） |
| 输出方式 | 值的拷贝（浅拷贝） | 值的引用（只读绑定） |
| `this` 指向 | 当前模块（`module.exports`） | `undefined` |
| Tree Shaking | 不支持 | 支持 |
| 顶层 `await` | 不支持 | 支持 |
| 浏览器支持 | 不原生支持（需打包） | 原生支持（`<script type="module">`） |
| 循环依赖 | 支持（返回已导出部分） | 支持（引用绑定，使用时取值） |

### require vs import 执行时机

```js
// CommonJS - 运行时执行
if (condition) {
  const mod = require('./module') // 条件加载，运行时决定
}

// ESM - 编译时静态分析，必须在顶层
import { foo } from './module' // 不能放在条件语句中

// ESM 动态 import（运行时加载，返回 Promise）
async function loadModule() {
  if (condition) {
    const mod = await import('./module')
    mod.doSomething()
  }
}
```

### 循环依赖问题

```js
// === CommonJS 循环依赖 ===
// a.js
exports.a = 'from a'
const b = require('./b')
console.log('a 中拿到 b:', b.b) // undefined（b 还没执行完）

// b.js
exports.b = 'from b'
const a = require('./a')
console.log('b 中拿到 a:', a.a) // 'from a'

// === ESM 循环依赖 ===
// a.mjs
export const a = 'from a'
import { b } from './b.mjs'
// 使用时 b 已经有值（因为是引用绑定）
setTimeout(() => console.log('a 中拿到 b:', b), 0) // 'from b'

// b.mjs
export const b = 'from b'
import { a } from './a.mjs'
setTimeout(() => console.log('b 中拿到 a:', a), 0) // 'from a'
```

> **最佳实践**：尽量避免循环依赖。如果必须使用，ESM 的引用绑定机制比 CommonJS 的值拷贝更安全。

### 动态 import()

```js
// 按需加载（路由懒加载）
const routes = [
  {
    path: '/dashboard',
    component: () => import('./views/Dashboard.vue')
  },
  {
    path: '/settings',
    component: () => import('./views/Settings.vue')
  }
]

// 条件加载
async function loadLocale(lang) {
  const messages = await import(`./locales/${lang}.js`)
  return messages.default
}

// 并行加载多个模块
const [moduleA, moduleB] = await Promise.all([
  import('./moduleA.js'),
  import('./moduleB.js')
])

// 解构导入
const { default: Component, namedExport } = await import('./component.js')
```

## 内存管理

### 垃圾回收机制

#### 标记清除法（Mark-and-Sweep）

```
工作原理：
1. 标记阶段：从根对象（Global Object、当前执行上下文等）出发，遍历所有可达对象并标记
2. 清除阶段：遍历堆内存，回收所有未被标记的对象
3. 现代引擎（V8）使用分代回收 + 增量标记等优化策略

根对象（GC Roots）包括：
- 全局对象（window / global）
- 当前函数的局部变量和参数
- 调用栈中所有函数的变量和参数
```

#### 引用计数法及循环引用问题

```js
// 引用计数法：对象被引用次数为 0 时回收
// 问题：循环引用导致引用计数永远不为 0

function circularReference() {
  const obj1 = {}
  const obj2 = {}
  obj1.ref = obj2  // obj2 引用计数 = 1
  obj2.ref = obj1  // obj1 引用计数 = 1
  // 函数结束后，obj1 和 obj2 互相引用，计数都不为 0
  // 引用计数法无法回收这两个对象 → 内存泄漏
}

// 现代浏览器已不使用纯引用计数法
// 但旧版 IE（IE6-8）的 DOM/BOM 对象使用引用计数，容易导致泄漏
```

### 常见内存泄漏场景

```js
// 1. 意外的全局变量
function leak() {
  // 忘记写 var/let/const，隐式创建全局变量
  data = '大量数据' // 等同于 window.data = '大量数据'
}

// 2. 未清除的定时器
const timer = setInterval(() => {
  const element = document.getElementById('node')
  // element 和回调中的闭包阻止相关数据被回收
  element.innerHTML = JSON.stringify(hugeObject)
}, 1000)
// 如果页面切换但未 clearInterval，数据永远无法回收

// 3. 闭包引起的泄漏
function createClosure() {
  const hugeData = new Array(1000000).fill('x')
  return function() {
    // 闭包持有 hugeData 的引用
    console.log(hugeData.length)
  }
}
const fn = createClosure() // hugeData 无法被 GC 回收

// 4. 分离的 DOM 引用
let detachedNode
function removeElement() {
  const parent = document.getElementById('parent')
  const child = document.getElementById('child')
  detachedNode = child  // JS 变量仍然引用着 DOM 节点
  parent.removeChild(child) // DOM 中已移除，但 JS 中仍持有引用
  // 即使父节点被回收，child 因为 detachedNode 的存在无法被回收
}

// 5. console.log 保留引用
function processData() {
  const hugeData = new Array(1000000)
  console.log(hugeData) // 某些浏览器 DevTools 打开时会保留引用
  // 生产环境应该移除或禁用 console
}
```

### Chrome DevTools 内存分析简述

```
常用工具：

1. Memory 面板 → Heap Snapshot（堆快照）
   - 拍摄内存快照，查看当前页面所有对象的内存占用
   - 对比两次快照可发现内存增长（疑似泄漏）
   - 关注 Detached DOM（已分离的 DOM 节点）

2. Memory 面板 → Allocation Timeline（分配时间线）
   - 记录一段时间内的内存分配情况
   - 找到分配大量内存的代码位置

3. Memory 面板 → Allocation Sampling（分配采样）
   - 低开销的内存分析方式
   - 适合长时间运行的性能分析

4. Performance 面板
   - 录制运行时性能，观察 JS Heap Size 变化曲线
   - 如果曲线持续上升且不回落，可能存在内存泄漏

排查步骤：
1. 打开 DevTools → Memory → 拍摄 Heap Snapshot (快照1)
2. 执行可能泄漏的操作（如打开/关闭弹窗多次）
3. 手动触发 GC（点击垃圾桶图标）
4. 再拍摄 Heap Snapshot (快照2)
5. 选择 Comparison 视图对比两个快照
6. 按 Size Delta 排序，找到增长最多的对象类型
7. 展开查看具体对象的 Retainers（谁在引用它）
8. 定位到代码中的泄漏点
```

## 给fetch添加超时功能

```js
function createFetchWithTimeout(timeout = 1000){
  return function (url, options){
    return new Promise((resolve, reject) => {
      const singleController = new AbortController()
      fetch(url, {
        ...options,
        signal: singleController.signal
      }).then(resolve, reject)
      setTimeout(()=>{
        reject(new Error('fetch timeout'))
        // 取消请求
        singleController.abort()
      }, timeout)
    })
  }
}
```

## 如何理解 JS 的异步

1. JS是一门单线程的语言，这是因为它运行在浏览器的渲染主线程中，而渲染主线程只有一个
2. 而渲染主线程承担着诸多的工作，渲染页面、执行 JS 都在其中运行。
3. 如果使用同步的方式，就极有可能导致主线程产生阻塞，从而导致消息队列中的很多其他任务无法得到执行。这样一来，一方面会导致繁忙的主线程白白的消耗时间，另一方面导致页面无法及时更新，给用户造成卡死现象。
4. 所以浏览器采用异步的方式来避免。具体做法是当某些任务发生时，比如计时器、网络、事件监听，主线程将任务交给其他线程去处理，自身立即结束任务的执行，转而执行后续代码。当其他线程完成时，将事先传递的回调函数包装成任务，加入到消息队列的末尾排队，等待主线程调度执行。
5. 在这种异步模式下，浏览器永不阻塞，从而最大限度的保证了单线程的流畅运行。

## 消息队列

+ 任务没有优先级（在消息队列中先进先出），但是消息队列是有优先级的
+ 在目前 chrome 的实现中，至少包含了下面的队列
  + `延时队列`：用于存放计时器到达后的回调任务，**优先级「中」**
  + `交互队列`：用于存放用户操作后产生的事件处理任务，**优先级「高」**
  + `微队列`：用于存放需要最快执行的任务，**优先级「最高」**
+ 添加任务到微队列的主要方式主要是使用 `Promise`、`MutationObserver`

## Service Worker

+ `Service Workers` 是一种运行在浏览器背后的脚本，可以用来拦截和处理网络请求，缓存或提供离线内容，以及推送通知等功能

  + 主要特点：
    + 离线工作：Service Worker 可以缓存网站资源，使得应用可以在离线状态下使用。
    + 网络代理：可以拦截和处理网络请求，允许开发者控制如何处理这些请求。
    + 后台同步：即使在用户关闭浏览器标签页或应用后，Service Worker 仍然可以在后台执行任务。
    + 推送通知：即使应用没有打开，也可以向用户发送通知。
    + 高效更新：Service Worker 的更新过程可以由开发者控制，确保用户总是使用最新版本的应用。

  + 生命周期：
    + Service Worker 的生命周期独立于网页。它们包括以下阶段：
    + 注册：通过在网页上调用serviceWorker.register()来注册Service Worker。
    + 安装：注册后，Service Worker 将开始安装。在此阶段，通常会缓存必要的文件。
    + 激活：安装成功后，Service Worker 将被激活。在此阶段，可以清理旧版本缓存。
    + 监听：激活后，Service Worker 可以监听和拦截页面上的网络请求。

## JS多线程开启方案和解决思路

+ `Web Workers` 是浏览器提供的API，允许在后台线程中运行JavaScript代码，从而不阻塞主线程
+ 与主线程通信的方式使用`postMessage()`方法在`Web Worker`和`主线程`之间发送和接收数据
+ 优势：提高响应性能、允许并行计算等; 限制：如无法直接操作DOM

+ `Web Worker`是运行在浏览器后台的线程，可以执行JavaScript代码，但不能直接操作DOM
+ `Web Worker`可以用于执行耗时的计算任务，避免阻塞主线程
+ `Web Worker`可以通过`postMessage()`方法向主线程发送消息，通过`onmessage`事件接收主线程发送的消息

+ 创建 `Web Worker`（在主线程中）

  ```js
  // 主线程中创建Web Worker
  const worker = new Worker('worker.js');

  // 监听Web Worker发送的消息
  worker.onmessage = function(event) {
    const message = event.data;
    console.log('Received message from Web Worker:', message);
  };

  // 向Web Worker发送消息
  worker.postMessage('Hello from main thread!')
  ```

+ 在Web Worker中处理任务（worker.js）

  ```js
  // Web Worker 中接收信息
  self.onmessage = function(event) {
    const message = event.data
    console.log('Received message from main thread:', message)

    // 在 Web Worker 中处理任务（示例）
    const result = doTask(message)

    // 向主线程发送处理结果
    self.postMessage(result)
  }

  function doTask(message) {
    // 执行耗时的计算或者处理任务
    // ...

    return result
  }
  ```

+ `SharedArrayBuffer`和`Atomics`

  1. `SharedArrayBuffer`是一块`共享内存区域`，可以被多个线程同时访问和操作
  2. `Atomics`提供的一组原子操作方法，如`add()`,`sub()`,`compareExchange()`等，用于在共享内存中进行原子操作
  3. 使用适当的同步机制，如锁、信号量等，确保多个线程之间的数据一致性和同步

+ 在主线程和Web Worker之间共享数据（在主线程中）

  ```js
  // 创建共享内存
  const sharedBuffer = new SharedArrayBuffer(4); // 4字节大小的共享内存

  // 创建一个Int32Array视图以操作共享内存
  const sharedArray = new Int32Array(sharedBuffer);

  // 向共享内存写入数据
  Atomics.store(sharedArray, 0, 42);

  // 向Web Worker发送共享内存
  worker.postMessage(sharedArray);
  ```

+ 在Web Worker中访问共享数据（worker.js）
  
  ```js
  // Web Worker中接收共享内存
  self.onmessage = function(event) {
    const sharedArray = event.data;

    // 从共享内存读取数据
    const value = Atomics.load(sharedArray, 0);
    console.log('Value from shared memory:', value);

    // 修改共享内存中的数据
    Atomics.store(sharedArray, 0, 100);

    // 向主线程发送共享内存
    self.postMessage(sharedArray);
  };
  ```

+ 在主线程中接收Web Worker发送的共享内存（在主线程中）

  ```js
  // 主线程中接收共享内存
  worker.onmessage = function(event) {
    const sharedArray = event.data;

    // 从共享内存读取数据
    const value = Atomics.load(sharedArray, 0);
    console.log('Value from shared memory:', value);
  };
  ```

## JSON.stringify 深拷贝的缺点

1. 无法处理循环引用：当对象中存在循环引用时，即对象的某个属性指向该对象本身，JSON.stringify()会抛出异常。
2. 无法拷贝非枚举属性和方法：JSON.stringify()只能拷贝对象自身的可枚举属性，并且会忽略函数和Symbol类型的属性。
3. 无法拷贝特殊的对象属性：JSON.stringify()不会拷贝对象的原型链上的属性。
4. 无法处理日期对象：将日期对象转换为JSON字符串后再使用JSON.parse()解析时，日期对象会变成字符串，而不是重新生成日期对象。
5. 无法处理正则表达式对象：正则表达式对象在转换为JSON字符串后会变成空对象。
6. 无法处理undefined和function：JSON.stringify()在序列化数组时会将undefined和函数转换为null，但在序列化对象时，值为undefined或函数的属性会被直接忽略/移除。
7. 无法处理Infinity和NaN：JSON.stringify()会将Infinity和NaN转换为null。

## 复杂数组去重

```javascript

// 使用 Map 对象
const objects = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 1, name: 'Charlie' }, // 重复的 id
  { id: 3, name: 'Diana' }
];

const uniqueObjects = objects.reduce((acc, current) => {
  if (!acc.has(current.id)) {
    acc.set(current.id, current);
  }
  return acc;
}, new Map()).values();

console.log([...uniqueObjects]); // [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Diana' }]



// 使用 reduce 方法也可以实现这个功能，通过构建一个新数组，其中每个 id 只出现一次。
const objects2 = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 1, name: 'Charlie' }, // 重复的 id
  { id: 3, name: 'Diana' }
];

const uniqueObjects2 = objects2.reduce((acc, current) => {
  const exists = acc.some(obj => obj.id === current.id);
  if (!exists) {
    acc.push(current);
  }
  return acc;
}, []);

console.log(uniqueObjects2); // [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Diana' }]
```

## \n 换行处理

```javascript
// 在Vue中，可以使用CSS中的white-space属性来处理换行。将该属性设置为pre-line可以保留文本中的换行符，并根据需要进行换行。 
// 你可以在包含文本的HTML元素上应用样式，例如<div>或<p>标签，然后使用white-space属性来处理换行。下面是一个示例： 
<template>
  <div class="text-container">
    {{ backendText }}
  </div>
</template>

<style>
.text-container {
  white-space: pre-line; 
}
</style>

<script>
export default {
  data() {
    return {
      backendText: "这是从后台返回的文本\n这是第二行",
    };
  },
};
</script> 

// 在上面的示例中，backendText是从后台返回的文本，其中\n表示换行。通过将white-space属性设置为pre-line，文本将根据换行符进行换行显示。 
// 请注意，如果后台返回的文本中使用的是\n作为换行符，而不是实际的换行符，你可能需要在显示前将其替换为实际的换行符。你可以使用JavaScript的replace函数来执行此操作：
data() {
  return {
    backendText: "这是从后台返回的文本\\n这是第二行",
  };
},
computed: {
  formattedText() {
    return this.backendText.replace(/\\n/g, '\n');
  }
}
// 然后在模板中使用formattedText来显示处理过的文本。
// 这样，当Vue渲染文本时，换行符将被解释为实际的换行，并根据CSS样式进行换行处理。
```

## Object.defineProperty()

```javascript

// Object.defineProperty 的作用就是直接在一个对象上定义一个新属性，或者修改一个已经存在的属性
// Object.defineProperty 可以接收三个参数
// Object.defineProperty(obj, prop, desc)
// obj :  第一个参数就是要在哪个对象身上添加或者修改属性
// prop : 第二个参数就是添加或修改的属性名
// desc ： 配置项，一般是一个对象

let person = {
  name:"码农",
  age: 18
}

Object.defineProperty(person,'sex',{
  value:"男"
})

console.log(person) // { name:"码农", age: 18, sex: "男"}

// 第三个参数里面还有6个配置控制属性: 
// writable：      是否可重写 
// value：         当前值 
// get：           读取时内部调用的函数
// set：           写入时内部调用的函数
// enumerable：    是否可以遍历 
// configurable：  是否可再次修改配置项


let  person2 = {
  name:"码农",
  age: 18
}

Object.defineProperty(person2,'sex',{
  value:"男",       // 设置属性值
  enumerable:true,  // 控制属性是否可以枚举，默认值是false (遍历获取该值)
  writable:true,    // 控制属性是否可以被修改，默认值是false
  configurable:true // 控制属性是否可以被删除，默认值是false
})

console.log(person2) // 可以通过 person2.sex 来修改设置的值

// 还有最重要的两个属性 set和get（即存取器描述：定义属性如何被存取）
// 当使用了getter或setter方法，不允许使用writable和value这两个属性(如果使用，报错)
// get 是获取值的时候的方法，类型为 function ，获取值的时候会被调用，不设置时为undefined
// set 是设置值的时候的方法，类型为 function ，设置值的时候会被调用，undefined
// get或set不是必须成对出现，任写其一就可以
let number = 18
let person3 = {
  name:'码农',
  sex:'男',
}
 
Object.defineProperty(person3, 'age', {
  // 当有人读取person3的age属性时，get函数(getter)就会被调用，且返回值就是age的值
  get(){
    console.log('有人读取age属性了')
    return number
  },
  // 当有人修改person3的age属性时，set函数(setter)就会被调用，且会收到修改的具体值
  set(value) {
    console.log('有人修改了age属性，且值是', value)
    number = value
  }
})
 
person3.age // 有人读取age属性了 18
person3.age = 20 // 有人修改了age属性，且值是 20

```

## Proxy

+ Proxy是ES6中新增的一个功能，它可以在某个对象前架设一个“拦截器”，从而可以对该对象的访问进行拦截和控制。可以理解为是对对象访问的一个代理，通过代理可以改变对象的默认行为。

+ Proxy的作用主要有以下几个方面：

  1. 对象的拦截和控制：可以对对象的属性访问、赋值、函数调用等操作进行拦截和控制，从而实现对对象行为的定制。

  2. 数据劫持：可以通过Proxy实现数据双向绑定、深度监听、表单校验等数据劫持操作。

  3. 权限控制：可以使用Proxy实现对象属性的访问权限控制，限制一些敏感属性的访问。

  4. 性能优化：可以使用Proxy进行缓存、懒加载和单例模式等性能优化操作。

+ Proxy 和 Object.defineProperty 都可以用于拦截和控制对象的属性访问，但是它们之间有以下几个区别：

  1. Proxy支持拦截更多的操作：Proxy可以拦截更多的对象操作，包括对象属性的读取和设置、函数调用、in操作符、for...in循环等等，而Object.defineProperty只能拦截属性的访问和设置。

  2. Proxy是基于对象的拦截：Proxy是基于对象的拦截，即一个Proxy实例对应一个被拦截的对象，通过代理可以改变整个对象的行为。而Object.defineProperty是基于属性的拦截，可以对单个属性进行拦截。

  3. Proxy具有别名效应：在不需要拦截的情况下，可以直接使用对象的别名和引用来访问对象。而Object.defineProperty修改对象行为之后，不可以直接使用对象的别名和引用来访问属性。

  4. Proxy可以使用Reflect对象：Proxy通过Reflect对象来执行默认操作，而Object.defineProperty则不能。

Proxy作为ES6中新增的一个功能，具有以下优势和劣势：

+ 优势：

  1. 更加灵活和强大：Proxy比Object.defineProperty更加灵活和强大，可以拦截并控制更多的对象操作，包括读取和设置属性、函数调用等等。

  2. 可以动态修改对象行为：通过修改Proxy的拦截函数，可以动态地改变对象的行为，而Object.defineProperty不能实现这样的功能。

  3. 容易扩展：当需要添加新的拦截函数时，可以通过添加新的Proxy拦截器来实现，而不需要对代码进行大规模的修改，开发起来更加容易。

+ 劣势：

  1. 兼容性不足：虽然现在很多主流浏览器都支持Proxy，但是一些旧版的浏览器还不支持，因此在实际使用中还需要考虑兼容性的问题。

  2. 性能问题：相比Object.defineProperty等原生API，使用Proxy会带来一些额外的性能开销，尤其是在递归拦截、大量拦截操作等复杂场景下，会对程序的性能造成一定影响。但是在大多数场景下，Proxy的性能问题可以被忽略不计。

Proxy 的基本语法如下：

```javascript
let proxy = new Proxy(target, handler);
```

+ `target`: 要代理的目标对象。
+ `handler`: 一个对象，包含要在代理对象上定义的拦截操作的方法。

下面是一些常见的拦截操作：

1. `get(target, property, receiver):` 拦截对属性的访问操作。

   ```javascript
   let target = { name: 'John' };
   let handler = {
     get: function(target, property, receiver) {
       console.log(`Getting ${property}`);
       return target[property];
     }
   };

   let proxy = new Proxy(target, handler);
   console.log(proxy.name); // 输出: Getting name，John
   ```

2. `set(target, property, value, receiver):` 拦截对属性的设置操作。

   ```javascript
   let target = {};
   let handler = {
     set: function(target, property, value, receiver) {
       console.log(`Setting ${property} to ${value}`);
       target[property] = value;
       return true;
     }
   };

   let proxy = new Proxy(target, handler);
   proxy.name = 'John'; // 输出: Setting name to John
   ```

3. `deleteProperty(target, property):` 拦截对属性的删除操作。

   ```javascript
   let target = { name: 'John' };
   let handler = {
     deleteProperty: function(target, property) {
       console.log(`Deleting ${property}`);
       delete target[property];
       return true;
     }
   };

   let proxy = new Proxy(target, handler);
   delete proxy.name; // 输出: Deleting name
   ```

4. `apply(target, thisArg, argumentsList):` 拦截函数的调用操作。

   ```javascript
   let target = function(a, b) {
     return a + b;
   };
   let handler = {
     apply: function(target, thisArg, argumentsList) {
       console.log(`Calling function with arguments: ${argumentsList}`);
       return target.apply(thisArg, argumentsList);
     }
   };

   let proxy = new Proxy(target, handler);
   console.log(proxy(2, 3)); // 输出: Calling function with arguments: 2,3，5
   ```

这只是 Proxy 的一部分功能，它还支持其他拦截操作，如构造函数的拦截、in 操作符的拦截等。使用 Proxy 可以实现更高级和灵活的对象操作行为。

## Computed (getter/setter)

```javascript
 
// Vue 实例
var vm = new Vue({
  data: {
    firstName: 'John',
    lastName: 'Doe'
  },
  computed: {
    // 计算属性 fullName 的定义
    fullName: {
      // getter 函数
      get: function () {
        return this.firstName + ' ' + this.lastName;
      },
      // setter 函数
      set: function (value) {
        // 将传入的值分割成姓和名，并分别设置给 firstName 和 lastName
        var names = value.split(' ');
        this.firstName = names[0];
        this.lastName = names[names.length - 1];
      }
    }
  }
});

// 使用计算属性
console.log(vm.fullName); // 输出 "John Doe"

// 设置计算属性的值
vm.fullName = 'Jane Smith';

// 计算属性的值已经被更新
console.log(vm.firstName); // 输出 "Jane"
console.log(vm.lastName);  // 输出 "Smith"

```

## rest 参数

```javascript
// 1.rest参数(形式为"…变量名"),用于获取函数的多余参数,这样就不需要使用arguments(参数)对象了.
// 2.rest参数搭配的变量是一个数组,该变量将多余的参数放入数组中.
function add(...a){
  let sum = 0;
  for(var val of a){
    sum += val;
  }
  return sum;
}
add(2,5,3);//10
// add函数是一个求和函数,利用rest参数,可以向该函数传入任意数目的参数.

// 3. rest参数代替arguments变量
// arguments变量的写法
function sortNumbers() {
  return Array.prototype.slice.call(arguments).sort();
}

// rest参数的写法
const sortNumbers = (...numbers) => numbers.sort();

// 4.rest参数中的变量代表一个数组,所以数组特有的方法都可以用于这个变量.下面是一个利用rest参数改写数组push方法的例子
function push(array, ...items){
  //forEach为每一个
  items.forEach(function(item){
    array.push(item);
    console.log(item);
  });
}
var a = [];
push(a, 1, 2, 3);

// 5.rest参数之后不能再有其他参数(即只能是最后一个参数),否则会报错.
// 6.函数的length属性,不包括rest参数
(function(a){}).length //1
(function(...a){}).length //0
(function(a,...b){}).length //1
```

## eval() 字符串转js代码(不推荐)

```javascript

// eval(string) 函数会将传入的字符串当做 JavaScript 代码进行执行
// string：一个表示 JavaScript 表达式、语句或一系列语句的字符串。表达式可以包含变量与已存在对象的属性。
// 返回值：返回字符串中代码的返回值。如果返回值为空，则返回 undefined
console.log(eval('2 + 2')); // 4
console.log(eval(new String('2 + 2')));//  2 + 2

function looseJsonParse(obj){
    return eval("(" + obj + ")");
}
console.log(looseJsonParse(
   "{a:(4-1), b:function(){}, c:new Date()}"
))

// 不使用 eval 的代码
function looseJsonParse(obj){
    return Function('"use strict";return (' + obj + ')')();
}
console.log(looseJsonParse(
   "{a:(4-1), b:function(){}, c:new Date()}"
))

```

## 过滤对象中的空值

```javascript

const filteredObject = Object.fromEntries(
  Object.entries(params).filter(([key, value]) => value !== "")
);

```  

## 对象方法

```javascript

Object.assign()

// 通过复制一个或多个对象来创建一个新的对象。

Object.create()

// 使用指定的原型对象和属性创建一个新对象。

Object.defineProperty()

// 给对象添加一个属性并指定该属性的配置。

Object.defineProperties()

// 给对象添加多个属性并分别指定它们的配置。

Object.entries()

// 返回给定对象自身可枚举属性的 [key, value] 数组。

Object.freeze()

// 冻结对象：其他代码不能删除或更改任何属性。

Object.getOwnPropertyDescriptor()

// 返回对象指定的属性配置。

Object.getOwnPropertyNames()

// 返回一个数组，它包含了指定对象所有的可枚举或不可枚举的属性名。

Object.getOwnPropertySymbols()

// 返回一个数组，它包含了指定对象自身所有的符号属性。

Object.getPrototypeOf()

// 返回指定对象的原型对象。

Object.is()

// 比较两个值是否相同。所有 NaN 值都相等（这与==和===不同）。

Object.isExtensible()

// 判断对象是否可扩展。

Object.isFrozen()

// 判断对象是否已经冻结。

Object.isSealed()

// 判断对象是否已经密封。

Object.keys()

// 返回一个包含所有给定对象自身可枚举属性名称的数组。

Object.preventExtensions()

// 防止对象的任何扩展。

Object.seal()

// 防止其他代码删除对象的属性。

Object.setPrototypeOf()

// 设置对象的原型（即内部 [[Prototype]] 属性）。

Object.values()

// 返回给定对象自身可枚举值的数组。

```

## 数组方法

### filter

```javascript

// filter
filter() 方法
// 返回由 ages 数组中所有 18 岁或以上的值组成的数组：

var ages = [32, 33, 16, 40];

const obj = ages.filter((age)=>{
  return age >= 18;
})

```

### find

```javascript

// find 获取数组中第一个值为 18 或更大的元素的值
var ages = [3, 10, 18, 20];

const obj = ages.find((age) => {
  return age >= 18;
})

```

### findIndex

```javascript

// findIndex 获取数组中第一个值等于或大于 18 的元素的索引：
var ages = [3, 10, 18, 20];

const obj = ages.findIndex((age) => {
  return age >= 18;
})

```

### map

+ map()方法会得到一个新的数组并返回 map不会改变原数组，map不会检查空数组

```javascript

var email = ['gmail.com', '163.com', 'qq.com'];  
function myFunction() {
  let result;
  let value = 123456789;
  result = email.map(domain => `${value}@${domain}`);
  console.log(result); // ['123456789@gmail.com', '123456789@163.com', '123456789@qq.com']
}

```

### some

+ some() 方法用于检测数组中的元素是否满足指定条件，如果有一个元素满足条件，则表达式返回true , 剩余的元素不会再执行检测。如果没有满足条件的元素，则返回false。
+ some() 不会对空数组进行检测。 some() 不会改变原始数组。

```javascript
// 实例1：
let arr = [1, 2, 3, 4, 5];

let flag = arr.some(item => {
    if (item == 0) {
        return item;
    }
});
console.log(flag); //输出结果false

// 实例2：
let arr = [1, 2, 3, 4, 5];

let flag = arr.some(item => {
    if (item == 1) {
        return item;
    }
});
console.log(flag); //输出结果true

some一般使用场景大多都是用在：判断一个字段是否存在在某个数组中

```

### every

```javascript

// every用法
every跟some不同点在于，every要判断数组中是否每个元素都满足条件，只有都满足条件才返回true；只要有一个不满足就返回false；

// 实例1：
let arr = [1, 2, 3, 4, 5];
let flag = arr.every(item => item < 6);
console.log(flag); //输出结果true

// 实例2：
let arr = [1, 2, 3, 4, 5];
let flag = arr.every(item => item < 5);
console.log(flag); //输出结果false
        
```

### toReversed()、toSorted()、toSpliced()、with()

+ `push()、pop()、shift()、unshift()` **会改变原数组**
+ `toReversed()、toSorted()、toSpliced()、with()` **不改变原数组，返回一个原数组的拷贝**

toReversed()        对应  reverse()                *用来颠倒数组成员的位置*
toSorted()          对应  sort()                   *用来对数组成员排序*
toSpliced()         对应  splice()                 *用来在指定位置，删除指定数量的成员，并插入新成员*
with(index, value)  对应  splice(index, 1, value)  *用来将指定位置的成员替换为新的值*

```javascript

push()     // 向数组的末尾添加一个或更多元素，并返回新的长度
pop()      // 从数组末尾移除最后一项，减少数组的length值，并返回移除的项    
shift()    // 从数组中删除第一个元素，并返回该元素的值。此方法更改数组的长度      
unshift()  // 将一个或多个元素添加到数组的开头，并返回新数组的长度       

const sequence = [1, 2, 3];
sequence.toReversed() // [3, 2, 1]
sequence // [1, 2, 3]

const outOfOrder = [3, 1, 2];
outOfOrder.toSorted() // [1, 2, 3]
outOfOrder // [3, 1, 2]

const array = [1, 2, 3, 4];
array.toSpliced(1, 2, 5, 6, 7) // [1, 5, 6, 7, 4]
array // [1, 2, 3, 4]

const correctionNeeded = [1, 1, 3];
correctionNeeded.with(1, 2) // [1, 2, 3]
correctionNeeded // [1, 1, 3]

```

## 前端 encode 转码

```javascript

1、编码

var str  = encodeURIComponent('中文');

2、解码

// decodeURI()
// 或
// decodeURIComponent() 

var str  = decodeURIComponent(UrlEncode);

// 模板页面路径难免携带一些复杂的参数，一些特殊字符序列化(JSON.stringify)以及编码(encodeURIComponent)之后会有编码问题：url包含一些特殊的关键词，例如：# , & , =，而导致报错的是 % ，是因为编码汉字是 % 开头的，多加一个 % 会导致 decodeURIComponent 执行报错。
export const encodeSpecialChar = (char) => {
  const encodeArr = [{
    code: '%',
    encode: '%25'
  }, {
    code: '?',
    encode: '%3F'
  }, {
    code: '#',
    encode: '%23'
  }, {
    code: '&',
    encode: '%26'
  }, {
    code: '=',
    encode: '%3D'
  }]
  return char.replace(/[%?#&=]/g, ($) => {
    for (const k of encodeArr) {
      if (k.code === $) {
        return k.encode
      }
    }
  })
}

let params = {
 columns: [
  {
   label: '表头',
   props: 'th',
   show: true
  }
 ]
}
params  = encodeURIComponent(encodeSpecialChar(JSON.stringify(params)))
let url = `${location.protocol}//${host}/xxx.html?params=${params}`

```

## HTML转PDF (下载/传递) html2canvas、jspdf 插件

```javascript

// js文件
import html2Canvas from "html2canvas";
import JsPDF from "jspdf";

export default {
  install(Vue, options) {
    /**
     * @param {*} reportName 下载时候的标题
     * @param {*} isDownload  是否下载默认为下载，传false不下载
     */
    Vue.prototype.getPdf = function (reportName, isDownload = true) {
      // var target = document.getElementsByClassName("right-aside")[0];
      // target.style.background = "#FFFFFF";
      return new Promise((resolve, reject) => {
        var title = reportName;
        html2Canvas(document.querySelector("#pdfDom"), {
          allowTaint: true,
        }).then((canvas) => {
          let contentWidth = canvas.width;
          let contentHeight = canvas.height;
          //一页pdf显示html页面生成的canvas高度;
          let pageHeight = (contentWidth / 592.28) * 841.89;
          //未生成pdf的html页面高度
          let leftHeight = contentHeight;
          //页面偏移
          let position = 0;
          //a4纸的尺寸[595.28,841.89]，html页面生成的canvas在pdf中图片的宽高
          let imgWidth = 595.28;
          let imgHeight = (592.28 / contentWidth) * contentHeight;
          let pageData = canvas.toDataURL("image/jpeg", 1.0);
          let PDF = new JsPDF("", "pt", "a4");
          //有两个高度需要区分，一个是html页面的实际高度，和生成pdf的页面高度(841.89)
          //当内容未超过pdf一页显示的范围，无需分页
          if (leftHeight < pageHeight) {
            PDF.addImage(pageData, "JPEG", 0, 0, imgWidth, imgHeight);
          } else {
            while (leftHeight > 0) {
              PDF.addImage(pageData, "JPEG", 0, position, imgWidth, imgHeight);
              leftHeight -= pageHeight;
              position -= 841.89;
              //避免添加空白页
              if (leftHeight > 0) {
                PDF.addPage();
              }
            }
          }
          if (isDownload) {
            PDF.save(title + ".pdf");
          }
          // 删除本地存储的base64字段
          var pdfData = PDF.output("datauristring"); //获取base64Pdf
          resolve(pdfData);
        });
      });
    };
  },
};

// 纯下载
// export default {
//   install(Vue, options) {
//     Vue.prototype.getPdf = function () {
//       var title = this.htmlTitle;
//       html2Canvas(document.querySelector("#pdfDom"), {
//         allowTaint: true,
//       }).then(function (canvas) {
//         let contentWidth = canvas.width;
//         let contentHeight = canvas.height;
//         let pageHeight = (contentWidth / 592.28) * 841.89;
//         let leftHeight = contentHeight;
//         let position = 0;
//         let imgWidth = 595.28;
//         let imgHeight = (592.28 / contentWidth) * contentHeight;
//         let pageData = canvas.toDataURL("image/jpeg", 1.0);
//         let PDF = new JsPDF("", "pt", "a4");
//         if (leftHeight < pageHeight) {
//           PDF.addImage(pageData, "JPEG", 0, 0, imgWidth, imgHeight);
//         } else {
//           while (leftHeight > 0) {
//             PDF.addImage(pageData, "JPEG", 0, position, imgWidth, imgHeight);
//             leftHeight -= pageHeight;
//             position -= 841.89;
//             if (leftHeight > 0) {
//               PDF.addPage();
//             }
//           }
//         }
//         PDF.save(title + ".pdf");
//       });
//     };
//   },
// };

// main.js 全局挂载
import htmlToPdf from "@/util/htmlToPdf";
Vue.use(htmlToPdf);

// 页面上调用this.getPdf, 下载id为pdfDom的元素

```

## 当前时间

```javascript

getTimeInfo() {
  let today = new Date();
  let y = today.getFullYear();
  let m = today.getMonth() + 1;
  let d = today.getDate();
  let h = today.getHours();
  let mi = today.getMinutes();
  let s = today.getSeconds();
  return `${y}${m}${d}${h}${mi}${s}`;
},

```

## 防抖与节流

### 防抖

+ 防抖 使用场景
  + 高频
  + 耗时
  + 以最后一次调用为准

  ```js
  // 例如界面大小改变的事件触发的函数
  // 先定义一个timer
  let timerId
  window.onresize = () => {
    // 每次改变界面都清空定时器然后重新计时
    clearTimeout(timerId)
    // 然后将定时器赋值给定义的timer
    timerId = setTimeout(() => {
      // 调用的函数
      layout()
    }, 500)
  }

  // 封装 函数 传入一个函数 与防抖的时间 然后返回一个新的函数
  function debounce(fn, delay = 1000){
    return () => {}
  }

  // 结果如下
  function debounce(fn, delay = 1000){
    let timerId
    // 由于 this指向要保持和传入函数的this一致 这里需要使用普通函数
    return function(...args) {
      // 考虑到函数会有额外的参数传进来 使用 ...args 接收所有的参数
      clearTimeout(timerId)
      // 这里的 this 要透传到传入函数的话 需要使用箭头函数
      timerId = setTimeout(() => {
        // 然后 将this透传进来 保持this的一致性
        // 额外的参数也传进去
        fn.apply(this, args)
      }, delay)
    }
  }

  const d_layout = debounce(layout, 500)

  window.onresize = d_layout
  ```

### 代码示例

+ ChatGPT

  防抖实现代码示例：

  ```javascript
  function debounce(func, delay) {
    let timerId;
    return function(...args) {
      if (timerId) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }
  ```

  使用示例：

  ```javascript
  function handleInput(e) {
    console.log(e.target.value);
  }

  const inputEl = document.querySelector('input');
  const debounceHandleInput = debounce(handleInput, 500);

  inputEl.addEventListener('input', debounceHandleInput);
  ```

  上述代码中，`debounce()`函数用来实现防抖功能，其接受两个参数：函数和延迟时间。`handleInput()`函数是具体的业务逻辑函数。在使用时，可以通过高阶函数的方式将`handleInput()`函数传递给`debounce()`函数，得到新的`debounceHandleInput()`函数，然后将这个函数传递给事件监听器即可。

  节流实现代码示例：

  ```javascript
  function throttle(func, interval) {
    let lastTime = 0;
    return function(...args) {
      const nowTime = Date.now();
      if (nowTime - lastTime >= interval) {
        func.apply(this, args);
        lastTime = nowTime;
      }
    };
  }
  ```

  使用示例：

  ```javascript
  function handleScroll() {
    console.log(window.pageYOffset);
  }

  const throttleHandleScroll = throttle(handleScroll, 1000);

  window.addEventListener('scroll', throttleHandleScroll);
  ```

  上述代码中，`throttle()`函数用来实现节流功能，其接受两个参数：函数和时间间隔。`handleScroll()`函数是具体的业务逻辑函数。在使用时，可以通过高阶函数的方式将`handleScroll()`函数传递给`throttle()`函数，得到新的`throttleHandleScroll()`函数，然后将这个函数传递给事件监听器即可。

+ Bilibili

  ```javascript
  // 节流——保证一定时间内只调用一次
  // 应用场景：提交表单、高频的监听事件
  // 移动端，触摸移动就会发起请求
  // 将一定时间内的多个事件合并成一个

  let box = document.querySelector('.box')
  /* box.addEventListener('touchmove',e=>{
      console.log('请求')
  }) */
  
  //节流函数
  function throttle(event, time){
    let timer = null
    return _=>{
      if(!timer){
        timer = setTimeout(_=>{
          event()
          timer = null
        }, time)
      }
    }
  }
  
  box.addEventListener('touchmove',throttle(_=>{console.log('请求')}, 1000))

  // 防抖 —— 在固定的时间内，事件仅允许发生一次
  // 例如：在下面输入时，会立刻发送请求，防抖就是限制在输入结束后2秒再发送请求


  //抖动案例
  let telInput = document.querySelector('input')
  /* telInput.addEventListener('input', e=>{
      console.log('发起请求')
  }) */
  
  //防抖函数
  function antiShake(fn, wait){
    let timeOut = null;
    console.log('防抖函数')
    return _ => {
      console.log('timer',timeOut)
      if(timeOut) clearTimeout(timeOut)
      timeOut = setTimeout(fn, wait)
    }
  }
  
  //上面案例使用防抖函数
  telInput.addEventListener('input', antiShake( _=>{console.log('发起请求')} , 2000))

  ```

+ 掘金

  + 函数防抖

  ```javascript

  function debounce(fn, wait) {
    var timer = null;
    return function () {
        var context = this
        var args = arguments
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        timer = setTimeout(function () {
            fn.apply(context, args)
        }, wait)
    }
  }

  var fn = function () {
    console.log('boom')
  }

  setInterval(debounce(fn, 500), 1000) // 第一次在1500ms后触发，之后每1000ms触发一次
  setInterval(debounce(fn, 2000), 1000) // 不会触发一次（我把函数防抖看出技能读条，如果读条没完成就用技能，便会失败而且重新读条）
  ```

  + 函数节流

  ```javascript
  function throttle(fn, gapTime) {
    let _lastTime = null;

    return function () {
      let _nowTime = + new Date()
      if (_nowTime - _lastTime > gapTime || !_lastTime) {
        fn();
        _lastTime = _nowTime
      }
    }
  }

  let fn = ()=>{
    console.log('boom')
  }

  setInterval(throttle(fn,1000),10)
  ```

## 路由重复点击报错

```javascript
import Vue from "vue";
import Router from "vue-router";

const originalPush = Router.prototype.push;
const originReplace = Router.prototype.replace;
Router.prototype.push = function push(location, onResolve, onReject) {
  if (onResolve || onReject) {
    return originalPush.call(this, location, onResolve, onReject);
  }
  return originalPush.call(this, location).catch((err) => err);
};
Router.prototype.replace = function (location, resolve, reject) {
  if (resolve && reject) {
    originReplace.call(this, location, resolve, reject);
  } else {
    originReplace.call(
      this,
      location,
      () => {},
      () => {}
    );
  }
};
Vue.use(Router);
```

## 路由守卫

+ 全局前置守卫 (router/index.js) `router.beforeEach`

```javascript  

import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);

const router = new VueRouter({
  // 路由配置
  routes: [
    // ...定义路由...
  ]
});

router.beforeEach((to, from, next) => {
  // 全局前置守卫逻辑
});

export default router;
```

+ 路由独享的守卫 (router/index.js) `beforeEnter`

```javascript

import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);

const routes = [
  {
    path: '/example',
    component: ExampleComponent,
    beforeEnter: (to, from, next) => {
      // 在单个路由的独享守卫逻辑
    }
  },
  // ...其他路由配置...
];

const router = new VueRouter({
  routes
});

export default router;
```

+ 组件内的守卫(直接定义在组件的选项中)
`beforeRouteEnter`、`beforeRouteLeave`、`beforeRouteUpdate`

```javascript

export default {
  // ...

  beforeRouteEnter(to, from, next) {
    // 在组件实例创建之前调用
    // 可以使用回调函数或返回一个Promise延迟进入
  },

  beforeRouteLeave(to, from, next) {
    // 在离开当前路由时调用
    // 可以进行确认、保存数据等操作
  },

  beforeRouteUpdate(to, from, next) {
    // 在当前路由被复用时调用
    // 可以对参数的变化作出响应
  }

  // ...
}
```

## 禁止/允许滚动

```javascript

stopScroll() {
  let move = function (e) {
    e.preventDefault();
  };
  document.body.style.overflow = "hidden";
  document.addEventListener("touchmove", move, false);
},
canScroll() {
  let move = function (e) {
    e.preventDefault();
  };
  document.body.style.overflow = "";
  document.removeEventListener("touchmove", move, false);
},
```

## 前端搜索与分页

+ 带分页版本

  ```vue
  <template>
    <div class="app-container imonitorlist-performance commonRightContent"> 
      <el-form @submit.native.prevent ref="form" :inline="true">
        <el-form-item class="el-form-items" label="关键字">
          <el-input
            v-model.trim="inputContent"
            placeholder="请输入关键字"
            size="small"
            clearable
            @keyup.enter.native="searchEnterFun"
          ></el-input>
        </el-form-item>
        <el-form-item class="el-form-items">
          <el-button
            type="primary"
            icon="el-icon-search"
            size="mini"
            @click.native="searchEnterFun"
            >搜索</el-button
          >
          <el-button icon="el-icon-refresh" size="mini" @click.native="reset"
            >重置</el-button
          >
        </el-form-item>
      </el-form>
      <el-col :sm="24" :xs="24" class="performance_content commonChildContent">
        <div>
          <el-table
            :data="
              tables[0].slice(
                (currentPage - 1) * pageSize,
                currentPage * pageSize
              )
            "
            v-loading="loading"
            @expand-change="expandChange"
          >
            <el-table-column type="expand">
              <template slot-scope="props">
                <div
                  class="expand-content"
                  v-loading="props.row.expandLoading"
                  element-loading-spinner="el-icon-loading"
                  element-loading-background="rgba(0, 0, 0, 0)"
                >
                  <div
                    v-for="item in props.row.expands"
                    :key="item.id"
                    class="info"
                  >
                    <span class="info-name">{{ item.name }}</span>
                    <span class="info-unit">
                      <span v-if="item.name.indexOf('利用率') !== -1">
                        {{ Number(item.lastvalue).toFixed(2) + "%" }}
                      </span>
                      <span v-else-if="item.name.indexOf('速度') !== -1">
                        {{ setBytes(item.lastvalue, true) }}
                      </span>
                      <span v-else> {{ item.lastvalue }}{{ item.units }}</span>
                    </span>
                    <span class="info-time">{{ item.lastclock }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="指标名称" min-width="100">
            </el-table-column>
            <el-table-column label="采集值/单位" width="300"> </el-table-column>
            <el-table-column label="采集时间" width="200"></el-table-column>
          </el-table>
        </div>
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="currentPage"
          :page-sizes="[10, 20, 30, 50, 100]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="count"
          v-show="count > 0"
        >
        </el-pagination>
      </el-col>
    </div>
  </template>

  <script>
  import {
    getApplicationsById,
    getItemsByApplicationId,
  } from "@/store/api/networkMonitor/equiplist";
  import timeStamp from "@/util/timeStamp.js";
  import { changeBytes } from "@/util/unitChange";

  export default {
    data() {
      return { 
        tableData: [],
        pageTableData: [],
        pageSize: 20,
        currentPage: 1,
        count: 0, 
        searchContent: "",
        inputContent: "",
      };
    }, 
    mounted() {
      this.getData();
    },
    computed: {
      tables() {
        const search = this.searchContent;
        if (this.inputContent == "") {
          this.searchContent = "";
          this.currentPage = 1;
          return [this.tableData, (this.count = this.tableData.length)];
        }
        if (search !== "") {
          this.tableData.filter((dataNews) => {
            return Object.keys(dataNews).some(() => {
              return String(dataNews["name"]).indexOf(search) > -1;
            });
          });
          return [
            this.tableData.filter((dataNews) => {
              return Object.keys(dataNews).some(() => {
                return String(dataNews["name"]).indexOf(search) > -1;
              });
            }),
            (this.count = this.tableData.filter((dataNews) => {
              return Object.keys(dataNews).some(() => {
                return String(dataNews["name"]).indexOf(search) > -1;
              });
            }).length),
          ];
        }
        return [this.tableData, (this.count = this.tableData.length)];
      },
    },
    watch: {
      tableData: function (val) {
        this.getPageData(val);
      },
    },
    methods: { 
      getPageData(val) {
        let pageNo = this.currentPage;
        let pageSize = this.pageSize;
        let tempTableData = [];
        let length = val.length;
        this.count = length;
        for (let i = 0; i < length; i++) {
          if (i >= (pageNo - 1) * pageSize) {
            if (i < pageNo * pageSize) {
              tempTableData.push(val[i]);
            }
            continue;
          }
          continue;
        }
        this.pageTableData = tempTableData;
        this.loading = false;
      },

      handleSizeChange(val) {
        this.pageSize = val;
        this.currentPage = 1;
      },

      handleCurrentChange(val) {
        this.currentPage = val;
      }, 
      getData() {
        this.loading = true;
        let formData = new FormData();
        formData.append("resId", this.resId);
        getApplicationsById(formData)
          .then((res) => {
            if (res?.data?.data?.[0]?.applications) {
              this.tableData = res.data.data[0].applications; 
            }
          })
          .finally(() => {
            this.loading = false;
          });
      },
    },
  };
  </script>
  ```

+ 不分页版本

  ```vue

  <template>
    <div>
      <!-- 搜索框 -->
      <el-input
        placeholder="请输入搜索内容"
        v-model="searchQuery"
        @input="filterList"
      ></el-input>

      <!-- 数据列表 -->
      <el-table :data="filteredData">
        <el-table-column
          prop="date"
          label="日期"
          width="180">
        </el-table-column>
        <el-table-column
          prop="name"
          label="姓名"
          width="180">
        </el-table-column>
        <el-table-column
          prop="address"
          label="地址">
        </el-table-column>
      </el-table>
    </div>
  </template>

  <script>
  export default {
    data() {
      return {
        searchQuery: '', // 搜索框绑定的数据
        tableData: [ // 原始数据列表
          {
            date: '2016-05-02',
            name: '王小虎',
            address: '上海市普陀区金沙江路 1518 弄'
          },
          // ...其他数据项
        ],
        filteredData: [] // 过滤后的数据列表
      };
    },
    methods: {
      filterList() {
        // 当搜索框内容变化时，调用这个方法进行数据过滤
        if (this.searchQuery) {
          this.filteredData = this.tableData.filter((item) => {
            return Object.keys(item).some((key) => {
              // 检查每个属性是否包含搜索关键字
              return String(item[key]).toLowerCase().includes(this.searchQuery.toLowerCase());
            });
          });
        } else {
          // 如果搜索框为空，则显示全部数据
          this.filteredData = this.tableData;
        }
      }
    },
    mounted() {
      // 初始化时，显示全部数据
      this.filteredData = this.tableData;
    }
  };
  </script>
  ```

+ 树形结构对象数组搜索

```vue

  <template>
    <div>
      <!-- 搜索框 -->
      <el-input
        placeholder="请输入搜索内容"
        v-model="search"
        clearable
        style="width: 200px; margin-bottom: 20px;">
      </el-input>

      <!-- 表格 -->
      <el-table :data="filteredTreeData">
        <el-table-column
          prop="date"
          label="日期"
          width="180">
        </el-table-column>
        <el-table-column
          prop="name"
          label="姓名"
          width="180">
        </el-table-column>
        <el-table-column
          prop="address"
          label="地址">
        </el-table-column>
      </el-table>
    </div>
  </template>

  <script>
  export default {
    data() {
      return {
        search: '', // 用于存储搜索框的内容
        treeData: [ // 树形结构的表格数据
          {
            id: 1,
            date: '2016-05-02',
            name: '王小虎',
            address: '上海市普陀区金沙江路 1518 弄',
            children: [
              {
                id: 11,
                date: '2016-05-03',
                name: '王小虎子',
                address: '上海市普陀区金沙江路 1519 弄'
                // 更多子节点...
              },
              // ...其他子节点
            ]
          },
          // ...其他数据
        ]
      };
    },
    computed: {
      // 根据搜索框内容筛选数据
      filteredTreeData() {
        return this.searchTree(this.treeData, this.search);
      }
    },
    methods: {
      // 遍历树形结构并搜索包含关键字的节点
      searchTree(tree, keyword) {
        const result = [];
        tree.forEach(data => {
          if (this.checkNode(data, keyword)) {
            result.push(data);
          }
          if (data.children && data.children.length > 0) {
            const children = this.searchTree(data.children, keyword);
            if (children.length > 0) {
              result.push({ ...data, children });
            }
          }
        });
        return result;
      },
      // 检查节点是否包含关键字
      checkNode(node, keyword) {
        return Object.values(node).some(value =>
          String(value).toLowerCase().includes(keyword.toLowerCase())
        );
      }
    }
  };
  </script>
  ```

## cron 表达式

  ```javascript
    // 给某个表单中的时间转化为 cron 表达式
    parseCron(form) {
      var ctData = new Array();
      ctData["seconds"] = "0";
      ctData["minutes"] = "*";
      ctData["hours"] = "*";
      ctData["day"] = "*";
      ctData["month"] = "*";
      ctData["week"] = "*";
      var ds = ["seconds", "minutes", "hours", "day", "month", "week"];
      var springTimeStr = "";
      var time = form.effectivetime2;
      var treatmentTime = function () {
        var array = time.split(":");
        ctData["hours"] = array[0];
        ctData["minutes"] = array[1];
      };
      if (form.effectivetime1 == "everyDay") {
        // 0 0 0 * * ? 每天
        treatmentTime();
        ctData["week"] = "?";
      } else if (form.effectivetime1 == "everyWeek") {
        // 0 0 0 ? * [1-7] 每周
        treatmentTime();
        ctData["day"] = "?";
        ctData["week"] = form.week;
      } else {
        // 0 0 0 [1-31|L] * ? 每月
        treatmentTime();
        ctData["day"] = form.month;
        ctData["week"] = "?";
      }
      for (var i = 0; i < ds.length; i++) {
        springTimeStr += ctData[ds[i]] + " ";
      }
      return springTimeStr;
    },

    parseCronToForm(form, cron) {
      //传入一个cron表达式
      var rds = cron.trim().split(" ");
      if (rds.length == 6) {
        if (rds[1].length == 1) {
          rds[1] = "0" + rds[1];
        }
        if (rds[2].length == 1) {
          rds[2] = "0" + rds[2];
        }
        var time = rds[2] + ":" + rds[1];
        switch (rds[3]) {
          case "*": // 0 0 0 * * ? 每天
            // form.effectivetime1 = "everyDay";
            this.$set(form, "effectivetime1", "everyDay");
            this.$set(form, "effectivetime2", time);
            break;
          case "?": // 0 0 0 ? * [1-7] 每周
            this.$set(form, "effectivetime1", "everyWeek");
            this.$set(form, "effectivetime2", time);
            this.$set(form, "week", rds[5]);
            break;
          default:
            // 0 0 0 [1-31] * ? 每月
            this.$set(form, "effectivetime1", "everyMonth");
            this.$set(form, "effectivetime2", time);
            this.$set(form, "month", rds[3] * 1);
        }
      }
    },
  ```

## forEach 重组对象

```javascript
const arr = [
  {
    id: "22952099195946f49dc0cff26783d36e",
    type_id: "5c6d8b779cd947a7b8eaeb56acfa52ca",
    dict_key: "亦庄",
    dict_value: "203",
  },
  {
    id: "11a8d98302374b8ab86ee92ead01b2d4",
    type_id: "5c6d8b779cd947a7b8eaeb56acfa52ca",
    dict_key: "和平里",
    dict_value: "202",
  },
  {
    id: "4fa01afdb9ee4cee90105642c96be28f",
    type_id: "5c6d8b779cd947a7b8eaeb56acfa52ca",
    dict_key: "西安",
    dict_value: "204",
  },
  {
    id: "652401fabbc24f9290cb835e6b2b9a66",
    type_id: "5c6d8b779cd947a7b8eaeb56acfa52ca",
    dict_key: "顺义",
    dict_value: "201",
  },
];

重组为key - value;

let obj = {};
arr.forEach((item) => {
  obj[item.dict_value] = item.dict_key;
});
```

## substr() 截取

```javascript

// 从index=1开始截取5位
substr(1,5) // 截取字符串
```

## charAt() 从字符串中提取单个字符

```javascript

// 返回最后一位的值
let str = 'hello'
str.charAt(str.length - 1) // o
```

## Map()

```javascript
    getData() {
      this.loading = true;
      if (this.resId) {
        var params = {
          resId: this.resId,
          resTypeId: this.resTypeId,
          currentPage: this.currentPage,
          pageSize: this.pageSize,
        };
        this.tableData = [];
        this.$store
          .dispatch("interfaceList/getInterFaceListInfo", params)
          .then((res) => {
            this.count = res.get("data").toJS().total;
            let arr = res.get("data").get("records").toJS();
            this.arr_1 = [];
            for (let l = 0; l < arr.length; l++) {
              const dataInfo = arr[l];
              if (!dataInfo || !dataInfo.attribute) return;
              var map = new Map();
              var id = "id";
              for (var i = 0; i < dataInfo.attribute.length; i++) {
                for (var j = 0; j < dataInfo.attributeVal.length; j++) {
                  if (
                    dataInfo.attribute[i].id == dataInfo.attributeVal[j].attr_id
                  ) {
                    map.set(i, dataInfo.attributeVal[j].attr_value);
                    map.set(id, dataInfo.attributeVal[j].res_id);
                  }
                }
              }
              const obj = [...map.entries()].reduce(
                (obj, [key, value]) => ((obj[key] = value), obj),
                {}
              );
              this.arr_1.push(obj);
            }
            this.tableData = this.arr_1;
          });
      } else {
        this.loading = false;
      }
    },
```

## Tags-Views 刷新保留

```javascript
 mounted() {
    this.beforeUnload();
  },
 methods: {
    beforeUnload() {
      // 监听页面刷新
      window.addEventListener("beforeunload", () => {
        // visitedViews数据结构太复杂无法直接JSON.stringify处理，先转换需要的数据
        let tabViews = this.visitedViewList.map((item) => {
          return {
            fullPath: item.fullPath,
            hash: item.hash,
            meta: { ...item.meta },
            name: item.name,
            params: { ...item.params },
            path: item.path,
            query: { ...item.query },
            title: item.title,
          };
        });
        sessionStorage.setItem("tabViews", JSON.stringify(tabViews));
      });
      // 页面初始化加载判断缓存中是否有数据
      let oldViews = JSON.parse(sessionStorage.getItem("tabViews")) || [];
      if (oldViews.length > 0) {
        this.$store.state.tagsView.visitedViews = oldViews;
      }
    },
  }
```

## excel 导出功能

  ```javascript
    // 导出
    async exportInfo(context, params) {
      return new Promise((resolve, reject) => {
        axios
          .post(`${api}/interfaceTraffic/export`, params, {
            responseType: 'blob'
          })
          .then((res) => {
            console.debug(res);
            if (res.status != 200) {
              console.error('export error:status=', res.status);
              alert('导出异常，请联系管理员查看后台日志！');
              return;
            }
            let type = res.data.type;
            const type_json = 'application/json';
            const type_excel = 'application/vnd.ms-excel';
            // 后台获取文件名
            // let fileName = decodeURIComponent(res.headers["filename"]);
            // 直接获取前台参数文件名
            var fileName =
              params['exportName'] +
              '.xlsx';
            // 返回信息类型判定是否 校验失败
            if (type.indexOf(type_json) >= 0) {
              // 返回 json
              let reader = new FileReader();
              reader.onload = function () {
                alert(this.result);
              };
              reader.readAsText(res.data);
              // return;
            } else if (type.indexOf(type_excel) >= 0) {
              // 返回 excel 流
              let blob = new Blob([res.data], {
                type: type_excel
              });
              // 浏览器判定
              if (window.navigator.msSaveOrOpenBlob) {
                // IE
                navigator.msSaveOrOpenBlob(blob, fileName);
              } else {
                // chrome 等
                const link = document.createElement('a');
                link.style.display = 'none';
                // 可以直接从参数获取
                link.setAttribute('download', fileName);
                link.href = URL.createObjectURL(blob);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }
          })
        // .then((response) => {
        //   if (response.status == '200') {
        //     resolve(Immutable.fromJS(response.data))
        //   } else {
        //     reject(Immutable.fromJS(response.data))
        //   }
        // })
        // .catch(function (error) {
        //   console.log(error);
        // })
      })
    },

    // DOM部分
    handleExport() {
      this.$confirm("是否导出?", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(() => {
          let exportName = "设备列表" + moment().format("YYYY-MM-DD-HH-mm-ss");
          let params = {
            xxx: xxx,
            exportName,
          };
          exportEquip(params).then((res) => {
            if (res) {
              this.$message.success("导出成功");
            }
          });
        })
        .catch(() => {
          this.$message.info("已取消导出");
        });
    },

    // js部分
    export function exportEquip(data) {
      return new Promise((resolve, reject) => {
        axios({
          baseURL: api,
          url: "/network-monitor/EquipmentsExport",
          method: "post",
          data: data,
          responseType: "blob",
        }).then((response) => {
          const fileReader = new FileReader();
          fileReader.onloadend = () => {
            // 此处两种判断返回信息的方法可选其一
            // 方法一：
            try {
              const jsonData = JSON.parse(fileReader.result); // 说明是普通对象数据，后台转换失败
              reject(jsonData);
            } catch (err) {
              // 解析成对象失败，说明是正常的文件流
              // 下载文件
              download(response, data.exportName);
              resolve("下载成功");
            }
          };
          fileReader.readAsText(response.data);
        })
      })
    }

    function download(file, filename) {
      let blob = new Blob([file.data], {
        type: "application/vnd.ms-excel",
      });
      if (window.navigator.msSaveOrOpenBlob) {
        navigator.msSaveBlob(blob);
      } else {
        let link = document.createElement("a");
        let evt = document.createEvent("HTMLEvents");
        evt.initEvent("click", false, false);

        link.href = window.URL.createObjectURL(blob);

        //  link.href = URL.createObjectURL(file);
        link.style.display = "none";
        link.setAttribute("download", filename + ".xlsx");
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(link.href);
      }
    }

    // 从header获取文件名下载
    export function downloadFile(params, fileName) {
      return new Promise((resolve, reject) => {
        axios({
          baseURL: api,
          url: "/cmdb-ci-checkRecord/download",
          method: "get",
          params,
          responseType: "blob",
        }).then((res) => {
          let fileName = res.headers["content-disposition"].split("=")[1];
          let blob = res.data;
          if (typeof window.navigator.msSaveBlob !== "undefined") {
            window.navigator.msSaveBlob(blob, fileName);
          } else {
            var URL = window.URL || window.webkitURL;
            var objectUrl = URL.createObjectURL(blob);
            if (fileName) {
              var a = document.createElement("a");
              if (typeof a.download === "undefined") {
                window.location = objectUrl;
              } else {
                a.href = objectUrl;
                a.download = decodeURI(fileName);
                document.body.appendChild(a);
                a.click();
                a.remove();
              }
            } else {
              window.location = objectUrl;
            }
          }
        });
      });
    }

  ```

## 树形展开保留

```vue

<template>
  <div class="ip-wrap">  
    <!-- 
      :load="loadNode"
      lazy
     -->
    <el-tree
      ref="tree"
      :data="treeData"
      :props="defaultProps"
      :filter-node-method="filterNode"
      :default-expanded-keys="defaultExpandIds"
      node-key="id"
      @node-click="handleNodeClick"
      @node-expand="handleNodeExpand"
      @node-collapse="handleNodeCollapse"
      highlight-current
    >
      <span slot-scope="{ node, data }" class="tree-wrap">
        <span class="label-wrap">{{ node.label }}</span>
        <span class="num-wrap"> </span>
        <span class="button-wrap">
          <el-tooltip content="删除" placement="top" effect="dark">
            <el-button
              class="el-icon-delete"
              type="text"
              @click.stop="delNet(data)"
              v-if="data.leaf == true && data.parent_id != null"
            ></el-button>
          </el-tooltip>
          <el-tooltip content="新增子网段" placement="top" effect="dark">
            <el-button
              class="el-icon-circle-plus-outline"
              type="text"
              @click.stop="addNet(data)"
            ></el-button>
          </el-tooltip>
        </span>
      </span>
    </el-tree> 
  </div>
</template>
<script>
import {
  getTree,
  getChildren,
  delIpUsages,
  addIpManagement,
} from "@/store/api/networkMonitor/ipmgr/index.js"; 

export default {
  name: "ModelEdit", 
  data() {
    return {
      keyWord: "",
      form: {
        ip_segment: "",
        description: "",
        parent_id: "",
        parent_ip: "",
      }, 
      treeData: [],
      defaultProps: {
        children: "children",
        label: "ip_segment",
        isLeaf: "leaf",
      },
      filterText: "",
      defaultExpandIds: [], 
    };
  },
  watch: {
    filterText(val) {
      this.$refs.tree.filter(val);
    },
  },
  created() {
    if (sessionStorage.getItem("ipTreeId")) {
      let treeIds = sessionStorage
        .getItem("ipTreeId")
        .split(",");
      treeIds.map((item) => {
        this.defaultExpandIds.push(item);
      });
    }
  },
  mounted() {
    this.getData();
  },
  methods: { 
    handleNodeExpand(data) {
      // 保存当前展开的节点
      let flag = false;
      this.defaultExpandIds.some((item) => {
        if (item === data.id) {
          // 判断当前节点是否存在， 存在不做处理
          flag = true;
          return true;
        }
      });
      if (!flag) {
        // 不存在则存到数组里
        this.defaultExpandIds.push(data.id);
        sessionStorage.setItem("ipTreeId", this.defaultExpandIds);
      }
    },
    handleNodeCollapse(data) {
      // 删除当前关闭的节点
      this.defaultExpandIds.some((item, i) => {
        if (item === data.id) {
          this.defaultExpandIds.splice(i, 1);
          sessionStorage.setItem("ipTreeId", this.defaultExpandIds);
        }
      });
      this.removeChildrenIds(data); // 这里主要针对多级树状结构，当关闭父节点时，递归删除父节点下的所有子节点
    },
    // 删除树子节点
    removeChildrenIds(data) {
      const _this = this;
      if (data.children) {
        data.children.forEach(function (item) {
          const index = _this.defaultExpandIds.indexOf(item.id);
          if (index != -1) {
            _this.defaultExpandIds.splice(index, 1);
            sessionStorage.setItem("ipTreeId", _this.defaultExpandIds);
          }
          _this.removeChildrenIds(item);
        });
      }
    }, 
    getData() {
      this.treeLoading = true;
      // getChildren()
      getTree()
        .then((res) => {
          if (res?.data?.data) {
            let data = res.data.data;
            this.treeData = data;
          }
        })
        .finally(() => {
          this.treeLoading = false;
        });
    },
    loadNode(node, resolve) {
      this.treeLoading = true;
      if (node.level == 0) {
        getChildren()
          .then((res) => {
            if (res?.data?.data) {
              let data = res.data.data;
              this.treeData = data;
            }
            resolve(this.treeData);
          })
          .finally(() => {
            this.treeLoading = false;
          });
      } else {
        let params = {
          id: node.data.id,
        };
        getChildren(params)
          .then((res) => {
            if (res?.data?.data) {
              let data = res.data.data;
              resolve(data);
            }
          })
          .finally(() => {
            this.treeLoading = false;
          });
      }
    },
    filterNode(value, data) {
      if (!value) return true;
      return data.ip_segment.indexOf(value) !== -1;
    },
  },
};
</script> 
```
