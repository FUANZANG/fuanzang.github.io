# TypeScript Note

[TypeScript 教程](https://wangdoc.com/typescript/)

## 类型断言

+ 类型断言有两种形式：尖括号语法和as语法

  ```ts
  // 尖括号语法
  let someValue: any = "this is a string";
  let strLength: number = (<string>someValue).length;

  // as语法
  let someValue: any = "this is a string";
  let strLength: number = (someValue as string).length;
  ```

## 类型守卫

+ 类型守卫是一种特殊的类型谓词，用于在运行时检查对象的类型，以确保对象具有特定的属性或方法。

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

## 类型推断

+ 类型推断是TypeScript自动推断变量的类型，无需显式声明。

  ```ts
  let num = 10; // TypeScript会自动推断num的类型为number
  let str = "hello"; // TypeScript会自动推断str的类型为string
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

  animal = dog; // 兼容
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

## 泛型

+ 泛型用于定义函数、接口或类，可以在运行时确定具体的类型。

  ```ts
  function identity<T>(arg: T): T {
    return arg;
  }

  let output = identity<string>("myString"); // output: string
  let output2 = identity(123); // output2: number
  ```

## 枚举

+ 枚举用于定义一组命名常量。

  ```ts
  enum Direction {
    Up,
    Down,
    Left,
    Right,
  }

  let dir: Direction = Direction.Up;
  console.log(dir); // 0
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

## 装饰器

+ 装饰器用于修改类的行为，可以在类定义时添加装饰器。

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

## 标准库常用泛型

  ```ts
  Partial // 转换为可选，非常常用
  Required // 转换为必选
  Readonly // 转换为只读
  Pick<P, K extends keyof P> // 筛选
  Record<K, string> // 映射，非常常用，一般等同于 AnyObject
  // Exclude是Diff类型的一种实现
  // 可以用 Pick<T, Exclude<keyof T, K>> 来定义 Omit<T,K>
  Exclude<T,U> // 从T中剔除可以复制给U的类型
  Extract<T,U> // 提取剔除的
  NonNullable // 剔除null undefined
  ReturnType // 获取函数返回值类型
  Parameters // 获取函数的入参，返回的是数组元组
  InstanceType // 获取构造函数类型的实例类型
  ```
