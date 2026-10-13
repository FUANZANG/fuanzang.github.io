# AI 交互模式

> 本文基于 2026-10 时点。**接入层**（怎么调 API）见[前端对接 AI](/notes/ai/ai-frontend-integration)，**协议层**（SSE 怎么消费）见 [AI 流式输出](/notes/ai/ai-streaming)；本篇讲**产品层**：AI 能力在界面上长成什么样、状态怎么管、交互怎么收尾。

## 三种形态

AI 落到界面上基本就这三类，选错形态比选错模型更伤体验：

| 形态 | 长什么样 | 典型场景 | 关键点 |
|---|---|---|---|
| **对话式** | 独立聊天页，多轮上下文 | 客服、知识问答、通用助手 | 会话管理、上下文窗口、历史持久化 |
| **内嵌式** | 融进已有表单/列表，用户无感 | 表单智能补全、搜索语义改写、标签推荐 | 不打断主流程、可撤销、失败要静默降级 |
| **生成式** | 对选中的内容做变换，结果就地替换 | 编辑器改写/翻译/解释、代码补全 | 选区上下文、diff 预览、撤销栈 |

判据：**用户要的是"对话"还是"结果"**。只是要个结果就别塞个聊天框——对话式把"输入成本"转嫁给了用户。

## 对话式：聊天界面

### 消息数据结构

```ts
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  status: 'pending' | 'streaming' | 'done' | 'error'
}
```

`status` 是这个界面的**状态机**，所有 UI 分支都挂在它上面：

```
pending    → 已发出，等首包        → 显示"思考中"占位
streaming  → 正在逐 token 上屏     → 显示光标动画 + 停止按钮
done       → 生成结束              → 显示复制/重新生成
error      → 失败                  → 显示重试（保留用户输入，别清空）
```

> 用 AI SDK 的 `useChat` 时这个状态机是内置的（`status`: `submitted` / `streaming` / `ready` / `error`），自己手写就要自己维护——见[前端对接 AI](/notes/ai/ai-frontend-integration)。

### 设计要点

+ **消息气泡**：区分用户/AI 角色；AI 侧要支持 **Markdown 渲染**（代码块、表格是刚需）
+ **流式光标**：生成中给一个闪烁光标或打字动画，比转圈更能说明"内容正在长出来"
+ **加载状态**：骨架屏撑住高度，避免首包到达时布局跳动
+ **自动滚动**：只在用户本来就贴底时才跟随滚动——用户手动往上翻时强行拉回是最招骂的交互之一
+ **历史记录**：本地（IndexedDB / localStorage）+ 服务端持久化，两者职责不同
+ **多轮上下文**：维护 `messages` 数组，注意上下文窗口——超了要么裁剪要么摘要（见 [LLM 基础概念](/notes/ai/llm-fundamentals)）

### 三个必备的"收尾"操作

AI 交互最容易漏的就是这些——只做了"发送"，没做"发错之后怎么办"：

| 操作 | 用户意图 | 实现要点 |
|---|---|---|
| **停止** | 生成太慢/答偏了 | `AbortController.abort()` 或 SDK 的 `stop()`；已生成内容**保留** |
| **重新生成** | 换一个答案 | 丢弃最后一条 assistant 消息重发；用 `regenerate()` |
| **编辑重发** | 我上一句问错了 | 截断该消息之后的历史再重发（否则上下文里留着"错的问题"） |

## 内嵌式：智能表单补全

用户填一半，AI 补剩下的。**关键是"可选、可撤销、不阻塞"**：

```ts
// 表单字段智能填充——注意这是"建议"，不是"替用户决定"
async function suggestFields(form: Record<string, string>) {
  const prompt = `根据以下已填内容，补全缺失字段。只返回 JSON，不要解释：
    ${JSON.stringify(form)}`

  const { text } = await generateText({ model: CHEAP_MODEL, prompt })
  return JSON.parse(text)   // 兜底：parse 失败就当没建议，静默降级
}
```

要点：

+ **必须可撤销**——建议值用不同底色标出来，用户改回或忽略都要顺手
+ **失败静默降级**——AI 挂了不能把表单也搞挂，原流程照走
+ **别在每次 `input` 事件上发请求**——防抖 + 取消上一次未完成请求（见 [AI 应用工程化](/notes/ai/ai-app-engineering)）

## 生成式：编辑器内联助手

选中一段文本 → 改写 / 翻译 / 解释 → 就地替换：

```ts
const ACTIONS: Record<string, string> = {
  rewrite:   '改写以下文本，使其更专业：',
  translate: '将以下文本翻译为英文：',
  explain:   '用通俗的语言解释以下概念：',
}

async function assist(selected: string, action: string) {
  const { textStream } = await streamText({
    model: SMART_MODEL,
    prompt: ACTIONS[action] + selected,
  })
  return textStream   // 边收边渲染到预览区
}
```

这个形态的独有难点：

+ **选区即上下文**：只把选中内容发出去，别把整篇文档塞进 prompt（成本 + 隐私）
+ **diff 预览**：改写类操作先给对照，用户确认再替换——直接覆盖是灾难
+ **撤销栈**：AI 的修改要和用户的手动编辑进同一个 undo 栈
+ **长文档分块**：超长文本要分段处理再拼接，注意段间衔接（见 [RAG](/notes/ai/rag) 的切块思路）

## 前端视角：为什么这些是前端活

AI 交互模式几乎是纯前端工程，且用的全是既有技能：

| AI 交互概念 | 前端等价物 |
|---|---|
| 消息状态机 | 请求状态管理（loading / error / success） |
| 流式渲染 | 增量 DOM 更新 + `requestAnimationFrame` 节流 |
| 停止/重生成 | `AbortController` + 乐观更新的回滚 |
| 会话持久化 | IndexedDB 离线存储 |
| diff 预览 | 文本 diff 库 + 双栏对照 |

**模型和协议都是别人定好的，交互是你唯一能做出差异的地方。**

## 学习路径建议

1. 先手写一个聊天界面（自己维护消息数组 + 状态机），体会状态分支有多少
2. 换成 `useChat` 重写一遍，对比代码量——理解 SDK 到底替你管了什么
3. 补上"停止 / 重新生成 / 编辑重发"三个收尾操作——多数 demo 都缺这三个
4. 挑一个内嵌场景（表单补全最省事）做一遍，重点练"失败静默降级"
5. 做编辑器助手时上 diff 预览 + 撤销栈，体会"AI 建议"与"用户决定"的边界

## 参考

+ [AI SDK · Chatbot UI 指南](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)
+ [MDN · AbortController](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController)
+ 本站：[前端对接 AI](/notes/ai/ai-frontend-integration) · [AI 流式输出](/notes/ai/ai-streaming) · [AI 应用工程化](/notes/ai/ai-app-engineering)
