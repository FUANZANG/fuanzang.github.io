# 推理模型（Reasoning / Thinking）

> 本文基于 2026-10 时点（OpenAI `reasoning_effort` 多档、Claude 4.7 起改用 adaptive thinking、DeepSeek 走 `reasoning_content`）。

> 关联：[LLM 基础概念](/notes/ai/llm-fundamentals)（token 与采样参数）、[前端对接 AI](/notes/ai/ai-frontend-integration)（消息 `parts` 结构）、[AI 交互模式](/notes/ai/ai-interaction-patterns)（思考过程怎么展示）、[本地大模型](/notes/ai/local-llm)（你本地的 r1 蒸馏版）。

## 推理模型是什么

普通 LLM 拿到问题直接输出答案；**推理模型（reasoning model）会先"想"一段再答**——这段内部推理叫**思维链**，产出的 token 叫 **reasoning tokens**（思考 token）。

```
普通模型：  问题 ────────────────────────→ 答案
推理模型：  问题 ──→ [思考：拆解/试错/回退] ──→ 答案
                     ↑ 这部分叫 reasoning tokens
```

关键认知：**它不是另一个物种**，而是同一族模型里"会用更多算力换准确率"的那一档。代价是**慢**和**贵**——所以它是个**要主动选择的档位**，不是无脑默认。

> 你本地那个 `deepseek-r1-0528-qwen3-8b` 就是推理模型（R1 的思考能力蒸馏进 8B）。跑起来会看到它"顿"一会儿才开始吐字——那一段就是在生成思考 token。本地跑的好处正好在这：**思考 token 不要钱**。

## 为什么贵：思考 token 按输出计费

这是选型时最容易被忽略的成本结构：

| 事实 | 说明 |
|---|---|
| **计费** | reasoning tokens **按输出 token 价计费**，没有单独的"思考价" |
| **看不见** | 它们**不出现在回答正文里**，但**照样计费** |
| **占窗口** | 和输入、输出**共享上下文窗口**——单次请求可能烧掉几万思考 token |
| **看用量** | Chat Completions 看 `completion_tokens_details.reasoning_tokens`；Responses API 看 `output_tokens_details.reasoning_tokens` |
| **设上限** | Responses API 用 `max_output_tokens`；Chat Completions 用 `max_completion_tokens`（**上限包含思考 token**） |

**算一笔账**：模型思考 3000 token、最终答了 300 token → **按约 3300 个输出 token 计费**。同样的答案，普通模型可能只花 300。

**工程含义**：给推理模型设 `max_output_tokens` 时要**给思考留空间**，否则思考没结束就被截断，拿到的可能是半个答案。

## 三家的控制方式（参数完全不同）

| | OpenAI | Claude | DeepSeek |
|---|---|---|---|
| 开关/档位 | `reasoning_effort` | `thinking: {type: 'adaptive'}` | `thinking: {type: 'enabled'}` 或 `reasoning.effort` |
| 调深度 | 同上 | **`effort`** 参数 | `reasoning_effort` |
| 可选值 | `none` / `minimal` / `low` / `medium` / `high` / `xhigh` / `max`（**支持范围与默认值因模型而异**） | `low` / `medium` / `high` / `xhigh` / `max` | `low` / `high` / `max` |
| 思考内容回传字段 | Responses API 的 reasoning items | thinking blocks | **`reasoning_content`** |

**⚠️ Claude 的破坏性变更**：老的写法 `thinking: {type: 'enabled', budget_tokens: N}` 是**手动扩展思考**，在 Claude 4.6 上已弃用，**Claude 4.7+ 直接拒收并返回 400**。新写法是 **adaptive thinking**——模型自己决定何时想、想多少，你用 `effort` 引导。**升级模型 ID 时别只换名字，参数也得跟着改。**

档位的语义直觉（以 OpenAI 的描述为例）：`none` = 延迟敏感（语音、分类）；`medium` = 大多数场景的平衡起点；`high` = 硬推理、复杂调试；`xhigh`/`max` = 深度研究、长跑 agent。**模型会在档位内自适应**——简单任务少花 token，难的自动多想。

## 前端要处理的：思考过程怎么展示

这是本篇对前端最实用的部分。**思考内容和答案在协议上是分开的两条流**：

```js
// 以 DeepSeek 流式为例：思考 token 先到，答案 token 后到
for await (const chunk of stream) {
  const d = chunk.choices[0].delta
  if (d.reasoning_content) appendThinking(d.reasoning_content)  // 思考阶段
  else if (d.content) appendAnswer(d.content)                    // 答案阶段
}
// 判据：第一个 content token 出现 = 思考阶段结束
```

**各家字段名不统一**（这是前端要写分支的地方）：

| 形态 | 代表 |
|---|---|
| `reasoning` 字段 | DeepSeek V4 Pro、GPT-OSS |
| `reasoning_content` 字段 | DeepSeek、Kimi、GLM、MiniMax |
| `</think>` 标签嵌在 `content` 里 | 部分 DeepSeek-R1 部署 |

**好消息**：用 [AI SDK](/notes/ai/ai-frontend-integration) 的话，这些差异被统一成了消息 `parts` 数组里的一种 part——`{ type: 'reasoning', text }`。渲染时和 text part 一起遍历即可，不用为每家写分支。

**UI 三条建议**：

+ **思考默认折叠**——用户要的是答案，思考过程是"可展开的过程展示"，别让它占满屏幕
+ **思考阶段要有状态**——"正在思考"的占位动画挂到 [AI 交互模式](/notes/ai/ai-interaction-patterns)那台状态机上（`status` 从 `submitted` 到 `streaming` 之间那段"只出思考不出答案"的空窗，用户最容易以为卡死了）
+ **思考内容一样要防 XSS**——它也是模型输出，渲染前照样净化

**多轮对话的回传规则（DeepSeek 有硬要求）**：

+ **请求带 `tools` 时**：历轮的 `reasoning_content` **必须完整回传**，否则上下文断裂、工具调用会出错
+ **不带 `tools` 时**：无需回传，传了也会被忽略
+ 换句话说：**思考内容是否属于"上下文"取决于这一轮是不是 agent 场景**——这条规则很反直觉，容易踩

## 什么时候该用，什么时候别用

| 适合 | 不适合 |
|---|---|
| 数学、逻辑、代码这类**有对错**的题 | 简单分类、抽取、改写（想了也没用，纯浪费） |
| 多步规划、复杂调试 | 语音、实时对话（延迟不可接受） |
| 高价值低频任务（质量 > 成本） | 大批量离线处理（成本会被思考 token 吃掉） |
| 需要"可审计的推理过程"的合规场景 | 纯创作/头脑风暴（要发散，不要收敛） |

口诀：**任务有"对错"且值得等 → 开推理；任务只要"像样" → 关掉。**

一个反向用法：**推理模型 + `reasoning_effort: 'none'` 就是普通模型**——同一个模型两种人格，按任务切档位，不必维护两套模型配置。

## 一个必踩的坑：带工具的请求

**Chat Completions + `tools` 时，OpenAI 要求 `reasoning_effort` 必须是 `none`**（GPT-5.4 起只在这个档位下允许工具调用；更新的模型在 Chat Completions 上甚至完全不支持工具）。

所以 agent 场景的正解是：

```
要用工具 + 要推理  →  走 Responses API（支持完整 effort 档位 + 可跨轮携带 reasoning items）
只能留在 Chat Completions  →  reasoning_effort: 'none'（等于放弃推理）
```

这条同样适用于 Claude 的 **interleaved thinking**（在工具调用之间思考）——它是 agent 场景真正想要的能力，且在自适应模式下**默认开启**。

## 学习路径建议

1. 同一个问题分别用你本地的 `r1-8b` 和普通模型问一遍，观察"顿一下才开始答"——建立体感
2. 用 `reasoning_content`（或 AI SDK 的 reasoning part）把思考流渲染成可折叠面板，看首 token 延迟和总耗时差多少
3. 同一个任务切 `low` / `medium` / `high` 三档，对比准确率与账单——找出你场景的甜点档
4. 故意在 Chat Completions 上带 `tools` 且不设 `reasoning_effort: 'none'`，看报错——把这个坑记牢
5. 读 [AI 评测与可观测](/notes/ai/ai-eval-observability)，把"该不该开推理"变成一个可测量的决策而不是感觉

## 参考

+ [Azure OpenAI · 推理模型（reasoning tokens 与 effort 档位）](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/reasoning)
+ [Claude · Extended thinking / adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
+ [DeepSeek · Thinking Mode（`reasoning_content` 与回传规则）](https://api-docs.deepseek.com/guides/thinking_mode/)
+ 本站：[LLM 基础概念](/notes/ai/llm-fundamentals) · [前端对接 AI](/notes/ai/ai-frontend-integration) · [AI 应用工程化](/notes/ai/ai-app-engineering)
