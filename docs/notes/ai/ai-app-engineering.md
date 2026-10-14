# AI 应用工程化

> 本文基于 2026-10 时点。前面几篇讲"怎么接进来"（[前端对接 AI](/notes/ai/ai-frontend-integration)）、"长什么样"（[AI 交互模式](/notes/ai/ai-interaction-patterns)）；本篇讲**上线之后才疼的三件事：成本、可靠性、安全**。

## 成本：按 token 计费意味着什么

LLM 是**按量计费**的（见 [LLM 基础概念](/notes/ai/llm-fundamentals)），而且**每轮对话都要重发全部历史**——所以成本不是线性的，是随对话轮数平方级增长的。四个抓手按性价比排序：

| 手段 | 省多少 | 代价 |
|---|---|---|
| **Prompt 缓存** | 命中部分按约 **10%** 计价 | 前缀必须逐字节一致（system 放最前、历史只追加不改） |
| **小模型分诊** | 简单任务成本差一个量级 | 要能判断"哪些任务简单" |
| **上下文裁剪** | 线性省 | 可能丢信息，需保 system + 最近 N 轮 |
| **Batch API** | 约 **五折** | 不保证实时，24h 内返回 |

**Prompt 缓存是最容易被忽略的免费午餐**——但它的命中条件是"前缀逐字节一致"，所以：system prompt 放最前面、对话历史只追加不修改、工具定义别每次动态生成（哪怕多一个空格也整段失效）。

### 上下文裁剪

窗口快满时不能简单截断——**system 必须留，最近几轮必须留**：

```ts
function truncateMessages(messages: ChatMessage[], maxTokens: number) {
  const system = messages[0]?.role === 'system' ? messages[0] : null
  const result: ChatMessage[] = []
  let used = system ? countTokens(system.content) : 0

  // 从最新往旧收，收不下就停
  for (let i = messages.length - 1; i >= (system ? 1 : 0); i--) {
    const t = countTokens(messages[i].content)
    if (used + t > maxTokens) break
    result.unshift(messages[i])
    used += t
  }
  return system ? [system, ...result] : result
}
```

> 更成熟的做法是**摘要压缩**（把旧轮次让模型压成一段摘要再带上），代价是多一次调用——这是 agent harness 上下文层（C 层）的核心职责，见 [Agent Harness](/notes/ai/agent-harness)。

### 别在每次按键上发请求

```ts
// 输入防抖：用户停止输入后才发
function debouncedSend(send: (v: string) => void, delay = 500) {
  let timer: ReturnType<typeof setTimeout>
  return (v: string) => {
    clearTimeout(timer)
    timer = setTimeout(() => send(v), delay)
  }
}

// 并发限流：同时最多 N 个在执行
function createLimiter(max = 3) {
  let active = 0
  const queue: (() => void)[] = []
  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>(r => queue.push(r))
    active++
    try { return await fn() }
    finally { active--; queue.shift()?.() }
  }
}
```

防抖解决"发太勤"，限流解决"同时太多"——**搜索建议这类场景两个都要**，否则用户快速输入就是几十个并发请求。

## 可靠性：AI 接口天生不稳定

模型服务是**外部依赖**，且比普通 API 更容易抖（长连接、限流、超时）。工程上要按"随时会挂"设计。

### 重试：只重试该重试的

```ts
async function fetchWithRetry(
  url: string, options: RequestInit,
  { maxAttempts = 3, baseDelay = 1000, retryable = [429, 500, 502, 503] } = {}
): Promise<Response> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options)
      if (res.ok) return res

      if (retryable.includes(res.status)) {
        // 429 优先听服务端的 Retry-After，否则指数退避
        const after = res.headers.get('Retry-After')
        const delay = after ? Number(after) * 1000 : baseDelay * 2 ** (attempt - 1)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      throw new Error(`HTTP ${res.status}`)   // 4xx（除 429）不该重试
    } catch (e) {
      if (attempt === maxAttempts) throw e
      await new Promise(r => setTimeout(r, baseDelay * attempt))
    }
  }
  throw new Error('Max retry attempts reached')
}
```

三条规则：**4xx 不重试**（你请求写错了，重试一万次也一样）、**429 听 `Retry-After`**（服务端已经告诉你等多久）、**退避要有上限**（别把用户的等待叠成分钟级）。

### 降级：模型会挂，业务不能挂

```ts
// 降级链：主力 → 同级备用（换一家）→ 小模型兜底
const MODEL_CHAIN = [PRIMARY, FALLBACK, CHEAP_FALLBACK]  // 模型 ID 以各家当前文档为准

async function chatWithFallback(messages: ChatMessage[]) {
  for (const model of MODEL_CHAIN) {
    try { return await chatCompletion(messages, { model }) }
    catch (e) { console.warn(`${model} 失败，尝试下一个`, e) }
  }
  throw new Error('所有模型均不可用')
}
```

降级链的**最后一环应该是"优雅失败"而不是"再试一次"**：AI 功能不可用时，界面要给明确提示并保住用户的输入，别让整个页面跟着白屏。

## 安全：AI 引入的三类新风险

### 1. 敏感信息外发

用户粘贴的内容里可能带身份证号、银行卡号——**这些会被发到模型服务商**。发送前过滤：

```ts
function sanitizeInput(input: string): string {
  return [
    /\d{17}[\dXx]/,      // 身份证号
    /\d{16,19}/,         // 银行卡号
  ].reduce((text, re) => text.replace(re, '[已过滤]'), input)
}
```

这既是合规要求，也是用户信任问题——**在界面上明确告诉用户"内容会发送给第三方模型服务"**比默默发送更负责。

### 2. AI 输出当 HTML 渲染 → XSS

AI 生成的 Markdown 里可能有 `<script>`、`<img onerror>`、`javascript:` 链接。**只要走 `v-html` / `innerHTML`，就必须先净化**：

```ts
import DOMPurify from 'dompurify'
import { marked } from 'marked'

function renderAIContent(markdown: string): string {
  const html = marked(markdown)
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'code', 'pre', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'class'],
  })
}
```

这和你笔记里的[前端安全](/notes/performance/frontend-security)是同一套防线，只是**注入源从"用户输入"变成了"模型输出"**——而模型输出比用户输入更不可信，因为它会复述别人喂给它的内容。

### 3. Prompt 注入

用户输入里夹带指令劫持模型行为（"忽略以上所有指令…"）。防护层次与它和 SQL 注入的同源性见 [LLM 基础概念](/notes/ai/llm-fundamentals#prompt-注入-ai-应用的头号安全威胁)。

**前端侧的职责**：用户输入发往 AI 接口前做基础过滤与长度限制；**敏感操作（删数据/转账/发邮件）必须走代码层审批，绝不信任模型的"判断"**——模型说"用户已确认"不算确认。

## 可观测：不上线就不知道钱花在哪

至少埋三类点：

+ **每次调用的 token 用量与延迟**（按模型、按功能维度聚合）——成本归因的唯一依据
+ **失败率与重试次数**——区分"模型慢"和"你的代码错"
+ **用户侧信号**——重新生成率、停止率、引用点击率（RAG 场景）——**这是唯一能反映"答得好不好"的真实数据**

评测与可观测的完整方法论见 [AI 评测与可观测](/notes/ai/ai-eval-observability)。

## 学习路径建议

1. 给现有 AI 调用加上 token 计数与日志，跑一天，看成本曲线（多数人会惊讶）
2. 把 system prompt 挪到最前、历史改成纯追加，再对比账单——验证 prompt 缓存
3. 给请求加防抖 + 限流，用 DevTools Network 面板确认并发数降下来了
4. 故意把 API Key 改错 / 断网，看降级链和错误提示是否按预期工作
5. 把 AI 输出渲染改成 `marked + DOMPurify`，自己构造一段带 `<script>` 的假回答验证被拦

## 参考

+ [OpenAI · Production best practices](https://platform.openai.com/docs/guides/production-best-practices)
+ [DOMPurify](https://github.com/cure53/DOMPurify)
+ [OWASP · LLM Top 10](https://genai.owasp.org/llm-top-10/)
+ 本站：[前端对接 AI](/notes/ai/ai-frontend-integration) · [AI 评测与可观测](/notes/ai/ai-eval-observability) · [前端安全](/notes/performance/frontend-security)
