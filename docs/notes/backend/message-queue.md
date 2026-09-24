# 消息队列识字

> 本文基于 2026-09 时点的工程共识（Kafka 仍是日志流/大数据标配，RabbitMQ 仍是业务解耦常客）。定位与 [Spring Cloud](/notes/backend/spring-cloud)、[数仓](/notes/backend/data-warehouse) 相同：**听懂黑话、会读链路**，不覆盖集群搭建与运维调优。

> 关联：[Redis 基础](/notes/backend/redis-basics)（List/Stream 可做轻量队列，但不是正经 MQ）；Java 落地见 Spring AMQP / Spring for Apache Kafka（本篇不展开 API）。

## 为什么需要消息队列

同步调用（HTTP / Feign）的痛：

```
下单接口里：写订单 → 扣库存 → 发短信 → 写积分 → 通知仓储
任意一步慢/挂 → 整个下单失败或超时
```

MQ 把「必须立刻做完」和「可以稍后做」拆开：

```
下单服务：写订单 + 发一条「订单已创建」消息 → 马上返回成功
  ├─ 短信服务 订阅 → 发短信
  ├─ 积分服务 订阅 → 加积分
  └─ 仓储服务 订阅 → 备货
```

**核心收益**：解耦、削峰（秒杀流量先进队列慢慢消费）、异步（用户不用等短信）。

**核心代价**：最终一致性、重复消费、消息堆积、排查链路变长——不是免费午餐。

## 三个必懂概念

| 词 | 含义 | 前端直觉 |
|---|---|---|
| **Producer** | 发消息的一方 | `emit` 事件的人 |
| **Consumer** | 收消息并处理 | 事件监听器 |
| **Broker** | 中间的队列服务 | 事件总线本身 |

再加两个坑相关词：

+ **至少一次（at-least-once）**：消息可能重复投递——消费端必须**幂等**（同一订单短信发两次也不崩）
+ **顺序**：同一分区/队列内可保序；跨分区不保证——别假设「全局有序」

## RabbitMQ vs Kafka：怎么认脸

| | **RabbitMQ** | **Kafka** |
|---|---|---|
| 模型 | 队列 + Exchange 路由 | 分布式追加日志（Topic / Partition） |
| 擅长 | 复杂路由、任务分发、RPC 式异步 | 高吞吐日志流、事件溯源、对接数仓 |
| 消费 | 推模式为主，消费完即删（视配置） | 拉模式，靠 offset，可回溯重放 |
| 典型场景 | 订单通知、邮件、工作流 | 用户行为、日志采集、CDC、实时数仓入口 |
| 运维重量 | 相对轻 | 相对重（分区、副本、再均衡） |

一句话：**业务服务之间解耦 → 先想 RabbitMQ；大数据/日志/事件流 → Kafka**。公司里两者常并存。

> Redis List / Stream 也能当队列，适合「已经有 Redis、量不大、丢了能接受」的场景；要可靠投递、堆积能力、多消费者组，上正经 MQ。详见 [Redis 基础](/notes/backend/redis-basics) / [Redis 与 Java](/notes/backend/redis-java)。

### RabbitMQ 路由直觉

```
Producer → Exchange（交换机）→ 按规则绑定 → Queue → Consumer
```

+ **direct**：按 routing key 精确匹配（最常用）
+ **fanout**：广播到所有绑定队列（发公告）
+ **topic**：按模式匹配（`order.*`）

### Kafka 分区直觉

```
Topic: order-events
  ├─ Partition 0  →  Consumer A
  ├─ Partition 1  →  Consumer B
  └─ Partition 2  →  Consumer C
同一 Consumer Group 内：一条消息只被组内一个消费者处理（并行靠分区）
```

选 key（如 `orderId`）决定进哪个分区——**同 key 有序**，这是设计事件模型时就要想的。

## 和微服务怎么拼

```
前端下单
  → order-service（写库 + 发 MQ 消息）
  → 立即 200
后台：
  notify-service / points-service / stock-service 各自消费
```

对比 [Spring Cloud](/notes/backend/spring-cloud) 的 Feign：**Feign = 此刻就要对方结果**；**MQ = 告诉别人「发生了某事」**。需要返回值的查询别走 MQ。

Gateway / 鉴权仍然在同步链路上；MQ 消费者是内部服务，靠网络隔离或独立凭证，不走浏览器 Token。

## 消费端必须做的三件事

1. **幂等**：用业务唯一键（订单号）做去重表 / 唯一索引，重复消息直接跳过
2. **失败重试 + 死信**：重试耗尽进死信队列（DLQ），人工或补偿任务处理——别无限重试打爆下游
3. **可观测**：消息带 `traceId` / 业务单号，日志能从「用户投诉」追到「哪条消息卡死」

## 什么时候不要用 MQ

+ 读多写少的查询（多一跳还更慢）
+ 强一致要立刻知道结果的操作（下单扣款同步失败必须马上告诉用户）
+ 团队还在为单体事务头疼——先把单体和数据库用稳

## 学习路径建议

1. Docker 起一个 RabbitMQ（带管理台），用管理页手动发一条消息，写个监听打印日志
2. 模拟「下单成功发邮件」：订单服务发、通知服务收；故意让通知抛错，观察重试
3. 同一消息发两次，给消费逻辑加幂等，确认不会双发短信
4. 有大数据/日志场景再碰 Kafka：搞清 Topic、分区、Consumer Group、offset
5. 之后按需：Spring AMQP / Spring Kafka、事务消息（发件箱模式）、延迟队列

## 参考

+ [RabbitMQ 教程](https://www.rabbitmq.com/tutorials)
+ [Kafka 文档](https://kafka.apache.org/documentation/)
+ [Spring AMQP](https://spring.io/projects/spring-amqp) / [Spring for Apache Kafka](https://spring.io/projects/spring-kafka)
