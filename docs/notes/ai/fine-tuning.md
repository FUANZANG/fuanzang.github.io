# 模型微调与定制

> 本文基于 2026-10 时点（OpenAI 自托管微调 2026-05 起关停中；mlx-lm v0.31.x；后训练主流栈为 SFT → DPO → GRPO）。本篇补的是 AI 系列缺的那一轴：**模型是怎么来的、怎么改的**。

> 关联：[RAG](/notes/ai/rag)（RAG vs 微调的取舍）、[本地大模型](/notes/ai/local-llm)（本地跑模型的硬件预算）、[LLM 应用平台](/notes/ai/llm-app-platforms)（平台侧微调）、[AI 评测与可观测](/notes/ai/ai-eval-observability)（微调后怎么验证）。

## 三段式：模型是分三步"长"出来的

看到一个开源模型（比如你本地的 `deepseek-r1-0528-qwen3-8b`），它其实经过了三道工序：

```
① 预训练（Pre-training）   海量无标注文本 → 自学"语言怎么运作"  → 产出 base model
② 监督微调（SFT）          指令-回答配对  → 学会"照着要求回答"   → 产出 instruct model
③ 对齐（Alignment）        偏好/奖励信号  → 学会"答得更符合期待" → 产出可发布模型
```

| 阶段 | 数据 | 学到什么 | 前端类比 |
|---|---|---|---|
| **预训练** | 万亿级 token 原始文本 | 语言规律、世界知识 | 从零泛读一门语言 |
| **SFT**（指令微调） | 几万条「指令→理想回答」 | 听懂指令、输出格式 | 入职培训：教你话术和模板 |
| **对齐** | 偏好对 / 可验证奖励 | 风格、安全、推理质量 | 绩效反馈：哪种答法更受认可 |

**2026 年的关键转变**：对齐阶段的重心从"**人类标注奖励**"转向"**自动验证 + self-play**"——因为给"哪种回答更好"打分很贵，而"这道数学题算对没有"可以自动判。

## 先想清楚：多数时候不该微调

这是本篇最重要的一节。**"让 AI 懂我们业务"的默认答案是 RAG，不是微调**：

| 手段 | 治什么病 | 成本 | 数据更新 |
|---|---|---|---|
| **提示工程** | 输出格式、语气、简单约束 | 几乎为零 | 即时 |
| **RAG** | 模型不知道你的私有知识 / 知识太新 | 低（一套检索管线） | 即时（改文档即可） |
| **微调** | 模型**行为**不对：格式总跑偏、风格不对、领域语感差 | 高（数据 + 训练 + 评测） | 要重新训 |
| **蒸馏** | 要更小更便宜的模型 | 中（需要一个强 teacher） | 要重新蒸 |

口诀（[RAG](/notes/ai/rag) 那句的展开）：**教它"怎么说"用微调，给它"说什么"用 RAG。**

判据很简单——**如果你的问题是"模型不知道 X"，微调解决不了**（微调不擅长灌知识，还会加重幻觉）；**如果是"模型知道但做得不对"，才轮到微调**。

## 微调的三条技术路线

术语先对齐（这几个词天天见，但常被混用）：

| 路线 | 做什么 | 显存 | 效果 |
|---|---|---|---|
| **全参微调**（full） | 更新模型全部权重 | 最大（≈ 训练一个模型） | 上限最高 |
| **LoRA**（Low-Rank Adaptation） | **冻结原权重**，只训旁边一对低秩小矩阵 | 小得多 | 接近全参 |
| **QLoRA** | 把 base model 压到 4bit 再训 LoRA | 最小 | 略低于 LoRA |

LoRA 的直觉：不改模型本体，只在旁边挂一个"补丁"（参数量常在千分之一量级）。所以产物是**几十 MB 的 adapter**，可以随时挂上/摘掉——同一个 base model 配不同 adapter，等于多个"人格"。

## 对齐：DPO 还是 GRPO

SFT 之后如果还要继续调，就进入对齐算法。2026 年的选择基本收敛到两个：

| 算法 | 需要什么数据 | 原理 | 适合 |
|---|---|---|---|
| **DPO**（Direct Preference Optimization） | **偏好对**：同一个问题的一个好评、一个差评 | 纯监督学习，无奖励模型、无 RL、无 critic | 风格 / 语气 / 格式 / 安全 |
| **GRPO**（Group Relative Policy Optimization） | **可自动判对错的奖励函数** | 在线 RL：每题采样一组回答（8–64 条），组内归一化算优势 | 数学 / 代码 / 结构化推理 |

**判别口诀**：**有"哪个更好"的偏好对 → DPO；有"能自动判对错"的验证器 → GRPO。**

两者的硬边界要说清：

+ **DPO 不能凭空超越数据**——它只在给定偏好对的范围内优化，且有长度偏置、依赖参考模型；偏好对的标注成本是主要开销
+ **GRPO 没有可验证奖励就训不了**——写文案"好不好"没法自动判，所以这类任务 GRPO 无用武之地，只能回到 DPO
+ **RLHF / PPO 没消失但已边缘化**——PPO 2026 年很少是正确的选择（除非需要超长序列的逐 token 信用分配）；RLHF 本身也模块化成了上面这套组合
+ 旁支认脸：**KTO** 吃非配对反馈（单个 👍/👎），**DAPO** 是 GRPO 的改进变体

## 三条落地路径

### ① 云端托管微调 —— 正在收缩

**OpenAI 已明确在关停自托管微调平台**（权威时间线）：

| 日期 | 变化 |
|---|---|
| 2026-05-07 | 未跑过微调的组织**不能创建训练任务** |
| 2026-07-02 | 过去 60 天没跑过微调推理的组织，也不能创建 |
| **2027-01-06** | **现有活跃客户也不再能创建新任务**（推理继续，直到 base model 被弃用） |

存量可训的模型只剩 `o4-mini-2025-04-16`（训练按 **$100/小时** 计费），DPO 微调支持 `gpt-4.1` 系列（`method.type = 'dpo'`，`beta` 超参 0–2，仅文本）。一批老 ft 模型（`ft-gpt-4` 等）已在 2026-10-23 关停。

**对比之下国内厂商仍在提供**：阿里云百炼按 token 计费（千问3-32B 训练约 $0.008/千 token，LoRA 高效微调后可按 token 计费部署）；火山方舟按 prefill / sample / train 的 token 量计费，**等 GPU 的空闲时间不计费**。

**结论**：托管微调这条路的确定性在下降——**别把微调能力押在某一家云厂商的平台上**，模型和平台都可能在下一次改版里消失。

### ② 本地微调（Apple Silicon）—— 你这台机器能做什么

Apple Silicon 上的正解是 **MLX**（Apple 官方框架，MIT 协议，**只支持 Apple Silicon**，Intel Mac / Windows / Linux 都不行）：

```bash
pip install "mlx-lm[train]"      # 建议在独立 venv 里

# 训练 LoRA —— --model 指向量化模型就自动走 QLoRA，无需额外参数
mlx_lm.lora \
  --model mlx-community/Qwen3.5-9B-4bit \
  --train --data ./data \
  --iters 600 --batch-size 1 --num-layers 16

# 把 adapter 融进模型（产出可直接部署的完整模型）
mlx_lm.fuse --model <base> --adapter-path ./adapters/v1 --save-path ./models/my-v1
```

关键事实（对着 **Apple M5 / 24GB** 这台机器）：

| 项 | 值 |
|---|---|
| **24GB 能训什么** | **7B QLoRA 舒服；13B 紧**（训练时权重 + 优化器状态 + 批次同处统一内存） |
| 支持的方法 | LoRA / **DoRA** / 全参（`--fine-tune-type`） |
| 省内存开关 | `--grad-checkpoint`、`--grad-accumulation-steps` |
| 数据格式 | 一个目录放 `train.jsonl` + `valid.jsonl`（+ 可选 `test.jsonl`） |
| base model 格式 | 需 HF safetensors（不是 GGUF） |
| 速度参考 | Apple 官方 LORA.md：M1 Max 32GB ≈ 250 tokens/s（WikiSQL） |

**两个坑**：

+ **GGUF 不能直接训**——你 LM Studio 里那批是 GGUF（推理格式），微调要 safetensors 格式的 base model，得另外下载一份
+ **unsloth 的 Python 版本要求**：它有 MLX 后端支持 Mac，但要求 **Python 3.11 ~ 3.13**（不含 3.14）——你本机是 **3.14.6，不在范围内**，要用得单独建个 3.13 环境
+ 另一条路是 **torchtune**（走 MPS 后端，Apple Silicon 支持最好），但比 CUDA 慢 2–3 倍

### ③ 平台侧微调

[LLM 应用平台](/notes/ai/llm-app-platforms)（如 Dify）本身不做训练，但云端版本/配套服务常提供数据集管理与微调入口——**适合"不想碰命令行、只想要个定制模型"的场景**，代价是又一次平台锁定。

## 数据集：微调真正的成本所在

训练本身是**几十分钟到几小时的机器时间**；**数据集是几周到几个月的人力**。这是所有微调项目失控的地方：

+ **起步量**：几百到几千条「输入→理想输出」配对；LoRA 对数据量的要求比全参低
+ **质量 > 数量**：100 条风格一致的样本胜过 1000 条自相矛盾的
+ **一致性是命门**：同一个问题两个标注员给出不同"理想答案"，模型学到的是"随机"
+ **构造方式**：真实日志采样（脱敏）→ 人工改写 → 或用强模型批量生成初稿再人工筛（**合成数据**，注意别把 teacher 的错误也学进去）
+ **一定要留验证集**——没有验证集就没法判断"训没训坏"，见下节

## 蒸馏：把大模型的能力塞进小模型

**蒸馏（distillation）= 用一个强模型（teacher）的输出当训练数据，教一个小模型（student）。** 它是微调的一种特殊形态——数据不是你标的，是 teacher 生成的。

你本地那个 `deepseek-r1-0528-qwen3-8b` 就是典型产物：把 R1 的**推理能力**（那种"先想再答"的思维链）塞进 8B 的小身板。名字里的 `r1-0528-qwen3-8b` 读法是"R1 的能力 + Qwen3-8B 的骨架"。

**和微调、量化的区别（三个词最容易混）**：

| 手段 | 改什么 | 目的 |
|---|---|---|
| **量化** | 权重精度（16bit → 4bit） | 省内存，**不改变能力** |
| **微调** | 模型行为（权重值） | 让它按你要的方式做事 |
| **蒸馏** | 换一个小模型重新训 | 用**更小的模型**复现**大模型的能力** |

## 微调之后：怎么验证没训坏

微调有个隐蔽的副作用叫**灾难性遗忘**——在 A 上训过头，B 就退化了。所以**必须留一个没参与训练的验证集，并且和微调前的 base model 对比跑**：

+ 验证集要覆盖**两类题**：① 你想让它变好的那些（看有没有变好）② 它本来就会的那些（看有没有变差）
+ 别只看单条样本的"感觉"——跑一批、算通过率，接 [AI 评测与可观测](/notes/ai/ai-eval-observability) 那套离线门禁
+ **微调后的模型要重新过一遍安全评测**：对齐/微调可能把原有的安全边界磨掉

## 学习路径建议

1. 先不训任何模型：拿 `local-llm.md` 的本地模型，用**提示工程 + 结构化输出**把同一个需求做到极限——建立"不到万不得已不微调"的直觉
2. 把需求换成"模型不知道我们的文档"，改用 [RAG](/notes/ai/rag) 解决——体会两类问题的分界
3. 真需要微调时，先用手写 100 条 JSONL（`train.jsonl`/`valid.jsonl`），在 MLX 上训一个 7B 的 LoRA，跑通全流程
4. 同一份数据分别用"改提示"和"微调"各做一遍，对比效果与维护成本——这个对比会让你以后少走弯路
5. 需要更小模型时再看蒸馏；需要"更懂审美"时再看 DPO（数据换成偏好对）

## 参考

+ [OpenAI · 微调平台关停时间线（Deprecations）](https://developers.openai.com/api/docs/deprecations)
+ [OpenAI · DPO 微调指南](https://developers.openai.com/api/docs/guides/direct-preference-optimization)
+ [Apple · MLX LM（LoRA / QLoRA 微调）](https://github.com/ml-explore/mlx-lm)
+ [Unsloth 环境要求](https://unsloth.ai/docs/get-started/fine-tuning-for-beginners/unsloth-requirements)
+ [A guide to LLM post-training（SFT/DPO/GRPO/蒸馏怎么选）](https://www.baseten.co/articles/a-guide-to-llm-post-training/)
+ [阿里云百炼 · 模型训练计费](https://www.alibabacloud.com/help/zh/model-studio/model-training-and-deployment-billing)
+ 本站：[RAG](/notes/ai/rag) · [本地大模型](/notes/ai/local-llm) · [LLM 应用平台](/notes/ai/llm-app-platforms)
