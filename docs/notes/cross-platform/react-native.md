# React Native 笔记

> 📌 本文件记录 React Native 核心概念、组件、API 与实战技巧。React 基础请查看 [React 笔记](/notes/frameworks/react)

<!-- 基于 React Native 0.76+ (New Architecture) -->

---

## 1. 环境搭建与项目结构

### 创建项目

```bash
# 使用 Expo（推荐，开箱即用）
npx create-expo-app MyApp
cd MyApp
npx expo start

# 使用 React Native CLI（需要原生开发能力）
npx @react-native-community/cli init MyApp
cd MyApp
npx react-native run-ios     # macOS only
npx react-native run-android  # 需要 Android SDK
```

### 项目结构（Expo）

```
MyApp/
├── app/                  # Expo Router 页面（文件系统路由）
│   ├── _layout.tsx       # 根布局
│   ├── index.tsx         # 首页
│   └── (tabs)/           # Tab 路由组
│       ├── _layout.tsx
│       ├── home.tsx
│       └── profile.tsx
├── components/           # 可复用组件
├── constants/            # 主题、颜色、尺寸常量
├── hooks/                # 自定义 Hooks
├── assets/               # 图片、字体
├── app.json              # Expo 配置
└── package.json
```

### 核心区别：React vs React Native

```jsx
// React（Web）
import { useState } from 'react'
function App() {
  return <div className="container"><h1>Hello</h1></div>
}

// React Native（无 DOM，用原生组件）
import { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
function App() {
  return (
    <View style={styles.container}>
      <Text>Hello</Text>
    </View>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
})
```

---

## 2. 核心组件

### 基础组件

```jsx
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, FlatList, SectionList } from 'react-native'

// View — 类似 div（容器，不支持文字，需嵌套 Text）
<View style={{ flex: 1, padding: 16 }}>
  <Text style={{ fontSize: 18, fontWeight: 'bold' }}>标题</Text>
</View>

// Text — 唯一能显示文字的组件（支持嵌套）
<Text>
  普通文字
  <Text style={{ color: 'red' }}>红色文字</Text>
</Text>

// Image
<Image
  source={{ uri: 'https://example.com/img.png' }}  // 网络图片必须指定宽高
  style={{ width: 100, height: 100, borderRadius: 50 }}
/>
<Image source={require('../assets/logo.png')} />     // 本地图片（静态资源）

// TouchableOpacity — 可点击（带透明度反馈）
<TouchableOpacity onPress={() => console.log('pressed')} activeOpacity={0.7}>
  <Text>点我</Text>
</TouchableOpacity>

// TextInput
<TextInput
  value={text}
  onChangeText={setText}
  placeholder="请输入..."
  keyboardType="numeric"        // 键盘类型
  secureTextEntry               // 密码模式
  multiline                     // 多行
  autoFocus
  style={{ borderWidth: 1, padding: 8, borderRadius: 4 }}
/>
```

### 列表组件

```jsx
// FlatList — 高性能长列表（懒加载）
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item, index }) => (
    <View style={styles.row}>
      <Text>{item.title}</Text>
    </View>
  )}
  ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
  ListHeaderComponent={() => <Text>头部</Text>}
  ListEmptyComponent={() => <Text>暂无数据</Text>}
  onEndReached={() => loadMore()}       // 滚动到底部触发
  onEndReachedThreshold={0.5}           // 距底部 50% 时触发
  refreshing={refreshing}
  onRefresh={() => handleRefresh()}     // 下拉刷新
/>

// SectionList — 分组列表
<SectionList
  sections={[
    { title: 'A', data: ['Apple', 'Avocado'] },
    { title: 'B', data: ['Banana', 'Blueberry'] },
  ]}
  keyExtractor={(item) => item}
  renderItem={({ item }) => <Text>{item}</Text>}
  renderSectionHeader={({ section }) => <Text style={{ fontWeight: 'bold' }}>{section.title}</Text>}
/>

// ScrollView — 短内容滚动（一次性渲染所有子元素，不适合长列表）
<ScrollView showsVerticalScrollIndicator={false}>
  {items.map(item => <Item key={item.id} data={item} />)}
</ScrollView>
```

### 模态与弹窗

```jsx
import { Modal, Alert, ActionSheetIOS, Platform } from 'react-native'

// Modal
const [visible, setVisible] = useState(false)
<Modal visible={visible} animationType="slide" transparent>
  <View style={styles.overlay}>
    <View style={styles.modal}>
      <Text>弹窗内容</Text>
      <Button title="关闭" onPress={() => setVisible(false)} />
    </View>
  </View>
</Modal>

// Alert
Alert.alert('标题', '内容', [
  { text: '取消', style: 'cancel' },
  { text: '确定', onPress: handleConfirm },
])

// ActionSheet（iOS 原生，Android 需用第三方库）
ActionSheetIOS.showActionSheetWithOptions(
  { options: ['拍照', '相册', '取消'], cancelButtonIndex: 2 },
  (buttonIndex) => { /* ... */ }
)
```

---

## 3. 样式系统

### Flexbox 布局

```jsx
// ⚠️ 默认 flexDirection: 'column'（与 Web 的 row 不同！）
// 其他默认值：flexShrink: 1, alignItems: 'flex-start'

// 水平排列
<View style={{ flexDirection: 'row' }}>
  <View style={{ flex: 1, backgroundColor: 'red' }} />
  <View style={{ flex: 2, backgroundColor: 'blue' }} />
</View>

// 居中
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
  <Text>居中</Text>
</View>

// 间距：margin 支持 auto（类似 Web）
<View style={{ marginTop: 'auto' }}>  {/* 推到底部 */}
  <Text>底部</Text>
</View>
```

### StyleSheet 与动态样式

```jsx
import { StyleSheet, useWindowDimensions, Platform } from 'react-native'

// 静态样式
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  text: { fontSize: 16, color: '#333' },
})

// 动态样式（函数返回）
function getStyles(isActive: boolean) {
  return StyleSheet.create({
    button: {
      backgroundColor: isActive ? '#007AFF' : '#ccc',
      padding: 12,
      borderRadius: 8,
    },
  })
}

// 响应式布局
function ResponsiveLayout() {
  const { width } = useWindowDimensions()
  const isPortrait = width < 500
  return (
    <View style={{ flexDirection: isPortrait ? 'column' : 'row' }}>
      {/* ... */}
    </View>
  )
}
```

### 平台差异处理

```jsx
// Platform.OS
import { Platform, StatusBar } from 'react-native'

<View style={{
  paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight,
}}>

// Platform.select
const config = Platform.select({
  ios: { padding: 20 },
  android: { padding: 16 },
  default: { padding: 12 },  // web / 其他
})

// 文件级平台分离（打包时自动选择）
// Component.ios.tsx   → iOS 专用
// Component.android.tsx → Android 专用
// Component.tsx         → 通用
```

---

## 4. 导航

### Expo Router（文件系统路由，推荐）

```tsx
// app/_layout.tsx — 根布局
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  )
}

// app/(tabs)/_layout.tsx — Tab 导航
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="home"
        options={{
          title: '首页',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: '我的' }} />
    </Tabs>
  )
}

// 页面跳转
import { router } from 'expo-router'
router.push('/profile')           // 压栈
router.replace('/login')          // 替换
router.back()                     // 返回
router.push({ pathname: '/detail', params: { id: 123 } })  // 带参数

// 接收参数
import { useLocalSearchParams } from 'expo-router'
const { id } = useLocalSearchParams<{ id: string }>()
```

### React Navigation（更灵活，非 Expo 项目常用）

```tsx
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

const Stack = createNativeStackNavigator()

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

// 跳转
navigation.navigate('Detail', { id: 123 })
```

---

## 5. 状态管理与数据

### 本地状态

```jsx
// useState — 组件内状态
const [count, setCount] = useState(0)

// useReducer — 复杂状态逻辑
const [state, dispatch] = useReducer(reducer, initialState)

// useRef — 不触发渲染的可变值
const inputRef = useRef(null)
inputRef.current?.focus()
```

### 全局状态（常用方案）

```tsx
// Zustand（轻量，推荐）
import { create } from 'zustand'

const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}))

// 使用
function Profile() {
  const { user, setUser } = useStore()
  return <Text>{user?.name}</Text>
}

// AsyncStorage — 本地持久化（类似 localStorage）
import AsyncStorage from '@react-native-async-storage/async-storage'

await AsyncStorage.setItem('token', 'xxx')
const token = await AsyncStorage.getItem('token')
await AsyncStorage.removeItem('token')
```

### 网络请求

```tsx
// fetch（内置，无需安装）
async function fetchData() {
  try {
    const res = await fetch('https://api.example.com/data', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error(err)
  }
}

// 推荐用 tanstack-query（React Query）管理服务端状态
import { useQuery, useMutation, QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()

function UserList() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <ActivityIndicator />
  return <FlatList data={data} renderItem={...} />
}
```

---

## 6. 常用 Hooks

```tsx
// useFocusEffect — 页面获得焦点时执行（类似 onShow）
import { useFocusEffect } from '@react-navigation/native'

useFocusEffect(
  useCallback(() => {
    loadData()
    return () => cleanup()  // 离开时清理
  }, [])
)

// useBackHandler — Android 返回键
import { BackHandler } from 'react-native'

useEffect(() => {
  const handler = BackHandler.addEventListener('hardwareBackPress', () => {
    // return true 阻止默认返回
    if (isModalOpen) { closeModal(); return true }
    return false
  })
  return () => handler.remove()
}, [])

// useColorScheme — 深色/浅色模式
import { useColorScheme } from 'react-native'
const scheme = useColorScheme() // 'light' | 'dark'

// useSafeAreaInsets — 安全区域（刘海屏适配）
import { useSafeAreaInsets } from 'react-native-safe-area-context'
const insets = useSafeAreaInsets()
<View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }} />
```

---

## 7. 原生能力与常用库

### 设备 API

```tsx
// Expo SDK 提供大量设备能力（无需 eject）
import * as Location from 'expo-location'
import * as Camera from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import * as Notifications from 'expo-notifications'
import * as Haptics from 'expo-haptics'

// 定位
const { status } = await Location.requestForegroundPermissionsAsync()
const location = await Location.getCurrentPositionAsync({})

// 拍照
const [permission, requestPermission] = Camera.useCameraPermissions()
const { type, uri } = await ImagePicker.launchCameraAsync({
  allowsEditing: true,
  quality: 0.8,
})

// 推送通知
await Notifications.requestPermissionsAsync()
await Notifications.scheduleNotificationAsync({
  content: { title: '提醒', body: '该喝水了' },
  trigger: { seconds: 60 },
})

// 震动
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
```

### 常用第三方库

| 用途 | 库 | 说明 |
|------|-----|------|
| 导航 | `expo-router` / `@react-navigation/native` | 路由与页面跳转 |
| 状态管理 | `zustand` / `jotai` | 轻量全局状态 |
| 服务端状态 | `@tanstack/react-query` | 缓存、重试、轮询 |
| 表单 | `react-hook-form` + `zod` | 表单校验 |
| 请求 | `axios` | HTTP 客户端 |
| 存储 | `@react-native-async-storage/async-storage` | 本地 KV 存储 |
| 动画 | `react-native-reanimated` | 60fps 原生动画 |
| 手势 | `react-native-gesture-handler` | 原生手势 |
| 图标 | `@expo/vector-icons` | 内置图标库 |
| 安全区域 | `react-native-safe-area-context` | 刘海屏适配 |
| WebView | `react-native-webview` | 内嵌网页 |
| 地图 | `react-native-maps` | 地图组件 |

---

## 8. 动画

### Animated API（内置）

```tsx
import { Animated, Easing } from 'react-native'

const fadeAnim = useRef(new Animated.Value(0)).current

// 淡入
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 500,
  easing: Easing.ease,
  useNativeDriver: true,  // ⚠️ 仅支持 transform 和 opacity
}).start()

<Animated.View style={{ opacity: fadeAnim }}>
  <Text>淡入内容</Text>
</Animated.View>

// 组合动画
Animated.sequence([
  Animated.timing(scale, { toValue: 1.2, duration: 200, useNativeDriver: true }),
  Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
]).start()

// 弹簧动画
Animated.spring(scale, {
  toValue: 1,
  friction: 3,
  useNativeDriver: true,
}).start()
```

### Reanimated（推荐，性能更好）

```tsx
import Animated, { FadeIn, SlideInRight, useSharedValue, withSpring } from 'react-native-reanimated'

// 声明式入场动画
<Animated.View entering={FadeIn.duration(500)}>
  <Text>淡入</Text>
</Animated.View>

<Animated.View entering={SlideInRight.delay(200)}>
  <Text>从右滑入</Text>
</Animated.View>

// 命令式动画（工作线程，不阻塞 JS）
const offset = useSharedValue(0)
const handlePress = () => {
  offset.value = withSpring(offset.value === 0 ? 100 : 0)
}
<Animated.View style={{ transform: [{ translateX: offset }] }} />
```

---

## 9. 性能优化

### 列表优化

```tsx
// FlatList 关键优化属性
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}

  // 性能相关
  initialNumToRender={10}          // 首屏渲染数量
  windowSize={5}                   // 渲染窗口（屏幕倍数）
  maxToRenderPerBatch={10}         // 每批渲染数量
  updateCellsBatchingPeriod={50}   // 批次间隔 ms
  removeClippedSubviews            // 移除屏幕外的视图（Android）
  getItemLayout={(data, index) => ({  // 跳过动态高度测量（已知固定高度时）
    length: 72,
    offset: 72 * index,
    index,
  })}

  // 避免不必要的重渲染
  extraData={selectedId}
/>

// useMemo 包裹 renderItem
const renderItem = useCallback(({ item }) => (
  <ListItem data={item} />
), [])
```

### 通用优化

```tsx
// 1. React.memo 避免子组件重渲染
const ListItem = React.memo(({ data }) => {
  return <View>...</View>
})

// 2. 图片优化
<Image
  source={{ uri, cache: 'force-cache' }}  // 缓存策略
  style={{ width: 100, height: 100 }}
  resizeMode="cover"
/>
// 推荐用 expo-image（自动缓存、渐进加载）
import { Image } from 'expo-image'
<Image source={uri} style={{ width: 100, height: 100 }} contentFit="cover" />

// 3. 避免内联对象/函数
// ❌ 每次渲染创建新引用
<View style={{ flex: 1 }} />
<TouchableOpacity onPress={() => handlePress(id)} />

// ✅ 提取为常量或 useMemo/useCallback
const containerStyle = useMemo(() => ({ flex: 1 }), [])
const handlePress = useCallback((id) => { /* ... */ }, [])

// 4. Hermes 引擎（默认开启）
// 字节码预编译，减少 TTI（Time to Interactive）
// app.json 中确认：
// "jsEngine": "hermes"
```

---

## 10. 调试与发布

### 调试工具

```bash
# Expo Dev Tools
npx expo start --dev-client

# 打开开发者菜单（模拟器）
# iOS: Cmd + D
# Android: Cmd + M

# 查看日志
npx expo logs

# React DevTools（组件树检查）
npx react-devtools

# Flipper（网络、数据库、布局检查）
# 需安装 Flipper 桌面端
```

### 发布

```bash
# EAS Build（Expo 推荐，云端构建）
npm install -g eas-cli
eas login
eas build:configure

# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production

# 提交到商店
eas submit --platform ios
eas submit --platform android

# OTA 更新（无需重新审核）
eas update --branch production --message "fix: 修复登录问题"
```

### eas.json 配置

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "your@email.com" }
    }
  }
}
```

---

## 11. 常见问题

### 样式踩坑

```jsx
// 1. 没有 class，用 style 属性
// ❌ <View className="box">
// ✅ <View style={styles.box}>

// 2. 不支持 CSS 简写
// ❌ margin: '10px 20px'
// ✅ marginVertical: 10, marginHorizontal: 20

// 3. 不支持百分比宽高（除 width/height 的少数情况）
// ❌ width: '100%'  → 大部分情况可用，但 flex 场景可能异常
// ✅ flex: 1 + 父容器有确定尺寸

// 4. zIndex 只在同一父容器内生效
// 需要配合 elevation（Android）

// 5. 文字必须放在 <Text> 内
// ❌ <View>Hello</View>
// ✅ <View><Text>Hello</Text></View>

// 6. 阴影（iOS vs Android）
// iOS
{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 }
// Android
{ elevation: 5 }
// 推荐用 react-native-shadow-2 统一处理
```

### 网络与存储

```jsx
// 1. 网络图片必须指定宽高
<Image source={{ uri: '...' }} style={{ width: 200, height: 200 }} />

// 2. HTTP 请求需要配置（iOS ATS）
// ios/Info.plist 或 app.json:
// "infoPlist": { "NSAppTransportSecurity": { "NSAllowsArbitraryLoads": true } }

// 3. 本地存储用 AsyncStorage（异步，非同步！）
// 同步场景用 MMKV（更快）
import { MMKV } from 'react-native-mmkv'
const storage = new MMKV()
storage.set('user', JSON.stringify(userData))
const user = JSON.parse(storage.getString('user') || '{}')
```

---

## 参考资源

- [React Native 官方文档](https://reactnative.dev/docs/getting-started)
- [Expo 文档](https://docs.expo.dev/)
- [Expo Router 文档](https://docs.expo.dev/router/introduction/)
- [React Navigation](https://reactnavigation.org/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [React Native 中文网](https://reactnative.cn/)
