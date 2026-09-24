# MySQL 深入

> 本文基于 MySQL 8.x/9.x（2026-09 时点：8.0 已于 2026-04 停止支持，当前 LTS 为 8.4 与 9.7；InnoDB 核心机制自 8.0 起稳定）。[SQL 基础](/notes/backend/sql-basics) 篇解决"会写"，本篇解决"**会查慢**"——索引原理、执行计划、InnoDB 内核（锁/MVCC）、慢查询排查。

> 关联：[Spring 事务](/notes/backend/spring-transactions) 篇讲了隔离级别的应用侧，本篇讲数据库侧的实现；[JPA](/notes/backend/jpa)/[MyBatis](/notes/backend/mybatis) 生成的 SQL 最终都落在这些机制上。

## 版本现状速览

| 系列 | 状态 |
|---|---|
| 8.0 | 2026-04 起仅 Sustaining（无安全修复），存量巨大但应规划升级 |
| **8.4 LTS** | 支持到 2032-04，存量主流 |
| **9.7 LTS** | 2026-04 GA，最新 LTS，支持到 2034-04 |
| 26.7+（Innovation） | 日历版本号（YY.M），季度发版，生产别用 |

## EXPLAIN：执行计划

优化 SQL 的第一步永远是**看执行计划**，不是猜。任何 SQL 前面加 `EXPLAIN`：

```sql
EXPLAIN SELECT * FROM orders WHERE user_id = 42 AND status = 'PAID';
```

重点看四列：

| 列 | 看什么 |
|---|---|
| `type` | 访问类型，性能从好到坏：`const` > `ref` > `range` > `index` > **`ALL`（全表扫描，红灯）** |
| `key` | 实际用到的索引（`NULL` = 没用上） |
| `rows` | 预估扫描行数（数量级比精确值重要） |
| `Extra` | `Using index`（覆盖索引，好）/ `Using filesort`（额外排序，差）/ `Using temporary`（临时表，差） |

前端类比：**EXPLAIN ≈ 优化前的 bundle 分析**——先看报告定位问题（全表扫描 ≈ 打包进了整个 lodash），再动手，不靠感觉。

## 索引深入

### 为什么是 B+ 树

InnoDB 索引用 **B+ 树**（多路平衡搜索树）：非叶子节点只存键、叶子节点存数据且用链表串联。选它而非其他结构的原因：

+ 对比**哈希**：哈希只能等值查询，`范围查询（BETWEEN/>/<）` 和 `ORDER BY` 无能为力
+ 对比**B 树**：B+ 树非叶子不存数据 → 单页能放更多键 → 树更矮 → 磁盘 I/O 次数更少（3~4 层可支撑千万行）
+ 对比**二叉树/红黑树**：太瘦高，每层一次 I/O，千万数据要二十几次

叶子节点链表串联 → 范围查询变成"定位起点 + 顺序扫描"，这是 B+ 树的杀手锏。

### 聚簇索引与回表

InnoDB 的表本身就是一棵按主键组织的 B+ 树（**聚簇索引**：数据行物理上按主键顺序存放）。二级索引（你自己建的）叶子节点存的是**主键值**而不是数据地址：

```
SELECT * FROM users WHERE name = 'tom'
  → name 索引树查到主键 id=7     （索引树查找）
  → 再回主键树查 id=7 的整行      （回表：第二次查找）
```

**覆盖索引**：如果要查的列全在索引里，就不用回表——`Extra` 显示 `Using index`：

```sql
-- 索引 idx_name_age(name, age)
SELECT name, age FROM users WHERE name = 'tom';   -- 覆盖索引，不回表
SELECT *         FROM users WHERE name = 'tom';   -- 要回表；SELECT * 是索引杀手
```

### 联合索引与最左前缀

```sql
CREATE INDEX idx_a_b_c ON t(a, b, c);
-- 索引按 (a, b, c) 排序 —— 相当于电话簿先按姓、再按名排序

WHERE a = 1                    -- ✅ 走索引
WHERE a = 1 AND b = 2          -- ✅ 走索引
WHERE b = 2                    -- ❌ 不走（跳过 a，顺序没了）
WHERE a = 1 AND c = 3          -- ⚠️ 只用到 a
WHERE a = 1 AND b > 2 AND c = 3  -- ⚠️ a、b 用到，b 是范围查询后 c 用不上
```

**等值在前、范围在后**是联合索引列顺序的设计原则。前端类比：联合索引 ≈ 多级排序的对象数组，`find` 只有从头按序比较才高效。

### 索引失效的常见姿势

```sql
WHERE YEAR(created_at) = 2026      -- ❌ 函数包裹列
WHERE name + '' = 'tom'            -- ❌ 参与运算
WHERE phone = 13800001111          -- ❌ 隐式类型转换（phone 是 VARCHAR，传了数字）
WHERE name LIKE '%tom'             -- ❌ 前导通配（'tom%' 可以走）
WHERE a = 1 OR d = 2               -- ⚠️ d 无索引则全表
```

## InnoDB：锁与 MVCC

### 锁的粒度

+ **行锁**：锁一行，并发好（InnoDB 特色；MyISAM 只有表锁——这就是"必须用 InnoDB"的原因之一）
+ **间隙锁（Gap Lock）**：锁一个区间（两条记录之间的空隙），防止幻读插入
+ **Next-Key Lock**：行锁 + 间隙锁，RR 隔离级别下的默认加锁单位

死锁场景：两个事务互相持有对方想要的行锁 → InnoDB 检测到后回滚代价小的一方。**加锁顺序保持一致**（如按 id 升序处理批量更新）是预防手段。

### MVCC：无锁的一致性读

**多版本并发控制**——读不加锁，写不阻塞读。核心机制：

```
每行隐藏字段： trx_id（最后修改它的事务号）、roll_pointer（指向 undo log 旧版本）

undo log（回滚日志）：每次修改前，旧值先写进这个日志——
  它既用于事务回滚（ROLLBACK 时按日志逆操作恢复），
  也构成了"版本链"：一条行的历史版本通过 roll_pointer 串成一串

事务开始时生成 ReadView（活跃事务快照）：
  读某行时，沿 undo log 版本链往回找
  → 找到第一个"对当前事务可见"的版本（已提交且早于我快照的）
```

**类比 git**：每次修改产生新版本（commit），ReadView ≈ 你 checkout 的那个快照——别的事务提交了新代码（新版本行），但你的工作区（事务视图）看到的还是快照时的状态。读旧版本不阻塞写，写新版本不阻塞读。

### 四大隔离级别的实现

| 隔离级别 | 实现 | 效果 |
|---|---|---|
| READ UNCOMMITTED | 不用 ReadView，直接读最新 | 脏读 |
| READ COMMITTED | **每条语句**生成新 ReadView | 不可重复读 |
| **REPEATABLE_READ**（默认） | **事务开始时**生成 ReadView，全程复用 | 可重复读；配合 Next-Key Lock 基本防幻读 |
| SERIALIZABLE | 读也加锁 | 串行 |

这就是 [Spring 事务](/notes/backend/spring-transactions) 篇隔离级别表的数据库侧答案：MySQL 默认 RR"可重复读"的底气就是 ReadView 复用 + 间隙锁。

## 慢查询排查流程

```
1. 开慢查询日志（slow_query_log，long_query_time = 1s）
2. 找到慢 SQL
3. EXPLAIN 看执行计划
   ├─ type=ALL 全表扫描 → 看 WHERE 列有没有索引 → 加索引/改写 SQL
   ├─ rows 巨大 → 条件选择性差（区分度低的列不适合索引，如性别）
   ├─ Using filesort → ORDER BY 列考虑进联合索引
   └─ 索引没走 → 对照"索引失效姿势"检查写法
4. 改完再看 EXPLAIN，对比 rows
```

纪律（同前端性能优化）：**先测量后优化**，一次改一个变量，优化前后都要有数据。

## 学习路径建议

1. 建一张百万行测试表（存储过程批量插入），体验全表扫描与索引的差距
2. 对同一条 SQL 反复 EXPLAIN：加索引前/后、改写法前/后，看 type/rows 变化
3. 两个终端窗口开事务，亲手复现：脏读（RC 下）、不可重复读、行锁等待
4. 之后按需：深挖 undo log / redo log / binlog 三者关系（面试进阶）

## 参考

+ [MySQL 8.4 Reference Manual — Optimization](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)
+ [EXPLAIN 输出格式（官方）](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html)
+ [InnoDB Multi-Versioning（官方）](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)
