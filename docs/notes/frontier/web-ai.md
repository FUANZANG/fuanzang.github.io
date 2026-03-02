# Web AI

> 📌 本文件记录在浏览器端运行 AI 的三种主要方案：Transformers.js（ONNX/WASM/WebGPU）、WebLLM（本地 LLM）、WebNN API（浏览器原生 ML 加速）。
>
> 📅 基于以下版本：@huggingface/transformers 4.x | @mlc-ai/web-llm 0.x

---

## 1. 概述

浏览器端 AI 的三种层次：

```
应用层   Transformers.js / WebLLM  — 封装好的高层 API，直接使用模型
          ↓
加速层   WebGPU                    — 通用 GPU 计算，供 WASM/JS 使用
          WebNN                    — 浏览器原生 ML 算子加速（硬件 NPU/GPU）
          ↓
运行时   ONNX Runtime Web         — 跨平台模型推理引擎（Transformers.js 内部使用）
          WASM                     — CPU 回退方案
```

**本地推理的优点**：
- 隐私保护（数据不离开设备）
- 离线可用
- 无 API 调用成本
- 延迟低（无网络往返）

**局限**：
- 模型文件需下载（几十 MB 到几 GB）
- 受设备算力限制，大模型性能差
- 首次加载慢（模型加载 + 编译）

---

## 2. Transformers.js

Transformers.js 是 Hugging Face 官方的 JavaScript 库，功能与 Python 版 `transformers` 对应，基于 ONNX Runtime 运行，支持 CPU（WASM）和 GPU（WebGPU）。

### 安装

```bash
npm install @huggingface/transformers
```

### 基本用法：pipeline

`pipeline()` 是最简单的使用方式，自动下载模型并推理：

```js
import { pipeline } from '@huggingface/transformers'

// 情感分类
const classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english')
const result = await classifier('I love this product!')
// [{ label: 'POSITIVE', score: 0.9998 }]

// 文本生成
const generator = await pipeline('text-generation', 'Xenova/gpt2')
const output = await generator('Once upon a time', { max_new_tokens: 50 })

// 图片分类
const imageClassifier = await pipeline('image-classification', 'Xenova/vit-base-patch16-224')
const imgResult = await imageClassifier('https://example.com/cat.jpg')
```

### 常用任务类型

| 任务 | pipeline 类型 | 说明 |
|------|-------------|------|
| 文本分类 | `text-classification` | 情感分析、主题分类 |
| 文本生成 | `text-generation` | 续写、对话 |
| 填充掩码 | `fill-mask` | BERT 风格完形填空 |
| 命名实体识别 | `token-classification` | NER |
| 问答 | `question-answering` | 从文章中提取答案 |
| 文本转向量 | `feature-extraction` | 语义搜索、相似度计算 |
| 翻译 | `translation` | 多语言翻译 |
| 图片分类 | `image-classification` | 图像分类 |
| 目标检测 | `object-detection` | 物体检测 |
| 语音识别 | `automatic-speech-recognition` | ASR（如 Whisper） |
| 文本转语音 | `text-to-speech` | TTS |

### 在 Web Worker 中使用

模型推理是 CPU/GPU 密集操作，应放在 Worker 中避免阻塞主线程：

```js
// worker.js
import { pipeline, env } from '@huggingface/transformers'

// 模型缓存到 Cache Storage（默认）
env.cacheDir = '/models'

let classifier = null

self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    classifier = await pipeline(
      'text-classification',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      {
        progress_callback: (progress) => {
          self.postMessage({ type: 'progress', data: progress })
        }
      }
    )
    self.postMessage({ type: 'ready' })
  }

  if (data.type === 'classify') {
    const result = await classifier(data.text)
    self.postMessage({ type: 'result', data: result })
  }
}
```

```js
// main.js
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })

worker.postMessage({ type: 'init' })

worker.onmessage = ({ data }) => {
  if (data.type === 'progress') {
    console.log('加载进度:', data.data)
  }
  if (data.type === 'ready') {
    worker.postMessage({ type: 'classify', text: 'I love this!' })
  }
  if (data.type === 'result') {
    console.log('结果:', data.data)
  }
}
```

### 使用 WebGPU 加速

```js
import { pipeline } from '@huggingface/transformers'

const pipe = await pipeline(
  'automatic-speech-recognition',
  'Xenova/whisper-tiny.en',
  { device: 'webgpu' }  // 使用 GPU；不支持时可设 'wasm' 回退
)

const result = await pipe(audioBuffer)
console.log(result.text)
```

### 量化模型（减小体积）

```js
const pipe = await pipeline(
  'text-generation',
  'Xenova/gpt2',
  { dtype: 'q4' }  // 4-bit 量化，体积最小但精度略降
  // 'fp32' 全精度 | 'fp16' 半精度 | 'q8' 8-bit | 'q4' 4-bit
)
```

---

## 3. WebLLM

WebLLM 专注于在浏览器端运行完整的大语言模型（LLM），基于 WebGPU 和 MLC（Machine Learning Compilation）。

### 安装

```bash
npm install @mlc-ai/web-llm
```

### 基本用法

```js
import * as webllm from '@mlc-ai/web-llm'

// 初始化引擎（首次会下载模型，几百 MB 到几 GB）
const engine = new webllm.MLCEngine()

await engine.reload('Llama-3.2-1B-Instruct-q4f32_1-MLC', {
  initProgressCallback: (progress) => {
    console.log(`加载进度: ${Math.round(progress.progress * 100)}%`)
  }
})

// OpenAI 兼容的 chat API
const reply = await engine.chat.completions.create({
  messages: [
    { role: 'system', content: '你是一个有帮助的助手。' },
    { role: 'user', content: '用一句话解释什么是递归' }
  ],
  temperature: 0.7,
  max_tokens: 200
})

console.log(reply.choices[0].message.content)
```

### 流式输出

```js
const stream = await engine.chat.completions.create({
  messages: [{ role: 'user', content: '写一首关于秋天的诗' }],
  stream: true
})

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content ?? ''
  process.stdout.write(delta)  // 或更新 UI
}
```

### 可用模型（示例）

WebLLM 支持的模型持续更新，查看官方列表：

```js
// 查看所有可用模型
console.log(webllm.prebuiltAppConfig.model_list)
```

常见模型：
- `Llama-3.2-1B-Instruct-q4f32_1-MLC` — 1B 参数，体积小，适合测试
- `Llama-3.2-3B-Instruct-q4f32_1-MLC` — 3B 参数，质量更好
- `Phi-3.5-mini-instruct-q4f16_1-MLC` — Microsoft Phi，小而强
- `gemma-2-2b-it-q4f32_1-MLC` — Google Gemma 2B

> ⚠️ 运行 LLM 需要 WebGPU 支持（Chrome 113+）和足够的显存（通常 >= 4GB）。Safari 尚不支持 WebGPU（截至 2025 年支持仍有限制）。

---

## 4. WebNN API

WebNN（Web Neural Network API）是 W3C 标准，允许浏览器直接调用设备的硬件加速（CPU、GPU、NPU）运行 ML 模型，比 WASM 更高效。

### 浏览器支持

- **Chrome/Chromium**：从 M112 开始支持核心接口（ChromeOS、Linux、macOS、Windows、Android）
- **Firefox**：尚不支持
- **Safari**：尚不支持

实际项目中通常不直接使用 WebNN，而是通过 ONNX Runtime Web（Transformers.js 内部使用）等框架自动选择最佳后端。

### 基本概念

```js
// 检测 WebNN 是否可用
if ('ml' in navigator) {
  const context = await navigator.ml.createContext({ deviceType: 'gpu' })
  console.log('WebNN 可用')
} else {
  console.log('WebNN 不支持，回退到 WASM')
}
```

```js
// 创建简单的 ML 计算图（加法）
const context = await navigator.ml.createContext()
const builder = new MLGraphBuilder(context)

// 定义输入
const inputA = builder.input('a', { dataType: 'float32', shape: [2, 2] })
const inputB = builder.input('b', { dataType: 'float32', shape: [2, 2] })

// 构建计算图
const output = builder.add(inputA, inputB)
const graph = await builder.build({ output })

// 执行推理
const bufferA = new Float32Array([1, 2, 3, 4])
const bufferB = new Float32Array([5, 6, 7, 8])
const outputBuffer = new Float32Array(4)

const results = await context.compute(graph, { a: bufferA, b: bufferB }, { output: outputBuffer })
console.log(results.outputs.output)  // [6, 8, 10, 12]
```

> 直接使用 WebNN 较为底层。实际场景推荐通过 ONNX Runtime Web 使用，它会自动选择 WebNN / WebGPU / WASM 中最快的后端。

---

## 5. 技术选型

| 需求 | 推荐方案 |
|------|---------|
| 文本分类、NER、翻译、语音识别等标准任务 | Transformers.js |
| 浏览器端完整 LLM 对话 | WebLLM |
| 自定义 ONNX 模型推理 | ONNX Runtime Web |
| 需要最大化硬件加速（NPU） | WebNN（通过 ONNX Runtime 间接使用） |
| 调用外部 API（OpenAI / Claude 等） | 参见 ai-frontend-integration 笔记 |

---

## 6. 注意事项

**模型下载与缓存**

```js
// Transformers.js 默认从 Hugging Face Hub 下载模型
// 国内访问可能需要镜像或预下载
import { env } from '@huggingface/transformers'

// 使用自托管模型
env.localModelPath = '/models/'
env.allowRemoteModels = false  // 禁止从远端下载，只用本地
```

**首次加载慢**

模型需要下载（可能几百 MB）并编译（WebGPU shader 编译），建议：
- 预加载模型（用户进入页面时后台静默下载）
- 展示清晰的加载进度条
- 利用 Cache Storage 缓存已下载的模型

**内存限制**

浏览器对 WebAssembly 内存有限制（通常 4GB），大模型可能超出。优先选择量化版本（q4/q8）。
