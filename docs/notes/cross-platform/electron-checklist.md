# Electron 安全与发布核对清单

> 架构、IPC、builder、updater 的展开说明见 [Electron](/notes/cross-platform/electron)。本篇按 [Electron Security Tutorial](https://github.com/electron/electron/blob/main/docs/tutorial/security.md)、[Context Isolation](https://github.com/electron/electron/blob/main/docs/tutorial/context-isolation.md)、[Preload 教程](https://github.com/electron/electron/blob/main/docs/tutorial/tutorial-3-preload.md) 做成**上线前核对表**，避免和长文重复。

## 1. 渲染进程隔离（必做）

官方建议（Electron 12+ **默认**开启 context isolation）：

| 项 | 期望 |
|----|------|
| `contextIsolation` | **true**（不要关） |
| `nodeIntegration` | **false**（渲染页不要直接 Node） |
| `sandbox` | 建议 **true**（进一步限制） |

即使关了 `nodeIntegration`，**没有** context isolation 仍难真正隔离；官方 security 文强调二者一起看。

Electron **20+**：preload **默认沙箱化**，不能随意 `require` 任意 Node 内置模块——preload 里主要用 `electron` 模块 + `contextBridge`（见 preload 教程说明）。

## 2. preload：只暴露窄 API

按 context isolation / contextBridge 文档：

```js
// ✅ 每个能力一个方法
contextBridge.exposeInMainWorld('api', {
  loadPrefs: () => ipcRenderer.invoke('load-prefs')
})

// ❌ 不要把 send / 整个 ipcRenderer 抛给页面
contextBridge.exposeInMainWorld('api', {
  send: ipcRenderer.send
})
```

- 不能指望把整个 `ipcRenderer` 对象桥过去（会得到空或不安全面）。  
- 主进程处理 IPC 时校验 **sender** 与参数，再做特权操作（读盘、开壳等）。

## 3. 加载内容

| 场景 | 建议 |
|------|------|
| 本地 UI | `loadFile` / 本地打包资源 |
| 远程 URL | 极度谨慎；默认当**不可信**；能不用就不用 |
| 开发 | 可 `loadURL` 本地 Vite；生产关掉多余调试口 |

任意远程页面 + 过宽 preload = 经典事故面。

## 4. 打包与更新（对照主文）

发布前再确认（细节与示例代码见 Electron 主文「工程化 / 自动更新」）：

- [ ] `electron-builder` / Forge 产物架构（universal / arm64）符合目标机  
- [ ] 代码签名（macOS / Windows）配置正确，否则安装与自动更新受阻  
- [ ] `electron-updater` 的更新源 HTTPS、校验与回滚策略清楚  
- [ ] 不把签名证书和发布密钥打进公开仓库（配合 [多环境配置](/notes/engineering/env-config)）

## 5. 上线核对（打印贴墙）

1. contextIsolation on、nodeIntegration off  
2. preload 无万能 IPC  
3. 主进程 IPC 白名单 + 参数校验  
4. 生产不加载不可信远程页当壳  
5. 签名 + 更新通道可用  
6. 用官方 [Security Checklist](https://github.com/electron/electron/blob/main/docs/tutorial/security.md) 再扫一遍当前大版本差异  

## 参考

- [Electron Security](https://github.com/electron/electron/blob/main/docs/tutorial/security.md)
- [Context Isolation](https://github.com/electron/electron/blob/main/docs/tutorial/context-isolation.md)
- [Tutorial: Preload](https://github.com/electron/electron/blob/main/docs/tutorial/tutorial-3-preload.md)
- 本站：[Electron](/notes/cross-platform/electron)
