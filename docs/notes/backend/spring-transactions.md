# Spring 事务

> 本文基于 Spring Framework 6.x/7.x（2026-09 时点；6.2 起新增 `rollbackOn=ALL_EXCEPTIONS` 全局开关，7.x 无破坏性变化）。

事务是 JPA/MyBatis 共同的地基，也是 Java 后端实操与面试的第一大题。[Spring Boot](/notes/backend/spring-boot) 篇只提了一句 `@Transactional`，本篇把它讲透。

> 前置：[Spring Boot](/notes/backend/spring-boot)（IoC/AOP 概念）。

## 事务是什么：ACID

一组 SQL 要么全部生效、要么全部不作数：

```
转账：A 扣 100 元 + B 加 100 元
  → 两步必须同生共死，中间任何失败都要整体回滚
```

前端视角：JS 日常几乎不碰真事务（最接近的是 IndexedDB 的事务 API，但用的人少）。核心心智模型一句话：**`@Transactional` 方法 = 一个"全有或全无"的原子单元**。

## @Transactional 的实现：代理

注解本身只是元数据，真正干活的是 **AOP 代理**。

**AOP（面向切面编程）**：把"每个业务方法都需要、但不属于业务逻辑"的横切关注点（事务、日志、权限、监控）抽成**切面**，由框架在运行时统一织入——你写 `@Transactional`，Spring 生成代理对象，在方法前后插入"开事务/提交回滚"的代码，业务方法本身一行不用改。前端最贴切的类比：**axios 拦截器 / 装饰器**——不动业务函数，在外层包一圈通用逻辑；区别是 Java 的织入发生在运行时生成的子类/代理里，前端是显式函数包裹。

代理的工作流程：

```
调用方 → 代理对象（Spring 运行时生成）
           ├─ 开启事务（拿数据库连接、setAutoCommit(false)）
           ├─ 调用你的真实方法
           ├─ 正常返回 → 提交 commit
           └─ 抛异常 → 按回滚规则决定 rollback
```

理解了"代理包裹"这一层，下面所有失效场景都顺理成章——**凡是绕过代理的调用，事务都是摆设**。

## 传播行为（Propagation）

业务方法嵌套调用时，内层方法的事务怎么处理。七个枚举值，日常只需吃透前三个：

| 传播行为 | 语义 | 典型场景 |
|---|---|---|
| `REQUIRED`（默认） | 有事务就加入，没有就新建 | 99% 的场景 |
| `REQUIRES_NEW` | 挂起外层事务，**独立开新事务**（连接也独立） | 记操作日志：主流程回滚了，日志也要留下 |
| `NESTED` | 在当前事务内建**保存点**（savepoint），可局部回滚 | 批量处理：某条失败只回滚它，其余继续 |
| `SUPPORTS` | 有就加入，没有就非事务跑 | 查询 |
| `NOT_SUPPORTED` | 挂起事务，非事务执行 | 不锁资源的耗时操作 |
| `MANDATORY` | 必须已有事务，否则抛异常 | 防止被裸调用 |
| `NEVER` | 必须没有事务，否则抛异常 | 极少用 |

savepoint 展开：它是 SQL 标准里的"事务内书签"——`SAVEPOINT sp1` 打个标记，之后 `ROLLBACK TO sp1` 就只撤销标记之后的操作，标记之前的照常提交。NESTED 传播就是 Spring 帮你自动打标记/回滚标记，外层事务整体还在。对比 `REQUIRES_NEW`（完全独立的两个事务、两个连接），NESTED 是**同一事务内的部分回滚**，省连接。

```java
// 日志服务：无论外层成败，日志独立提交
@Service
public class AuditService {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action) { auditRepo.insert(action); }
}
```

注意 `REQUIRES_NEW` 的坑：内层要**再拿一个连接**，外层连接还占着——并发高时可能耗尽连接池甚至互相等死锁。连接池大小必须大于并发线程数。

## 隔离级别（Isolation）

并发事务互相能看到什么。四个经典问题从轻到重：脏读（读到别人未提交的数据）→ 不可重复读（同事务两次读不一致）→ 幻读（两次范围查询行数不同）。

| 级别 | 脏读 | 不可重复读 | 幻读 |
|---|---|---|---|
| READ_UNCOMMITTED | ✗ | ✗ | ✗ |
| READ_COMMITTED | ✓ | ✗ | ✗ |
| REPEATABLE_READ（MySQL InnoDB 默认） | ✓ | ✓ | 基本避免 |
| SERIALIZABLE | ✓ | ✓ | ✓ |

实践：**绝大多数项目用数据库默认级别（`Isolation.DEFAULT`）不动它**，真有并发一致性问题时先考虑乐观锁/select for update，而不是贸然升隔离级别（级别越高锁越重、并发越差）。

## 回滚规则：默认只回滚 RuntimeException

**默认行为：`RuntimeException` 和 `Error` 回滚，checked 异常不回滚**（直接提交！）：

```java
@Transactional
public void transfer() throws Exception {
    aRepo.debit(100);
    bRepo.credit(100);
    throw new IOException("checked 异常");   // 事务照样提交！钱已经动了
}

// 修正一：显式声明
@Transactional(rollbackFor = Exception.class)

// 修正二（Spring 6.2+）：全局统一，一劳永逸
@EnableTransactionManagement(rollbackOn = ALL_EXCEPTIONS)
```

这是历年事故 Top 级来源：**自定义业务异常如果忘了继承 RuntimeException，回滚就静默失效**。团队规范建议直接全局 `ALL_EXCEPTIONS`。

## 事务失效的五种经典场景

全部源于"绕过了代理"或"注解没被识别"：

```java
// 1. 自调用：this.methodB() 不走代理，methodB 的事务无效
public void methodA() {
    this.methodB();               // ❌ 直接调 this
}
@Transactional public void methodB() { ... }

// 修正：把 methodB 拆到另一个 Bean，或注入自身代理

// 2. 非 public 方法（JDK 动态代理只拦 public；
//    注：CGLIB 类代理下 protected/包可见方法 Spring 6.0+ 可生效，别依赖这个边角）

// 3. 异常被 catch 吞掉：代理根本看不到异常，正常提交
@Transactional
public void method() {
    try { risky(); } catch (Exception e) { log.error(e); }   // ❌ 吞了
}

// 4. 多线程：事务绑定在当前线程，新线程里的 SQL 不在事务内
@Transactional
public void method() {
    new Thread(() -> repo.insert(x)).start();   // ❌ 不受事务保护
}

// 5. 数据库引擎不支持事务（MyISAM）——现代 MySQL 默认 InnoDB，基本绝迹
```

记住判别式：**事务 = 代理拦截 + 当前线程绑定**。任何调用路径只要不满足这两条，`@Transactional` 就是装饰品。

## 其他常用属性

```java
@Transactional(
    readOnly = true,      // 只读提示：驱动/JPA 可据此优化（如不持久化脏检查快照）
    timeout = 30          // 超时秒数，防止长事务拖垮连接池
)
public List<User> list() { ... }
```

`readOnly` 是提示不是强制（写了不一定报错），但配合 JPA 能省掉脏检查快照的开销，查询方法标上是个好习惯。

## 长事务：另一个高频事故源

事务里干了慢活（调外部 HTTP、发消息、处理大文件）→ 连接被长时间占用 → 连接池耗尽，全站挂。

纪律：**事务边界收窄到"纯数据库操作"**。外部调用挪到事务外，或用事务同步（`TransactionSynchronizationManager` 的 afterCommit 回调）在提交后再执行。

## 参考

+ [Spring 事务官方文档](https://docs.spring.io/spring-framework/reference/data-access/transaction.html)
+ [@Transactional Javadoc](https://docs.spring.io/spring-framework/docs/7.0.x/javadoc-api/org/springframework/transaction/annotation/Transactional.html)
