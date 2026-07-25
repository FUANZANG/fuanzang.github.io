# Web Workers 实战

> 📌 本文件只写**工程实战**：Transferable、请求-响应封装、Worker 池、框架生命周期、与大文件/AI 的边界。
>
> ⚠️ **边界说明**：`new Worker` / `postMessage` / SharedWorker / 能力限制等 **API 基础**见 [浏览器原理 · Web Worker](/notes/foundations/browser#web-worker--sharedworker)；Service Worker 见 [PWA](/notes/foundations/pwa)；分片上传全流程见 [大文件上传](/notes/practice/large-file-upload)。**请勿把本文当 API 入门篇。**
>
> 📅 配套阅读：浏览器篇 Worker 节 + 本篇实战

---

## 1. 什么时候才上 Worker

主线程又算又画：重计算一堵，INP 和滚动都会抖。

| 值得丢 Worker | 别滥用 |
|---------------|--------|
| 大 JSON / 编解码 / 多文件 hash / 图片处理 | 几毫秒就能算完的小逻辑（通信更贵） |
| 本地模型预处理、持续计算队列 | 需要频繁读写 DOM 的逻辑 |

选型直觉：先看 [浏览器篇适用场景](/notes/foundations/browser#web-worker--sharedworker)；确认是 CPU 密集再往下看封装。

---

## 2. 打包路径（避免 404）

浏览器篇里的 `new Worker('./worker.js')` 在 Vite/Webpack 项目里常失效。实战优先：

```js
const worker = new Worker(
  new URL('./hash.worker.js', import.meta.url),
  { type: 'module' }
)
```

模块 Worker 内用 `import`；经典 Worker 才用 `importScripts`。

---

## 3. Transferable：大块数据别傻拷贝

默认 `postMessage` 是**结构化克隆（拷贝）**。大 `ArrayBuffer` 用转移：

```js
worker.postMessage({ type: 'process', buffer }, [buffer])
// 主线程里的 buffer 已 neutered，不能再用

// Worker 算完再转回
self.postMessage({ type: 'done', buffer: out }, [out])
```

可转移：`ArrayBuffer`、`MessagePort`、`ImageBitmap`、`OffscreenCanvas`（转控）等。

Offscreen 画布（细节也见 [Canvas & WebGL](/notes/foundations/canvas-webgl)）：

```js
const offscreen = canvas.transferControlToOffscreen()
worker.postMessage({ canvas: offscreen }, [offscreen])
```

---

## 4. 请求-响应封装

Worker 是事件流，多次并发调用要自带 `id`：

```js
function callWorker(worker, payload, transfer = []) {
  const id = crypto.randomUUID()
  return new Promise((resolve, reject) => {
    const onMessage = (e) => {
      if (e.data.id !== id) return
      worker.removeEventListener('message', onMessage)
      e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.result)
    }
    worker.addEventListener('message', onMessage)
    worker.postMessage({ id, ...payload }, transfer)
  })
}
```

---

## 5. Worker 池（别一任务一新建）

启动和内存都有成本；池化控制并发：

```js
class WorkerPool {
  constructor(url, size = navigator.hardwareConcurrency || 4) {
    this.queue = []
    this.workers = Array.from({ length: size }, () => {
      const w = new Worker(url, { type: 'module' })
      w.busy = false
      w.onmessage = (e) => this.#onDone(w, e.data)
      return w
    })
  }

  run(payload, transfer = []) {
    return new Promise((resolve, reject) => {
      this.queue.push({ payload, transfer, resolve, reject })
      this.#pump()
    })
  }

  #pump() {
    const idle = this.workers.find((w) => !w.busy)
    if (!idle || !this.queue.length) return
    const job = this.queue.shift()
    idle.busy = true
    idle._job = job
    idle.postMessage(job.payload, job.transfer)
  }

  #onDone(worker, data) {
    const job = worker._job
    worker.busy = false
    worker._job = null
    data.error ? job.reject(new Error(data.error)) : job.resolve(data.result)
    this.#pump()
  }

  destroy() {
    this.workers.forEach((w) => w.terminate())
  }
}
```

+ 池大小以 `hardwareConcurrency` 为上限参考，I/O 型可更少  
+ 多标签共享连接：浏览器篇有 SharedWorker；多数场景 **Dedicated + `BroadcastChannel`** 更简单  

---

## 6. Vue / React：创建与销毁

**不要把 Worker 放进深度响应式**；路由离开必须 `terminate()`。

```ts
// Vue
import { onBeforeUnmount } from 'vue'

const worker = new Worker(new URL('./task.worker.js', import.meta.url), { type: 'module' })
onBeforeUnmount(() => worker.terminate())
```

```ts
// React
useEffect(() => {
  const worker = new Worker(new URL('./task.worker.js', import.meta.url), { type: 'module' })
  worker.onmessage = (e) => setResult(e.data.result)
  return () => worker.terminate()
}, [])
```

---

## 7. 实战：分片 Hash 不卡主线程

```js
async function hashFile(file, pool) {
  const CHUNK = 4 * 1024 * 1024
  const hashes = []
  for (let i = 0; i < file.size; i += CHUNK) {
    const buffer = await file.slice(i, i + CHUNK).arrayBuffer()
    const hex = await pool.run({ type: 'hash', buffer }, [buffer])
    hashes.push(hex)
  }
  return hashes
}
```

秒传 / 并发上传窗口仍看 [大文件上传](/notes/practice/large-file-upload)；本篇只负责「算」这一段。浏览器端本地推理卸载见 [Web AI](/notes/frontier/web-ai)。

---

## 8. 常见坑（实战向）

| 坑 | 处理 |
|----|------|
| 大块数据不 transfer | 第二参数列出 transferable，或让 Worker 自己读 `Blob` |
| 打包后 Worker 404 | `new URL(..., import.meta.url)` |
| 当共享内存用 | 默认隔离；`SharedArrayBuffer` 需 COOP/COEP，见 JS 篇 |
| 未捕获错误 | `onerror` + 消息里的 `error` 字段 |
| Worker 泄漏 | 组件卸载 / 池 `destroy()` 时 `terminate()` |
| 和网络流式搞混 | Worker ≠ SSE/WebSocket/WebRTC（见下节） |

---

## 9. 和 AI 语音 / WebRTC（易混）

| 你要做的事 | 常见做法 | 要不要 Worker / WebRTC |
|------------|----------|------------------------|
| 文字流式回答 | SSE / `fetch` 流 / WebSocket | 都不是 WebRTC；一般也不要 Worker |
| **长按说话 → 松手再答**（按住讲话） | `getUserMedia` + `MediaRecorder`，音频走 **HTTP 或 WebSocket** 给 ASR→LLM→TTS | **通常不用 WebRTC**；本地重处理才可选 Worker |
| **实时通话式**（边说边听、可打断） | WebRTC 或厂商 RTC / Realtime API | 才更常上 **WebRTC** |
| 本地模型推理 | WASM / WebGPU | Worker 可选，防卡 UI |

Worker 只解决 **本地算力别堵主线程**；麦克风怎么采、音频怎么送到服务器，是另一条链路。

流式文字见 [AI 流式输出](/notes/frontier/ai-streaming)；通道总览见 [WebSocket 与实时通信](/notes/practice/websocket-realtime)。

---

## 10. 参考

+ API 基础：[浏览器原理 · Web Worker](/notes/foundations/browser#web-worker--sharedworker)
+ [MDN Using Web Workers](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Using_web_workers)
+ 本站：[大文件上传](/notes/practice/large-file-upload) · [Web AI](/notes/frontier/web-ai) · [PWA](/notes/foundations/pwa)
