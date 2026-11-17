# Tauri 2

> Tauri 用 **系统 WebView + Rust 后端** 做跨端桌面（及移动）应用：前端仍是 Web 技术，系统能力经 IPC 调 Rust，不捆绑 Chromium/Node。
>
> 版本锚点（2026-11）：`@tauri-apps/cli@2.12.x` · 文档 [v2.tauri.app](https://v2.tauri.app/)
> 对照体积/安全心智见 [Electron](/notes/cross-platform/electron) · [Electron 清单](/notes/cross-platform/electron-checklist)；移动 Web 壳见 [Capacitor](/notes/cross-platform/capacitor)。

## 和 Electron 差在哪

| | Tauri 2 | Electron |
|--|---------|----------|
| 渲染 | OS WebView（WRY 抽象） | 自带 Chromium |
| 后端 | Rust | Node.js（主进程） |
| 体积 | 通常数 MB～十几 MB 量级 | 常数十 MB 起（含浏览器运行时） |
| 前端 API | `@tauri-apps/api` + 插件；默认最小权限 | Electron/Node API；靠 `contextIsolation` 等收紧 |
| 安全模型 | **Capabilities / Permissions**（按窗口授权命令） | preload + IPC 白名单靠约定 |

不适合把 Tauri 当成「轻量 Electron 换皮」：WebView 行为因平台而异（Safari/WebView2/WebKitGTK），调试与 CSS 兼容要按目标 OS 验证。

## 架构（官方概念）

> 来源：[Architecture](https://v2.tauri.app/concept/architecture/)

```
┌─────────────────────────────────────┐
│              App Window (TAO)       │
│  ┌───────────────────────────────┐  │
│  │     WebView (WRY)             │  │
│  │  HTML/JS/CSS + @tauri-apps/api│  │
│  └──────────────┬────────────────┘  │
│                 │ IPC (invoke/event) │
│  ┌──────────────▼────────────────┐  │
│  │  Rust core (tauri crate)      │  │
│  │  commands / plugins / FS…     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

+ **TAO**：跨平台窗口
+ **WRY**：选具体 WebView 并做系统交互
+ **tauri**：读 `tauri.conf.json`、注入脚本、托管更新与 API 边界
+ 前端通过 message passing 调后端，而不是在页面里直接跑 Node

## 创建项目

> 来源：[Create a Project](https://v2.tauri.app/start/create-project/)

```bash
npm create tauri-app@latest
# 或 pnpm create tauri-app / yarn create tauri-app / bun create tauri-app
cd <project>
pnpm install
pnpm tauri dev
```

+ 模板覆盖 Vue / React / Svelte / Solid / Angular / Vanilla 等；也可对已有前端执行 `pnpm add -D @tauri-apps/cli@latest` 后 `pnpm tauri init`
+ Vite 项目建议在 `vite.config` 里 `server.watch.ignored: ['**/src-tauri/**']`，避免监视 Rust 目录导致循环刷新
+ 目录关键点：`src-tauri/tauri.conf.json`、`src-tauri/capabilities/`、`src-tauri/src/lib.rs`

## 前端调 Rust：Commands

> 来源：[Calling Rust from the Frontend](https://v2.tauri.app/develop/calling-rust/)

```rust
// src-tauri/src/lib.rs
#[tauri::command]
fn greet(name: String) -> String {
  format!("Hello, {}!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![greet])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

```ts
import { invoke } from '@tauri-apps/api/core'

const msg = await invoke<string>('greet', { name: 'Tauri' })
// 参数默认按 camelCase 对齐 Rust 字段；可用 #[tauri::command(rename_all = "snake_case")]
```

+ `lib.rs` 里直接定义的 command **不要**标 `pub`（宏生成限制）；拆到 `commands.rs` 模块时则要 `pub`
+ 另有 **Events** 做更动态的推送（Rust → 前端或窗口间）；请求/响应优先 Command

## Capabilities：默认最小权限

> 来源：[Capabilities](https://v2.tauri.app/security/capabilities/) · [Permissions](https://v2.tauri.app/security/permissions/)

+ Capability = 哪些 **window / webview** 能用哪些 **permission**（核心 API 与插件命令）
+ 文件放在 `src-tauri/capabilities/`（json/toml）；也可在 `tauri.conf.json` 的 `app.security.capabilities` 引用
+ 某窗口若匹配不到任何 capability，则 **没有 IPC 能力**
+ 插件命令默认前端不可调用，需在插件 `permissions/` 声明后再写入 capability（形如 `fs:default`、`shell:allow-open`）

```json
// src-tauri/capabilities/default.json（示意）
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "main-capability",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-set-title"
  ]
}
```

**边界（官方原话要点）**

+ 能降低：前端被 XSS 后乱调系统 API 的爆炸半径
+ 不能防：恶意/有洞的 Rust、过宽的 scope、WebView 0-day、供应链投毒

## 插件与生态

+ 官方插件常见：`tauri-plugin-fs`、`tauri-plugin-shell`、`tauri-plugin-dialog`、`tauri-plugin-http` 等；按需加 permission，勿一上来 `allow-all`
+ 移动端（iOS/Android）与桌面可共用一套 Rust command，用 capability 的 `platforms` 字段区分权限集

## 打包与分发（心智）

```bash
pnpm tauri build
```

+ 产出平台安装包（msi/dmg/deb 等，取决于目标 OS）；签名、公证、自动更新要按平台文档单独配
+ CI 可用社区 `tauri-action` 做多平台构建（见架构页 Tooling）

## 选型速记

+ **要小安装包、能接受写 Rust、系统 WebView 够用** → Tauri 2
+ **要像素级对齐 Chrome、重度 Node 原生生态、团队只会 JS** → Electron
+ 已有 Electron 应用「整包迁 Tauri」成本通常高于新项目直上；IPC 与权限模型都要重做

## 参考

+ [Create a Project](https://v2.tauri.app/start/create-project/)
+ [Architecture](https://v2.tauri.app/concept/architecture/)
+ [Calling Rust](https://v2.tauri.app/develop/calling-rust/)
+ [Capabilities](https://v2.tauri.app/security/capabilities/)
