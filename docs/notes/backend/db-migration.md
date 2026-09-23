# 数据库迁移（Flyway）

> 本文基于 Flyway 13.x（2026-09 时点；Liquibase 对比部分基于 5.x）。

[JPA](/notes/backend/jpa) 篇留了个悬案：生产环境 `ddl-auto` 只能 `validate`——不让框架建表，**那表结构谁来管？** 答案：数据库迁移工具，Java 生态事实标准是 Flyway。

## 解决什么问题

没有迁移工具时的典型灾难：本地改了表 → 手工在测试库执行 SQL → 忘了在生产执行 → 上线炸了；或者两个人各改一版 SQL，谁先执行、冲突怎么合？

Flyway 的思路一句话：**把表结构的每一次变更写成带版本号的 SQL 文件，进 Git 仓库，应用启动时自动按顺序执行还没跑过的脚本**。

前端直接对标：**Prisma migrate / TypeORM migration**，一模一样的思路；也可以理解为"给数据库 schema 用 git"。

## 核心机制

```
src/main/resources/db/migration/
├── V1__init.sql              # 初始建表
├── V2__add_users_table.sql   # 第二个变更
├── V3__add_index_on_name.sql
└── V4__rename_status.sql
```

+ **命名规则**：`V<版本号>__<描述>.sql`（双下划线），版本号决定执行顺序
+ **历史表**：Flyway 首次运行会在库里建 `flyway_schema_history` 表，记录每个脚本的版本、校验和（checksum）、执行时间、成功与否
+ **启动流程**：应用启动 → 对比历史表和本地脚本 → 只执行**未应用过**的，按版本号顺序，逐个记录

```sql
-- V1__init.sql：就是普通 SQL，没有 DSL
CREATE TABLE users (
    id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    age  INT
);
```

## Spring Boot 集成

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-mysql</artifactId>   <!-- 按数据库加方言包 -->
</dependency>
```

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration     # 默认位置，可不配
    baseline-on-migrate: true             # 已有表的老库首次接入：基线化而不报错
  jpa:
    hibernate:
      ddl-auto: validate                  # 与 Flyway 搭配的标准姿势
```

零配置默认即可用：Boot 检测到 Flyway 依赖，启动时自动跑迁移，**且在 JPA/Hibernate 初始化之前**（所以 `validate` 校验的永远是迁移后的最新结构）。

## 铁律：已应用的脚本不可修改

Flyway 用 checksum 校验文件一致性——**已经跑过的脚本改一个字，启动就报错**（防止"历史被篡改"）。改错了怎么办？

+ 小错：写**新的** V5 脚本修正（推荐，向前修复）
+ 确实要改历史：`flyway repair` 重置校验和（团队周知后谨慎使用）

其他纪律：

+ 只增不改：迁移脚本一旦提交，视为不可变历史
+ 一个变更一个文件：别在一个 V 里塞十个不相关改动
+ DDL 尽量可重入（`IF NOT EXISTS`），减少环境差异引发的中断

## 常用命令

```bash
# 不启动应用单独执行（CI/CD 常用）
mvn flyway:migrate

# 查看迁移状态
mvn flyway:info

# 修正校验和
mvn flyway:repair
```

生产环境常见两种姿势：**应用启动自动迁移**（小团队，简单）或 **CI/CD 流水线中独立执行 `flyway:migrate`**（大团队，DBA 审查脚本后再放行）。

## Flyway vs Liquibase

| | Flyway | Liquibase |
|---|---|---|
| 迁移格式 | 纯 SQL | XML/YAML/JSON/SQL（抽象 changelog） |
| 心智负担 | 极低（会写 SQL 就会用） | 较高（要学 changelog 语法） |
| 跨数据库方言 | 不抽象（SQL 是具体方言） | 抽象层可换数据库 |
| 回滚 | 社区版不支持（向前修复） | 内置 rollback 支持 |

结论：**单一数据库（绝大多数项目）无脑 Flyway**；产品要多数据库发行版才考虑 Liquibase。国内新项目 Flyway 占绝对主流。

## 学习路径建议

1. Spring Boot 项目加依赖，写 V1 建表，启动看 `flyway_schema_history` 表出现
2. 再写 V2 加列，重启观察只执行了 V2
3. 故意改 V1 的注释，重启看 checksum 报错，理解"不可变历史"

## 参考

+ [Flyway 官方文档](https://documentation.red-gate.com/fd)
+ [Spring Boot 集成指南](https://docs.spring.io/spring-boot/reference/data/sql.html#data.sql.flyway)
