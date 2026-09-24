# Redis 与 Java

> 本文基于 Spring Data Redis / Lettuce（Boot 3–4 默认，2026-09 时点）。[Redis 基础](/notes/backend/redis-basics) 讲数据结构与缓存三大坑（示例偏 JS）；本篇讲 **Java 项目里怎么接、怎么做分布式锁**。

> 前置：Redis 基础、[Spring Boot](/notes/backend/spring-boot)。消息队列级可靠投递见 [消息队列识字](/notes/backend/message-queue)，别用 Redis 硬扛。

## 接入：Spring Data Redis

```xml
<!-- pom：Boot 会拉 Lettuce -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
      password: ${REDIS_PASSWORD:}
      timeout: 3s
```

两种常用 API：

| API | 特点 | 何时用 |
|---|---|---|
| **`StringRedisTemplate`** | key/value 都是 String | 缓存 JSON、计数、分布式锁（推荐默认） |
| **`RedisTemplate<K,V>`** | 可配序列化 | 存对象；务必显式配 JSON，别用默认 JDK 序列化 |

```java
@Service
public class UserCache {
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;

    public UserCache(StringRedisTemplate redis, ObjectMapper mapper) {
        this.redis = redis;
        this.mapper = mapper;
    }

    public UserDTO get(Long id) throws Exception {
        String key = "user:" + id;
        String json = redis.opsForValue().get(key);
        if (json != null) {
            return mapper.readValue(json, UserDTO.class);
        }
        UserDTO user = userMapper.findById(id);          // 查库
        if (user != null) {
            redis.opsForValue().set(key, mapper.writeValueAsString(user),
                Duration.ofMinutes(5));
        }
        return user;
    }

    public void evict(Long id) {
        redis.delete("user:" + id);                      // 写库后删缓存
    }
}
```

口诀仍是基础篇那句：**先写 DB，再删/更新缓存**。多实例部署时「本地 Map 缓存」会不一致——分布式场景用 Redis。

## 分布式锁：为什么需要

多实例（或多线程）同时跑一段「只能一个人进」的逻辑时，JVM 里的 `synchronized` **锁不住别的进程**。典型场景：

+ 定时任务多实例重复跑
+ 库存扣减、优惠券超发
+ 缓存击穿时「只放一个请求回源」

### 最小可用：SET NX EX

```java
public boolean tryLock(String name, String token, Duration ttl) {
    Boolean ok = redis.opsForValue()
        .setIfAbsent("lock:" + name, token, ttl);   // SET key token NX EX
    return Boolean.TRUE.equals(ok);
}

public void unlock(String name, String token) {
    // 只能解自己的锁，防止误删别人的
    String key = "lock:" + name;
    String cur = redis.opsForValue().get(key);
    if (token.equals(cur)) {
        redis.delete(key);
    }
}
```

```java
String token = UUID.randomUUID().toString();
if (!lock.tryLock("job:settle", token, Duration.ofSeconds(30))) {
    return;   // 没抢到，直接走
}
try {
    doSettle();
} finally {
    lock.unlock("job:settle", token);
}
```

要点：

1. **NX**：不存在才设成功 → 互斥
2. **EX / TTL**：持有者崩了锁也会过期，避免死锁
3. **value 用随机 token**：解锁前比对，避免 A 过期后 B 加锁、A 回来把 B 的锁删了
4. TTL 要盖过业务最坏耗时；太短会「以为自己还持锁，其实已过期」——长任务要续期（Redisson 看门狗）或拆短任务

### get + delete 非原子？

上面 `unlock` 的 get-then-delete 在极端并发下有竞态。生产更稳的是 **Lua 脚本一次执行**，或直接用 **Redisson** `RLock`（看门狗自动续期、可重入）：

```java
RLock lock = redisson.getLock("lock:job:settle");
if (lock.tryLock(0, 30, TimeUnit.SECONDS)) {
    try { doSettle(); }
    finally { lock.unlock(); }
}
```

面试/读代码认脸：手写 SET NX 懂原理；落地优先成熟库，少自己造轮子。

## 限流与计数（Java 侧）

```java
public boolean allow(String userId, int limit, Duration window) {
    String key = "rate:" + userId;
    Long n = redis.opsForValue().increment(key);
    if (n != null && n == 1L) {
        redis.expire(key, window);
    }
    return n != null && n <= limit;
}
```

简单固定窗口够用；滑动窗口 / 令牌桶可用 Lua 或现成组件（Sentinel、Bucket4j）。网关层限流见 [Spring Cloud](/notes/backend/spring-cloud)。

## 和基础篇的分工

| 主题 | 所在篇 |
|---|---|
| 数据结构、缓存穿透/击穿/雪崩、RDB/AOF | [Redis 基础](/notes/backend/redis-basics) |
| `StringRedisTemplate`、分布式锁、Java 限流 | 本篇 |
| 可靠异步解耦 | [消息队列识字](/notes/backend/message-queue) |

## 学习路径建议

1. Boot 项目接 Redis，把某个 `getUser` 加上缓存 aside + 写后删缓存
2. 起两个实例，用定时任务 + SET NX 锁，确认同一时刻只有一个在跑
3. 故意把 TTL 设很短、业务 sleep 更长，观察「锁过期导致并发」——理解为何要续期
4. 之后按需：Redisson、Cache 注解（`@Cacheable`）、Redis Stream 消费组

## 参考

+ [Spring Data Redis](https://docs.spring.io/spring-data/redis/reference/)
+ [Redis SET 命令（NX/XX/EX）](https://redis.io/commands/set/)
+ [Redisson 文档](https://github.com/redisson/redisson/wiki)
