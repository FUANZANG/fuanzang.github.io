# 大文件上传

## 核心机制

### 分片上传 (Chunked Upload)

+ 将大文件切分为固定大小的块（通常 1-10MB）
+ 每个分片独立上传，服务端按序/按索引合并
+ 好处：失败只需重传单个分片，不用整个文件重来

### 断点续传

+ 记录已上传的分片索引（本地 + 服务端）
+ 刷新/断网后从上次位置继续
+ 关键：文件标识一致性（用 hash 或 file metadata）

### 秒传 (Instant Upload)

+ 上传前计算文件 hash（MD5/SHA-256）
+ 服务端已有相同 hash → 直接返回成功
+ 适合大文件 + 重复上传场景

## 关键技术点

### 文件切片

+ 浏览器原生 `Blob.slice()` 零拷贝

  ```js
  const chunk = file.slice(start, start + CHUNK_SIZE)
  ```

+ 切片大小策略：固定 / 自适应（网络差时减小）

### 并发控制

+ 不能同时发几千个请求
+ 并发窗口控制（通常 3-6 个）
+ 队列管理 + 失败重试

  ```js
  class UploadQueue {
    constructor(maxConcurrent = 3) {
      this.maxConcurrent = maxConcurrent
      this.running = 0
      this.queue = []
    }

    add(task) {
      return new Promise((resolve, reject) => {
        this.queue.push({ task, resolve, reject })
        this.next()
      })
    }

    next() {
      while (this.running < this.maxConcurrent && this.queue.length) {
        const { task, resolve, reject } = this.queue.shift()
        this.running++
        task()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.running--
            this.next()
          })
      }
    }
  }
  ```

### 进度追踪

+ 单分片进度：`XMLHttpRequest.upload.onprogress` 或 fetch + ReadableStream
+ 总体进度：已完成分片 / 总分片数
+ 实时计算上传速度

  ```js
  const xhr = new XMLHttpRequest()
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100)
      // 更新该分片进度
    }
  }
  ```

### 文件校验

+ 全量 hash：SparkMD5 / crypto.subtle（大文件慢）
+ 采样 hash：首尾 + 中间几段（快但不精确）
+ Web Worker 计算避免阻塞主线程

  ```js
  // Web Worker 中计算 hash
  importScripts('spark-md5.min.js')

  self.onmessage = (e) => {
    const file = e.data
    const blobSlice = File.prototype.slice
    const chunkSize = 2 * 1024 * 1024 // 2MB
    const chunks = Math.ceil(file.size / chunkSize)
    let currentChunk = 0
    const spark = new SparkMD5.ArrayBuffer()
    const reader = new FileReader()

    reader.onload = (e) => {
      spark.append(e.target.result)
      currentChunk++
      if (currentChunk < chunks) {
        loadNext()
      } else {
        self.postMessage(spark.end())
      }
    }

    function loadNext() {
      const start = currentChunk * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      reader.readAsArrayBuffer(blobSlice.call(file, start, end))
    }

    loadNext()
  }
  ```

## 协议与传输

### HTTP 方案

+ 普通 multipart/form-data（小文件）
+ 分片 + 合并 API（主流方案）
+ 自定义协议头：`X-Chunk-Index`、`X-Upload-Id`

### TUS 协议

+ [TUS Protocol](https://tus.io/) — 开放标准
+ 支持断点续传、上传元数据
+ 多语言服务端实现

### WebSocket

+ 适合超大文件 + 实时进度
+ 双向通信，服务端可主动暂停/取消

## 常用库

| 库 | 特点 |
|---|---|
| **tus-js-client** | TUS 协议客户端，成熟稳定 |
| **uppy** | 模块化上传库，插件丰富（分片/断点/拖拽） |
| **resumable.js** | 轻量，分片 + 断点续传 |
| **filepond** | UI 美观，插件生态好 |
| **vue-simple-uploader** | Vue 生态，基于 resumable.js |
| **lucky-canvas / big-upload** | 国产方案，适配国内 OSS |

## 架构设计

### 整体流程

```
┌─────────────────────────────────┐
│         Upload Manager           │
│  ┌───────┐ ┌────────┐ ┌──────┐ │
│  │ 切片器 │ │ 并发池  │ │ 队列 │ │
│  └───┬───┘ └───┬────┘ └──┬───┘ │
│      └─────────┼─────────┘     │
│           ┌────▼────┐          │
│           │ 传输层   │          │
│           │(XHR/Fetch)│         │
│           └─────────┘          │
└─────────────────────────────────┘
```

### 服务端配合

+ 分片接收 + 临时存储
+ 分片校验（每个 chunk 的 hash）
+ 合并策略：全部分片到齐后合并 / 流式合并
+ 存储：直传 OSS（S3/阿里云 OSS）+ 回调通知业务服务

### 直传 OSS 方案（推荐）

```
浏览器 → 获取上传凭证 → 直传 OSS（分片）→ 回调通知业务服务
```

+ 减轻业务服务器压力
+ OSS 原生支持分片上传
+ 阿里云 OSS / 腾讯云 COS / AWS S3 都有 SDK

## 进阶优化

### Web Worker 计算 hash

+ 大文件 hash 计算耗时，放 Worker 里不卡 UI
+ 可以边读边算（流式 hash）

### 内存优化

+ 及时 `URL.revokeObjectURL()` 释放 Blob URL
+ 切片引用用完即释放，避免大文件内存占用

### 拖拽 + 文件夹上传

+ `webkitdirectory` 属性支持文件夹
+ Drag & Drop API

### 网络感知

+ 检测网络状况动态调整并发数/分片大小
+ 弱网自动降级

### 安全相关

+ 上传凭证签名（防伪造）
+ 文件类型校验（MIME + magic number）
+ 大小限制 + 频率限制

## 选型建议

| 场景 | 推荐方案 |
|---|---|
| 快速接入 | uppy / filepond |
| Vue 项目 | vue-simple-uploader |
| 需要 TUS 协议 | tus-js-client |
| 直传 OSS | 各云厂商 SDK |
| 定制需求高 | 自己实现（切片 + 并发池 + 队列） |
