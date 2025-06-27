# WebAssembly Note

> [WebAssembly.org](https://webassembly.org/)
> [MDN - WebAssembly](https://developer.mozilla.org/zh-CN/docs/WebAssembly)

## 1. 基础概念

### 什么是 WebAssembly？

WebAssembly（简称 WASM）是一种为 Web 设计的**二进制指令格式**，是一个可移植、体积小、加载快并且兼容 Web 的全新格式。

**核心定位：**
- **不是** JavaScript 的替代品，而是**互补**关系
- 适合计算密集型任务（图像处理、游戏引擎、视频编解码、科学计算等）
- 不适合 DOM 操作、布局计算等 I/O 密集型任务

**关键特性：**
- **二进制格式**：比文本格式的 JS 更小、解析更快
- **沙箱执行**：独立的内存空间，无法直接访问 DOM
- **跨语言编译**：C/C++、Rust、Go、Python 等都可以编译成 WASM
- **确定性执行**：行为在所有平台上一致
- **渐进增强**：浏览器不支持时可回退到 JS

### WASM vs JavaScript 对比

| 特性 | JavaScript | WebAssembly |
|------|-----------|-------------|
| **格式** | 文本 | 二进制 |
| **执行速度** | JIT 编译，动态优化 | 接近原生速度（静态编译） |
| **内存管理** | 垃圾回收，自动管理 | 手动管理（线性内存） |
| **DOM 访问** | 直接访问 | 需要通过 JS 桥接 |
| **开发体验** | 灵活，热重载快 | 编译周期长，调试复杂 |
| **适用场景** | 业务逻辑、UI 交互、I/O | 计算密集、高性能需求 |
| **文件大小** | 较大（可读性好） | 较小（压缩后） |

### 执行模型

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌──────────┐    ┌──────────┐    ┌───────────┐  │
│  │ JavaScript│    │  WASM    │    │  Native   │  │
│  │   (JIT)   │    │ (AOT/JS) │    │  (SIMD)   │  │
│  └────┬─────┘    └────┬─────┘    └─────┬─────┘  │
│       └───────────────┼────────────────┘         │
│                       ▼                          │
│              ┌──────────────┐                     │
│              │ Linear Memory│                     │
│              │  (Shared)    │                     │
│              └──────────────┘                     │
└─────────────────────────────────────────────────┘
```

**内存模型：**
- WASM 使用**线性内存**（Linear Memory），是一块连续的字节数组
- JS 和 WASM **共享同一块内存**，可以通过指针互相访问
- 内存以「页」（Page）为单位，每页 64KB，最大 65536 页（4GB）

---

## 2. 开发流程

### 编译工具链

**主流编译方式：**

| 语言 | 工具 | 说明 |
|------|------|------|
| C/C++ | **Emscripten** | 最成熟，支持 SDL、OpenGL 等 |
| Rust | **wasm-pack** / **wasm-bindgen** | 内存安全，生态增长快 |
| Go | **tinygo** / **gccgo** | Go 1.21+ 官方支持 |
| AssemblyScript | **asc** | 类 TypeScript 语法，专为 WASM 设计 |
| Zig | **zig cc** | 新兴语言，编译速度快 |

### 示例 1：Rust 编译 WASM

**Cargo.toml：**
```toml
[package]
name = "my-wasm-lib"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"

[dependencies.web-sys]
version = "0.3"
features = ["console"]
```

**src/lib.rs：**
```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

#[wasm_bindgen]
pub fn sum_array(arr: &[u32]) -> u32 {
    arr.iter().sum()
}

// 导出到 JS 的日志函数
#[wasm_bindgen]
pub fn log_to_js(msg: &str) {
    web_sys::console::log_1(&msg.into());
}
```

**编译：**
```bash
# 安装 wasm-pack
cargo install wasm-pack

# 编译为浏览器可用格式
wasm-pack build --target web

# 或编译为 Node.js 可用格式
wasm-pack build --target nodejs
```

### 示例 2：C 编译 WASM（Emscripten）

**hello.c：**
```c
#include <emscripten.h>

// EMSCRIPTEN_KEEPALIVE 导出给 JS 调用
EMSCRIPTEN_KEEPALIVE
int add(int a, int b) {
    return a + b;
}

EMSCRIPTEN_KEEPALIVE
void print_hello(const char* name) {
    printf("Hello, %s!\n", name);
}
```

**编译：**
```bash
emcc hello.c -o hello.js \
  -s EXPORTED_FUNCTIONS='["_add","_print_hello"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
  -s ALLOW_MEMORY_GROWTH=1
```

---

## 3. JS 与 WASM 交互

### 导入导出机制

```
┌─────────────────┐         ┌─────────────────┐
│   JavaScript     │         │   WebAssembly   │
│                 │         │                 │
│  import { add }  │◄──────►│  export function│
│  from wasm      │  call   │  add(a, b)      │
│                 │         │                 │
│  wasm.memory    │◄──────►│  linear memory  │
│  (shared)       │  read/  │  (shared)       │
│                 │  write  │                 │
└─────────────────┘         └─────────────────┘
```

### 调用 WASM 函数

**Rust + wasm-bindgen 方式：**
```html
<script type="module">
  // wasm-pack 生成的绑定
  import init, { fibonacci, sum_array, log_to_js } from './pkg/my_wasm_lib.js';

  async function main() {
    // 1. 初始化 WASM（加载 .wasm 文件）
    await init();

    // 2. 调用导出的函数
    console.log(fibonacci(10)); // 55
    console.log(sum_array([1, 2, 3, 4, 5])); // 15

    // 3. 调用日志函数
    log_to_js('Hello from WASM!');
  }

  main();
</script>
```

**Emscripten 方式：**
```javascript
Module = {
  onRuntimeInitialized: function() {
    // ccall: 异步调用（运行时初始化后）
    const result = Module.ccall('add',      // 函数名
                                'number',   // 返回值类型
                                ['number', 'number'], // 参数类型
                                [10, 20]);  // 参数值
    console.log(result); // 30

    // cwrap: 创建持久化的 JS 函数包装
    const addFunc = Module.cwrap('add', 'number', ['number', 'number']);
    console.log(addFunc(5, 3)); // 8
  }
};
```

### 内存读写

**读写 WASM 内存中的字符串：**
```javascript
import init, { malloc, free, writeString, getString } from './pkg/my_wasm_lib.js';

await init();

// 写入字符串到 WASM 内存
const str = 'Hello, WebAssembly!';
const ptr = writeString(str);

// 从 WASM 内存读取字符串
const result = getString(ptr);
console.log(result); // 'Hello, WebAssembly!'

// 释放内存（Rust 通常有 GC，C/C++ 需要手动释放）
free(ptr);
```

**直接操作线性内存：**
```javascript
// 假设 WASM 导出了 memory 和一段 C 字符串函数
const wasmMemory = new Uint8Array(wasmInstance.exports.memory.buffer);

// 在 WASM 中分配内存
const ptr = wasmInstance.exports.malloc(100);

// 写入数据（通过 JS 侧填充内存）
const text = new TextEncoder().encode('Hello');
wasmMemory.set(text, ptr);

// 读取数据
const bytes = wasmMemory.slice(ptr, ptr + text.length);
const decoded = new TextDecoder().decode(bytes);
console.log(decoded); // 'Hello'

// 释放
wasmInstance.exports.free(ptr);
```

**使用 SharedArrayBuffer（高性能场景）：**
```javascript
// WASM 内存本质上是 SharedArrayBuffer
const wasmMemory = new SharedArrayBuffer(wasmInstance.exports.memory.buffer.byteLength);

// 创建视图用于高效读写
const uint8View = new Uint8Array(wasmMemory);
const uint32View = new Uint32Array(wasmMemory);

// 批量写入
uint32View.set([1, 2, 3, 4, 5], 0);

// 批量读取
const data = uint32View.subarray(0, 5);
console.log(Array.from(data)); // [1, 2, 3, 4, 5]
```

---

## 4. 性能优化场景

### 适合使用 WASM 的场景

| 场景 | 说明 | 性能提升 |
|------|------|---------|
| **图像处理** | 滤镜、压缩、格式转换 | 10-100x |
| **视频编解码** | H.264/VP9 解码 | 5-20x |
| **游戏引擎** | Unity、Unreal 移植到 Web | 接近原生 |
| **科学计算** | 物理模拟、数值计算 | 2-10x |
| **加密/解密** | AES、RSA 运算 | 3-10x |
| **PDF 渲染** | 复杂文档解析 | 5-15x |
| **数据库查询** | SQLite 在浏览器运行 | 显著改善 |
| **语音识别** | 音频特征提取 | 2-5x |

### 不适合使用 WASM 的场景

- **简单业务逻辑**：JS 的 JIT 优化已经很好
- **DOM 操作**：WASM 无法直接操作 DOM，需要 JS 桥接，反而更慢
- **布局计算**：CSS 布局引擎已高度优化
- **小数据量处理**：编译和初始化的开销超过收益

### 性能基准对比

```javascript
// 斐波那契数列计算（递归，CPU 密集型）
async function benchmark() {
  const ITERATIONS = 100000;

  // JS 版本
  function fibJS(n) {
    if (n <= 1) return n;
    return fibJS(n - 1) + fibJS(n - 2);
  }

  // WASM 版本（假设已导入）
  // const fibWasm = wasmInstance.exports.fibonacci;

  // JS 计时
  const startJS = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    fibJS(35);
  }
  const timeJS = performance.now() - startJS;

  // WASM 计时
  // const startWasm = performance.now();
  // for (let i = 0; i < ITERATIONS; i++) {
  //   fibWasm(35);
  // }
  // const timeWasm = performance.now() - startWasm;

  console.log(`JS: ${timeJS.toFixed(2)}ms`);
  // console.log(`WASM: ${timeWasm.toFixed(2)}ms`);
  // console.log(`加速比: ${(timeJS / timeWasm).toFixed(2)}x`);
}
```

---

## 5. 实际案例

### 案例 1：FFmpeg.wasm（视频处理）

```html
<!DOCTYPE html>
<html>
<head>
  <title>FFmpeg.wasm Demo</title>
  <script src="https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js"></script>
  <script src="https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/util.js"></script>
</head>
<body>
  <input type="file" id="videoInput" accept="video/*">
  <button onclick="convertToGif()">转 GIF</button>
  <img id="result">

  <script>
    const { FFmpeg } = FFmpegWASM;
    const { fetchFile } = FFmpegUtil;
    let ffmpeg = null;

    async function loadFFmpeg() {
      if (ffmpeg) return;
      ffmpeg = new FFmpeg();
      
      ffmpeg.on('progress', ({ progress, time }) => {
        console.log(`进度: ${progress * 100}%`);
      });

      await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm'
      });
    }

    async function convertToGif() {
      const fileInput = document.getElementById('videoInput');
      if (!fileInput.files.length) {
        alert('请选择视频文件');
        return;
      }

      await loadFFmpeg();

      const fileName = fileInput.files[0].name;
      const inputBytes = await fetchFile(fileInput.files[0]);

      // 写入文件到 WASM 虚拟文件系统
      await ffmpeg.writeFile('input.mp4', inputBytes);

      // 执行 FFmpeg 命令
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', 'fps=10,scale=320:-1:flags=lanczos',
        '-c:v', 'gif',
        'output.gif'
      ]);

      // 读取结果
      const outputBytes = await ffmpeg.readFile('output.gif');
      
      // 显示结果
      const url = URL.createObjectURL(
        new Blob([outputBytes.buffer], { type: 'image/gif' })
      );
      document.getElementById('result').src = url;

      // 清理虚拟文件系统
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.gif');
    }
  </script>
</body>
</html>
```

### 案例 2：SQLite 在浏览器中运行

```javascript
import init, { db_open, db_close, db_exec, db_query, db_free_result } 
  from './sql.js';

async function runSQLite() {
  // 初始化 WASM
  await init();

  // 打开内存数据库
  db_open();

  // 创建表
  db_exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)');

  // 插入数据
  db_exec("INSERT INTO users VALUES (1, 'Alice', 25)");
  db_exec("INSERT INTO users VALUES (2, 'Bob', 30)");

  // 查询
  const result = db_query('SELECT * FROM users WHERE age > 25');
  
  // 解析结果
  for (let i = 0; i < result.length; i++) {
    console.log(`ID: ${result[i].values[0]}, Name: ${result[i].values[1]}`);
  }
  // 输出: ID: 2, Name: Bob

  // 关闭数据库
  db_close();
}
```

### 案例 3：图像处理（高斯模糊）

```rust
// Rust 实现的高斯模糊
use wasm_bindgen::prelude::*;
use image::{DynamicImage, ImageFormat};

#[wasm_bindgen]
pub fn gaussian_blur(image_data: &[u8], width: u32, height: u32, radius: f32) -> Vec<u8> {
    // 从字节数组创建图像
    let img = DynamicImage::from_raw(
        image::RgbaImage::from_raw(width, height, image_data.to_vec()).unwrap()
    );

    // 应用高斯模糊
    let blurred = img.blur(f64::from(radius));

    // 返回像素数据
    blurred.into_rgba8().to_vec()
}

#[wasm_bindgen]
pub fn compress_jpeg(image_data: &[u8], width: u32, height: u32, quality: u8) -> Vec<u8> {
    let img = image::load_from_memory_with_format(
        image_data, ImageFormat::Png
    ).unwrap();

    let mut buffer = Vec::new();
    img.save_mut_with_format(
        &mut buffer, ImageFormat::Jpeg
    ).unwrap();

    buffer
}
```

```javascript
// JS 侧调用
import init, { gaussian_blur, compress_jpeg } from './pkg/image_processor.js';

await init();

// 读取图片
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

// 调用 WASM 模糊
const blurred = gaussian_blur(
  new Uint8ClampedArray(imageData.data).buffer,
  canvas.width,
  canvas.height,
  5.0  // 模糊半径
);

// 写回 Canvas
const outputData = new ImageData(
  new Uint8ClampedArray(blurred),
  canvas.width,
  canvas.height
);
ctx.putImageData(outputData, 0, 0);
```

---

## 6. 调试与工具

### 调试方法

**WASM 源码映射（Source Maps）：**
```bash
# Rust 编译时保留调试信息
wasm-pack build --dev

# Emscripten 保留符号表
emcc hello.c -o hello.js -g4
```

**浏览器开发者工具：**
- Chrome DevTools → Sources 面板支持 WASM 调试
- 可以看到 WASM 模块、内存布局、调用栈
- 支持断点调试（需要开启 Source Maps）

**wasm-tools：**
```bash
# 安装 wasm-tools
cargo install wasm-tools

# 反汇编 WASM 文件
wasm-tools parse module.wasm -S | head -50

# 验证 WASM 模块
wasm-tools validate module.wasm

# 文本格式互转
wasm-tools print module.wasm > module.wat  # 二进制 → 文本
wat2wasm module.wat > module.wasm          # 文本 → 二进制
```

### 性能分析

**Chrome Performance 面板：**
1. 打开 DevTools → Performance
2. 录制页面运行
3. 查看 WASM 函数调用耗时
4. 分析 CPU 火焰图

**WASM 内存监控：**
```javascript
// 监控 WASM 内存使用情况
function getWasmMemoryUsage(instance) {
  const memory = instance.exports.memory;
  const bytes = memory.buffer.byteLength;
  const pages = bytes / 65536;
  console.log(`WASM 内存: ${bytes / 1024} KB (${pages} pages)`);
  return pages;
}
```

---

## 7. 最佳实践

### 1. 合理划分职责

```
┌──────────────────────────────────────┐
│           JavaScript                  │
│  - DOM 操作                           │
│  - 事件处理                           │
│  - 业务逻辑                           │
│  - 网络请求                           │
│  - 路由管理                           │
├──────────────────────────────────────┤
│           WebAssembly                 │
│  - 数学计算                           │
│  - 图像处理                           │
│  - 视频/音频处理                      │
│  - 加密算法                           │
│  - 物理模拟                           │
└──────────────────────────────────────┘
```

### 2. 减少 JS-WASM 边界调用

每次跨边界调用都有开销，应批量传输数据而非逐次调用：

```javascript
// ❌ 差：逐次调用（N 次边界跨越）
for (let i = 0; i < data.length; i++) {
  wasmProcessSingleItem(data[i]);
}

// ✅ 好：批量调用（1 次边界跨越）
wasmProcessBatch(data.buffer, data.length);
```

### 3. 内存管理

```rust
// Rust 自动 GC，注意不要泄露
#[wasm_bindgen]
pub fn create_large_buffer(size: usize) -> Vec<u8> {
    vec![0u8; size]  // 返回时由 Rust GC 管理
}
```

```c
// C/C++ 需要手动管理
int* create_array(int size) {
    int* arr = (int*)malloc(size * sizeof(int));
    return arr;  // JS 侧需要调用 free()
}
```

### 4. 加载优化

```javascript
// 预加载 WASM 模块
const wasmResponse = fetch('app.wasm');
const wasmModule = await WebAssembly.compileStreaming(wasmResponse);

// 需要时实例化
const instance = await WebAssembly.instantiate(wasmModule, imports);
```

### 5. 渐进降级

```javascript
let wasmModule = null;

try {
  // 尝试加载 WASM
  const response = await fetch('app.wasm');
  const bytes = await response.arrayBuffer();
  wasmModule = await WebAssembly.instantiate(bytes);
  console.log('使用 WASM 执行');
} catch (e) {
  console.warn('WASM 不可用，回退到 JS');
  wasmModule = null;
}

// 统一接口
function processData(input) {
  if (wasmModule) {
    return wasmModule.exports.process(input);
  } else {
    return jsFallback(input);
  }
}
```

---

## 8. 常见问题

### Q1: WASM 能替代 JavaScript 吗？

**不能。** WASM 设计目标是与 JS 互补，不是替代。WASM 无法直接操作 DOM，也没有事件循环。最佳实践是混合使用两者。

### Q2: WASM 文件太大怎么办？

- 使用 `wasm-opt` 优化（Binaryen 工具）
- 启用 gzip/brotli 压缩（服务器端）
- 按需加载（Code Splitting）
- 使用多线程 WASM（SharedArrayBuffer）

```bash
# 使用 Binaryen 优化
wasm-opt input.wasm -O3 -o output.wasm
```

### Q3: WASM 有内存泄漏吗？

- **Rust**：有 GC，一般不会泄漏（注意循环引用）
- **C/C++**：需要手动 `malloc/free`，容易泄漏
- **JS 侧**：WASM 内存通过 SharedArrayBuffer 暴露，GC 行为与 JS 内存不同

### Q4: 支持哪些浏览器？

所有现代浏览器都支持 WASM：
- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 15+
- 移动端浏览器基本全覆盖

### Q5: WASM 能访问文件系统吗？

不能直接访问本地文件系统，但可以通过：
- **File System API**（Chrome 87+）：有限访问
- **IndexedDB**：持久化存储
- **Emscripten 虚拟文件系统**：在内存中模拟

---

## 9. 生态工具

| 工具 | 用途 | 链接 |
|------|------|------|
| **wasm-pack** | Rust → WASM 构建工具 | https://rustwasm.github.io/wasm-pack/ |
| **Emscripten** | C/C++ → WASM 编译器 | https://emscripten.org/ |
| **AssemblyScript** | TypeScript-like → WASM | https://www.assemblyscript.org/ |
| **Wasmtime** | WASM 运行时（非浏览器） | https://wasmtime.dev/ |
| **Wasmer** | 跨平台 WASM 运行时 | https://wasmer.io/ |
| **Binaryen** | WASM 优化工具链 | https://github.com/WebAssembly/binaryen |
| **WASI** | WASM 系统接口（服务器端） | https://wasi.dev/ |

---

## 10. 未来展望

- **WASI（WebAssembly System Interface）**：让 WASM 脱离浏览器运行在服务器上
- **多线程 WASM**：SharedArrayBuffer + Atomics，真正的并行计算
- **GC 提案**：WASM 内置垃圾回收，简化内存管理
- **异常处理**：结构化异常处理，更好的错误传播
- **SIMD 扩展**：单指令多数据流，进一步提升计算性能
- **WebGPU 集成**：WASM 驱动图形渲染管线

> 📌 **总结**：WebAssembly 是 Web 性能的有力补充，适合计算密集型场景。与 JavaScript 配合使用，可以充分发挥各自优势。