# Python 生态与工具链

> 本文时点：2026-11。uv **0.13.7**（2026-11-03 发布），FastAPI 0.162.0，Pydantic 2.14.2，pytest 9.2.0。Python 最新稳定版 3.15，成熟主流 3.14。

> 语言本身见 [Python 基础](/notes/python/python-basics)；多语言版本管理本机已用 [mise](/notes/engineering/mise)（`mise install python@3.14` 即可）；web 框架见 [FastAPI](/notes/python/fastapi)。

Python 的工具链比 npm 更"碎片化"是历史原因（pip/venv/pyenv/poetry/uv 各管一块），2026 年格局已经收敛：**uv 一个工具接管绝大部分**，pip 退居"兼容层"。这篇把概念和 npm 生态对齐。

## 分层心智模型（≈ Node 生态）

```
系统 Python（brew 安装 / mise 管理）          ≈  系统 node
└── 项目虚拟环境 .venv/                      ≈  项目 node_modules/（隔离边界）
    └── site-packages/                       ≈  node_modules/ 里包的实际存放处
        └── fastapi / pydantic / ...
PyPI（pypi.org）                               ≈  npm registry
```

+ **虚拟环境（venv）**：每个项目一份隔离的"包 + 解释器视图"，≈ 每个项目一份 `node_modules`，但 Python 里是**项目约定**（npm 的 node_modules 是语言外行为，venv 是 Python 的核心机制——不建环境直接在系统 Python 里装包，等于把全局 node_modules 当项目用）。
+ **site-packages**：venv 里包真正的存放目录，≈ node_modules 的内容区。

## pyproject.toml ≈ package.json

Python 项目的清单文件，2021 年起标准化（PEP 518/621）。最小骨架：

```toml
[project]
name = "demo"                    # ≈ name
version = "0.1.0"                # ≈ version
requires-python = ">=3.10"       # ≈ engines（FastAPI/Pydantic/pytest 都要求 ≥3.10）
dependencies = [
  "fastapi>=0.162",              # ≈ dependencies
  "pydantic>=2.14",
]

[dependency-groups]              # PEP 735，≈ devDependencies
dev = ["pytest", "ruff"]

[project.scripts]               # ≈ package.json 的 "bin"：装完后可直接当命令跑
demo = "demo.cli:main"          # demo.cli 模块的 main()
```

## uv：当前主流工具链（≈ npm + Volta + npx 合体）

uv 是 Rust 写的包/版本管理器（Astral 出品，≈ 前端界的"用 Rust 重写了 npm"），一个工具接管 venv + 依赖安装 + 锁文件 + Python 版本 + 一次性运行。安装：`pip install uv` 或官方脚本 `curl -LsSf https://astral.sh/uv/install.sh | sh`。

命令对照（npm → uv）：

| 需求 | npm | uv |
|---|---|---|
| 建隔离环境 | （node_modules 自动） | `uv venv`（生成 `.venv/`） |
| 装包 + 写清单 | `npm i fastapi` | `uv add fastapi`（装包 + 写 pyproject + 更新锁文件，一步） |
| 开发依赖 | `npm i -D pytest` | `uv add --dev pytest` |
| 锁文件 | `package-lock.json` | `uv.lock`（`uv lock` 生成） |
| 按锁文件装 | `npm ci` | `uv sync`（CI 用这个） |
| 跑项目命令 | `npm test` | `uv run pytest`（自动建环境 + 缺啥装啥再跑） |
| 跑一次性 CLI | `npx cowsay hi` | `uvx cowsay hi`（或 `uv tool run`） |
| 装 Python 版本 | `nvm install 20` | `uv python install 3.14` |
| pip 兼容模式 | — | `uv pip install x`（给老脚本兜底） |

和 npm 最实的两个区别：

1. **有默认锁文件**。传统 pip 没有 lockfile（≈ Maven 的"依赖仲裁"而不是 npm 的"安装快照"）；`uv.lock` 记录完整解析结果，`uv sync` 严格按它装，CI 可复现。
2. **快是真快**。Rust 实现 + 并行解析，`uv lock` 比 pip 快 10-100 倍级别；`uv run` 冷启动 ≈ `npx` 但不下载全局缓存。

## PEP 723：单文件脚本自带依赖（≈ npx one-liner）

`uv run` 支持**内联脚本元数据**：脚本文件头声明依赖，uv 现场建临时环境执行——"一个文件 = 一个带依赖声明的 CLI"：

```python
# /// script
# dependencies = ["requests", "rich"]
# ///
import requests
from rich import print

def main():
    r = requests.get("https://example.com")
    print(r.status_code)

main()
```

`uv run script.py` 直接跑（≈ `npx` 但依赖写在文件里，可进版本库）。

## 老三件套：pip + venv +（pyenv）

不用 uv 时的传统组合，读老文档会见到：

```bash
python3 -m venv .venv            # 建环境（≈ 初始化 node_modules 隔离）
source .venv/bin/activate        # 激活：当前 shell 的 python/pip 指向 .venv
pip install fastapi              # 装包（无锁文件，依赖解析是纯 Python，慢）
deactivate                       # 退出
```

pyenv ≈ nvm（多版本 Python 切换）——本机用 [mise](/notes/engineering/mise) 统一管（`mise use python@3.14`），pyenv/uv-python 二选一即可，别混装。

## Wheel 与 sdist（≈ 预编译 vs 源码编译）

PyPI 上的分发形态有两种：

| 形态 | 是什么 | npm 近似 |
|---|---|---|
| **wheel**（`.whl`） | 预构建二进制包，直接解压进 site-packages | 普通 JS 包（或 prebuild 好的 native 模块） |
| **sdist**（`.tar.gz`） | 源码包，装的时候现场编译 | 需要 node-gyp 编译的 native 模块 |

带 Rust/C 核心的库（Pydantic 的 pydantic-core、NumPy）按平台发 wheel，装的是预编译件；纯 Python 库两者等价。pip/uv 默认优先 wheel。

## 工具选型（2026-11 结论）

| 用途 | 选 | 理由 |
|---|---|---|
| 包 + 环境 + 锁 | **uv** | 一把梭，Rust 快，有锁文件 |
| Lint + 格式化 | **ruff** | 一个 Rust 工具替掉 flake8 + isort + black（≈ prettier + eslint 合体） |
| 类型检查 | **pyright** | 微软出品，VS Code Pylance 同源，≈ 前端查 TS 的体验 |
| 测试 | **pytest** | 事实标准（详见 [Python 测试](/notes/python/python-testing)） |
| Python 版本 | **mise**（已用）或 `uv python` | 二选一，别混 |
| AI 数据栈 | 同 **uv**（`uv add torch numpy` 即装） | NumPy/PyTorch/Jupyter 等 AI 栈全走这套，用法见 [NumPy 与 Python 数据基础](/notes/ai/python-data-stack) |

## 参考

+ [uv 官方文档](https://docs.astral.sh/uv/)
+ [PEP 518（构建系统）/ PEP 621（pyproject 项目元数据）](https://peps.python.org/pep-0621/)
+ [PEP 735（dependency-groups）](https://peps.python.org/pep-0735/)
+ [PEP 723（单文件脚本内联依赖）](https://peps.python.org/pep-0723/)
+ [PyPI](https://pypi.org/)
+ [uv GitHub（releases）](https://github.com/astral-sh/uv/releases)
