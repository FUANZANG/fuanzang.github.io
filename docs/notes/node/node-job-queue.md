# Node 异步任务与队列

> Node 侧「能稍后做」的任务队列。实现以 [BullMQ 官方文档](https://docs.bullmq.io/guide/introduction) 为准（默认后端 Redis 6.2+；亦支持 PostgreSQL 后端）。概念对照 [消息队列识字](/notes/java/message-queue)；Redis 基础见 [Redis 基础](/notes/database/redis-basics)。上传后转码、发信、刷缓存等适合进队列，而不是堵在请求线程里。

## 1. 为什么请求里不该干重活

```
HTTP 请求线程：收图 → 压缩 → 写对象存储 → 抽帧 → 发通知
任一慢步骤 → 网关超时 / 用户空等 / 进程被拖死
```

拆开：

```
API：鉴权 + 落库「任务已受理」+ queue.add(...) → 马上 202/200
Worker：独立进程消费 → 成功标记完成 / 失败重试
```

和「业务 MQ」（Kafka/Rabbit）比：BullMQ 这类库更偏**同应用内的 job 队列**（延迟任务、重试、进度），不是替代全公司事件总线；大规模跨服务事件仍看 MQ 笔记。

## 2. BullMQ 四个核心类

按[官方 Introduction](https://docs.bullmq.io/guide/introduction)：

| 类 | 职责 |
|----|------|
| **Queue** | 入队、暂停、清理、查询；也可建定时/重复任务 |
| **Worker** | 真正执行 job；可多进程/多机器抢同一队列 |
| **QueueEvents** | 在任意进程监听完成/失败/进度等事件 |
| **FlowProducer** | 父子依赖流：父任务等子任务都完成后才跑 |

Job = 你定义的数据结构，存在后端里，由 Worker 拉取处理；成功 → completed，抛错 → failed（可配置重试）。

## 3. 最小可跑示例

文档 Quick Start 模式（连接默认 `localhost:6379`；生产务必显式传 connection）：

```ts
import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis({ maxRetriesPerRequest: null }) // Worker 官方示例常见要求

const queue = new Queue('image', { connection })

await queue.add('compress', { objectKey: 'uploads/a.jpg' })
await queue.add('compress', { objectKey: 'uploads/b.jpg' }, { delay: 5000 }) // 延迟

const worker = new Worker(
  'image',
  async (job) => {
    await job.updateProgress(10)
    // ... 压缩 / 转码
    return { ok: true }
  },
  { connection }
)

worker.on('completed', (job) => {
  console.log(job.id, 'done')
})
worker.on('failed', (job, err) => {
  console.error(job?.id, err.message)
})
```

要点（文档共识）：

- Queue 与 Worker **可以不在同一进程**；加 job 时 Worker 甚至可以还没启动。  
- 多 Worker 会分摊消费。  
- BullMQ **2.0+** 延迟任务不再需要单独的 `QueueScheduler`（旧版需要，见官方 Queues 文档警告）。

## 4. 设计注意

| 主题 | 建议 |
|------|------|
| 幂等 | at-least-once：同一 job 可能重试，写库要用业务幂等键 |
| 载荷 | job data 保持小；大文件只传对象存储 key |
| 超时 | 给 Worker/job 设合理 timeout，避免僵尸占坑 |
| 并发 | `Worker` 的 concurrency 按 CPU/IO 调，别默默打爆 DB |
| 可观测 | 失败告警 + `QueueEvents`；死信/人工回放策略要想好 |
| 与 HTTP | 接口返回 job id，前端轮询或 WebSocket/SSE 推进度 |

## 5. 和 Java MQ 怎么选词

- **BullMQ / 云厂商队列**：应用内异步任务、定时、简单削峰。  
- **Kafka / Rabbit** 等：跨服务事件、日志流、复杂路由——见消息队列笔记。  

不要把「所有异步」都塞进一个 Redis 列表手写消费，除非场景极简单；锁、重试、延迟、并发安全成本很高。

## 参考

- [BullMQ Introduction](https://docs.bullmq.io/guide/introduction)
- [BullMQ Quick Start](https://docs.bullmq.io/quick-start)
- [BullMQ Workers](https://docs.bullmq.io/guide/workers/)
- [BullMQ Queues](https://docs.bullmq.io/guide/queues/)
