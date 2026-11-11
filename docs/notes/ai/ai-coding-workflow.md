# AI Coding 工作流

> 本文基于 2026-11 时点的 Agentic Coding 实践（Claude Code / Codex / Cursor Agent；Spec 驱动与 Vibe 驱动两条主流路径）。定位：**用 AI 交付工程**，不是「多一个自动补全」。
>
> 关联：[Agent Harness](/notes/ai/agent-harness)（循环与护栏）、[Agent Skill](/notes/ai/agent-skills)（可复用流程）、[MCP 与工具调用](/notes/ai/mcp-tools)（双手）、[Agent 上下文与指令设计](/notes/ai/agent-context-instructions)（塞什么进窗口）。

## 定位：从「写代码」到「交付变更」

传统 IDE 补全解决的是「下一行怎么写」。AI Coding 工作流解决的是：

```
需求 → 约束（spec / 测试 / 约定）→ 实现 → 验证 → 文档 / PR → 可回滚
```

工具只是 harness；真正拉开差距的是**约束怎么进上下文、验证怎么关门**。没有约束的对话式改代码，就是 Vibe 到一半开始漂移。

## Vibe Coding vs Spec Coding

| | Vibe Coding | Spec Coding |
|---|---|---|
| 入口 | 「帮我做个某某」自然语言 | 先写可验收的 spec / 契约 / 测试 |
| 强项 | 探索、原型、陌生目录摸底 | 多人协作、边界清晰、可回归 |
| 风险 | 隐含假设多、难复盘、易越改越偏 | 前期慢；spec 写错会系统性地错 |
| 适用 | spike、spike、UI 感觉 | API、数据模型、跨服务契约、发版路径 |

**实践默认**：探索用 Vibe，定型用 Spec。同一功能可以先 Vibe 出骨架，再把接口与验收标准沉淀成 Spec，后续改动只对着 Spec 走。

Spec 不必是长篇设计文档。最小可用形态通常是三件之一（或组合）：

1. **OpenAPI / 类型契约**：请求响应形状先定死
2. **验收清单**：Given / When / Then 或检查表
3. **失败用例**：先写会红的测试，再让 agent 改到绿

## 工具层：CLI Agent 在干什么

Claude Code、Codex、Cursor Agent 本质都是「本地/远程 harness + 工具 + 权限」：

| 能力 | 干什么 | 对应 harness 层 |
|---|---|---|
| 读仓库 / 搜索 | 建工作记忆 | C（上下文） |
| 改文件 / 跑命令 | 真正动手 | T + E |
| MCP / Skill | 接外部系统与流程手册 | T + 程序性知识 |
| Sub Agent | 隔离子任务上下文 | 多 agent |
| 权限 / 审批 | 高危动作停下 | 护栏 |

选型不必教条：**编辑器内嵌**适合边看 diff 边改；**CLI agent** 适合长任务、脚本化、CI 旁路；**云端沙箱 agent** 适合不可信执行与可复现环境（见 [Agent 沙箱](/notes/ai/agent-sandbox)）。

## 工程骨架：先给 agent「地图」

仓库里没有地图，模型就靠猜。最低成本的四件套：

```
AGENTS.md / CLAUDE.md     仓库常驻约定（怎么 build / test / 目录含义）
docs/ 或 OpenAPI          契约与领域词
Skill（按需）             「开 PR」「加 API」「补 e2e」的标准步骤
.mcp.json / 工具配置      能调哪些外部能力
```

前端类比：`AGENTS.md` ≈ README 给新人；Skill ≈ 按路由懒加载的业务手册；MCP ≈ 真能调的 API。分层原则见 [Agent Skill](/notes/ai/agent-skills) 与 [上下文与指令](/notes/ai/agent-context-instructions)。

**工程骨架实战**常见顺序：

1. 先让 agent 根据现有代码生成「目录地图 + 构建命令」草稿，人审一遍写进 AGENTS.md
2. 定一条垂直切片（例如「会话列表 API」）的契约与测试入口
3. 只在该切片上跑通「实现 → 测 → 文档」闭环，再扩到别的模块

最小 `AGENTS.md` 样例（短比全重要；以下以文档站仓库为例）：

```markdown
# AGENTS

## 怎么跑
- 安装：`npm ci`
- 开发：`npm run docs:dev`
- 构建：`npm run docs:build`

## 改文档时
- 正文放约定目录（如 `docs/notes/<分类>/`）
- 侧栏 / 导航配置必须同步改
- 若有统计脚本，改完跑一遍

## 不要做
- 不要改无关格式化
- 不要提交 `.env` / 密钥
```

Spec 最小形态——先定契约再实现（TypeScript）：

```ts
/** 会话列表：先定形状，再让 agent 填 handler / 测试 */
export type SessionSummary = {
  id: string
  title: string
  updatedAt: string // ISO
}

export type ListSessionsResponse = {
  items: SessionSummary[]
  nextCursor?: string
}

// 验收：GET /api/sessions 200 + 符合上型；空库返回 items: []
```

对应 Skill 只写「怎么关门」（片段）：

```markdown
---
name: add-sessions-api
description: 按 ListSessionsResponse 契约补会话列表 API 与测试
---

1. 只改约定目录下的 handler / 路由 / 测试
2. 先补失败用例（空库、未登录），再实现到绿
3. 跑 `npm test -- sessions`；红则修，禁止跳过
4. 更新 OpenAPI 或类型导出，保证与响应一致
```

## 五条可复用闭环

对照课程里的实战条目，落到可检查的动作：

| 闭环 | 目标 | 最小验收 |
|---|---|---|
| **工程骨架** | agent 知道怎么 build/test/改哪里 | 新对话只读 AGENTS.md 就能跑通测试命令 |
| **API 文档沉淀** | 契约先于实现或与实现同步 | OpenAPI / 类型与 handler 一致；CI 能 diff 破契 |
| **多分支同步** | 并行改多个面（前端/服务/测试）不互相踩 | 分支职责清晰；合并前各自绿 + 契约兼容 |
| **服务端 e2e** | 行为有门禁，不只靠「看起来对」 | 关键路径有黑盒测试；agent 改完必须跑 |
| **前端自动化** | UI 关键流可回归 | 冒烟用例稳定；选择器不绑易碎文案 |

会话类功能（前后端一起做）是练手的好切片：状态机清晰、有流式/鉴权、天然需要契约与 e2e——正好把上面五条串起来。

## 三个坑

1. **无门禁的自动提交**：能改文件 ≠ 能合入。默认要求测试绿 + diff 人审；高危路径（鉴权、支付、删数据）必须 HITL
2. **上下文被仓库史诗灌满**：别一上来「读遍整个 monorepo」。先地图、再定点文件；子任务丢 Sub Agent，主对话只留结论
3. **Spec 事后补**：先 Vibe 出一堆再补文档，文档会跟着幻觉走。定型节点就要把契约/验收写进仓库

## 前端视角

+ Spec Coding ≈ 先定 props / OpenAPI，再填实现——你本来就会的契约驱动
+ Vibe Coding ≈ 设计稿阶段的快速探索，不进主干也没关系
+ Sub Agent ≈ 把「调研依赖升级」和「改业务代码」分进两个上下文，避免主线程被日志淹没
+ 「API 文档沉淀」≈ [OpenAPI](/notes/engineering/openapi) 那套契约纪律，只是写入者换成了人 + agent

## 学习路径建议

1. 给目标仓库补一份短 AGENTS.md（构建、测试、目录约定），用 CLI agent 只靠它跑通一条已有测试
2. 选一个小 API：先写 OpenAPI 或类型，再让 agent 实现，用契约测试关门
3. 把「开 PR」写成一条 Skill，下次复用（见 [Agent Skill](/notes/ai/agent-skills)）
4. 同一需求分别用纯 Vibe 与 Spec 各做一次，对比返工次数
5. 需要跑不可信代码或隔离环境时，接 [Agent 沙箱](/notes/ai/agent-sandbox)；要图化长流程时接 [LangGraph](/notes/ai/langgraph)

## 参考

+ [Claude Code 文档](https://docs.anthropic.com/en/docs/claude-code) · [OpenAI Codex](https://openai.com/codex/)
+ [AGENTS.md 约定](https://agents.md/) · 本站：[Agent Harness](/notes/ai/agent-harness) · [Agent Skill](/notes/ai/agent-skills) · [OpenAPI](/notes/engineering/openapi)
