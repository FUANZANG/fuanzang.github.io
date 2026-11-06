# PyTorch 基础

> 本文基于 2026-11 时点（PyTorch 2.15.0，支持 Python 3.11–3.15；本机 24GB M5 Mac + Python 3.14.6）。

> 关联：[NumPy 与 Python 数据基础](/notes/ai/python-data-stack)（张量是 NumPy 数组的强化版）、[Hugging Face 生态](/notes/ai/huggingface)（拿现成模型来跑）、[模型微调与定制](/notes/ai/fine-tuning)（Apple Silicon 上的 MLX 路线）、[LLM 基础概念](/notes/ai/llm-fundamentals)（这些层叠起来就是 LLM）。

## 定位：LLM 也是"一层一层堆起来的"

你不写模型也能用 LLM，但 PyTorch 是理解"模型内部发生了什么"的最小工具：**LLM = 很多个「线性层 + 注意力」叠起来的数学结构**，PyTorch 就是描述这个结构并让它可训练的语言。一个 transformer 层的最小骨架（示意）：

```python
# 一个 LLM 层的两个核心部件（真实模型还要加 RMSNorm、残差连接等）
x @ self.w_q      # 线性层：矩阵乘法 x·W + b（x 是输入，W 是训练出的权重）
attention(q, k, v)  # 注意力：每个 token 按相关性"看"其他 token（见 LLM 基础概念）
```

所以学 PyTorch 的价值不是"会训练 GPT"，而是：**读得懂模型代码、信不过文档时能翻进去看、微调时知道参数在哪**。

## 张量（Tensor）：ndarray + 三样新东西

张量 ≈ NumPy 数组（见 [NumPy 与 Python 数据基础](/notes/ai/python-data-stack)），多三样：

| 能力 | 说明 | JS 类比 |
|---|---|---|
| **device** | 同一套代码可跑在 CPU / CUDA GPU / Apple MPS 上，`.to(device)` 搬数据 | ≈ Web Worker：同一份代码换个运行环境 |
| **autograd** | 每次运算自动记录依赖图，反向传播算梯度 | 见下节 |
| **nn.Module 组织** | 运算被包装成带参数的模块，可嵌套、可序列化 | ≈ 类 + `render()`，且状态可 save/load |

```python
import torch

t = torch.randn(3, 4)          # 3×4 随机张量（≈ numpy 的随机数组）
t = t.to("mps")                # 搬到 Apple Silicon 的 GPU（统一内存，无显存概念）
# GPU 上不可用时退路："cuda"（N 卡）、"cpu"
```

## Autograd：自动求导 ≈ 响应式信号系统

训练的本质：算出「每个权重应该往哪个方向调」，即**梯度**（损失函数对每个参数的偏导）。手工做需要微积分，autograd 替你完成，机制和响应式库（Preact Signals / Solid 的细粒度依赖追踪）神似：

```
前向：你写 y = (x * w).sum()，框架偷偷记录依赖图  y ← (x*w) ← w
反向：loss.backward() 从损失出发，沿依赖图按链式法则把梯度填回 w.grad
```

| 概念 | 说明 | 类比 |
|---|---|---|
| `tensor.grad` | 前向后每个参数张量上挂的梯度 | 每个变量附带的"该往哪调、调多少"提示 |
| `no_grad()` | 禁止记录（推理时省内存） | 只读模式：不追踪依赖 |
| 优化器（`torch.optim.AdamW`） | 按梯度更新权重 | 拿着梯度提示真正执行 `w -= lr * grad` |

## 最小训练循环（15 行看懂全貌）

```python
import torch

w = torch.randn(3, requires_grad=True)     # 待训练参数（3 个权重）
opt = torch.optim.AdamW([w], lr=0.1)

for step in range(1000):
    x, y_target = torch.randn(8, 3), w * 2 + 1     # 造一批数据（真训练用数据集）
    y_pred = x @ w                                   # 前向：矩阵乘法
    loss = ((y_pred - y_target) ** 2).mean()          # 损失：预测和目标的差距
    loss.backward()                                   # 反向：算梯度
    opt.step()
    opt.zero_grad()                                   # 清零梯度，准备下一轮
```

四步循环（**前向 → 算损失 → 反向 → 更新**）是全部训练代码的骨架，微调 LLM 只是把"3 个权重"换成 70 亿个权重、把损失换成交叉熵。

## nn.Module：模型的"组件化"

```python
class Net(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.linear = torch.nn.Linear(3, 2)   # 线性层：自动随机初始化 w、b
    def forward(self, x):
        return torch.relu(self.linear(x))      # 激活函数：引入非线性（≈ 给纯线性加个弯）

model = Net()
torch.save(model.state_dict(), "weights.pt")   # 保存模型只存参数字典（≈ 组件只序列化 state，不含结构）
```

- `nn.Module` ≈ 一个「有状态、可组合、可序列化」的组件；嵌套模块的参数自动登记，`requires_grad_` 可冻结某些层（微调时冻结底座只训 LoRA 就这么做，见 [模型微调与定制](/notes/ai/fine-tuning)）。
- **state_dict** = `{层名: 参数张量}` 的扁平字典。序列化格式：**`.pt`（pickle，能跑代码、不安全）vs `safetensors`（纯二进制 + shape/dtype 元数据，HF 模型默认用它）**——类比：JSON 序列化 vs 带 schema 的二进制协议。

## 本机（M5 / 24GB）能干什么

| 任务 | 内存估算 | 结论 |
|---|---|---|
| 小模型训练（1M~100M 参数） | 几百 MB | ✅ 舒适，学习首选 |
| 7B LLM 推理（fp16 权重） | ≈ 14GB 权重 + KV Cache | ⚠️ 能载入但 PyTorch 推理不是本机甜点 |
| 7B LLM 微调 | 再加优化器状态/激活值 | ❌ 走 [MLX 路线](/notes/ai/fine-tuning)（QLoRA + mlx-lm） |

**LLM 场景本机首选 MLX/Ollama 生态，PyTorch 定位是"理解原理 + 中小模型实验 + 读模型源码"**。2026-11 的 PyTorch 2.15 对 Apple Silicon 有明显投入：FP8 数据类型（`float8_e4m3fn` + `_scaled_mm` 缩放矩阵乘）、`grouped_mm` 解码快路径（**MoE**（Mixture of Experts，专家混合：每层只激活部分"专家"参数，见 [本地大模型](/notes/ai/local-llm)）解码提速 1.32–1.34x）、公开 `torch.mps.Stream` API——本地跑小模型（含 MoE 架构）值得试试 PyTorch MPS 路线。

## torch.compile：模型的 TurboFan

```python
compiled = torch.compile(model)   # 图捕获（Dynamo）→ 融合编译（Inductor）→ 更快执行
```

≈ V8 的 TurboFan：先正常跑（eager），`torch.compile` 把计算图抓下来做算子融合/内核编译再跑，常见提速 1.3–2x，代价是首次调用慢（编译）。纯本地小实验可不开。

## 版本与安装（2026-11）

- **PyTorch 2.15.0** 支持 Python 3.11–3.15（含 free-threaded 3.14t/3.15t 构建）——本机 3.14.6 直接可用。
- 安装（Mac 装默认版即带 MPS 后端，无需 CUDA 构建）：

```bash
uv venv && uv add torch numpy
```

## 学习路径建议

1. 先读 [NumPy 与 Python 数据基础](/notes/ai/python-data-stack)，确认 ndarray/broadcasting 不卡壳。
2. 本机跑通「最小训练循环」，打印 `w` 的值看它每轮在变。
3. 用 `torch.nn` 手写一个两层 MLP 拟合 `sin` 曲线（比线性循环多一个 `nn.Sequential`）。
4. 用 [Hugging Face 生态](/notes/ai/huggingface) 的 `transformers` 载入一个小模型，`inspect` 它的 `nn.Module` 结构，和上文的骨架对一遍。
5. 想看 LLM 内部：跑一遍 forward 打印各层输出 shape，对照 [LLM 基础概念](/notes/ai/llm-fundamentals) 的 token 流。

## 参考

+ [PyTorch 官方：Getting Started（含 macOS/MPS）](https://pytorch.org/get-started/within-5-minutes/)
+ [PyTorch 2.15 Release Blog（Apple Silicon FP8 / 解码提速）](https://pytorch.org/blog/pytorch-2-15-release-blog/)
+ [PyTorch Autograd Tutorial](https://pytorch.org/tutorials/beginner/blitz/autograd_tutorial.html)
+ [Apple 官方：Accelerated PyTorch training on Mac（MPS 后端）](https://developer.apple.com/metal/pytorch/)
+ [safetensors 格式](https://github.com/huggingface/safetensors)
