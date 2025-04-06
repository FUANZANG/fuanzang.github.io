# 虚拟列表 / 虚拟滚动

## 核心概念

### 什么是虚拟滚动

+ 只渲染可视区域内的 DOM 元素，而非一次性渲染全部数据
+ 适用于长列表（成千上万条数据），解决 DOM 节点过多导致的性能问题
+ 核心思想：**滚动时动态替换可视区域的内容**

### 解决的问题

+ 大量 DOM 节点 → 内存占用高、渲染慢
+ 首次渲染白屏时间长
+ 滚动卡顿、掉帧
+ 浏览器 DOM 节点上限（Chrome 约 10w+ 节点开始卡顿）

## 实现原理

### 基础版（固定高度）

```
┌─────────────────────┐
│     撑开容器         │  ← height = totalItems * itemHeight
│  ┌───────────────┐  │
│  │  transform     │  │  ← 偏移定位可视区域
│  │ ┌───────────┐ │  │
│  │ │ 可视区域   │ │  │  ← 只渲染这部分
│  │ │ item N    │ │  │
│  │ │ item N+1  │ │  │
│  │ │ item N+2  │ │  │
│  │ └───────────┘ │  │
│  └───────────────┘  │
└─────────────────────┘
```

+ 外层容器设置 `height = 总数据量 × 单项高度`，撑开滚动条
+ 内层容器用 `transform: translateY()` 或 `padding-top/bottom` 定位
+ 监听 `scroll` 事件，计算当前可视区域应渲染的数据范围

### 核心计算

```js
// 固定高度
const itemHeight = 50
const visibleCount = Math.ceil(containerHeight / itemHeight)
const startIndex = Math.floor(scrollTop / itemHeight)
const endIndex = startIndex + visibleCount

// 渲染数据
const visibleData = data.slice(startIndex, endIndex)

// 偏移量
const offsetY = scrollTop - (scrollTop % itemHeight)
```

### 关键要素

+ **可视区域计算**：`containerHeight / itemHeight`
+ **起始索引**：`Math.floor(scrollTop / itemHeight)`
+ **结束索引**：`startIndex + visibleCount + buffer`
+ **缓冲区**：上下各多渲染几个，避免快速滚动白屏
+ **偏移定位**：`transform` / `padding` / `absolute` 定位

## 关键技术点

### 滚动监听优化

+ `requestAnimationFrame` 节流
+ `passive: true` 提升滚动性能
+ 防抖 / 节流处理 scroll 事件

  ```js
  container.addEventListener('scroll', () => {
    requestAnimationFrame(() => {
      const scrollTop = container.scrollTop
      // 更新 startIndex / endIndex
    })
  }, { passive: true })
  ```

### 不定高处理

+ 预估高度 + 实际高度缓存
+ 渲染后测量真实高度，更新累计高度数组
+ 二分查找定位 startIndex

  ```js
  // 缓存每项实际高度
  const heightMap = new Map()

  // 获取累计高度（用于定位）
  function getCumulativeHeight(index) {
    let total = 0
    for (let i = 0; i < index; i++) {
      total += heightMap.get(i) || estimatedHeight
    }
    return total
  }
  ```

### 横向虚拟滚动

+ 原理相同，监听 `scrollLeft`
+ 计算 `startIndex` 基于水平偏移
+ 常用于表格列虚拟化

### 动态数据更新

+ 数据增删后重新计算高度和索引
+ 保持滚动位置不跳动（锚定策略）
+ 插入/删除时局部更新而非全量重渲染

## 常用库

| 库 | 特点 |
|---|---|
| **vue-virtual-scroller** | Vue 生态，支持固定/不定高、横向/纵向 |
| **vue-virtual-scroll-list** | Vue 2/3，轻量，支持不定高 |
| **react-window** | React 生态，轻量（<10KB），固定/不定高 |
| **react-virtuoso** | React，功能丰富，支持动态高度、分组 |
| **tanstack-virtual** | 框架无关，headless 虚拟滚动 |
| **virtual-list** | 原生 JS 实现，无框架依赖 |

## 进阶场景

### 无限滚动 + 虚拟列表

+ 滚动到底部触发加载下一页
+ 已加载数据用虚拟列表渲染
+ 结合分页 API + 数据缓存

  ```js
  // 滚动到底部加载
  if (endIndex >= data.length - buffer) {
    loadMore()
  }
  ```

### 虚拟表格

+ 行虚拟化（常见）+ 列虚拟化
+ 固定列 / 固定表头
+ 单元格按需渲染
+ 常用：vxe-table / ag-Grid / TanStack Table

### 虚拟树形列表

+ 树节点扁平化后做虚拟滚动
+ 展开/折叠时动态更新扁平数组
+ 层级缩进 + 图标渲染

### 锚定滚动位置

+ 顶部插入数据时保持当前可视项不跳动
+ 记录锚定项索引 + 偏移量
+ 数据更新后重新计算 scrollTop

  ```js
  // 锚定策略
  const anchorIndex = startIndex
  const anchorOffset = scrollTop - getCumulativeHeight(anchorIndex)

  // 数据更新后
  const newAnchorTop = getCumulativeHeight(anchorIndex)
  container.scrollTop = newAnchorTop + anchorOffset
  ```

### 性能优化

+ `will-change: transform` 开启 GPU 加速
+ 避免在 scroll 回调中触发响应式更新
+ 使用 `ResizeObserver` 监听容器尺寸变化
+ 组件级 memo / 缓存，避免无关组件重渲染

## 实现思路（Vue 3 示例）

```vue
<template>
  <div ref="container" class="virtual-list" @scroll="onScroll">
    <div class="phantom" :style="{ height: totalHeight + 'px' }"></div>
    <div class="content" :style="{ transform: `translateY(${offsetY}px)` }">
      <div
        v-for="item in visibleData"
        :key="item.id"
        class="item"
        :style="{ height: itemHeight + 'px' }"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  data: Array,
  itemHeight: { type: Number, default: 50 },
  buffer: { type: Number, default: 5 }
})

const container = ref(null)
const scrollTop = ref(0)
const containerHeight = ref(0)

const totalHeight = computed(() => props.data.length * props.itemHeight)

const visibleCount = computed(() =>
  Math.ceil(containerHeight.value / props.itemHeight)
)

const startIndex = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight)
  return Math.max(0, start - props.buffer)
})

const endIndex = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight)
  return Math.min(
    props.data.length,
    start + visibleCount.value + props.buffer
  )
})

const visibleData = computed(() =>
  props.data.slice(startIndex.value, endIndex.value)
)

const offsetY = computed(() =>
  startIndex.value * props.itemHeight
)

function onScroll() {
  scrollTop.value = container.value.scrollTop
}

onMounted(() => {
  containerHeight.value = container.value.clientHeight
})
</script>

<style scoped>
.virtual-list {
  overflow-y: auto;
  position: relative;
}
.phantom {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
}
.content {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  will-change: transform;
}
</style>
```

## 选型建议

| 场景 | 推荐方案 |
|---|---|
| Vue 项目 | vue-virtual-scroller / vue-virtual-scroll-list |
| React 项目 | react-window / react-virtuoso |
| 框架无关 | tanstack-virtual |
| 虚拟表格 | vxe-table / ag-Grid |
| 简单场景 | 自己实现（固定高度 50 行代码） |
