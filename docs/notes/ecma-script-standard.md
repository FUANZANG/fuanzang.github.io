# ECMA Script 标准

## ECMA 2015 (ES6)

### let const 块级作用域

+ 作用域
  + 全局作用域
  + 函数作用域
  + 块级作用域（es6新增）
    + 块，就是 {} 包裹起来的一个范围，比如if或者for中的{}
+ let 和 var 有另外一个区别，let 存在暂时性死区（TDZ），在声明前访问会抛出 ReferenceError，而 var 声明提升后值为 undefined
+ const 在 let 上添加了一个只读的效果 声明的时候必须同时赋初值

### 数组的解构

```js
const arr = [100, 200, 300]
const [foo, bar, baz] = arr
console.log(foo, bar, baz) // 100, 200, 300
```

### 对象的解构

```js
const obj = { name: 'zs', age: 18 }
const { name } = obj
console.log(name) // zs

// 连续解构赋值 从接口中解构出data 然后解构出content 并重命名为 title
let { data:{content: title} } = await axios.get('/api/data')
```

### 模板字符串字面量

```js
const name = "tom"
const str = `hey,${name},${1 + 1},${Math.random()}`
console.log(str) // hey,tom,2,0.6840647891683806
```

### 模板字符串串标签函数

```js
// 模板字符串标签函数
// const str = console.log`hello JavaScript`

const names = 'zs'
const gender = true
function myTagFunc(strings, name, gender) {
  // console.log(strings,name,gender)
  // 处理一下 性别
  const sex = gender ? 'man' : 'woman'
  return strings[0] + name + strings[1] + sex + strings[2]
}
const str = myTagFunc`hi, ${names} is a ${gender}`
console.log(str) // hi, zs is a man
```

### 字符串的扩展方法 includes() startsWith() endsWith()

+ `includes()` 包含
+ `startsWith()` 起始
+ `endsWith()` 终止

```js
// 字符串扩展方法
const msg = 'Error: foo is not defined.'
console.log(msg.startsWith('Error')) // true
console.log(msg.endsWith('.')) // true
console.log(msg.includes('foo')) // true
```

### 参数默认值

```js
// 函数参数的默认值
function foo(bar,enable = true) {
  // enable = enable || true
  // enable = enable === undefined ? true : enable
  console.log('foo invoked enable:') // foo invoked enable:
  console.log(enable) // true
}
foo('bar')
```

### 剩余参数

```js
// 剩余参数
function fun(n,...args) {
  console.log(args)
}
fun(1,2,3,4)
```

### 展开数组

```js
// 展开数组操作
const arr = ['foo', 'bar', 'baz']
// console.log(arr[0],arr[1],arr[2])
// console.log.apply(console,arr) 
console.log(...arr)
```

### 箭头函数

```js
const arr = [1,2,3,4,5,6,7]
// const arr1 = arr.filter(function (item) {
//   return item % 2
// })
const arr1 = arr.filter(i => i % 2)
console.log(arr1)
```

### 箭头函数与this

```js
// 箭头函数与 this
const person = {
  name: "tom",
  // sayHi: function () {
  //   console.log(`hi,my name is ${this.name}`)
  // }
  // sayHi: () => {
  //   console.log(`hi,my name is ${this.name}`)
  // }
  sayHi: function () {
    // const _this = this;
    setTimeout(() => {
      console.log(`hi,my name is ${this.name}`) // 'hi,my name is tom'
    },1000);
  }
}
person.sayHi()
```

### 对象字面量增强

```js
// 对象字面量增强
const bar = "bar"
const age = "age"
const obj = {
  name: "tom",
  // bar: bar
  bar,
  sayHi () {
    console.log('hi')
    console.log(this)
  },
  // 计算属性名
  [1+2]: 18
}
// obj[age] = 18
console.log(obj) // { '3': 18, name: 'tom', bar: 'bar', sayHi: [Function: sayHi] }
```

### 对象的扩展方法

+ `Object.assign()`

  ```js
  // 对象扩展方法
  // Object.assign 方法

  const source1 = {
    a: 123,
    b: 123
  }
  const source2 = {
    b: 678,
    d: 789
  }
  const target = {
    a:456,
    c:789
  }
  const result = Object.assign(target,source1,source2)
  console.log(target)
  console.log(target === result)

  // 复制对象
  function fun(obj) {
    // 希望内部更改时，不要改外部的对象
    const newObj = Object.assign({},obj)
    newObj.name = 'tom'      
    console.log(newObj)
  }
  const obj = {
    name: 'jack',
    age: 18
  }
  fun(obj)
  console.log(obj)

  // 应用，在 options 对象参数接收时，简化
  function Block(options) {
    // this.width = options.width;
    Object.assign(this,options)
  }
  const block1 = new Block({width: 100, height: 100, x: 50, y: 50})
  console.log(block1)
  ```

+ `Object.is()`

  ```js
  // 对象扩展方法
  // Object.is 方法
  console.log(
    // 0 == false
    // 0 === false
    // +0 === -0
    // NaN === NaN
    // Object.is(+0,-0)
    Object.is(NaN,NaN)
  )
  ```

### class类

```js
class Person{
  constructor(name, age){
    this.name = name,
    this.age = age,
  }
  sayHi(){
    console.log(`hi, my name is ${this.name}`)
  }
}
const p1 = new Person('Tom', 19)
console.log(p1)
p1.sayHi()
```

### 静态成员

```js
// 静态方法
class Person{
  constructor(name, age){
    this.name = name,
    this.age = age,
  }
  sayHi(){
    console.log(`hi, my name is ${this.name}`)
  }
  static create(name, age){
    console.log(this)
    return new Person(name, age)
  }
}
const p1 = Person.create('zc', 19)
console.log(p1)
```

### 类的继承

```js
class Person{
  constructor(name, age){
    this.name = name,
    this.age = age,
  }
  sayHi(){
    console.log(`hi, my name is ${this.name}`)
  }
}
class Student extends Person {
  constructor(name, age, number){
    super(name, age);
    this.number = number;
  }
  hello(){
    super.sayHi()
    console.log(`学号是 ${this.number}`)
  }
}
const s1 = new Student('Tom', 19, 101010)
s1.hello()
```

### Set数据结构

```js
const s = new Set()
s.add(1).add(2).add(3).add(4).add(2)
console.log(s) // Set(4) { 1, 2, 3, 4 }

s.forEach(i => console.log(i)) // 1 2 3 4

for(let i of s){
  console.log(i) // 1 2 3 4
}

console.log(s.size) // 4

console.log(s.has(4)) // true

console.log(s.delete(100)) // false
console.log(s) // Set(4) { 1, 2, 3, 4 }

s.clear()
console.log(s) // set {}

// 数组去重
const arr = [1, 3, 4, 4, 5, 6, 6]

const b = Array.from(new Set(arr))
// 或者
const c = [...new Set(arr)]

console.log(b) // [1, 3, 4, 5, 6]
```

### Map数据结构

```js
const obj = {}
obj[true] = 'boolean'
obj[123] = 'number'
obj[{a: 1}] = 'object'

console.log(Object.keys(obj)) // [ '123', 'true', '[object Object]' ]
console.log(obj[{}]) // 'object'
console.log(obj['[object Object]']) // 'object'（{} 转字符串为 '[object Object]'）

const map = new Map()
const a = {a: 1}
map.set(a, 100)
console.log(map) // Map(1) { { a: 1 } => 100 }
console.log(map.get(a)) // 100

map.has()
map.delete()
map.clear()

map.forEach((value, key) => {
  console.log(key, value) // [ { a: 1 }, 100 ]
})
```

### Symbol

```js
// Symbol 符号 作用就是表示一个独一无二的值
const s = Symbol()
console.log(s) // Symbol()
console.log(typeof(s)) // 'symbol'
console.log(Symbol() === Symbol()) // false
console.log(Symbol("foo") === Symbol("foo")) // false
console.log(Symbol('foo')) // Symbol(foo)
console.log(Symbol('bar')) // Symbol(bar)
console.log(Symbol(233)) // Symbol(233)

// Symbol.for() 方法首先将传入的参数转换为字符串，然后使用该字符串作为键在全局 Symbol 注册表中查找 Symbol。如果找到了具有该键的 Symbol，则返回该 Symbol；如果没有找到，则创建一个新的 Symbol
const a = Symbol.for(true)
const b = Symbol.for('true')
console.log(a === b) // true

const obj = {
  [Symbol()]: 789,
  name: 'zs'
}

obj[Symbol()] = 123
obj[Symbol()] = 456
console.log(obj[Symbol()]) // undefined
console.log(obj.name) // 'zs'
console.log(obj) // { name: 'zs', Symbol(): 789 }

const obj2 = {
  [Symbol.toStringTag]: "XObject"
}
console.log(obj2.toString()) // '[object XObject]'
// Object.prototype.toString() 方法是一个内置的实例方法，它返回一个表示对象的字符串。在没有自定义 Symbol.toStringTag 属性的情况下，toString() 方法通常返回一个类似于 "[object Type]" 的字符串，其中 Type 是对象的内部类名。例如，对于一个普通的对象，toString() 方法会返回 "[object Object]"。
// 然而，当你为一个对象定义了 Symbol.toStringTag 属性时，你可以自定义 toString() 方法的输出。这个属性的作用是提供一个标签，该标签将被 toString() 方法用于构造返回的字符串
```

### for...of 循环

```js
const arr = [100, 200, 300, 400]

for (const item of arr) {
  console.log(item) // 100, 200, 300, 400
}

arr.forEach(item => {   // 没有办法打断遍历
  console.log(item) // 100, 200, 300, 400
})

for (const item of arr) {
  console.log(item) // 100, 200
  if (item >= 200) {
    break
  }
}

const s = new Set(["foo", "bar", "baz"])
for (const item of s) {
  console.log(item) // "foo", "bar", "baz"
}

const m = new Map()
m.set("foo",1)
m.set("bar",2)
for (const [key,value] of m) {
  console.log(key,value) // [ 'foo', 1 ] [ 'bar', 2 ]
}

// 抛出一个 TypeError，因为 obj 不是一个可迭代对象: 普通的对象（即通过对象字面量创建的对象）不是可迭代的
const obj = {
  name: "zs",
  age: 18
}
for (const item of obj) { //  is not iterable
  console.log(item) 
}
```

### Proxy

Proxy 用于创建对象的代理，拦截并自定义基本操作（如属性查找、赋值、枚举、函数调用等）。Vue 3 的响应式系统就是基于 Proxy 实现。

```js
const person = {
  name: 'zs',
  age: 18
}

const proxy = new Proxy(person, {
  // 拦截读取
  get(target, key, receiver) {
    console.log(`读取 ${key}`)
    return Reflect.get(target, key, receiver)
  },
  // 拦截设置
  set(target, key, value, receiver) {
    console.log(`设置 ${key} = ${value}`)
    return Reflect.set(target, key, value, receiver)
  },
  // 拦截删除
  deleteProperty(target, key) {
    console.log(`删除 ${key}`)
    return Reflect.deleteProperty(target, key)
  },
  // 拦截 in 操作符
  has(target, key) {
    console.log(`判断 ${key} in target`)
    return Reflect.has(target, key)
  }
})

proxy.name       // 读取 name → 'zs'
proxy.age = 20   // 设置 age = 20
delete proxy.age // 删除 age
'name' in proxy   // 判断 name in target
```

### Reflect

Reflect 提供拦截 JS 操作的静态方法，与 Proxy 的 handler 方法一一对应。

```js
// Reflect 的方法与 Proxy handler 一一对应
Reflect.get(obj, 'name')           // 等同于 obj.name
Reflect.set(obj, 'name', 'tom')    // 等同于 obj.name = 'tom'
Reflect.has(obj, 'name')           // 等同于 'name' in obj
Reflect.deleteProperty(obj, 'name') // 等同于 delete obj.name
Reflect.ownKeys(obj)               // 等同于 Object.getOwnPropertyNames(obj).concat(Object.getOwnPropertySymbols(obj))

// Reflect.apply 调用函数
Reflect.apply(Math.floor, null, [1.75]) // 1

// Reflect.construct 构造实例
Reflect.construct(Date, [2020, 0, 1]) // new Date(2020, 0, 1)
```

### Promise

Promise 是异步编程的解决方案，比传统的回调函数和事件更合理、更强大。

```js
// 基本用法
const promise = new Promise((resolve, reject) => {
  // 异步操作
  if (success) {
    resolve(data)  // 成功
  } else {
    reject(error)  // 失败
  }
})

promise
  .then(data => console.log(data))
  .catch(error => console.error(error))
  .finally(() => console.log('完成'))

// 链式调用
fetch('/api/user')
  .then(res => res.json())
  .then(user => renderUser(user))
  .catch(err => showError(err))

// Promise.all — 全部成功才成功
const [users, posts] = await Promise.all([
  fetch('/api/users').then(r => r.json()),
  fetch('/api/posts').then(r => r.json())
])

// Promise.race — 最先完成的（不管成功失败）
const fastest = await Promise.race([
  fetch('/api/primary'),
  fetch('/api/backup')
])
```

### Generator 函数

Generator 是可以暂停执行的函数，通过 `yield` 暂停，通过 `next()` 继续。

```js
function* idGenerator() {
  let id = 1
  while (true) {
    yield id++
  }
}

const gen = idGenerator()
gen.next() // { value: 1, done: false }
gen.next() // { value: 2, done: false }
gen.next() // { value: 3, done: false }

// yield 可以接收 next() 传参
function* dialog() {
  const name = yield '你叫什么？'
  const age = yield `${name}，你多大了？`
  yield `${name}，${age}岁，你好！`
}

const d = dialog()
d.next()              // { value: '你叫什么？' }
d.next('张三')        // { value: '张三，你多大了？' }
d.next(18)            // { value: '张三，18岁，你好！' }
```

### Module（import / export）

ES6 模块是编译时确定的静态模块，比 CommonJS 的运行时加载更高效。

```js
// export — 导出
// math.js
export const PI = 3.14159
export function add(a, b) { return a + b }
export default class Calculator { /* ... */ }

// import — 导入
import Calc from './math.js'           // 默认导入
import { PI, add } from './math.js'    // 命名导入
import * as math from './math.js'      // 全部导入
import Calc, { PI } from './math.js'   // 混合导入

// 动态 import() — ES2020，返回 Promise
const module = await import('./math.js')
module.add(1, 2)
```

### 其他内容

## ECMA 2016 (ES7)

### Array.prototype.includes()

+ 判断一个数组是否包含一个指定的值，如果包含则返回 true，否则返回 false

### 幂运算符**

+ a**b 指数运算符，它与 Math.pow(a, b)相同

  ```js
  2 ** 2 // 4
  2 ** 3 // 8
  // 右结合：多个指数运算符连用时，是从最右边开始计算的
  2 ** 3 ** 2 // 相当于 2 ** (3 ** 2) = 512

  // 可以与等号结合，形成赋值运算符（**=）
  let a = 1.5;
  a **= 2; // 等同于 a = a * a;

  let b = 4;
  b **= 3; // 等同于 b = b * b * b;
  ```

## ECMA 2017 (ES8)

### async/await

+ async 函数：async 函数返回一个 Promise 对象，可以使用 then 方法添加回调函数。
  + async 函数可以与 Promise 一起使用，用于处理异步操作。
  + async 函数可以与 Generator 函数一起使用，实现异步编程。
+ await 语句：await 语句用于等待一个 Promise 对象，其参数应该是一个 Promise 对象，如果不是，就会用 Promise.resolve() 方法将其转为 Promise 对象。
  + await 语句只能用于 async 函数之中，如果 await 语句用在普通函数中，就会报错。

### Object.values()/Object.entries()

+ Object.values(): 返回对象的value数组。
+ Object.entries(): 返回对象的[key, value]数组。

  ```js
  const obj = {
    a: 1,
    b: 2,
    c: 3,
    d: 4,
  };

  console.log(Object.values(obj)); // [ 1, 2, 3, 4 ]
  console.log(Object.entries(obj)); // [ [ 'a', 1 ], [ 'b', 2 ], [ 'c', 3 ], [ 'd', 4 ] ]
  ```

### String padding

+ 允许将空字符串或其他字符串添加到原始字符串的开头或结尾
+ `String.padStart(targetLength,padString)`
  + 用另一个字符串填充当前字符串(如果需要会重复填充) 直到达到给定的长度
  + 填充是从当前字符串的**开头**开始的 最后返回一个**新的字符串**
+ `String.padEnd(targetLength, padString)`
  + 用另一个字符串填充当前字符串(如果需要会重复填充) 直到达到给定的长度
  + 填充是从当前字符串的**末尾**开始的 最后返回一个**新的字符串**

    ```js
    // 编号格式化
    const list = [
      {code: '1'},
      {code: '10'},
      {code: '11'},
      {code: '111'}
    ]
    list.forEach(item => {
      item.showCode = item.code.padStart(3, '0')
    })
    console.log(list);
    /*
    [
      {'code': '1', 'showCode': '001'},
      {'code': '10', 'showCode': '010'},
      {'code': '11', 'showCode': '011'},
      {'code': '111', 'showCode': '111'}
    ]
    */

    // 日期格式化 为日期补零
    const year = new Date().getFullYear()
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
    const date = new Date().getDate().toString().padStart(2, '0')
    console.log(`${year}-${month}-${date}`);
    ```

### Object.getOwnPropertyDescriptors()

+ 函数用来获取一个对象的所有自身属性的描述符 如果没有任何自身属性 则返回空对象

### SharedArrayBuffer

+ 用来表示一个通用的，固定长度的原始二进制数据缓冲区，类似于 ArrayBuffer 对象，它们都可以用来在共享内存（shared memory）上创建视图
+ 与 ArrayBuffer 不同的是，SharedArrayBuffer 不能被分离

### Atomics 对象

+ 共享内存能被同时创建和更新于工作者线程或主线程。依赖于系统（CPU，操作系统，浏览器），变化传递给所有上下文环境需要一段时间。需要通过 atomic 操作来进行同步。
+ Atomics 对象提供了一组静态方法用来对 SharedArrayBuffer 对象进行原子操作
+ 这些原子操作属于 Atomics 模块。与一般的全局对象不同，Atomics 不是构造函数，因此不能使用 new 操作符调用，也不能将其当作函数直接调用。Atomics 的所有属性和方法都是静态的（与 Math 对象一样）。

  + Atomics.add()
  将指定位置上的数组元素与给定的值相加，并返回相加前该元素的值。

  + Atomics.and()
  将指定位置上的数组元素与给定的值相与，并返回与操作前该元素的值。

  + Atomics.compareExchange()
  如果数组中指定的元素与给定的值相等，则将其更新为新的值，并返回该元素原先的值。

  + Atomics.exchange()
  将数组中指定的元素更新为给定的值，并返回该元素更新前的值。

  + Atomics.isLockFree(size)
  可以用来检测当前系统是否支持硬件级的原子操作。对于指定大小的数组，如果当前系统支持硬件级的原子操作，则返回 true；否则就意味着对于该数组，Atomics 对象中的各原子操作都只能用锁来实现。此函数面向的是技术专家。

  + Atomics.load()
  返回数组中指定元素的值。

  + Atomics.notify()
  唤醒等待队列中正在数组指定位置的元素上等待的线程。返回值为成功唤醒的线程数量。

  + Atomics.or()
  将指定位置上的数组元素与给定的值相或，并返回或操作前该元素的值。

  + Atomics.store()
  将数组中指定的元素设置为给定的值，并返回该值。

  + Atomics.sub()
  将指定位置上的数组元素与给定的值相减，并返回相减前该元素的值。

  + Atomics.wait()
  检测数组中某个指定位置上的值是否仍然是给定值，是则保持挂起直到被唤醒或超时。返回值为 “ok”、"not-equal" 或 “time-out”。调用时，如果当前线程不允许阻塞，则会抛出异常（大多数浏览器都不允许在主线程中调用 wait()）。

  + Atomics.xor()
  将指定位置上的数组元素与给定的值相异或，并返回异或操作前该元素的值。

## ECMA 2018 (ES9)

### 异步迭代

+ await可以和for...of循环一起使用，以串行的方式运行异步操作

  ```js
  async function process(array) {
    for await (let i of array) {
      doSomething(i);
    }
  }
  ```

### Promise.finally()

+ .finally()允许你指定最终的逻辑

  ```js
  function doSomething() {
    doSomething1()
      .then(doSomething2)
      .then(doSomething3)
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        // finish here!
      });
  }
  ```

### Rest/Spread 属性

+ ES2018 为对象解构提供了和数组一样的 Rest 参数（）和展开操作符

  ```js
  const myObject = {
    a: 1,
    b: 2,
    c: 3,
  };

  const { a, ...x } = myObject;
  // a = 1
  // x = { b: 2, c: 3 }
  ```

+ 可以使用它给函数传递参数

  ```js
  test({
    a: 1,
    b: 2,
    c: 3,
  });

  function test({ a, ...x }) {
    // a = 1
    // x = { b: 2, c: 3 }
  }
  ```

+ 跟数组一样，Rest 参数只能在声明的结尾处使用。此外，它只适用于每个对象的顶层，如果对象中嵌套对象则无法适用

+ 扩展运算符可以在其他对象内使用

  ```js
  const a1 = { a: 1, b: 2, c: 3 };
  const a2 = { ...a1, z: 26 };
  // a2 is { a: 1, b: 2, c: 3, z: 26 }
  ```

+ 可以使用扩展运算符拷贝一个对象，像是这样obj2 = {...obj1}，但是 这只是一个对象的**浅拷贝**

## ECMA 2019 (ES10)

### Optional catch binding 可选的 catch

+ 新特性允许在catch语句中省略异常变量，而无需声明一个命名的异常变量
  
  ```js
  try{
    // 异步操作
  } catch (error) {
    // 处理异常 但实际上并不需要使用error变量
  }

  // ES2019 可以直接省略参数
  try {
    // 异步操作
  } catch {
    // 处理异常 不需要使用error变量
  }  
 
  ```

### JSON superset 更多的JSON支持

+ ES2019 之前，JSON 是 ECMAScript 的一个子集，但有两个字符在 JSON 字符串中合法而在 JS 字符串字面量中不合法：行分隔符 ` `（U+2028）和段落分隔符 ` `（U+2029）。

+ ES2019 将这两个字符纳入 JS 字符串字面量的合法字符范围，使得 JSON 真正成为 ECMAScript 的严格子集。

+ 这意味着现在可以直接在 JS 代码中使用包含 U+2028 和 U+2029 的字符串，而无需转义：

  ```js
  // ES2019 之前需要转义
  const str = "Line1 Line2"  // SyntaxError

  // ES2019 之后可以直接使用
  const str = "Line1 Line2"  // 正常
  ```

+ 注意：JSON 标准本身仍然**不支持**注释和尾逗号，这一特性只是消除了 JSON 和 JS 字符串之间的不一致。

### 新增 Array 的 flat() 方法和 flatMap()

+ `flat()`和 `flatMap()`本质上就是是 归纳`reduce` 与 合并`concat` 的操作

+ Array.prototype.flat()
  + flat() 方法会按照一个可指定的深度递归遍历数组，并将所有元素与遍历到的子数组中的元素合并为一个新数组返回。
  + flat()方法最基本的作用就是数组降维

    ```js
    const arr1 = [1, 2, [3, 4]];
    arr1.flat();
    // [1, 2, 3, 4]

    const arr2 = [1, 2, [3, 4, [5, 6]]];
    arr2.flat();
    // [1, 2, 3, 4, [5, 6]]

    const arr3 = [1, 2, [3, 4, [5, 6]]];
    arr3.flat(2);
    // [1, 2, 3, 4, 5, 6]

    //使用 Infinity 作为深度，展开任意深度的嵌套数组
    arr3.flat(Infinity);
    // [1, 2, 3, 4, 5, 6]
    ```

  + 还可以利用flat()方法的特性来去除数组的空项

    ```js
    const arr4 = [1, 2, , 4, 5];
    arr4.flat(); // [1, 2, 4, 5]
    ```

+ Array.prototype.flatMap()
  + flatMap() 方法首先使用映射函数映射每个元素，然后将结果压缩成一个新数组。它与 map 和 深度值 1 的 flat 几乎相同，但 flatMap 通常在合并成一种方法的效率稍微高一些。 这里我们拿 map 方法与 flatMap 方法做一个比较

    ```js
    const arr1 = [1, 2, 3, 4];

    arr1.map((x) => [x * 2]);
    // [[2], [4], [6], [8]]

    arr1.flatMap((x) => [x * 2]);
    // [2, 4, 6, 8]

    // 只会将 flatMap 中的函数返回的数组 “压平” 一层
    arr1.flatMap((x) => [[x * 2]]);
    // [[2], [4], [6], [8]]
    ```

### String 的trimStart()方法和trimEnd()

+ 分别去除字符串首尾空白字符

### Object.fromEntries()

+ Object.entries()方法的作用是返回一个给定对象自身可枚举属性的键值对数组，其排列与使用 for…in 循环遍历该对象时返回的顺序一致
+ 区别在于 for-in 循环也枚举原型链中的属性 而Object.fromEntries() 则是 Object.entries() 的反转
+ Object.fromEntries() 函数传入一个键值对的列表，并返回一个带有这些键值对的新对象。这个迭代参数应该是一个能够实现@iterator 方法的的对象，返回一个迭代器对象。它生成一个具有两个元素的类似数组的对象，第一个元素是将用作属性键的值，第二个元素是与该属性键关联的值
  + 通过 Object.fromEntries， 可以将 Map 转化为 Object

    ```js
    const map = new Map([
      ["foo", "bar"],
      ["baz", 42],
    ]);
    const obj = Object.fromEntries(map);
    console.log(obj); // { foo: "bar", baz: 42 }
    ```

  + 通过 Object.fromEntries， 可以将 Array 转化为 Object

    ```js
    const arr = [
      ["0", "a"],
      ["1", "b"],
      ["2", "c"],
    ];
    const obj = Object.fromEntries(arr);
    console.log(obj); // { 0: "a", 1: "b", 2: "c" }
    ```

## ECMA 2020 (ES11)

### ?.  ?? 运算符的使用

```javascript

// ?.可选链操作符
// 可选链操作符(?.)允许读取位于连接对象链深处的属性的值，而不必明确验证链中的每个引用是否有效。(?.) 操作符的功能类似于(.)链式操作符，不同之处在于，在引用为空(nullish ) (null 或者 undefined) 的情况下不会引起错误，该表达式短路返回值是 undefined。与函数调用一起使用时，如果给定的函数不存在，则返回 undefined。

a?.b
// 等同于
a == null ? undefined : a.b
a?.[x]
// 等同于
a == null ? undefined : a[x]
a?.b()
// 等同于
a == null ? undefined : a.b()
a?.()
// 等同于
a == null ? undefined : a()


// ??空值合并操作符
// 空值合并操作符（??）是一个逻辑操作符，仅仅当左侧的操作数为 null 或者 undefined 时，才返回其右侧操作数，否则返回左侧操作数。 空值合并操作符（??）与逻辑或操作符（||）不同，逻辑或操作符会在左侧操作数为假值时返回右侧操作数。

// ||运算符
var a = obj || {}
等价于
  var a;
  if(obj === 0 || 
     obj === "" || 
     obj === false || 
     obj === null || 
     obj === undefined){
       a = {}
     } else {
       a = obj;
     }

// ??运算符
var a = obj ?? {}
等价于
  var a;
  if(obj === null || obj === undefined){
    a = {}
  } else {
    a = obj;
  }

// 链判断运算符
// 编程实务中，如果读取对象内部的某个属性，往往需要判断一下，属性的上层对象是否存在。比如，读取message.body.user.firstName这个属性，安全的写法是写成下面这样

// 错误的写法
const  firstName = message.body.user.firstName || 'default';

// 正确的写法
const firstName = (message
  && message.body
  && message.body.user
  && message.body.user.firstName) || 'default';
// 三元运算符?:也常用于判断对象是否存在。

const fooInput = myForm.querySelector('input[name=foo]')
const fooValue = fooInput ? fooInput.value : undefined
// 上面例子中，必须先判断fooInput是否存在，才能读取fooInput.value。

// 这样的层层判断非常麻烦，因此 ES2020 引入了“链判断运算符”（optional chaining operator）?.，简化上面的写法。

const firstName = message?.body?.user?.firstName || 'default';
const fooValue = myForm.querySelector('input[name=foo]')?.value
// 上面代码使用了?.运算符，直接在链式调用的时候判断，左侧的对象是否为null或undefined。如果是的，就不再往下运算，而是返回undefined。

// 下面是判断对象方法是否存在，如果存在就立即执行的例子。

iterator.return?.()
// 对于那些可能没有实现的方法，这个运算符尤其有用。

if (myForm.checkValidity?.() === false) {
  // 表单校验失败
  return;
}

// 读取对象属性的时候，如果某个属性的值是null或undefined，有时候需要为它们指定默认值。常见做法是通过||运算符指定默认值。

const headerText = response.settings.headerText || 'Hello, world!';
const animationDuration = response.settings.animationDuration || 300;
const showSplashScreen = response.settings.showSplashScreen || true;
// 上面的三行代码都通过||运算符指定默认值，但是这样写是错的。开发者的原意是，只要属性的值为null或undefined，默认值就会生效，但是属性的值如果为空字符串或false或0，默认值也会生效。

// 为了避免这种情况，ES2020 引入了一个新的 Null 判断运算符??。它的行为类似 || ，但是只有运算符左侧的值为null或undefined时，才会返回右侧的值。

const headerText = response.settings.headerText ?? 'Hello, world!';
const animationDuration = response.settings.animationDuration ?? 300;
const showSplashScreen = response.settings.showSplashScreen ?? true;
// 上面代码中，默认值只有在左侧属性值为null或undefined时，才会生效。

// 这个运算符的一个目的，就是跟链判断运算符?.配合使用，为null或undefined的值设置默认值。

const animationDuration = response.settings?.animationDuration ?? 300;
// 上面代码中，如果response.settings是null或undefined，或者response.settings.animationDuration是null或undefined，就会返回默认值300。也就是说，这一行代码包括了两级属性的判断。


```

### globalThis 全局对象

+ 不同的环境对应的全局对象的获取方式也是不同的
  + `浏览器` 全局对象是 `window`
  + `web worker` 全局对象是 `self`
  + `nodejs` 全局对象是 `global`

+ 通过这个全局对象不用再去区分到底是在哪个环境下 只需要使用globalThis即可

### Promise.allSettled()

+ 在之前有两个方法可以对Promise进行组合，分别是Promise.all() 和Promise.race()

  + Promise.race()：只要有一个resolve就返回(返回最快执行的那个)
  + Promise.all()：它会等待所有的Promise都运行完毕之后返回，如果其中有一个Promise被rejected，那么整个Promise.all()都会被rejected。在这种情况下，如果有一个Promise被rejected，其他的Promise的结果也都获取不了。
  
  + Promise.allSettled(): 这个方法会等待所有的Promise结束，不管他们是否被rejected,所以可以获得所有的结果

### 动态 import

+ 使用import()函数，返回结果是一个promise对象，成功返回的值为模块中暴露的对象

  ```js
  // import * as m1 from './hello.js';
  // 获取元素
  const btn = document.getElementById('btn');

  btn.click = function(){
    import('./hello.js').then(module => {
      module.hello()
    })
  }
  ```

## ECMA 2021 (ES12)

### String.prototype.replaceAll

+ 如果想要替换所有的 string occurrences，则需要使用 String.prototype.replace 和全局 regexp 的组合。现在，String.prototype.replaceAll简化了这一点。

  ```js
  const str = "hello-world";
  
  // before
  str.replace(/-/g, "_")
  // "hello_world"
  
  // now
  str.replaceAll("-", "_")
  // "hello_world"
  ```

### Promise.any()

+ 当你想处理第一个 fulfills 的 Promise 时，可以使用 Promise.any
+ 与 Promise.race 不同，当其中一个 promises fail 时，它不会 reject

  ```js
  // 官方提供例子-检测哪个网站更快
  Promise.any([
    fetch('https://v8.dev/').then(() => 'home'),
    fetch('https://v8.dev/blog').then(() => 'blog'),
    fetch('https://v8.dev/docs').then(() => 'docs')
  ]).then((first) => {
    // Any of the promises was fulfilled.
    console.log(first);
    // → 'home'
  }).catch((error) => {
    // All of the promises were rejected.
    console.log(error);
  });
  ```

### 逻辑赋值运算符

+ 是逻辑运算符(&&, || and ??)和赋值运算符(=)的组合

  ```js
  a &&= b; //  a = a && b;
  a ||= b; //  a = a || b;
  a ??= b; //  a = a ?? b;

  // 它们的一个用途是，为变量或属性设置默认值。

  // 老的写法
  user.id = user.id || 1;

  // 新的写法
  user.id ||= 1;

  // ??= 空赋值运算符，仅在 x 是 null 或 undefined 时对其赋值
  let a = 0;
  a ??= 1;
  console.log(a); // 0 (0 不是 null/undefined，不赋值)

  let b = null;
  b ??= 1;
  console.log(b); // 1
  ```

### WeakRef 弱引用

+ WeakRef允许你创建一个对对象的弱引用。弱引用意味着如果没有其他强引用指向该对象，垃圾回收器可以自动回收该对象

  ```js
  let obj = { data: 'example' };
  let weakRef = new WeakRef(obj);

  // 通过弱引用获取对象
  let target = weakRef.deref();
  console.log(target); // { data: 'example' }

  obj = null; // 移除对原始对象的强引用

  // 在垃圾回收之后，弱引用将返回 undefined
  target = weakRef.deref();
  console.log(target); // undefined
  ```

  >在上面的示例中，我们首先创建了一个对象obj，然后使用WeakRef创建了一个对obj的弱引用weakRef。通过deref()方法，我们可以通过弱引用获取原始对象。当我们移除对原始对象的强引用后，垃圾回收器会自动回收对象，此时通过弱引用获取的结果将为undefined。

### FinalizationRegistry

+ 允许注册在对象被垃圾回收时执行的回调函数

  ```js
  let obj = { data: 'example' };
  let finalizationRegistry = new FinalizationRegistry((heldValue) => {
    console.log('Object has been garbage collected:', heldValue);
  });

  finalizationRegistry.register(obj, 'some value');

  obj = null; // 移除对原始对象的强引用

  // 在垃圾回收之后，注册的回调函数将被执行
  ```

  > 在上面的示例中，我们创建了一个对象obj和一个FinalizationRegistry实例finalizationRegistry。然后，我们使用register()方法将对象obj和一个额外的值注册到finalizationRegistry中。当我们移除对原始对象的强引用后，垃圾回收器会自动回收对象，并执行注册的回调函数

## ECMA 2022 (ES13)

### Top-Level await

+ 之前只能 async await, 现在则可以在模块顶层直接使用 await

+ 动态导入模块：在顶层使用 await 可以更简洁地处理动态导入模块的情况，避免了回调地狱或额外的 async 函数包装。

  ```js
  // 以前的写法
  (async () => {
    const module = await import('./module.js');
    const result = module.someFunction();
    console.log(result);
  })();

  // 使用 topLevelAwait
  const module = await import('./module.js');
  const result = module.someFunction();
  console.log(result);
  ```

+ 等待异步操作：在初始化模块时，可以直接等待异步操作完成，例如从远程服务器获取数据。

  ```js
  // 使用 topLevelAwait 
  const config = await fetchConfigFromServer();
  const data = await fetchDataFromDatabase(config);
  ```

### .at() 在所有基本可索引类中添加的方法

+ 可以通过任意可索引的类型（Array，String，和 TypedArray）上的 .at 方法，来访问任意一个反向索引、或者是正向索引的元素

  ```js
  const arr = [1,2];
  arr.at(-1); // 2
  arr.at(-2); // 1
  ```

### Object.hasOwn()

+ 采用一种使更易于访问的方法替代 Object.prototype.hasOwnProperty()
+ 直接通过对象自身的 hasOwnProperty 来使用 obj.hasOwnProperty('foo') 是不安全的，因为这个 obj 可能覆盖了 hasOwnProperty 的定义

  ```js
  let hasOwnProperty = Object.prototype.hasOwnProperty

  if (hasOwnProperty.call(object, "foo")) {
    console.log("has property foo")
  }

  // 此提案将该代码简化为：

  if (Object.hasOwn(object, "foo")) {
    console.log("has property foo")
  }
  ```

### 私有属性

+ 使用 # 标志 在类外部不可访问

  ```js
  class Person{
    // 公有属性
    name;
    // 私有属性
    #age;
    #weight;
    constructor(name, age, weight){
      this.name = name;
      this.#age = age;
      this.#weight = weight;
    }
    // 类内部通过方法可以访问私有属性
    intro(){
      console.log(this.name);
      console.log(this.#age);
      console.log(this.#weight);
    }
  }
  const girl = new Person('zs', 18, '45kg')
  console.log(girl) // Person { name: 'zs' } 私有属性外部不可访问
  ```

### Error Cause

+ 允许在创建 Error 时通过 `cause` 选项指定原始错误，便于错误链追踪

  ```js
  try {
    fetchData();
  } catch (err) {
    throw new Error('获取数据失败', { cause: err });
  }
  ```

### Class Static Block

+ 类中可以使用 `static {}` 块进行复杂的静态成员初始化

  ```js
  class MyClass {
    static value;
    static {
      // 在静态块中执行复杂的初始化逻辑
      try {
        this.value = loadConfig();
      } catch {
        this.value = defaultValue;
      }
    }
  }
  ```

### 私有字段的 in 检查（Ergonomic brand checks）

+ 使用 `#field in obj` 检查对象是否拥有某个私有字段

  ```js
  class Person {
    #name;
    constructor(name) { this.#name = name; }
    static isPerson(obj) {
      return #name in obj; // true if obj is a Person instance
    }
  }
  ```

## ECMA 2023 (ES14)

### findLast() findLastIndex() 从后向前遍历数组

+ findLast() 会返回第一个查找到的元素，如果没有找到，就会返回 undefined；
+ findLastIndex() 会返回第一个查找到的元素的索引。如果没有找到，就会返回 -1；

### toSorted()、toReversed()、toSpliced()、with()

+ 不改变原数组，返回一个原数组的拷贝
+ 具体用法见 JSNote 数组方法

### Symbols as WeakMap Keys

+ 允许使用 Symbol 作为 WeakMap 的键（之前只允许对象）

  ```js
  const wm = new WeakMap();
  const sym = Symbol('myKey');
  wm.set(sym, 'value');
  console.log(wm.get(sym)); // 'value'
  ```

### Hashbang Grammar

+ 允许 JS 文件以 `#!` 开头（shebang），使其可以直接作为脚本执行

  ```js
  #!/usr/bin/env node
  console.log('Hello from script!');
  ```

## ECMA 2024 (ES15)

### Object.groupBy 和 Map.groupBy 用于根据指定的条件将对象和映射分组

+ **Object.groupBy**：根据给定的回调函数对对象的属性进行分组

  ```js
  const items = [
    { type: 'fruit', name: 'apple' },
    { type: 'vegetable', name: 'carrot' },
    { type: 'fruit', name: 'banana' }
  ];

  const groupedByType = Object.groupBy(items, item => item.type);
  console.log(groupedByType);
  // 输出：{ fruit: [{ type: 'fruit', name: 'apple' }, { type: 'fruit', name: 'banana' }], vegetable: [{ type: 'vegetable', name: 'carrot' }] }
  ```

+ **Map.groupBy**：类似于 Object.groupBy，但用于 Map 数据结构
  
  ```js
  const items = new Map([
    ['apple', 'fruit'],
    ['carrot', 'vegetable'],
    ['banana', 'fruit']
  ]);

  const groupedByType = Map.groupBy(items, ([name, type]) => type);
  console.log(groupedByType);
  // 输出：Map { 'fruit' => Map { 'apple' => 'fruit', 'banana' => 'fruit' }, 'vegetable' => Map { 'carrot' => 'vegetable' } }
  ```

### Promise.withResolvers 返回一个带有 resolve 和 reject 方法的对象

```js
const { promise, resolve, reject } = Promise.withResolvers();

setTimeout(() => resolve('done'), 1000);

promise.then(value => console.log(value)); // 输出：done
```

### String.prototype.isWellFormed 和 String.prototype.toWellFormed

+ 用于检查和修复字符串的有效性 特别是处理 Unicode 字符串时

+ **isWellFormed**：检查字符串是否是格式良好的 Unicode 字符串。

  ```js
  const str = 'hello';
  console.log(str.isWellFormed()); // 输出：true
  ```

+ **toWellFormed**：将字符串转换为格式良好的 Unicode 字符串。

  ```js
  const invalidStr = '\uD800';
  console.log(invalidStr.toWellFormed()); // 输出：（替换字符）
  ```

### Atomics.waitAsync 是一种新的异步等待机制，允许在多线程环境中等待特定条件变为真

  ```js
  const sharedBuffer = new SharedArrayBuffer(4);
  const int32Array = new Int32Array(sharedBuffer);

  async function wait() {
    const result = await Atomics.waitAsync(int32Array, 0, 0).value;
    console.log(result); // 输出："ok"（如果条件满足）
  }

  wait();
  Atomics.store(int32Array, 0, 42);
  Atomics.notify(int32Array, 0, 1);
  ```

### 正则表达式 v 标识

+ ES2024 引入了正则表达式的 v 标识，用于启用新的字符类语法和改进的 Unicode 支持

  ```js
  const regex = /\p{Letter}/v;
  console.log(regex.test('A')); // 输出：true
  ```

### ArrayBuffer.prototype.transfer

+ 转移 ArrayBuffer 的所有权，无需复制数据

  ```js
  const buffer = new ArrayBuffer(1024);
  const transferred = buffer.transfer();
  // buffer 现在已被分离（detached），无法再使用
  console.log(transferred.byteLength); // 1024
  ```

### Resizable and Growable ArrayBuffers

+ 允许创建可调整大小的 ArrayBuffer，无需重新分配内存

  ```js
  const buffer = new ArrayBuffer(1024, { maxByteLength: 2048 });
  console.log(buffer.resizable); // true
  console.log(buffer.byteLength); // 1024

  buffer.resize(2048);
  console.log(buffer.byteLength); // 2048
  ```

## ECMA 2025 (ES16)

### Iterator Helpers

+ 为 `Iterator.prototype` 添加了一系列类似数组方法的操作，无需先将迭代器转换为数组

  ```js
  const iter = [1, 2, 3, 4, 5].values();

  // map: 映射每个值
  iter.map(x => x * 2); // Iterator { 2, 4, 6, 8, 10 }

  // filter: 过滤
  iter.filter(x => x > 2); // Iterator { 3, 4, 5 }

  // take: 取前 N 个
  iter.take(3); // Iterator { 1, 2, 3 }

  // drop: 跳过前 N 个
  iter.drop(2); // Iterator { 3, 4, 5 }

  // toArray: 转为数组
  iter.map(x => x * 2).toArray(); // [2, 4, 6, 8, 10]

  // forEach / some / every / find / reduce 等
  iter.some(x => x > 3); // true
  ```

### Promise.try()

+ 将同步函数包装为 Promise，自动捕获同步抛出的错误

  ```js
  // 以前
  new Promise((resolve) => {
    resolve(mightThrow());
  }).catch(handleError);

  // 现在
  Promise.try(() => mightThrow())
    .then(result => console.log(result))
    .catch(handleError);
  ```

### RegExp.escape()

+ 转义字符串中的正则特殊字符，避免注入攻击

  ```js
  const userInput = 'Hello. How are you?';
  const escaped = RegExp.escape(userInput);
  console.log(escaped); // "Hello\\. How are you\\?"

  new RegExp(escaped).test(userInput); // true
  ```

### Import Attributes

+ 标准化导入属性语法，替代之前的 import assertions

  ```js
  import json from './data.json' with { type: 'json' };
  import config from './config.json' with { type: 'json' };
  ```

### Float16Array

+ 新增 16 位浮点数 TypedArray，适用于 GPU/机器学习场景

  ```js
  const arr = new Float16Array([1.5, 2.5, 3.5]);
  console.log(arr); // Float16Array [1.5, 2.5, 3.5]
  ```

### Explicit Resource Management

+ 使用 `using` 声明自动管理资源，离开作用域时自动释放

> ⚠️ 此特性已到达 Stage 4，TC39 确认预计发布于 **ES2027**。

  ```js
  {
    using file = await openFile('data.txt');
    const content = await file.read();
    console.log(content);
    // file 会自动关闭
  }
  ```

### RegExp Modifiers

+ 允许在正则表达式的局部范围内使用修饰符（如 `i`、`m`、`s`）

  ```js
  // (?i:...) 在局部范围内启用忽略大小写
  const regex = /(?i:foo)bar/;
  console.log(regex.test('FOObar')); // true
  console.log(regex.test('fooBAR')); // false (BAR 不在修饰符范围内)

  // (?-i:...) 在局部范围内禁用忽略大小写
  const regex2 = /foo(?-i:bar)/i;
  console.log(regex2.test('FOOBAR')); // true
  console.log(regex2.test('FOObar')); // false
  ```

### JSON Modules

+ 支持使用 `with { type: 'json' }` 直接导入 JSON 文件为模块

  ```js
  import data from './data.json' with { type: 'json' };
  console.log(data.name);
  ```

### Duplicate Named Capture Groups

+ 允许在不同的正则分支中使用相同的命名捕获组

  ```js
  // 以前：命名捕获组不能重名
  // /(?<year>\d{4})-\d{2}|(\d{2})-(?<year>\d{4})/  // SyntaxError

  // ES2025：允许在不同分支中重复命名
  const regex = /(?<year>\d{4})-\d{2}-\d{2}|\d{2}-\d{2}-(?<year>\d{4})/;
  const match = '2025-01-15'.match(regex);
  console.log(match.groups.year); // '2025'
  ```

### Set 集合方法

+ 为 Set 新增集合运算方法

  ```js
  const a = new Set([1, 2, 3]);
  const b = new Set([2, 3, 4]);

  a.union(b);              // Set {1, 2, 3, 4}
  a.intersection(b);       // Set {2, 3}
  a.difference(b);         // Set {1}
  a.symmetricDifference(b); // Set {1, 4}
  a.isSubsetOf(b);         // false
  a.isSupersetOf(b);       // false
  a.isDisjointFrom(b);     // false
  ```

## ECMA 2026 (ES17)

> 以下特性均已到达 Stage 4，TC39 确认纳入 ES2026。

### Upsert（Map 原子性插入/更新）

+ 为 `Map` 新增 `getOrInsert()` 和 `getOrInsertComputed()` 方法
+ 如果键已存在则返回现有值，不存在则插入新值，一步到位，无需先 `has()` 再 `set()`

  ```js
  const map = new Map([['a', 1]]);

  // getOrInsert：键不存在时插入指定值
  map.getOrInsert('a', 99);  // 1（已存在，不覆盖）
  map.getOrInsert('b', 2);   // 2（不存在，插入）

  // getOrInsertComputed：键不存在时通过回调计算值
  map.getOrInsertComputed('c', (key) => key.length); // 1
  ```

### JSON.parse source text access

+ `JSON.parse` 新增 reviver 回调参数 `context`，可访问原始 JSON 文本信息
+ 用于更精确的错误报告、source map 支持等场景

  ```js
  const json = '{"name": "tom", "age": 18}';
  JSON.parse(json, (key, value, context) => {
    console.log(context.source); // 原始文本片段
    return value;
  });
  ```

### Iterator Sequencing

+ 将多个迭代器串联组合成一个新的迭代器序列

  ```js
  const a = [1, 2].values();
  const b = [3, 4].values();
  const seq = Iterator.from(a).chain(b);

  for (const v of seq) {
    console.log(v); // 1, 2, 3, 4
  }
  ```

### Uint8Array to/from Base64 and Hex

+ 原生支持 `Uint8Array` 与 Base64、Hex 字符串互转，不再需要手写转换逻辑

  ```js
  const bytes = new Uint8Array([72, 101, 108, 108, 111]);

  // 转 Base64
  const b64 = bytes.toBase64();  // "SGVsbG8="

  // Base64 转回
  const decoded = Uint8Array.fromBase64(b64); // Uint8Array [72, 101, 108, 108, 111]

  // 转 Hex
  const hex = bytes.toHex();     // "48656c6c6f"
  const fromHex = Uint8Array.fromHex(hex);
  ```

### Math.sumPrecise

+ 精确求和，避免浮点数精度丢失（基于 Kahan 求和算法）

  ```js
  // 传统方式
  0.1 + 0.2              // 0.30000000000000004

  // Math.sumPrecise 接收可迭代对象
  Math.sumPrecise([0.1, 0.2])           // 0.3
  Math.sumPrecise([0.1, 0.1, 0.1])      // 0.3
  Math.sumPrecise(new Float64Array([1e16, 1, -1e16])) // 1（传统求和得 0）
  ```

### Error.isError

+ 判断一个值是否为 Error 实例
+ 替代 `instanceof Error`，在跨 realm（iframe、Worker）场景下更可靠

  ```js
  Error.isError(new Error('oops'));    // true
  Error.isError(new TypeError('bad')); // true
  Error.isError('not an error');       // false
  Error.isError(null);                 // false

  // 跨 iframe 也能正确判断（instanceof 会失败）
  ```

### Array.fromAsync

+ 从异步可迭代对象创建数组，类似 `Array.from()` 的异步版本
+ 返回一个 Promise，resolve 的值为收集到的数组

  ```js
  // 异步生成器
  async function* generateIds() {
    yield 1;
    await delay(100);
    yield 2;
    await delay(100);
    yield 3;
  }

  const ids = await Array.fromAsync(generateIds());
  console.log(ids); // [1, 2, 3]

  // 也支持映射函数（第二个参数）
  const doubled = await Array.fromAsync(generateIds(), x => x * 2);
  console.log(doubled); // [2, 4, 6]
  ```
