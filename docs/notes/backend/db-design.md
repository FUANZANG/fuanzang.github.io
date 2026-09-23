# 数据库设计

> 本文面向"拿到需求怎么建表"的工程实践：范式取舍、必备字段约定、容量与扩展的判断。不追求学术完整性，追求**真实项目里不犯低级错误**。

> 前置：[SQL 基础](/notes/backend/sql-basics)、[MySQL 深入](/notes/backend/mysql-deep)。表结构变更管理见 [数据库迁移](/notes/backend/db-migration)。

## 范式与反范式

**三范式**一句话版（消除冗余）：

+ 1NF：字段原子性（不要在一个单元格里塞逗号分隔的多个值）
+ 2NF：非主键列完全依赖主键（不要把只依赖一半主键的列塞进联合主键表）
+ 3NF：非主键列不互相依赖（`users` 表不要存 `dept_name`——它依赖 `dept_id`，该放 `dept` 表）

**实际项目：3NF 设计 + 适度反范式**。反范式（冗余）的场景：

```sql
-- 订单表冗余商品名快照 —— 商品后来改名，历史订单仍要显示下单时的名字
CREATE TABLE orders (
    product_id   BIGINT NOT NULL,
    product_name VARCHAR(200) NOT NULL,   -- 冗余快照，不是 join products
    ...
);
```

判断标准：**冗余的是"事实快照"就该冗余（下单时的价格），是"当前状态"就别冗余（用户昵称）**。前者是业务需求，后者会制造数据不一致。

## 必备字段约定

真实业务表的"三件套 + 审计"：

```sql
CREATE TABLE orders (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    -- 逻辑删除：业务数据不物理 DELETE（恢复/审计/统计都要）
    is_deleted  TINYINT NOT NULL DEFAULT 0,
    -- 乐观锁：并发更新防覆盖（UPDATE ... WHERE id=? AND version=?）
    version     INT NOT NULL DEFAULT 0,
    -- 审计三件套
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by  BIGINT,
    ...
);
```

+ **逻辑删除 vs 物理删除**：业务表用 `is_deleted` 标记（配合唯一索引的坑：唯一列 + 逻辑删除会冲突，常见解法是唯一索引带删除标记列或删除时改 id）；日志/流水类表才物理删
+ **乐观锁**：读多写少用它；写冲突激烈（秒杀）用数据库悲观锁或 Redis
+ `updated_at` 的 `ON UPDATE` 让数据库兜底，应用层不写也不至于全 NULL

## 字段类型选择

| 场景 | 用什么 | 为什么 |
|---|---|---|
| 金额 | `DECIMAL(12,2)` | FLOAT/DOUBLE 有精度误差，`0.1+0.2≠0.3` |
| 布尔 | `TINYINT(1)` | MySQL 没真布尔 |
| 状态/类型 | `TINYINT` + 注释枚举含义 | 比 VARCHAR 省空间、可索引；别用 MySQL ENUM（加值要改表） |
| 时间 | `DATETIME` | TIMESTAMP 2038 上限且时区行为易混 |
| 长文本 | `TEXT`（独立列甚至独立表） | 大字段拖慢整表查询，冷热分离 |
| 主键 | `BIGINT` 自增 | INT 21 亿可能不够；分布式场景用雪花 ID |
| 外键关联 | 存 id，**不建物理外键** | 互联网项目惯例：逻辑外键（应用层保证），物理外键影响性能且难分库 |

## 索引设计清单

+ 主键必然有；高频 WHERE/JOIN/ORDER BY 列建索引
+ 联合索引按"等值在前、范围在后、区分度高在前"排（详见 [MySQL 深入](/notes/backend/mysql-deep)）
+ 唯一约束用唯一索引表达（`uk_email`），不要只靠应用层校验
- 区分度低的列（性别/状态两三值）单列索引基本无效
- 每张表索引控制在 5 个以内——索引拖慢写入

## 容量与扩展：什么时候才需要分库分表

**单表 2000 万行 / 20GB 以内，MySQL 单实例 + 好索引完全扛得住**——绝大多数项目到不了需要分库分表的那天。演进顺序：

```
1. 索引与 SQL 优化（解决 90% 的问题）
2. 读写分离（主写从读，一主多从）
3. 冷热分离 / 归档（历史数据挪走）
4. 缓存挡读（Redis，见 Redis 基础）
5. 最后才是：分库分表（水平拆分，引入分布式事务/跨片查询的复杂度）
```

**分库分表是最后的手段不是架构先进**——它把一致性、跨片查询、分布式 ID 的复杂度全引进来，没有运维配套就是灾难。

## 一张表设计的完整检查单

```
□ 主键 BIGINT 自增（或分布式 ID）
□ 三件套：is_deleted / version / 审计字段
□ 金额 DECIMAL、状态 TINYINT+注释、时间 DATETIME
□ 唯一约束是否用唯一索引兜底
□ 高频查询路径是否都有索引支撑（对照 EXPLAIN）
□ 冗余字段是"快照"还是"状态"，后者删掉
□ 大字段是否分离
□ 建表 SQL 进 Flyway（V1__init.sql），不手工执行
```

## 学习路径建议

1. 找一个熟悉的前端业务（如购物车/收藏夹），从 ER 图开始设计完整表结构
2. 用上面的检查单自查，再对照成熟开源项目（如若依/RuoYi 的表）看差异
3. 给设计好的表灌数据、跑查询、EXPLAIN 验证索引设计（衔接 MySQL 深入篇）

## 参考

+ [MySQL 8.4 Data Types（官方）](https://dev.mysql.com/doc/refman/8.4/en/data-types.html)
+ [阿里巴巴 Java 开发手册（数据库规约章节）](https://github.com/alibaba/p3c)
