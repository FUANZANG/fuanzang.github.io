# 性能优化笔记

> 来源：个人学习笔记整理

## Vue 方面

### 使用 key

- 对于通过循环生成的列表应给每个列表项一个稳定且唯一的 `key`，这有利于在列表变动时，尽量少的删除、新增、改动元素
  - `key` 的值可以是字符串或者数字，但是不能是对象，因为对象是引用类型，在比较的时候会直接比较引用，而不是比较内容
  - `key` 的值最好是一个稳定的值，因为如果 `key` 的值是动态的，那么在列表变动的时候，Vue 会认为这个列表项是新的，从而重新渲染这个列表项，而不是复用原来的列表项，这样会导致性能下降

### 使用冻结的对象

- 冻结的对象不会被响应化。对于不会变的数据，使用 `Object.freeze()` 冻结后无法被更改，Vue 也不会去遍历进行响应式

### 使用函数式组件

- 当一个组件不需要状态（即响应式数据）、不需要任何生命周期场景、只接受一些 props 来显示组件时，我们可以使用此配置项 `functional: true` 将其标记为函数式组件

**特点：**

- 没有任何管理状态
- 没有监听任何给它传递的状态
- 本身没有实例（即没有 `this`）
- 没有生命周期
- 只能接收一些 prop 的数据

**优点：**

- 渲染开销低（因为函数式组件只能是函数）
- 速度快

**Vue 2 函数式组件示例：**

```js
export default {
  functional: true,
  props: ['level'],
  render(h, { props, data, children }) {
    return h(`h${props.level}`, data, children)
  }
}
```

```vue
<template functional>
  <button>{{ props.name }}</button>
</template>

<script>
export default {
  props: ['name']
}
</script>
```

**Vue 3 函数式组件示例：**

Vue 3 中的函数式组件都是普通函数创建的，也就不需要定义 `functional` 属性了。

```vue
<script>
import { h } from 'vue'
const Hello = (props, ctx) => {
  return h('button', props.name)
}
</script>
```

### 使用 v-show 而不是 v-if

- `v-show` 只是切换元素的 `display` 属性，而 `v-if` 是动态地向 DOM 树中添加或者删除元素，所以 `v-show` 的性能更好

### 使用延迟装载 (defer)

- JS 传输完成后，浏览器开始执行构造页面，但可能一开始要渲染的组件太多，不仅 JS 执行的时间长，而且执行完后浏览器渲染的元素过多，导致页面白屏
- 一个可行的办法就是**延迟装载组件**，让组件按照指定的先后顺序一次一个渲染出来
  - 本质上是利用 `requestAnimationFrame` 事件分批渲染内容

---

## 图片方面

### 图片懒加载

- 图片懒加载也叫延迟加载，只加载当前屏幕的图片，可视区域外的图片不会进行加载，只有当屏幕滚动的时候才加载
  - 提高网页加载速度
  - 减少后台服务器压力
  - 提升用户体验

**实现步骤：**

1. 将图片地址存储到 `data-xxx` 属性上
2. 判断图片是否在可视区域
3. 如果在，就设置图片 `src`
4. 绑定 scroll 监听事件

### 图片预加载

- 图片预加载就是在浏览器空闲的时候提前加载图片，当用户需要查看时可以直接从本地缓存中渲染，不需要再次请求服务器
  - 提高用户体验
  - 提高页面加载速度

### 图片压缩

- 图片压缩就是将图片的大小减小，减少带宽的消耗，提高加载速度
  - 使用第三方工具压缩图片
  - 使用 webpack 的 `image-webpack-loader` 插件压缩图片

### 使用字体图标 iconfont 代替图片图标

- 字体图标 iconfont 是一种矢量图标，可以无限放大缩小而不失真，而且体积小，加载速度快
  - 使用第三方图标库，如 Font Awesome
  - 自定义字体图标
  - 使用 webpack 的 `url-loader` 插件加载字体图标

### 使用响应式图片

通过 `picture` 实现：

```html
<picture>
  <source srcset="banner_w1000.jpg" media="(min-width: 801px)">
  <source srcset="banner_w800.jpg" media="(max-width: 800px)">
  <img src="banner_w800.jpg" alt="">
</picture>
```

### 调整图片大小、降低质量

### 将 png/jpg/gif 图片替换为 WebP/AVIF 格式

- WebP 格式的图片比 png/jpg 有着更优秀的算法。在图片体积上会比 jpg/png 更小，所以加载的也就更快，耗费的带宽也就越少
- WebP 格式提供有损压缩和无损压缩两种方案
- AVIF 图像可以比相似视觉质量的 JPEG 小 10 倍

---

## 节流与防抖

### 节流

- 函数在 n 秒内只执行一次，如果多次触发，则忽略执行

**应用场景：**

- 拖拽场景
- scroll 场景
- 窗口大小调整

### 防抖

- 函数在 n 秒后再执行，如果 n 秒内被触发，重新计时，保证最后一次触发事件 n 秒后才执行

**应用场景：**

- 输入框搜索
- 表单提交按钮
- 文本编辑器保存

---

## 开启 Gzip 压缩

- 这主要针对工程化项目，如 React/Vue 等

**大概流程：**

1. 下载 `compression-webpack-plugin` 插件
2. 配置到 webpack 中
3. 通知后端开启 gzip

- 通过向 HTTP 请求头中的 `Accept-Encoding` 头添加 gzip 标识来开启这一功能

---

## 异步加载 script 文件或将 script 文件放在最后加载

- 浏览器在下载和解析 script 文件的时候会停止 HTML 的解析和 CSSOM 的构建
- 在 script 标签中加上 `defer` 属性可以让 script 异步加载，并在 DOM 构建完成和 CSS 渲染完毕之后再执行

---

## 减少重排和重绘

### 浏览器渲染过程

1. 解析 HTML 生成 DOM 树
2. 解析 CSS 生成 CSSOM 规则树
3. 解析 JS，操作 DOM 树和 CSSOM 规则树
4. 将 DOM 树与 CSSOM 规则树合并在一起生成渲染树
5. 遍历渲染树开始布局，计算每个节点的位置大小信息
6. 浏览器将所有图层的数据发送给 GPU，GPU 将图层合成并显示在屏幕上

### 重排和重绘

- 重排和重绘是浏览器中相对比较耗时的动作，尤其是重排
- **重绘不一定会引起重排，重排一定会导致重绘**

**重绘触发场景：**

- `background` 的改变
- `color` 的改变
- `visibility: hidden`
- CSS3 的 `translate`
- `color`, `border-style`, `border-radius`, `visibility`, `text-decoration`, `background`, `background-image`, `background-position`, `background-repeat`, `background-size`, `outline-color`, `outline-style`, `outline-width`, `box-shadow`

**重排触发场景：**

- 删除或者新增一个节点元素
- 元素位置的改变，比如 `float`, `position`, `overflow`, `display` 等
- 元素尺寸的改变，比如 `margin`, `padding`, `height`, `width` 等
- 初始化构建 DOM 树的时候
- 窗口尺寸的变化（resize 事件）
- 填充内容的改变
- 读取某一个元素的时候，比如 `offsetLeft`, `offsetTop`, `offsetHeight`, `offsetWidth`, `clientTop`, `clientLeft`, `clientWidth`, `clientHeight`, `scrollTop`, `scrollLeft`, `scrollWidth`, `scrollHeight`, `width`, `height` 等

**减少重排和重绘的方法：**

- 用 JavaScript 修改样式时，最好不要直接写样式，而是替换 class 来改变样式
- 如果要对 DOM 元素执行一系列操作，可以将 DOM 元素脱离文档流，修改完成后，再将它带回文档。推荐使用隐藏元素（`display:none`）或文档碎片（`DocumentFragment`）

---

## 使用服务端渲染 (SSR)

- 服务端渲染（Server-Side Rendering，简称 SSR）是一种将服务器端生成的 HTML 代码直接发送给客户端的技术。与传统的客户端渲染（Client-Side Rendering，简称 CSR）相比，SSR 可以更快地呈现页面内容，提高用户体验

**SSR 的主要优点：**

- **更快的首屏加载时间**：由于服务器端已经生成了完整的 HTML 代码，客户端可以直接渲染，无需等待 JavaScript 代码的下载和执行，从而加快了页面的加载速度
- **更好的 SEO（搜索引擎优化）**：由于搜索引擎可以直接抓取服务器端生成的 HTML 代码，因此 SSR 可以更好地被搜索引擎索引和排名
- **更好的用户体验**：由于服务器端已经生成了完整的 HTML 代码，客户端可以直接渲染，无需等待 JavaScript 代码的下载和执行，从而减少了用户的等待时间

**SSR 的主要缺点：**

- **增加了服务器的负载**：由于服务器需要生成完整的 HTML 代码，因此需要更多的服务器资源。对于高流量的网站来说，这可能会增加服务器的负载
- **需要更多的维护工作**：由于服务器需要处理更多的请求，因此需要更多的维护工作

---

## 合并请求 / 使用 HTTP2

### 合并请求

- 使用精灵图（合并静态图片资源请求）
- 合理合并 get 请求，在适当的情况下，可以将一些可以合并的 get 请求合并为一个

### HTTP2 相比 HTTP1.1 的优点

- **解析速度快**：服务器解析 HTTP1.1 的请求时，必须不断地读入字节，直到遇到分隔符 CRLF 为止。而解析 HTTP2 的请求就不用这么麻烦，因为 HTTP2 是基于帧的协议，每个帧都有表示帧长度的字段
- **多路复用**：HTTP1.1 如果要同时发起多个请求，就得建立多个 TCP 连接。在 HTTP2 上，多个请求可以共用一个 TCP 连接，这称为多路复用
- **首部压缩**：HTTP2 提供了首部压缩功能

---

## 查找表

- 当条件语句特别多时，使用 `switch` 和 `if-else` 不是最佳的选择，这时不妨试一下查找表。查找表可以使用数组和对象来构建

```js
// 原始写法
switch (index) {
  case '0': return result0
  case '1': return result1
  // ...
}

// 替换为
const results = [result0, result1, result2 /* ... */]
return results[index]
```

- 如果条件语句不是数值而是字符串，可以用对象来建立查找表

```js
const map = {
  red: result0,
  green: result1,
}

return map[color]
```

---

## 避免页面卡顿

> 目前大多数设备的屏幕刷新率为 60 次/秒。因此，如果在页面中有一个动画或渐变效果，或者用户正在滚动页面，那么浏览器渲染动画或页面的每一帧的速率也需要跟设备屏幕的刷新率保持一致。其中每个帧的预算时间仅比 16 毫秒多一点（1 秒 / 60 = 16.66 毫秒）。但实际上，浏览器有整理工作要做，因此所有工作需要在 10 毫秒内完成。如果无法符合此预算，帧率将下降，并且内容会在屏幕上抖动。此现象通常称为卡顿，会对用户体验产生负面影响。

- 对于一些长时间运行的 JavaScript，我们可以使用定时器进行切分，延迟执行

```js
const todo = array.concat()
setTimeout(function() {
  process(todo.shift())
  if (todo.length) {
    setTimeout(arguments.callee, 25)
  } else {
    callback(array)
  }
}, 25)
```

---

## 使用 requestAnimationFrame 来实现视觉变化

- 每一帧的平均时间为 16.66 毫秒。在使用 JavaScript 实现动画效果的时候，最好的情况就是每次代码都是在帧的开头开始执行。而保证 JavaScript 在帧开始时运行的唯一方式是使用 `requestAnimationFrame`

```js
function updateScreen(time) {
  // Make visual updates here.
}

requestAnimationFrame(updateScreen)
```

---

## 使用 requestIdleCallback 来实现长时间运行的 JavaScript

```js
// 运行一个耗时任务，尽快完成的同时不要让页面产生卡顿
function runTask(task) {
  return new Promise((resolve) => {
    _runTask(task, resolve)
  })
}

// 使用 requestIdleCallback 判断当前帧是否还有剩余时间
function _runTask(task, resolve) {
  requestIdleCallback((idle) => {
    if (idle.timeRemaining() > 0) {
      task()
      resolve()
    } else {
      // 递归调用到下一帧的空闲时间，不会对渲染造成阻塞
      _runTask(task, resolve)
    }
  })
}
```

- 考虑到 `requestIdleCallback` 兼容性问题，可以用 `requestAnimationFrame` 来实现
- 也可以使用 Web Worker 开启多线程（非 DOM 操作的时候），比如分 3 个线程处理，处理完后汇总到主线程

---

## 使用 Web Workers

- Web Worker 使用其他工作线程从而独立于主线程之外，它可以执行任务而不干扰用户界面。一个 worker 可以将消息发送到创建它的 JavaScript 代码，通过将消息发送到该代码指定的事件处理程序（反之亦然）
- Web Worker 适用于那些处理纯数据，或者与浏览器 UI 无关的长时间运行脚本

**使用 Web Worker 实现大文件切片上传、秒传和续传的功能：**

1. 脚手架中需要安装 worker-loader：`npm i worker-loader`
2. 在 `vue.config.js` 中配置 loader
3. 创建 worker 文件 `webworker.worker.js`
4. onChange 事件里面代码逻辑，通过 check 文件状态，实现文件秒传功能
5. 分片上传逻辑，实现文件续传功能
   - 文件切片，得到切片总数
   - 过滤掉服务端返回的切片数组，实现切片续传功能
   - 判断切片完成：需要上传的切片数 + 已上传的切片数 === 切片总数，相等则执行上传逻辑
6. 文件上传，串行上传或并发上传
   - 串行上传：上一个切片上传完成后，才可以执行下一个切片上传
   - 并发上传：获取第一个切片，先保证第一个切片上传成功。利用 `Promise.all` 并发请求

---

## 静态资源使用 CDN

- CDN（Content Delivery Network，内容分发网络）是一种通过在网络各处放置节点服务器，使用户就近获取所需内容，降低网络拥塞，提高用户访问响应速度和命中率的技术

**CDN 的优点：**

- **提高访问速度**：CDN 可以将内容缓存到离用户更近的节点服务器上，从而减少网络延迟和带宽消耗，提高网站的访问速度和用户体验
- **降低服务器负载**：CDN 可以将内容缓存到多个节点服务器上，从而分散了原始服务器的负载，提高了服务器的可用性和稳定性
- **提高网站的可用性**：CDN 可以将内容缓存到多个节点服务器上，从而提高了网站的可用性。当某个节点服务器出现故障时，用户可以从其他节点服务器上获取内容，从而保证了网站的持续可用性

---

## 启用事件委托（事件代理）

- 利用事件冒泡机制将原本应该绑定在子元素上的事件全部交由父元素来完成的行为被称为事件委托
- **适用场景**：列表数据和瀑布流数据等需要大量绑定相同功能的函数的场景

---

## 尽量使用 CSS 完成动画效果

- 一些简单的、需要手动绘制的动画，在 CSS 可以完成的情况下，尽量避免使用 JS 完成动画

**使用 CSS 完成动画的好处：**

- 不占用主线程（JS 是需要占用的）
- 可以利用硬件加速
- 在不可见时动画不会持续执行
- 如果项目本身存在动画库，建议使用动画库。如果动画复杂，无法使用 CSS 完成（比如需要绑定函数），那么建议用 JS 完成动画

---

## 懒加载

- **常见使用场景**：瀑布流、下拉列表、子组件渲染时机

---

## 使用骨架屏

- 在数据查询速度慢，或者资源体积大、数量多无法第一时间返回等浏览器无法快速接受并将数据渲染到视图上的情况下，除了可以采用代码压缩、启动缓存等方案外，还可以采用骨架屏的方式来挽回一点体验
- 骨架屏的原理就是在页面上先渲染一个骨架屏，然后再异步请求数据，渲染真实数据

---

## 使用 day.js 替换 moment.js

- day.js 的体积比 moment.js 小
- moment.js 有 70 多 kb，但是 day.js 只有 2kb

---

## 启用前端缓存 - 协商缓存

> 浏览器缓存策略：缓存验证机制

### ETag

- ETag，可以想象成是网页或资源的一个"指纹"或"身份证号"。当网页或资源内容发生变化时，这个"指纹"或"身份证号"也会变化。ETag 通常由服务器生成，并且与特定的资源相关联，浏览器在之后的请求中会使用 `If-None-Match` 请求头来检查资源是否仍然匹配这个 ETag

**ETag 是如何工作的？**

1. **首次请求资源**：当你第一次访问一个网页时，服务器会发送这个网页给你，并且同时会告诉你这个网页的 ETag 值
2. **缓存资源**：你的浏览器会把网页保存起来（缓存），并且记住这个 ETag 值
3. **再次请求资源**：当你第二次访问这个网页时，浏览器会先检查缓存，看看是否有这个网页的"存货"。如果有，它会告诉服务器："我有这个网页的缓存版本，它的 ETag 值是 XXXX，你有更新的版本吗？"
4. **服务器检查**：服务器会查看自己当前版本的 ETag 值。如果服务器的 ETag 值与浏览器提供的 ETag 值相同，说明网页没有变化，服务器就会告诉浏览器："你缓存的版本是最新的，直接用吧！"这样，浏览器就可以直接显示缓存的网页，而不需要从服务器重新下载
5. **如果资源有更新**：如果服务器的 ETag 值变了，说明网页已经更新。服务器会告诉浏览器："你的版本旧了，我这里有新的版本。"然后，服务器会发送新的网页内容和新的 ETag 值给浏览器

**ETag 在缓存策略中的作用：**

- **节省带宽**：通过比较 ETag 值，我们可以避免重复下载相同的资源，从而节省网络带宽
- **提高速度**：如果资源没有变化，我们可以直接从缓存中获取，而不需要等待从服务器下载，这样加载网页的速度就会更快
- **确保准确性**：ETag 可以确保我们总是得到资源的最新版本。如果资源有更新，ETag 值会变，这样我们就可以知道需要下载新版本

### Last-Modified

- `Last-Modified` 是 HTTP 协议中用于缓存控制的一个机制，它表示资源在服务器上的最后修改时间
- 当客户端请求一个资源时，服务器会在返回资源的同时，在响应头中添加 `Last-Modified` 字段，表示资源最后修改的日期和时间
- 下次客户端再次请求该资源时，会发送 `If-Modified-Since` 请求头，其中包含上次接收到的 `Last-Modified` 值
- 服务器收到请求后，检查请求头中的 `If-Modified-Since` 值与当前资源在服务器上的最后修改日期和时间是否一致
  - 如果一致，说明资源未发生变化，服务器会返回 304 Not Modified 状态码，客户端收到 304 状态码后，会从本地缓存中获取资源，而不是重新从服务器获取
  - 如果不一致，说明资源发生了变化，服务器会返回新的资源和 200 OK 状态码

**Last-Modified 的使用场景：**

- **静态资源**：对于不需要频繁更新的静态资源，可以使用 `Last-Modified` 进行缓存控制，提高网站性能
- **动态资源**：对于动态生成的资源，可以使用 `Last-Modified` 进行缓存控制，减少不必要的资源请求

---

## 启用前端缓存 - 强缓存

> 浏览器缓存策略：缓存验证机制

### Expires

- `Expires` 是一个 HTTP/1.0 的头部字段，它指定了一个日期/时间，在这个日期/时间之后，缓存的资源被认为是过期的。浏览器在下次请求时，会检查缓存资源的 Expires 值，如果当前时间超过了 Expires 指定的时间，浏览器会认为该资源已过期，并向服务器发送请求以获取最新的资源

### Cache-Control

- `Cache-Control` 是一个更为强大和灵活的 HTTP/1.1 头部字段，用于控制缓存行为。它提供了多种指令，允许开发者更精确地定义缓存策略

**Cache-Control 的一些常见指令：**

- `public`：指示响应可以被任何缓存存储
- `private`：指示响应只能被单个用户的浏览器缓存存储
- `no-cache`：指示浏览器在每次请求时都必须向服务器验证资源的有效性，即使它在缓存中
- `no-store`：指示浏览器和其他缓存代理不应存储任何版本的响应
- `max-age`：指定资源在缓存中的最大有效时间（以秒为单位）

---

> 更多构建工具优化见 [Webpack 性能优化](./webpack-optimization.md)
