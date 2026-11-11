# Agent 记忆系统

> 本文基于 2026-11 时点的记忆后端生态（Mem0 2.2 / Letta 0.34 / Graphiti 0.31，版本号取自 2026-11-06 的 PyPI；MemGPT 论文为 2023 年）。
>
> 关联：[Agent Harness](/notes/ai/agent-harness)（C 层上下文管理、"状态与记忆"支柱）、[RAG](/notes/ai/rag)（文档检索）、[LLM 基础概念](/notes/ai/llm-fundamentals)（上下文窗口）。

## 定位：记忆 ≠ RAG ≠ AGENTS.md

三条容易混的持久化路线：

| | 存什么 | 谁写入 | 何时读 |
|---|---|---|---|
| **RAG** | 文档块（语料是外部的） | 离线摄取管线 | 每次提问检索 |
| **AGENTS.md / Skill** | 人写的仓库约定与流程 | 人 commit | 常驻 / 任务匹配时 |
| **Agent 记忆** | "对话 / 任务里发生过的事"：事实、经历、偏好 | 自动抽取或 agent 自己写 | 每轮开始按相关度检索 |

**记忆的机制就一句：模型无状态，"记得住" = 把东西写进外部存储 + 在正确时机取出来塞回上下文。** 2026 年主流形态是"记忆即工具"：`read_memory` / `write_memory` 就是 agent 工具列表里多出的两个 function。

## 两层记忆

+ **短期 = 上下文窗口本身**：历史裁剪、摘要压缩（[AI 应用工程化](/notes/ai/ai-app-engineering) 有代码），会话结束即失效
+ **长期 = 外部存储**，内容分三种：
  - **事实 / 用户画像**："用户用 Volta 管 Node"、"常驻北京"
  - **情景**（episodic，"经历过什么"的记忆）："上次部署失败是因为 lockfile 不一致"
  - **偏好 / 自我反思**："用户喜欢先给选项再实现"

## 三种设计哲学（生态主战场）

同样的"存 + 取"，三家回答了不同的问题——**谁来写、写成什么形态、怎么读**：

| | Mem0 | Letta（原 MemGPT） | Zep / Graphiti |
|---|---|---|---|
| 记忆单元 | 扁平事实（+ 实体关联） | **记忆块**：agent 自己编辑 | **时态知识图谱**的边 |
| 写路径 | LLM 在对话中自动抽事实，与同 scope 旧事实对账（更新/去重） | agent 调用工具编辑钉在系统提示里的块；后台"dreaming"子代理做整理 | LLM 抽实体 / 关系入图 |
| 读路径 | 向量 + BM25 + 实体信号混合排序 | 消息检索 + 块命中 | 向量 + BM25 + 图遍历混合，**查询时不调 LLM**（官方口径 p95 < 200ms） |
| 招牌 | user / agent / session / app 多 scope，多租户 SaaS 首选 | OS 隐喻：上下文窗口 = RAM，记忆块 = 常驻内存，archival = 磁盘分页（MemGPT 论文设计） | **双时态**：每条边带 valid_at / invalid_at（事实何时成立/失效）+ learned_at / superseded_at（系统何时知道/何时被推翻） |
| 自托管 | OSS Apache-2.0，可全本地（本地模型 + 本地向量库） | OSS Apache-2.0（Postgres + pgvector） | Graphiti OSS Apache-2.0（Neo4j / FalkorDB / Neptune；Kuzu 后端已弃用）；Zep 本体是托管云 |
| 版本锚点 | mem0ai 2.2.1（2026-09） | letta 0.34.12 | graphiti-core 0.31.2（建议 ≥ 0.28.2，更早版本有 Cypher 注入 CVE） |

其他条目认脸即可：

+ **Cognee**：图 + 向量 + 关系统一引擎（ECL 摄取管线），Apache-2.0，可自托管到无生成式模型（GLiNER + fastembed 做抽取）
+ **Basic Memory**：**完全没有抽取模型**——agent 自己写结构化 markdown 笔记，确定性解析 + embedding，SQLite 索引，MCP 原生
+ **LlamaIndex memory 模块**：生态内附带，不单独用

选型判据：

1. 多用户 SaaS、"记住每个用户的偏好" → **Mem0**（生态最大，托管/自托管都行）
2. 长任务 agent、"agent 自管状态、记忆当文件系统" → **Letta**
3. 时间敏感（"上个月是 A 现在是 B"、"谁在什么时候说过什么"）→ **Zep / Graphiti**
4. 极致自托管 / 不想引入抽取模型 → **Basic Memory** 或 **Cognee**

## 三个坑

1. **记忆污染**：错事实在写入那一刻就是永久债务——之后每轮都被检索出来强化。必须有写入审查 + 删除机制（Mem0 有 update/delete，Graphiti 用 invalid_at 失效而非删除）
2. **写便宜读贵**：自动抽取让写入路径每轮多一次 LLM 调用，成本与延迟都落在写入侧；读取侧的关键是"先检索再注入"，而不是把整个记忆库倒进上下文
3. **记忆不过期**：偏好与事实会陈旧 → 要么上时态机制，要么给 TTL；否则 agent 按"去年的真理"行事

## 前端视角

+ 记忆系统 ≈ 前端熟悉的状态三层：上下文窗口 = Pinia（易失、当前会话），外部存储 = localStorage / IndexedDB（持久、自管 schema），多用户同步 = 服务端
+ "记忆即工具" ≈ 给 store 加两个 CRUD 接口：`memory.get(user, query)` / `memory.set(user, fact)`
+ MemGPT 的"上下文 = RAM、分页 = archival"就是操作系统课程的内存管理，换个位置重学一遍

## 学习路径建议

1. 先不引库：手写最小记忆 = SQLite 一张表（user_id, fact, ts, 一个 embedding 列）+ 两个工具读写，百行以内
2. 接 Mem0（托管或自托管），对比"自动抽取 vs 自己写 fact"的质量差
3. 试一个 Letta agent，观察它自己往记忆块里写了什么
4. 时间敏感场景（日程、状态变更）试 Graphiti，体会 valid_at / learned_at 四个时间戳的差别
5. 读 [AI 评测与可观测](/notes/ai/ai-eval-observability)，给记忆建评测：漏召回（该记得的没想起）与污染（错事实占比）

## 参考

+ [Mem0](https://github.com/mem0ai/mem0) · [Letta（原 MemGPT，论文 arXiv 2310.08560）](https://github.com/letta-ai/letta) · [Zep / Graphiti](https://github.com/getzep/graphiti)
+ [Cognee](https://github.com/top-ai-camp/cognee) · [Basic Memory](https://github.com/basicmachines-co/basic-memory)
+ 本站：[Agent Harness](/notes/ai/agent-harness) · [RAG](/notes/ai/rag) · [AI 评测与可观测](/notes/ai/ai-eval-observability)
