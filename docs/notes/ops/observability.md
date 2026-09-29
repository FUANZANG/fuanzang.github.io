# 后端可观测

> 本文基于 Micrometer + OpenTelemetry（2026-09 时点；Spring Boot 3 起 Sleuth 已并入 Micrometer Tracing）。定位与 [前端监控](/notes/performance/frontend-monitoring) 对称：**Metrics / Tracing / Logging 怎么串**，听懂排障黑话；不覆盖自建可观测平台运维。

> 前置：[Spring Boot](/notes/backend/spring-boot)、[Spring Cloud](/notes/backend/spring-cloud)（地图里的链路追踪）。AI 侧见 [AI 评测与可观测](/notes/frontier/ai-eval-observability)。

## 三大支柱

```
可观测性
├── Metrics 指标   — QPS、延迟、错误率、JVM、队列堆积（聚合、可告警）
├── Tracing 链路   — 一次请求跨过哪些服务、哪一段慢（排障主武器）
└── Logging 日志   — 细节与业务语义（要带 traceId 才能和链路对上）
```

前端类比：Performance/CWV ≈ Metrics；用户会话回放/请求瀑布 ≈ Tracing；`console`/上报错误 ≈ Logging。

**黄金信号**（Google SRE）：延迟、流量、错误、饱和度——看板先有这四类，再堆业务自定义指标。

## 一次请求怎么被串起来

```
浏览器
  → Gateway（生成或透传 traceparent）
  → order-service（Span: HTTP + DB + 发 MQ）
  → notify-service（Span: 消费消息 + 调短信）
日志每行带同一 traceId → 从用户投诉的时间点搜到全链路
```

关键字段：

| 词 | 含义 |
|---|---|
| **Trace** | 一次端到端调用（一个 traceId） |
| **Span** | 其中一步（HTTP 进、DB、Feign、发 MQ） |
| **Baggage** | 沿链路传递的业务键（慎用，别塞隐私） |

协议事实标准是 **W3C `traceparent`**；老系统还有 B3（Zipkin）。Boot 3 + Micrometer Tracing 默认能对接 OTLP / Zipkin / SkyWalking。

## Boot 里最小接入

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
  <groupId>io.micrometer</groupId>
  <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<!-- 导出：按团队选 OTLP / Zipkin 等 -->
```

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  tracing:
    sampling:
      probability: 1.0          # 开发 1.0；生产常 0.1 左右采样
  otlp:
    tracing:
      endpoint: http://localhost:4318/v1/traces

logging:
  pattern:
    level: "%5p [${spring.application.name:},%X{traceId},%X{spanId}]"
```

```java
@RestController
public class OrderController {
    private final MeterRegistry registry;

    @GetMapping("/api/orders/{id}")
    public Order get(@PathVariable Long id) {
        return Timer.builder("order.get")
            .publishPercentiles(0.95, 0.99)
            .register(registry)
            .record(() -> orderService.get(id));
    }
}
```

Actuator `/actuator/prometheus` 给 Grafana；Tracing 进 Jaeger / Tempo / SkyWalking 看瀑布图。

## 日志必须绑 traceId

没有 traceId 的日志在微服务里几乎不可用：

```
ERROR [order-service,a1b2c3d4e5f6,00f0] 扣库存失败 orderId=88
```

MDC 里的 `traceId`/`spanId` 由 tracing 桥接自动注入（上表 `logging.pattern.level`）。人工 `log.info` 记得带**业务主键**（orderId、userId），和 span 互补。

## MQ / Feign 要透传

+ **Feign / RestClient**：Boot 自动埋点后通常自动传 `traceparent`
+ **MQ**：发送时把 trace 上下文写入消息 header，消费端恢复——否则异步段变成断链

排障口诀：同步断了查网关/超时；异步断了先查消息 header 有没有上下文。

## 和前端监控怎么对

| 前端 | 后端 |
|---|---|
| JS 错误、接口失败率 | 5xx、业务错误码计数 |
| 接口耗时（RUM） | 服务端 Span 耗时 + DB 慢查询 |
| 用户 session / 页面 | Trace + 业务 userId（隐私合规） |

联调事故时：前端拿 `x-request-id` / `traceparent`，后端用同一 ID 搜日志——比「大概下午三点挂了」高效一个数量级。

## 常见坑

+ **生产 100% 采样** → 成本爆炸；关键路径可强制采样
+ **只埋 Metrics 不埋 Trace** → 知道错了不知道在哪
+ **日志无业务键** → 有 trace 也对不上订单投诉
+ **Actuator 裸奔公网** → 只内网或网关鉴权

## 学习路径建议

1. Boot 项目加 Actuator + Prometheus，Grafana 拉一个 QPS/延迟面板
2. 加 OTLP → 本地 Jaeger，打一发跨两个 Controller 的请求看 Span 树
3. 日志 pattern 加上 traceId，故意制造一次 500，从日志跳到 Jaeger
4. 给 MQ 消费加 header 透传，确认异步段不断链
5. 之后按需：SkyWalking 探针、自定义业务指标、SLO 告警

## 参考

+ [Micrometer Tracing](https://docs.micrometer.io/tracing/reference/)
+ [Spring Boot Actuator](https://docs.spring.io/spring-boot/reference/actuator/index.html)
+ [OpenTelemetry](https://opentelemetry.io/)
+ 本站：[前端监控](/notes/performance/frontend-monitoring) · [Spring Cloud](/notes/backend/spring-cloud)
