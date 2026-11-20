# 本地 AI 硬件选型

> 本文件回答一件事：**在本机跑 LLM / 本地推理时，内存、显存、NPU 各自管什么，该买哪条路。** 软件怎么装见 [本地大模型](/notes/ai/local-llm)；GPU 架构背景见 [GPU 架构与显存](/hardware/chips/gpu-architectures)；要并发 OpenAI 兼容服务见 [vLLM](/notes/ai/vllm-serving)。
>
> 基于 2026-11 时点：消费级仍是「显存/统一内存容量」决定能跑多大；NPU 主要服务端侧小模型与系统 AI，不是桌面大模型的主力。

## 1. 一句话选型

| 路线 | 适合谁 | 一句话 |
|------|--------|--------|
| **Apple Silicon（统一内存）** | 已有 Mac / 要安静省电 | 内存焊死、带宽够用；日用看总内存档位 |
| **NVIDIA 独显（VRAM）** | Windows/Linux 台式机、要 CUDA 生态 | **显存 GB 数**是第一约束；软件最省心 |
| **AMD 独显** | 预算敏感、可接受折腾 | 游戏卡性价比；ROCm / 本地推理兼容仍次于 NVIDIA |
| **只靠 NPU（AI PC）** | 系统侧总结、小助手 | TOPS 好看，**撑不起 20B+ 本地聊天主引擎** |

本地推理的瓶颈几乎永远是：**权重 + KV Cache 能不能塞进「GPU 能直接用」的那块内存**——Mac 上是统一内存，PC 上是显存（VRAM）。

| 单元 | 本地 LLM 里干什么 | 详解 |
|------|-------------------|------|
| **CPU** | 调度、预处理；不够显存时 offload（很慢） | [CPU 架构](/hardware/chips/cpu-architectures) |
| **GPU** | 矩阵主力；吃 VRAM / 统一内存 | [GPU 架构与显存](/hardware/chips/gpu-architectures) |
| **NPU** | 系统/端侧小模型；不是 20B+ 聊天主引擎 | 见下文 §3.3 |

---

## 2. 先算账：模型要占多少内存

```
权重占用 ≈ 参数量(B) × 每参数字节数
  BF16 ≈ 2 字节/参 → 7B ≈ 14 GB
  Q8   ≈ 1 字节/参 → 7B ≈ 7 GB
  Q4   ≈ 0.5 字节/参 → 7B ≈ 3.5~5 GB（看具体 quant）

还要加：上下文 KV Cache（随 context 长度涨，动辄数 GB）
        + 运行时开销 / 系统占用
```

经验口诀（与 [本地大模型](/notes/ai/local-llm) 同口径）：

| 目标日用 | 粗算需要的「可用 AI 内存」 | 常见硬件感 |
|----------|---------------------------|------------|
| 7~9B Q4 轻量 | ≈ 8~12 GB | 入门够聊 |
| **12~32B Q4 甜点** | ≈ **16~24 GB** | 多数人的舒适区 |
| 70B Q4 | ≈ 40 GB+ | 高端 Mac 统一内存或双卡/工作站显存 |

**稠密 vs MoE**：标称 20B 的 MoE，显存仍按总参近似占，速度却接近激活参——见 local-llm 篇对 gpt-oss 的说明。选型时别只看「B」数字。

---

## 3. 怎么选（Mac / 独显 / NPU）

### 3.1 Apple Silicon（统一内存）

+ CPU / GPU / NPU **共享同一块焊死的内存**，没有「再插一张显卡」
+ 优点：拷贝少、能效高、笔记本可日用；llama.cpp / MLX / Ollama / LM Studio / vllm-metal 都成熟
+ 缺点：容量一次性买断；同价位峰值算力通常不如同预算 NVIDIA 独显
+ **买内存比买「更贵的芯片后缀」更关键**：24GB 能舒服跑到 ~27B Q4；想常驻更大模型直接看 36/48/64GB+

| 统一内存档 | 本地 LLM 体感（Q4，留系统余量） |
|------------|----------------------------------|
| 16 GB | 7~9B 日用；14B 偏紧 |
| **24 GB** | **8~27B 甜点**（本站 local-llm 默认假设） |
| 36~48 GB | 32B 舒适，更大 MoE 可试 |
| 64 GB+ | 向 70B Q4 边缘试探，仍要看带宽与散热 |

带宽与各 M 系列档位见 [GPU · 统一内存](/hardware/chips/gpu-architectures)。

### 3.2 NVIDIA 独显（Windows / Linux）

+ 权重进 **VRAM**；系统 DDR 再大，GPU 够不着也白搭（除非 CPU offload，会慢一个数量级）
+ 软件：CUDA + llama.cpp / Ollama / vLLM 主线，文档与踩坑最少
+ 买卡只记两件事：**显存容量**、**接口供电/机箱能否装下**

| 显存 | 大致能稳住什么（Q4 日用） |
|------|---------------------------|
| 8 GB | 7~9B；14B 勉强 |
| 12~16 GB | 14~22B 舒适 |
| **24 GB** | **32B 档甜点**；部分 70B 需更激进量化或分层卸载 |
| 32 GB+ / 多卡 | 大模型与本地服务并存 |

消费级架构年表见 [GPU 架构与显存](/hardware/chips/gpu-architectures)；不要为本地聊天去买数据中心卡——功耗、噪音、价格都不划算。

### 3.3 AMD / 核显 /「AI PC」NPU

| 选项 | 结论 |
|------|------|
| **AMD 独显** | 能跑，但驱动/ROCm/工具链完整度长期落后 NVIDIA；折腾成本算进总价 |
| **核显 + 大内存** | 可做 CPU/iGPU 推理，速度通常远慢于独显；适合「偶尔试试」 |
| **NPU（40~50+ TOPS）** | 擅长系统侧小模型、影像/语音辅助；**不是** Ollama 里换 32B 聊天模型的主算力 |

听到「AI PC / Copilot+」先问：你要的是**系统助手**，还是**自己选开源权重本地聊**——后者看 VRAM/统一内存，不看 NPU 海报上的 TOPS。

---

## 4. 决策树（买之前）

```
主要场景是本地开源 LLM？
  ├─ 已有/想要 Mac → 优先加统一内存档位，软件走 Ollama/LM Studio（或 vllm-metal）
  ├─ 台式机 / 要 CUDA / 可能上 vLLM 主线 → NVIDIA，显存按上表对齐模型档
  ├─ 只想系统自带 AI、几乎不自己拉 GGUF → NPU + 品牌机即可，别为 TOPS 溢价太多
  └─ 预算紧且能接受踩坑 → 再考虑 AMD；否则同价优先 NVIDIA 少折腾
```

开发机若还要外接屏、雷电坞，接口能力见 [USB-C 与 Thunderbolt](/hardware/wired/usb-c-thunderbolt)；内存标准背景见 [DDR](/hardware/chips/ddr-standards)。

---

## 5. 和软件篇怎么分工

| 问题 | 去哪篇 |
|------|--------|
| Ollama / LM Studio / 量化档位 / 24GB Mac 表 | [本地大模型](/notes/ai/local-llm) |
| 本机高并发 OpenAI 兼容、Mac 用 vllm-metal | [vLLM 推理服务](/notes/ai/vllm-serving) |
| CUDA vs 统一内存、显存带宽 | [GPU 架构与显存](/hardware/chips/gpu-architectures) |
| 浏览器里跑小模型（WebGPU） | [WebGPU](/notes/frontier/webgpu) · [Web AI](/notes/ai/web-ai) |

本篇**不维护**具体型号跑分榜——换代太快；只维护「容量 → 模型档」的决策尺。

---

## 6. 学习路径

1. 用上表估自己目标模型档，再决定「加内存 / 换卡 / 继续云端」
2. 在 [本地大模型](/notes/ai/local-llm) 用现有机器跑通 7B→更大一档，体感内存墙
3. 需要多客户端打同一本地端点再看 [vLLM](/notes/ai/vllm-serving)

## 参考

+ [llama.cpp](https://github.com/ggml-org/llama.cpp) — GGUF / 量化与后端
+ [Ollama](https://ollama.com/) · [LM Studio](https://lmstudio.ai/)
+ [vLLM](https://docs.vllm.ai/) · [vllm-metal](https://docs.vllm.ai/projects/vllm-metal/en/stable/)
+ 本站：[GPU 架构与显存](/hardware/chips/gpu-architectures) · [本地大模型](/notes/ai/local-llm) · [vLLM](/notes/ai/vllm-serving) · [CPU 架构](/hardware/chips/cpu-architectures)
