# 小程序开发

> 📌 本文件记录小程序开发相关知识：原生小程序、跨端框架（uni-app、Taro、Mpx）、小程序架构原理、性能优化、常见踩坑等。
>
> 📅 基于以下版本：微信小程序基础库 3.x | uni-app 3.x（Vue 3 + Vite） | Taro 4.x | Mpx 2.x
>
> 🔗 跨端开发相关：[React Native](/notes/cross-platform/react-native)（移动端原生）、[Electron](/notes/cross-platform/electron)（桌面端）

---

## 1. 小程序平台概览

```
主流小程序平台：

┌──────────────┬──────────────┬──────────────┐
│  微信系        │  支付宝系      │  字节系        │
├──────────────┼──────────────┼──────────────┤
│ 微信小程序     │ 支付宝小程序   │ 抖音小程序     │
│ QQ 小程序     │ 钉钉小程序    │ 飞书小程序     │
│ 企业微信小程序 │ 淘宝小程序    │ 头条小程序     │
├──────────────┼──────────────┼──────────────┤
│  百度系        │  快手系        │  其他          │
├──────────────┼──────────────┼──────────────┤
│ 百度小程序     │ 快手小程序    │ 京东小程序     │
│              │              │ 小红书小程序   │
│              │              │ 360 小程序    │
└──────────────┴──────────────┴──────────────┘
```

### 选型决策树

```
需要开发小程序？
  ├─ 只做微信 → 原生开发 或 uni-app/Taro
  ├─ 需要多端（微信 + 支付宝 + 抖音等）→ 跨端框架
  │    ├─ 团队熟悉 Vue → uni-app（首选）或 Mpx
  │    ├─ 团队熟悉 React → Taro
  │    └─ 追求极致性能、渐进迁移原生项目 → Mpx
  ├─ 需要同时出 H5/APP → uni-app（支持最全）或 Taro
  └─ 只做支付宝/钉钉 → 支付宝小程序原生 或 uni-app
```

---

## 2. 微信小程序原生开发

### 2.1 目录结构

```
project/
├── app.js              # 小程序逻辑（必需）
├── app.json            # 全局配置（必需）
├── app.wxss            # 全局样式
├── project.config.json # 项目配置
├── sitemap.json        # 搜索优化配置
│
├── pages/
│   ├── index/
│   │   ├── index.js    # 页面逻辑（必需）
│   │   ├── index.wxml  # 页面结构（必需）
│   │   ├── index.json  # 页面配置
│   │   └── index.wxss  # 页面样式
│   └── logs/
│       ├── logs.js
│       ├── logs.wxml
│       ├── logs.json
│       └── logs.wxss
│
├── components/         # 自定义组件
├── utils/              # 工具函数
└── static/             # 静态资源
```

### 2.2 全局配置 app.json

```json
{
  "pages": [
    "pages/index/index",
    "pages/logs/logs"
  ],
  "window": {
    "navigationBarTitleText": "小程序",
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#f6f6f6"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#1296db",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "static/tab-home.png",
        "selectedIconPath": "static/tab-home-active.png"
      },
      {
        "pagePath": "pages/logs/logs",
        "text": "日志",
        "iconPath": "static/tab-log.png",
        "selectedIconPath": "static/tab-log-active.png"
      }
    ]
  },
  "permission": {
    "scope.userLocation": {
      "desc": "用于定位"
    }
  }
}
```

### 2.3 页面注册与生命周期

```js
// pages/index/index.js
Page({
  data: {
    list: [],
    loading: false
  },

  // 页面加载（只触发一次）
  onLoad(options) {
    // options 是页面参数，如 /pages/index/index?id=123
    console.log('页面参数:', options.id)
    this.fetchData()
  },

  // 页面显示（每次切到前台都触发）
  onShow() {},

  // 页面初次渲染完成（只触发一次）
  onReady() {},

  // 页面隐藏（切到后台触发）
  onHide() {},

  // 页面卸载（redirectTo、navigateBack 触发）
  onUnload() {},

  // 下拉刷新（需在 json 中开启 enablePullDownRefresh）
  onPullDownRefresh() {
    this.fetchData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 上拉触底
  onReachBottom() {
    this.loadMore()
  },

  // 页面滚动
  onPageScroll(e) {
    console.log('scrollTop:', e.scrollTop)
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '分享标题',
      path: '/pages/index/index?id=123'
    }
  },

  // 事件处理
  onTapItem(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 数据更新（必须通过 setData）
  async fetchData() {
    this.setData({ loading: true })
    const res = await wx.request({ url: 'https://api.example.com/list' })
    this.setData({
      list: res.data,
      loading: false
    })
  }
})
```

### 2.4 WXML 模板语法

```xml
<!-- 数据绑定 -->
<view>{{message}}</view>
<view>{{items.length > 0 ? '有数据' : '无数据'}}</view>

<!-- 列表渲染 -->
<view wx:for="{{list}}" wx:key="id" wx:for-item="item">
  <text>{{index}}: {{item.name}}</text>
</view>

<!-- 条件渲染 -->
<view wx:if="{{isLoggedIn}}">已登录</view>
<view wx:elif="{{isGuest}}">游客</view>
<view wx:else>未登录</view>

<!-- 模板 -->
<template name="userCard">
  <view class="card">
    <text>{{name}}</text>
    <text>{{age}}</text>
  </view>
</template>
<template is="userCard" data="{{...userInfo}}" />

<!-- 引用 -->
<import src="userCard.wxml" />
<include src="header.wxml" />

<!-- 事件绑定 -->
<button bindtap="onTap">点击</button>
<button catchtap="onTap">点击（阻止冒泡）</button>
<input bindinput="onInput" placeholder="请输入" />

<!-- 数据绑定（注意：小程序数据绑定是单向的，需 setData 更新） -->
<input value="{{inputValue}}" bindinput="onInput" />
```

### 2.5 WXSS 样式

```css
/* WXSS 特性 */
/* 1. 支持大部分 CSS 语法 */
/* 2. 不支持 * 通配符选择器 */
/* 3. 尺寸单位推荐使用 rpx（响应式像素） */

/* rpx 换算：750rpx = 屏幕宽度 */
.container {
  width: 750rpx;
  padding: 32rpx;
}

/* 样式导入 */
@import './common.wxss';

/* 选择器限制 */
/* 支持：.class, #id, element, element, element::after */
/* 不支持：* 通配符、:nth-child 等复杂伪类 */
```

### 2.6 自定义组件

```js
// components/my-component/my-component.js
Component({
  // 属性
  properties: {
    title: {
      type: String,
      value: '默认标题'
    },
    count: {
      type: Number,
      observer(newVal, oldVal) {
        console.log('count 变化:', oldVal, '->', newVal)
      }
    }
  },

  // 内部数据
  data: {
    internalState: false
  },

  // 方法
  methods: {
    onTap() {
      // 触发父组件事件
      this.triggerEvent('tap', { value: this.data.count })
    }
  },

  // 生命周期
  lifetimes: {
    attached() {
      console.log('组件进入页面节点树')
    },
    detached() {
      console.log('组件离开页面节点树')
    }
  }
})
```

```xml
<!-- 使用组件 -->
<!-- 在页面 json 中注册：
{
  "usingComponents": {
    "my-component": "/components/my-component/my-component"
  }
}
-->
<my-component title="自定义标题" count="{{count}}" bind:tap="onComponentTap" />
```

---

## 3. uni-app 开发

### 3.1 项目结构

```
project/
├── pages/              # 业务页面
│   ├── index/
│   │   └── index.vue
│   └── list/
│       └── list.vue
├── components/         # 公共组件
├── static/             # 静态资源
├── store/              # Pinia/Vuex 状态管理
├── utils/              # 工具函数
├── uni_modules/        # uni-app 插件
├── platforms/          # 平台专用代码（条件编译）
│
├── pages.json          # 页面路由配置
├── manifest.json       # 应用配置
├── uni.scss            # 全局 scss 变量
├── App.vue             # 应用入口
├── main.js             # 入口文件
└── vite.config.js      # Vite 配置（Vue3 版）
```

### 3.2 页面配置 pages.json

```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "首页",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/list/list",
      "style": {
        "navigationBarTitleText": "列表"
      }
    }
  ],
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "uni-app",
    "navigationBarBackgroundColor": "#ffffff",
    "backgroundColor": "#f6f6f6"
  },
  "tabBar": {
    "color": "#999",
    "selectedColor": "#1296db",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "static/tab-home.png",
        "selectedIconPath": "static/tab-home-active.png"
      },
      {
        "pagePath": "pages/list/list",
        "text": "列表",
        "iconPath": "static/tab-list.png",
        "selectedIconPath": "static/tab-list-active.png"
      }
    ]
  }
}
```

### 3.3 页面开发（Vue 3 Composition API）

```vue
<template>
  <view class="container">
    <view v-for="item in list" :key="item.id" class="card" @tap="goDetail(item.id)">
      <text>{{ item.name }}</text>
    </view>
    <view v-if="loading" class="loading">加载中...</view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const list = ref([])
const loading = ref(false)

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  const res = await uni.request({
    url: 'https://api.example.com/list'
  })
  list.value = res.data
  loading.value = false
}

function goDetail(id) {
  uni.navigateTo({
    url: `/pages/detail/detail?id=${id}`
  })
}

// 下拉刷新
onPullDownRefresh(() => {
  fetchData().then(() => {
    uni.stopPullDownRefresh()
  })
})
</script>

<style scoped>
.container {
  padding: 32rpx;
}
.card {
  padding: 24rpx;
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}
</style>
```

### 3.4 条件编译

```vue
<template>
  <!-- #ifdef MP-WEIXIN -->
  <button open-type="getUserInfo" @getuserinfo="onGetUserInfo">
    微信登录
  </button>
  <!-- #endif -->

  <!-- #ifdef MP-ALIPAY -->
  <button onClick="onAlipayLogin">支付宝登录</button>
  <!-- #endif -->

  <!-- #ifdef H5 -->
  <div>H5 端专属内容</div>
  <!-- #endif -->
</template>

<script setup>
// #ifdef MP-WEIXIN
function onGetUserInfo(e) {
  console.log('微信用户信息:', e.detail)
}
// #endif

// #ifdef MP-ALIPAY
function onAlipayLogin() {
  // 支付宝登录逻辑
}
// #endif
</script>

<!--
条件编译语法：
  #ifdef    仅在某平台编译
  #ifndef   除某平台外都编译
  #endif    结束条件编译

平台标识：
  MP-WEIXIN    微信小程序
  MP-ALIPAY    支付宝小程序
  MP-BAIDU     百度小程序
  MP-TOUTIAO   抖音小程序
  MP-LARK      飞书小程序
  MP-QQ        QQ 小程序
  MP-KUAISHOU  快手小程序
  MP-JD        京东小程序
  MP-360       360 小程序
  MP           所有小程序
  H5           Web
  APP-PLUS     App
  APP-ANDROID  Android App
  APP-IOS      iOS App
-->
```

### 3.5 跨端 API 差异处理

```js
// uni-app 统一 API，前缀 wx/my/bn/tt 替换为 uni
// 大部分 API 直接用 uni.xxx 即可

// 获取系统信息
const systemInfo = uni.getSystemInfoSync()
console.log(systemInfo.platform) // 'ios' / 'android'
console.log(systemInfo.statusBarHeight)

// 网络请求
uni.request({
  url: 'https://api.example.com/data',
  method: 'GET',
  header: { 'Authorization': 'Bearer xxx' },
  success: (res) => {
    console.log(res.data)
  }
})

// 本地存储
uni.setStorageSync('token', 'xxx')
const token = uni.getStorageSync('token')

// 路由跳转
uni.navigateTo({ url: '/pages/detail/detail?id=1' })
uni.redirectTo({ url: '/pages/login/login' })
uni.switchTab({ url: '/pages/index/index' })  // tabBar 页面
uni.navigateBack({ delta: 1 })

// 文件上传
uni.chooseImage({
  count: 1,
  success: (res) => {
    uni.uploadFile({
      url: 'https://api.example.com/upload',
      filePath: res.tempFilePaths[0],
      name: 'file',
      success: (uploadRes) => {
        console.log(uploadRes.data)
      }
    })
  }
})
```

---

## 4. Taro 开发

### 4.1 简介

```
Taro 是京东开源的开放式跨端跨框架解决方案。

特点：
  - 支持 React / Vue / Nerv 开发
  - 输出微信/支付宝/百度/抖音/QQ 小程序、H5、React Native
  - 37.6k GitHub Stars（2026-07）
  - Taro 4.x 基于 Vite 构建
```

### 4.2 项目结构

```
project/
├── src/
│   ├── app.js          # 应用入口
│   ├── app.config.js   # 全局配置
│   ├── pages/
│   │   └── index/
│   │       ├── index.jsx       # React 页面
│   │       └── index.config.js # 页面配置
│   └── components/
├── config/
│   ├── index.js        # 构建配置
│   └── dev.js
├── project.config.json
└── package.json
```

### 4.3 React 页面示例

```jsx
// src/pages/index/index.jsx
import { View, Text, Button } from '@tarojs/components'
import { useLoad, navigateTo } from '@tarojs/taro'
import { useState } from 'react'

export default function Index() {
  const [list, setList] = useState([])

  useLoad((options) => {
    console.log('页面参数:', options.id)
    fetchData()
  })

  async function fetchData() {
    const res = await Taro.request({ url: 'https://api.example.com/list' })
    setList(res.data)
  }

  function goDetail(id) {
    navigateTo({ url: `/pages/detail/detail?id=${id}` })
  }

  return (
    <View className="container">
      {list.map(item => (
        <View key={item.id} className="card" onClick={() => goDetail(item.id)}>
          <Text>{item.name}</Text>
        </View>
      ))}
    </View>
  )
}
```

```js
// src/pages/index/index.config.js
export default definePageConfig({
  navigationBarTitleText: '首页',
  enablePullDownRefresh: true
})
```

### 4.4 全局配置

```js
// src/app.config.js
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/detail/detail'
  ],
  tabBar: {
    color: '#999',
    selectedColor: '#1296db',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/tab-home.png',
        selectedIconPath: 'assets/tab-home-active.png'
      }
    ]
  },
  window: {
    navigationBarTitleText: 'Taro 小程序',
    navigationBarBackgroundColor: '#ffffff'
  }
})
```

---

## 5. Mpx 开发

### 5.1 简介

```
Mpx 是滴滴开源的增强型跨端小程序框架。

特点：
  - 基于 Vue 语法增强，支持 Composition API
  - 专注小程序跨端，输出所有小程序平台 + Web
  - 运行时仅 60KB（压缩后）
  - 完整兼容原生小程序技术规范
  - 支持渐进迁移（可在原生项目中使用 Mpx 组件）
  - 深度性能优化（setData 优化、包体积分析）
```

### 5.2 项目结构

```
project/
├── src/
│   ├── app.mpx         # 应用入口（.mpx 单文件组件）
│   ├── pages/
│   │   └── index.mpx
│   └── components/
├── package.json
└── mpx.conf.js         # Mpx 配置
```

### 5.3 单文件组件示例

```html
<!-- src/pages/index.mpx -->
<template>
  <view class="container">
    <view wx:for="{{list}}" wx:key="id" class="card" bindtap="goDetail">
      <text>{{item.name}}</text>
    </view>
  </view>
</template>

<script>
import { createPage } from '@mpxjs/core'

createPage({
  data: {
    list: []
  },
  onLoad() {
    this.fetchData()
  },
  async fetchData() {
    const res = await mpx.request({
      url: 'https://api.example.com/list'
    })
    this.list = res.data
  },
  goDetail(e) {
    const { id } = e.currentTarget.dataset
    mpx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  }
})
</script>

<style lang="less">
.container {
  padding: 32rpx;
}
.card {
  padding: 24rpx;
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}
</style>
```

---

## 6. 框架对比

| | 原生微信小程序 | uni-app | Taro | Mpx |
|---|---|---|---|---|
| **框架** | MINA | Vue 2/3 | React/Vue/Nerv | Vue 增强 |
| **构建工具** | 微信开发者工具 | Vue2: webpack / Vue3: Vite | Taro 4: Vite | webpack |
| **跨端能力** | 仅微信 | 最全（15+ 平台） | 较全（10+ 平台） | 专注小程序 + Web |
| **包体积** | 最小 | 中等 | 中等 | 较小（60KB runtime） |
| **运行性能** | 最好 | 好 | 好 | 接近原生 |
| **原生兼容** | 原生 | 需适配 | 需适配 | 完整兼容 |
| **学习成本** | 低（微信专属） | 低（Vue 开发者） | 中（React 开发者） | 中 |
| **TypeScript** | 支持 | 支持 | 支持 | 支持 |
| **IDE 支持** | 微信开发者工具 | HBuilderX / VS Code | VS Code | VS Code |
| **适用场景** | 仅微信 | 多端 + H5 + APP | 多端 + H5 + RN | 多端小程序 |

---

## 7. 小程序架构原理

### 7.1 双线程模型

```
┌─────────────────┐              ┌─────────────────┐
│   逻辑层          │   Native    │   视图层          │
│  (JsCore/Js引擎)  │  ←──────→  │  (WebView)       │
│                  │   桥接通信   │                  │
│  - 业务逻辑       │              │  - WXML 渲染     │
│  - 数据处理       │              │  - WXSS 样式     │
│  - API 调用       │              │  - 用户交互      │
│  - 网络请求       │              │                  │
└─────────────────┘              └─────────────────┘

通信机制：
  1. 逻辑层 setData({ data }) → 通过 Native 桥接 → 视图层更新
  2. 视图层用户事件 → 通过 Native 桥接 → 逻辑层事件处理函数
  3. 数据传输是序列化的 JSON，大数据量会导致性能问题
```

### 7.2 与 Web 开发的核心差异

```
┌──────────────┬─────────────────┬──────────────────┐
│              │ Web             │ 小程序             │
├──────────────┼─────────────────┼──────────────────┤
│ 运行环境      │ 浏览器           │ App 内嵌 WebView  │
│ DOM 操作      │ 可以             │ 不可以            │
│ window 对象   │ 有              │ 无               │
│ BOM API      │ 完整             │ 受限（无 location）│
│ 样式单位      │ px/rem/vw       │ rpx（响应式）      │
│ 路由          │ 浏览器 History   │ 框架管理（栈式）    │
│ 数据更新      │ 直接修改 DOM     │ setData 驱动      │
│ 包体积        │ 无限制           │ 主包 2MB / 分包 20MB│
│ Cookie        │ 有              │ 无（用 Storage）   │
│ 请求          │ fetch/XHR       │ wx.request（独立） │
└──────────────┴─────────────────┴──────────────────┘
```

---

## 8. 性能优化

### 8.1 setData 优化

```js
// ❌ 错误：频繁 setData
handleScroll(e) {
  this.setData({ scrollTop: e.detail.scrollTop })
}

// ✅ 正确：合并 setData、减少频率
handleScroll: throttle(function(e) {
  this.setData({ scrollTop: e.detail.scrollTop })
}, 100)

// ❌ 错误：传输大量数据
this.setData({ list: this.data.list.concat(newItems) })

// ✅ 正确：使用路径更新
this.setData({
  [`list[${this.data.list.length}]`]: newItem
})

// ❌ 错误：每次 setData 都传整个对象
this.setData({
  'userInfo.name': '张三',
  'userInfo.age': 25,
  'userInfo.avatar': 'url'
})

// ✅ 正确：一次 setData 更新多个字段
this.setData({
  'userInfo.name': '张三',
  'userInfo.age': 25,
  'userInfo.avatar': 'url'
})
```

### 8.2 分包加载

```json
// app.json
{
  "pages": [
    "pages/index/index",
    "pages/login/login"
  ],
  "subpackages": [
    {
      "root": "packageA",
      "name": "shop",
      "pages": [
        "pages/goods/list",
        "pages/goods/detail"
      ]
    },
    {
      "root": "packageB",
      "name": "user",
      "pages": [
        "pages/user/profile",
        "pages/user/orders"
      ]
    }
  ],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["shop"]
    }
  }
}
```

```
主包限制：2MB
单个分包限制：2MB
总限制：20MB（包含主包）

分包策略：
  1. 首页相关放主包
  2. 按业务模块拆分分包
  3. 使用 preloadRule 预加载
  4. 独立分包可独立运行（不需要下载主包）
```

### 8.3 图片与资源优化

```js
// 图片优化
// 1. 使用 WebP 格式（比 PNG 小 26%）
// 2. 使用 CDN 图片（不放入小程序包内）
// 3. 小图标用 iconfont 或 SVG（比 PNG 小很多）
// 4. 大图使用懒加载

// 懒加载组件
<image lazy-load src="{{item.image}}" mode="aspectFill" />

// 长列表优化：虚拟列表
// 使用 wxs 处理滚动事件（在视图层执行，不走逻辑层通信）
```

### 8.4 长列表优化

```js
// 虚拟列表原理：只渲染可见区域的数据
// 1. 计算可视区域能显示多少条数据
// 2. 滚动时动态计算起始索引和结束索引
// 3. 只 setData 当前可见区域的数据
// 4. 使用 transform 模拟滚动位置

// 推荐使用成熟的虚拟列表组件：
// - miniprogram-virtual-list（微信官方）
// - @uni-ui/uni-list（uni-app）
```

---

## 9. 小程序登录流程

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  小程序    │    │  微信服务器 │    │  开发者服务器│    │  微信服务器 │
│  前端     │    │          │    │          │    │          │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │
     │ 1.wx.login()  │               │               │
     │──────────────→│               │               │
     │               │               │               │
     │ 2.返回 code    │               │               │
     │←──────────────│               │               │
     │               │               │               │
     │ 3.发送 code    │               │               │
     │───────────────┼──────────────→│               │
     │               │               │               │
     │               │               │ 4.code2Session │
     │               │               │──────────────→│
     │               │               │               │
     │               │               │ 5.openid/session_key
     │               │               │←──────────────│
     │               │               │               │
     │               │               │ 6.生成自定义token│
     │               │               │───────────────┼→
     │               │               │               │
     │ 7.返回 token   │               │               │
     │←──────────────┼───────────────│               │
     │               │               │               │
```

```js
// 前端登录代码
async function login() {
  // 1. 获取 code
  const { code } = await wx.login()

  // 2. 发送到开发者服务器
  const res = await wx.request({
    url: 'https://api.example.com/login',
    method: 'POST',
    data: { code }
  })

  // 3. 保存 token
  wx.setStorageSync('token', res.data.token)
}
```

---

## 10. 常见踩坑

### setData 是异步的

```js
// ❌ setData 后立即读取数据，拿到的是旧值
this.setData({ count: 1 })
console.log(this.data.count) // 可能还是 0

// ✅ 使用回调或 nextTick
this.setData({ count: 1 }, () => {
  console.log(this.data.count) // 1
})

// Vue 项目中使用 nextTick
this.count = 1
await nextTick()
console.log(this.count) // 1
```

### 小程序不支持 DOM 操作

```js
// ❌ 错误：尝试操作 DOM
document.querySelector('.box').style.display = 'none'

// ✅ 正确：通过数据驱动
this.setData({ showBox: false })
// 模板中：<view wx:if="{{showBox}}">...</view>
```

### rpx 与 px 换算

```
rpx（responsive pixel）：响应式像素
  - 规定屏幕宽为 750rpx
  - 在 iPhone 6 上：1rpx = 0.5px = 1 物理像素
  - 在不同屏幕宽度下自动换算

  750rpx = 屏幕宽度（任何设备）
  设计稿宽度 750px → 1px 设计稿 = 1rpx
  设计稿宽度 375px → 1px 设计稿 = 2rpx
```

### 请求域名白名单

```
小程序网络请求必须在微信公众平台配置合法域名：
  - 开发阶段可在「详情 → 本地设置」勾选「不校验合法域名」
  - 正式版必须配置，否则请求会被拦截
  - 每个小程序最多配置 200 个域名
  - 域名必须备案，且支持 HTTPS
```

### 分包跳转路径

```js
// ❌ 错误：分包页面路径写错
wx.navigateTo({ url: '/pages/goods/detail' })

// ✅ 正确：分包页面需要带 root 路径
wx.navigateTo({ url: '/packageA/pages/goods/detail' })

// 跨分包引用组件
// 在 page.json 中配置 usingComponents
{
  "usingComponents": {
    "my-comp": "/packageA/components/my-comp"
  }
}
```

---

## 11. 最佳实践

### 项目规范

```
1. 目录规范
   - pages/       业务页面
   - components/  公共组件
   - store/       状态管理
   - utils/       工具函数
   - api/         接口封装
   - assets/      静态资源

2. 命名规范
   - 页面文件夹：kebab-case（user-profile）
   - 组件文件：PascalCase（UserCard.vue）
   - API 函数：camelCase（getUserInfo）

3. 版本管理
   - 主包控制在 1.5MB 以内（留余量）
   - 合理使用分包
   - 静态资源放 CDN
```

### 跨端开发建议

```
1. 统一 API 层
   - 封装请求、存储、路由等常用 API
   - 处理平台差异在封装层统一解决

2. 条件编译最小化
   - 能用 API 解决的不用条件编译
   - 平台差异代码集中在独立文件

3. 测试策略
   - 优先测试目标平台
   - 使用条件编译在不同平台输出不同调试代码

4. UI 组件库选择
   - uni-app: uView / uni-ui / uv-ui
   - Taro: NutUI / Taro UI / taroify
   - 原生: WeUI / Vant Weapp
```

---

## 参考

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [uni-app 官方文档](https://uniapp.dcloud.net.cn/)
- [Taro 官方文档](https://taro.zone/)
- [Mpx 官方文档](https://mpxjs.cn/)
- [小程序性能优化指南](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/)
