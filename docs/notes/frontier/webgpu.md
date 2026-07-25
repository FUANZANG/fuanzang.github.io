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

## Compute Shader（通用计算）

WebGPU 一大亮点是**计算着色器**，可在 GPU 上并行处理大规模数据（如矩阵运算、粒子系统）：

```wgsl
@group(0) @binding(0) var<storage, read_write> data: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  data[id.x] = data[id.x] * 2.0;   // 每个线程处理一个元素
}
```

配合 `device.createComputePipeline` 与 `pass.dispatchWorkgroups(...)` 调度，可把 CPU 密集型任务卸载到 GPU——这正是浏览器端 **AI 推理（如 ONNX Runtime Web、Transformer.js）** 的底层支撑。

## 典型应用场景

+ 高性能 3D 渲染、大型场景（游戏、数字孪生）
+ 浏览器端 **AI 推理 / 机器学习**（TensorFlow.js、Transformer.js 已支持 WebGPU 后端）
+ 科学计算、物理仿真、粒子系统
+ 图像/视频实时处理（滤镜、超分）

## 生态

+ **Three.js**：已支持 WebGPU 渲染后端（`WebGPURenderer`）。
+ **Babylon.js**：原生支持 WebGPU。
+ **wgpu**（Rust）：可将 Rust 渲染逻辑编译到 WebAssembly + WebGPU。

## 注意事项

+ **不是 WebGL 的"升级补丁"**：API 模型完全不同（命令编码、显式 Pipeline），学习曲线更陡。
+ **需要特性检测**：老浏览器回退到 WebGL 或提示不支持。
+ **调试工具**：Chrome DevTools 的 `chrome://gpu` 与 WebGPU 调试面板。

## 参考

+ [WebGPU 规范](https://www.w3.org/TR/webgpu/)
+ [MDN: WebGPU API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebGPU_API)
+ [WGSL 规范](https://www.w3.org/TR/WGSL/)
