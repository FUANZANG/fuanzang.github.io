# 富文本编辑器

> 选型与安全。Tiptap 定位见 [官方 Overview](https://tiptap.dev/docs/editor/getting-started/overview)（基于 ProseMirror 的 headless 框架）。Quill 剪贴板与 `dangerouslyPasteHTML` 见 [Clipboard 模块文档](https://quilljs.com/docs/modules/clipboard)。XSS：客户端过滤**不是**安全边界；服务端必须校验/消毒（Quill 维护者与社区在 [quill#1918](https://github.com/quilljs/quill/issues/1918) 中的共识）。ProseMirror / Tiptap 曾曝出 DOMSerializer 类型混淆 XSS，需升级依赖（见下文）。

## 1. 你在存什么？

| 格式 | 代表 | 优点 | 风险 |
|------|------|------|------|
| **HTML** | 直接 `innerHTML` / 部分编辑器导出 | 展示简单 | XSS 面最大；难校验 |
| **JSON 文档** | ProseMirror / Tiptap doc、Slate | schema 可控 | 自定义 node 的 `toDOM` 仍可能踩坑 |
| **Delta** | Quill | 操作式、易协同 | 渲染成 HTML 时仍要消毒 |

**推荐默认**：存 **结构化文档（JSON/Delta）**，展示时由可信渲染器生成 HTML，并在服务端做白名单校验。不要把「编辑器前端校验」当成唯一防线——攻击者可绕过浏览器直接打 API。

## 2. 选型速览

| 库 | 特点（据官方定位） | 适合 |
|----|-------------------|------|
| **Tiptap** | Headless，扩展制，挂 Vue/React；底层 ProseMirror | 要深度定制 UI/协同扩展 |
| **ProseMirror** | 底层工具包，学习曲线陡 | 自研编辑器内核 |
| **Quill** | 开箱 UI + Delta；剪贴板用 matcher 转 Delta | 中等复杂度、快速接入 |
| **Slate** | React 思想的可编辑树 | React 重度、高度定制 |
| **contenteditable 裸写** | 零依赖 | 几乎总是坑；不推荐业务正文 |

没有银弹：协作、评论、表格、@提及都会显著推高复杂度（Tiptap 部分高级能力在 Pro/Cloud 扩展中，见其文档）。

## 3. Tiptap / ProseMirror 最小心智模型

```
Schema（允许哪些 node/mark）
  → Document（JSON）
  → 编辑命令 Commands
  → 视图 View（可替换为你的 UI）
```

Tiptap 用 Extension 组装 schema（官方建议可从 `StarterKit` 起步，再按需加 image/table 等）。只开需要的扩展，等于缩小攻击面与包体积。

### 安全：类型混淆与升级

2024 年披露：若 `toDOM` 把**属性值直接塞进 DOM 输出数组**，且属性来自未校验的 JSON，攻击者可把属性设为描述 `script` 的数组，骗过序列化导致 XSS。ProseMirror 侧已发安全说明与修复版本；Tiptap 在 **2.5.6** 起升级相关 `prosemirror-*` 依赖（见 [Tiptap @tiptap/pm 2.5.6 changelog](https://tiptap.dev/docs/resources/changelog/pm) 与 ProseMirror 论坛公告）。

实践：

1. 依赖保持较新（至少覆盖上述修复线）。  
2. 自定义 node/mark：属性用 `validate`（ProseMirror 提供）或自行断言类型为 string 等。  
3. **永远不要**把不可信 HTML 直接 `v-html` / `dangerouslySetInnerHTML` 出去而不消毒。  
4. 配 CSP，限制 inline script，作为最后一道。

## 4. Quill 注意点

- 内部真相是 **Delta**；优先 `getContents()` 存 Delta，而不是长期只存 HTML。  
- 官方将 `clipboard.dangerouslyPasteHTML` 明确命名为危险 API（文档写明 XSS 风险，类比 React 的 dangerously 前缀）——调用前必须自证已消毒。  
- 剪贴板默认把粘贴 HTML 解析进 Delta；这**不能**替代服务端校验（见 quill#1918 讨论）。

## 5. 受控 vs 非受控

| 模式 | 做法 | 坑 |
|------|------|-----|
| 非受控 | 编辑器内部持有文档，提交时再取出 | 实现简单 |
| 受控 | 父组件 state ↔ 编辑器双向同步 | 易光标跳动；需按库的推荐 API（避免每次 keystroke 重置整棵 doc） |

协作编辑（CRDT/OT）几乎总是「以编辑器/协同后端为源」，而不是简单受控表单字段。

## 6. 图片与附件

- 粘贴/拖入图片：先上传拿 URL，再插入 node（上传见 [大文件上传](/notes/practice/large-file-upload)、[Node 中间件与文件存储](/notes/node/node-middleware-storage)）。  
- 禁止任意外链脚本；`a[href]` 限制协议（`https:`/`mailto:`）。  
- 存储侧对 URL、尺寸做白名单。

## 7. 落地清单

1. 选库 → 锁定 schema（允许的标签/marks）  
2. 持久化 JSON/Delta + 服务端 schema 校验  
3. 展示路径统一消毒  
4. CSP + 依赖升级策略  
5. 需要协同时再引入官方协同方案，不要自研 OT 除非有强需求  

## 参考

- [Tiptap overview](https://tiptap.dev/docs/editor/getting-started/overview)
- [Quill Clipboard](https://quilljs.com/docs/modules/clipboard)
- [ProseMirror: Heads-up XSS risk in DOMSerializer](https://discuss.prosemirror.net/t/heads-up-xss-risk-in-domserializer/6572)
- [quill#1918 How to prevent XSS attacks](https://github.com/quilljs/quill/issues/1918)
