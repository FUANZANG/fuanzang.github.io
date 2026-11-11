# Graph RAG 与 Agentic RAG

> 本文基于 2026-11 时点的进阶检索实践（Graph RAG 社区/局部/全局检索、Agentic RAG 控制流）。基础管线与混合检索见 [RAG](/notes/ai/rag)；怎么测、怎么调见 [RAG 检索调优](/notes/ai/rag-retrieval-tuning)。
>
> 关联：[Agent 设计模式](/notes/ai/agent-patterns)、[LangGraph](/notes/ai/langgraph)、[Agent 记忆系统](/notes/ai/agent-memory)（时态图谱）、[AI 评测与可观测](/notes/ai/ai-eval-observability)。

## 定位：向量不够时的两条升级线

基础 RAG =「切块 → 向量/关键词召回 → 生成」。它卡在两类问题上：

| 问题类型 | 基础 RAG 为什么难受 | 升级方向 |
|---|---|---|
| **关系 / 多跳** | 「A 的上级的负责项目」跨很多块 | **Graph RAG**：实体关系入图再查 |
| **全局归纳** | 「这批文档整体在讲什么」不是近邻块能答 | Graph 的社区摘要 / 全局检索 |
| **检索策略本身要决策** | 固定 top-k 一条路走到黑 | **Agentic RAG**：agent 决定查不查、怎么改写、够不够 |

不是默认升级。简单事实问答、FAQ、单文档助手——把切块、混合检索、Rerank 做好往往更划算（[RAG 篇](/notes/ai/rag) 的 GraphRAG 选型结论仍然成立）。

## Graph RAG：文档之上的图

### 在索引什么

```
文档
  → 抽取实体 / 关系 / 声明（LLM 或专用抽取）
  → 写入图数据库（Neo4j 等）+ 常配合向量索引
  → （可选）图社区检测 → 社区报告（主题级摘要）
```

查询时不再只是「找相似块」，而是：

| 模式 | 干什么 | 典型问法 |
|---|---|---|
| **Basic / 向量** | 仍可走块检索作补充 | 单点事实 |
| **Local** | 从问题实体出发邻域扩展 | 「X 和 Y 什么关系」「谁负责 Z」 |
| **Global** | 打社区报告 / 主题摘要 | 「整体风险点有哪些」「语料主线是什么」 |
| **Community** | 先定位相关社区再下钻 | 大语料上的主题导航 |

代价要心里有数：**抽取贵、图要维护、错边会污染推理**。实体对齐（同名不同物）和关系过期是长期债——时态边（valid_at / invalid_at）的思路与 [记忆系统](/notes/ai/agent-memory) 里 Graphiti 一脉。

### 企业路径的最小组件

+ **图存储**：Neo4j / 兼容图库；权限与备份按数据敏感级定
+ **抽取流水线**：可批处理；失败可重跑；保留原文引用
+ **双通道**：图检索 + 原块向量检索，生成时带来源
+ **评测集**：专门准备「关系题」与「全局题」，别只用关键词题集假装提升

微软系 GraphRAG 论文/项目把「社区摘要」做亮了；自己实现时先跑通 Local，再决定要不要上全量社区（贵）。

手搓 Local：先有边，再查邻域（Neo4j Cypher 意象）：

```cypher
// 种子实体 → 一跳关系 → 带回原文引用 id
MATCH (e:Entity {name: $name})-[r]-(n)
RETURN e.name AS src, type(r) AS rel, n.name AS dst, r.source_chunk AS chunk
LIMIT 20
```

索引前的最小图 JSON（没有图库也能先测推理）：

```json
{
  "entities": ["订单服务", "支付服务", "Alice"],
  "edges": [
    {"from": "Alice", "rel": "负责", "to": "订单服务", "chunk": "c12"},
    {"from": "订单服务", "rel": "依赖", "to": "支付服务", "chunk": "c18"}
  ]
}
```

问「Alice 负责的服务依赖谁」→ 图上两跳；纯向量经常只命中含 Alice 的块而丢依赖边。

## Agentic RAG：把检索变成可循环的决策

固定管线：

```
问 → 检索 → 生成
```

Agentic RAG：

```
问 → agent 决策
      ├─ 要不要检索 / 检索哪库
      ├─ 查询改写 / 拆多跳子问题
      ├─ 看结果：够不够？要不要补检 / 换策略 / 上图检索
      └─ 生成 + 引用；必要时再验证
```

这就是 [设计模式](/notes/ai/agent-patterns) 里的 ReAct 套在检索工具上；复杂编排用 [LangGraph](/notes/ai/langgraph) 画「改写 → 多路召回 → 融合 → 生成 → 质检」更清晰。

适合上 Agentic 的信号：

+ 多跳问题占比高
+ 需要在「内部 wiki / 工单 / 代码库」多源间选择
+ 要自我核对（答案是否被引用支持）再出口

代价：延迟与 token 明显上升。生产上常加**路由**：简单问走基础 RAG，复杂问才进 agent 环——用小模型或规则做分流。

最小控制流（伪代码；真项目里 `retrieve` / `enough` 可以是工具 + 小模型裁判）：

```python
def agentic_answer(question: str, retrieve, generate, max_rounds: int = 3) -> str:
    query = question
    evidence: list[str] = []
    for _ in range(max_rounds):
        hits = retrieve(query)                 # 向量 / BM25 / 图 Local…
        evidence.extend(hits)
        if enough(question, evidence):         # 规则或 LLM-as-judge
            break
        query = rewrite(question, evidence)    # 补实体、拆多跳、换库
    return generate(question, evidence)        # 必须带引用 id
```

路由一刀切示例：含「关系 / 依赖 / 谁负责」走图或 agent 环，其余走基础 RAG。

## 和基础 RAG 怎么叠

推荐叠法，而不是替换：

```
多路召回（向量 + BM25 + 可选图 Local）
  → 融合（RRF / 加权）
  → Rerank
  →（可选）agent 决定是否补检
  → 生成（带引用）
```

调优指标仍分两层：检索 recall/precision、生成忠实度——见 [检索调优](/notes/ai/rag-retrieval-tuning)。Graph / Agentic 的评测集必须单独建，否则「平均分涨了」可能只是简单题更稳。

## 渠道落地（可选）

企业常见终点不是自建聊天页，而是 **IM / 文档平台**：索引飞书/Notion 文档树、图片 OCR、权限继承、消息卡片回写。工程重点往往在：

+ 数据源归一化与增量更新
+ 权限：检索结果不能突破原文档 ACL
+ 引用可点回原文档

平台路线可用 [Dify/Coze](/notes/ai/llm-app-platforms)；深度定制仍是自建管线 + agent。

## 前端视角

+ Local Graph 结果适合画成「实体关系小图」+ 原文摘录，而不仅是列表
+ Global 回答要强调「基于社区摘要」，避免用户以为是逐句引用
+ Agentic 过程可视化（改写了啥、补检了几次）能降低「黑盒感」，也便于你自己调参
+ 权限错误应显式：「无权限的文档已排除」，而不是静默变少

## 学习路径建议

1. 在现有基础 RAG 上加「查询改写 + 不够则再检索」两步 agent，量延迟与质量
2. 选一小撮强关系文档，手搓实体关系 JSON，Neo4j 跑通 Local 问法
3. 对比同一批「关系题」：纯向量 vs 图 Local 的召回
4. 用 LangGraph 把「多路召回 → 质检 → 补检」画成图，接评测集做回归
5. 只有全局归纳题真的痛时，再上社区摘要 / Global；先读 [Is GraphRAG Needed?](https://arxiv.org/abs/2606.25656) 对照自己的题型

## 参考

+ [RAG](/notes/ai/rag) · [RAG 检索调优](/notes/ai/rag-retrieval-tuning) · [LangGraph](/notes/ai/langgraph)
+ [Is GraphRAG Needed?（arXiv 2606.25656）](https://arxiv.org/abs/2606.25656)
+ [Neo4j GraphRAG 相关文档](https://neo4j.com/docs/) · Microsoft GraphRAG 项目（社区摘要思路）
