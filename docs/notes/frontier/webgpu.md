# WebGPU

WebGPU 是浏览器的新一代**图形与计算 API**，用于在 GPU 上执行渲染和通用计算。它取代老旧的 WebGL，提供更接近现代 GPU 的编程模型（基于 Vulkan / Metal / Direct3D 12），性能与灵活性大幅提升。

> 上一代图形 API 见 [Canvas & WebGL](/notes/foundations/canvas-webgl)；3D 封装库见 [Three.js](/notes/frontier/threejs)。

## 为什么需要 WebGPU

| 维度 | WebGL | WebGPU |
|---|---|---|
| 底层 | OpenGL ES（较老） | Vulkan / Metal / D3D12 |
| 并发 | 单线程命令 | 显式命令编码、可并行 |
| 计算能力 | 有限的 GPGPU（用 fragment shader 凑） | 一等公民的 **Compute Shader** |
| 性能 | 一般 | 高（更少驱动开销） |
| 状态管理 | 全局状态机（易出错） | 显式 Pipeline 对象 |

核心收益：**更快的渲染、真正的 GPU 通用计算（AI 推理、物理仿真、图像处理）**。

## 浏览器支持

+ Chrome / Edge：已从 113 版本起稳定支持。
+ Safari：16.4+ 起支持。
+ Firefox：逐步推进。
+ 使用前务必**特性检测**：

```js
if (!navigator.gpu) {
  console.warn('当前浏览器不支持 WebGPU')
}
```

## 核心概念

+ **Adapter（适配器）**：物理 GPU 的抽象。
+ **Device（设备）**：逻辑句柄，用于创建资源、提交命令。
+ **Queue（队列）**：向 GPU 提交命令的通道。
+ **Buffer（缓冲区）**：GPU 上的线性内存（顶点、索引、uniform 数据）。
+ **Texture（纹理）**：GPU 上的图像数据。
+ **Pipeline（渲染管线）**：绑定着色器、顶点布局、混合状态的固定对象。
+ **Shader（着色器）**：用 **WGSL**（WebGPU Shading Language）编写。

## 最小渲染流程（三角形）

```js
const adapter = await navigator.gpu.requestAdapter()
const device = await adapter.requestDevice()

const canvas = document.querySelector('canvas')
const context = canvas.getContext('webgpu')
const format = navigator.gpu.getPreferredCanvasFormat()
context.configure({ device, format, alphaMode: 'premultiplied' })

// WGSL 顶点着色器
const shader = device.createShaderModule({
  code: `
    @vertex
    fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
      var pos = array<vec2f, 3>(
        vec2f(0.0, 0.5), vec2f(-0.5, -0.5), vec2f(0.5, -0.5)
      );
      return vec4f(pos[i], 0.0, 1.0);
    }
    @fragment
    fn fs() -> @location(0) vec4f {
      return vec4f(0.4, 0.8, 1.0, 1.0);
    }
  `
})

const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module: shader, entryPoint: 'vs' },
  fragment: { module: shader, entryPoint: 'fs', targets: [{ format }] },
  primitive: { topology: 'triangle-list' }
})

function frame() {
  const encoder = device.createCommandEncoder()
  const view = context.getCurrentTexture().createView()
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view,
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store'
    }]
  })
  pass.setPipeline(pipeline)
  pass.draw(3)                // 画 3 个顶点
  pass.end()
  device.queue.submit([encoder.finish()])
  requestAnimationFrame(frame)
}
frame()
```

## Compute 端到端（把数组每个元素 ×2）

> API 以 [MDN `createComputePipeline`](https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createComputePipeline) / [`dispatchWorkgroups`](https://developer.mozilla.org/en-US/docs/Web/API/GPUComputePassEncoder/dispatchWorkgroups) 为准。
> `dispatchWorkgroups` 传的是 **workgroup 个数**，不是元素个数：`@workgroup_size(64)` 时应用 `Math.ceil(n / 64)`。

```js
async function doubleOnGpu(input) {
  if (!navigator.gpu) throw new Error('WebGPU unavailable')
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) throw new Error('No GPU adapter')
  const device = await adapter.requestDevice()

  const module = device.createShaderModule({
    code: `
      @group(0) @binding(0) var<storage, read_write> data: array<f32>;
      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) id: vec3u) {
        if (id.x >= arrayLength(&data)) { return; }
        data[id.x] = data[id.x] * 2.0;
      }
    `,
  })

  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module, entryPoint: 'main' },
  })

  const workBuffer = device.createBuffer({
    size: input.byteLength,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  })
  device.queue.writeBuffer(workBuffer, 0, input)

  const resultBuffer = device.createBuffer({
    size: input.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  })

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: workBuffer } }],
  })

  const encoder = device.createCommandEncoder()
  const pass = encoder.beginComputePass()
  pass.setPipeline(pipeline)
  pass.setBindGroup(0, bindGroup)
  pass.dispatchWorkgroups(Math.ceil(input.length / 64))
  pass.end()
  encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, input.byteLength)
  device.queue.submit([encoder.finish()])

  await resultBuffer.mapAsync(GPUMapMode.READ)
  const out = new Float32Array(resultBuffer.getMappedRange().slice(0))
  resultBuffer.unmap()
  return out
}

// await doubleOnGpu(new Float32Array([1, 3, 5])) → [2, 6, 10]
```

要点：

+ **storage buffer** 给 shader 读写；结果要 `COPY` 到带 `MAP_READ` 的 buffer 才能回 CPU
+ `layout: 'auto'` 时，bind group layout 只能配给**这条** pipeline（见 MDN）
+ 浏览器端 AI（Transformers.js / ONNX Runtime Web）走的就是这条 Compute 路径；业务侧用法见 [Web AI](/notes/ai/web-ai)

## 与 WebGL 回退

```js
async function getGpuBackend() {
  if (navigator.gpu) {
    const adapter = await navigator.gpu.requestAdapter()
    if (adapter) {
      const device = await adapter.requestDevice()
      return { kind: 'webgpu', device }
    }
  }
  const canvas = document.createElement('canvas')
  const gl =
    canvas.getContext('webgl2') || canvas.getContext('webgl')
  if (!gl) return { kind: 'none' }
  return { kind: 'webgl', gl }
}
```

+ **3D 展示**：优先 [Three.js](/notes/frontier/threejs) 的 `WebGPURenderer`，失败再回 `WebGLRenderer`
+ **手写管线**：不要假设 WebGPU ≈ WebGL 换皮；命令编码、显式 Pipeline、无全局状态机
+ 能力排查：`chrome://gpu`；不支持就降级，别假装跑在 GPU 上

## 典型应用场景

+ 高性能 3D、大型场景（游戏、数字孪生）
+ 浏览器端 AI 推理（[Web AI](/notes/ai/web-ai) 的 WebGPU 后端）
+ 科学计算、物理仿真、粒子、图像/视频实时处理

## 生态

+ **Three.js**：`WebGPURenderer`
+ **Babylon.js**：原生 WebGPU
+ **wgpu**（Rust）：WASM + WebGPU

## 注意事项

+ 学习曲线陡于 WebGL；先画三角，再上 Compute
+ 老浏览器必须特性检测 + 回退
+ storage / uniform 大小受 `GPUDevice.limits` 约束，大数据要分块 dispatch

## 参考

+ [WebGPU 规范](https://www.w3.org/TR/webgpu/)
+ [MDN: WebGPU API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebGPU_API)
+ [MDN: createComputePipeline](https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createComputePipeline)
+ [WGSL 规范](https://www.w3.org/TR/WGSL/)
+ 本站：[Canvas & WebGL](/notes/foundations/canvas-webgl) · [Three.js](/notes/frontier/threejs) · [Web AI](/notes/ai/web-ai)
