# Agent Harness（智能体挽具）

> 本文基于 2026-09 时点的 harness 生态（ETCLOVG 分类法 2026 年提出；lm-eval-harness 当前 v0.4.x）。

"harness" 直译**马具**：给马套上缰绳和挽具，野马力气再大也拉不了犁——**规具把原始力量变成可控的功**。技术圈借这个意象形容"套在模型外面的装备层"。这词 2026 年已热到有 Wikipedia 词条和专门学术综述，但含义随语境漂移，先一词三义对齐：

| 说法 | 领域 | 指什么 |
|---|---|---|
| **agent harness** | AI 工程（当前主流含义） | 把 LLM 变成能干活的 agent 的软件脚手架（本文主角） |
| eval harness | 模型评测 | 评测框架，如 EleutherAI 的 lm-eval-harness |
| test harness | 软件测试 | 跑测试的基础设施：运行器 + 断言 + mock + 报告，Vitest 本身就是一个 |

## Agent Harness 是什么

LLM 本体只会一件事：**输入 token → 输出 token**。它不能读文件、不能执行命令、不记得昨天、跑完一轮就失忆。Agent harness 就是包裹它的那层软件，把"原始智能"变成"能干活的系统"：

```
LLM 本体（纯函数：token → token）
   ↕ 被包裹
Agent Harness：
  ├─ 循环（loop）     模型说"要调工具"→ 执行 → 结果喂回 → 继续，直到任务完成
  ├─ 工具（tools）    文件读写、shell、搜索、浏览器——模型作用于世界的手
  ├─ 上下文管理      决定每轮塞进上下文窗口什么、历史怎么压缩、缓存怎么命中
  ├─ 状态与记忆      会话持久化、跨会话记忆
  └─ 护栏            权限边界、审批策略、沙箱
```

### 多 Agent 编排（认脸）

复杂任务把"一个 agent 全干"拆成"多个专职 agent 协作"——核心动机不是分工好看，而是**上下文隔离**：主 agent 只看任务与结论，不泡在子任务的工具输出细节里，上下文窗口不被噪音填满。

```
Orchestrator（主 agent：拆任务、收结果、定下一步）
  ├─ Subagent A：搜索调研（产出摘要给主 agent）
  ├─ Subagent B：写代码（只回传 diff）
  └─ Subagent C：跑测试（只回传通过/失败）
```

常见模式：**orchestrator-worker**（主从分发，最常用）、**sequential pipeline**（流水线接力）、**reviewer**（生成者+审查者对抗）。代价是延迟与 token 翻倍——简单任务单 agent 更优。Claude Code 的 delegate、Hermes 的子代理都是这套。

Simon Willison 的一句话定义流传最广：**"models using tools in a loop"**——用着工具的模型跑在循环里。

**你天天在用的就是 harness**：Claude Code、Codex CLI、Cursor、OpenCode、Hermes 等——同一个模型换不同 harness，表现天差地别。

### ETCLOVG：七层解剖

2026 年学术综述（arXiv 2507.15330）给 harness 下了正式定义并拆成七层，映射了 170+ 开源项目：

| 层 | 职责 | 例子 |
|---|---|---|
| **E**xecution 执行环境 | 动作在哪跑、爆炸半径多大 | 沙箱、microVM、浏览器环境 |
| **T**ooling 工具接口 | 能力怎么描述、发现、调用 | MCP 协议、工具 schema 校验 |
| **C**ontext 上下文 | 模型每步能看到什么 | 压缩、检索、缓存 |
| **L**ifecycle 生命周期 | 控制流与状态机 | 内循环、多 agent 编排、检查点 |
| **O**bservability 可观测 | 追踪、成本、失败信号 | Langfuse、OpenTelemetry |
| **V**erification 验证 | "跑完了"≠"跑对了" | LLM-as-judge、回归评测 |
| **G**overnance 治理 | 安全与权限 | 审批钩子、审计、人机交接 |

前四层（E/T/C/L）是**结构支柱**——让 agent 跑起来；后三层（O/V/G）是**控制面**——让它可观测、可验证、可治理。综述的发现：开源生态在 E/T/C/L 很密，O/V/G 是普遍短板（89% 团队有可观测，只有 52% 跑离线评测——看得见做了什么，不判断做得对不对）。O/V 落地见 [AI 评测与可观测](/notes/frontier/ai-eval-observability)。

## Harness 工程三阶段

综述把 AI 应用工程化划成三个演进阶段，每层包含前一层：

```
Prompt 工程（2022–24）  优化单次调用的输入文本
    ↓
Context 工程（2025）    "每一步该让模型看到什么"——检索、压缩、工具结果排序
    ↓
Harness 工程（2026–）   整个包裹系统成为一等工程对象
```

**harness 有多重要（实测数据）**：

+ 只换工具格式/harness、不动模型：某模型编码基准最高 **10 倍**提升
+ LangChain DeepAgents 重构 harness（系统提示 + 上下文注入 + 自验证钩子）：固定 GPT-5.2-Codex 在 Terminal-Bench 2.0 从 **52.8% → 66.5%**
+ 工具格式优化一项：SWE-bench **6.7% → 68.3%**——超过同期任何模型升级的幅度

所以圈内共识："**agent 的上限由模型决定，下限由 harness 决定**"。

### 设计趋势：harness 越来越薄

Anthropic 官方博客《Agent Harness Design》的核心观点——**模型越强，harness 该管的越少**：

+ 旧模式：harness 编排一切（规定工具调用顺序、代理模型做路由决策）
+ 新模式：给模型代码执行工具（bash/REPL），**让它自己写代码串联工具**——编排权从 harness 移回模型，"强编码模型 = 强通用 agent"
+ harness 退守三件事：UX 边界、成本（上下文缓存设计，缓存 token 只花 10% 价格）、安全

设计心法叫 "**ask what you can stop doing**"：每次模型升级，审计一遍 harness 里哪些补偿逻辑可以删了。

## 另外两个 harness（收编）

**Eval harness**：模型评测框架——把同一套基准题以标准方式喂给不同模型、收集打分。事实标准是 EleutherAI 的 **lm-evaluation-harness**（`pip install lm_eval`，v0.4.x，2025-12 重构了 CLI：`lm-eval run --model hf --tasks mmlu`）。MMLU/GSM8K 这些跑分基本出自它。与 agent harness 的关系：eval harness 测的是"裸模型"，agent benchmark（SWE-bench、Terminal-Bench）测的是"模型+harness"——后者分数受两者共同影响。

**Test harness**：跑测试的基础设施（运行器 + 断言 + mock + 钩子 + 报告）。Vitest 是一个 test harness，JUnit + Mockito + AssertJ 组合也是一个。见 [Java 测试](/notes/backend/java-testing)、[前端测试](/notes/performance/frontend-testing)。

## 前端视角：为什么这跟你有关

Harness 工程是**前端转 AI 工程最顺的切入点**——它的核心技能全是你的既有栈：

+ CLI/TUI 交互、流式渲染（[AI 流式输出](/notes/frontier/ai-streaming)就是 harness 的输出层）
+ 工具调用协议（JSON schema 描述能力 ≈ 前端 API 层的类型定义）；可复用流程打包见 [Agent Skill](/notes/frontier/agent-skills)
+ 上下文管理 ≈ 前端状态管理（什么该进 store、什么该丢弃、什么该持久化）——Skill 是按需加载的那一类上下文
+ 沙箱、权限审批流 ≈ 前端安全与权限设计

模型是别人的（API 调用），harness 是你的产品——**应用层的价值沉淀在 harness**。

## 参考

+ [Agent harness — Wikipedia](https://en.wikipedia.org/wiki/Agent_harness)
+ [Agent Harness Design — Anthropic 官方博客](https://claude.com/blog/harnessing-claudes-intelligence)
+ [Agent Harness Engineering: A Survey（ETCLOVG，arXiv 2507.15330）](https://arxiv.org/abs/2507.15330)
+ [lm-evaluation-harness（EleutherAI）](https://github.com/EleutherAI/lm-evaluation-harness)
+ [Microsoft Agent Framework — Harness 概念](https://learn.microsoft.com/en-us/agent-framework/concepts/harness)
+ 本站：[AI 评测与可观测](/notes/frontier/ai-eval-observability)
