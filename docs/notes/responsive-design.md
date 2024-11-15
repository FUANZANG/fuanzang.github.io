# H5 响应式与屏幕自适应方案

## viewport 元标签

所有自适应方案的前提，必须正确设置 viewport：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

+ `width=device-width` 页面宽度跟随设备宽度
+ `initial-scale=1.0` 初始缩放比例
+ `maximum-scale=1.0, user-scalable=no` 禁止用户手动缩放（移动端常用，但影响可访问性）

---

## 单位方案对比

| 单位 | 特点 | 适用场景 |
|------|------|----------|
| **px** | 固定像素，不会自适应 | 1px 边框、icon 尺寸 |
| **rem** | 相对于根元素 font-size | 主流方案，配合 JS 或 postcss 插件 |
| **vw/vh** | 相对于视口宽高（1vw = 视口宽度 1%） | 纯 CSS 方案，无需 JS |
| **%** | 相对于父元素 | 流式布局、栅格系统 |
| **vmin/vmax** | 取 vw/vh 中较小/较大值 | 特殊场景（如正方形容器） |

---

## 方案一：rem + JS 动态计算

经典方案，通过 JS 动态设置根元素 font-size：

```javascript
function setRootFontSize() {
  const docEl = document.documentElement;
  const clientWidth = docEl.clientWidth;
  // 设计稿宽度 750px 时，1rem = 100px（方便计算）
  const rem = clientWidth / 7.5;
  docEl.style.fontSize = rem + 'px';
}

setRootFontSize();
window.addEventListener('resize', setRootFontSize);
```

**优点**：兼容性好，计算精确  
**缺点**：需要 JS，有闪烁风险（DOM 渲染前未设置）  
**工具**：amfe-flexible（阿里开源的 flexible.js 精简版）

---

## 方案二：vw/vh 纯 CSS 方案

现代浏览器推荐方案，无需 JS：

```css
.box {
  width: 50vw;           /* 视口宽度的 50% */
  height: 30vh;          /* 视口高度的 30% */
  font-size: 3.5vw;      /* 响应式字体 */
  padding: 2vh 4vw;
}
```

**优点**：纯 CSS，性能好，代码简洁  
**缺点**：旧浏览器兼容性稍差（IE11+），某些场景计算不够精确  
**兼容**：iOS 8+, Android 4.4+

---

## 方案三：媒体查询 + 断点策略

适合 PC + 移动端混合项目：

```css
/* 移动端优先 */
.container { padding: 16px; }

/* 平板 */
@media (min-width: 768px) {
  .container { padding: 24px; }
}

/* 桌面 */
@media (min-width: 1024px) {
  .container { padding: 32px; max-width: 1200px; margin: 0 auto; }
}

/* 大屏 */
@media (min-width: 1440px) {
  .container { max-width: 1400px; }
}
```

**常用断点**：
- 320px / 375px / 414px（小屏手机）
- 768px（iPad 竖屏）
- 1024px（iPad 横屏 / 小笔记本）
- 1440px / 1920px（桌面显示器）

---

## 构建工具自动化

### postcss-px-to-viewport（推荐）

自动将 px 转换为 vw：

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-px-to-viewport': {
      viewportWidth: 750,        // 设计稿宽度
      unitPrecision: 5,          // 转换后保留小数位
      viewportUnit: 'vw',        // 目标单位
      selectorBlackList: ['.ignore'], // 不转换的类名
      minPixelValue: 1,          // 小于 1px 不转换
      mediaQuery: false          // 媒体查询中不转换
    }
  }
}
```

**使用**：代码里直接写 px，构建时自动转为 vw  
**优点**：开发体验好，无需手动计算

---

### postcss-pxtorem

自动将 px 转换为 rem，需配合 flexible.js：

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 100,            // 根元素 font-size = 100px
      propList: ['*'],           // 转换所有属性
      selectorBlackList: ['.norem'] // 不转换的类名
    }
  }
}
```

**注意**：rootValue 要和 JS 里设置的根字体大小对应

---

## 大屏适配策略

### 1. 等比缩放（transform: scale）

保持设计稿比例，整体缩放：

```javascript
function scaleToFit(designWidth = 1920) {
  const scale = window.innerWidth / designWidth;
  document.body.style.transform = `scale(${scale})`;
  document.body.style.transformOrigin = 'top left';
}

scaleToFit();
window.addEventListener('resize', () => scaleToFit());
```

**适用**：数据大屏、展示类页面  
**缺点**：可能留白或裁剪

---

### 2. 栅格布局 + 流式容器

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}
```

**适用**：后台管理系统、可交互大屏  
**优点**：内容自动填充，利用率高

---

### 3. 混合方案

+ 字体/间距：rem 或 vw
+ 图表容器：百分比 + flex/grid
+ 关键元素：固定尺寸 + 媒体查询微调

---

## 常见坑与注意事项

1. **1px 边框问题**：retina 屏下 1px 变粗，使用 `transform: scaleY(0.5)` 或伪元素方案
2. **图片模糊**：高分辨率屏使用 2x/3x 图或 SVG
3. **安全区域**：iPhone X+ 的底部安全区，使用 `env(safe-area-inset-bottom)`
4. **横竖屏**：监听 `orientationchange` 事件，或使用 CSS `orientation` 媒体查询
5. **字体大小**：不建议用 vw 设置正文字体（小屏太小，大屏太大），可用 `clamp()`：
   ```css
   body { font-size: clamp(14px, 2.5vw, 18px); }
   ```

---

## 方案选型建议

| 场景 | 推荐方案 |
|------|----------|
| 纯移动端 H5 | vw/vh + postcss-px-to-viewport |
| 移动端 + PC 端 | rem + flexible.js + 媒体查询 |
| 数据大屏 | transform scale 或 grid + vw |
| 后台管理系统 | 栅格 + 媒体查询（断点策略） |
| 营销落地页 | vw/vh（快速开发） |

---

## 参考工具

+ [amfe-flexible](https://github.com/amfe/lib-flexible) 阿里 flexible.js
+ [postcss-px-to-viewport](https://github.com/evrone/postcss-px-to-viewport) px → vw 插件
+ [postcss-pxtorem](https://github.com/cuth/postcss-pxtorem) px → rem 插件
+ [Can I Use vw](https://caniuse.com/?search=vw) vw/vh 兼容性查询
