# Agent 设计模式（控制流）

> 本文基于 2026-11 时点的 agent 模式实践：三大经典模式出自 2022–2023 年的论文，执行沙箱小节基于 2026-09 的生态横评（E2B / Vercel Sandbox / Modal / gVisor / Firecracker）。
>
> 关联：[Agent Harness](/notes/ai/agent-harness)（七层解剖、多 agent 拓扑）、[MCP 与工具调用](/notes/ai/mcp-tools)（工具协议）、[AI 应用工程化](/notes/ai/ai-app-engineering)（可靠性与成本）。

## 定位：拓扑 vs 控制流

Harness 篇回答"该搭哪些层、多个 agent 怎么连"（拓扑）；本篇回答**单个 agent 内部，什么时候想、什么时候做、什么时候回头**（控制流）。三种模式 2022–2023 年提出，2026 年仍是默认词汇：

| 模式 | 一句话 | 出处 |
|---|---|---|
| **ReAct** | 想 → 做 → 看结果 → 再想，一步步推进 | Yao et al., 2022 |
| **Plan-and-Execute** | 先写完整计划，再逐步执行，失败才重规划 | Wang et al., 2023 |
| **Reflexion** | 做完一轮先写"哪里错了"存下来，作为下一轮参考 | Shinn et al., 2023 |

## ReAct：默认起点

模型交替输出"思考 + 动作"，harness 执行动作、把观察喂回，模型再决定下一步：

```
Thought: 先看哪个文件？
Action:  grep "login" src/
Observation: 3 处命中 → login.ts 第 42 行
Thought: 看 42 行的上下文
Action:  read_file login.ts:38-46
……直到最终回答或触发护栏
```

- 适合：**路径未知、每一步都依赖上一步的观察**——探索式调试、开放调研、"先查订单再定是否退款"的客服
- 代价：每步一次模型调用，且每轮重发全部上下文（成本见 [AI 应用工程化](/notes/ai/ai-app-engineering)）
- 2026 实践规则：**从单 agent ReAct 起步**；只有复杂度能明确归因于单 agent 的某个失败模式时，才上多 agent 编排——否则只是白白翻倍延迟和 token

## Plan-and-Execute：先写计划再执行

把"想"和"做"拆成两个角色：

```
Planner（强模型）：目标 → 有序步骤列表（理想是结构化数据，不是散文）
Executor（便宜模型或纯代码）：逐步执行、收集结果
Replanner：失败后看 计划 + 已有结果 + 目标，决定继续 / 修改 / 结束
```

- 适合：**任务结构可预测**（升级五个依赖、抓四份报表再合并），以及**想要审查点**——计划是数据，人或策略引擎可以在开跑前读一遍并批准；ReAct agent 从不展示计划，只展示下一步
- 两个省成本变体：**ReWOO**（只规划一次，后续步骤尽量并行执行）、**LLMCompiler**（工具调用表达成依赖 DAG，独立步骤并行跑）
- 典型失败：**计划过期**——环境中途变化，计划不再成立；这时若每步都重规划，等于用额外开销重建了 ReAct

## Reflexion：回头再试

循环比 ReAct 多一层：尝试 → 评估 → 写一段"哪里错了"的口头反思 → 存入**情景记忆**（episodic memory，"我经历过什么"的记忆，区别于"我知道什么"的语义记忆）→ 下一轮尝试开始时读出来作参考。原文的做法是"用语言反馈强化，而不是更新权重"。

**关键判断：批评必须落在模型自己没生成的信号上**——它没写的测试、编译器、linter、schema 校验器、检索到的文档，都是好批评者；**同一个模型重读自己的答案是弱批评者**（它会挑出根本不存在的问题）。

适合：**做对比做快重要**，且存在可靠检查器的场景（代码生成 + 跑测试、JSON 生成 + schema 校验）。

## 对比与选型

| 模式 | 每任务模型调用 | 相对延迟 | 典型失败模式 | 最佳场景 |
|---|---|---|---|---|
| ReAct | N 步 N 次 | 随步数浮动 | 无全局观、绕远 | 交互任务、搜索深度未知 |
| Plan-and-Execute | 1 规划 + N 便宜步 + 偶尔重规划 | 可预测、有界 | 计划过期 | 可预测多步任务、要审查点 |
| Reflexion | ×N 轮（每轮 = 尝试 + 反思） | 成倍放大 | 批评漂移 | 高错误成本、有检查器 |

三个决策问题（2026 经验法则）：

1. **交互式的、下一步真的依赖观察？** → ReAct
2. **发现 ReAct agent 每次都在重新推导同一套计划？** → 换 Plan-and-Execute（省掉重复推导，还白得一个审查点）
3. **最终答案质量 > 墙上时钟？** → 外加 Reflexion 外层循环（必须配步数预算，如最多重试 3 次）

## 执行沙箱：工具在哪跑

agent 的工具常常是「跑代码 / 跑 shell / 开浏览器」——这由 harness 的 **E 层**决定，先认隔离阶梯（从松到紧）：

| 层 | 机制 | 例子 | 残余风险 |
|---|---|---|---|
| 进程内解释器 | 虚拟文件系统上重实现 shell/语言 | just-bash、Pydantic Monty | 逃逸打宿主语言运行时 |
| OS 进程沙箱 | 内核级文件/网络规则 | bubblewrap、Seatbelt | 其余资源仍与宿主共享 |
| 容器 | namespaces + cgroups，**共享宿主内核** | Daytona、Codex cloud | 内核漏洞可跨界 |
| gVisor | 用户态拦截系统调用 | Modal 默认 | 系统调用密集时更慢 |
| **microVM** | 自带 guest 内核 | Firecracker（E2B、Vercel Sandbox 等） | 启动成本；网络与凭据仍要单管 |

**2026 默认：不可信代码 = microVM。** 口诀只有两句——**大脑与密钥在沙箱外**；**隔离 ≠ 完事（出站白名单、封云元数据）**。E2B / 权限 HITL / 产物预览等落地，见 [Agent 沙箱与 Code Agent](/notes/ai/agent-sandbox)，本篇不展开。

## 前端视角

+ Plan-and-Execute ≈ "先出任务清单、按序执行、支持撤销"——checkpoint（检查点）就是 undo/redo 历史
+ 框架的 interrupt / 审批 ≈ 你写权限弹窗 + 确认按钮的既有心智模型
+ Reflexion ≈ 编辑器里"lint 报错 → 自动修复 → 重跑测试"的循环，只是执行者换成了模型
+ 模式选型 ≈ 渐进增强：从便宜的开始，观察失败模式再升级

## 学习路径建议

1. 手写一个单 agent ReAct 循环（TS，约 100 行），配两个工具：读文件、跑命令（先不用沙箱）
2. 升级 Plan-and-Execute：计划是 JSON 数组，执行器是纯代码；加一道"展示计划、点确认才跑"的门
3. 给一个有检查器的任务（生成 JSON + schema 校验）加 Reflexion 外层（最多 3 轮），记录 token 成本倍数
4. 把代码执行搬进沙箱：同一任务分别在 E2B 与本地 Docker 跑，体会"爆炸半径"差别（落地见 [Agent 沙箱与 Code Agent](/notes/ai/agent-sandbox)）
5. 读 [Agent 框架生态](/notes/ai/agent-frameworks)，看这些模式在框架里如何暴露成 API；图编排专篇见 [LangGraph 实战](/notes/ai/langgraph)

## 参考

+ ReAct：arXiv 2210.03629（Yao et al., 2022）
+ Reflexion：arXiv 2303.11366（Shinn et al., 2023）
+ ReWOO / LLMCompiler（规划后并行执行的变体，2023）
+ [E2B 文档](https://e2b.dev/docs) · [Vercel Sandbox](https://vercel.com/sandbox) · [gVisor](https://gvisor.dev) · [Firecracker](https://firecracker-microvm.github.io)
+ 本站：[Agent Harness](/notes/ai/agent-harness) · [Agent 沙箱与 Code Agent](/notes/ai/agent-sandbox) · [Agent 框架生态](/notes/ai/agent-frameworks) · [Agent 记忆系统](/notes/ai/agent-memory)
