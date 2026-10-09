# Node 数据访问

> 本文基于 Prisma 6.x（2026-10 时点）。定位是 Node / Nest 项目里「怎么连库、怎么迁表、怎么避 N+1」；以 Prisma 为主，顺带对照 TypeORM / 手写 SQL。SQL 语法见 [SQL 基础](/notes/database/sql-basics)；Java 侧对标 [JPA](/notes/java/jpa) / [MyBatis](/notes/java/mybatis)。

## 光谱：写多少 SQL

```
手写 SQL（pg / mysql2）  ←→  Query Builder（Knex）  ←→  ORM（Prisma / TypeORM）
   全控、样板多              折中                          模型驱动、迁移一体
```

| 方案 | 像什么 | 何时用 |
|------|--------|--------|
| **Prisma** | schema 即契约 + 生成 Client | 新项目默认；类型体验最好 |
| **TypeORM** | 更接近 JPA（装饰器实体） | 从 Java 迁过来、要 Active Record |
| **mysql2 / pg** | MyBatis 精神：SQL 自己写 | 复杂报表、对 SQL 极致控 |

本站 Node 线默认推荐 **Prisma**：和 TypeScript 咬合紧，迁移工具开箱即用。

## Prisma 三件套

```
schema.prisma     →  数据模型（单一事实来源）
migrate           →  生成/应用 SQL 迁移
Prisma Client     →  类型安全的查询 API（生成出来的）
```

```bash
npm i @prisma/client
npm i -D prisma
npx prisma init
```

### schema 最小例子

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"   // 或 mysql / sqlite
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  authorId Int
  author   User   @relation(fields: [authorId], references: [id])
}
```

```bash
npx prisma migrate dev --name init   # 开发：建迁移并 apply
npx prisma generate                  # 生成 Client（migrate 通常已带）
```

生产用 `prisma migrate deploy`（只应用已有迁移，不交互）。

## Client 用法

```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 创建
const user = await prisma.user.create({
  data: { email: 'a@example.com', name: 'Ada' },
})

// 查询
const found = await prisma.user.findUnique({ where: { email: 'a@example.com' } })

// 关联写入
await prisma.post.create({
  data: {
    title: 'Hello',
    author: { connect: { id: user.id } },
  },
})

// 关联读取（避免 N+1：一次 include）
const withPosts = await prisma.user.findUnique({
  where: { id: user.id },
  include: { posts: true },
})
```

### Nest 里怎么挂

```ts
// prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect()
  }
  async onModuleDestroy() {
    await this.$disconnect()
  }
}
```

```ts
// prisma.module.ts
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Service 里注入 `PrismaService` 即可——对标 Boot 里注入 `UserRepository`。

## 迁移心智

| 命令 | 场景 |
|------|------|
| `migrate dev` | 本地改 schema → 生成 SQL → 应用到开发库 |
| `migrate deploy` | CI / 生产：只跑已提交的迁移 |
| `db push` | 原型/SQLite 快速同步，**不要当生产迁移动作** |

和 [Flyway](/notes/database/db-migration) 同类问题：迁移文件进 Git，环境靠「应用同一串版本」，不要手改生产库。

## N+1 与常用坑

```ts
// ❌ 循环里再查 → N+1
const users = await prisma.user.findMany()
for (const u of users) {
  const posts = await prisma.post.findMany({ where: { authorId: u.id } })
}

// ✅ include / select 一次拿齐
const users = await prisma.user.findMany({
  include: { posts: { select: { id: true, title: true } } },
})
```

其他高频坑：

+ **连接池**：Serverless（Vercel 等）用 Prisma Accelerate / 驱动适配，别每个请求 `new PrismaClient()`
+ **长事务**：`$transaction` 包住多步写入；别在事务里打外部 HTTP
+ **软删除**：schema 加 `deletedAt`，查询统一 `where: { deletedAt: null }`，别散落
+ **原始 SQL**：`prisma.$queryRaw` 留给复杂报表，日常 CRUD 走 Client

## 和 TypeORM / 手写 SQL 怎么选

| 维度 | Prisma | TypeORM | mysql2/pg |
|------|--------|---------|-----------|
| 类型体验 | 生成 Client，推断强 | 装饰器实体，中等 | 自己定义结果类型 |
| 迁移 | 一等公民 | 有，体验一般 | 另接工具 |
| 复杂 SQL | `$queryRaw` | QueryBuilder / 裸 SQL | 最强 |
| 学习曲线 | 低 | 中（概念多） | 低但样板多 |

团队已有 JPA 肌肉且要 Active Record 风格 → TypeORM；新 TS 服务默认 Prisma；报表/数仓同步 → 手写 SQL。

## 和 Redis

关系数据走 Prisma；缓存、分布式锁、Session 仍走 [Redis 基础](/notes/database/redis-basics)。常见模式：

```
读：先 Redis → 未命中再 Prisma → 回填 Redis
写：先 Prisma → 删/更新对应缓存 key
```

别把 Redis 当主库；也别在 Prisma 中间件里隐式乱缓存，边界放 Service 层更清晰。

## 学习路径建议

1. `prisma init` + SQLite，跑通 User CRUD（半天）
2. 加关联 `Post`，练习 `include` / 迁移（一天）
3. 挂进 [NestJS](/notes/node/nestjs) 的 `PrismaService`
4. 需要时再学 `$transaction`、幂等与和 [Node 鉴权](/notes/node/node-auth) 的用户表对接

## 参考

+ [Prisma 文档](https://www.prisma.io/docs)
+ [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
+ 本站：[NestJS](/notes/node/nestjs) · [SQL 基础](/notes/database/sql-basics) · [JPA](/notes/java/jpa) · [数据库迁移](/notes/database/db-migration)
