# Java 基础

Java 是一门**静态类型、编译型（编译到 JVM 字节码）、面向对象**的语言。本篇面向有 JS/TS 背景的开发者，用对照的方式建立 Java 的核心心智模型。

> 工具链与版本、Maven、生态地图见 [Java 生态与工具链](/notes/backend/java-ecosystem)；Web 框架见 [Spring Boot](/notes/backend/spring-boot)。

## 与 JS/TS 的根本差异

| 维度 | JavaScript | TypeScript | Java |
|---|---|---|---|
| 类型检查 | 无（动态） | 编译期（结构化类型） | 编译期（名义类型，更严格） |
| 编译产物 | 源码直接执行 | 擦除类型 → JS | `.class` 字节码，运行在 JVM |
| 运行时 | V8 / SpiderMonkey | 同 JS | JVM（HotSpot） |
| 并发模型 | 单线程事件循环 | 同 JS | 多线程（见下篇） |
| 面向对象 | 原型链（class 是语法糖） | 同 JS | 真正的类（class 文件、方法表） |

两个最容易踩的思维差异：

+ **名义类型（nominal typing）**：TS 是结构类型——形状一样就能赋值；Java 看名字——`class A {}` 和 `class B {}` 即使字段完全相同也互不兼容。TS 的 `interface A extends B` 是"形状约束"，Java 的 `implements` 是"显式声明契约"。
+ **类型信息在运行时存在**：Java 的类、字段、方法在运行时可通过**反射**读取（Spring 大量依赖这一点），TS 类型编译后彻底消失。这是 Java 注解能"驱动框架行为"的根基。

## 类型系统

### 原始类型（8 种）

JS 只有 `number`（双精度浮点），Java 按用途和位数细分：

| 类型 | 位数 | 对应 JS | 示例 |
|---|---|---|---|
| `byte` / `short` / `int` / `long` | 8/16/32/64 | `number`（整数部分） | `int age = 18;` `long id = 10_000_000_000L;` |
| `float` / `double` | 32/64 | `number` | `double price = 9.99;` |
| `boolean` | — | `boolean` | `boolean ok = true;` |
| `char` | 16（UTF-16 单元） | 无（用 `string[0]`） | `char c = 'A';`（单引号！） |

注意：

+ 整数除法：`7 / 2` 是 `3`（不是 3.5），要 `7 / 2.0` 或 `7.0 / 2`
+ `long` 字面量要加 `L` 后缀；数字下划线 `1_000_000` 与 JS 一致
+ **没有隐式数字转换陷阱**：`int` 与 `double` 混算会自动提升，但 `String + int` 是拼接（和 JS 一样 `"a" + 1 === "a1"`）

### 包装类与自动装箱

每个原始类型有对应引用类型的**包装类**：`Integer`、`Long`、`Double`、`Boolean`…（类似 TS 里 `number` 与 `Number` 的关系，但 Java 中这个区分是强制且常用的）。

```java
int a = 1;
Integer b = a;        // 自动装箱（autoboxing）
int c = b;            // 自动拆箱（unboxing）

// 泛型只能用包装类
List<Integer> list = new ArrayList<>();  // ✅
// List<int> list2 = ...;                // ❌ 编译错误
```

经典陷阱——`Integer` 缓存：

```java
Integer x = 127, y = 127;
x == y          // true（-128~127 有缓存，同一对象）

Integer m = 128, n = 128;
m == n          // false（不同对象，== 比较引用）
m.equals(n)     // true（比较值）
```

**规则：引用类型一律用 `equals()` 比较，`==` 只用于原始类型。**

### String

+ **不可变**（immutable），与 JS 一致；`+` 拼接会被编译器优化为 `StringBuilder`
+ 双引号，单引号是 `char`
+ 常用 API 对照：

```java
String s = "Hello, Java";
s.length()              // 11（方法调用，不是属性）
s.charAt(0)             // 'H'
s.substring(7)          // "Java"（无第二参即到结尾）
s.toUpperCase()         // "HELLO, JAVA"
s.split(",")            // ["Hello", " Java"]
s.contains("Java")      // true
s.equals("hello, java") // false
s.equalsIgnoreCase("hello, java") // true
"  hi  ".strip()        // "hi"（Java 11+，≈ trim）
String.join(",", "a", "b")       // "a,b"
String.repeat(3)        // "aaa"（Java 11+）
```

+ **文本块**（Java 15+）用 `"""`，≈ TS 模板字符串的换行能力，**但没有插值**：

```java
String json = """
    {
      "name": "tom"
    }
    """;
```

+ 字符串插值：JS 的 `` `hi ${name}` `` 在 Java 中**目前没有直接等价物**（String Templates 提案在 JDK 21 预览后被官方撤回重新设计）。用格式化：

```java
String.format("hi %s, age %d", name, age)   // "hi tom, age 18"
"hi %s".formatted(name)                     // Java 15+ 实例方法
```

### var（Java 10+）

局部变量类型推断，**只能用于局部变量**（不能用于字段、方法参数、返回值）：

```java
var list = new ArrayList<String>();  // 编译器推断，仍是静态类型
// var x;                            // ❌ 必须初始化
```

比 TS 的推断保守：一旦推断完成类型就锁死，没有 TS 的" widening"概念。

### record（Java 16+）—— 不可变数据载体

对应 TS 中"只读的 interface + 工厂"，是最接近前端直觉的特性：

```java
// 一行定义：构造器 + 访问器 + equals + hashCode + toString 全自动生成
public record Point(int x, int y) {}

Point p = new Point(1, 2);
p.x()          // 1 —— 访问器是 x() 不是 getX()
p.equals(new Point(1, 2))  // true（值语义，自动生成）
```

```ts
// TS 近似
interface Point { readonly x: number; readonly y: number }
```

record 是 `final` 的（不能继承）、字段不可变——写 DTO、值对象的首选。

### null 安全：Optional（Java 8+）

JS/TS 用 `?.`、`??`、可选链，Java 用 `Optional<T>` 包装"可能没有"：

```java
Optional<String> name = findUser(id);

name.map(String::toUpperCase)     // ≈ ?.toUpperCase()
    .orElse("anonymous");         // ≈ ?? "anonymous"

name.ifPresent(n -> send(n));     // 有值才执行
name.orElseGet(() -> loadDefault()); // 惰性默认值
```

**不要** `optional.get()`（不检查直接取，空则抛异常）或 `optional == null`（Optional 本身不该为 null）。

## 集合框架

JS 的 `Array` / `Map` / `Set` 在 Java 里是一个完整的接口体系：

| Java 接口 | 常用实现 | 对应 JS | 特点 |
|---|---|---|---|
| `List<E>` | `ArrayList` | `Array` | 有序可重复，按下标 |
| `Set<E>` | `HashSet` / `TreeSet` / `LinkedHashSet` | `Set` | 去重；TreeSet 按排序，LinkedHashSet 保插入序 |
| `Map<K,V>` | `HashMap` / `TreeMap` / `LinkedHashMap` | `Map` | 键值对；HashMap 无序 |
| `Queue<E>` / `Deque<E>` | `ArrayDeque` / `LinkedList` | 无内置 | 队列/双端队列 |

使用姿势：

```java
// 声明用接口类型（≈ 面向接口编程的习惯）
List<String> list = new ArrayList<>();
list.add("a");
list.get(0);
list.size()                 // 方法，不是 .length 属性

Map<String, Integer> map = new HashMap<>();
map.put("age", 18);
map.get("age");             // 18
map.getOrDefault("vip", 0)  // ≈ map.get('vip') ?? 0
map.get("nope")             // null（不是 undefined！）

// 不可变集合（Java 9+）≈ Object.freeze
List<String> frozen = List.of("a", "b", "c");
// frozen.add("d");  // ❌ 运行时抛 UnsupportedOperationException

// 遍历
for (String s : list) { }                    // ≈ for...of
list.forEach(s -> System.out.println(s));    // ≈ forEach
map.forEach((k, v) -> System.out.println(k + "=" + v));
```

### 泛型：与 TS 的关键区别

两者都是**编译期检查、之后擦除**（Java 泛型信息运行时不存在，`new ArrayList<String>()` 运行时就是 `ArrayList`）。但：

+ Java 检查更严：`List<String>` 传给 `List<Object>` 参数会直接编译错误（TS 结构类型下通常允许）
+ 通配符 `? extends T`（只读，生产者）/ `? super T`（只写，消费者），TS 没有型变的显式语法（`in/out` 位置自动推断）

日常开发记住一条：**集合读用 `extends`、写用 `super`，拿不准就别用通配符**。

## 面向对象

### 类的语法对照

```java
public class User {
    // 字段（默认 private 是惯例）
    private final String name;
    private int age;

    // 构造器（没有 TS 的 constructor(private name) 简写）
    public User(String name, int age) {
        this.name = name;
        this.age = age;
    }

    // getter/setter 惯例（Lombok 可自动生成，见生态篇）
    public String getName() { return name; }
    public void setAge(int age) { this.age = age; }

    // 静态方法
    public static User of(String name) {
        return new User(name, 0);
    }
}
```

```ts
// TS 等价
class User {
  constructor(public readonly name: string, public age: number) {}
  static of(name: string) { return new User(name, 0) }
}
```

### 访问修饰符

Java 的 `private` 是 **JVM 层面强制**的；TS 的 `private` 只是编译期检查，`#field` 才是真私有：

| Java | 含义 |
|---|---|
| `public` | 全部可见 |
| `protected` | 同包 + 子类 |
| （不写） | 包私有（package-private），同包可见——TS 无对应 |
| `private` | 仅本类 |

### 接口与继承

```java
// 接口：能力契约，一个类可实现多个接口（弥补单继承）
public interface Comparable<T> {
    int compareTo(T other);
}

public class User implements Comparable<User> {
    public int compareTo(User other) { return this.age - other.age; }
}

// 继承：单继承，extends + super
public class Admin extends User {
    public Admin(String name) {
        super(name, 0);              // 必须先调父类构造器
    }
}
```

TS 里 interface 是"描述形状"，可被对象字面量直接满足；Java 里接口是**必须显式 implements 的契约**，这是名义类型系统的直接体现。

### sealed 类型（Java 17+）≈ TS 判别联合

这是 Java 版的"可辨识联合 + 穷尽 switch"，写起来甚至更严：

```java
// 密封接口：限定实现者，外部不得再扩展
public sealed interface Shape permits Circle, Square {}
public record Circle(double radius) implements Shape {}
public record Square(double side) implements Shape {}

// switch 模式匹配（Java 21 正式）：编译器保证穷尽
static double area(Shape s) {
    return switch (s) {
        case Circle c -> Math.PI * c.radius() * c.radius();
        case Square q -> q.side() * q.side();
        // 不需要 default：sealed 保证只有这两种，漏写直接编译错误
    };
}
```

```ts
// TS 判别联合
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
```

### 枚举

```java
public enum Status {
    ACTIVE,      // 本质是单例实例，可带字段和方法
    INACTIVE;

    private final boolean usable = this == ACTIVE;  // 示意
}
Status s = Status.valueOf("ACTIVE");
Status[] all = Status.values();
```

比 TS 的 `enum`（或常量联合）重得多：Java 枚举是真正的类，每个值是一个单例对象。

## 函数式与 Stream API

### Lambda ≈ 箭头函数

```java
Runnable r = () -> System.out.println("hi");           // 无参
Comparator<String> byLen = (a, b) -> a.length() - b.length();
list.forEach(s -> System.out.println(s));
list.sort((a, b) -> a.compareTo(b));

// 方法引用（method reference）：已存在的方法的简写
list.forEach(System.out::println);        // ≈ x => console.log(x)
list.sort(String::compareTo);             // ≈ (a, b) => a.localeCompare(b)
list.stream().map(String::toUpperCase);   // ≈ x => x.toUpperCase()
```

Lambda 只能赋给**函数式接口**（有且仅有一个抽象方法的接口），不像 JS 函数是一等公民可随便传。JDK 内置了常用的：

| 接口 | 签名 | 对应 TS |
|---|---|---|
| `Function<T,R>` | `T → R` | `(x: T) => R` |
| `Predicate<T>` | `T → boolean` | `(x: T) => boolean` |
| `Consumer<T>` | `T → void` | `(x: T) => void` |
| `Supplier<T>` | `() → T` | `() => T` |
| `BiFunction<T,U,R>` | `(T,U) → R` | `(a: T, b: U) => R` |

### Stream API ≈ 数组方法链

```java
List<String> names = List.of("Alice", "Bob", "Anna", "Charlie");

List<String> result = names.stream()
    .filter(n -> n.startsWith("A"))
    .map(String::toUpperCase)
    .sorted()
    .toList();                        // Java 16+，≈ .map().filter() 链

// 对应 JS
// names.filter(n => n.startsWith('A')).map(n => n.toUpperCase()).sort()

// 归约
int total = nums.stream().mapToInt(Integer::intValue).sum();   // ≈ reduce
boolean anyBob = names.stream().anyMatch(n -> n.equals("Bob")); // ≈ some
Optional<String> first = names.stream().findFirst();            // ≈ find + 判空

// 分组 ≈ 手写 reduce 累积 Map
Map<Integer, List<String>> byLen = names.stream()
    .collect(Collectors.groupingBy(String::length));

// 拼接
String joined = names.stream().collect(Collectors.joining(", ")); // ≈ join(", ")
```

关键差异：

+ Stream 是**惰性**的，没有终止操作（`toList`/`forEach`/`count`…）中间操作不执行——和数组方法"每步立即执行"不同，更像 RxJS 的 observable 链
+ Stream **只能消费一次**，用过再 `forEach` 会抛 `IllegalStateException`
+ 修改原集合要用 `list.removeIf(...)` 这类方法，不是 filter

## 异常

JS 的异常是运行时约定，Java 把异常分成两类并**由编译器强制**：

```
Throwable
├── Error                    // JVM 级错误（OutOfMemoryError），不用管
└── Exception
    ├── RuntimeException     // unchecked：NPE、越界、非法参数…编译器不强制处理
    │    └── NullPointerException / IndexOutOfBoundsException / IllegalArgumentException ...
    └── 其他（IOException、SQLException…）  // checked：编译器强制 try-catch 或 throws 声明
```

```java
// checked 异常：不处理直接编译不过
try {
    String content = Files.readString(Path.of("a.txt"));
} catch (IOException e) {
    e.getMessage();
    e.printStackTrace();
} finally {
    // 总会执行（≈ try/finally）
}

// try-with-resources（Java 7+）：自动关闭资源，≈ using（TS 5.2+ 显式资源管理）
try (var reader = Files.newBufferedReader(Path.of("a.txt"))) {
    reader.readLine();
}   // 自动 close，无需 finally

// 自定义异常
class BizException extends RuntimeException {   // 继承 RuntimeException = unchecked
    public BizException(String msg) { super(msg); }
}
```

前端视角的理解：**checked 异常 ≈ TS 强制你处理 `Promise` 的 rejection**——编译器逼你表态（处理或向上抛），这是 JS 完全没有的机制。业务代码自定义异常一般继承 `RuntimeException`（unchecked），避免层层 `throws` 污染签名。

## 包、导入与注解

### 包（package）≈ 模块

```java
package com.example.demo.user;        // 必须与目录结构一致！
import java.util.List;
import java.util.*;                   // 通配导入（只导入类，不导入子包）
import static java.lang.Math.max;     // 静态导入
```

与 JS 的区别：**包名强制对应目录路径**（`src/main/java/com/example/demo/user/`），文件名必须与 public 类名一致——`User.java` 里只能有 `public class User`。

### 注解（Annotation）≈ 装饰器，但机制不同

```java
@Override          // 标记重写，编译器校验
@Deprecated
@SuppressWarnings("unchecked")
```

关键区别：**Java 注解本身只是元数据，不改变行为**；是框架（如 Spring）在运行时用反射读取注解，再决定做什么（实例化、注入、开事务、映射路由）。TS 装饰器则是编译成函数调用直接包裹目标。所以 Java 里"加个 `@Service` 就能用"的魔法，背后是框架在扫描和增强，注解只是声明意图。

## 第一个程序怎么写

```java
// 传统写法（所有版本）
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java");
    }
}
```

```java
// JDK 25+ 紧凑源文件（JEP 512，2025 定稿）：为初学者和脚本场景简化
// 存为 Hello.java，直接 java Hello.java 运行
void main() {
    IO.println("Hello, Java");   // IO 在 java.lang，自动可用
}
```

`main` 的 `String[] args` ≈ Node 的 `process.argv.slice(2)`。

## 上手路径建议

1. 环境装好后先用 `jshell`（JDK 自带的 REPL，≈ Node 交互式终端）敲本篇的集合/Stream 例子
2. 重点吃透：`equals` vs `==`、泛型集合、Stream 链、异常体系——这四块占日常代码 80%
3. record + sealed + switch 模式匹配是"新 Java"（17/21+）最值得先学的语法，直接对标 TS 心智模型

## 参考

+ [The Java Tutorials（Oracle 官方）](https://docs.oracle.com/javase/tutorial/)
+ [Java 语言更新（JDK 25 官方文档）](https://docs.oracle.com/en/java/javase/25/language/)
+ [dev.java（Oracle 官方学习站）](https://dev.java/learn/)
