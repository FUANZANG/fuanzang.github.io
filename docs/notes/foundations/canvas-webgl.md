# Canvas & WebGL

> 📌 本文件记录浏览器图形 API：Canvas 2D 绘图基础与 WebGL 入门。
>
> 📅 参考：MDN Web Docs — Canvas API | WebGL API

---

## 1. Canvas 基础

### 创建画布

```html
<canvas id="canvas" width="600" height="400"></canvas>
```

```js
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

// 注意：canvas 的 width/height 属性是画布分辨率（像素）
// CSS 的 width/height 是显示尺寸，两者不同会导致模糊
// 高清屏（devicePixelRatio > 1）适配：
function setupHDCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  return ctx
}
```

---

## 2. Canvas 2D 绘图

### 坐标系与变换

```js
// 原点在左上角，x 向右，y 向下
// 保存/恢复状态（变换、样式等）
ctx.save()
ctx.translate(100, 100)   // 平移原点
ctx.rotate(Math.PI / 4)   // 旋转（弧度）
ctx.scale(2, 2)           // 缩放
ctx.restore()             // 恢复到 save() 时的状态
```

### 矩形

```js
ctx.fillStyle = '#4caf50'
ctx.fillRect(10, 10, 150, 80)      // 填充矩形 (x, y, width, height)

ctx.strokeStyle = '#f44336'
ctx.lineWidth = 2
ctx.strokeRect(10, 10, 150, 80)    // 描边矩形

ctx.clearRect(20, 20, 50, 40)      // 清除区域（变透明）
```

### 路径

```js
ctx.beginPath()          // 开始新路径（必须调用，否则路径会累积）
ctx.moveTo(50, 50)       // 移动起点
ctx.lineTo(200, 50)      // 直线到
ctx.lineTo(125, 150)     // 继续
ctx.closePath()          // 闭合路径（连回起点）
ctx.fill()               // 填充
ctx.stroke()             // 描边
```

### 圆弧

```js
// arc(x, y, radius, startAngle, endAngle, anticlockwise)
// 角度用弧度，0 = 3 点钟方向，顺时针增加
ctx.beginPath()
ctx.arc(100, 100, 50, 0, Math.PI * 2)   // 整圆
ctx.fillStyle = 'blue'
ctx.fill()

// 半圆
ctx.beginPath()
ctx.arc(200, 100, 50, 0, Math.PI)        // 下半圆
ctx.stroke()
```

### 贝塞尔曲线

```js
// 二次贝塞尔：quadraticCurveTo(cpx, cpy, x, y)
ctx.beginPath()
ctx.moveTo(50, 150)
ctx.quadraticCurveTo(150, 50, 250, 150)
ctx.stroke()

// 三次贝塞尔：bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
ctx.beginPath()
ctx.moveTo(50, 200)
ctx.bezierCurveTo(100, 100, 200, 300, 300, 200)
ctx.stroke()
```

### 文字

```js
ctx.font = 'bold 24px Arial'
ctx.fillStyle = '#333'
ctx.textAlign = 'center'      // 'left' | 'center' | 'right'
ctx.textBaseline = 'middle'   // 'top' | 'middle' | 'bottom' | 'alphabetic'

ctx.fillText('Hello Canvas', 200, 100)   // 填充文字
ctx.strokeText('Hello Canvas', 200, 150) // 描边文字

// 测量文字宽度
const metrics = ctx.measureText('Hello')
console.log(metrics.width)
```

### 图片

```js
const img = new Image()
img.onload = () => {
  // drawImage(image, dx, dy)
  ctx.drawImage(img, 0, 0)

  // drawImage(image, dx, dy, dWidth, dHeight) — 缩放
  ctx.drawImage(img, 0, 0, 200, 150)

  // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) — 裁剪+缩放
  ctx.drawImage(img, 10, 10, 100, 100, 0, 0, 200, 200)
}
img.src = '/photo.jpg'
```

### 渐变与图案

```js
// 线性渐变
const gradient = ctx.createLinearGradient(0, 0, 200, 0)
gradient.addColorStop(0, '#f44336')
gradient.addColorStop(0.5, '#ff9800')
gradient.addColorStop(1, '#4caf50')
ctx.fillStyle = gradient
ctx.fillRect(0, 0, 200, 50)

// 径向渐变
const radial = ctx.createRadialGradient(100, 100, 20, 100, 100, 80)
radial.addColorStop(0, 'white')
radial.addColorStop(1, 'black')
ctx.fillStyle = radial
ctx.fillRect(20, 20, 160, 160)

// 图案填充
const pattern = ctx.createPattern(img, 'repeat')  // 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'
ctx.fillStyle = pattern
ctx.fillRect(0, 0, 300, 300)
```

### 像素操作

```js
// 读取像素数据
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
const data = imageData.data  // Uint8ClampedArray，每4个元素为一个像素 [R, G, B, A]

// 灰度化示例
for (let i = 0; i < data.length; i += 4) {
  const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
  data[i] = avg      // R
  data[i + 1] = avg  // G
  data[i + 2] = avg  // B
  // data[i + 3] — A（透明度不变）
}

// 写回
ctx.putImageData(imageData, 0, 0)
```

### 裁剪（clip）

```js
// 后续绘制只在 clip 区域内有效
ctx.beginPath()
ctx.arc(100, 100, 80, 0, Math.PI * 2)
ctx.clip()

ctx.drawImage(img, 0, 0)  // 只显示圆形区域内的图片
```

### 合成模式（globalCompositeOperation）

```js
// 控制新绘制内容与已有内容的混合方式
ctx.globalCompositeOperation = 'source-over'    // 默认，新内容覆盖旧内容
ctx.globalCompositeOperation = 'destination-out' // 新内容区域变透明（橡皮擦效果）
ctx.globalCompositeOperation = 'multiply'        // 颜色相乘（加深）
// 共 26 种混合模式，参考 MDN
```

---

## 3. 动画

```js
// 基础动画循环
let x = 0

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)  // 清除上一帧

  // 绘制新帧
  ctx.fillStyle = 'red'
  ctx.fillRect(x, 100, 50, 50)

  x += 2
  if (x > canvas.width) x = -50

  requestAnimationFrame(animate)  // 与屏幕刷新率同步（通常 60fps）
}

requestAnimationFrame(animate)

// 停止动画
let rafId
function start() { rafId = requestAnimationFrame(animate) }
function stop() { cancelAnimationFrame(rafId) }
```

### OffscreenCanvas（离屏渲染）

```js
// 在 Web Worker 中渲染，不阻塞主线程
// main.js
const canvas = document.getElementById('canvas')
const offscreen = canvas.transferControlToOffscreen()
const worker = new Worker('render.worker.js')
worker.postMessage({ canvas: offscreen }, [offscreen])

// render.worker.js
self.onmessage = ({ data }) => {
  const ctx = data.canvas.getContext('2d')
  // 在 worker 中绘制...
}
```

---

## 4. WebGL 基础

WebGL 基于 OpenGL ES 2.0，让浏览器直接访问 GPU，适合高性能 3D 渲染。

### 获取 WebGL 上下文

```js
const canvas = document.getElementById('canvas')
const gl = canvas.getContext('webgl')
// 或 WebGL 2.0（更多特性，现代浏览器全面支持）
// const gl = canvas.getContext('webgl2')

if (!gl) {
  console.error('浏览器不支持 WebGL')
}
```

### 核心概念

WebGL 的渲染管线（简化）：

```
JavaScript（CPU）
  ↓ 顶点数据（VBO）
顶点着色器（Vertex Shader） — GLSL，处理每个顶点的位置
  ↓ 光栅化
片元着色器（Fragment Shader）— GLSL，处理每个像素的颜色
  ↓
帧缓冲区（Framebuffer）→ 显示到 Canvas
```

### 着色器（GLSL）

```glsl
// 顶点着色器
attribute vec4 a_position;   // 从 JS 传入的顶点位置

void main() {
  gl_Position = a_position;  // 输出裁剪空间坐标（-1 到 1）
}
```

```glsl
// 片元着色器
precision mediump float;

void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);  // RGBA，画红色
}
```

### 最简 WebGL 程序

```js
const canvas = document.getElementById('canvas')
const gl = canvas.getContext('webgl')

// 1. 创建着色器
function createShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

const vertexShaderSource = `
  attribute vec4 a_position;
  void main() { gl_Position = a_position; }
`
const fragmentShaderSource = `
  precision mediump float;
  void main() { gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0); }
`

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)

// 2. 链接 Program
const program = gl.createProgram()
gl.attachShader(program, vertexShader)
gl.attachShader(program, fragmentShader)
gl.linkProgram(program)
gl.useProgram(program)

// 3. 传入顶点数据
const positions = new Float32Array([
  0,  0.5,   // 顶部顶点
 -0.5, -0.5, // 左下顶点
  0.5, -0.5, // 右下顶点
])

const positionBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

const positionLocation = gl.getAttribLocation(program, 'a_position')
gl.enableVertexAttribArray(positionLocation)
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

// 4. 清屏并绘制
gl.clearColor(0.0, 0.0, 0.0, 1.0)
gl.clear(gl.COLOR_BUFFER_BIT)
gl.drawArrays(gl.TRIANGLES, 0, 3)  // 画一个三角形
```

### WebGL vs Canvas 2D

| | Canvas 2D | WebGL |
|--|-----------|-------|
| 学习曲线 | 低 | 高（需了解 GPU 管线、GLSL） |
| 性能 | 适合 2D 图形 | 高性能，GPU 加速 |
| 适用场景 | 图表、简单动画、图片处理 | 3D 场景、粒子系统、WebXR |
| 实际使用 | 直接使用 | 通常用 Three.js / Babylon.js 等封装 |

### Three.js 快速上手

实际 3D 项目基本都使用 Three.js，它封装了 WebGL 的底层细节：

```bash
npm install three
```

```js
import * as THREE from 'three'

// 场景
const scene = new THREE.Scene()

// 相机（透视相机：fov, 宽高比, 近截面, 远截面）
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 5

// 渲染器
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// 几何体 + 材质 + 网格
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

// 动画循环
function animate() {
  requestAnimationFrame(animate)
  cube.rotation.x += 0.01
  cube.rotation.y += 0.01
  renderer.render(scene, camera)
}
animate()
```

---

## 5. 实用场景

| 场景 | 推荐方案 |
|------|---------|
| 图表绘制 | ECharts / D3.js（基于 Canvas/SVG） |
| 截图 / 图片合成 | Canvas 2D |
| 像素级图像处理（滤镜） | Canvas 2D `getImageData` |
| 签名板 | Canvas 2D |
| 3D 模型展示 | Three.js / Babylon.js |
| 高性能粒子系统 | WebGL / Three.js |
| WebXR（AR/VR） | WebGL + WebXR API |
