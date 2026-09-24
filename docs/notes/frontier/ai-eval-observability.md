# AI 评测与可观测

> 本文基于 2026-09 时点的应用层实践（Langfuse / Phoenix 类平台已成常见默认；LLM-as-judge 是生成质量主路径）。定位补齐 [Agent Harness](/notes/frontier/agent-harness) 的 **O（可观测）与 V（验证）**：看得见花了什么、判得出好不好。

> 关联：[RAG](/notes/frontier/rag)（检索要测 recall）、[LLM 基础](/notes/frontier/llm-fundamentals)（幻觉）、[后端可观测](/notes/backend/observability)（Trace 概念通用，信号不同）。

## 为什么「能跑」不等于「能用」

Harness 综述里的对比值得再钉一次：多数团队有追踪，只有一半在做离线评测——**看得见调用链，却不知道答案对不对**。

```
可观测 O：这次调用的延迟、token、工具次数、失败点     → 排障 / 控成本
验证   V：这批题目上质量有没有回退、幻觉率多少         → 发版门禁
```

前端类比：有 RUM 和报错监控，不等于有 E2E 断言；AI 这边断言更难，所以要单独建评测集。

## 可观测：要盯的信号

| 信号 | 为什么重要 |
|---|---|
| **延迟**（首 token / 整段） | 体验；流式只看总耗时会误判 |
| **Token 与费用** | 输入/输出/缓存命中分开；贵通常贵在上下文膨胀 |
| **工具调用次数与失败率** | Agent 死循环、错误重试烧钱 |
| **检索命中**（RAG） | 召回空/错 → 后面生成再强也是编 |
| **用户反馈** | 点踩、重新生成、是否点击引用——线上真信号 |

### Trace 长什么样

一次对话 / 一次 agent 任务 = 一个 **Trace**，下面挂 Span：

```
Trace: user_chat_982
  ├─ Span: retrieval（topK=5, latency=80ms）
  ├─ Span: llm.completion（model=…, tokens_in=1.2k, out=340）
  │    └─ 子：tool.get_weather → tool result
  └─ Span: guardrail / 输出过滤
```

平台认脸：Langfuse、LangSmith、Arize Phoenix、OpenLLMetry——选一个接入，别自建半套。协议层仍可走 OpenTelemetry，和 [后端可观测](/notes/backend/observability) 同一套世界观。

```ts
// 伪代码：在现有 OpenAI 封装外包一层
const span = trace.startSpan('llm.completion', {
  model, 'gen_ai.request.model': model,
})
try {
  const res = await client.chat.completions.create({ ... })
  span.setAttributes({
    'gen_ai.usage.input_tokens': res.usage.prompt_tokens,
    'gen_ai.usage.output_tokens': res.usage.completion_tokens,
  })
  return res
} finally {
  span.end()
}
```

生产采样：调试会话可 100%；高 QPS 聊天要降采样，但**报错与用户点踩全量留**。

## 评测：离线门禁

### 两层（尤其 RAG）

| 层 | 测什么 | 常见指标 |
|---|---|---|
| **检索** | 该找的块找到了吗 | recall@k、MRR、命中率 |
| **生成** | 基于材料答得对不对、有没有胡编 | 忠实度、正确率、LLM-as-judge 分 |

「只问最终答案对不对」会掩盖检索烂、模型靠背答案蒙对的情况——RAG 必拆两层。见 [RAG](/notes/frontier/rag)。

### LLM-as-judge

用更强（或专用）模型按量规打分：

```
给定：用户问题、检索材料、模型回答
请判断：回答是否只使用了材料中的事实？（是/否 + 一句理由）
```

注意：judge 自己也会漂，要**固定模型版本 + 固定 prompt + 小人工抽检集**校准。别把 judge 分数当成物理真理。

### 评测集从哪来

+ 真实日志采样（脱敏）+ 标注期望要点 / 引用块 id
+ 故意造的刁钻 case：专有名词、多跳、材料不足应拒答
+ 回归包：每次改 prompt / 换模型 / 改切块，跑同一包看是否掉点

Agent 场景再用任务级基准（能否完成改 bug、能否通过测试）——那是「模型+harness」合测，和裸模型 MMLU 不是一回事（见 Harness 篇 eval harness）。

## 线上质量闭环

```
离线评测过门禁 → 灰度放量
  → 盯：错误率、延迟、费用、点踩率
  → 坏 case 回流进评测集
  → 下一轮改 prompt / 检索 / 工具
```

没有回流，可观测只是昂贵的仪表盘。

## 和现有笔记的分工

| 主题 | 所在篇 |
|---|---|
| Harness O/V/G 概念 | [Agent Harness](/notes/frontier/agent-harness) |
| RAG 检索与生成质量 | [RAG](/notes/frontier/rag) + 本篇指标 |
| HTTP/服务 Trace、Metrics | [后端可观测](/notes/backend/observability) |
| Token/成本直觉 | [LLM 基础](/notes/frontier/llm-fundamentals) |
| 应用层 AI Trace / 评测门禁 | 本篇 |

## 学习路径建议

1. 给现有聊天封装接一个 Langfuse/Phoenix，看清单次 Trace 的 token 与耗时
2. 为笔记 RAG 原型建 20 条评测集：标注应命中的文件名；算 recall@5
3. 加一道忠实度 judge；改 prompt 前后各跑一遍对比
4. 产品加「有用/无用」按钮，点踩自动链到 Trace
5. 之后按需：agent 轨迹评测、提示词版本管理、费用预算告警

## 参考

+ [Langfuse](https://langfuse.com/docs)
+ [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
+ [RAGAS](https://docs.ragas.io/)（RAG 评测常用库）
+ 本站：[Agent Harness](/notes/frontier/agent-harness) · [RAG](/notes/frontier/rag)
