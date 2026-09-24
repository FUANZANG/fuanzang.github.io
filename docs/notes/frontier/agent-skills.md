# Agent Skill

> 本文基于 2026-09 时点的 Cursor / Claude 等 harness 里的 Skill 实践（`SKILL.md` 已成常见交付物）。定位识字：Skill 是什么、和 MCP / AGENTS.md / 系统提示差在哪、什么时候该写成 Skill。

> 关联：[Agent Harness](/notes/frontier/agent-harness)（上下文与生命周期）、[MCP 与工具调用](/notes/frontier/mcp-tools)（运行时能力）、[LLM 基础](/notes/frontier/llm-fundamentals)（上下文窗口与指令）。

## Skill 是什么

**Skill = 打包好的、可按需加载的「怎么做某类事」说明书**——给 agent 的程序性知识，不是新的模型能力。

```
用户：「按我们团队规范写个 PR」
  → harness 匹配到 skill「creating-pull-requests」
  → 把 SKILL.md（必要时再带 reference）塞进上下文
  → 模型按里面的步骤/清单执行
```

前端类比：

| 概念 | 近似 |
|---|---|
| 系统提示 / 人设 | 全局 `provide` 的默认配置 |
| **Skill** | 按路由懒加载的「业务手册 composable」 |
| MCP 工具 | 真正能调的 API（有副作用） |
| AGENTS.md | 这个仓库的常驻 README（agent 版） |

关键点：**Skill 默认不占满上下文**——只有描述匹配到当前任务时才加载正文（progressive disclosure），省 token、也少干扰。

## 和几个易混概念切开

| | 管什么 | 何时进上下文 |
|---|---|---|
| **系统提示** | 全局人设与硬规则 | 几乎每次请求 |
| **AGENTS.md** | 「这个仓库」怎么构建/测试/约定 | 打开该仓库时常驻或优先读 |
| **Skill** | 「这类任务」的标准做法（可跨仓库复用） | 任务匹配时按需加载 |
| **MCP / Function Calling** | 能调用的外部能力（读写、HTTP、浏览器…） | 工具定义常在；**执行**在应用侧 |
| **Rules**（各家名字不同） | 更短的强制约束 / 文件级规范 | 常比 Skill 更「硬」、更常驻 |

一句话：**Skill 教流程；MCP 给双手；AGENTS.md 讲本仓库；系统提示定人格。**

```
没有 Skill：每次都在聊天里把「我们 PR 要含 Test plan、用 HEREDOC…」再说一遍
有了 Skill：写进 SKILL.md，匹配到「创建 PR」自动带上同一套步骤
```

## 最小结构：`SKILL.md`

各家目录名略异（Cursor 常见 `.cursor/skills/<name>/` 或个人 `~/.cursor/skills/`），骨架一致：

```
my-skill/
├── SKILL.md          # 必选：说明 + 流程
├── reference.md      # 可选：细节文档（需要时再读）
├── examples.md       # 可选：示例
└── scripts/          # 可选：校验/辅助脚本
```

```markdown
---
name: creating-pull-requests
description: >
  用 gh 创建 PR。在用户要求开 PR、推分支并建合并请求时使用。
---

# 创建 Pull Request

1. 并行跑 git status / diff / log，摸清分支相对 main 的状态
2. 推送（需要时 `-u`）
3. `gh pr create`，body 用 HEREDOC……
```

写作要点（和写 MCP `description` 同一肌肉）：

1. **`description` 决定会不会被选中**——写清「做什么 + 什么时候用」，别写空泛「帮助写代码」
2. **正文保持短**：步骤、清单、硬约束；大段参考丢到 `reference.md` 按需读
3. **可执行优先**：能写成 checklist / 命令序列就别写成散文
4. **个人 vs 项目**：个人 Skill 跟你走；项目 Skill 进仓库，团队共享同一套流程

## 什么时候该写成 Skill

**值得写**：

+ 重复 ≥ 3 次的标准流程（开 PR、发版、按规范写 commit、对接某内部系统）
+ 团队约定多、模型靠「猜」会踩坑（审查口径、安全红线、禁止事项）
+ 需要固定输出格式（表格字段、PR 模板、变更说明结构）

**不必写**：

+ 一次性问题、纯聊天探讨
+ 已经是工具该干的事（「查天气」→ MCP；「按手册发 PR」→ Skill）
+ 整本框架文档——那是 RAG / 链接，不是往上下文里塞书

## 和 Harness 的关系

在 [ETCLOVG](/notes/frontier/agent-harness) 里，Skill 主要落在：

+ **C（Context）**：按需注入，属于上下文工程的一等手段
+ **L（Lifecycle）**：哪些步骤必须按 Skill 走（可带钩子/脚本）
+ **G（Governance）**：把审批、禁止项写进 Skill，比口头叮嘱稳

模型越强，Skill 越该写「目标与约束」，少写「逐步替模型做决定」——和 Harness 篇「ask what you can stop doing」一致。

## 学习路径建议

1. 把你重复过两遍的流程（例如「本站加一篇笔记要改 config + README 统计」）收成一个项目 Skill
2. 只写好 `description`，故意换几种用户说法，看 harness 会不会命中
3. 把又长又少用的表格挪到 `reference.md`，对比加载前后的 token
4. 再写一个个人 Skill（跨仓库通用，如 commit 文风），体会个人 vs 项目边界
5. 需要外部系统时：Skill 里写「何时调用哪个 MCP」，工具本身仍用 [MCP 篇](/notes/frontier/mcp-tools) 那套

## 参考

+ [Cursor · Agent Skills](https://cursor.com/docs)（以你当前客户端文档为准）
+ [Anthropic · Skills / 工具使用相关文档](https://docs.anthropic.com/)
+ 本站：[Agent Harness](/notes/frontier/agent-harness) · [MCP 与工具调用](/notes/frontier/mcp-tools)
