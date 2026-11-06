# NumPy 与 Python 数据基础

> 本文基于 2026-11 时点（NumPy 2.5.4 / pandas 3.1.1 / scipy 1.18.1 / JupyterLab 4.6.5，均在 PyPI 当日核验；NumPy 2.x 起要求 Python ≥3.12，本机 3.14.6 直接可用）。

> 关联：[PyTorch 基础](/notes/ai/pytorch-basics)（张量 = 强化版 ndarray）、[Hugging Face 生态](/notes/ai/huggingface)、[Python 基础](/notes/python/python-basics)（GIL 与并发：为什么重计算要交给 C 扩展）。

## 定位：Python 做 AI 的地基

Python 里所有 AI 栈（PyTorch、scikit-learn、LLM 推理内核）底层都是 NumPy。**对前端开发者的最短心智模型：ndarray ≈ 一个"可以 N 维的 TypedArray + 向量化的数学运算符"。** JS 没有直接对应物（`Float64Array` 只有一维，且不做矩阵运算），所以这篇不硬套 JS 类比，而是给你一套最小可用的概念。

## ndarray：比 TypedArray 多了什么

```python
import numpy as np

a = np.zeros((3, 4))      # 3×4 全 0 矩阵；(3, 4) 是 shape（各维长度）
a.shape                   # (3, 4)
a.dtype                   # float64：全数组统一类型（≈ TypedArray 的 T）
a[0, 2]                   # 索引支持 N 维下标
a[:, 1]                   # 切片取"第 1 列"（冒号 = 该维全取）
a.reshape(6, 2)           # 换形状（数据不动，只改 stride 读法）
```

| 概念 | 说明 | 类比 |
|---|---|---|
| **ndarray** | N 维同类型数值数组，连续内存 | 多维 TypedArray |
| **shape / dtype** | 形状 + 元素类型（整组共享） | TypedArray 只有长度，没有"几维" |
| **broadcasting** | 形状不同的数组运算时自动"广播"对齐 | 见下节，JS 无对应 |
| **向量化** | 整块数据一次算完（内部 C 循环 + SIMD） | 把 JS 的 `for` 循环变成 `map` 且快几个量级 |

## 向量化：为什么 Python for 循环慢

```python
# ❌ Python 循环：每次 + 都是解释器字节码，GIL 下单线程慢慢走
total = 0
for x in big_list:
    total += x * 2

# ✅ 向量化：一行，底层是 C 批量运算（NumPy 走 BLAS（Basic Linear Algebra Subprograms：线性代数基础库，几十年调优的矩阵运算 C 实现）/手写 C，CPU 上用 SIMD（单指令多数据：一条指令同时算 4 个 8 位数）
total = (big_arr * 2).sum()
```

**规则：能用整块运算就不用循环。** 10⁷ 级数据 Python 循环 vs 向量化常见 50–100x 差距。这和 [Python 基础](/notes/python/python-basics) 里"GIL 下 CPU 密集别用 `threading`"是同一件事的另一面——**慢的根源相同：Python 字节码层，解法相同：把重计算下推到 C 扩展**。

## Broadcasting：形状自动对齐

```python
a = np.zeros((3, 4))
b = np.ones(4)            # 1 维长度 4
a + b                      # ✅ 得到 (3, 4)：b 沿"行"广播，每行都加一遍
a + np.ones((3, 4))       # ✅ 形状完全相同
a + np.ones((3, 3))       # ❌ 报错：对不齐
```

对齐规则（从右往左逐维比较）：**相等、或其中一边是 1（可拉伸）**。`np.tile(b, (3, 1))` 是它的手工版。理解它就够了——PyTorch 张量的广播规则一模一样。

## 数据里的"两个世界"：NumPy vs pandas

| | NumPy | pandas |
|---|---|---|
| 数据形态 | 同类型 N 维数值 | **表格**：行 + 列，每列可不同类型（≈ 对象数组 + 索引） |
| 擅长 | 数学运算、矩阵 | 不规则数据清洗、分组聚合、`DataFrame` ≈ 带列名的对象表 |
| 关系 | pandas 的底层计算就调 NumPy | `df.groupby("类别").mean()` 的数值部分走 NumPy 内核 |

```python
import pandas as pd

df = pd.DataFrame({"name": ["a", "b"], "score": [90, 80]})
df.groupby("name")["score"].mean()    # 分组聚合 ≈ SQL 的 GROUP BY
pd.read_csv("data.csv")              # ≈ fetch 一张表 + 自动定型
```

**2026-11 现状：pandas 已到 3.x**（3.0 于 2026-01 发布，要求 Python ≥3.11）。日常分析够用；训练数据流水线更多直接喂 NumPy/`datasets` 库（见 [Hugging Face 生态](/notes/ai/huggingface)）。

## Jupyter：数据科学的工作台

**Jupyter（现 JupyterLab 4.x / Notebook 7 同源）≈ 带历史与渲染的交互式 REPL**：

```
每个 cell 独立执行，状态共享（变量不丢）
输出可内嵌：表格、图表（matplotlib）、HTML
= 浏览器 DevTools + 代码执行历史 + 图表渲染，三者合体
```

```bash
uv add jupyter jupyterlab   # jupyter = CLI 入口（jupyter lab 命令）
jupyter lab                 # 浏览器打开 127.0.0.1:8888
```

读模型源码、调 prompt、看数据分布——都在这上面做。它不是"科学计算必需"，是**调试/探索体验**：比 `print` 循环体感好一个量级（类比：`debugger;` + 变量监视面板）。

## 矩阵运算的去处：LLM 的最小积木

把上面串起来，一个 LLM 层里反复出现的就这两种运算：

```
线性层：  y = x @ W + b        # 矩阵乘法（NumPy 的 @ 运算符）
注意力：  score = Q @ K.T      # 点积算相似度（token 之间的"相关性"）
          attention = softmax(score / √d) @ V   # 加权求和
```

- **embedding（词向量）** = 一张查表：token id → 一串浮点数（`model.embed_tokens`，本质 `nn.Embedding`）。"语义距离"就是这些向量的余弦距离——RAG 里"找相似"（[RAG](/notes/ai/rag)）算的就是它。
- 这些式子 PyTorch 里一字不差，只是张量版（见 [PyTorch 基础](/notes/ai/pytorch-basics)）。**读到这里，LLM 文档里的 x/W/K/V 不再是天书。**

## SciPy（认脸即可）

`scipy`（1.18.x）= 数值分析工具箱：`scipy.stats`（分布/检验）、`scipy.optimize`（求最值）、`scipy.signal`（滤波）。做 LLM 应用基本用不到；pandas 装它就跟着来了，**别单独学**，用到查。

## 学习路径建议

1. `uv venv && uv add numpy pandas`，在 Jupyter 里把"ndarray → 切片 → 广播"三节敲一遍。
2. 用 `np.random` 造 1000×3 矩阵，手推再验证一次 `X @ W + b` 的形状。
3. 读 [PyTorch 基础](/notes/ai/pytorch-basics) 的张量一节，对照"ndarray + 三样新东西"。
4. 用 pandas 读一份 CSV（如 Kaggle 任意数据集）做 `groupby().mean()`，体会表格世界。

## 参考

+ [NumPy 官方文档（User Guide）](https://numpy.org/doc/stable/user/index.html)
+ [NumPy Broadcasting 规则图解](https://numpy.org/doc/stable/user/basics.broadcasting.html)
+ [pandas 官方 Quickstart](https://pandas.pydata.org/docs/getting_started/index.html)
+ [Jupyter 官方（JupyterLab）](https://jupyter.org/)
+ [SciPy 官方](https://docs.scipy.org/doc/scipy/)
