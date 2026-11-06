# vLLM 推理服务

> 本文基于 2026-11 时点（vLLM 主线 0.33.0 / vllm-metal 0.32.0，均在 GitHub/PyPI 当日核验；vllm-metal 2026-09 首发、与主线同步版本号，面向 Apple Silicon）。

> 关联：[本地大模型](/notes/ai/local-llm)（Ollama/LM Studio 的定位）、[Hugging Face 生态](/notes/ai/huggingface)（模型从哪来）、[Python LLM 开发](/notes/ai/python-llm-apps)（端点怎么接）、[模型微调与定制](/notes/ai/fine-tuning)（量化与 adapter 的背景）。

## 定位：把模型变成"自托管 OpenAI"

vLLM 是一个**推理服务器**：给它一个模型，还你一个 **OpenAI 兼容的 API**（`/v1/chat/completions`、`/v1/completions` 等）。你的 [Python/JS 客户端](/notes/ai/python-llm-apps) 把 `base_url` 一改，零代码切换——[本地大模型](/notes/ai/local-llm) 里 Ollama/LM Studio 提供的是同一件事的"桌面版"，vLLM 是"生产版/高并发版"。

## 三个核心概念（各配一个前端类比）

```
[多个并发的用户请求] → vLLM 调度器 → 一块 GPU/Metal → 一批 token
```

| 概念 | 说明 | 前端类比 |
|---|---|---|
| **PagedAttention** | KV Cache（每层注意力已算过的 K/V 缓存，避免重复计算 ≈ 组件的 memo 缓存）按"页"分配（≈ 操作系统的虚拟内存分页），避免按最大长度预分配造成的碎片 | ≈ 虚拟内存分页 / V8 堆按页管理：要多少给多少 |
| **continuous batching** | 生成中随时有新请求插进当前批次，不等整批结束 | ≈ HTTP/2 多路复用：连接上不断有请求进出 |
| **chunked prefill** | 长提示词分段预计算，和生成步骤交错，减少首 token 延迟 | ≈ 大请求分片传输，不等整包 |

三者合起来，让"一台机器同时服务 N 个人"的吞吐远高于"每人一个进程"。

## 本机（M5 / 24GB）：vllm-metal，不是主线

**主线 vLLM（0.33.0）的主战场是 NVIDIA GPU（CUDA 13.x 轮子）**——Mac 跑不了主线。Apple Silicon 用官方插件 **vllm-metal**（2026-09 首发，2026-10 已迭代到 0.32.0 与主线同步）：

```
vLLM 的调度器 + Paged KV + OpenAI 兼容服务器
        ×
MLX 作为执行后端（默认，Apple Silicon 上比 PyTorch MPS 快）
        实验路径：VLLM_METAL_BACKEND=mps 走 PyTorch MPS
```

安装（要求 macOS 15+；Homebrew 版自带 Python 3.12 运行时，与系统 3.14 无关）：

```bash
brew tap vllm-project/vllm-metal https://github.com/vllm-project/vllm-metal
brew install vllm-project/vllm-metal/vllm-metal

# 起服务：HF 模型都能喂——未量化版（bfloat16）或 mlx-community 的 8-bit 量化版（如 *-8bit 仓库）
vllm serve Qwen/Qwen3-0.6B --dtype bfloat16 --port 8000
```

能力一览（0.32.x）：**OpenAI 兼容端点（流式 + 工具调用解析）**、GGUF 本地文件（`repo_id:quant` 语法）、投机解码（小模型先"猜"几个 token、大模型一次验证，提速解码；MTP = multi-token prediction，架构层一次前向直接预测多个 token）、多 Mac 流水线并行（MLX ring backend，把两台 Mac 当一张大卡）。

**和 Ollama/LM Studio 的分工**：

| | Ollama / LM Studio | vllm-metal |
|---|---|---|
| 定位 | 个人本地日用（最省事） | 本机也要"多用户/高并发/标准 API"时 |
| 并发 | 单会话为主 | continuous batching 真并发 |
| 模型 | 拉即跑 | 喂 HF/GGUF，可挂量化 8-bit |
| 上手 | GUI/一行 pull | Homebrew 装 + serve 一条命令 |

**24GB Mac 的现实**：vllm-metal 上 4B~14B 8-bit 模型做并发服务没问题；70B 依旧跑不动（见 [本地大模型](/notes/ai/local-llm) 的硬件预算表）。**个人日用仍是 Ollama/LM Studio，vllm-metal 给"要给多个脚本/服务供数"的场景**。

## 选型一句话

- 个人本地、要 GUI/最省事 → [Ollama / LM Studio](/notes/ai/local-llm)
- 本机要 OpenAI 兼容高并发端点 → **vllm-metal**
- NVIDIA GPU 服务器、生产级吞吐 → **vLLM 主线**（0.33.x，K8s + CUDA 13 轮子）
- 想读"服务端模型怎么跑的"原理 → [Hugging Face 生态](/notes/ai/huggingface) 的 `transformers serve`

## 学习路径建议

1. 读 [本地大模型](/notes/ai/local-llm) 确认 Ollama/LM Studio 已能日用，本篇才谈得上"升级"。
2. Homebrew 装 vllm-metal，`vllm serve Qwen/Qwen3-0.6B --dtype bfloat16` 起服务（想省内存换 `mlx-community` 的 8-bit 量化仓库）。
3. 用 [Python LLM 开发](/notes/ai/python-llm-apps) 的 `base_url` 指到本机 8000 端口，跑通一个流式对话。
4. 开两个终端同时打同一端点，观察 continuous batching 下两个请求互相"插队"。
5. 对照 [vLLM 官方博客](https://vllm.ai/blog) 的 PagedAttention 图，把三个概念的类比对上号。

## 参考

+ [vLLM 官方文档](https://docs.vllm.ai/en/stable/)
+ [vLLM Metal 官方文档（支持模型矩阵 / 安装 / GGUF）](https://docs.vllm.ai/projects/vllm-metal/en/stable/)
+ [vLLM Metal 发布公告（Apple Silicon 并发服务）](https://vllm.ai/blog/2026-09-22-vllm-metal-v0-28-0)
+ [vLLM PagedAttention 论文](https://arxiv.org/abs/2309.06180)
