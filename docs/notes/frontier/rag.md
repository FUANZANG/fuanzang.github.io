# RAG（检索增强生成）

> 本文基于 2026-09 时点的 RAG 工程实践（混合检索已成生产标配；切块甜点 400–512 tokens 有跨基准共识）。

RAG = **Retrieval-Augmented Generation**（检索增强生成）：LLM 回答前先从你的私有数据里**检索**相关内容，塞进上下文再**生成**答案。企业知识问答、客服机器人、文档助手、代码库问答——AI 应用层第一大工程模式。

> 与 [Agent Harness](/notes/frontier/agent-harness) 互补：harness 讲"模型怎么用工具**行动**"，RAG 讲"模型怎么用你的数据**回答**"。前端消费侧见 [AI 流式输出](/notes/frontier/ai-streaming)。

## 为什么需要 RAG

LLM 的三个先天缺陷，RAG 各治一个：

| 缺陷 | 表现 | RAG 怎么治 |
|---|---|---|
| 知识截止 | 训练数据有截止日期，不知道新事 | 检索最新的文档喂进去 |
| 不知道私有数据 | 你公司的文档/数据库它没见过 | 检索你的知识库喂进去 |
| 幻觉 | 不知道也一本正经地编 | 给它真实材料，让它"照着说"并标注出处 |

**RAG vs 微调（fine-tuning）**：微调改模型权重（教"怎么说"），RAG 补上下文（给"说什么"）。90% 的"让 AI 懂我们业务"需求该用 RAG——成本是微调的零头、数据随时更新、答案可溯源；微调留给风格模仿和领域语感这类需求。

## 核心管线

```
【离线索引】
文档（PDF/Markdown/网页/数据库）
  → 清洗解析
  → 切块（chunking）
  → Embedding：每块文本 → 一个向量（如 1536 维）
  → 存入向量数据库

【在线问答】
用户提问
  → 问题也转成向量
  → 向量库里找"语义最近"的 Top-K 块
  → 块 + 问题拼成 prompt
  → LLM 基于给定材料生成答案（带引用）
```

### Embedding：语义怎么变成可计算的

**Embedding 模型把文本映射成高维向量，语义相近 → 向量距离近**。"怎么部署服务"和"上线流程"字面几乎不重叠，但向量距离很近——这就是**语义搜索**超越关键词搜索的地方。相似度用余弦距离算。

前端类比：把每段文本变成 N 维空间里的一个点，检索就是"找这个问题点旁边的点"。

**选型**：embedding 决定检索质量上限（差的 embedding 补不回来）。常见：OpenAI `text-embedding-3` 系列（API）、BGE 系列（开源可自部署，国内主流）、Voyage。换 embedding 模型 = 全量重建索引。

### 切块（Chunking）：最被低估的环节

切块质量直接决定检索质量：**切太小**丢上下文（检索到半句话，模型看不懂）；**切太大**引入噪音（一整章塞进去，重点被稀释）。跨基准共识的甜点：**400–512 tokens**。

常用策略（生产默认是前两种的组合）：

+ **递归分割**：先按段落切，太大再按句子、再按词——LangChain 的默认，生产共识首选
+ **结构感知**：按 Markdown 标题/HTML 标签/章节切，技术文档最佳（你的 VitePress 笔记就该这么切）
+ 固定长度：原型期用，三分之一的切割点会落在句子中间
+ 语义切块：相邻句向量距离突变处切分——真实文档上容易过度切碎，慎用
- overlap（相邻块重叠 10–20%）：2026 年的系统研究发现收益统计上≈0，从零开始即可

## 检索的进化：三级跳

**Level 1 纯向量检索**：只算语义相似。问题——专有名词/型号/错误码这类**精确匹配**查不准（"ERR_CONN_10042" 的语义向量毫无意义）。

**Level 2 混合检索（2026 生产标配）**：向量（语义）+ BM25 关键词（精确）双路召回，RRF（倒数排名融合）合并。"seata 事务回滚"这种查询，语义路找概念相关块，关键词路锁定 seata 字样，互补。pgvector 用户三十行 SQL 就能实现 RRF。

**Level 3 Rerank（精排）**：粗排召回 100 条后，用 **cross-encoder** 模型把"问题+文档"逐对打分精排出 top 5–10。为什么需要：embedding 是"问题"和"文档"**各自**编码再比距离（bi-encoder，可离线索引但粗）；cross-encoder 把两者**拼在一起**看（准但必须查询时逐条算）。生产实测 rerank 带来 **10–15 个百分点召回提升**。代表：Cohere Rerank（API）、BGE-Reranker（开源）、Qwen3-Reranker。

```
生产漏斗：召回 200+（混合检索）→ 精排 50–100（cross-encoder）→ 给 LLM 3–5 块
```

## 向量数据库版图

| 库 | 定位 | 适合 |
|---|---|---|
| **pgvector** | Postgres 扩展 | 已有 PG 的团队（少运维一个库），<1000 万向量够用 |
| **Qdrant** | Rust 写的专用库 | 性能敏感、过滤条件多的场景 |
| **Milvus** | 分布式（CNCF） | 亿级向量、大数据团队 |
| **Weaviate** | 混合检索原生 | 开箱即用 hybrid |
| Pinecone | 全托管 SaaS | 不想运维、快速上线 |
| Chroma | 轻量嵌入式 | 原型、本地 demo |

选型经验法则（来自社区共识）：**"选你团队凌晨两点能 debug 的那个"**。多数项目向量数 < 1000 万，pgvector 或 Qdrant 都绰绰有余，别为了想象中的规模上 Milvus 三件套（etcd+minio+milvus 的 docker-compose）。

## 进阶概念（认脸即可）

+ **Agentic RAG**：检索本身也交给 agent 决定——要不要检索、检索几次、查询怎么改写、结果够不够好再补检。简单文档问答基础 RAG 够用，多跳推理/复杂约束才值得上
+ **GraphRAG**：把文档抽成知识图谱再检索，擅长"全局性问题"（"这批文档的主题是什么"）——构建成本高。2026 年对比研究（[arXiv 2606.25656](https://arxiv.org/abs/2606.25656)）结论是按场景选型：复杂关系查询才更吃 GraphRAG，简单问答不必上
+ **Contextual Retrieval**：索引时给每块加上 LLM 生成的上下文摘要，缓解"块脱离原文看不懂"
+ **评估**：RAG 效果要测检索（recall@k）和生成（忠实度/答案质量）两层，LLM-as-judge 是主流做法——"跑通了"不等于"检索对了"

## 前端视角

RAG 应用的前端有明确的模式库：

+ **引用溯源 UI**：答案句尾标 [1][2]，悬浮/点击跳转到原文块——RAG 产品的信任基石
+ **流式渲染**：生成阶段逐字输出（对接 [AI 流式输出](/notes/frontier/ai-streaming)的 SSE 消费）
+ **检索过程可视化**：显示"检索到 N 条相关文档"及来源列表，用户可干预（勾选/排除）
+ **效果可观测**：前端埋点收集"用户点了引用吗/重新问了吗"，是 RAG 调优的真实信号

## 学习路径建议

1. 100 行代码跑通最小 RAG：拿你的 VitePress 笔记当语料，OpenAI embedding + pgvector/Chroma + API 生成
2. 故意用型号/专有名词提问，看纯向量检索翻车，加 BM25 混合修复
3. 加 rerank，对比前后 top-5 的相关性变化（体感明显）
4. 之后按需：Agentic RAG、评估体系、增量索引

## 参考

+ [RAG from Scratch（LangChain）](https://github.com/langchain-ai/rag-from-scratch)
+ [pgvector](https://github.com/pgvector/pgvector) / [Qdrant](https://qdrant.tech/)
+ [Is GraphRAG Needed?（arXiv 2606.25656）](https://arxiv.org/abs/2606.25656)
+ [Chunking 视觉指南](https://mohamed-hendawy.medium.com/vector-databases-chunking-strategies-a-visual-guide-a1ef3fe87327)
