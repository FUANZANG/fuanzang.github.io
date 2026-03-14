# Redis 基础

Redis 是一个**基于内存的键值（key-value）数据库**，以高吞吐、低延迟著称。它不只是缓存——还支持多种数据结构、持久化、发布订阅等。本篇聚焦前端/全栈最常接触的用途。

> 关系型数据见 [SQL 基础](/notes/backend/sql-basics)；本篇讲 Redis 的定位与核心用法。

## 为什么用 Redis

+ **极快**：数据在内存，读写在微秒级，远快于磁盘数据库。
+ **典型用途**：
  + 缓存（减轻 DB 压力，如热点数据、会话）
  + 会话存储（Session / 登录态）
  + 限流计数器（如接口每分钟调用次数）
  + 排行榜（ZSet）
  + 消息队列（List / Stream）
  + 分布式锁

## 数据结构

Redis 的"值"不止字符串，有多种类型：

| 类型 | 说明 | 典型命令 |
|---|---|---|
| **String** | 字符串/数字 | `SET` `GET` `INCR` `EXPIRE` |
| **Hash** | 字段-值映射（类似对象） | `HSET` `HGET` `HGETALL` |
| **List** | 有序列表（可当队列） | `LPUSH` `RPOP` `LRANGE` |
| **Set** | 无序去重集合 | `SADD` `SMEMBERS` |
| **ZSet** | 带分数的有序集合 | `ZADD` `ZRANGE` `ZRANK` |
| **Stream** | 追加日志（消息流） | `XADD` `XREAD` |

## 基本操作

```bash
SET user:1:name "alice"      # 写入
GET user:1:name              # 读取 -> "alice"
EXPIRE user:1:name 3600      # 3600 秒后过期
TTL user:1:name              # 查看剩余存活时间（-1 永不过期，-2 不存在）
DEL user:1:name              # 删除
```

## 缓存实战（最常用）

典型读流程：

```
请求数据
  └─ Redis 有？ ─ 是 → 直接返回（命中，快）
                  └─ 否 → 查数据库 → 写入 Redis（带过期） → 返回
```

```js
async function getUser(id) {
  const cacheKey = `user:${id}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)        // 缓存命中

  const user = await db.query('SELECT * FROM users WHERE id = ?', [id])
  await redis.set(cacheKey, JSON.stringify(user), 'EX', 300)  // 5 分钟过期
  return user
}
```

### 缓存常见问题

+ **缓存穿透**：查不存在的数据，缓存和 DB 都没有，请求每次打到 DB。
  解决：缓存空值（短过期）、布隆过滤器拦截。
+ **缓存击穿**：某热点 key 过期瞬间，大量请求同时打向 DB。
  解决：互斥锁（只放一个请求回源）、热点 key 不过期。
+ **缓存雪崩**：大量 key 同时过期，DB 瞬间被打垮。
  解决：过期时间加随机抖动、Redis 高可用。

## 计数器与限流

```bash
INCR api:rate:192.168.1.1        # 自增，返回新值
EXPIRE api:rate:192.168.1.1 60   # 60 秒窗口
```

配合判断：一分钟内超过 100 次则拒绝——实现简单接口限流。

## 持久化

Redis 是内存库，断电会丢数据，故提供两种持久化：

+ **RDB**：定时快照，文件小、恢复快，但可能丢最近数据。
+ **AOF**：记录每条写命令，数据更完整，文件大。

生产通常二者结合，按"能接受的数据丢失量"配置。

## 与 SQL 的关系

+ **不是替代**：Redis 不擅长复杂关系查询、事务一致性，不能取代 MySQL/PostgreSQL。
+ **互补**：Redis 做"快的那层"（缓存/临时态），SQL 做"真的那层"（持久真相源）。
+ 一条经验：**先写数据库（真相源），再失效/更新缓存**，避免缓存与 DB 长期不一致。

## 参考

+ [Redis 官方文档](https://redis.io/docs/latest/)
+ [Redis 命令参考](https://redis.io/commands/)
