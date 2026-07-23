# CSS

> 📌 本文件记录 CSS 布局、选择器、现代特性与常见坑。工程化方案（Tailwind/CSS Modules 等）见 [CSS 工程化](/notes/engineering/css-engineering)；响应式方案见 [响应式与自适应](/notes/foundations/responsive-design)。
>
> 📅 参考：MDN CSS | CSS Specs

---


## 居中总结

+ 行盒 (行块盒) 的水平居中
  + 直接设置行盒 (行块盒) 父元素 `text-align: center`

+ 常规流块盒水平居中
  + 定宽 设置左右auto `margin: 0 auto`

+ 绝对定位元素的水平居中
  + 定宽 设置左右为0 `left: 0; right: 0`, 将margin设置为auto `margin: auto`
  > 实际上固定定位 是绝对定位的特殊情况

+ 单行文本的垂直居中
  + 设置文本所在元素的行高为整个区域的高度

+ 行盒或行块盒内多行文本的垂直居中
  + 设置盒子内上下边距相同达到类似的居中 没有完美的方案

+ 绝对定位的垂直居中
  + 定高 设置上下的坐标为0 `top: 0; bottom: 0;` 上下margin为auto `margin: auto 0;`

## 浏览器适配方案

+ 渐进增强
  + 先适应大部分浏览器 然后针对新版本浏览器加入新的样式
  + 书写代码时 先尽量避免写有兼容性问题的代码 完成后 再逐步加入新标准的代码
+ 优雅降级
  + 先制作完整功能 然后针对低版本浏览器进行特殊处理
  + 书写代码时 先不用特别在意兼容性 完成整个功能后 再针对低版本浏览器处理样式

+ [caniuse](https://caniuse.com/) 查找css兼容性

## 滚动条样式

+ 谷歌浏览器下可以设置滚动条样式 带&是当前元素 去掉则是所有滚动条样式
  + 开发中自定义滚动条可以使用div+css+js实现

```css
&::-webkit-scrollbar {
  /*width: 0;宽度为0隐藏*/
  width: 2px;
} 
/* 滚动条的样式 */
&::-webkit-scrollbar-thumb {
  border-radius: 2px;
  height: 50px;
  background: #909399;
}
/* 轨道背景的样式 */
&::-webkit-scrollbar-track {
  /* box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2); */
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.1);
}
/* 上下按钮的样式 */
&::-webkit-scrollbar-button{
  属性名: 属性值;
}
```

## 清除浮动常用做法

```css
/* 为浮动元素的父级添加类 */
.clearfix::after{
  content: '';
  display: block;
  clear: both;
}
```

## BFC 块级格式化上下文

+ `BFC` 是一块 **独立的** 渲染区域，它规定了在该区域中常规流块盒的布局，不同的BFC区域进行渲染时互不干扰
+ 创建BFC的元素的 特点：
  + 隔绝了他内部和外部的联系 内部渲染不会影响到外部
  + 自动高度需要计算浮动元素
  + 边框盒不会与浮动元素重叠
  + 不会和他的子元素进行外边距合并

+ 创建BFC:
  + `overflow` 属性 当一个元素的 `overflow` *不为* `visible`、`clip` 时
  + 浮动元素 `float` *不为* `none` 时
  + 绝对定位 `position` 属性 *为* `absolute` 或 `fixed`
  + `display` 为 `inline-block` 或 `table-cell`
    + `display: flow-root` 作用类似于让元素具备`<html>`一样的BFC表现
  + `Flex` / `Grid` 父元素设置了 `display: flex` / `display: grid`

## 选择器权重计算规则

+ 总体规则：选择器选中的范围越窄，越特殊
+ 具体规则：通过选择器的权重，计算出一个4位数 (x x x x)

+ 千位：如果是内联样式，记1，否则记0
+ 百位：选择器中所有id选择器的数量相加
+ 十位：选择器中所有类选择器、属性选择器、伪类选择器的数量相加
+ 个位：选择器中所有元素选择器、伪元素选择器的数量相加

## 更多的选择器

+ 伪类选择器层叠原则：爱恨法则
  link：超链接未访问时的状态
  visited:超链接访问过后的状态
  hover：鼠标悬停时的状态
  active：激活时的状态（一般为鼠标按下时）
  这四个连用时，需要按照顺序，即love hate：爱恨法则

+ 更多伪类选择器
  + `:first-child` 选中元素并且该元素必须是第一个子元素
  + `:first-of-type` 选中子元素的第一个选择的元素
  + `:last-child`
  + `:last-of-type`
  + `:nth-child` 选中指定的第几个子元素
    + 2n (even) / 2n+1 (odd)
  + `:nth-of-type` 选中指定的子元素中第几个某类型的元素

+ 更多伪元素选择器
  + `::first-letter` 选中元素的第一个字母
  + `::first-line` 选中元素的第一行文字
  + `::selection` 选中被用户框选的文字

## 文本省略

+ 单行文本超出隐藏省略号显示

```css
{
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

## Sass/SCSS 预处理器

> 📖 更系统的 CSS 工程化方案（预处理器、PostCSS、CSS Modules、CSS-in-JS、原子化 CSS）请查看 [CSS 工程化方案](/notes/engineering/css-engineering)

### 定义变量

+ $ 定义变量

```css
$side: left;

$font-size: {
  xs: 10px,
  sm: 12px,
  md: 13px,
  lg: 14px,
}
/* 如果需要镶嵌在字符串中，则需要使用 #{} */
border-#{$side}-radius: 5px;
```

### 允许使用计算方式

```css
margin: (14px/2);
top: 50px + 100px;
right: $var * 10%;

// 颜色值运算 
p {
  color: #010203 + #040506;  
  //计算 01 + 04 = 05 02 + 05 = 07 03 + 06 = 09，然后编译为color: #050709
}
p {
  color: rgba(255, 0, 0, 0.75) + rgba(0, 255, 0, 0.75);
}
```

### 属性嵌套

```css
font: {
 size:18px;
 color:red
}

nav {
  border: 1px solid #ccc {
    left: 0px;
    right: 0px;
  }
}
```

### 引用父元素

```css
/* &:hover 等价于 a:hover */
a {
  　&:hover { color: #ffb3ff; }
}
/* & 作为选择器的第一个字符，其后可跟后缀生成复合的选择器 */
#main {
  color: black;
  &-sidebar { border: 1px solid; }
}
```

### 继承

```css
/* 选择器可继承另一个选择器 @extend class2将具备class1+class2的属性 */
.class1 {
　border: 1px solid #ddd;
}
.class2 {
　@extend .class1;
  font-size:120%;
}
```

### 重用代码 @mixin

```css
/* 使用@mixin定义代码块 */
@mixin left {
  float: left;
　margin-left: 10px;
}
/* 在使用时 需要调用 @include */
div {
　@include left;
}

/* 指定参数 */
@mixin left($value: 10px) {
　float: left;
　margin-right: $value;
}
/* 使用时根据需要加入参数 */
div {
　@include left(20px);
}
```

### 自定义函数

```css
@function double($n) {
  @return $n * 2;
}

#sidebar {
  width: double(5px);
}
```

### 组合选择器 `>、+、~`

+ 子组合选择器 `>`

```css
/* 选择article元素的直接子元素section */
article > section { border: 1px solid #ccc }
```

+ 同层相邻组合选择器 `+`

```css
/* 选择header元素后紧跟的p元素 */
header + p { font-size: 1.1em }
```

+ 同层全体组合选择器 `~`

```css
/* 选择所有跟在article后的同层article元素，不管它们之间隔了多少其他元素 */
article ~ article { border-top: 1px dashed #ccc }
```

### Map 函数

+ map-get(map, key)

```css
/* 根据 $key ，返回 $key 在 $map 中对应的 value 。如果 $key 不存在 $map中，返回 null  */
/* colors */
$colors: (
  'primary': #db9e3f,
  'info': #4b67af,
  'danger': #791a15,
  'blue-1': #1f3695,
  'blue': #4394e4,
  'white': #fff,
  'white-1': #fcfcfc,
  'white-2': #eceef0,
);

$border-color: map-get($colors, 'light-1');

/* font size */
$font-sizes: (
  xs: 10px,
  sm: 12px,
  md: 13px,
  lg: 14px,
);

font-size: map-get($font-sizes, 'md');
/* Sass 的 Map 函数还有 map-has-key(map, key)，map-keys(map)，map-merge(map1, map2)，map-remove(map, keys…)，map-values(map)。目前感觉map-get()用得多一些。 */
```

### 控制指令

+ `@each` 将变量 $var 作用于值列表中的每一个项目，然后输出结果

```css
@each $var in (left, center, right) {
  .text-#{$var} {
    text-align: $var;
  }
}

/* 编译后得到三个class */
.text-left{
    text-align: left;
}
.text-center{
    text-align: center;
}
.text-right{
    text-align: right;
}

/* 也可以同时利用$key和$value */
$colors: (
  'primary': #db9e3f,
  'info': #4b67af,
  'danger': #791a15,
);

@each $colorKey, $color in $colors {
  .text-#{$colorKey} {
    color: $color;
  }
}
```

+ `@if` 的表达式返回值不是 false 或者 null 时，条件成立，输出 {} 内的代码
  `@if` 声明后面可以跟多个 `@else if` 声明

```css
p {
  @if 1 + 1 == 2 { border: 1px solid; }
  @if null  { border: 3px double; }
}

/* @if 声明后面可以跟多个 @else if 声明 */
$type: monster;
p {
  @if $type == ocean {
    color: blue;
  } @else if $type == matador {
    color: red;
  } @else {
    color: black;
  }
}
```

+ `@for`
  + `@for $var from <start> through <end>`, 条件范围包含 `<start>` 与 `<end>`
  + `@for $var from <start> to <end>`,条件范围只包含 `<start>`，不包含 `<end>`

```css
@for $i from 1 through 3 {
  .item-#{$i} { width: 2em * $i; }
}
/* 编译为 */
.item-1 {
  width: 2em; 
}
.item-2 {
  width: 4em; 
}
.item-3 {
  width: 6em; 
}
```

### 多个元素拥有相同的样式

```css
.box, #wrap, .bottom{
    background-color: red;
} 
```

## flex / grid 布局

### flex

<!-- flex 容器的属性 以下6个属性设置在容器上 -->

+ `flex-direction`属性决定主轴的方向（即项目的排列方向）
  + `row`（默认值）：主轴为水平方向，起点在左端。
  + `row-reverse`：主轴为水平方向，起点在右端。
  + `column`：主轴为垂直方向，起点在上沿。
  + `column-reverse`：主轴为垂直方向，起点在下沿。

+ `flex-wrap`属性定义，如果一条轴线排不下，如何换行
  + `nowrap`（默认）：不换行
  + `wrap`：换行，第一行在上方
  + `wrap-reverse`：换行，第一行在下方

+ `flex-flow`属性是`flex-direction`属性和`flex-wrap`属性的简写形式，默认值为`row nowrap`

+ `justify-content`属性定义了项目在主轴上的对齐方式
  + `flex-start`（默认值）：左对齐
  + `flex-end`：右对齐
  + `center`： 居中
  + `space-between`：两端对齐，项目之间的间隔都相等。
  + `space-around`：每个项目两侧的间隔相等。所以，项目之间的间隔比项目与边框的间隔大一倍

+ `align-items`属性定义项目在交叉轴上如何对齐。
  + `flex-start`：交叉轴的起点对齐。
  + `flex-end`：交叉轴的终点对齐。
  + `center`：交叉轴的中点对齐。
  + `baseline`: 项目的第一行文字的基线对齐。
  + `stretch`（默认值）：如果项目未设置高度或设为auto，将占满整个容器的高度。

+ `align-content`属性定义了多根轴线的对齐方式。如果项目只有一根轴线，该属性不起作用。
  + `flex-start`：与交叉轴的起点对齐。
  + `flex-end`：与交叉轴的终点对齐。
  + `center`：与交叉轴的中点对齐。
  + `space-between`：与交叉轴两端对齐，轴线之间的间隔平均分布。
  + `space-around`：每根轴线两侧的间隔都相等。所以，轴线之间的间隔比轴线与边框的间隔大一倍。
  + `stretch`（默认值）：轴线占满整个交叉轴。

<!-- flex 项目的属性 以下6个属性设置在项目上 -->

+ `order`属性定义项目的排列顺序。数值越小，排列越靠前，默认为 0

+ `flex-grow`属性定义项目的放大比例，默认为 0，即如果存在剩余空间，也不放大
  + 如果所有项目的`flex-grow`属性都为 1，则它们将等分剩余空间（如果有的话）。如果一个项目的`flex-grow`属性为 2，其他项目都为 1，则前者占据的剩余空间将比其他项多一倍。

+ `flex-shrink`属性定义了项目的缩小比例，默认为 1，即如果空间不足，该项目将缩小
  + 如果所有项目的`flex-shrink`属性都为 1，当空间不足时，都将等比例缩小。如果一个项目的`flex-shrink`属性为 0，其他项目都为 1，则空间不足时，前者不缩小。
  + 负值对该属性无效。

+ `flex-basis`属性定义了在分配多余空间之前，项目占据的主轴空间（main size）。浏览器根据这个属性，计算主轴是否有多余空间。它的默认值为auto，即项目的本来大小
  + 它可以设为跟width或height属性一样的值（比如350px），则项目将占据固定空间。

+ `flex`属性是`flex-grow`, `flex-shrink`和`flex-basis`的简写，默认值为0 1 auto。后两个属性可选。

+ `align-self`属性允许单个项目有与其他项目不一样的对齐方式，可覆盖`align-items`属性。默认值为auto，表示继承父元素的`align-items`属性，如果没有父元素，则等同于stretch。
  + 该属性可能取6个值，除了auto，其他都与`align-items`属性完全一致

```css

/* 两种布局都可以使用 gap */
/* flex */
x {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* grid */
x {
  display: grid;
  justify-items: center;
  align-items: center;
  grid-template-columns: 1fr;
  gap: 10px;
  x-item{
    /* row-start/column-start/row-end/column-end */
    grid-area: 2/3/4/5;
  }
}
```

### grid

<!-- 容器属性 -->
+ `grid-template-columns`属性定义每一列的列宽
+ `grid-template-rows`属性定义每一行的行高。
  + `repeat()`简化重复的值 接受两个参数：第一个参数是重复的次数 第二个参数是所要重复的值。重复某种模式也是可以

```css

.container {
  display: grid;
  grid-template-columns: repeat(3, 33.33%);
  grid-template-rows: repeat(2, 100px 20px 80px);
}
```

+ 单元格的大小是固定的，但是容器的大小不确定 可以使用自动填充
  + `auto-fill` 关键字 会用空格子填满剩余宽度
  + `auto-fit` 关键字 则会尽量扩大单元格的宽度

```css
/* 每列宽度100px，然后自动填充，直到容器不能放置更多的列 */
.container {
  display: grid;
  grid-template-columns: repeat(auto-fill, 100px);
}
```

+ fr 关键字 如果两列的宽度分别为1fr和2fr，就表示后者是前者的两倍。

```css
/* 可以与绝对长度的单位结合使用 */
.container {
  display: grid;
  grid-template-rows: 150px 1fr 2fr;
  grid-template-columns: 1fr 1fr;
}
```

+ `minmax()`函数产生一个长度范围，表示长度就在这个范围之中。它接受两个参数，分别为最小值和最大值:`grid-template-columns: 1fr 1fr minmax(100px, 1fr);`不小于100px，不大于1fr。

+ `auto`关键字 表示由浏览器自己决定长度：`grid-template-columns: 100px auto 100px;`

+ 网格线的名称: `grid-template-columns`属性和`grid-template-rows`属性里面，还可以使用方括号，指定每一根网格线的名字，方便以后的引用。

```css
/* 指定网格布局为3行 x 3列，因此有4根垂直网格线和4根水平网格线。方括号里面依次是这八根线的名字。
网格布局允许同一根线有多个名字，比如[fifth-line row-5] */
.container {
  display: grid;
  grid-template-columns: [c1] 100px [c2] 100px [c3] auto [c4];
  grid-template-rows: [r1] 100px [r2] 100px [r3] auto [r4];
}
```

+ `grid-row-gap` 属性设置行与行的间隔（行间距）
+ `grid-column-gap` 属性设置列与列的间隔（列间距）
+ `grid-gap`属性是`grid-column-gap`和`grid-row-gap`的合并简写形式
  + 如果`grid-gap`省略了第二个值，浏览器认为第二个值等于第一个值
+ `grid-template-areas` 属性 网格布局允许指定"区域"（area），一个区域由单个或多个单元格组成。grid-template-areas属性用于定义区域

```css

.container {
  display: grid;
  grid-template-columns: 100px 100px 100px;
  grid-template-rows: 100px 100px 100px;
  grid-template-areas: 'a b c'
                       'd . f'
                       'g g g';
  /* 如果某些区域不需要利用，则使用"点"（.）表示 */
}
/* 注意，区域的命名会影响到网格线。每个区域的起始网格线，会自动命名为区域名-start，终止网格线自动命名为区域名-end。
比如，区域名为header，则起始位置的水平网格线和垂直网格线叫做header-start，终止位置的水平网格线和垂直网格线叫做header-end。 */
```

+ `grid-auto-flow` 属性 划分网格以后，容器的子元素按 先行后列 还是先列后行
  + `row` 默认值：先行后列 可以追加一个参数 `dense`, 即：`row dense`表示尽可能紧密填满
  + `column` 先列后行 可以追加一个参数 `dense`, 即：`column dense`表示尽可能紧密填满

+ `justify-items` 属性设置单元格内容的水平位置（左中右）
+ `align-items` 属性设置单元格内容的垂直位置（上中下）
+ `place-items`属性是`align-items`属性和`justify-items`属性的合并简写形式: 如果省略第二个值，则浏览器认为与第一个值相等
  + `start`：对齐单元格的起始边缘
  + `end`：对齐单元格的结束边缘
  + `center`：单元格内部居中
  + `stretch`：拉伸，占满单元格的整个宽度（默认值）

+ `justify-content` 属性是整个内容区域在容器里面的水平位置（左中右）
+ `align-content` 属性是整个内容区域的垂直位置（上中下）
+ `place-content` 属性是`align-content`属性和`justify-content`属性的合并简写形式: 如果省略第二个值，则浏览器认为与第一个值相等
  + `start`: 对齐容器的起始边框
  + `end`: 对齐容器的结束边框
  + `center`: 容器内部居中
  + `stretch`: 项目大小没有指定时，拉伸占据整个网格容器
  + `space-around`: 每个项目两侧的间隔相等。所以，项目之间的间隔比项目与容器边框的间隔大一倍
  + `space-between`: 项目与项目的间隔相等，项目与容器边框之间没有间隔
  + `space-evenly`: 项目与项目的间隔相等，项目与容器边框之间也是同样长度的间隔

+ `grid-auto-columns`属性和`grid-auto-rows`属性用来设置，浏览器自动创建的多余网格的列宽和行高。它们的写法与`grid-template-columns`和`grid-template-rows`完全相同。如果不指定这两个属性，浏览器完全根据单元格内容的大小，决定新增网格的列宽和行高

<!-- 项目属性 -->
+ `grid-column-start` 属性 左边框所在的垂直网格线
+ `grid-column-end` 属性 右边框所在的垂直网格线
+ `grid-row-start` 属性 上边框所在的水平网格线
+ `grid-row-end` 属性 下边框所在的水平网格线

```css
/* 1号项目的左边框是第二根垂直网格线，右边框是第四根垂直网格线。 */
.item-1 {
  grid-column-start: 2;
  grid-column-end: 4;
}
/* 1号项目被 其他项目环绕 */
.item-1 {
  grid-column-start: 1;
  grid-column-end: 3;
  grid-row-start: 2;
  grid-row-end: 4;
}
/* 这四个属性的值，除了指定为第几个网格线，还可以指定为网格线的名字 */
.item-1 {
  grid-column-start: header-start;
  grid-column-end: header-end;
}
/* 这四个属性的值还可以使用span关键字，表示"跨越"，即左右边框（上下边框）之间跨越多少个网格 */
.item-1 {
  grid-column-start: span 2;
}
/* 如果产生了项目的重叠，则使用z-index属性指定项目的重叠顺序 */
```

+ `grid-column` 属性 是`grid-column-start`和`grid-column-end`的合并简写形式
+ `grid-row` 属性 是`grid-row-start`属性和`grid-row-end`的合并简写形式。

```css
.item-1 {
  grid-column: 1 / 3;
  grid-row: 1 / 2;
}
/* 等同于 */
.item-1 {
  grid-column-start: 1;
  grid-column-end: 3;
  grid-row-start: 1;
  grid-row-end: 2;
}

/* 这两个属性之中，也可以使用span关键字，表示跨越多少个网格 */
.item-1 {
  background: #b03532;
  grid-column: 1 / 3;
  grid-row: 1 / 3;
}
/* 等同于 */
.item-1 {
  background: #b03532;
  grid-column: 1 / span 2;
  grid-row: 1 / span 2;
}
```

+ `grid-area`属性指定项目放在哪一个区域。

```css
.item-1 {
  grid-area: e;
}
```

+ `justify-self`属性设置单元格内容的水平位置（左中右），跟`justify-items`属性的用法完全一致，但只作用于单个项目
+ `align-self`属性设置单元格内容的垂直位置（上中下），跟`align-items`属性的用法完全一致，也是只作用于单个项目
+ `place-self`属性是`align-self`属性和`justify-self`属性的合并简写形式
  + `start`：对齐单元格的起始边缘
  + `end`：对齐单元格的结束边缘
  + `center`：单元格内部居中
  + `stretch`：拉伸，占满单元格的整个宽度（默认值）

## gap

+ gap 属性用于设置 Flexbox 容器中子元素之间的间距。
  + 使用一个值，表示行和列之间的间距相同。
  + 使用两个值，分别表示行间距和列间距。
+ 为了使代码更清晰，你也可以使用 `row-gap` 和 `column-gap` 属性分别设置行间距和列间距。

```css
/* 为 flex 容器设置 gap */
.item-container {
  display: flex;
  row-gap: 30px;
  column-gap: 20px;
}
/* 简写为 */
.item-container {
  display: flex;
  gap: 30px 20px;
}
```

## aspect-ratio 轻松控制元素比例

+ `aspect-ratio` 属性可以方便地设置元素的宽高比例。它定义了元素宽度和高度的比例，根据已知的一边计算出另一边的尺寸；可以用于地图、卡片、视频、iframe 等等需要保持比例的元素，实现自适应布局

```css
/* 创建一个元素，宽度占父元素的 100%，宽高比例为 2:3 */
.item {
  width: 100%;
  aspect-ratio: 2 / 3;
}
```

## content-visibility 提升网页加载速度

+ `content-visibility`属性可以帮助网页更快地加载和渲染。通过这个属性，开发者可以告诉浏览器哪些部分包含独立的内容；浏览器就可以优化页面渲染，延迟一些不必要的计算，从而提升网页加载速度

```css
/* 优化一个 section 的加载速度 */
.section {
  content-visibility: auto;
  contain-intrinsic-size: 1000px;
}
/* 使用 content-visibility 属性，浏览器只会加载和渲染当前用户在屏幕上看到的区域。对于其他部分，只需要指定其高度，contain-intrinsic-size 充当占位符 */
```

## object-view-box 裁剪图片和视频

+ `object-view-box` 属性可以让你在网页上只显示图片或视频的特定区域，效果类似于 viewBox 属性

```css
/* 假设我们需要从图片中裁剪出一个正方形，上边距 25%，右边距 20%，下边距 15%，左边距 5% */
.img {
  aspect-ratio: 1;
  width: 300px;
  object-view-box: inset(25% 20% 15% 5%);
  object-fit: cover;
}
```

## inset 简化定位

+ `inset` 属性可以替代 `top, right, bottom, left` 这四个属性，一次性指定定位元素的四个方向的内边距

```css
/* 创建一个完美定位的弹出模态窗口，占满浏览器窗口的整个区域 */
.modal {
  position: absolute;
  inset: 0;  /* 等同于 top, right, bottom, left 都为 0*/
}
```

## scrollbar-gutter 预留滚动条空间

+ `scrollbar-gutter` 属性可以帮助你预留滚动条的空间，即使滚动条出现也不会导致内容重新排版

```css
/* 这段代码可以为滚动条预留空间，确保滚动条出现时内容不会发生位移 */
html {
  scrollbar-gutter: stable both-edges;
}
```

## text-overflow 和 line-clamp 截断文本

+ text-overflow 和 line-clamp 属性用于在文本超出视窗时截断文本
+ text-overflow 属性用于截断单行文本，line-clamp 属性则用于截断多行文本
  + text-overflow 属性的可用值为 `clip`（文本在父块的边缘被精确裁剪）与 `ellipsis`（在行末添加省略号）
  + line-clamp 属性需要使用 `-webkit` 前缀。值为 2 表示只显示两行文本。

```css
/* 使用 text-overflow 属性，将一行文本截断为容器的宽度，并在末尾添加三个点 */
/* text-overflow 属性只对块级容器有效，前提是元素还具有 white-space 属性设置为 nowrap，以及 overflow 属性设置为 hidden、scroll 或 auto。  */
.title {
  display: block;
  width: 350px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

## Variable Fonts 可变字体

+ 可变字体提供了一个独特的特性：一个字体文件可以包含所有风格

```css
@font-face {
  font-family: Inter;
  src: url("assets/fonts/Inter.woff2");
}
```

## CSS 变量

+ 获取 CSS 变量的值 `element.style.getPropertyValue('--main-color');`
+ 设置 CSS 变量的值 `element.style.setProperty('--translate',`${currentScroll}px`);`

```css
/* 声明变量 */
:root {
  --color-red: #79142B;
}

/* 获取CSS变量 */
.item {
  color: var(--color-red);
}
```

## CSS 函数 min() max() clamp()

+ `min(), max(), clamp()` CSS 函数都是比较函数。它们接收多个值，并返回其中一个值。
  + `min()` 函数返回参数的最小值 参数顺序不做要求
  + `max()` 函数返回参数的最大值 参数顺序不做要求
  + `clamp()` 函数接收三个值(从小到大)：最小值、推荐值和最大值，如果推荐值在指定范围内，则返回推荐值

```css

/* 创建一个容器元素，使其跨越父元素的整个宽度，但限制其最大尺寸 */
/* 传统做法 */
.container {
  width: 100%;
  max-width: 1024px;
}
/* min() 函数 */
.container {
  width: min(100%, 1024px);
}

/* 创建一个高度为 100vh 的 section，同时指定其最小高度 */
/* 传统做法 */
.section {
  height: 100vh;
  min-height: 680px;
}
/* max() 函数 */
.section {
  height: max(100vh, 680px);
}

/* 占据父元素宽度的一半，但它的宽度不能小于 350 像素，也不能大于 650 像素 */
/* clamp() 函数 */
.design {
  width: clamp(350px, 50%, 650px);
}
```

## display: inline-block遇到的问题 (与字体设计有关)

<!-- 将父元素的font-size 设为0消除空白 然后给子元素重新设置font-size -->
+ `font-size: 0; -webkit-text-size-adjust: none;`
  `display: inline-block;` 会导致压缩代码后的换行符有间隔,因此可以通过为父元素添加`font-size: 0`去除空格
  `-webkit-text-size-adjust: none;` 是由于webkit内核的浏览器(chrome)中,当在css中定义的中文font-size小于12px的时候,浏览器仍然使用12px

+ 或者改为 `display: block`

## 参考线-深入理解字体

font-size、line-height、vertical-align、font-family

+ 文字是通过一些文字设计软件设计的 比如fontforge 制作文字时 会有几根参考线 不同的文字类型 参考线不一样 同一种文字 参考线一致

+ 字体大小 设置的是文字的相对大小
  + 类似于活字印刷的方框与文字的比例 1000、2048...
  + 文字顶线到底线的距离是文字实际的大小 content-area 内容区
  + 行盒的背景 覆盖content-area

+ 行高 顶线向上延伸的空间和底线向下延伸的空间 两个空间相等 该空间叫 gap 空隙
  + gap 默认情况下 是字体设计者决定的
  + top 到 bottom 叫 virtual-area 虚拟区 也就是行高
  + line-height: normal 默认值 使用文字默认的 gap
  + 文字一定出现一行的最中间是**错误说法**
  + content-area 一定出现在 virtual-area 的中间

+ vertical-align
  + 决定参考线：font-size、font-family、line-height
  + 一个元素如果出现子元素出现行盒 该元素内部也会产生参考线
  + baseline 该元素的基线与父元素的基线对齐
  + super 该元素的基线与父元素的上基线对齐
  + sub 该元素的基线与父元素的下基线对齐
  + text-top 该元素的virtual-area的顶边 对齐父元素的text-top
  + text-bottom 该元素的virtual-area的底边 对齐父元素的text-bottom
  + top 该元素的virtual-area的顶边 对齐line-box的顶边
  + bottom 该元素的virtual-area的底边 对齐line-box的底边
  + middle 该元素的中线 content-area的一半 与父元素的x字母高度一半的位置对齐
  + 行盒组合起来 可以形成多行 每一行的区域叫 line-box 它的顶边是该行内所有行盒最高顶边 底边是该行盒的最低底边
  + 实际 一个元素的实际占用高度 (高度自动) 高度的计算通过line-box计算
  + 行盒 inline-box 行框 line-box
  + 数值 相对于基线的偏移量 向上为正数 向下为负数
  + 百分比 相对于基线的偏移量 百分比是相对于自身virtual-area的高度
  + line-box是承载文字内容的必要条件 以下情况不生成行框
    + 某元素内部没有任何行盒
    + 某元素字体大小为0

+ 可替换元素和行块盒的基线
  + 图片: 基线位置位于图片的下外边距
  + 表单元素: 基线位置在内容底边
  + 行块盒：
    + 行块盒最后一行有line-box, 用最后一行的基线作为整个行块盒的基线
    + 如果行块盒内部没有行盒, 则使用外边距作为基线

## 堆叠(层叠)上下文

+ `stack context` 是一块区域 规定了 **Z轴** 上排列的先后顺序
  + html 元素、设置了 z-index (非auto) 数值的定位元素 都会创建堆叠上下文

+ **同一个堆叠上下文** 中元素在 **Z轴** 排列规则 (从后到前)
  1) 创建堆叠上下文的元素的背景和边框 eg: html根元素
  2) 堆叠级别为负值的堆叠上下文 eg: z-index: -1;
  3) 常规流非定位的块盒  
  4) 非定位的浮动盒子
  5) 常规流非定位盒子
  6) 任何 z-index 是 auto 的定位子元素 以及 z-index 是 0 的堆叠上下文
  7) 堆叠级别为正值的堆叠上下文

+ 每个堆叠上下文 独立于其他堆叠上下文 他们之间不能互相穿插

## 数据链接 (data url)

+ 将目标文件的数据直接书写到路径位置
  + 语法: src="data:MIME,数据"

## initial 使用元素的默认值

```css
.font-style{
  line-height: initial
}
```

## unset 不设置 (能继承就继承，没继承就默认)

+ 旨在覆盖浏览器默认样式 回归属性的默认值

```css
ul{
  margin: unset;
  padding: initial;
  font-size: inherit; 
  /* all: unset 所有属性都回归属性的默认值 */
}
```

## revert

+ 将属性设置为浏览器的默认样式

```css
.default{
  all: revert 
}
```

---

## 现代布局补强

### 一维：Flex 速记

```css
.row {
  display: flex;
  align-items: center;      /* 交叉轴 */
  justify-content: space-between; /* 主轴 */
  gap: 12px;                /* 替代 margin 缝隙 */
  flex-wrap: wrap;          /* 小屏换行 */
}

.item { flex: 1 1 200px; }  /* grow shrink basis */
```

+ 子项默认 `min-width: auto`，长内容可能撑破；需要时可设 `min-width: 0`
+ `margin-left: auto` 可把单个子项推到另一侧（比再包一层更干净）

### 二维：Grid 速记

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.hero {
  grid-column: 1 / -1; /* 通栏 */
}
```

```css
/* 经典圣杯/侧栏布局 */
.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh;
}
.layout > header { grid-column: 1 / -1; }
.layout > footer { grid-column: 1 / -1; }
```

+ `fr` 分配剩余空间；`minmax(0, 1fr)` 可防止网格子项溢出
+ 子网格：`display: subgrid`（支持度已较好，复杂对齐时很香）

### 逻辑属性（书写方向友好）

```css
.card {
  margin-inline: auto;     /* 左右 = 行内方向 */
  padding-block: 1rem;     /* 上下 = 块方向 */
  inset-inline-start: 0;   /* 替代 left（在 RTL 下自动镜像） */
  border-inline-end: 1px solid #ddd;
}
```

新项目优先逻辑属性，少写死 `left`/`right`。

---

## 现代选择器

```css
/* 父级根据子级状态变化 */
.card:has(img.loading) { opacity: 0.6; }
form:has(:invalid) .submit { opacity: 0.5; }

/* 后续兄弟（含自身之后所有） */
h2 ~ p { color: #555; }

/* 任意层级后代中的直接关系可用 :is/:where 降权 */
:is(article, section) :where(h1, h2, h3) {
  line-height: 1.25;
}

/* 用户是否使用键盘导航（无障碍焦点环） */
:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

+ `:where()` 权重为 0，适合重置；`:is()` 取参数中最高权重
+ `:has()` 很强，但复杂选择器可能有性能成本，避免挂在超大列表根上乱扫

---

## 容器查询（轻量）

相对视口的媒体查询之外，**按组件自身宽度**响应：

```css
.card {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 360px) {
  .card__body { display: grid; grid-template-columns: 120px 1fr; }
}
```

+ 适用：卡片、侧栏内嵌模块、设计系统组件
+ 页面级断点仍用 `@media`；组件级优先 `@container`
+ 需要查询高度时用 `container-type: size`（较少见）

完整响应式策略见 [响应式与自适应](/notes/foundations/responsive-design)。

---

## 层叠与优先级提醒

1. 来源与重要性：用户 `!important` > 作者 `!important` > 作者普通 > 用户普通 > UA
2. 选择器权重（内联 / id / class+属性+伪类 / 元素+伪元素）
3. 后写覆盖先写
4. `@layer` 可显式管理层级，减少 `!important`：

```css
@layer reset, base, components, utilities;

@layer components {
  .btn { padding: 8px 12px; }
}
@layer utilities {
  .p-0 { padding: 0; } /* 即使权重相同也压过 components */
}
```

堆叠上下文细节见上文「堆叠(层叠)上下文」。

---

## 性能相关注意

| 点 | 建议 |
|----|------|
| 动画属性 | 优先 `transform` / `opacity`，少改宽高触发布局 |
| `content-visibility: auto` | 长列表/折叠区块可跳过渲染（见上文示例） |
| 选择器 | 过深或大量 `:has()` 需实测；DevTools Performance 验证 |
| 字体 | `font-display: swap`；可变字体减少多文件请求 |
| 含图片 CLS | 给 img 宽高或 `aspect-ratio` |

动画库与动效体系见 [前端动画](/notes/foundations/frontend-animation)。

---

## 实用片段

```css
/* 安全区（刘海屏） */
.bottom-bar {
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}

/* 截断 */
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 流畅视口高度 */
.full { min-height: 100dvh; }
```

---

## 参考

+ [MDN CSS 参考](https://developer.mozilla.org/zh-CN/docs/Web/CSS)
+ [CSS 选择器 Level 4](https://www.w3.org/TR/selectors-4/)
+ [CSS Containment / Container Queries](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_containment)
