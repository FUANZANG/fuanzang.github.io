# Capacitor

> Capacitor 把 **现有 Web 应用**（Vue / React / 任意 SPA）包进 iOS/Android WebView，用插件调原生能力。官方文档以最新主线为准（npm `@capacitor/core@8.x`，2026-11）。
>
> 对照：[小程序 / uni-app / Taro](/notes/cross-platform/mini-program) · [React Native](/notes/cross-platform/react-native) · [Electron](/notes/cross-platform/electron) · [Tauri 2](/notes/cross-platform/tauri2)

## 定位：什么时候用

| 诉求 | 更合适 |
|------|--------|
| 已有 Vue/React 站点，要上架 App、复用 UI | **Capacitor** |
| 要原生控件手感、复杂手势/列表 | **React Native** / Flutter |
| 微信/多小程序容器 | 小程序或 uni-app / Taro |
| 桌面 | Electron / Tauri |

一句话：**Capacitor = Web 壳 + 原生插件**；不是 RN 那种「用 JS 画原生控件」。

**Flutter**（认脸）：Dart + 自绘引擎，性能与 UI 一致性强，但和现有 Vue/React 代码**不共用**；团队已是 Web 栈时优先 Cap / RN，而不是为了「也要移动端」重写 Flutter。

## 接到现有 Vite 项目

> [Installing Capacitor](https://capacitorjs.com/docs/getting-started) · Vue 方案页建议 `webDir=dist`

```bash
npm i @capacitor/core
npm i -D @capacitor/cli
npx cap init "My App" com.example.myapp --web-dir=dist

npm run build
npm i @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
npx cap sync
```

+ `capacitor.config` 里 `webDir` 必须对准构建产物（Vite 默认 `dist`）
+ `index.html` 需要有 `<head>`，否则插件注入会失败（官方要求）
+ `android/`、`ios/` 建议进 Git；改 Web 后：`npm run build && npx cap sync`
+ 真机/模拟器：`npx cap run android` / `npx cap run ios`；或 `npx cap open` 进 Android Studio / Xcode

## 调原生能力（示意）

```ts
import { Geolocation } from '@capacitor/geolocation'
import { Camera, CameraResultType } from '@capacitor/camera'

const pos = await Geolocation.getCurrentPosition()
const photo = await Camera.getPhoto({ resultType: CameraResultType.Uri })
```

常用官方插件：`@capacitor/app`、`filesystem`、`preferences`、`push-notifications`、`status-bar` 等；缺能力再写自定义插件或社区插件。

## 和 Ionic / 壳差异

+ **Ionic**：UI 组件库，常与 Capacitor 搭配，但 Capacitor **不依赖** Ionic
+ **Cordova**：前辈；新项目默认 Capacitor（工具链与维护更现代）
+ 安全：WebView 加载远端 URL 时等同「移动端浏览器 XSS」——生产优先打本地 `dist`，远端内容要 CSP / 鉴权

## 选型速记

+ Web 业务要「顺手上架」→ Capacitor  
+ 交互重度、要长期打磨原生体验 → RN / Flutter  
+ 只要微信生态 → 别用 Capacitor 硬扛小程序

## 参考

+ [Capacitor Docs](https://capacitorjs.com/docs) · [Vue + Capacitor](https://capacitorjs.com/solution/vue) · [React + Capacitor](https://capacitorjs.com/solution/react)
+ 本站：[React Native](/notes/cross-platform/react-native) · [小程序](/notes/cross-platform/mini-program) · [Electron](/notes/cross-platform/electron) · [Tauri 2](/notes/cross-platform/tauri2)
