# JVM 基础

> 本文基于 JDK 21/25（2026-09 时点）。JVM 篇对标 Node 笔记里事件循环/V8 那章的深度：讲清运行时结构，不深入 JIT 编译器细节。

> 语言与并发见 [Java 基础](/notes/backend/java-basics)、[Java 并发](/notes/backend/java-concurrency)；工具链见 [Java 生态与工具链](/notes/backend/java-ecosystem)。

## 运行时数据区

JVM 规范定义的内存布局（对照 V8：JS 堆 ≈ Java 堆，调用栈 ≈ 虚拟机栈）：

```
线程共享：
┌─────────────────────────────────────────────┐
│ 堆（Heap）                                    │
│   对象实例 + 数组，GC 的主战场                  │
│   ├─ 新生代（Eden + 两个 Survivor）             │
│   └─ 老年代（Old / Tenured）                   │
├─────────────────────────────────────────────┤
│ 方法区 / 元空间（Metaspace，JDK 8+）           │
│   类元信息、运行时常量池（在本地内存，不在堆）     │
└─────────────────────────────────────────────┘

线程私有（每线程一份）：
┌──────────────────┬──────────────────┬───────────────┐
│ 虚拟机栈           │ 本地方法栈         │ 程序计数器      │
│ Java 方法调用栈，   │ native 方法用      │ 当前执行的字节码 │
│ 栈帧=方法+局部变量  │                   │ 行号           │
└──────────────────┴──────────────────┴───────────────┘
```

+ **堆**：`new` 出来的都在这。OOM 报错 `-Xmx` 相关的就是它
+ **虚拟机栈**：方法调用层级太深抛 `StackOverflowError`（无限递归；≈ JS 的 "Maximum call stack size exceeded"，但 Java 默认栈约 512KB~1MB，比 V8 更容易爆）
+ **元空间**（JDK 8 起取代永久代）：类信息放**本地内存**——这也是"动态生成大量类"（如 CGLib 代理）会耗尽元空间的原因
+ 字符串常量池：JDK 7 起移入堆中

## 对象在堆里的旅程

```
new 对象
  → Eden 分配（TLAB 线程私有分配缓冲，分配极快）
  → 经历一次 Minor GC 存活 → Survivor 区（来回复制）
  → 年龄达标（默认 15 次）→ 晋升老年代
  → 大对象直接进老年代（避免 Survivor 来回拷贝）
  → 老年代满了 → Major/Full GC
```

**分代假说**：绝大多数对象朝生夕死（方法局部变量、临时 DTO）。所以新对象集中放新生代，GC 集中扫这一小块——和 V8 的新生代/老生代分代思路完全一致（V8 也是从这份 JVM 文献里抄的作业）。

## GC：怎么判断垃圾、谁来回收

### 判断对象是否可回收

+ **可达性分析**（JVM 实际采用）：从 GC Roots（局部变量、静态字段、活跃线程等）出发，不可达即垃圾——和标记清除一样，但 JVM 不用引用计数（循环引用无法回收的坑，JS 同样不用引用计数处理主堆）
+ 分代回收时**跨代引用**用卡表（card table）解决，不需要整堆扫描

### 收集器现状（JDK 21/25）

| 收集器 | 特点 | 适用 |
|---|---|---|
| **G1**（JDK 9+ 默认） | 分 Region 管理，可预测停顿目标（`-XX:MaxGCPauseMillis`） | 大堆通用首选 |
| **ZGC** | 亚毫秒级停顿（<1ms），JDK 21 起分代（JEP 439），JDK 24 移除非分代模式 | 超大堆、低延迟敏感 |
| **Shenandoah** | 与 ZGC 同级的低停顿（RedHat 出品） | 同上 |
| Parallel GC | 吞吐量优先，停顿长 | 离线批处理 |

前端视角的类比：G1/ZGC 之于 Serial/Parallel，≈ V8 的增量/并发标记之于全停顿标记——都是"把停顿时间摊薄"的同一类工程思路。

日常开发视角：**JDK 8 默认 Parallel，11/17/21 默认 G1**。绝大多数应用默认 G1 不用动；只有延迟极度敏感才上 ZGC（`-XX:+UseZGC`）。

### 常见 GC 参数

```bash
-Xms4g -Xmx4g            # 初始/最大堆（生产建议设成一样，避免动态扩缩抖动）
-Xmn / -XX:NewRatio      # 新生代大小 / 老新比例
-XX:+UseG1GC             # 选 G1
-XX:MaxGCPauseMillis=200 # G1 停顿目标
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp  # OOM 时自动 dump
```

## 类加载

```
.java --javac--> .class --类加载器--> JVM 内存（方法区）
                                ↑ 校验 → 准备 → 解析 → 初始化
```

### 双亲委派

```
Bootstrap（JDK 核心类库）
  ↑ 委派
ExtClassLoader/Platform（JDK 扩展）
  ↑ 委派
Application（classpath，你写的类）
```

收到加载请求先**层层上交**给父加载器，父加载不了才自己加载。目的：**防止核心类被篡改**（你写个 `java.lang.String` 永远轮不到加载）+ 避免重复加载。

### 一个类的初始化时机（了解）

+ `new` / 访问静态字段（非 final 常量）/ 调静态方法
+ 反射调用（`Class.forName`）——**Spring 扫描组件就靠这条**
+ 初始化一个类时其父类先初始化

## JIT：为什么 Java "编译型"却也有运行时优化

`.class` 是字节码不是机器码，JVM 执行时：

```
解释执行（启动快）
  ↓ 热点代码被探测到（方法调用计数器/回边计数器）
编译为机器码缓存（C1 快速编译 → C2 深度优化）
  ↓ 之后直接跑机器码
```

+ **分层编译**让 Java 既有解释型语言的启动速度又有编译型的峰值性能
+ 这就是"Java 需要预热"的由来：服务刚启动时跑的是解释/低优化代码，压测要在预热后做
+ 对照 V8：Ignition（解释器）+ TurboFan（优化编译器）+ 去优化机制——**同一套思路**，V8 的 Sparkplug ≈ C1，TurboFan ≈ C2

## 常见 OOM 与排查

| 报错 | 原因 | 排查 |
|---|---|---|
| `Java heap space` | 堆满：内存泄漏或堆太小 | dump 分析（MAT/VisualVM）找支配树 |
| `GC overhead limit exceeded` | GC 占 98% 时间却回收 <2% 空间 | 同上，通常临近堆 OOM |
| `Metaspace` | 动态类太多（反射/CGLib 代理泛滥） | `-XX:MaxMetaspaceSize` + 查代理生成 |
| `StackOverflowError` | 递归太深 | 看栈顶循环调用的方法名 |
| `unable to create new native thread` | 平台线程超 OS 限 | 减线程数 / 上虚拟线程 |

```bash
# 线上排查三件套
jps -l                  # 找到 Java 进程
jmap -dump:live,format=b,file=heap.hprof <pid>   # 导堆 dump
jstack <pid>            # 导线程栈（死锁/CPU 飙高看这里）
```

内存泄漏的 Java 典型形态：**静态集合只进不出**（全局 Map 当缓存不清理）、监听器/回调未注销——和 JS 里"遗忘的定时器/闭包引用"一模一样的病根，只是 Java 里它表现为堆缓慢增长最终 OOM。

## 参考

+ [The Java® Virtual Machine Specification](https://docs.oracle.com/javase/specs/jvms/se21/html/)
+ [HotSpot GC Tuning Guide（Oracle 官方）](https://docs.oracle.com/en/java/javase/21/gctuning/)
+ [JEP 439: Generational ZGC](https://openjdk.org/jeps/439)
+ [深入理解 Java 虚拟机（周志明）](https://book.douban.com/subject/34907497/) —— 中文首选书
