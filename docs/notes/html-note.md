# HTML Note

## 块盒

+ 内容 `content`
+ 内边距 `padding`
+ 边框 `border`
+ 外边距 `margin`

## 行盒

+ 常见 `span` `strong` `em` `i` `img` `video` `audio`

+ 盒子沿着内容延伸
+ 行盒不能设置宽高
  调整行盒的宽高 应该使用字体大小、行高、字体类型间接调整
+ 内边距 `padding` 水平方向有效 垂直方向不会占据实际空间
+ 边框 `border` 水平方向有效 垂直方向不会占据实际空间
+ 外边距 `margin` 水平方向有效 垂直方向不会占据实际空间

## 行块盒

+ `display: inline-block`
  + 不独占一行
  + 盒模型中所有尺寸都有效

## 可替换元素 / 非可替换元素

+ 大部分元素 页面上显示的结果 取决于元素内容 称为**非可替换元素**
+ 少部分元素 页面上显示的结果 取决于元素属性 称为**可替换元素**
  + 可替换 `img` `video` `audio`
  + 绝大部分可替换元素均为行盒
  + 可替换元素类似于行块盒 盒模型中所有尺寸都生效

## `picture` 元素或 `srcset` 属性 提供多个尺寸的图片

+ `picture` 元素允许你根据不同的条件（如浏览器支持、视口宽度等）提供多种媒体资源
+ `srcset` 属性允许你指定多个图像版本，浏览器会根据设备能力和视口宽度选择合适的版本

```html
<picture>
  <source media="(min-width: 800px)" srcset="large.jpg">
  <source media="(min-width: 450px)" srcset="medium.jpg">
  <img src="small.jpg" alt="示例图片">
</picture>
```

## `img` 与 `map` 元素 联用

+ `map` 和 `img` 元素联用后, 通过 `a` 标签实现 "地图" 区域内点击跳转

```html
<a target="_blank" href="">
  <img usemap="#mapTest" src="" alt="">
</a>
<!-- 为map定义名字，与img图片锚定 -->
<map name="mapTest">
  <!-- 圆形 -->
  <area shape="circle" coords="x, y, 直径" target="_blank" href="" alt="">
  <!-- 矩形 -->
  <area shape="rect" coords="左上角x, 左上角y, 右下角x, 右下角y" href="" alt="">
  <!-- 多边形 -->
  <area shape="poly" coords="点1x, 点1y, 点2x, 点2y ..." href="" alt=""> 
</map>
```

## `img` 与 `figure` 元素 联用, (`figcaption` 子元素)

+ `figure` 指代、定义, 通常用于把图片、图片标题、描述包裹起来
  `figcaption` 子标签, 可以包裹标题

## iframe

```html
<!-- 如果与a标签联用 -->
<a href="https://www.baidu.com" target="myFrame">百度</a>
<a href="https://www.bing.com" target="myFrame">必应</a>
<a href="https://www.google.com" target="myFrame">谷歌</a>

<iframe name='myFrame' src="https://www.baidu.com" frameborder="0"></iframe>
```

+ 通讯方式
  + `window.postMessage`方法：这是一个跨文档消息传递的API，可以安全地跨文档、多窗口进行消息传递
  + 通过修改iframe的src属性传递参数：如果是同源的iframe，可以通过URL的查询参数进行通信。
  + 通过设置和访问window.name属性：在同一个会话中，即同一个window或其子iframe中，修改window.name属性，然后访问它
  + 通过cookie：如果是需要跨域通信，可以通过设置和读取cookie进行数据传递

## flash

+ 页面可以通过 `object`、`embed` 嵌入flash

```html
<!-- data: 嵌入资源; type: MIME类型 -->
<object data="./example.swf" type="application/x-shockwave-flash" width="100%" height="100%">
  <!-- 参数是通过params传递 额外信息用 name , 值是 value -->
  <params name="quality" value="high"></params>  
  <!-- 兼容性写法 如果不能加载object 将使用embed -->
  <embed src="./example.swf" type="application/x-shockwave-flash">
</object>
```

