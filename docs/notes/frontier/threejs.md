# Three.js

> 📌 本文件记录 Three.js 场景搭建、材质灯光、模型加载、与框架集成及性能要点。
>
> ⚠️ **边界说明**：Canvas 2D / 原生 WebGL 见 [Canvas & WebGL](/notes/foundations/canvas-webgl)；GPU 计算与下一代 API 见 [WebGPU](/notes/frontier/webgpu)。本文聚焦 **Three.js 应用层**。
>
> 📅 基于 Three.js r170+（ES Module）

---

## 1. 定位与安装

Three.js 是对 WebGL（及实验性 WebGPU 渲染器）的高层封装：场景图、相机、材质、加载器、控件一应俱全。业务 3D 展示优先用库，而不是手写着色器管道。

```bash
npm i three
# 类型（若未自带）
npm i -D @types/three
```

```js
import * as THREE from 'three'
// 示例里的控件 / 加载器在 addons 路径
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
```

---

## 2. 最小可运行场景

```js
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111827)

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)
camera.position.set(2, 2, 4)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const light = new THREE.DirectionalLight(0xffffff, 1.2)
light.position.set(3, 5, 2)
light.castShadow = true
scene.add(light)
scene.add(new THREE.AmbientLight(0xffffff, 0.35))

const mesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.2, roughness: 0.4 })
)
mesh.castShadow = true
scene.add(mesh)

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x1f2937 })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -0.5
ground.receiveShadow = true
scene.add(ground)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
window.addEventListener('resize', onResize)

function tick() {
  requestAnimationFrame(tick)
  mesh.rotation.y += 0.01
  controls.update()
  renderer.render(scene, camera)
}
tick()
```

核心对象：

| 对象 | 职责 |
|------|------|
| `Scene` | 场景图根节点 |
| `Camera` | 观察视角（透视 / 正交） |
| `WebGLRenderer` | 画到 canvas |
| `Mesh` = Geometry + Material | 可见物体 |
| `Light` | 光照（Standard/Physical 材质必需） |

---

## 3. 几何、材质、灯光

### 几何体

```js
new THREE.BoxGeometry(1, 1, 1)
new THREE.SphereGeometry(0.5, 32, 16)
new THREE.PlaneGeometry(2, 2)
new THREE.BufferGeometry() // 自定义顶点
```

自定义缓冲几何时记得设置 `position`（及需要的 `normal`/`uv`），并在变更后 `attributes.xxx.needsUpdate = true`。

### 材质选型

| 材质 | 场景 |
|------|------|
| `MeshBasicMaterial` | 不受光，调试/UI 精灵 |
| `MeshStandardMaterial` | PBR 常用，金属度/粗糙度 |
| `MeshPhysicalMaterial` | 更真实：清漆、透射、IOR |
| `MeshNormalMaterial` | 看法线，调试用 |

```js
const mat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: texture,          // 漫反射贴图
  normalMap: normalTex,
  metalness: 0.1,
  roughness: 0.6,
})
```

### 纹理

```js
const loader = new THREE.TextureLoader()
const map = loader.load('/textures/wood.jpg')
map.colorSpace = THREE.SRGBColorSpace // 颜色贴图用 sRGB
map.wrapS = map.wrapT = THREE.RepeatWrapping
map.anisotropy = renderer.capabilities.getMaxAnisotropy()
```

### 灯光

```js
scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const dir = new THREE.DirectionalLight(0xffffff, 1)
dir.position.set(5, 10, 2)
scene.add(dir)

// 辅助：看清灯光方向
scene.add(new THREE.DirectionalLightHelper(dir, 1))
```

+ 只有 Basic 材质可「无灯也能看见」
+ 阴影需：`renderer.shadowMap.enabled`、灯 `castShadow`、物体 `castShadow`/`receiveShadow`

---

## 4. 相机与控件

```js
// 透视：fov 越大视角越广、透视越强
const persp = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000)

// 正交：2D/CAD/等轴测常用
const ortho = new THREE.OrthographicCamera(-w, w, h, -h, 0.1, 1000)
```

`OrbitControls`：绕目标旋转/缩放/平移；开 `enableDamping` 后必须在动画循环里 `update()`。

射线拾取（点击选中）：

```js
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

function onPointerDown(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(scene.children, true)
  if (hits[0]) console.log('hit', hits[0].object.name)
}
```

---

## 5. 模型加载（glTF）

业界默认交换格式是 **glTF / GLB**。

```js
const loader = new GLTFLoader()
loader.load(
  '/models/robot.glb',
  (gltf) => {
    const root = gltf.scene
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })
    scene.add(root)

    // 骨骼动画
    if (gltf.animations?.length) {
      const mixer = new THREE.AnimationMixer(root)
      mixer.clipAction(gltf.animations[0]).play()
      // 在 tick 里：mixer.update(delta)
    }
  },
  (xhr) => console.log((xhr.loaded / xhr.total) * 100 + '%'),
  (err) => console.error(err)
)
```

+ 大模型先压缩（gltfpack / Draco）；加载用 LoadingManager 统一进度
+ 路径别忘了部署后的 public 基路径

---

## 6. 动画循环与时钟

```js
const clock = new THREE.Clock()

function tick() {
  const delta = clock.getDelta()
  const elapsed = clock.elapsedTime
  mixer?.update(delta)
  mesh.position.y = Math.sin(elapsed) * 0.2
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}
```

页面不可见时可停掉循环（`document.visibilityState`），省电。

---

## 7. 与 Vue / React 集成

### 原则

+ **一个组件挂一个 canvas**，在 `onMounted` / `useEffect` 初始化
+ 在卸载钩子里：`cancelAnimationFrame`、`renderer.dispose()`、几何/材质 `dispose()`、移除监听
+ 不要把 `scene` 放进响应式代理（Vue `reactive` / 乱解构），否则巨卡；用 `shallowRef` 或普通变量

### Vue 3 示意

```vue
<script setup>
import { onMounted, onBeforeUnmount, shallowRef } from 'vue'
import * as THREE from 'three'

const host = shallowRef(null)
let renderer, raf = 0

onMounted(() => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
  camera.position.z = 3
  renderer = new THREE.WebGLRenderer({ antialias: true })
  host.value.appendChild(renderer.domElement)

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshNormalMaterial()
  )
  scene.add(cube)

  const ro = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect
    renderer.setSize(width, height, false)
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
  })
  ro.observe(host.value)

  const loop = () => {
    raf = requestAnimationFrame(loop)
    cube.rotation.y += 0.01
    renderer.render(scene, camera)
  }
  loop()

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    renderer.dispose()
    host.value?.replaceChildren()
  })
})
</script>

<template>
  <div ref="host" style="width: 100%; height: 360px;" />
</template>
```

React 同理：`useRef` + `useEffect` 清理函数。

---

## 8. 性能清单

| 项 | 建议 |
|----|------|
| 面数 | 移动端模型控制在合理面数；能合并就 `mergeGeometries` |
| Draw call | 同材质尽量合并；用 `InstancedMesh` 画大量重复物 |
| 像素比 | `setPixelRatio(Math.min(devicePixelRatio, 2))` |
| 阴影 | 贵；能关就关，或降低 shadow map 分辨率 |
| 材质数 | 少换材质；共享 Material 实例 |
| 销毁 | 路由离开必须 dispose，防 WebGL 上下文泄漏 |
| 检测 | `renderer.info` 看 triangles / calls |

```js
console.log(renderer.info.render) // { frames, calls, triangles, ... }
```

---

## 9. 何时不用 Three.js

| 需求 | 更合适的选择 |
|------|-------------|
| 2D 图表 / 看板 | ECharts、Canvas 2D |
| 极致自定义着色器管线 | 原生 WebGL / WebGPU |
| 浏览器端通用计算（非渲染） | WebGPU Compute / WASM |
| 简单 CSS 3D 翻转卡片 | CSS `transform` 即可 |

---

## 10. 参考

+ [Three.js 官方手册](https://threejs.org/docs/)
+ [three.js examples](https://threejs.org/examples/)
+ [glTF 规范](https://www.khronos.org/gltf/)
+ 本站：[Canvas & WebGL](/notes/foundations/canvas-webgl) · [WebGPU](/notes/frontier/webgpu)
