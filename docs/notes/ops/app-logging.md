# 应用日志与 requestId

> 补「可观测三大支柱」里的 Logging 落地约定。链路与指标见 [后端可观测](/notes/ops/observability)、[监控栈](/notes/ops/monitoring)；前端错误上报见 [前端监控](/notes/performance/frontend-monitoring)。API 错误体里的 `requestId` 见 [API 设计](/notes/practice/api-design)。

## 1. 日志要解决什么

排障时你需要同时回答：

1. **哪一次请求**（requestId / traceId）  
2. **到了哪一步**（业务事件，不是只有 stack）  
3. **和指标/链路怎么对上**（同一 ID）

没有关联 ID 的日志 = 一堆无法拼接的碎片。

## 2. 级别怎么用

| 级别 | 何时 |
|------|------|
| **error** | 失败需人介入或已影响用户 |
| **warn** | 可恢复异常、降级、重试耗尽前 |
| **info** | 关键业务节点（下单成功、登录成功）——默认生产级别 |
| **debug** | 开发细节；生产默认关 |

避免：循环里 `info` 刷屏；把 `console.log` 当唯一方案且无级别。

## 3. 结构化字段（建议最小集）

一行一条 JSON（或键值），便于检索：

```json
{
  "level": "info",
  "msg": "order_created",
  "requestId": "01JB…",
  "traceId": "4bf9…",
  "userId": "u_42",
  "orderId": "o_9",
  "durationMs": 32
}
```

| 字段 | 含义 |
|------|------|
| `requestId` | 单次 HTTP 请求的关联 ID（网关生成或服务生成） |
| `traceId` | 分布式追踪 ID（常与 W3C `traceparent` 对齐，见可观测篇） |
| `msg` / `event` | 稳定事件名，便于计数与告警 |
| 业务主键 | orderId、jobId… |

**不要**打密码、完整银行卡、大段 PII；需要时脱敏或哈希。

## 4. 请求链路怎么挂 ID

```
客户端 / 网关
  → 若无则生成 X-Request-Id（或用 traceId）
  → 写入 AsyncLocalStorage / 中间件上下文
  → 日志库默认带上
  → 错误响应 body 返回同一 requestId（方便用户反馈）
```

Node 示意（概念，非绑定某库）：

```js
app.use((req, res, next) => {
  const requestId = req.header('x-request-id') || crypto.randomUUID()
  req.requestId = requestId
  res.setHeader('x-request-id', requestId)
  next()
})
```

Worker / 队列任务：用 **jobId** 作关联，并在日志里同时打触发它的 `requestId`（若有）。

## 5. 和 Metrics / Tracing 的分工

| | Logging | Tracing | Metrics |
|--|---------|---------|---------|
| 擅长 | 业务语义、排错细节 | 跨服务耗时拓扑 | 聚合告警、容量 |
| 成本 | 量大利于钱与磁盘 | 采样 | 低基数标签 |

高基数（userId）适合进日志/追踪属性，**不要**无脑打成 Prometheus 标签。

## 6. 清单

- [ ] 每条请求日志带 requestId（或等价）  
- [ ] 错误响应对外回传同一 ID  
- [ ] 生产默认 info；debug 可动态开  
- [ ] 禁止密钥与敏感原文  
- [ ] 与 OpenTelemetry / 现有 traceId 字段对齐  

## 参考

- 本站：[后端可观测](/notes/ops/observability)
- 协议背景：W3C Trace Context（`traceparent`）——实现以你选用的 SDK 文档为准
