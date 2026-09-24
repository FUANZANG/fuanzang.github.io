# 消息队列与 Java

> 本文基于 Spring AMQP（RabbitMQ）与 Spring for Apache Kafka（2026-09 时点）。[消息队列识字](/notes/backend/message-queue) 讲概念与选型；本篇讲 **Boot 项目里怎么发、怎么收、怎么幂等**。

> 前置：消息队列识字、[Spring Boot](/notes/backend/spring-boot)。链路追踪见 [后端可观测](/notes/backend/observability)。

## 选型回顾（一秒）

| 场景 | 倾向 |
|---|---|
| 业务解耦、通知、工作流 | **RabbitMQ** + Spring AMQP |
| 日志/事件流、高吞吐、可回溯 | **Kafka** + Spring Kafka |

下面两套都给最小可跑骨架；生产配置（集群、确认、事务消息）按需加深。

## RabbitMQ：Spring AMQP

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

```yaml
spring:
  rabbitmq:
    host: localhost
    port: 5672
    username: guest
    password: guest
```

### 声明队列与发送

```java
@Configuration
public class AmqpConfig {
    public static final String Q_ORDER_CREATED = "order.created";

    @Bean
    Queue orderCreatedQueue() {
        return QueueBuilder.durable(Q_ORDER_CREATED).build();
    }
}

@Service
public class OrderPublisher {
    private final RabbitTemplate rabbit;

    public OrderPublisher(RabbitTemplate rabbit) { this.rabbit = rabbit; }

    public void publishCreated(OrderCreatedEvent event) {
        rabbit.convertAndSend(AmqpConfig.Q_ORDER_CREATED, event);
        // 默认直连到同名队列；复杂路由再引入 Exchange + Binding
    }
}
```

### 消费

```java
@Component
public class NotifyListener {
    @RabbitListener(queues = AmqpConfig.Q_ORDER_CREATED)
    public void onOrderCreated(OrderCreatedEvent event) {
        // 必须幂等：同一 orderId 进来两次不能双发短信
        notifyService.sendOrderSms(event.orderId());
    }
}
```

### 失败与重试

```yaml
spring:
  rabbitmq:
    listener:
      simple:
        default-requeue-rejected: false   # 别无限重入队
        retry:
          enabled: true
          max-attempts: 3
```

重试耗尽 → **死信队列（DLQ）** 人工看；业务异常要区分「可重试」（下游超时）和「不可重试」（数据非法直接进 DLQ）。

## Kafka：Spring Kafka

```xml
<dependency>
  <groupId>org.springframework.kafka</groupId>
  <artifactId>spring-kafka</artifactId>
</dependency>
```

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: notify-service
      auto-offset-reset: earliest
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
```

```java
@Service
public class OrderEventProducer {
    private final KafkaTemplate<String, OrderCreatedEvent> kafka;

    public void publish(OrderCreatedEvent event) {
        // key = orderId → 同订单进同一分区，保序
        kafka.send("order-events", event.orderId().toString(), event);
    }
}

@Component
public class OrderEventConsumer {
    @KafkaListener(topics = "order-events", groupId = "notify-service")
    public void onMessage(OrderCreatedEvent event) {
        notifyService.sendOrderSms(event.orderId());
    }
}
```

同 `groupId` 内一条消息只被一个实例消费；要广播给多类服务，用**不同 group**。

## 幂等：消费端第一纪律

MQ 是至少一次投递时，重复是常态：

```java
@Transactional
public void sendOrderSms(Long orderId) {
    if (!dedup.insertIgnore("sms:order:" + orderId)) {
        return;   // 唯一键冲突 = 已处理过
    }
    smsClient.send(...);
}
```

常见做法：去重表 / Redis `SET NX`（带 TTL）/ 业务唯一索引。发短信、扣积分、调支付回调——**一律先想幂等键**。

## 事务消息直觉（发件箱）

「写订单 + 发 MQ」不能指望本地事务包住 Broker：

```
错误：DB 提交成功、发 MQ 失败 → 下游永远收不到
错误：先发 MQ、DB 回滚 → 下游收到幽灵订单
```

实用折中——**本地消息表（发件箱）**：

```
同一事务：写订单 + 写 outbox 行
定时任务 / CDC：扫 outbox → 发 MQ → 标记已发送
消费端：照旧幂等
```

Spring 没有「开箱万能事务 MQ」；Kafka 事务 / Rabbit 确认模式要单独学，发件箱最稳、最好排查。

## 和可观测的衔接

发送与消费日志带上 `orderId` + `traceId`（从入口 HTTP 透传进消息 header）。消费者挂了只看业务单号也能定位——详见 [后端可观测](/notes/backend/observability)。

## 和识字篇的分工

| 主题 | 所在篇 |
|---|---|
| 为什么用 MQ、Rabbit vs Kafka、何时不用 | [消息队列识字](/notes/backend/message-queue) |
| Spring 发收、重试/DLQ、幂等、发件箱 | 本篇 |

## 学习路径建议

1. Docker 起 RabbitMQ，跑通 `convertAndSend` + `@RabbitListener` 打印日志
2. 故意让监听抛错，打开 retry，看第三次后进 DLQ
3. 同一消息手动发两次，加去重表验证只处理一次
4. 再起 Kafka，用同一事件模型对比分区 key 与 consumer group
5. 给下单接口加 outbox 行 + 投递任务，模拟「DB 成功、Broker 短暂挂掉」

## 参考

+ [Spring AMQP](https://docs.spring.io/spring-amqp/reference/)
+ [Spring for Apache Kafka](https://docs.spring.io/spring-kafka/reference/)
+ [RabbitMQ 可靠投递](https://www.rabbitmq.com/docs/confirms)
