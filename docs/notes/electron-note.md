# Electron

> Electron 是一个使用 Chromium + Node.js 构建跨平台桌面应用的框架。本质上就是把 Web 应用装进一个定制浏览器里，同时赋予它访问操作系统底层的能力。

---

## 架构原理

### 双进程模型

Electron 继承了 Chromium 的多进程架构，但核心只有两种角色：

| | 主进程 (Main) | 渲染进程 (Renderer) |
|---|---|---|
| **数量** | 一个 | 每个窗口一个 |
| **运行环境** | Node.js | Chromium (Blink + V8) |
| **职责** | 创建窗口、管理生命周期、调用系统 API | 渲染页面、处理 UI 交互 |
| **可用 API** | Node.js + Electron Main API | DOM + Electron Renderer API |

```
┌─────────────────────────────────────────┐
│              Main Process               │
│  ┌──────┐  ┌──────┐  ┌──────────────┐   │
│  │Node.js│  │Menu  │  │BrowserWindow │   │
│  │  fs   │  │Tray  │  │  (Chromium)  │   │
│  │  net  │  │Dialog│  │              │   │
│  └──────┘  └──────┘  └──────┬───────┘   │
│                              │ IPC       │
│         ┌────────────────────┼───────┐   │
│         ▼                    ▼       │   │
│  ┌─────────────┐    ┌─────────────┐  │   │
│  │ Renderer 1  │    │ Renderer 2  │  │   │
│  │  (Vue App)  │    │  (Settings) │  │   │
│  └─────────────┘    └─────────────┘  │   │
└─────────────────────────────────────────┘
```

### 为什么不能直接在渲染进程用 Node？

早期 Electron 允许 `nodeIntegration: true`，渲染进程可以直接 `require('fs')`。但这有严重的安全问题——如果页面加载了远程内容（或遭受 XSS），攻击者就能拿到完整的系统权限。

现代 Electron（v12+）默认开启了两个安全开关：

- **`contextIsolation: true`** — preload 脚本和渲染页面运行在独立的 JS 上下文，互不干扰
- **`nodeIntegration: false`** — 渲染进程无法直接访问 Node.js

这意味着渲染进程想要调用系统能力，必须通过 IPC 向主进程"请求"。

---

## 应用生命周期

主进程通过 `app` 模块管理整个应用的生命周期：

```javascript
const { app, BrowserWindow } = require('electron')

// 应用准备就绪，可以创建窗口
app.whenReady().then(() => {
  createWindow()

  // macOS: 点击 Dock 图标时，如果没有窗口则重新创建
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

**关键事件顺序：**

```
app 启动
  → ready (初始化完成，可以创建窗口)
  → window-all-closed (所有窗口关闭)
  → before-quit (即将退出)
  → will-quit (即将退出，可以阻止)
  → quit (已退出)
```

macOS 的特殊行为：关闭窗口 ≠ 退出应用（和原生 Mac 应用一致），需要 Cmd+Q 或 `app.quit()` 才真正退出。

---

## 核心 API

### 窗口管理 — BrowserWindow

```javascript
const win = new BrowserWindow({
  width: 1200,
  height: 800,
  minWidth: 600,
  minHeight: 400,

  // 窗口样式
  frame: true,            // 是否显示原生标题栏
  titleBarStyle: 'hidden', // macOS: 隐藏标题栏但保留红绿灯
  transparent: false,     // 窗口背景透明
  alwaysOnTop: false,     // 置顶

  // 关键安全配置
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true          // 沙箱模式，进一步隔离
  }
})

// 加载内容
win.loadFile('index.html')      // 本地文件
win.loadURL('http://localhost:5173') // 开发服务器（热更新）

// 常用方法
win.maximize()
win.minimize()
win.setProgressBar(0.5)         // 任务栏进度条
win.setAlwaysOnTop(true)
win.capturePage()               // 截图，返回 NativeImage
```

**多窗口管理：** 用数组或 Map 存储窗口引用，避免被 GC 回收：

```javascript
const windows = new Set()

function createWindow() {
  const win = new BrowserWindow({ /* ... */ })
  windows.add(win)
  win.on('closed', () => windows.delete(win))
}
```

### IPC 通信（重点）

IPC (Inter-Process Communication) 是主进程和渲染进程之间的通信桥梁。

**现代推荐方式：通过 preload + contextBridge 暴露安全 API**

```javascript
// preload.js — 在渲染进程加载页面之前执行
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 单向：渲染 → 主
  send: (channel, data) => {
    const validChannels = ['toMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },

  // 双向：渲染 → 主 → 渲染（带返回值）
  invoke: (channel, data) => {
    const validChannels = ['getSystemInfo', 'readFile']
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data)
    }
  },

  // 主 → 渲染（单向推送）
  onMessage: (channel, callback) => {
    const validChannels = ['fromMain']
    if (validChannels.includes(channel)) {
      // 包装一下，避免暴露完整的 event 对象
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  }
})
```

```javascript
// main.js — 主进程处理请求
const { ipcMain } = require('electron')

// 处理 invoke 调用，支持 async 返回值
ipcMain.handle('getSystemInfo', async () => {
  return {
    platform: process.platform,
    version: app.getVersion()
  }
})

// 处理 send 调用（无返回值）
ipcMain.on('toMain', (event, data) => {
  console.log('收到渲染进程消息:', data)
  // 回复给发送者
  event.reply('fromMain', '处理完成')
})
```

```javascript
// renderer.js — 页面中调用
const info = await window.electronAPI.invoke('getSystemInfo')
window.electronAPI.onMessage('fromMain', (msg) => {
  console.log('主进程推送:', msg)
})
```

**三种通信模式对比：**

| 方式 | 方向 | 是否有返回值 | 适用场景 |
|---|---|---|---|
| `ipcRenderer.send` / `ipcMain.on` | 渲染 → 主 | 否 | 通知类消息 |
| `ipcRenderer.invoke` / `ipcMain.handle` | 渲染 → 主 → 渲染 | 是 (Promise) | 请求-响应模式 |
| `webContents.send` / `ipcRenderer.on` | 主 → 渲染 | 否 | 主进程主动推送 |

> ⚠️ **不要在 preload 中暴露 ipcRenderer 本身**。始终用 `contextBridge` 包装，并做 channel 白名单校验，防止恶意代码利用 IPC 通道。

### 渲染进程之间通信

不同窗口（渲染进程）之间不能直接通信，需要主进程中转：

```
Renderer A → ipcMain → Renderer B
```

或者使用 `MessageChannel`（Electron 支持，但需要主进程协助建立连接）。

### 菜单 — Menu

```javascript
const { Menu } = require('electron')

const template = [
  {
    label: '文件',
    submenu: [
      { label: '新建', accelerator: 'CmdOrCtrl+N', click: () => { /* ... */ } },
      { type: 'separator' },
      { role: 'quit' } // 内置角色，自动处理退出逻辑
    ]
  },
  {
    label: '编辑',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
```

`role` 是 Electron 内置的菜单角色，像 `undo`、`copy`、`paste`、`quit` 这些会自动适配平台行为，不用自己写逻辑。

### 系统托盘 — Tray

```javascript
const { Tray, Menu } = require('electron')

const tray = new Tray('/path/to/icon.png')
tray.setToolTip('我的应用')
tray.setContextMenu(Menu.buildFromTemplate([
  { label: '显示窗口', click: () => win.show() },
  { label: '退出', click: () => app.quit() }
]))

tray.on('double-click', () => win.show())
```

### 对话框 — dialog

```javascript
const { dialog } = require('electron')

// 文件选择
const result = await dialog.showOpenDialog(win, {
  properties: ['openFile', 'multiSelections'],
  filters: [
    { name: 'Images', extensions: ['jpg', 'png', 'gif'] }
  ]
})
// result: { canceled: false, filePaths: ['/path/to/file.jpg'] }

// 保存文件
const saveResult = await dialog.showSaveDialog(win, {
  defaultPath: 'untitled.txt'
})

// 消息框
const msgResult = await dialog.showMessageBox(win, {
  type: 'question',
  buttons: ['取消', '确定'],
  message: '确认要删除吗？'
})
// msgResult.response → 按钮索引
```

### Shell — 打开外部资源

```javascript
const { shell } = require('electron')

shell.openExternal('https://github.com')  // 用默认浏览器打开链接
shell.openPath('/path/to/file.pdf')       // 用系统默认应用打开文件
shell.showItemInFolder('/path/to/file')   // 在文件管理器中定位文件
shell.beep()                               // 系统提示音
```

### 全局快捷键 — globalShortcut

```javascript
const { globalShortcut } = require('electron')

app.whenReady().then(() => {
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    win.webContents.openDevTools()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
```

### 系统通知 — Notification

```javascript
const { Notification } = require('electron')

if (Notification.isSupported()) {
  const notification = new Notification({
    title: '构建完成',
    body: '项目已成功编译，耗时 3.2s',
    icon: '/path/to/icon.png'
  })
  notification.show()
  notification.on('click', () => win.show())
}
```

---

## 工程化

### 项目搭建工具选型

| 工具 | 特点 | 适合场景 |
|---|---|---|
| **electron-vite** | 专为 Electron 设计，配置简单 | 新项目首选 |
| **electron-forge** | Electron 官方推荐，生态完善 | 需要完整发布流程 |
| **electron-builder** | 纯打包工具，不涉及开发 | 已有项目，只需要打包 |

### electron-vite 快速起步

```bash
npm create @quick-start/electron my-app -- --template vue-ts
cd my-app
npm install
npm run dev
```

项目结构：

```
my-app/
├── src/
│   ├── main/          # 主进程代码
│   │   └── index.ts
│   ├── preload/       # preload 脚本
│   │   └── index.ts
│   └── renderer/      # 渲染进程（Vue/React 应用）
│       ├── src/
│       └── index.html
├── electron.vite.config.ts
└── package.json
```

### 与 Vue 集成

开发环境下加载 Vite dev server 实现热更新：

```javascript
// main/index.ts
if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
  win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  win.webContents.openDevTools()
} else {
  win.loadFile(join(__dirname, '../renderer/index.html'))
}
```

`electron-vite` 会自动处理这些配置，基本开箱即用。

### 打包发布

**electron-builder** 是最常用的打包方案：

```json
// package.json
{
  "build": {
    "appId": "com.example.myapp",
    "productName": "My App",
    "directories": { "output": "dist" },
    "mac": {
      "target": ["dmg", "zip"],
      "icon": "build/icon.icns"
    },
    "win": {
      "target": ["nsis"],
      "icon": "build/icon.ico"
    },
    "linux": {
      "target": ["AppImage", "deb"]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

```bash
# 打包
npm run build
npx electron-builder --mac --win --linux
```

### 自动更新 — electron-updater

```javascript
// main/update.ts
import { autoUpdater } from 'electron-updater'

app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('update-available', (info) => {
    win.webContents.send('update-available', info.version)
  })

  autoUpdater.on('update-downloaded', () => {
    // 通知用户，让用户决定是否重启
    win.webContents.send('update-downloaded')
  })
})
```

需要配合发布服务器（GitHub Releases、自建 OSS 等），在 `package.json` 中配置：

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-org",
      "repo": "your-repo"
    }
  }
}
```

---

## 安全最佳实践

这是 Electron 开发中最重要的部分，参考 [Electron 官方安全清单](https://www.electronjs.org/docs/latest/tutorial/security)。

### 核心原则

```javascript
webPreferences: {
  contextIsolation: true,    // 必须开启
  nodeIntegration: false,    // 必须关闭
  sandbox: true              // 建议开启
}
```

### CSP — 内容安全策略

在 HTML 的 `<meta>` 中限制资源来源：

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self';
           script-src 'self';
           style-src 'self' 'unsafe-inline';
           img-src 'self' data:;
           connect-src 'self' https://api.example.com;">
```

### 导航限制

阻止窗口跳转到外部 URL：

```javascript
win.webContents.on('will-navigate', (event, url) => {
  const allowed = new URL(win.webContents.getURL()).origin
  if (new URL(url).origin !== allowed) {
    event.preventDefault()
    shell.openExternal(url) // 用系统浏览器打开
  }
})

// 禁止新窗口打开
win.webContents.setWindowOpenHandler(({ url }) => {
  shell.openExternal(url)
  return { action: 'deny' }
})
```

### preload 中做白名单校验

不要在 preload 中直接暴露 `ipcRenderer` 的全部能力，只暴露必要的、经过校验的方法：

```javascript
// ❌ 危险：暴露了完整的 ipcRenderer
contextBridge.exposeInMainWorld('api', {
  send: ipcRenderer.send,
  invoke: ipcRenderer.invoke
})

// ✅ 安全：白名单 + 参数校验
contextBridge.exposeInMainWorld('api', {
  saveFile: (content) => {
    if (typeof content !== 'string') throw new Error('Invalid content')
    return ipcRenderer.invoke('saveFile', content)
  }
})
```

---

## 性能优化

### 渲染进程

- **延迟创建窗口** — 不要一次创建所有窗口，按需创建
- **隐藏而非销毁** — 频繁使用的窗口用 `win.hide()` 而非 `win.close()`
- **使用 `backgroundThrottling`** — 非活动窗口自动降频

```javascript
const win = new BrowserWindow({
  webPreferences: {
    backgroundThrottling: true // 窗口不可见时限制动画和定时器
  }
})
```

### 内存泄漏排查

Electron 应用的内存泄漏通常来自：

1. **事件监听器未清理** — `ipcRenderer.on` 注册的监听器在组件卸载时没移除
2. **窗口引用未释放** — 关闭的窗口没有被 GC 回收
3. **远程内容缓存** — WebView 或加载远程 URL 产生的缓存堆积

排查工具：Chrome DevTools → Memory 标签 → Heap Snapshot / Timeline。

### 打包体积优化

- **asar 打包** — Electron 默认使用 asar 归档，减少文件 IO 开销
- **排除不必要的依赖** — `node_modules` 中的 devDependencies 不要打进生产包
- **按需引入** — 避免把整个 SDK 打包，只引入用到的部分

---

## 原生能力

### Node.js 原生模块 (Native Addons)

当需要用 C/C++ 扩展能力时（比如系统级 API、高性能计算），会涉及原生模块：

```bash
# electron 使用自己的 Node.js 版本，需要重新编译原生模块
npm install --save-dev electron-rebuild
npx electron-rebuild
```

常见原生模块场景：
- `node-hid` — USB HID 设备通信
- `serialport` — 串口通信
- `node-ffi-napi` — 调用动态链接库 (.dll/.so/.dylib)

### 原生菜单 vs 自定义标题栏

两种方式各有取舍：

| | 原生菜单 (frame: true) | 自定义标题栏 (frame: false) |
|---|---|---|
| 开发成本 | 低 | 高（需要自己实现拖拽、最小化等） |
| 视觉效果 | 跟随系统 | 完全自定义 |
| macOS | 红绿灯位置固定 | 需要预留空间 |

自定义标题栏的拖拽区域：

```css
.titlebar {
  -webkit-app-region: drag;      /* 可拖拽区域 */
}
.titlebar button {
  -webkit-app-region: no-drag;   /* 按钮不可拖拽 */
}
```

---

## 常见问题

**Q: Electron 应用体积为什么这么大？**
A: 因为打包了整个 Chromium 和 Node.js 运行时。一个最简应用也有 ~80MB。如果需要更小的体积，考虑 Tauri（使用系统 WebView）。

**Q: Electron 和 NW.js 的区别？**
A: Electron 的社区生态更成熟，VS Code、Discord、Slack 都在用。NW.js 的 Node 集成方式不同（直接在页面中可用），但维护力度不如 Electron。

**Q: 如何处理不同平台的差异？**
A: 使用 `process.platform` 判断：`darwin`(macOS)、`win32`(Windows)、`linux`。Electron 的很多 API 已经内置了跨平台处理（如 `role` 菜单），优先使用内置方案。
