# 事务与隔离级别

> SQL 事务的 **I（Isolation）**。标准现象与四级隔离以 SQL 标准 + 实现文档为准：PostgreSQL 见 [Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)；MySQL InnoDB 见 [Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)。表设计见 [数据库设计](/notes/database/db-design)；引擎细节见 [MySQL 深入](/notes/database/mysql-deep) / [PostgreSQL](/notes/database/postgres)。

## 1. 事务在干什么

一组语句要么都成功提交（`COMMIT`），要么都回滚（`ROLLBACK`）。并发下「别人改到一半的数据我能不能看见」由**隔离级别**决定。

ACID 里本篇只展开 **Isolation**；原子性/持久性依赖引擎与 redo/undo，不在此展开。

## 2. 四种「不该发生」的现象（标准用语）

| 现象 | 含义 |
|------|------|
| **脏读 dirty read** | 读到别的事务**尚未提交**的修改 |
| **不可重复读 nonrepeatable read** | 同一事务内两次读同一行，结果因别人已提交的修改而变 |
| **幻读 phantom read** | 同一查询条件两次执行，行集合因别人已提交的插入/删除而变 |
| **序列化异常 serialization anomaly** | 一组成功提交的事务，其效果无法等价于「按某一次序串行执行」（PostgreSQL 文档用语） |

级别越高，禁止的现象越多，锁/快照成本通常也越高。

## 3. 四级隔离（标准 + 两家默认差异）

标准四级：`READ UNCOMMITTED` → `READ COMMITTED` → `REPEATABLE READ` → `SERIALIZABLE`。

### PostgreSQL（官方表摘要）

按 [PG 文档 Table 13.1](https://www.postgresql.org/docs/current/transaction-iso.html)：

| 级别 | 脏读 | 不可重复读 | 幻读 | 序列化异常 |
|------|------|------------|------|------------|
| Read uncommitted | 允许，但 **PG 实际按 Read committed 行为** | 可能 | 可能 | 可能 |
| Read committed（**默认**） | 不可能 | 可能 | 可能 | 可能 |
| Repeatable read | 不可能 | 不可能 | 允许，但 **PG 实现不允许幻读** | 可能 |
| Serializable | 不可能 | 不可能 | 不可能 | 不可能 |

要点：

- 默认 **`READ COMMITTED`**：每个语句看到「该语句开始前已提交」的快照；同一事务内后一条 `SELECT` 可能看到别人新提交的数据。  
- `REPEATABLE READ`：事务内语句共享「第一次查询/写语句时」的快照。  
- `SERIALIZABLE`：若并发模式无法串行化，可能以 `serialization_failure` 回滚一方，应用需**重试**。

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
-- 或：SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

隔离级别须在事务内**第一条查询/写语句之前**设置（见 PG `SET TRANSACTION` 文档）。

### MySQL InnoDB

按 [MySQL 8.4 手册](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)：

- 默认 **`REPEATABLE READ`**（与 PG 默认不同）。  
- 普通一致读：事务内多次非锁定 `SELECT` 使用**第一次读建立的快照**。  
- `READ COMMITTED`：每次一致读可建新快照。  
- `REPEATABLE READ` 下范围更新还可能用到 gap / next-key lock，影响插入并发（细节见手册锁定章节）。

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
-- ...
COMMIT;
```

## 4. 和业务怎么对应

| 场景 | 常见选择 |
|------|----------|
| 普通读写、短事务 | 用引擎默认即可（MySQL RR / PG RC） |
| 报表长查询、减少锁冲突 | 常降到 `READ COMMITTED`（仍要测） |
| 扣库存、转账等强一致 | 事务 + 正确锁/`SELECT … FOR UPDATE`；必要时 Serializable + 重试 |
| 「先读后算再写」防丢更新 | 乐观锁版本号，或悲观锁；别只靠默认隔离「感觉安全」 |

## 5. 实践清单

1. 知道你库的**默认级别**（MySQL RR ≠ PG RC）。  
2. 读文档时分清「标准允许的现象」和「该引擎实际更强/更弱」。  
3. 捕获序列化失败 / 死锁并重试（有限次数 + 退避）。  
4. 事务尽量短；长事务拖住快照/锁。  
5. ORM 默认自动提交行为要心里有数（见 [JPA](/notes/java/jpa) / [Prisma](/notes/node/node-data)）。

## 参考

- [PostgreSQL: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [MySQL: InnoDB Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
