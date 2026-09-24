# 本地大模型（LM Studio / Ollama）

> 本文基于 2026-09 时点（LM Studio 0.4.x / Ollama 0.21+）。前提环境：Apple Silicon（M 系列）+ 24GB 统一内存的 Mac。本地跑模型不是"穷人版云端"——它是隐私、离线、零边际成本、无限制实验的独立价值。

> 关联：[LLM 基础概念](/notes/frontier/llm-fundamentals)（量化要懂参数与显存）、[RAG](/notes/frontier/rag)（本地 embedding 落地）、[前端对接 AI](/notes/frontier/ai-frontend-integration)（OpenAI 兼容封装）。

## 两大工具：都在用，各干什么

两个工具底层都是 **llama.cpp** 引擎（同引擎 = 同硬件上速度同级），差别在产品形态：

| | LM Studio | Ollama |
|---|---|---|
| 形态 | 桌面 GUI 应用 + `lms` CLI | 纯 CLI + 后台服务 |
| 模型管理 | 可视化浏览器（Hugging Face 全量 GGUF）、参数滑块 | `ollama pull/run` 命令 |
| 内置聊天 | 有（GUI 直接聊） | 无（要配 Open WebUI 等） |
| OpenAI 兼容 API | `http://localhost:1234/v1` | `http://localhost:11434/v1` |
| 生态集成 | 面向桌面用户 | 面向开发者，第三方工具集成更多 |
| 开源 | 否（免费） | 是（MIT） |

**分工实践**：**LM Studio 当"模型仓库 + 试验台"**——浏览/下载/对比模型，GUI 里调上下文长度、GPU 卸载层数最直观；**Ollama 当"常驻服务"**——后台跑一个默认模型，终端 `ollama run` 即用，给脚本和第三方应用（IDE 插件、Hermes 这类）提供稳定端点。两者可共存（端口不同），但 GGUF 模型文件各存一份（`~/.lmstudio` 和 `~/.ollama`），重复下载浪费磁盘。

## 硬件预算：24GB Mac 能跑什么

Apple Silicon 的统一内存 = 显存，核心公式：

```
可用内存 ≈ 总内存 24GB − 系统占用 6~8GB ≈ 16GB 左右
模型占用 ≈ 权重文件大小 + 上下文 KV Cache（几 GB 起，随长度涨）
```

| 模型规模 | Q4 量化体积 | 24GB Mac | 定位 |
|---|---|---|---|
| 7~9B | 4~6 GB | 轻松，速度快 | 日常问答、结构化提取、embedding 配套 |
| 12~14B | 7~9 GB | 舒适 | 质量明显上台阶的甜点区 |
| 20~32B | 12~20 GB | 能跑（关掉大应用），速度尚可 | **本机上限甜点**：代码/推理可日用 |
| 70B | 40+ GB | ❌ 跑不动 | 云端或量化到极限也不值 |

经验：**24GB 机器的日用甜点是 8B~27B 的 Q4_K_M**——正好覆盖 deepseek-r1-8b、gemma-3-12b、gpt-oss-20b、qwen3.6-27b 这一档。

## 量化（Quantization）：Q4、Q8 是什么

模型原始权重是 16 位浮点（BF16），**量化 = 把权重压到低位数以省内存**，GGUF 文件名里的 `Q4_K_M` 就是量化方案：

| 档位 | 体积（相对 BF16） | 质量损失 | 用途 |
|---|---|---|---|
| Q8_0 | ~1/2 | 几乎无 | 内存富余时 |
| **Q4_K_M** | ~1/4 | 很小（主流共识的平衡点） | **默认首选** |
| Q3/Q2 | ~1/8 | 明显（复杂推理掉分） | 硬件极限妥协 |

`K_M`（k-quant medium）是 llama.cpp 的高效量化族。选型口诀：**先 Q4_K_M，嫌弃质量再上 Q8，内存不够才降 Q3**。注意：量化是不可逆的——下载时选好，别指望"先 Q4 后升级"。

## OpenAI 兼容 API：前端代码零改动

两个工具都暴露 OpenAI 格式端点——你在 [前端对接 AI](/notes/frontier/ai-frontend-integration) 里的统一封装直接复用，**只改 baseURL**：

```ts
// 云端
const client = createClient('https://api.deepseek.com/v1', apiKey)
// 切本地 LM Studio（Developer 标签页开启 server）
const client = createClient('http://localhost:1234/v1', 'lm-studio')
// 切本地 Ollama（默认常驻）
const client = createClient('http://localhost:11434/v1', 'ollama')
// api key 随便填——本地不校验，但字段要给

// /v1/chat/completions、/v1/models、流式 SSE 全部同构
```

这就是 OpenAI 格式成为事实标准的红利：**云端/本地/任意厂商只是换一个 baseURL**。Hermes、Cursor、各种 IDE 插件接本地模型走的全是这条路。

```bash
# 常用命令速查
lms server start                # LM Studio 起服务
lms ls                          # 列已装模型
ollama serve                    # Ollama 常驻（macOS App 自动）
ollama run gpt-oss:20b          # 终端直接聊
ollama list                     # 列模型
curl http://localhost:11434/v1/models   # 探活
```

## 客户端层：CherryStudio

本地栈其实分两层——**引擎**（跑模型、暴露 API）和**客户端**（对话 UI、知识库管理）。LM Studio / Ollama 是引擎，[CherryStudio](https://cherry-ai.com) 是客户端：开源（AGPL-3.0）桌面应用，连 60+ 云厂商，也连本地引擎——模型选择器里云端和本地模型并列，隐私敏感的问题切本地、要质量的切云端。

```
CherryStudio（客户端：对话 UI · 知识库 · MCP 客户端 · 多服务商聚合）
     ↓ OpenAI 兼容 API（baseURL 一换）
LM Studio / Ollama（引擎：量化加载、推理、暴露 :1234 / :11434）
     ↓
本地模型（GGUF 权重文件）
```

这个 engine/client 分层和"数据库 vs 客户端工具"同构——引擎关心性能与资源，客户端关心体验与编排，中间靠标准协议（OpenAI 格式）解耦。

**和 Codex / Claude Code / Hermes 的本质区别**：判别法是**有没有 agent loop（工具循环）和系统权限**。CherryStudio 是对话客户端——你问一句它答一句，人驱动每一轮，基本不碰系统；Codex、Claude Code、Hermes 是 [agent harness](/notes/frontier/agent-harness)——你给任务，模型自己跑"调工具→看结果→继续"的循环，持有终端/文件/浏览器等系统权限（Codex 垂直于编程，Hermes 通用）。CherryStudio 2.0 也加了 agent 功能，但它的主体仍是对话+知识库，agent 是附加项；harness 们是生来 loop-first。

最有学习价值的是它的**知识库功能**——正好是 [RAG](/notes/frontier/rag) 篇的现成实验场，三种模式对应三档检索方案：

| 模式 | 检索方式 | 对应 RAG 篇概念 |
|---|---|---|
| 不配 embedding | 纯 BM25 关键词 | 关键词检索（无语义理解） |
| 云端 embedding | BM25 + 向量混合 | 混合检索（2026 标配） |
| 本地 embedding | BM25 + 本地向量，全离线 | 全本地 RAG（nomic-embed） |

导入几篇自己的文档、切换三种模式对比召回质量——RAG 篇里"切块/混合检索/rerank"那些概念立刻有了体感。它同时是 MCP 客户端（[MCP 篇](/notes/frontier/mcp-tools)），可挂工具服务器扩展能力。

## 本地 vs 云端：任务分诊

**值得本地跑**：

+ 隐私敏感（公司代码、私人文档——不出本机）
+ 零边际成本的重活：批量打标、全量翻译、离线数据处理（本地跑一夜不心疼，云端按 token 烧钱）
+ 开发调试：RAG/agent 的管线联调（不用怕调试循环烧钱）
+ embedding 生成（[RAG](/notes/frontier/rag) 索引构建——nomic-embed 这类小模型本地绰绰有余）
+ 离线环境

**必须云端**：

+ 复杂推理与长链路 agent 任务（27B 本地模型与云端旗舰的真实差距以"代"计）
+ 超长上下文（本地 KV Cache 吃内存，128K 上下文在 24GB 机器上很勉强）
+ 强多模态/语音
+ 对延迟敏感的高并发服务（本地单请求独占机器）

务实结论：**本地做实验和重活，云端要质量**——同一个应用的 dev 环境指 localhost、prod 指云端，baseURL 一换的事。

## 2026 开源模型格局（认脸）

开源权重这两年追得很凶（GLM-5.2 已登顶开源榜），本地能跑的值得认的：

+ **gpt-oss 系列**（OpenAI 开源）：20B 档工具调用能力强，agent 场景本地首选之一
+ **Qwen 系列**（阿里）：中文最强开源系，qwen3.x 各尺寸覆盖全
+ **DeepSeek 系列**：r1 蒸馏版（如 r1-0528-qwen3-8b）把推理能力塞进 8B
+ **Gemma**（Google）：轻量多模态
+ **GLM 系列**（智谱）：多模态 flash 版本轻量好用
+ embedding：nomic-embed / bge 系列本地 RAG 标配

## 学习路径建议

1. LM Studio 里把同一个问题分别问 8B 和 27B，体感质量差距（建立"参数规模直觉"）
2. 同一模型切 Q4/Q8 对比一次复杂推理，体感量化损失
3. 起 server，用你的 OpenAI 封装代码跑通本地对话 + 流式
4. 用本地 embedding 模型给 [RAG](/notes/frontier/rag) 篇的最小管线做索引，跑通全本地 RAG

## 参考

+ [LM Studio 文档](https://lmstudio.ai/docs)
+ [Ollama 官网](https://ollama.com/)
+ [GGUF 量化说明（llama.cpp）](https://github.com/ggml-org/llama.cpp)
