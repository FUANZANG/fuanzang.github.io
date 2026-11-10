# 拖拽交互

> API 行为以 [MDN: HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) 及子文 [Drag data store](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_data_store) 为准。文件投放可对照 MDN File drag and drop；看板类可对照其 Kanban 示例思路。大文件选择场景常与 [大文件上传](/notes/practice/large-file-upload) 组合。

## 1. 三种场景

MDN 概括拖拽其实有三类需求：

1. **页内排序/移动**（列表、看板）  
2. **拖出页面**（把数据交给桌面或其他应用）  
3. **拖入页面**（从 OS 拖文件进浏览器）

同一套事件模型，但「拖谁、传什么数据、落点在哪」不一定都由你控制。例如从桌面拖文件进来时，**不会**在页面元素上触发 `dragstart`/`dragend`。

## 2. 事件与角色

| 事件 | 通常打在 | 何时 |
|------|----------|------|
| `dragstart` / `drag` / `dragend` | **被拖元素** | 开始、拖动中、结束 |
| `dragenter` / `dragover` / `dragleave` / `drop` | **潜在放置目标** | 进入、悬停、离开、放下 |

要点（MDN）：

- 默认多数元素**不是**合法 drop 目标；要在目标的 **`dragover` 里 `preventDefault()`**，`drop` 才会触发。  
- 自定义可拖元素：`draggable="true"`。图片、链接默认就可拖；设 `draggable="false"` 可关掉。  
- 设了 `draggable` 后，元素内文本不能再用鼠标常规拖选，需按 MDN 说明改用 Alt/键盘等方式。

## 3. 数据商店 DataTransfer（易错）

拖拽不能直接塞任意 JS 对象给跨页面/跨应用目标，要序列化成字符串或 `File`，放进 `event.dataTransfer`。

按 MDN **硬约束**：

| 操作 | 允许的时机 |
|------|------------|
| **写入** `setData` / 改数据商店 | 几乎只在 **`dragstart`** |
| **读取** `getData` | 主要在 **`dragstart`** 与 **`drop`**；其它拖拽事件读不到有效载荷 |

```js
const source = document.querySelector('#card')
const target = document.querySelector('#column')

source.addEventListener('dragstart', (ev) => {
  ev.dataTransfer.setData('text/plain', ev.target.id)
  // 可同时放多种 MIME，供不同放置方选择
  ev.dataTransfer.effectAllowed = 'move'
})

target.addEventListener('dragover', (ev) => {
  ev.preventDefault() // 允许 drop
  ev.dataTransfer.dropEffect = 'move'
})

target.addEventListener('drop', (ev) => {
  ev.preventDefault()
  const id = ev.dataTransfer.getData('text/plain')
  const el = document.getElementById(id)
  if (el) target.append(el)
})
```

MDN 建议：除非有意禁止，否则应提供 `text/plain` 作为最通用回退，并注意类型偏好顺序。

文件拖入：在 `drop` 里读 `ev.dataTransfer.files`（`FileList`）；从 OS 拖入时没有页面内的 `dragstart`。

## 4. 页内排序：HTML5 DnD 够不够？

| 方案 | 适用 | 局限 |
|------|------|------|
| 原生 HTML5 DnD | 跨窗口、拖文件、简单放置 | 触控支持历史参差；自定义拖影/滚动容器细节多 |
| Pointer 事件自绘拖拽 | 列表排序、移动端优先 | 要自己处理滚动、无障碍 |
| 成熟库（如 SortableJS 等） | 快速做看板/多列表 | 仍要理解可访问性与数据同步 |

移动端若以排序为主，很多团队更倾向 **Pointer Events + transform**，而不是死磕 HTML5 DnD。

无障碍：提供键盘替代（上/下移动按钮）、`aria-grabbed` / 实时区域提示等；纯鼠标拖拽无法覆盖键盘用户。

## 5. 与 React / Vue 状态同步

拖拽改的是 DOM 顺序时，记得：

1. `drop` 后根据 id 列表**写回状态**（单一数据源）  
2. 不要只改 DOM 却不改数组，否则下次 render 被弹回  
3. 虚拟列表（见 [虚拟列表](/notes/practice/virtual-list)）里拖拽要额外处理不可见项与滚动容器  

## 6. 文件投放最小例

```js
zone.addEventListener('dragover', (e) => {
  e.preventDefault()
})

zone.addEventListener('drop', (e) => {
  e.preventDefault()
  const files = [...e.dataTransfer.files]
  // 交给上传流水线
})
```

配合上传限额、类型校验见 Node 上传笔记。

## 参考

- [MDN: HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [MDN: Working with the drag data store](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_data_store)
- [MDN: DataTransfer.setData()](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/setData)
- [MDN: DataTransfer.getData()](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/getData)
