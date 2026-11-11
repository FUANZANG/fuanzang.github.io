# RAG 检索调优

> 承接 [RAG](/notes/ai/rag) 的管线与混合检索/Rerank 概念，本篇只谈**怎么量、怎么改、改什么**。评测框架意识见 [AI 评测与可观测](/notes/ai/ai-eval-observability)。方法参考 [Google Cloud：Optimizing RAG retrieval](https://cloud.google.com/blog/products/ai-machine-learning/optimizing-rag-retrieval)、[Qdrant：RAG evaluation](https://qdrant.tech/blog/rag-evaluation-guide/)；Rerank 成本权衡可见相关研究综述（如 [arXiv:2505.08445](https://arxiv.org/html/2505.08445) 对 rerank 延迟的讨论——**以你语料实测为准**）。

## 1. 先拆开：检索坏了还是生成坏了

```
坏答案
  ├─ 检索没给对块 → 调 chunk / 召回 / 过滤 / rerank / 查询改写
  └─ 块对了仍胡答 → 调生成模型、提示、引用约束、拒答策略
```

Google 等实践强调：**检索指标与生成指标分开看**；一次实验只改一个变量，题目集固定。

## 2. 题集：没有金标就没有调优

准备一小份（先 30～100 条也行）真实问法：

| 字段 | 用途 |
|------|------|
| `question` | 用户原话（含专有名词、错别字变体） |
| `golden_doc_ids` / 段落 | 必须命中的证据 |
| `golden_answer`（可选） | 生成侧对照 |

覆盖：精确型号查询、释义问答、多跳、应拒答（库里没有）。题集一变，分数不可比。

## 3. 检索侧常用指标

| 指标 | 直觉 |
|------|------|
| **Recall@K** | Top-K 里有没有金标（RAG 最关心「有没有喂进上下文」） |
| **Precision@K / MRR / nDCG** | 排得靠不靠前、噪声多不多 |
| **Context precision / recall**（生成评测框架里） | 交给 LLM 的上下文是否又准又够 |

先盯 **Recall@K**（K = 你最终塞给模型的块数，常见 3～8）。召回不够，后面 prompt 再漂亮也白搭。

## 4. 调参漏斗（建议顺序）

### 4.1 切块与元数据

- 按**文档类型**选策略：Markdown 按标题；代码按符号边界；纯叙述再试固定窗口。  
- 主文已写常见甜点与 overlap 争议：**以你的题集扫几种 chunk size**，不要抄死一个数字。  
- 索引时写入 `title` / `section` / `product` 等 metadata，查询时**先过滤再向量**（Qdrant 等强调过滤 + 向量）。

### 4.2 召回：稠密 → 混合

- 专有名词翻车 → 上 **BM25/稀疏 + 稠密** 混合（主文 Level 2）。  
- 调整每路 Top-N 与融合（如 RRF）权重，看 Recall@K。

### 4.3 查询改写

- HyDE、多查询、子问题拆解：提高难问法的召回，但增加延迟与费用。  
- 用题集里「原话很短/很口语」的子集单独测。

### 4.4 Rerank

- 粗召回加大（如 50～100）→ cross-encoder 精排 → 取 Top-K 给 LLM（主文 Level 3）。  
- 经验上能抬检索质量；同时 **延迟与费用明显上升**（有研究报道量级上数倍耗时）。策略：默认关，对「高价值 / 低召回」查询再开，或异步批处理场景常开。

### 4.5 交给模型的上下文

- K 太大：噪声 + lost-in-the-middle。  
- 试：只传块 vs 传父文档片段；是否附带标题路径。  
- **一次只改 K 或只改拼接模板。**

## 5. 向量库：调优时真正要动的旋钮

选型表见 [RAG · 向量数据库版图](/notes/ai/rag)。调优阶段更常碰：

| 旋钮 | 说明 |
|------|------|
| 相似度 / 距离 | 与 embedding 训练一致（cosine / dot 等） |
| 过滤条件 | tenant、语种、时间、产品线 |
| HNSW 等索引参数 | 召回率 vs 延迟；先默认，有规模再调 |
| 载荷字段 | 原文、标题、hash，便于引用与去重 |

换 embedding ≈ **全量重建**；先在子集上 A/B。

## 6. 生成侧（检索合格之后）

- 强制「仅依据上下文；不足则说不知道」+ 引用块 id。  
- 忠实度 / 答案正确性用 LLM-as-judge 或人工抽检；与检索分数分开报表。  
- 用户行为：点了引用吗、是否重问——产品埋点反哺题集。

## 7. 工作节奏

```
固定题集
  → 打基线 Recall@K + 抽检答案
  → 只改一项（如加 BM25）
  → 对比
  → 合并或回滚
  → 再开下一项
```

没有题集的「感觉变好了」不算调优。

## 参考

- 本站：[RAG](/notes/ai/rag)、[Graph RAG 与 Agentic RAG](/notes/ai/graph-rag)、[AI 评测与可观测](/notes/ai/ai-eval-observability)
- [Google Cloud: Optimizing RAG retrieval](https://cloud.google.com/blog/products/ai-machine-learning/optimizing-rag-retrieval)
- [Qdrant: Best Practices in RAG Evaluation](https://qdrant.tech/blog/rag-evaluation-guide/)
