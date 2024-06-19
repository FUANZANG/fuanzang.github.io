# ECMA Script 标准

## ECMA 2015 (ES6)

### let const 块级作用域

+ 作用域
  + 全局作用域
  + 函数作用域
  + 块级作用（es6新增）
    + 块，就是 {} 包裹起来的一个范围，比如if或者for中的{}
+ let 和 var 有另外一个区别，let 不会进行变量声明提升
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

// 连续结构赋值 从接口中结构出data 然后解构出content 并重命名为 title
let { data:{content: title} } = await axios.get('/api/data')
```

### 模板字符串字面量

```js
const name = "tom"
const str = `hey,${name},${1 + 1},${Math.random()}`
console.log(str) // hey,tom,2,0.6840647891683806'
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
console.log(obj) // { 3: 18, name: 'tom', bar: 'bar', sayHi: λ }
```

### 对象的扩展方法

+ `Object.assign()`

  ```js
  // 对象扩展方法
  Object.assign 方法

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
pi.sayHi()
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
    super(name, age),
    this.number = number,
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
console.log(s) // Set { 0: 1, 1: 2, 2: 3, 3: 4 }

s.forEach(i => console.log(i)) // 1 2 3 4

for(let i of s){
  console.log(i) // 1 2 3 4
}

console.log(s.size) // 4

console.log(s.has(4)) // true

console.log(s.delete(100)) // false
console.log(s) // Set { 0: 1, 1: 2, 2: 3, 3: 4 }

s.clear()
console.log(s) // set {}

// 数组去重
const arr = [1, 3, 4, 4, 5, 6, 6]

const b = Array.from(new Set(arr))
// 或者
const b = [...new Set(arr)]

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
console.log(obj['[Object Object]']) // undefined

const map = new Map()
const a = {a: 1}
map.set(a, 100)
console.log(map) // Map { { a: 1 }: 100 }
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

const obj = {
  [Symbol.toStringTag]: "XObject"
}
console.log(obj.toString()) // '[object XObject]'
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

### 其他内容

## ECMA 2016 (ES7)

### Array.prototype.includes()

+ 判断一个数组是否包含一个指定的值，如果包含则返回 true，否则返回 false

### 幂运算符**

+ a**b 指数运算符，它与 Math.pow(a, b)相同

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

### Optional catch binding 可选定的 catch

+ 新特性允许在catch语句中使用一个简单的占位符，而无需声明一个命名的异常变量
  
  ```js
  try{
    // 异步操作
  } catch (error) {
    // 处理异常 但实际上并不需要使用error变量
  }

  // 现在可以使用 _ 占位
  try {
    // 异步操作
  } catch (_) {
    // 处理异常 不需要使用error变量
  }  
 
  ```

### JSON superset 更多的JSON支持

+ 以前，如果我需要在JSON中使用一些复杂的数据类型，例如日期对象或者正则表达式，我需要手动将它们转换为字符串，并在需要的时候再进行解析。这样的处理方式非常繁琐，容易出错。

+ 现在，有了JSON superset，我可以直接在JSON中使用更多的JavaScript语法元素，而不需要手动进行转换。这让我能够更方便地处理复杂的数据结构，提高了开发效率。

  + 另外，JSON superset还引入了一些有趣的功能。例如，我可以在JSON中使用注释，这让我的代码更加清晰易懂。
  + 另外，我还可以在JSON中使用尾逗号，这样当我在后续添加、删除或者调整数据时，不会破坏JSON的结构。

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

### ?.  ??  ||=  ??=  &&= 运算符的使用

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

// ??=  空赋值运算符
// 逻辑空赋值运算符 (x ??= y) 仅在 x 是 null 或 undefined 时对其赋值
let a = 0;
a ??= 1;
console.log(a); // 0
 
let b = null;
b ??= 1;
console.log(b); // 1

// 指数运算符 **
2 ** 2 // 4
2 ** 3 // 8
//这个运算符的一个特点是右结合，而不是常见的左结合。多个指数运算符连用时，是从最右边开始计算的。
2 ** 3 ** 2 // 相当于 2 ** (3 ** 2)
// 512

// 指数运算符可以与等号结合，形成一个新的赋值运算符（**=）
let a = 1.5;
a **= 2;
// 等同于 a = a * a;

let b = 4;
b **= 3;
// 等同于 b = b * b * b;

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


//将逻辑运算符与赋值运算符进行结合。

// 或赋值运算符
x ||= y
// 等同于
x || (x = y)

// 与赋值运算符
x &&= y
// 等同于
x && (x = y)

// Null 赋值运算符
x ??= y
// 等同于
x ?? (x = y)
// 这三个运算符||=、&&=、??=相当于先进行逻辑运算，然后根据运算结果，再视情况进行赋值运算。

// 它们的一个用途是，为变量或属性设置默认值。

// 老的写法
user.id = user.id || 1;

// 新的写法
user.id ||= 1;
// 上面示例中，user.id属性如果不存在，则设为1，新的写法比老的写法更紧凑一些。

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

## ECMA 2023 (ES14)

### findLast() findLastIndex() 从后向前遍历数组

+ findLast() 会返回第一个查找到的元素，如果没有找到，就会返回 undefined；
+ findLastIndex() 会返回第一个查找到的元素的索引。如果没有找到，就会返回 -1；

### toSorted()、toReversed()、toSpliced()、with()

+ 不改变原数组，返回一个原数组的拷贝
+ 具体用法见 JSNote 数组方法

## ECMA 2024 (ES15)

### 记录与元组

+ 记录（Record）类似于对象，但其属性是不可变的。可以使用 # 符号来创建记录
  `const record = #{ a: 1, b: 2 };`

+ 元组（Tuple）类似于数组，但其元素是不可变的。可以使用 # 符号来创建元组
  `const tuple = #[1, 2, 3];`

### 哈希集合和哈希映射（Hash Collections）

+ HashSet 和 HashMap，提供了更高效的数据存储和访问方式，尤其在需要快速查找和删除操作时表现出色

+ **HashSet**：类似于 Set，但使用哈希表实现，具有更快的查找速度
  `const hashSet = new HashSet([1, 2, 3]);`

+ **HashMap**：类似于 Map，但使用哈希表实现，键值对查找速度更快
  `const hashMap = new HashMap([['key1', 'value1'], ['key2', 'value2']]);`

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
  console.log(invalidStr.toWellFormed()); // 输出：�（替换字符）
  ```

### 异步迭代器改进（Async Iteration Enhancements）

+ 为了简化异步数据流的处理，ES2024 对异步迭代器进行了改进，提供了新的 take 和 drop 方法，使得对异步数据流的处理更加直观

+ take：获取前 N 个元素

  ```js
  for await (const item of asyncIterable.take(5)) {
    console.log(item); 
  }
  ```

+ drop：跳过前 N 个元素

  ```js
  for await (const item of asyncIterable.drop(3)) {
    console.log(item);
  }
  ```

### 顶级 await（Top-Level Await）

+ ES2024 进一步完善了顶级 await 的功能，使得在模块的顶级作用域中可以直接使用 await，从而简化了异步代码的编写

  ```js
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  console.log(data);
  ```

### 逻辑赋值运算符改进（Logical Assignment Operators Enhancements）

+ 逻辑赋值运算符（例如 &&=, ||=, ??=）在 ES2024 中得到了改进，增加了对短路求值和赋值操作的支持，使代码更简洁

  ```js
  let a = 1;
  let b = null;

  a &&= 2; // 等同于 if (a) a = 2;
  b ??= 3; // 等同于 if (b == null) b = 3;
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

### 元素上限（Element Cap）

+ 为了更好地控制数组和集合的大小，ES2024 引入了元素上限功能。通过 Array.prototype.cap 和 Set.prototype.cap 方法，可以限制数组和集合的最大长度。

  ```js
  const arr = [1, 2, 3, 4, 5];
  arr.cap(3); // arr 现在为 [1, 2, 3]
  ```

