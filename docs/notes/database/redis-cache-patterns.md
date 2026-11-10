# Redis 缓存模式

> 承接 [Redis 基础](/notes/database/redis-basics) 里的 Cache-Aside 读流程。本篇聚焦高并发下三类经典故障：**穿透、击穿（热点 key 失效）、雪崩**，以及互斥重建与逻辑过期。命令语义以 Redis 官方命令参考为准（如 [`SET`](https://redis.io/docs/latest/commands/set/) 的 `NX`/`EX`）。Java 分布式锁细节见 [Redis 与 Java](/notes/database/redis-java)。

## 1. 先对齐名词

业界（尤其中文资料）常把「缓存没挡住、流量打到 DB」分成三种形状：

| 名称 | 失败范围 | 典型触发 |
|------|----------|----------|
| **穿透** | 根本不存在的 key | 乱猜 ID、爬虫、已删数据；每次 miss 且无法「学会」 |
| **击穿** | 单个热点 key | 高峰时该 key 刚好过期，大量请求同时回源 |
| **雪崩** | 大批 key 或整层缓存 | 同一 TTL 集体过期，或 Redis 宕机 |

英文里热点集体回源也常叫 **cache stampede**；与击穿高度重合。下文按上表中文习惯写。

## 2. Cache-Aside（旁路缓存）回顾

```
读：Redis → 命中则返回；未命中 → DB → 写入 Redis（带 TTL）→ 返回
写：先更新 DB，再删除（或更新）缓存，避免长期脏读
```

基础篇示例已覆盖「命中 / 回源写入」。问题出在：**未命中时如何避免打爆 DB**，以及 **TTL 策略**。

## 3. 穿透：查没有的东西

现象：key 在缓存与 DB 都不存在 → 每次都打 DB。

对策（由易到难）：

1. **参数校验**：ID 格式、范围；明显非法直接 `400`，不进缓存层。  
2. **缓存空值**：DB 确认不存在后，写入短 TTL 占位（如 `"__NULL__"` 或专用结构），避免反复查库。TTL 要短，以免正常数据延迟可见。  
3. **布隆过滤器**：在缓存前拦截「一定不存在」的 key（允许少量误判为存在）。适合攻击面大的枚举场景；要注意删除/新增数据时过滤器维护成本。

```js
async function getUser(id) {
  if (!/^\d+$/.test(id)) throw Object.assign(new Error('bad id'), { status: 400 })

  const key = `user:${id}`
  const cached = await redis.get(key)
  if (cached === '__NULL__') return null
  if (cached) return JSON.parse(cached)

  const user = await db.findUser(id)
  if (!user) {
    await redis.set(key, '__NULL__', 'EX', 60) // 短 TTL 空值
    return null
  }
  await redis.set(key, JSON.stringify(user), 'EX', 300)
  return user
}
```

## 4. 击穿：热点 key 过期

现象：一个超热 key 过期瞬间，并发全部打到 DB（stampede）。

### 4.1 互斥重建（单飞）

只有一个请求去 DB 重建，其余等待后再读缓存。Redis 侧可用 `SET key value NX EX seconds` 抢锁（见官方 `SET` 文档）：

```js
async function getHot(key, loader, ttlSec = 300) {
  const hit = await redis.get(key)
  if (hit) return JSON.parse(hit)

  const lockKey = `lock:${key}`
  const got = await redis.set(lockKey, '1', 'NX', 'EX', 10)
  if (got) {
    try {
      const value = await loader()
      await redis.set(key, JSON.stringify(value), 'EX', ttlSec)
      return value
    } finally {
      await redis.del(lockKey)
    }
  }

  // 未抢到锁：短暂等待后重读缓存
  await new Promise((r) => setTimeout(r, 50))
  const again = await redis.get(key)
  if (again) return JSON.parse(again)
  return loader() // 兜底，避免一直空转；生产可限次/熔断
}
```

注意：锁要设过期，防持锁进程崩溃导致死锁；业务上还要处理「等锁超时」。

### 4.2 逻辑过期

物理上不过期（或 TTL 很长），值内带 `expireAt`；读到过期仍返回旧值，并**异步**触发重建。热点始终有值可服务，代价是短暂脏读可接受的场景。

## 5. 雪崩：集体失效或缓存层挂了

### 5.1 TTL 抖动

批量预热时若所有 key `EX 3600`，会在同一秒集体过期。写入时加随机偏移：

```js
const ttl = 3600 + Math.floor(Math.random() * 300) // 3600~3900s
await redis.set(key, value, 'EX', ttl)
```

抖动幅度要有意义：基数 60s、抖动 5s 仍然会挤在一小窗里。

### 5.2 缓存层不可用

TTL 救不了 Redis 宕机。工程侧：

- Redis HA（Sentinel / Cluster）——按官方运维文档部署  
- 进程内短 TTL 本地缓存（L1）吸收抖动  
- 熔断 / 限流：缓存挂了不能无量打 DB；可降级返回旧数据或错误页  

## 6. 选型小结

| 规模 | 穿透 | 击穿 | 雪崩 |
|------|------|------|------|
| 小 | 校验 + 空值缓存 | 互斥锁 | TTL 抖动 |
| 中 | + 布隆 | 互斥或逻辑过期 | + HA + L1 |
| 大 | + 限流 | 逻辑过期 + 热点探测 | Cluster + 熔断 + 预热 |

几乎零成本且收益最大的两行：**空值短 TTL**、**TTL 加抖动**。

## 参考

- [Redis SET command](https://redis.io/docs/latest/commands/set/)
- 本站：[Redis 基础](/notes/database/redis-basics)、[Redis 与 Java](/notes/database/redis-java)
