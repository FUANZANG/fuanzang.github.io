# JPA 与 Spring Data JPA

> 本文基于 Spring Boot 3.x/4.x（2026-09 时点：Boot 3.x 对应 Hibernate 6.6 + Jakarta Persistence 3.1，Boot 4.x 对应 Hibernate 7.x + Persistence 3.2）。

JPA = **Jakarta Persistence API**（原名 Java Persistence API），Java 官方的 **ORM 规范**。日常说"用 JPA"通常指整套组合：Spring Data JPA（仓库抽象）+ Hibernate（实现）。本篇讲清三层关系、核心用法，以及与 MyBatis 的选型对照。

> 前置：[Spring Boot](/notes/backend/spring-boot)、[MyBatis](/notes/backend/mybatis)（两篇互为对照）。

## 三层关系：规范、实现、封装

```
Jakarta Persistence（规范：接口 + 注解定义，Jakarta 官方）
  ↑ 实现
Hibernate（事实标准实现；另有 EclipseLink 等）
  ↑ 再封装
Spring Data JPA（仓库接口抽象，日常直接写的就是它）
```

类比：**JPA 之于 Hibernate ≈ ECMAScript 之于 V8**——规范与实现的关系。Spring Data JPA 则是在实现之上再盖一层"你只声明接口，我生成查询"的便利层（≈ Prisma Client 之于数据库）。

对照前端的定位：**JPA/Hibernate ≈ TypeORM/Prisma**（描述模型，SQL 自动生成）；[MyBatis](/notes/backend/mybatis) ≈ 手写 SQL + 自动映射结果。两者是数据访问光谱的两端。

## 实体映射

```java
@Entity
@Table(name = "users")                    // 对应表名（省略则=类名）
public class User {
    @Id                                   // 主键
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // 自增
    private Long id;

    @Column(name = "user_name", length = 50)   // 列名/长度（驼峰自动映射时可不写）
    private String name;

    private Integer age;                  // 列名一致时无需注解

    @Enumerated(EnumType.STRING)          // 枚举存字符串（别用默认 ORDINAL，加枚举值会错位）
    private Status status;

    @ManyToOne(fetch = FetchType.LAZY)    // 多对一：多个 user 属于一个 dept
    @JoinColumn(name = "dept_id")         // 外键列
    private Dept dept;

    // getter/setter（或 Lombok）
}
```

### 关联与抓取策略

```java
// 一对多（另一侧）
@OneToMany(mappedBy = "dept")             // mappedBy：反向端，不管理外键
private List<User> users = new ArrayList<>();
```

+ `@ManyToOne` 默认 **EAGER**（立即查）、`@OneToMany` 默认 **LAZY**（用到才查）——**惯例是全部改成 LAZY**，按需手动抓取（原因见下文 N+1）
+ 懒加载的实现是运行时生成代理对象，访问未初始化的关联时才发 SQL；**事务外访问懒加载关联会抛 `LazyInitializationException`**（经典报错，本质是"会话已关，没法补查"）

## Spring Data JPA：接口即仓库

```java
public interface UserRepository extends JpaRepository<User, Long> {
    // 单表 CRUD 零代码：save/findAll/findById/deleteById... 全部继承而来

    // 方法名自动翻译成 SQL（derived query）
    List<User> findByName(String name);              // WHERE name = ?
    List<User> findByAgeGreaterThan(Integer age);    // WHERE age > ?
    Page<User> findByStatus(Status s, Pageable p);   // 分页

    // 查询复杂时手写 JPQL（注意是 实体名.属性，不是表名.列名）
    @Query("SELECT u FROM User u WHERE u.age >= :min AND u.status = :status")
    List<User> findAdults(@Param("min") int min, @Param("status") Status status);

    // 原生 SQL（实在要写数据库方言时）
    @Query(value = "SELECT * FROM users WHERE MATCH(name) AGAINST (?1)", nativeQuery = true)
    List<User> fullTextSearch(String kw);
}
```

方法名解析规则（`findBy` + `属性 + 操作符` 串起来）：`And`/`Or`/`Between`/`In`/`Like`/`OrderBy`/`IsNull`…——**方法名即查询**，简单查询的效率碾压写 XML，但条件一多方法名会变成灾难（`findByNameAndStatusAndAgeBetweenOrderByCreatedAtDesc`），此时就该换 `@Query`。

## 持久化上下文：JPA 与 MyBatis 的本质分野

JPA 的核心（也是最大认知门槛）不是注解，是**持久化上下文（Persistence Context）**——一个"受管实体"的缓存：

```
事务开始
  → findById(1L)：查库，实体进入持久化上下文（一级缓存）
  → user.setName("new")：只改了 Java 对象，没调任何 update 方法
  → 事务提交：Hibernate 对比快照，自动 flush 生成 UPDATE！
```

```java
@Transactional
public void rename(Long id) {
    User user = repo.findById(id).orElseThrow();
    user.setName("new name");
    // 没有 repo.save(user)——脏检查（dirty checking）会自动 UPDATE
}
```

这是 MyBatis 完全没有的模型：**MyBatis 是"无状态执行器"**（调一次执行一次 SQL，对象就是数据袋子）；**JPA 是"有状态会话"**（实体被跟踪，框架追踪变化自动同步）。前者心智简单可控，后者省代码但"魔法"更深。

推论：同一个事务内两次 `findById(1L)` 只发一条 SQL（一级缓存命中）；`save` 的语义是"合并托管状态"，不是简单的 INSERT。

## N+1：必踩的坑

```java
List<Dept> depts = deptRepo.findAll();      // 1 条 SQL
for (Dept d : depts) {
    d.getUsers().size();                    // 每个部门 1 条 SQL → N 条！
}
```

懒加载救不了遍历场景：一查关联就发一条 SQL，100 个部门 = 101 条查询。三种解法：

```java
// 1. JPQL join fetch：一条 SQL 带出关联
@Query("SELECT DISTINCT d FROM Dept d JOIN FETCH d.users")
List<Dept> findAllWithUsers();

// 2. @EntityGraph：声明式指定抓取计划
@EntityGraph(attributePaths = "users")
@Query("SELECT d FROM Dept d")
List<Dept> findAllWithUsers2();

// 3. 批量抓取（配置层面缓解）：IN (id...) 批量补查
// spring.jpa.properties.hibernate.default_batch_fetch_size=16
```

MyBatis 天然免疫 N+1（SQL 都是你写的，发几条一清二楚）——这是"SQL 可控"优势的最典型体现。

## 事务与配置

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate    # 生产只校验不建表！update 仅限本地开发
    open-in-view: false     # 关闭 osiv：禁掉视图层懒加载，逼服务层把数据取完
    properties:
      hibernate:
        format_sql: true
```

+ `ddl-auto`：`none/validate/update/create`。**生产环境永远 validate 或 none**——让框架改生产表结构是重大事故源
+ `open-in-view`（OSIV）：默认 true，请求全程开着数据库会话，视图层还能懒加载；副作用是连接占用时间长、分层边界模糊。规范的项目会关掉
+ 事务仍是 Spring `@Transactional` 管（同 [MyBatis 篇](/notes/backend/mybatis)所述，事务与持久层框架解耦）

## 进阶：乐观锁、审计与动态查询

**乐观锁 `@Version`**——并发修改同一行的防线：

```java
@Version
private Integer version;    // UPDATE ... WHERE id=? AND version=?
                            // 版本不符 → 影响行数为 0 → 抛 ObjectOptimisticLockingFailureException
```

（MyBatis 里对应手写 `WHERE version = ?` 并检查影响行数——同一思想，JPA 帮你自动化了。）

**审计字段**——`@CreatedDate`/`@LastModifiedDate` 自动填充创建/更新时间，需配 `@EnableJpaAuditing`。

**Specifications 动态查询**——类型安全的动态条件拼接（≈ 前端按筛选条件动态拼查询参数），比字符串拼 SQL 安全，比多个派生方法优雅；条件特别多时再上，简单场景 `@Query` 够用。

## JPA vs MyBatis 选型

| | JPA（Spring Data JPA） | MyBatis |
|---|---|---|
| SQL | 框架生成 | 自己写 |
| 单表 CRUD | 继承接口零成本 | 每个都要写 XML |
| 复杂查询/多表/调优 | JPQL 越写越别扭，常退回原生 SQL | 主场，DBA 可审查 |
| 心智模型 | 有状态会话 + 脏检查 + 缓存，魔法多 | 无状态执行器，所见即所得 |
| 典型坑 | N+1、LazyInitializationException、ddl-auto 事故 | `${}` 注入、XML 维护成本 |
| 生态 | Spring 官方主推，国外/新项目主流 | 国内业务系统绝对主流 |

务实路线：**两套都要会**——新项目/原型用 JPA 提速，重 SQL/报表/国内团队协作用 MyBatis；同一项目混用也常见（简单表 JPA、复杂报表 MyBatis）。

## 学习路径建议

1. Spring Boot 引 `spring-boot-starter-data-jpa`，建一个实体跑通继承 CRUD（半天）
2. 体验脏检查：`@Transactional` 里改属性不调 save，开 SQL 日志看自动 UPDATE
3. 造一次 N+1（开 `show-sql` 数查询条数），分别用 join fetch / EntityGraph 修掉
4. 之后按需：关联映射全解、`@EntityGraph`、审计字段（`@CreatedDate`）、Specifications 动态查询

## 参考

+ [Spring Data JPA 官方文档](https://docs.spring.io/spring-data/jpa/reference/)
+ [Hibernate ORM 官方文档](https://hibernate.org/orm/documentation/)
+ [Jakarta Persistence 规范](https://jakarta.ee/specifications/persistence/)
