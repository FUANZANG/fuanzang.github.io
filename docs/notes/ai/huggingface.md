# Hugging Face 生态

> 本文基于 2026-11 时点（transformers 5.22.x / huggingface_hub 2.4.x / PEFT 0.21.x，均在 PyPI 当日核验；transformers v5 于 2026-01 发布，网络存量教程大多还是 v4 API，直接复制会报错）。

> 关联：[PyTorch 基础](/notes/ai/pytorch-basics)（模型代码长什么样）、[本地大模型](/notes/ai/local-llm)（这里下载的文件 Ollama/LM Studio 也吃）、[模型微调与定制](/notes/ai/fine-tuning)（adapter 的落盘格式）、[vLLM 推理服务](/notes/ai/vllm-serving)（HF 模型的高并发伺服）。

## 它是什么：模型界的 npm registry + GitHub + CDN

Hugging Face（下称 HF）是三样东西的合体：

| 层 | 内容 | 前端类比 |
|---|---|---|
| **Hub**（huggingface.co） | 模型/数据集仓库 + 下载 CDN + 推理 API | npm registry + GitHub + 一键部署 |
| **libraries** | `transformers`、`huggingface_hub`、`datasets` 等 Python 库 | 包管理器本体 |
| **Spaces** | 模型演示的托管运行时（Docker/Static） | Vercel/Cloudflare Pages |

日常 80% 的交互发生在前两层：写 Python 代码，一行 `from_pretrained("org/model")`，底层走 `huggingface_hub` 从 Hub 拉文件。

## 模型仓库里装了什么（≈ 一个 npm 包）

打开任意模型页，文件列表等价于一个带 `package.json` 的包：

```
config.json          # 模型结构参数（层数/维度）≈ package.json 的 dependencies
tokenizer.json       # 分词器词表 ≈ 解析器配置
model-00001-of-00004.safetensors ...  # 权重分片（几个 GB 起）
README.md            # 用法、许可、基准
```

**权重格式两分**：
- **safetensors**：纯二进制 + shape/dtype 元数据，**不能执行代码**（≈ 带 schema 校验的 JSON 二进制版），HF 生态默认格式；
- **GGUF**：量化后的单文件（Q4_K_M 等档），[Ollama / LM Studio / llama.cpp](/notes/ai/local-llm) 吃这种，体积小 3–5 倍但不能直接喂 PyTorch。

所以同一个模型在 Hub 上往往有两套仓库：`org/model`（safetensors，训练/推理通用）和 `org/model-gguf`（本地端点用）。

## huggingface_hub：下载 ≈ npm pack

```python
# pip 包名 huggingface_hub（≠ 模型库 transformers，它只负责"搬运"）
from huggingface_hub import snapshot_download, hf_api

files = snapshot_download("Qwen/Qwen3-4B")          # 拉整个仓库到缓存 ≈ npm pack 全家桶
hf_api.model_info("Qwen/Qwen3-4B")                   # 查仓库元数据 ≈ npm view
```

下载走 `~/.cache/huggingface/hub/`（git-annex 风格对象存储，按文件内容哈希去重；`HF_HOME` 可改位置）。国内网络注意设镜像 `HF_ENDPOINT=https://hf-mirror.com`。

## transformers 5.x：三步推理 + 大改版须知

`transformers` 是"模型 = 代码"的库——每个模型有对应 `nn.Module` 实现（见 [PyTorch 基础](/notes/ai/pytorch-basics)）。**`pipeline` 是最短路径**（≈ `model.save()` 的反操作 + 一步 run）：

```python
from transformers import pipeline

clf = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
clf("这部电影太棒了", candidate_labels=["正面", "负面"])
# → {'label': '正面', 'score': 0.98, ...}
```

三步套路：`pipeline(任务名, 模型)` → 直接传文本/图片 → 拿结果。Embedding（RAG 要用的向量化，见 [RAG](/notes/ai/rag)）同款：

```python
from sentence_transformers import SentenceTransformer   # HF 上的独立小库，专做 embedding
emb = SentenceTransformer("BAAI/bge-m3")
vec = emb.encode(["前端知识库", "VitePress 侧边栏机制"])   # 各 1024 维
```

**v5 大改版（2026-01 起）——复制老教程前先改这几处**：

| v4 写法（存量教程） | v5 现状 |
|---|---|
| `from_pretrained(load_in_4bit=True)` | 参数移除，量化改走 `quantization_config=`（配合 bitsandbytes） |
| 不传 dtype 默认 float32 | 默认 `dtype="auto"`：按模型保存精度载入（通常 bf16，省一半内存） |
| `encode_plus(...)` | `__call__(...)` |
| Fast/Slow 两套分词器 | 统一只留 `tokenizers` 后端（Rust 写的词表引擎） |
| Flax / TensorFlow 后端 | 停止维护，**PyTorch 是唯一主后端** |
| 无 | 新增 `transformers serve`：内置 OpenAI 兼容服务器（continuous batching + paged attention，见 [vLLM 推理服务](/notes/ai/vllm-serving)） |

## 训练侧全家桶（认脸即可）

| 库 | 干什么 | 一句话 |
|---|---|---|
| **PEFT**（0.21.x） | LoRA/QLoRA 等参数高效微调 | 冻结底座、只训小 adapter；训练产出可独立加载的 adapter 文件 |
| **TRL**（1.17.x） | SFT / DPO / GRPO 训练循环 | LLM 后训练框架，[模型微调与定制](/notes/ai/fine-tuning) 讲的三路线在 Python 侧的落点 |
| **datasets** | 数据加载/切分/流式 | ≈ 带缓存的 DataFrame 管道 |
| **accelerate** | 多卡/多机分发训练代码 | 你本机单卡用不上，认脸 |
| **bitsandbytes**（0.50.x） | 4/8-bit 量化权重载入 | QLoRA 的"Q"就来自它 |

本机（24GB M5）实际走 MLX 微调（[模型微调与定制](/notes/ai/fine-tuning)），上面这套是 GPU 服务器路线——**adapter 格式互通**：MLX 训完可导出 HF PEFT 格式上服务器续训/部署。

## 选型：三条推理路径

| 路径 | 用谁 | 场景 |
|---|---|---|
| 最省事 | [Ollama / LM Studio](/notes/ai/local-llm) | 个人本地日用，GUI + CLI |
| 最接近原理 | `transformers` pipeline | 理解模型内部、写定制预处理 |
| 最高并发 | [vLLM / vllm-metal](/notes/ai/vllm-serving)、`transformers serve` | 多用户服务、长上下文、OpenAI 兼容端点 |

## 学习路径建议

1. 注册 HF 账号，浏览 `Qwen` 组织页：对照上文看一个模型仓库的文件构成。
2. `uv add transformers huggingface_hub`，跑通 zero-shot 三步推理。
3. 用 `sentence-transformers` 算两个句子的余弦相似度（矩阵点积见 [NumPy 与 Python 数据基础](/notes/ai/python-data-stack)）。
4. 把 [本地大模型](/notes/ai/local-llm) 里挑的 Q4 模型对应的 `*-gguf` 仓库和 safetensors 仓库各开一个，对比体积与文件。
5. 进阶：`transformers serve` 起一个 OpenAI 兼容端点，用 [Python LLM 开发](/notes/ai/python-llm-apps) 的客户端接上。

## 参考

+ [Hugging Face 官方：Transformers Quickstart](https://huggingface.co/docs/transformers/quicktour)
+ [Transformers v5 Release Blog（大改版细节）](https://huggingface.co/blog/transformers-v5)
+ [huggingface_hub 文档（下载/推送）](https://huggingface.co/docs/huggingface_hub)
+ [PEFT 文档（LoRA）](https://huggingface.co/docs/peft)
+ [TRL 文档](https://huggingface.co/docs/trl)
