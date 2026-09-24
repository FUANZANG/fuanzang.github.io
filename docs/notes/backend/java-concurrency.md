# Java 并发

> 本文基于 JDK 21/25（2026-09 时点：虚拟线程 JEP 444 已在 21 定稿；`synchronized` 钉住问题 JEP 491 已在 24 解决；结构化并发仍为预览）。

并发是 Java 与 JS **心智模型差异最大**的一块：JS 是单线程 + 事件循环，Java 是多线程 + 共享内存。本篇按"从事件循环翻译到多线程"的视角展开。

> 语言基础见 [Java 基础](/notes/backend/java-basics)；运行时与 GC 见 [JVM 基础](/notes/backend/jvm-basics)。

## 心智模型：两种世界观

| 维度 | JS（事件循环） | Java（多线程） |
|---|---|---|
| 执行单元 | 任务（回调/Promise） | 线程 |
| 数量 | 1 个主线程 | 几十~几千个线程 |
| 状态共享 | 天然安全（单线程串行） | **核心难题**（需要同步机制） |
| 等待 I/O | 异步回调，不阻塞 | 线程阻塞等待（或虚拟线程解耦） |
| 竞态来源 | 只在 await 点之间交错 | 任意两行代码之间都可能交错 |

JS 开发者最需要扭转的认知：**事件循环里"同步代码块一定连续执行完"**；多线程里没有这个保证——两个线程的代码可以真正同时跑在不同 CPU 核上，一行代码执行到一半另一线程就可能读到中间状态。

## Thread 基础

```java
// 创建并启动（线程启动后与主线程并行执行）
Thread t = new Thread(() -> System.out.println("run in " + Thread.currentThread().getName()));
t.start();          // 注意是 start() 不是 run()！run() 只是普通方法调用
t.join();           // 等待结束，≈ 无（JS 没有线程 join 概念）

// JDK 21+ 更直观的工厂 API
Thread.ofPlatform().name("worker-1").start(task);   // 平台线程（1:1 映射 OS 线程）
Thread.ofVirtual().start(task);                     // 虚拟线程（见下文）
```

### 竞态条件：第一个坑

```java
private int count = 0;

// 100 个线程各执行 1000 次 count++
for (int i = 0; i < 100; i++) {
    new Thread(() -> { for (int j = 0; j < 1000; j++) count++; }).start();
}
// 期望 100000，实际大概率 < 100000
// count++ 不是原子操作：读→加→写三步，两个线程交错执行就丢更新
```

JS 里 `count++` 在同步代码里永远安全；Java 里只要跨线程，就必须考虑原子性。

### synchronized：互斥锁

```java
private int count = 0;

// 方式一：同步方法（锁 this）
public synchronized void increment() { count++; }

// 方式二：同步块（锁指定对象，粒度更细）
private final Object lock = new Object();
public void increment2() {
    synchronized (lock) { count++; }
}
```

同一时刻只有一个线程能进入同一把锁保护的代码——把"并发世界"降级回"事件循环式的串行"。代价：锁竞争激烈时线程排队等待（阻塞）。

### volatile：可见性

```java
private volatile boolean running = true;

// 线程 A 改 running = false 后，线程 B 能立刻看到
// 没有 volatile：B 可能永远读缓存里的旧值 true（CPU 缓存/JIT 优化导致）
```

+ `volatile` 保证**可见性**（写立即对其他线程可见）和**有序性**（禁止指令重排），**不保证原子性**——`volatile int count` 的 `count++` 依然丢更新
+ JS 没有对应概念（单线程天然可见）

### java.util.concurrent：日常首选

```java
// 原子类：无锁的原子操作
// CAS（Compare-And-Swap）：CPU 硬件级指令——"内存值还是我读到的旧值吗？是才写入新值，否则重试"
// 比加锁轻：不阻塞线程，失败就自旋重试。JS 无对应（单线程不需要）
private final AtomicInteger count = new AtomicInteger();
count.incrementAndGet();          // 原子的 ++（内部 CAS 循环）
private final LongAdder total = new LongAdder();   // 高并发计数更优（分段累加，读时合并）

// 并发容器：≈ JS 单线程下不需要，多线程必用
Map<String, Integer> map = new ConcurrentHashMap<>();   // 并发安全 HashMap
List<String> list = new CopyOnWriteArrayList<>();        // 读多写少场景
BlockingQueue<Task> queue = new LinkedBlockingQueue<>(); // 生产者-消费者队列

// 显式锁：需要 tryLock/超时/多条件时用，否则优先 synchronized
ReentrantLock lock = new ReentrantLock();
lock.lock();
try { /* 临界区 */ } finally { lock.unlock(); }   // unlock 必须放 finally
```

**选型顺序**：能无锁（原子类/并发容器）就不加锁；能 `synchronized` 就不 `ReentrantLock`（JDK 24 后 `synchronized` 对虚拟线程也不再钉住）。

## 线程池：ExecutorService

线程创建有成本，平台线程池复用线程（≈ Node 的 libuv 线程池，但那是引擎内部的你控制不了，Java 线程池是业务层的一等公民）：

```java
// 工厂方法（简单场景够用）
ExecutorService pool = Executors.newFixedThreadPool(10);   // 固定 10 线程

// 生产推荐：手动 new ThreadPoolExecutor，参数显式可控
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    4,                      // corePoolSize：常驻线程数
    8,                      // maximumPoolSize：峰值上限
    60, TimeUnit.SECONDS,   // 空闲线程回收时间
    new LinkedBlockingQueue<>(100),  // 任务队列
    new ThreadPoolExecutor.CallerRunsPolicy()  // 拒绝策略：队列满时谁提交谁执行
);

pool.submit(() -> doWork());       // 提交任务，≈ "丢进事件队列"
Future<String> f = pool.submit(() -> "result");
f.get();                            // 阻塞等结果，≈ await

pool.close();                       // JDK 19+，优雅关闭
```

**不要用** `Executors.newCachedThreadPool()`/`newFixedThreadPool()` 于生产（前者线程数无上限，后者队列无上限，都可能 OOM）——这是阿里 Java 规范的著名条款。

## CompletableFuture ≈ Promise

Java 8 引入，API 与 Promise 惊人地对应：

```java
CompletableFuture.supplyAsync(() -> fetchUser(id))     // ≈ new Promise(resolve => resolve(fetch()))
    .thenApply(u -> u.getName())                       // ≈ .then(u => u.name)
    .thenAccept(name -> log(name))                     // ≈ .then(name => log(name)) 消费值
    .exceptionally(e -> { log(e); return null; })      // ≈ .catch(e => log(e))

// thenCompose ≈ then 里返回 Promise 时的 flatMap 语义
CompletableFuture<Order> order = fetchUser(id)
    .thenCompose(u -> fetchOrder(u.getId()));          // ≈ .then(u => fetchOrder(u.id))

// 组合
CompletableFuture.allOf(f1, f2, f3).join();            // ≈ Promise.all
CompletableFuture.anyOf(f1, f2).join();                // ≈ Promise.race
```

关键差异：

+ **默认没有微任务调度**：`supplyAsync` 不指定线程池时跑在全局 `ForkJoinPool.commonPool()` 上。**ForkJoinPool** 是为 CPU 密集的"分治任务"设计的线程池（任务可拆分成子任务、工作线程互相偷任务，"work-stealing"）。它线程数 ≈ CPU 核数——所以 **CPU 密集任务才用它，I/O 任务要传自己的线程池**：`supplyAsync(supplier, ioPool)`，否则 I/O 阻塞占满核数，所有任务饿死
+ `join()` ≈ 同步等待的 `await`（Java 没有语言级协程，虚拟线程之前"等结果"要么阻塞线程要么回调）
+ 回调默认在**完成动作的线程**执行，想切线程用 `thenApplyAsync(fn, pool)`

## 虚拟线程（JDK 21 定稿）

Loom 项目的成果，Java 应对高并发 I/O 的答案。**对 JS 开发者这是最容易共鸣的概念**：

```
平台线程：1:1 映射 OS 线程，创建/切换贵，几千个就到头
虚拟线程：M:N 由 JVM 调度，挂在平台线程（carrier）上，
         阻塞时自动 unmount，载体线程去跑别的虚拟线程
         —— 本质是把"事件循环对 I/O 的处理方式"搬进了 JVM
```

```java
// 用法一：直接建（轻量到可以每请求一个）
Thread.startVirtualThread(() -> handleRequest());

// 用法二：每任务一个虚拟线程的 Executor（不要池化虚拟线程！）
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    IntStream.range(0, 100_000).forEach(i ->
        executor.submit(() -> {
            Thread.sleep(1000);      // 阻塞 1 秒——不占用 OS 线程
            return fetch(i);
        }));
}   // 10 万个"线程"毫无压力；平台线程早 OOM 了
```

核心价值：**写同步阻塞风格的代码，得到事件循环级别的吞吐**——不用把业务逻辑拆成回调链，代码可读性回归"从上往下读"。

使用守则：

+ **虚拟线程只适合 I/O 密集**（等网络/磁盘/锁）；CPU 密集任务它帮不了你（总核数就那么多）
+ **不要池化**：它便宜到用完即弃，池化反而限制并发
+ **避免 ThreadLocal 滥用**：**ThreadLocal** = 每个线程各存一份私有副本的变量（`ThreadLocal<User> current` 在 100 个线程里有 100 份值，互不可见）——典型用途是"当前登录用户"这类上下文传递。虚拟线程百万级时"每线程一份"就变成百万份对象，内存爆（替代方案 ScopedValue，不可变共享、JDK 25 定稿）
+ JDK 21 的坑：`synchronized` 块里阻塞会**钉住**（pin）载体线程；**JDK 24（JEP 491）已解决**，新项目无需再绕
+ Spring Boot 3.2+ 一个开关启用：`spring.threads.virtual.enabled=true`（Tomcat 每请求一个虚拟线程）

###（预览，截至 结构化并发 JDK 25 未定稿）

把"一组子任务"当做一个工作单元管理（一起成功或一起取消），与 `Promise.all` 的语义对齐但更强，**仍是预览 API**，了解即可：

```java
// 预览 API（JDK 25，JEP 505，需 --enable-preview）
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    var user  = scope.fork(() -> fetchUser(id));
    var order = scope.fork(() -> fetchOrder(id));
    scope.join().throwIfFailed();      // 任一失败则全部取消
    return new Result(user.get(), order.get());
}
```

## 并发三性速查

| 性质 | 含义 | 破坏者 | 守护者 |
|---|---|---|---|
| **原子性** | 操作不可分割 | `count++` | `synchronized` / 原子类 / `Lock` |
| **可见性** | 写对其他线程立即可见 | CPU 缓存 | `volatile` / `synchronized` |
| **有序性** | 执行顺序符合预期 | 指令重排 | `volatile` / `happens-before` 规则 |

两个词展开：

+ **指令重排**：CPU 和编译器为提速会调整指令顺序（只要单线程结果不变）。单线程无害，多线程下另一个线程可能看到"先写后读"被重排成"先读后写"的中间状态
+ **happens-before**：JMM（Java 内存模型）定义的偏序关系——"A 操作的结果对 B 可见，则 A happens-before B"（如解锁 happens-before 后续加锁、`volatile` 写 happens-before 后续读）。它是判断并发代码正确性的**理论依据**，日常记住"锁和 volatile 能建立可见性保证"即可

JS 开发者的翻译：**这三性在事件循环里全部免费**（单线程串行），在 Java 里全部要自己负责——这就是并发难的全部根源。

## 学习路径建议

1. 先跑竞态示例（上面 count++ 的例子），亲眼看丢更新
2. 用 `synchronized` / `AtomicInteger` 修好它，理解原子性
3. 写一遍 CompletableFuture 版"并发请求两个接口再合并"（对标你熟悉的 `Promise.all`）
4. JDK 21 起一个 `newVirtualThreadPerTaskExecutor` 跑 1 万个 sleep 任务，观察吞吐
5. 死锁、AQS、线程间协作（`wait/notify`）留到进阶，日常业务开发用不到那么深

## 参考

+ [Java 并发教程（Oracle 官方）](https://docs.oracle.com/javase/tutorial/essential/concurrency/)
+ [JEP 444: Virtual Threads](https://openjdk.org/jeps/444)
+ [JEP 491: Synchronize Virtual Threads without Pinning](https://openjdk.org/jeps/491)
+ [JEP 505: Structured Concurrency (Fifth Preview)](https://openjdk.org/jeps/505)
