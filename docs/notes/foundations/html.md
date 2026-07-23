# HTML

> 📌 本文件记录 HTML 语义结构、表单、多媒体与常见坑。盒模型/布局见 [CSS](/notes/foundations/css)；无障碍完整体系见 [前端无障碍](/notes/foundations/frontend-a11y)。
>
> 📅 参考：MDN Web Docs — HTML | WHATWG HTML Living Standard

---

## 1. 文档骨架

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>页面标题</title>
  <meta name="description" content="一句话描述，利于 SEO 与分享卡片">
</head>
<body>
  <header>…</header>
  <main>…</main>
  <footer>…</footer>
</body>
</html>
```

+ `lang`：屏幕阅读器与翻译工具依赖，别漏
+ `viewport`：移动端自适应前提，详见 [响应式与自适应](/notes/foundations/responsive-design)
+ 每个页面应有且仅有一个 `<main>`

---

## 2. 语义化标签

| 标签 | 用途 |
|------|------|
| `header` / `footer` | 页眉页脚（也可用于 section 内部） |
| `nav` | 主导航或页内锚点导航 |
| `main` | 页面主内容 |
| `article` | 独立成篇的内容（博文、卡片） |
| `section` | 主题分区，通常带标题 |
| `aside` | 侧栏、相关链接 |
| `h1`–`h6` | 标题层级，避免跳级 |
| `figure` + `figcaption` | 配图及其说明 |
| `time` | 机器可读时间：`<time datetime="2026-07-27">` |

原则：先选语义标签，再考虑 `div`/`span`。样式交给 CSS，不要用标签「长得像」来选标签。

---

## 3. 盒模型与元素分类（速查）

### 块盒 / 行盒 / 行块盒

+ **块盒**：独占一行，可设宽高；如 `div`、`p`、`section`
+ **行盒**：随内容延伸，宽高由字体间接影响；如 `span`、`strong`、`a`
  + 行盒的垂直 `padding`/`border`/`margin` 视觉上有效，但**不撑开行高占用**（经典坑）
+ **行块盒** `display: inline-block`：不独占一行，盒模型尺寸都生效

### 可替换 / 非可替换

+ **非可替换**：显示取决于内容（大多数元素）
+ **可替换**：显示取决于属性，如 `img`、`video`、`audio`、表单控件；尺寸行为接近行块盒

---

## 4. 链接与图片

### 链接

```html
<a href="/notes/" target="_blank" rel="noopener noreferrer">笔记</a>
```

+ 新开标签务必加 `rel="noopener noreferrer"`（防 `window.opener` 钓鱼）
+ 下载：`<a href="/file.pdf" download>`（同源才可靠）

### 响应式图片

```html
<picture>
  <source media="(min-width: 800px)" srcset="large.webp" type="image/webp">
  <source media="(min-width: 450px)" srcset="medium.webp" type="image/webp">
  <img src="small.jpg" alt="产品示意图" width="800" height="450" loading="lazy">
</picture>
```

+ 始终写有意义的 `alt`；装饰图用 `alt=""`
+ 尽量带 `width`/`height`，减少 CLS（见 [Web Vitals](/notes/performance/web-vitals)）
+ `loading="lazy"`：首屏关键图不要懒加载

### 图片热区（map）

```html
<img usemap="#mapTest" src="floor.jpg" alt="展厅平面图">
<map name="mapTest">
  <area shape="rect" coords="10,10,100,80" href="/room-a" alt="A 展区">
  <area shape="circle" coords="200,120,40" href="/room-b" alt="B 展区">
</map>
```

现代项目更常用叠加绝对定位的 `<a>`，热区坐标难维护。

### figure

```html
<figure>
  <img src="chart.png" alt="2025 年访问量趋势">
  <figcaption>图 1：站点月活变化</figcaption>
</figure>
```

---

## 5. 表单

### 常用控件

```html
<form action="/api/login" method="post" novalidate>
  <label for="email">邮箱</label>
  <input id="email" name="email" type="email" required autocomplete="email">

  <label for="pwd">密码</label>
  <input id="pwd" name="password" type="password" required minlength="8" autocomplete="current-password">

  <label>
    <input type="checkbox" name="remember"> 记住我
  </label>

  <button type="submit">登录</button>
</form>
```

| `type` | 作用 |
|--------|------|
| `text` / `email` / `tel` / `url` | 文本与格式约束 |
| `password` | 密码（别用 JS 明文存） |
| `number` / `range` | 数值 |
| `date` / `datetime-local` | 日期时间 |
| `file` | 文件；多选用 `multiple` |
| `hidden` | 隐藏字段（CSRF token 等） |
| `checkbox` / `radio` | 多选 / 单选 |
| `search` | 搜索框语义 |

### 约束校验（Constraint Validation）

```js
const form = document.querySelector('form')
form.addEventListener('submit', (e) => {
  if (!form.checkValidity()) {
    e.preventDefault()
    form.reportValidity() // 弹出浏览器原生提示
  }
})

// 自定义规则
emailInput.setCustomValidity(emailInput.value.endsWith('@corp.com') ? '' : '仅支持公司邮箱')
```

+ `required`、`pattern`、`min`/`max`、`minlength`/`maxlength` 都是原生能力
+ 复杂规则仍用 JS；完整正则见 [正则与校验](/notes/foundations/regex-and-validation)
+ `novalidate`：关掉浏览器默认提示，改用自定义 UI 时常用

### 无障碍要点（表单）

+ 每个控件关联 `<label>`（`for`/`id` 或包裹）
+ 错误信息用 `aria-describedby` 挂到控件
+ 提交失败后把焦点移到第一个错误字段

---

## 6. 多媒体与嵌入

### video / audio

```html
<video controls playsinline preload="metadata" poster="cover.jpg">
  <source src="demo.webm" type="video/webm">
  <source src="demo.mp4" type="video/mp4">
  你的浏览器不支持 video。
</video>
```

+ 移动端自动播放通常需要 `muted` + `playsinline`
+ 不要用已淘汰的 Flash（`object`/`embed` swf）

### iframe

```html
<iframe
  src="https://example.com/embed"
  title="示例嵌入页"
  loading="lazy"
  sandbox="allow-scripts allow-same-origin"
></iframe>
```

+ 必须有 `title`（无障碍）
+ 用 `sandbox` 限制能力；需要通信时用 `postMessage`（勿依赖 cookie 传跨域数据）

```js
// 父 → 子
iframe.contentWindow.postMessage({ type: 'theme', value: 'dark' }, 'https://example.com')

// 子 → 父
window.addEventListener('message', (e) => {
  if (e.origin !== 'https://example.com') return
  console.log(e.data)
})
```

---

## 7. 元信息与 SEO 常用

```html
<link rel="canonical" href="https://example.com/page">
<meta property="og:title" content="标题">
<meta property="og:description" content="描述">
<meta property="og:image" content="https://example.com/og.png">
<meta name="theme-color" content="#0f172a">
<link rel="icon" href="/favicon.ico">
```

PWA Manifest / Service Worker 见 [PWA](/notes/foundations/pwa)。

---

## 8. 常见坑

| 坑 | 说明 |
|----|------|
| 用 `div` 冒充按钮 | 用 `<button>`，自带键盘与语义 |
| 只有图标没有文字 | 补 `aria-label` 或可见文本 |
| `target="_blank"` 无 `rel` | 安全风险 |
| 表格做布局 | 用 Flex/Grid；`table` 留给表格数据 |
| 嵌套交互元素 | 不要把 `<a>` 包在 `<button>` 里（反之亦然） |
| 忘记 `lang` | 影响读屏与字体回退 |

---

## 9. 参考

+ [MDN HTML 元素参考](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element)
+ [MDN 表单指南](https://developer.mozilla.org/zh-CN/docs/Learn/Forms)
+ [WHATWG HTML](https://html.spec.whatwg.org/)
