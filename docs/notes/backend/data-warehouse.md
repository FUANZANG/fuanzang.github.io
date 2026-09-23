# 数仓与大数据基础

> 本文是应用开发者的"数据平台识字课"（2026-09 时点）：听懂 ODS/DWD/DWS/ADS、OLAP、数据湖这些词，理解数据从业务库到报表的完整链路。不涉及大数据运维与调优。

> 关联：[MySQL 深入](/notes/backend/mysql-deep) 讲的是 OLTP 侧；本篇讲分析侧（OLAP）。

## OLTP vs OLAP：两个世界

业务库和分析库是两种设计目标相反的系统：

| | OLTP（联机事务处理） | OLAP（联机分析处理） |
|---|---|---|
| 典型查询 | 查一个用户的订单 | 全年订单按地区聚合 |
| 数据量 | 当前行数（万~千万） | 全量历史（亿~万亿） |
| 操作 | 增删改查 + 事务 | 几乎只读、大范围扫描聚合 |
| 存储 | **行存储**（MySQL/PG） | **列存储**（ClickHouse/Doris/SR） |
| 延迟 | 毫秒级 | 秒~分钟级（追求吞吐） |

**为什么分析库用列存**：`SELECT region, SUM(amount)` 只读 2 列，列存物理上把同列放一起——只扫这 2 列的数据，其余列完全不碰；行存则每行都要整行读出。再加上同列数据类型一致、压缩率极高。代价是单行点查慢、不适合事务。

这就是为什么**报表查询绝不能直接打业务库**：一条全表聚合就能把 MySQL 拖死，连带线上交易一起挂。

## 数仓分层：ODS / DWD / DWS / ADS

数据从业务库到报表的加工流水线（阿里 OneData 方法论，国内事实标准）：

```
业务 MySQL / 埋点日志
    │ 同步（原样搬运）
    ▼
ODS（Operational Data Store，原始层）
    │  清洗：去重、补维度、统一格式、脱敏
    ▼
DWD（Data Warehouse Detail，明细层）
    │  预聚合：按天/按用户/按商品汇总成宽表
    ▼
DWS（Data Warehouse Summary，汇总层）
    │  加工成业务指标
    ▼
ADS（Application Data Service，应用层）──► 报表 / BI / 接口

DIM（维度层）：用户表、商品表、时间表——被各层 join 的"字典"
```

各层职责一句话：

+ **ODS**：贴源，原样保留，是"事实的备份"——下游错了可以重跑
+ **DWD**：一条业务过程一张事实表（下单、支付、退款各一张），粒度 = 一次事件
+ **DWS**：面向分析的中间宽表（`user_daily_stats`：用户×天的聚合），避免每个需求都从明细算
+ **ADS**：最终指标，直接对接展示（"昨日 GMV"、"漏斗转化率"）

**为什么分层**（类比前端）：

+ **复用**：DWS 的日汇总表 ≈ 计算属性——十个报表都要"用户日活跃"，不用每个都从明细算
+ **口径统一**：全公司"GMV"只在 ADS 定义一次，不会两个报表对不上
+ **隔离与溯源**：业务库只被 ODS 同步碰一次（CDC/定时抽取），下游全部在数仓内加工；指标错了逐层往下查

## 同步：数据怎么进来的

+ **定时抽取**（T+1）：每天凌晨全量/增量拉取，传统数仓主模式，报表看"昨天"
+ **CDC 实时同步**（binlog 订阅）：Canal/Flink CDC 订阅 MySQL binlog，秒级进数仓，报表准实时
+ 前端关联：你页面上看到的"实时大屏"背后就是 CDC 链路；T+1 报表"昨日数据"就是凌晨批处理

## 数据湖与湖仓一体

**数仓**（Hive/Snowflake/Doris 内表）：数据按 schema 导入专有系统，管理强、成本高。
**数据湖**：原始数据直接扔对象存储（S3/OSS）上的 Parquet 文件，便宜、灵活，但没事务、易成"数据沼泽"。
**湖仓一体（Lakehouse）**：用**开放表格式**（Iceberg/Delta/Hudi/Paimon）在数据湖上补齐"表"的能力——ACID、schema 演进、时间旅行。引擎（SR/Doris/Spark/Trino）直接查湖上的表，数据不再搬来搬去。

2026 年格局：**Apache Iceberg 已是事实标准**（Snowflake、BigQuery、AWS S3 Tables 原生支持）；Delta Lake 绑 Databricks 生态；Paimon 主打流式原生（Flink 配套）。听人聊"上 Iceberg"就是这事。

### 星型模型

数仓表组织方式：中间一张**事实表**（订单明细，只有数字和外键），周围一圈**维度表**（用户、商品、时间）：

```
        dim_user ──┐
     dim_product ──┼──► fact_order（事实表）
        dim_time ──┘
```

对比"把所有字段塞一张大宽表"（雪花模型是维度再拆 normal form）：星型 join 少、好理解，是 ADS/DWS 层主流。前端类比：事实表 = 订单数组，维度表 = 按 id 索引的字典表，渲染时 join。

## 引擎版图（认脸即可）

| 引擎 | 定位 |
|---|---|
| **Hive** | 老一代批处理数仓，SQL → MapReduce/Tez，慢但稳，存量巨大 |
| **ClickHouse** | 俄罗斯出品，单表聚合极快，实时分析标杆 |
| **Apache Doris** | 国产（百度开源），MySQL 协议兼容，JOIN 能力强，国内主流 |
| **StarRocks（SR）** | Doris 出走团队创立，向量化引擎，主打极速多维分析，国内新项目热门 |
| Trino/Presto | 联邦查询：一条 SQL join 多个数据源 |
| Spark / Flink | 计算引擎（批/流），负责 ETL 加工，不是查询引擎 |

Doris vs SR vs ClickHouse 的选型之争是数据团队日常，应用开发者知道"都是用 SQL 查的 OLAP 引擎"即可。

## 应用开发者视角的实用结论

+ 报表/导出/大屏需求 → 找数据平台要 ADS 层接口，**不要**在业务库上写聚合 SQL
+ "这个指标口径是什么" → 问 ADS 层的指标定义，而不是自己算一份
+ 需要明细数据调研 → 申请 DWD 层查询权限
+ 听到"SR 上查一下" = 在 StarRocks 里跑 SQL（协议兼容 MySQL，客户端通用）

## 学习路径建议

1. 本地 Docker 起 Doris 或 StarRocks（官方都有 all-in-one 镜像），灌一份测试数据
2. 手动模拟分层：ODS 原始表 → DWD 清洗 → DWS 聚合 → ADS 指标，各建一张表跑通
3. 对比体验：同一条聚合 SQL 在 MySQL 和 OLAP 引擎上各跑一次（百万行即可感知差距）
4. 之后按需：CDC 链路（Canal/Flink CDC）、Iceberg 表格式上手

## 参考

+ [Apache Doris 官方文档（中文）](https://doris.apache.org/zh-CN/docs/)
+ [StarRocks 官方文档](https://docs.starrocks.io/zh/docs/)
+ [Apache Iceberg](https://iceberg.apache.org/)
+ 阿里 OneData 方法论（数仓分层体系出处）
