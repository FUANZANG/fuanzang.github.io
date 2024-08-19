# TypeScript Note

[TypeScript 教程](https://wangdoc.com/typescript/)

## 基础类型

+ TypeScript 支持 JavaScript 的所有原始类型，并增加了额外的类型系统

  ```ts
  // 7 种原始类型
  let str: string = "hello"
  let num: number = 42          // 整数、浮点数、NaN、Infinity 都是 number
  let bool: boolean = true
  let n: null = null
  let u: undefined = undefined
  let sym: symbol = Symbol("id")
  let big: bigint = 9007199254740991n

  // 数组
  let arr1: number[] = [1, 2, 3]
  let arr2: Array<string> = ["a", "b"]  // 泛型写法

  // 元组（固定长度和类型的数组）
  let tuple: [string, number, boolean] = ["hello", 42, true]

  // 对象
  let obj: { name: string; age: number } = { name: "Tom", age: 18 }
  ```

### any vs unknown vs never vs void

```ts
// any：放弃类型检查，任意操作（应尽量避免）
let a: any = "hello"
a.foo()  // 编译不报错，运行时会崩

// unknown：安全的 any，使用前必须类型收窄
let u: unknown = "hello"
// u.toUpperCase()  // ❌ 编译报错
if (typeof u === "string") {
  u.toUpperCase()    // ✅ 收窄后可用
}

// never：永远不会出现的值
function throwError(msg: string): never {
  throw new Error(msg)  // 函数永远不会正常返回
}
// 用于穷举检查（见下方"可辨识联合"章节）

// void：函数没有返回值
function log(msg: string): void {
  console.log(msg)  // 没有 return
}

// void vs undefined
// void 表示"不关心返回值"，undefined 表示"返回值必须是 undefined"
type VoidFn = () => void
const fn: VoidFn = () => { return 123 }  // ✅ 合法，void 不检查返回值
type UndefFn = () => undefined
// const fn2: UndefFn = () => { return 123 }  // ❌ 报错
```

### object vs Object vs {}

```ts
// object：非原始类型（不包括 string/number/boolean 等）
let obj: object = { a: 1 }
// obj = "hello"  // ❌ 报错

// Object：所有有 toString() 方法的值（几乎等于任何值）
let obj2: Object = "hello"  // ✅ 字符串也有 toString
let obj3: Object = 42       // ✅ 数字也有 toString
// 基本不用，太宽泛

// {}：空对象类型，等价于 Object（不推荐）
let obj4: {} = "hello"  // ✅ 合法，但语义不清晰
// 推荐用 Record<string, unknown> 替代 {}
```

## 联合类型与交叉类型

### 联合类型（Union）

+ 表示值可以是多种类型之一

  ```ts
  // 基础联合
  let id: string | number
  id = "abc"   // ✅
  id = 123     // ✅
  // id = true // ❌

  // 字面量联合（非常常用）
  type Status = 'loading' | 'success' | 'error'
  type Direction = 'up' | 'down' | 'left' | 'right'

  function setStatus(status: Status) {
    // status 只能是这三个字符串之一
  }

  // 联合类型的成员访问（只能访问共有成员）
  function getLength(value: string | number[]) {
    return value.length  // ✅ string 和 number[] 都有 length
  }

  function process(value: string | number) {
    // value.toFixed()  // ❌ string 没有 toFixed
    // value.toUpperCase()  // ❌ number 没有 toUpperCase
    value.toString()  // ✅ 共有方法
  }
  ```

### 交叉类型（Intersection）

+ 将多个类型合并为一个类型

  ```ts
  type A = { name: string }
  type B = { age: number }
  type C = A & B  // { name: string; age: number }

  const person: C = { name: "Tom", age: 18 }  // 必须同时满足 A 和 B

  // 实际场景：合并配置
  type BaseConfig = { timeout: number; retries: number }
  type ApiConfig = BaseConfig & { endpoint: string; headers: Record<string, string> }
  ```

## 类型断言

+ 类型断言有两种形式：尖括号语法和as语法

  ```ts
  // 尖括号语法
  let someValue: any = "this is a string";
  let strLength: number = (<string>someValue).length;
  ```

  ```ts
  // as语法
  let someValue: any = "this is a string";
  let strLength: number = (someValue as string).length;
  ```

+ 在 JSX/TSX 中只能使用 `as` 语法（`<>` 会被识别为 JSX 标签）

+ 非空断言 `!`

  ```ts
  function getUser(id: number): User | null { /* ... */ }

  const user = getUser(1)
  // user.name  // ❌ 可能为 null
  user!.name     // ✅ 断言 user 一定不为 null（你自己确保）

  // DOM 操作中常用
  const input = document.getElementById('input')! as HTMLInputElement
  input.value = 'hello'
  ```

## 类型守卫与类型收窄

### 类型谓词

+ 类型谓词是实现类型守卫的一种方式，格式为 `value is Type`

  ```ts
  function isString(value: any): value is string {
    return typeof value === "string";
  }

  function printValue(value: any) {
    if (isString(value)) {
      console.log(value.toUpperCase());
    } else {
      console.log(value);
    }
  }

  printValue("hello"); // "HELLO"
  ```

### typeof / instanceof / in 收窄

```ts
// typeof 收窄
function format(value: string | number) {
  if (typeof value === "string") {
    return value.toUpperCase()  // value 收窄为 string
  }
  return value.toFixed(2)       // value 收窄为 number
}

// instanceof 收窄
function processDate(value: Date | string) {
  if (value instanceof Date) {
    return value.getTime()      // value 收窄为 Date
  }
  return Date.parse(value)      // value 收窄为 string
}

// in 收窄
type Fish = { swim: () => void }
type Bird = { fly: () => void }

function move(animal: Fish | Bird) {
  if ("swim" in animal) {
    animal.swim()  // animal 收窄为 Fish
  } else {
    animal.fly()   // animal 收窄为 Bird
  }
}
```

### 可辨识联合（Discriminated Union）

+ 通过一个公共的"标签"字段来区分不同的类型

```ts
type Result<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }
  | { status: 'loading' }

function handle(result: Result<string>) {
  switch (result.status) {
    case 'success':
      console.log(result.data)     // ✅ result 收窄为成功类型
      break
    case 'error':
      console.log(result.error)    // ✅ result 收窄为错误类型
      break
    case 'loading':
      console.log('加载中...')
      break
  }
}

// never 穷举检查：确保所有情况都被处理
function assertNever(value: never): never {
  throw new Error(`未处理的类型: ${value}`)
}

function handle2(result: Result<string>) {
  switch (result.status) {
    case 'success': return result.data
    case 'error': return result.error.message
    case 'loading': return 'loading...'
    default: return assertNever(result)  // 如果漏了某个 case，编译报错
  }
}
```

## 类型别名

+ 类型别名用于为类型创建一个新名称，以便在代码中更方便地使用。

  ```ts
  type Point = {
    x: number;
    y: number;
  };

  function printPoint(point: Point) {
    console.log(`x: ${point.x}, y: ${point.y}`);
  }

  printPoint({ x: 10, y: 20 }); // "x: 10, y: 20"
  ```

+ 类型别名 vs 接口

  ```ts
  // 接口可以被 extends 和 implements，可以被声明合并
  interface Animal { name: string }
  interface Animal { age: number }  // 声明合并：{ name: string; age: number }

  // 类型别名支持联合、交叉、映射等高级操作，接口不行
  type ID = string | number           // 联合类型，接口做不到
  type StringOrNumber = string & { __brand: 'id' }  // 交叉类型
  type Readonly2<T> = { readonly [K in keyof T]: T[K] }  // 映射类型

  // 经验法则：定义对象形状用 interface，其他用 type
  ```

## keyof / typeof / in 操作符

### keyof

+ 获取对象类型的所有键，返回联合类型

  ```ts
  interface User {
    name: string
    age: number
    email: string
  }

  type UserKeys = keyof User  // "name" | "age" | "email"

  function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key]
  }

  const user: User = { name: "Tom", age: 18, email: "tom@test.com" }
  getProperty(user, "name")   // ✅ 返回 string
  // getProperty(user, "foo") // ❌ 编译报错，"foo" 不是 User 的键
  ```

### typeof

+ 从值反推类型（仅在类型上下文中使用）

  ```ts
  const config = {
    host: "localhost",
    port: 3000,
    debug: true
  }

  type Config = typeof config
  // 等价于：{ host: string; port: number; debug: boolean }

  // 常用于获取函数参数类型
  function createUser(name: string, age: number) {
    return { name, age }
  }
  type CreateUserFn = typeof createUser
  // (name: string, age: number) => { name: string; age: number }
  ```

### in

+ 在映射类型中遍历联合类型

  ```ts
  type Keys = "name" | "age" | "email"

  type User = {
    [K in Keys]: string  // 遍历 Keys 中的每个成员作为键名
  }
  // 等价于：{ name: string; age: string; email: string }
  ```

## 类型推断

+ 类型推断是TypeScript自动推断变量的类型，无需显式声明。

  ```ts
  let num = 10; // TypeScript会自动推断num的类型为number
  let str = "hello"; // TypeScript会自动推断str的类型为string
  ```

+ 上下文推断（根据使用位置推断类型）

  ```ts
  // 函数返回值自动推断
  function add(a: number, b: number) {
    return a + b  // 返回类型自动推断为 number
  }

  // 数组元素推断
  const arr = [1, 2, 3]  // number[]
  const mixed = [1, "hello", true]  // (string | number | boolean)[]

  // 对象字面量推断
  const obj = { name: "Tom", age: 18 }
  // 推断为 { name: string; age: number }
  ```

## 类型兼容性

+ TypeScript中的类型兼容性是基于结构子类型的，即如果两个对象具有相同的属性和方法，则它们是兼容的。

  ```ts
  interface Animal {
    name: string;
    age: number;
  }

  interface Dog extends Animal {
    breed: string;
  }

  let animal: Animal = { name: "Tom", age: 3 };
  let dog: Dog = { name: "Tom", age: 3, breed: "Labrador" };

  animal = dog; // 兼容（Dog 是 Animal 的子类型）
  dog = animal; // 不兼容，因为animal缺少breed属性
  ```

## 接口

+ 接口用于定义对象的类型，可以包含属性和方法。

  ```ts
  interface Person {
    name: string;
    age: number;
    greet(): void;
  }

  let person: Person = {
    name: "John",
    age: 30,
    greet() {
      console.log(`Hello, my name is ${this.name}`);
    },
  };

  person.greet(); // "Hello, my name is John"
  ```

+ 可选属性与只读属性

  ```ts
  interface User {
    name: string           // 必填
    age?: number           // 可选
    readonly id: number    // 只读，初始化后不可修改
  }

  const user: User = { id: 1, name: "Tom" }
  // user.id = 2           // ❌ 只读属性不可修改
  user.age = 18            // ✅ 可选属性可以后续赋值
  ```

+ 索引签名

  ```ts
  // 字符串索引
  interface StringMap {
    [key: string]: string
  }
  const map: StringMap = { name: "Tom", city: "Shanghai" }

  // 数字索引
  interface NumberArray {
    [index: number]: string
  }
  const arr: NumberArray = ["a", "b", "c"]
  ```

## 类

+ 类是TypeScript中的一种面向对象编程的语法，可以包含属性和方法。

  ```ts
  class Person {
    name: string;
    age: number;

    constructor(name: string, age: number) {
      this.name = name;
      this.age = age;
    }

    greet() {
      console.log(`Hello, my name is ${this.name}`);
    }
  }

  let person = new Person("John", 30);
  person.greet(); // "Hello, my name is John"
  ```

+ 访问修饰符

  ```ts
  class Animal {
    public name: string      // 默认就是 public，任何地方可访问
    protected age: number    // 本类和子类可访问
    private _id: number      // 仅本类可访问

    constructor(name: string, age: number, id: number) {
      this.name = name
      this.age = age
      this._id = id
    }
  }

  class Dog extends Animal {
    bark() {
      console.log(`${this.name} is ${this.age}`) // ✅ name 和 age 可访问
      // console.log(this._id)                    // ❌ private 不可访问
    }
  }

  const dog = new Dog("Rex", 3, 1)
  console.log(dog.name)   // ✅ public
  // console.log(dog.age) // ❌ protected 外部不可访问
  ```

+ 构造函数参数属性（简写）

  ```ts
  // 传统写法
  class User {
    name: string
    age: number
    constructor(name: string, age: number) {
      this.name = name
      this.age = age
    }
  }

  // 参数属性简写（效果完全一样）
  class User {
    constructor(
      public name: string,
      public age: number,
      private id: number
    ) {}
  }
  ```

+ 抽象类

  ```ts
  abstract class Shape {
    abstract area(): number  // 抽象方法，子类必须实现
    describe() {
      console.log(`面积: ${this.area()}`)
    }
  }

  class Circle extends Shape {
    constructor(private radius: number) { super() }
    area() { return Math.PI * this.radius ** 2 }
  }

  // new Shape()  // ❌ 抽象类不能直接实例化
  const c = new Circle(5)
  c.describe()  // 面积: 78.539...
  ```

## 泛型

+ 泛型用于定义函数、接口或类，可以在编译时确定具体的类型。

  ```ts
  function identity<T>(arg: T): T {
    return arg;
  }

  let output = identity<string>("myString"); // output: string
  let output2 = identity(123); // output2: number（自动推断）
  ```

+ 泛型约束

  ```ts
  // 用 extends 约束泛型必须具有某些属性
  function getLength<T extends { length: number }>(arg: T): number {
    return arg.length
  }

  getLength("hello")    // ✅ string 有 length
  getLength([1, 2, 3]) // ✅ array 有 length
  // getLength(123)     // ❌ number 没有 length

  // 多个泛型互相约束
  function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key]
  }

  const user = { name: "Tom", age: 18 }
  getProperty(user, "name")  // ✅ 返回 string
  // getProperty(user, "foo") // ❌ "foo" 不是 user 的键
  ```

+ 泛型默认值

  ```ts
  function fetchData<T = any>(url: string): Promise<T> {
    return fetch(url).then(res => res.json())
  }

  // 使用时可以省略类型参数
  const data = await fetchData("/api/users")        // Promise<any>
  const users = await fetchData<User[]>("/api/users") // Promise<User[]>
  ```

+ 泛型接口与泛型类

  ```ts
  // 泛型接口
  interface Repository<T> {
    getById(id: number): T | undefined
    getAll(): T[]
    save(item: T): void
  }

  class UserRepo implements Repository<User> {
    private items: User[] = []
    getById(id: number) { return this.items.find(u => u.id === id) }
    getAll() { return this.items }
    save(item: User) { this.items.push(item) }
  }

  // 泛型类
  class Stack<T> {
    private items: T[] = []
    push(item: T) { this.items.push(item) }
    pop(): T | undefined { return this.items.pop() }
    peek(): T | undefined { return this.items[this.items.length - 1] }
  }

  const numStack = new Stack<number>()
  numStack.push(1)
  numStack.push(2)
  ```

## 条件类型

+ 根据条件选择不同的类型，语法类似三元表达式

  ```ts
  // 基础条件类型
  type IsString<T> = T extends string ? true : false
  type A = IsString<"hello">  // true
  type B = IsString<42>       // false

  // 实用场景：提取数组元素类型
  type ElementOf<T> = T extends (infer E)[] ? E : T
  type C = ElementOf<string[]>   // string
  type D = ElementOf<number>     // number

  // Promise 解包
  type UnwrapPromise<T> = T extends Promise<infer R> ? R : T
  type E = UnwrapPromise<Promise<string>>  // string
  type F = UnwrapPromise<number>           // number
  ```

+ 分布式条件类型

  ```ts
  // 当 T 是联合类型时，条件类型会分配到每个成员
  type ToArray<T> = T extends any ? T[] : never

  type Result = ToArray<string | number>
  // 等价于：string[] | number[]（而不是 (string | number)[]）

  // 如果要禁止分布式，用元组包裹
  type ToArrayNonDist<T> = [T] extends [any] ? T[] : never
  type Result2 = ToArrayNonDist<string | number>
  // (string | number)[]
  ```

+ infer 关键字

  ```ts
  // 提取函数返回值类型
  type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never
  type G = ReturnOf<() => string>  // string

  // 提取函数第一个参数类型
  type FirstParam<T> = T extends (arg: infer P, ...rest: any[]) => any ? P : never
  type H = FirstParam<(name: string, age: number) => void>  // string

  // 提取构造函数参数类型
  type ConstructorParams<T> = T extends new (...args: infer P) => any ? P : never
  type I = ConstructorParams<typeof Date>  // [value?: string | number | Date]
  ```

## 映射类型

+ 基于已有类型创建新类型

  ```ts
  // 基础映射
  type Readonly2<T> = {
    readonly [K in keyof T]: T[K]
  }

  type Optional<T> = {
    [K in keyof T]?: T[K]
  }

  interface User {
    name: string
    age: number
  }

  type ReadonlyUser = Readonly2<User>
  // { readonly name: string; readonly age: number }

  type OptionalUser = Optional<User>
  // { name?: string; age?: number }
  ```

+ 键重映射（as 子句，TS 4.1+）

  ```ts
  // 给所有属性加前缀
  type AddPrefix<T, P extends string> = {
    [K in keyof T as `${P}${Capitalize<K & string>}`]: T[K]
  }

  type Prefixed = AddPrefix<{ name: string; age: number }, "get">
  // { getName: string; getAge: number }

  // 过滤掉某些属性
  type RemoveMethods<T> = {
    [K in keyof T as T[K] extends Function ? never : K]: T[K]
  }

  type DataOnly = RemoveMethods<{ name: string; greet(): void; age: number }>
  // { name: string; age: number }（greet 被过滤掉）
  ```

## 模板字面量类型（TS 4.1+）

+ 像模板字符串一样操作类型

  ```ts
  type EventName = `on${string}`
  const e1: EventName = "onClick"   // ✅
  // const e2: EventName = "click" // ❌

  type Method = "GET" | "POST" | "PUT" | "DELETE"
  type Endpoint = "/users" | "/posts" | "/comments"
  type Route = `${Method} ${Endpoint}`
  // "GET /users" | "GET /posts" | "GET /comments" | "POST /users" | ...

  // 内置字符串操作类型
  type A = Uppercase<"hello">        // "HELLO"
  type B = Lowercase<"HELLO">        // "hello"
  type C = Capitalize<"hello">       // "Hello"
  type D = Uncapitalize<"Hello">     // "hello"

  // 实际应用：生成事件处理函数名
  type Events = "click" | "focus" | "blur"
  type EventHandlers = {
    [K in Events as `on${Capitalize<K>}`]: (event: Event) => void
  }
  // { onClick: ..., onFocus: ..., onBlur: ... }
  ```

## 函数类型

+ 函数类型声明

  ```ts
  // 函数类型表达式
  type Add = (a: number, b: number) => number

  const add: Add = (a, b) => a + b

  // 调用签名
  interface SearchFunc {
    (source: string, subString: string): boolean
  }

  const search: SearchFunc = (source, sub) => source.includes(sub)
  ```

+ 函数重载

  ```ts
  // 重载签名（多个声明）
  function createElement(tag: "div"): HTMLDivElement
  function createElement(tag: "span"): HTMLSpanElement
  function createElement(tag: "input"): HTMLInputElement
  // 实现签名（一个实现）
  function createElement(tag: string): HTMLElement {
    return document.createElement(tag)
  }

  const div = createElement("div")    // HTMLDivElement
  const span = createElement("span")  // HTMLSpanElement
  // const el = createElement("p")    // ❌ 不在重载列表中
  ```

+ 回调函数类型

  ```ts
  // 回调参数类型可以"少写"（协变）
  type Callback = (user: { name: string; age: number; email: string }) => void

  // ✅ 回调可以只用部分参数（少的没问题）
  const cb1: Callback = (user) => console.log(user.name)

  // this 参数类型
  interface Button {
    onClick(this: Button): void
  }

  const btn: Button = {
    onClick() {
      console.log(this)  // this 类型为 Button
    }
  }
  ```

## 枚举

+ 枚举用于定义一组命名常量。

  ```ts
  // 数字枚举（默认从 0 开始）
  enum Direction {
    Up,     // 0
    Down,   // 1
    Left,   // 2
    Right,  // 3
  }

  let dir: Direction = Direction.Up;
  console.log(dir); // 0

  // 字符串枚举（推荐，更明确）
  enum Status {
    Active = "ACTIVE",
    Inactive = "INACTIVE",
    Pending = "PENDING"
  }

  // const 枚举（编译时被完全内联，不生成运行时代码）
  const enum Color {
    Red = "RED",
    Green = "GREEN",
    Blue = "BLUE"
  }
  const c = Color.Red  // 编译后直接变成 "RED"
  ```

+ 枚举 vs 联合字面量

  ```ts
  // 现代 TypeScript 更推荐用联合字面量替代枚举
  type Direction2 = "up" | "down" | "left" | "right"
  // 更轻量，不需要运行时代码，且支持字符串匹配

  // 枚举的优势：有运行时对象可以遍历
  for (const dir of Object.values(Direction)) {
    console.log(dir)  // 0, 1, 2, 3
  }
  ```

## 命名空间

+ 命名空间用于组织代码，避免命名冲突。

  ```ts
  namespace Geometry {
    export interface Point {
      x: number;
      y: number;
    }
  }

  let point: Geometry.Point = { x: 10, y: 20 };
  ```

+ 注意：命名空间是 TypeScript 早期的模块方案，现代项目推荐使用 ES Modules（`import/export`），命名空间主要用于声明文件（`.d.ts`）中为全局库添加类型

## 装饰器

+ 装饰器用于修改类的行为，可以在类定义时添加装饰器。需要开启 `tsconfig.json` 中的 `experimentalDecorators`。

  ```ts
  function sealed(constructor: Function) {
    Object.seal(constructor);
    Object.seal(constructor.prototype);
  }

  @sealed
  class Greeter {
    greeting: string;
    constructor(message: string) {
      this.greeting = message;
    }
    greet() {
      return "Hello, " + this.greeting;
    }
  }
  ```

+ 常用装饰器类型

  ```ts
  // 类装饰器
  function logClass(target: Function) {
    console.log(`Class ${target.name} created`)
  }

  // 方法装饰器
  function logMethod(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value
    descriptor.value = function (...args: any[]) {
      console.log(`Calling ${propertyKey} with`, args)
      return original.apply(this, args)
    }
  }

  // 属性装饰器
  function required(target: any, propertyKey: string) {
    // 标记属性为必填
  }

  @logClass
  class UserService {
    @required
    name!: string

    @logMethod
    getUser(id: number) {
      return { id, name: this.name }
    }
  }
  ```

## const 断言与 satisfies

### as const

+ 将值变为最窄的类型（只读字面量类型）

  ```ts
  // 没有 as const
  const arr = [1, 2, 3]          // number[]
  const obj = { name: "Tom" }    // { name: string }

  // 使用 as const
  const arr2 = [1, 2, 3] as const          // readonly [1, 2, 3]
  const obj2 = { name: "Tom" } as const    // { readonly name: "Tom" }

  // 常用于定义常量配置
  const ROLES = ["admin", "user", "guest"] as const
  type Role = typeof ROLES[number]  // "admin" | "user" | "guest"

  // 模拟枚举
  const STATUS = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    PENDING: "pending"
  } as const
  type Status = typeof STATUS[keyof typeof STATUS]
  // "active" | "inactive" | "pending"
  ```

### satisfies（TS 4.9+）

+ 既检查类型是否符合约束，又保留推断出的窄类型

  ```ts
  // 只有类型注解：丢失了窄类型
  const config: Record<string, string | number> = {
    host: "localhost",
    port: 3000
  }
  // config.host  // string | number（不精确）

  // 使用 satisfies：检查约束 + 保留窄类型
  const config2 = {
    host: "localhost",
    port: 3000
  } satisfies Record<string, string | number>

  config2.host  // string ✅ 保留了精确类型
  config2.port  // number ✅ 保留了精确类型

  // 另一个常见场景
  const palette = {
    red: [255, 0, 0],
    green: "#00ff00"
  } satisfies Record<string, string | number[]>

  palette.green.toUpperCase()  // ✅ 知道是 string
  palette.red[0]               // ✅ 知道是 number[]
  ```

## 标准库常用泛型

  ```ts
  // Partial<T>：所有属性变为可选
  type PartialUser = Partial<User>
  // { name?: string; age?: number; email?: string }

  function updateUser(user: User, updates: Partial<User>): User {
    return { ...user, ...updates }
  }

  // Required<T>：所有属性变为必选（Partial 的反操作）
  type FullUser = Required<PartialUser>
  // { name: string; age: number; email: string }

  // Readonly<T>：所有属性变为只读
  type ReadonlyUser = Readonly<User>
  // { readonly name: string; readonly age: number; ... }

  // Pick<T, K>：从 T 中选取部分属性
  type UserBasic = Pick<User, "name" | "age">
  // { name: string; age: number }

  // Omit<T, K>：从 T 中排除部分属性（Pick 的反操作）
  type UserWithoutEmail = Omit<User, "email">
  // { name: string; age: number }

  // Record<K, V>：构造键为 K、值为 V 的对象类型
  type UserMap = Record<string, User>
  // { [key: string]: User }

  type Roles = Record<"admin" | "user" | "guest", string[]>
  // { admin: string[]; user: string[]; guest: string[] }

  // Exclude<T, U>：从 T 中剔除可以赋值给 U 的类型
  type T1 = Exclude<"a" | "b" | "c", "a" | "b">  // "c"

  // Extract<T, U>：从 T 中提取可以赋值给 U 的类型
  type T2 = Extract<"a" | "b" | "c", "a" | "d">  // "a"

  // NonNullable<T>：剔除 null 和 undefined
  type T3 = NonNullable<string | null | undefined>  // string

  // ReturnType<T>：获取函数返回值类型
  function getUser() { return { name: "Tom", age: 18 } }
  type UserReturn = ReturnType<typeof getUser>
  // { name: string; age: number }

  // Parameters<T>：获取函数参数类型（元组）
  function search(query: string, page: number) { /* ... */ }
  type SearchParams = Parameters<typeof search>
  // [query: string, page: number]

  // InstanceType<T>：获取构造函数的实例类型
  class MyClass { name = "test" }
  type MyInstance = InstanceType<typeof MyClass>  // MyClass

  // Awaited<T>：解包 Promise 类型（TS 4.5+）
  type T4 = Awaited<Promise<string>>  // string
  type T5 = Awaited<Promise<Promise<number>>>  // number（递归解包）
  ```

## 模块与声明

### .d.ts 声明文件

+ 为没有类型定义的 JavaScript 库提供类型

  ```ts
  // 声明全局变量
  declare const __DEV__: boolean
  declare const __VERSION__: string

  // 声明模块
  declare module "my-lib" {
    export function init(config: { debug: boolean }): void
    export function destroy(): void
    export const version: string
  }

  // 声明带通配符的模块（如 CSS modules）
  declare module "*.css" {
    const classes: Record<string, string>
    export default classes
  }

  declare module "*.svg" {
    const url: string
    export default url
  }
  ```

+ 全局类型扩展

  ```ts
  // 扩展 Express 的 Request 对象
  declare global {
    namespace Express {
      interface Request {
        user?: {
          id: number
          role: string
        }
      }
    }
  }

  // 扩展 Window
  declare global {
    interface Window {
      myApp: {
        version: string
        config: Record<string, unknown>
      }
    }
  }
  ```

### tsconfig.json 常用配置

```json
{
  "compilerOptions": {
    // 类型检查
    "strict": true,                  // 开启所有严格检查
    "noImplicitAny": true,           // 禁止隐式 any
    "strictNullChecks": true,        // 严格的 null 检查
    "noUnusedLocals": true,          // 禁止未使用的局部变量
    "noUnusedParameters": true,      // 禁止未使用的函数参数

    // 模块
    "module": "ESNext",
    "moduleResolution": "bundler",   // Vite/Webpack 项目推荐
    "resolveJsonModule": true,       // 允许导入 JSON
    "paths": {
      "@/*": ["./src/*"]             // 路径别名
    },

    // 输出
    "target": "ES2020",
    "outDir": "./dist",
    "declaration": true,             // 生成 .d.ts 文件
    "sourceMap": true,

    // 实验性
    "experimentalDecorators": true,  // 装饰器支持
    "emitDecoratorMetadata": true,

    // 其他
    "esModuleInterop": true,         // 允许 default import CommonJS 模块
    "skipLibCheck": true,            // 跳过 .d.ts 类型检查（加速编译）
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 实用类型体操

+ 开发中常用的高级类型技巧

  ```ts
  // 深层 Partial（递归可选）
  type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
  }

  interface Config {
    server: { host: string; port: number }
    db: { url: string; pool: { min: number; max: number } }
  }
  type PartialConfig = DeepPartial<Config>
  // server 和 db 内部的属性也都变成可选

  // 深层 Readonly
  type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
  }

  // 获取函数第一个参数类型
  type FirstArgument<T> = T extends (arg: infer A, ...rest: any[]) => any ? A : never

  function handleSubmit(data: { name: string; email: string }) { /* ... */ }
  type SubmitData = FirstArgument<typeof handleSubmit>
  // { name: string; email: string }

  // 联合类型转交叉类型
  type UnionToIntersection<U> =
    (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

  type Result = UnionToIntersection<{ a: 1 } | { b: 2 }>
  // { a: 1 } & { b: 2 }  即 { a: 1; b: 2 }

  // 元组转联合类型
  type TupleToUnion<T extends readonly any[]> = T[number]
  type Colors = TupleToUnion<readonly ["red", "green", "blue"]>
  // "red" | "green" | "blue"

  // 判断类型是否相等（测试用）
  type Equal<A, B> =
    (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
      ? true : false

  type Test1 = Equal<string, string>       // true
  type Test2 = Equal<string, number>       // false
  type Test3 = Equal<{ a: 1 }, { a: 1 }>  // true
  ```
