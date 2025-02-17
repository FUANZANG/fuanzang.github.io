# ECharts 笔记

> Apache ECharts 是百度开源的数据可视化库，支持丰富的图表类型和交互功能。

<!-- 本文件记录 ECharts 5.x 的实战技巧、常用模板与性能优化 -->

---

## 1. 快速开始

### 安装

```bash
npm install echarts
```

### 基本使用

```html
<!-- 准备一个有宽高的容器 -->
<div id="chart" style="width: 600px; height: 400px;"></div>
```

```javascript
import * as echarts from 'echarts'

// 初始化图表
const chart = echarts.init(document.getElementById('chart'))

// 配置项
const option = {
  title: {
    text: '示例图表',
  },
  tooltip: {},
  xAxis: {
    data: ['A', 'B', 'C', 'D', 'E'],
  },
  yAxis: {},
  series: [
    {
      name: '销量',
      type: 'bar',
      data: [5, 20, 36, 10, 10],
    },
  ],
}

// 渲染图表
chart.setOption(option)

// 窗口大小变化时自适应
window.addEventListener('resize', () => chart.resize())
```

### Vue 3 集成

```vue
<template>
  <div ref="chartRef" style="width: 100%; height: 400px;"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

const chartRef = ref(null)
let chart = null

const option = ref({
  title: { text: '示例图表' },
  xAxis: { type: 'category', data: ['A', 'B', 'C'] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [10, 20, 30] }],
})

onMounted(() => {
  chart = echarts.init(chartRef.value)
  chart.setOption(option.value)

  window.addEventListener('resize', () => chart?.resize())
})

onUnmounted(() => {
  chart?.dispose()
  window.removeEventListener('resize', () => chart?.resize())
})

// 监听数据变化，重新渲染
watch(option, (newVal) => {
  chart?.setOption(newVal)
}, { deep: true })
</script>
```

---

## 2. 核心概念

### 配置项结构

```javascript
const option = {
  title: {},        // 标题
  legend: {},       // 图例
  tooltip: {},      // 提示框
  toolbox: {},      // 工具栏
  grid: {},         // 直角坐标系内绘图网格
  xAxis: {},        // X 轴
  yAxis: {},        // Y 轴
  series: [],       // 系列列表
  dataset: {},      // 数据集
  visualMap: {},    // 视觉映射
  dataZoom: [],     // 数据缩放
  graphic: {},      // 原生图形元素
}
```

### 常用组件对比

| 组件 | 作用 | 常用场景 |
|------|------|---------|
| `title` | 图表标题 | 所有图表 |
| `legend` | 图例 | 多系列数据 |
| `tooltip` | 悬浮提示 | 交互图表 |
| `toolbox` | 工具栏 | 需要导出、切换、缩放 |
| `dataZoom` | 数据缩放 | 大数据量、时间序列 |
| `visualMap` | 视觉映射 | 热力图、地图 |
| `graphic` | 自定义图形 | 水印、装饰 |

### series.type 图表类型

```javascript
// 基础图表
'line'      // 折线图
'bar'       // 柱状图
'pie'       // 饼图
'scatter'   // 散点图
'radar'     // 雷达图

// 统计图表
'boxplot'   // 箱线图
'heatmap'   // 热力图
'treemap'   // 矩形树图
'sunburst'  // 旭日图

// 关系图表
'graph'     // 关系图
'tree'      // 树图
'sankey'    // 桑基图

// 地理图表
'map'       // 地图
'lines'     // 路径图

// 其他
'gauge'     // 仪表盘
'funnel'    // 漏斗图
'pictorialBar' // 象形柱图
'themeRiver'   // 主题河流图
'parallel'     // 平行坐标系
```

---

## 3. 常用图表模板

### 折线图

```javascript
const option = {
  title: { text: '销量趋势' },
  tooltip: {
    trigger: 'axis',
    formatter: '{b}<br/>{a}: {c}',
  },
  legend: {
    data: ['销量', '利润'],
  },
  xAxis: {
    type: 'category',
    data: ['1月', '2月', '3月', '4月', '5月'],
  },
  yAxis: {
    type: 'value',
    name: '数量',
  },
  series: [
    {
      name: '销量',
      type: 'line',
      smooth: true,  // 平滑曲线
      data: [120, 200, 150, 80, 70],
      areaStyle: {   // 区域填充
        color: 'rgba(0, 100, 200, 0.2)',
      },
    },
    {
      name: '利润',
      type: 'line',
      smooth: true,
      data: [60, 100, 80, 40, 30],
    },
  ],
}
```

### 柱状图

```javascript
const option = {
  title: { text: '各部门业绩' },
  tooltip: { trigger: 'axis' },
  legend: { data: ['收入', '支出'] },
  xAxis: {
    type: 'category',
    data: ['部门A', '部门B', '部门C', '部门D'],
  },
  yAxis: { type: 'value' },
  series: [
    {
      name: '收入',
      type: 'bar',
      stack: 'total',  // 堆叠
      data: [120, 200, 150, 80],
      itemStyle: { color: '#5470c6' },
    },
    {
      name: '支出',
      type: 'bar',
      stack: 'total',
      data: [60, 100, 80, 40],
      itemStyle: { color: '#91cc75' },
    },
  ],
}
```

**横向柱状图：**

```javascript
// 交换 xAxis 和 yAxis 的 type
xAxis: { type: 'value' },
yAxis: {
  type: 'category',
  data: ['部门A', '部门B', '部门C'],
},
```

### 饼图

```javascript
const option = {
  title: {
    text: '访问来源',
    left: 'center',
  },
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b}: {c} ({d}%)',
  },
  legend: {
    orient: 'vertical',
    left: 'left',
  },
  series: [
    {
      name: '访问来源',
      type: 'pie',
      radius: '50%',
      data: [
        { value: 1048, name: '搜索引擎' },
        { value: 735, name: '直接访问' },
        { value: 580, name: '邮件营销' },
        { value: 484, name: '联盟广告' },
        { value: 300, name: '视频广告' },
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    },
  ],
}
```

**环形图（南丁格尔玫瑰图）：**

```javascript
series: [
  {
    type: 'pie',
    radius: ['40%', '70%'],  // 内外半径
    avoidLabelOverlap: false,
    label: {
      show: true,
      position: 'center',
      formatter: '{b}\n{d}%',
    },
  },
]
```

### 散点图

```javascript
const option = {
  xAxis: { type: 'value' },
  yAxis: { type: 'value' },
  series: [
    {
      type: 'scatter',
      symbolSize: 20,  // 点大小
      data: [
        [10, 8.04],
        [8, 6.95],
        [13, 7.58],
        [9, 8.81],
      ],
      itemStyle: {
        color: 'rgba(0, 100, 200, 0.6)',
      },
    },
  ],
}
```

**气泡图（第三维用大小表示）：**

```javascript
series: [
  {
    type: 'scatter',
    symbolSize: (data) => Math.sqrt(data[2]) * 5,  // 根据第三维数据计算大小
    data: [
      [10, 8.04, 100],
      [8, 6.95, 200],
      [13, 7.58, 150],
    ],
  },
]
```

### 雷达图

```javascript
const option = {
  radar: {
    indicator: [
      { name: '销售', max: 6500 },
      { name: '管理', max: 16000 },
      { name: '技术', max: 30000 },
      { name: '客服', max: 38000 },
      { name: '研发', max: 52000 },
      { name: '市场', max: 25000 },
    ],
  },
  series: [
    {
      type: 'radar',
      data: [
        {
          value: [4200, 3000, 20000, 35000, 50000, 18000],
          name: '预算',
        },
        {
          value: [5000, 14000, 28000, 26000, 42000, 21000],
          name: '实际',
        },
      ],
    },
  ],
}
```

### 仪表盘

```javascript
const option = {
  series: [
    {
      type: 'gauge',
      progress: {
        show: true,
        width: 18,
      },
      axisLine: {
        lineStyle: {
          width: 18,
        },
      },
      axisTick: { show: false },
      splitLine: {
        length: 15,
        lineStyle: {
          width: 2,
          color: '#999',
        },
      },
      axisLabel: {
        distance: 25,
        color: '#999',
        fontSize: 20,
      },
      detail: {
        valueAnimation: true,
        formatter: '{value}%',
      },
      data: [
        {
          value: 70,
          name: '完成率',
        },
      ],
    },
  ],
}
```

### 热力图

```javascript
const option = {
  tooltip: {
    position: 'top',
  },
  grid: {
    height: '50%',
    top: '10%',
  },
  xAxis: {
    type: 'category',
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  },
  yAxis: {
    type: 'category',
    data: ['12am', '1am', '2am', '3am', '4am', '5am'],
  },
  visualMap: {
    min: 0,
    max: 10,
    calculable: true,
    orient: 'horizontal',
    left: 'center',
    bottom: '15%',
  },
  series: [
    {
      type: 'heatmap',
      data: [
        [0, 0, 5],
        [0, 1, 1],
        [0, 2, 0],
        // ...
      ],
      label: { show: true },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    },
  ],
}
```

---

## 4. 高级配置

### 数据集 (dataset)

```javascript
// 使用 dataset 管理数据，更灵活
const option = {
  legend: {},
  tooltip: {},
  dataset: {
    dimensions: ['product', '2015', '2016', '2017'],
    source: [
      { product: 'Matcha Latte', 2015: 43.3, 2016: 85.8, 2017: 93.7 },
      { product: 'Milk Tea', 2015: 83.1, 2016: 73.4, 2017: 55.1 },
      { product: 'Cheese Cocoa', 2015: 86.4, 2016: 65.2, 2017: 82.5 },
    ],
  },
  xAxis: { type: 'category' },
  yAxis: {},
  series: [
    { type: 'bar' },
    { type: 'bar' },
    { type: 'bar' },
  ],
}
```

### 数据缩放 (dataZoom)

```javascript
const option = {
  dataZoom: [
    {
      type: 'slider',  // 滑动条
      start: 0,
      end: 50,
    },
    {
      type: 'inside',  // 鼠标滚轮
    },
  ],
  xAxis: {
    type: 'category',
    data: ['1月', '2月', /* ... 大量数据 */],
  },
  yAxis: {},
  series: [
    { type: 'line', data: [/* ... */] },
  ],
}
```

### 视觉映射 (visualMap)

```javascript
const option = {
  visualMap: {
    type: 'continuous',  // 连续型
    min: 0,
    max: 100,
    dimension: 0,  // 映射的维度
    inRange: {
      color: ['#50a3ba', '#eac736', '#d94e5d'],
    },
    text: ['高', '低'],
    calculable: true,
  },
  series: [
    {
      type: 'scatter',
      data: [[10, 20], [50, 60], [90, 80]],
    },
  ],
}
```

### 工具栏 (toolbox)

```javascript
const option = {
  toolbox: {
    feature: {
      saveAsImage: {},  // 保存为图片
      restore: {},      // 重置
      dataView: {},     // 数据视图
      dataZoom: {},     // 区域缩放
      magicType: {      // 图表切换
        type: ['line', 'bar', 'stack'],
      },
    },
  },
}
```

### 自定义提示框

```javascript
const option = {
  tooltip: {
    trigger: 'item',
    formatter: (params) => {
      return `
        <div style="padding: 8px;">
          <strong>${params.name}</strong><br/>
          销量: ${params.value} 件<br/>
          占比: ${params.percent}%
        </div>
      `
    },
  },
}
```

### 自定义图形 (graphic)

```javascript
const option = {
  graphic: [
    {
      type: 'text',
      left: 'center',
      top: 'center',
      style: {
        text: '水印',
        fontSize: 50,
        fill: 'rgba(0, 0, 0, 0.1)',
      },
    },
    {
      type: 'image',
      left: 'right',
      top: 'top',
      style: {
        image: 'https://example.com/logo.png',
        width: 100,
        height: 100,
      },
    },
  ],
}
```

---

## 5. 主题与样式

### 内置主题

```javascript
// 使用内置主题
const chart = echarts.init(dom, 'dark')  // 'light' 或 'dark'
```

### 自定义主题

```javascript
// 注册主题
echarts.registerTheme('my-theme', {
  color: ['#37a2da', '#32c5e9', '#67e0e3', '#9fe6b8'],
  backgroundColor: '#f5f5f5',
  textStyle: {},
  title: {
    textStyle: {
      color: '#333',
    },
  },
  line: {
    itemStyle: {
      borderWidth: 2,
    },
  },
})

// 使用自定义主题
const chart = echarts.init(dom, 'my-theme')
```

### 常用样式配置

```javascript
const option = {
  title: {
    text: '标题',
    textStyle: {
      color: '#333',
      fontSize: 18,
      fontWeight: 'bold',
    },
    subtextStyle: {
      color: '#999',
      fontSize: 12,
    },
  },
  legend: {
    textStyle: {
      color: '#666',
    },
  },
  xAxis: {
    axisLine: {
      lineStyle: { color: '#ccc' },
    },
    axisLabel: {
      color: '#666',
      rotate: 45,  // 标签旋转
    },
  },
}
```

### 渐变色

```javascript
series: [
  {
    type: 'bar',
    itemStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#83bff6' },
        { offset: 0.5, color: '#188df0' },
        { offset: 1, color: '#188df0' },
      ]),
    },
  },
]
```

### 阴影

```javascript
series: [
  {
    type: 'bar',
    itemStyle: {
      shadowBlur: 10,
      shadowColor: 'rgba(0, 0, 0, 0.3)',
      shadowOffsetX: 2,
      shadowOffsetY: 2,
    },
  },
]
```

---

## 6. 交互与事件

### 点击事件

```javascript
chart.on('click', (params) => {
  console.log(params)
  // params 包含：name, value, seriesName, dataIndex 等
})

// 点击特定系列
chart.on('click', 'series.line', (params) => {
  console.log('点击了折线:', params)
})

// 点击图例
chart.on('legendselectchanged', (params) => {
  console.log('图例选择变化:', params.selected)
})
```

### 常用事件

```javascript
// 鼠标悬浮
chart.on('mouseover', (params) => {})

// 鼠标移出
chart.on('mouseout', (params) => {})

// 数据缩放
chart.on('datazoom', (params) => {
  console.log('缩放范围:', params.start, params.end)
})

// 图例选择
chart.on('legendselectchanged', (params) => {})

// 工具栏按钮点击
chart.on('toolbarenhance', (params) => {})
```

### 联动

```javascript
// 连接多个图表，实现 tooltip 联动
echarts.connect([chart1, chart2, chart3])
```

---

## 7. 响应式与性能

### 自适应容器

```javascript
// 监听容器大小变化
const resizeObserver = new ResizeObserver(() => {
  chart.resize()
})
resizeObserver.observe(chartDom)

// 或者监听窗口
window.addEventListener('resize', () => chart.resize())
```

### 大数据量优化

#### 数据量级与策略选择

| 数据量 | 策略 |
|--------|------|
| < 1000 | 无需优化 |
| 1K~10K | 关闭动画 + `sampling` |
| 10K~100K | `appendData` 分片 + `large` 模式 |
| 100K~1M | `large` 模式 + `progressive` 渐进渲染 |
| > 1M | 服务端聚合 + dataZoom 分段加载 |

#### 1. 基础优化

```javascript
const option = {
  series: [
    {
      type: 'line',
      data: largeData,
      // 关闭动画（大数据时动画是最大性能杀手）
      animation: false,
      // 采样策略（数据点超过容器像素时自动采样）
      sampling: 'lttb',  // 'average' | 'max' | 'min' | 'sum' | 'lttb'
      // 关闭 symbol 显示（每个点不画圆点）
      showSymbol: false,
      // 关闭 hover 高亮
      emphasis: { disabled: true },
    },
  ],
}
```

#### 2. large 大数据模式

```javascript
// 散点图大数据模式（10万+数据点）
const option = {
  series: [
    {
      type: 'scatter',
      data: millionPoints,  // 百万级数据
      large: true,           // 开启大数据优化
      largeThreshold: 2000,  // 超过 2000 个数据点时自动启用
      // large 模式下关闭不必要的渲染
      symbolSize: 2,
      itemStyle: { opacity: 0.6 },
    },
  ],
}
```

#### 3. progressive 渐进渲染

```javascript
// 将大数据分片渲染，避免一次性渲染导致页面卡顿
const option = {
  series: [
    {
      type: 'scatter',
      data: hugeData,  // 百万级
      progressive: 500,        // 每帧渲染 500 个数据点
      progressiveThreshold: 3000, // 超过 3000 个数据时启用渐进渲染
      // 渐进渲染期间显示 loading
      progressiveChunkMode: 'mod', // 'sequential' | 'mod'
    },
  ],
}
```

#### 4. appendData 分片加载

```javascript
const chart = echarts.init(dom)

// 先用空数据初始化
chart.setOption({
  series: [{ type: 'scatter', data: [] }],
})

// 分片追加数据（模拟流式加载）
const CHUNK_SIZE = 5000
let offset = 0

function loadChunk() {
  const chunk = largeData.slice(offset, offset + CHUNK_SIZE)
  if (chunk.length === 0) return

  chart.appendData({ seriesIndex: 0, data: chunk })
  offset += CHUNK_SIZE

  // 用 requestAnimationFrame 避免阻塞主线程
  requestAnimationFrame(loadChunk)
}

loadChunk()
```

#### 5. dataZoom 分段加载

```javascript
// 配合服务端分页，只加载可视区域数据
const option = {
  dataZoom: [
    { type: 'slider', start: 0, end: 10 },
    { type: 'inside' },
  ],
  xAxis: { type: 'category' },
  yAxis: {},
  series: [{ type: 'line', data: [] }],
}

chart.setOption(option)

// 监听缩放事件，动态加载数据
chart.on('datazoom', async (params) => {
  const { start, end } = params.batch?.[0] || {}
  const data = await fetchDataByRange(start, end)
  chart.setOption({
    xAxis: { data: data.labels },
    series: [{ data: data.values }],
  })
})
```

#### 6. dataset 共享数据源

```javascript
// 多个 series 共享同一个 dataset，避免重复数据
const option = {
  dataset: {
    source: sharedData,  // 数据只存一份
  },
  series: [
    { type: 'line', encode: { x: 0, y: 1 } },
    { type: 'line', encode: { x: 0, y: 2 } },
    { type: 'line', encode: { x: 0, y: 3 } },
  ],
}
```

#### 7. 降维与聚合

```javascript
// 前端聚合：将万级数据聚合为百级
function aggregateData(rawData, bucketSize) {
  const buckets = []
  for (let i = 0; i < rawData.length; i += bucketSize) {
    const chunk = rawData.slice(i, i + bucketSize)
    buckets.push({
      time: chunk[0].time,
      avg: chunk.reduce((s, d) => s + d.value, 0) / chunk.length,
      max: Math.max(...chunk.map(d => d.value)),
      min: Math.min(...chunk.map(d => d.value)),
    })
  }
  return buckets
}

// 根据缩放级别动态调整聚合粒度
chart.on('datazoom', (params) => {
  const visiblePercent = params.end - params.start
  const bucketSize = visiblePercent > 50 ? 100 : visiblePercent > 20 ? 50 : 10
  const aggregated = aggregateData(rawData, bucketSize)
  chart.setOption({ series: [{ data: aggregated }] })
})
```

#### 8. 性能优化清单

| 优化手段 | 效果 | 适用场景 |
|----------|------|---------|
| `animation: false` | ⭐⭐⭐⭐⭐ | 所有大数据场景 |
| `showSymbol: false` | ⭐⭐⭐⭐ | 折线图/散点图 |
| `sampling: 'lttb'` | ⭐⭐⭐⭐ | 折线图数据点多 |
| `large: true` | ⭐⭐⭐⭐⭐ | 散点图 10K+ |
| `progressive` | ⭐⭐⭐⭐ | 渐进渲染，不卡主线程 |
| `appendData` | ⭐⭐⭐ | 流式数据加载 |
| `dataZoom` 分段 | ⭐⭐⭐⭐⭐ | 配合服务端分页 |
| `emphasis: { disabled: true }` | ⭐⭐⭐ | 关闭 hover 效果 |
| `dataset` 共享 | ⭐⭐⭐ | 多 series 同源数据 |
| 服务端聚合 | ⭐⭐⭐⭐⭐ | 百万级以上 |
| Canvas 渲染 | ⭐⭐⭐ | 默认就是，别用 SVG |
| Web Worker 预处理 | ⭐⭐⭐ | 复杂数据计算 |

### 按需引入

```javascript
// 完整引入（约 1MB）
import * as echarts from 'echarts'

// 按需引入（推荐，减小体积）
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
} from 'echarts/components'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

// 注册组件
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
])
```

### 渲染模式

```javascript
// Canvas（默认，性能好）
const chart = echarts.init(dom, null, { renderer: 'canvas' })

// SVG（适合导出、打印）
const chart = echarts.init(dom, null, { renderer: 'svg' })
```

---

## 8. 地图

### 注册地图

```javascript
// 加载 GeoJSON 数据
fetch('/china.json')
  .then((res) => res.json())
  .then((geoJson) => {
    echarts.registerMap('china', geoJson)

    const chart = echarts.init(dom)
    const option = {
      series: [
        {
          type: 'map',
          map: 'china',
          data: [
            { name: '北京', value: 100 },
            { name: '上海', value: 200 },
          ],
        },
      ],
    }
    chart.setOption(option)
  })
```

### 地图配置

```javascript
const option = {
  visualMap: {
    min: 0,
    max: 100,
    left: 'left',
    text: ['高', '低'],
    calculable: true,
  },
  series: [
    {
      type: 'map',
      map: 'china',
      roam: true,  // 开启缩放和平移
      label: {
        show: true,
        fontSize: 10,
      },
      emphasis: {
        label: {
          show: true,
          color: '#fff',
        },
        itemStyle: {
          areaColor: '#ff6600',
        },
      },
      data: [
        { name: '北京', value: 100 },
        { name: '上海', value: 200 },
      ],
    },
  ],
}
```

### 散点地图

```javascript
const option = {
  geo: {
    map: 'china',
    roam: true,
  },
  series: [
    {
      type: 'scatter',
      coordinateSystem: 'geo',
      data: [
        { name: '北京', value: [116.46, 39.92, 100] },
        { name: '上海', value: [121.48, 31.22, 200] },
      ],
      symbolSize: (val) => val[2] / 10,
    },
  ],
}
```

---

## 9. 常见问题

### 图表不显示

```javascript
// 1. 容器没有宽高
<div id="chart" style="width: 600px; height: 400px;"></div>

// 2. 容器隐藏时初始化，显示后需要 resize
chart.resize()

// 3. 数据为空时显示提示
const option = {
  graphic: {
    type: 'text',
    left: 'center',
    top: 'center',
    style: {
      text: '暂无数据',
      fontSize: 20,
      fill: '#999',
    },
  },
}
```

### 更新数据

```javascript
// 方式 1：合并配置（默认）
chart.setOption({
  series: [{ data: newData }],
})

// 方式 2：替换配置（不合并）
chart.setOption(newOption, { notMerge: true })

// 方式 3：清空后重新设置
chart.clear()
chart.setOption(newOption)
```

### 导出图片

```javascript
// 导出为 base64
const dataUrl = chart.getDataURL({
  type: 'png',  // 'png' | 'jpg'
  pixelRatio: 2,  // 分辨率倍数
  backgroundColor: '#fff',
})

// 下载
const link = document.createElement('a')
link.download = 'chart.png'
link.href = dataUrl
link.click()
```

### 销毁图表

```javascript
// 组件卸载时销毁，释放内存
chart.dispose()
```

---

## 10. Vue 组件封装

### 通用图表组件

```vue
<template>
  <div ref="chartRef" :style="{ width, height }"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, toRefs } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  option: {
    type: Object,
    required: true,
  },
  width: {
    type: String,
    default: '100%',
  },
  height: {
    type: String,
    default: '400px',
  },
})

const { option } = toRefs(props)
const chartRef = ref(null)
let chart = null

onMounted(() => {
  chart = echarts.init(chartRef.value)
  chart.setOption(option.value)

  window.addEventListener('resize', () => chart?.resize())
})

onUnmounted(() => {
  chart?.dispose()
  window.removeEventListener('resize', () => chart?.resize())
})

watch(option, (newVal) => {
  chart?.setOption(newVal)
}, { deep: true })

// 暴露图表实例
defineExpose({ chart })
</script>
```

**使用：**

```vue
<template>
  <EChart :option="chartOption" height="500px" />
</template>

<script setup>
import { ref } from 'vue'
import EChart from './EChart.vue'

const chartOption = ref({
  xAxis: { type: 'category', data: ['A', 'B', 'C'] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [10, 20, 30] }],
})
</script>
```

---

## 附录：常用 API 速查

| API | 用途 |
|-----|------|
| `echarts.init(dom, theme)` | 初始化图表 |
| `chart.setOption(option)` | 设置配置 |
| `chart.resize()` | 调整大小 |
| `chart.dispose()` | 销毁图表 |
| `chart.on(event, handler)` | 绑定事件 |
| `chart.off(event, handler)` | 解绑事件 |
| `chart.getDataURL()` | 导出图片 |
| `chart.clear()` | 清空图表 |
| `echarts.registerMap(name, geoJson)` | 注册地图 |
| `echarts.registerTheme(name, theme)` | 注册主题 |
| `echarts.connect([chart1, chart2])` | 图表联动 |
