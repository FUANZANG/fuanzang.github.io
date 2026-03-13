# SQL 基础

SQL（Structured Query Language）是用于操作**关系型数据库**（MySQL、PostgreSQL、SQLite 等）的标准语言。本篇面向前端补足"会写基本查询、理解表关系"的能力，不深入调优与运维。

> 配合 [Node.js](/notes/backend/node) 与 [Linux](/notes/backend/linux) 使用；键值缓存另见 [Redis 基础](/notes/backend/redis-basics)。

## 核心概念

+ **数据库（Database）**：数据的容器。
+ **表（Table）**：由行（记录）和列（字段）组成，类似电子表格。
+ **主键（Primary Key）**：唯一标识一行，通常自增 `id`。
+ **外键（Foreign Key）**：指向另一表的主键，建立表间关联。
+ **范式**：减少数据冗余的设计原则（第一/二/三范式），实战中常适当反范式以换性能。

## 建表

```sql
CREATE TABLE users (
  id        INT PRIMARY KEY AUTO_INCREMENT,
  username  VARCHAR(50) NOT NULL UNIQUE,
  email     VARCHAR(120),
  age       INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

常见类型：`INT`、`BIGINT`、`VARCHAR(n)`、`TEXT`、`BOOLEAN`、`DATE`、`TIMESTAMP`、`DECIMAL(10,2)`（精确小数，金额必备，避免用 `FLOAT`）。

## 增删改查（CRUD）

```sql
-- 增
INSERT INTO users (username, email) VALUES ('alice', 'a@x.com');

-- 查
SELECT id, username FROM users WHERE age > 18 ORDER BY created_at DESC LIMIT 10;

-- 改
UPDATE users SET age = 19 WHERE username = 'alice';

-- 删
DELETE FROM users WHERE id = 1;
```

## 条件与聚合

```sql
SELECT COUNT(*) FROM users WHERE age >= 18;          -- 计数
SELECT AVG(age) FROM users;                           -- 平均值
SELECT country, COUNT(*) FROM users GROUP BY country; -- 分组
SELECT * FROM users WHERE username LIKE 'a%';         -- 模糊匹配
SELECT * FROM users WHERE age BETWEEN 18 AND 30;      -- 区间
```

`GROUP BY` 常配合 `HAVING` 过滤分组结果（注意 `HAVING` 作用于分组后，`WHERE` 作用于分组前）。

## 联表查询（JOIN）

```sql
-- 查询订单及其用户名（orders.user_id = users.id）
SELECT o.id, u.username, o.amount
FROM orders o
JOIN users u ON o.user_id = u.id;
```

常见 JOIN：

+ `INNER JOIN`：只返回两表都匹配的行。
+ `LEFT JOIN`：左表全返回，右表无匹配补 `NULL`。
+ `RIGHT JOIN`：反之。

## 事务

事务保证一组操作**要么全成、要么全回滚**，满足 ACID。

```sql
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;        -- 确认提交（或 ROLLBACK 回滚）
```

典型场景：转账（扣款 + 入账必须同时成功）。

## 索引

索引加快查询，但拖慢写入、占空间。

```sql
CREATE INDEX idx_username ON users(username);
```

+ 主键、外键、高频 `WHERE`/`JOIN` 字段适合建索引。
+ 过度索引会降低 `INSERT/UPDATE` 性能。

## 前端常打交道的点

+ **参数化查询（防 SQL 注入）**：绝不能用字符串拼接 SQL！用占位符：

  ```js
  // Node.js (mysql2 / pg) 参数化
  await db.query('SELECT * FROM users WHERE id = ?', [userId])
  ```

  拼接 `' OR 1=1 --` 这类输入会导致注入，参数化由驱动转义，从根上杜绝。

+ **分页**：`LIMIT offset, size` 或 keyset 分页（大数据量更优）。
+ **ORM**：前端常用 Prisma / TypeORM / Sequelize 生成 SQL，但应理解其产出的 SQL，避免 N+1 查询。

## 参考

+ [SQL 教程（W3Schools）](https://www.w3schools.com/sql/)
+ [MySQL 官方文档](https://dev.mysql.com/doc/)
