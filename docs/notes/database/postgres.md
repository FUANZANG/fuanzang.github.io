# PostgreSQL

> 本文时点：2026-11。当前稳定主线 **18.6**；**PG 19 在 RC1**（2026-10-15 发布，GA 计划 2026-11-19），特性已在下节列出但生产先别上。前置：[MySQL 深入](/notes/database/mysql-deep)、[SQL 基础](/notes/database/sql-basics)；向量检索入口见 [RAG](/notes/ai/rag)。

PostgreSQL（PG/Postgres）是 SQL 标准遵从度最高、可扩展性最强的开源关系库。生态位一句话：**海外 SaaS 的默认选择，国内常见第二选择（MySQL 为主），AI 线靠 pgvector 又回到默认**。你库里的三个 PG 入口：Prisma 的 `provider = "postgresql"`（[Node 数据访问](/notes/node/node-data)）、Django 官方文档推荐的默认库（[Django](/notes/python/django)）、rag 篇 pgvector 选型表。

## PG vs MySQL（读过 MySQL 深入的八个差异）

| 维度 | MySQL 8 | PostgreSQL 18 | 前端对照物 |
|---|---|---|---|
| 膨胀回收 | InnoDB 原地删，无碎片问题 | MVCC 旧版本靠 **VACUUM** 回收（autovacuum 后台跑；不跑会膨胀变慢） | ≈ 浏览器堆 GC，但 PG 得"手抖一下" |
| JSON | JSON 列（内部二进制，需建虚拟列索引） | **JSONB** 一等公民 + GIN 索引 + 路径查询 | ≈ 给对象挂了"字段级索引"的 Record |
| 可写 CTE | WITH 只读 | `WITH x AS (...) UPDATE/DELETE/INSERT` 可写 CTE | ≈ 事务里的"影子表"玩法 |
| 物化视图 | 无关键字 | `CREATE MATERIALIZED VIEW` + `REFRESH` | ≈ 定时重算的 computed column 表 |
| 扩展机制 | 插件（UDF/存储过程） | **CREATE EXTENSION** 装模块（pgvector/PostGIS/citus/pg_stat_statements…） | ≈ 给数据库装 npm 包 |
| 数据类型 | 无数组 | **array / range / hstore / enum / inet** 原生 | ≈ SQL 里直接写 TS 的 `number[]` |
| 发布订阅 | 无 | `LISTEN` / `NOTIFY`（库内频道） | ≈ 数据库内置的 WebSocket 房间 |
| 锁协调 | 无对等物 | advisory lock（跨会话互斥） | ≈ 手写的分布式锁 |

两条实操含义：① PG 库要关注 `pg_stat_user_tables` 的 autovacuum 滞后（≈ MySQL 篇慢查询排查的同款姿势）；② 要装 pgvector/PostGIS 只有 PG 这条路（MySQL 的向量是 9.x 新物，生态尚早）。

## 版本现状（2026-11）

PG 每年 9-10 月一个大版本，**每个大版本支持 5 年**（多版本重叠，无 LTS 概念——"在支持期"就是可用的）：

| 版本 | 发布 | 状态 | 看点 |
|---|---|---|---|
| **19** | RC1（2026-10-15），GA 计划 11-19 | 未 GA | `REPACK`（回收磁盘/重组表，CONCURRENTLY 不阻塞读写）、`pg_plan_advice`（planner 干预）、并行 autovacuum + 优先级、逻辑复制免重启启用、序列值可复制、`WAIT`（standby 读己写一致性） |
| **18** | 2025-09（18.6，支持到 2030-11） | **当前稳定** | 异步 I/O（AIO）子系统、`uuidv7()`（时间有序 UUID）、虚拟生成列（默认形态）、OAuth 认证、`RETURNING` 带 OLD/NEW、temporal constraints |
| 17 | 2024-09（支持到 2029-11） | 稳定 | 并行 index build、增量备份 API |
| 16 | 2023-09（支持到 2028-11） | 稳定 | 逻辑复制订阅可写（limited） |
| 15 | 2022-10（支持到 2027-11） | 稳定 | `MERGE`、zstd 压缩、JSON 日志 |
| 14 | 2021-09 | **2026-11-12 EOL（下周）** | 新项目别再用 |

选型：**新项目 18**（发版一年、特性全、生态兼容成熟）；19 GA 后一周内跟进问题不大（升级零成本：`pg_upgrade` 物理升级）。存量看到 14/13 排期迁移（支持期外）。

本地起一个（对照 [Docker](/notes/ops/docker) 篇）：

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres:18
psql postgresql://postgres:pass@localhost:5432/postgres   # psql 交互
```

## pgvector：内置向量库（AI 线的默认答案）

[RAG](/notes/ai/rag) 篇的向量库选型表里 pgvector 的定位是"已有 PG 的团队，少运维一个库"。现状（2026-11）：**pgvector 0.8.7**，用法全在一条建库流程里：

```sql
CREATE EXTENSION vector;                 -- ≈ 给数据库装 npm 包

CREATE TABLE embeddings (
  id      bigint PRIMARY KEY,
  title   text,
  embedding vector(1536)                 -- 维度 = 你的 embedding 模型输出维数
);

-- 余弦相似度检索（<=> 是余弦距离，越小越像）
SELECT id, title FROM embeddings
ORDER BY embedding <=> $1
LIMIT 10;

CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops);
```

要点：

+ 距离运算符：`<->` 欧氏、`<=>` 余弦、`<#>` 负内积（语义检索默认用余弦）
+ 近似索引两种：**HNSW**（查询快、内存高；默认选它）/ **IVFFlat**（先 `SELECT train_ivfflat(表, 列, 训练数据)` 再建索引、省内存；≈ 分桶查找）——精确算法细节不必追，选型记住"默认 HNSW，内存紧才 IVFFlat"
+ 容量感：千万级向量内 pgvector 够用（rag 篇表里的结论）；更大规模再上专用向量库（Qdrant/Milvus）
+ 距离 = 1 - cos 相似度，排 `ORDER BY` 时是升序（0 最像）

## 连接方式（对你现有工具链的三句话）

+ **Prisma**：`provider = "postgresql"`（[Node 数据访问](/notes/node/node-data) 的 schema 示例本来就是 PG，迁移命令不变）
+ **Django**：`settings.DATABASES` 官方模板默认 Postgres（[Django](/notes/python/django) 篇的 `makemigrations` 对 PG/MySQL 都适用，约束语法略松）
+ **Supabase**：hosted PostgreSQL（自带 auth/storage/实时通道），大量 SaaS 用它代替"云 + 自建"；能力层基本是 PG 扩展生态（pgvector 等）直接可用的形态

## 学习路径建议

1. Docker 起 `postgres:18`，Prisma 连上跑一遍 CRUD（对照 [Node 数据访问](/notes/node/node-data)）
2. 拿八条差异各写一句 SQL 体感一遍：JSONB GIN 索引、可写 CTE、`LISTEN/NOTIFY`、array 列
3. 装 pgvector 跑通 rag 篇的"embed → 入库 → `<=>` 检索"一条线，对比专用向量库的体验
4. 慢查询排查：装 `pg_stat_statements` 看 top 语句（≈ 你 [MySQL 深入](/notes/database/mysql-deep) 慢查询章节的同款方法）

## 参考

+ [PostgreSQL 官方文档（release 18 / 19）](https://www.postgresql.org/docs/)
+ [PG 19 RC1 发布公告（GA 计划 2026-11-19）](https://www.postgresql.org/about/news/postgresql-19-rc-1-released-3409/)
+ [pgvector GitHub（0.8.x）](https://github.com/pgvector/pgvector)
+ [Postgres on Docker](https://hub.docker.com/_/postgres)
+ 站内：[MySQL 深入](/notes/database/mysql-deep)、[RAG](/notes/ai/rag)、[Django](/notes/python/django)、[Node 数据访问](/notes/node/node-data)
