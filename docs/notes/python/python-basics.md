# Python 基础

> 本文时点：2026-11。Python 没有 LTS，每年 10 月发一个版本，支持周期 5 年（2 年 bugfix + 3 年安全补丁）。当前最新稳定版是 **3.15**（2026-10-09 发布，补丁到 3.15.2），**3.14** 是成熟的"当下主流"；仍在支持的最旧版本是 **3.11**（安全补丁到 2027-10），3.10 的安全支持 2026-10 已结束。

> 前置/关联：版本与工具链见 [Python 生态与工具链](/notes/python/python-ecosystem)；写 web 服务见 [FastAPI](/notes/python/fastapi)；写测试见 [Python 测试](/notes/python/python-testing)。

Python 是解释型通用语言。会 JS/TS 的人学它约等于"换个方言"——80% 概念能直接平移。差异集中在四点：**缩进即语法**（没有大括号和分号）、**可变默认参数是坑**、**类型标注运行时不强制**（≈ TS 的类型在 JS 运行时也不强制，但 Python 连语言层面都不查）、**CPython 的 GIL 让多线程做不了 CPU 并行**（机制和 JS 事件循环不同，结论相似）。

## 第一眼看：JS/TS ↔ Python 速查

| 场景 | JS/TS | Python |
|---|---|---|
| 变量 | `let x = 1` | `x = 1`（没有 `let`/`const`，靠作用域规则） |
| 空值 | `null` / `undefined` | `None`（只有一个） |
| 对象 | `{ a: 1 }` | `{"a": 1}`（dict，键可以是可哈希值，不只是字符串） |
| 数组 | `[1, 2]` | `[1, 2]`（list，可变） |
| 只读数组 | `Object.freeze(arr)` | `tuple`（不可变，可直接当 dict 键） |
| Set | `new Set([1, 2])` | `{1, 2}`（字面量直接写） |
| 模板串 | `` `${a}` `` | `f"{a}"`（f-string，3.12 起支持换行和嵌套同引号） |
| 三目 | `cond ? a : b` | `a if cond else b` |
| 过滤+映射 | `xs.filter(f).map(g)` | `[g(x) for x in xs if f(x)]`（推导式，一条语句干完） |
| 循环 | `for (let i = 0; i < 10; i++)` | `for i in range(10):` |
| 函数 | `const f = (a, b) => a + b` | `def f(a, b):\n    return a + b` |
| 默认参数 | `f(a, b = 1)` | `def f(a, b=1)` |
| 剩余/展开 | `...args` / `fn(...args)` | `def f(*args, **kwargs)` / `f(*args, **kw)` |
| 抛错 | `throw / try...catch` | `raise / try...except` |
| 资源 | `try/finally`（`using` 提案） | `with`（上下文管理器 ≈ JS 的 `using` 显式资源管理） |
| 异步 | `async function` / `await` | `async def` / `await`（关键词相同，心智模型相同） |
| 导入 | ESM `import { x } from "m"` | `from m import x` |
| 可选取值 | `obj?.a ?? b` | `obj.get("a", b)` |
| 装饰语法 | HOC / 装饰器提案 | `@decorator`（装饰器，比 JS 更早落地，≈ HOC 的简写） |

缩进是最大的语法差异：**块由缩进界定**。函数体、if 体都靠 4 空格（约定，不是 Tab）：

```python
def is_admin(user):          # def 结尾的冒号开启函数体
    if user.role == "admin":  # 判断写在同一行
        return True
    return False              # 不需要分号；缩进回到 def 层级 = 函数体结束
```

## 数据结构：要会翻译的几个

| Python | 近似的 JS 概念 | 关键差异 |
|---|---|---|
| `dict` | `Object`（字符串键）/ `Map` | 键可哈希即可（tuple 可以，list 不行）；3.7 起插入序保证 |
| `list` | `Array` | 可变、任意长度；`+` 拼接，`*` 复制（≈ `concat` / `fill`） |
| `tuple` | 只读数组 | 创建后不可改；`("a", 1)` 可直接当 dict 键（JS 里没有） |
| `set` | `Set` | 哈希去重；`{1, 2, 3} & {2, 3}` 直接写交集（≈ Set 运算方法，但更顺） |
| `str` | `string` | 不可变；`"abc"[0]` 取字符；`join` ≈ `"".join(list)` |
| `collections.Counter` | 手写 `Map<string, number>` 计数 | `Counter(["a", "b", "a"])` → `{"a": 2, "b": 1}`，一行完成 |

两个坑，JS 没有对应物：

1. **可变默认参数只创建一次**：`def f(x=[])` 里的 `[]` 被所有调用共享（≈ 把 `let acc = []` 写在函数外，每次调用都往同一个数组里 push）。标准写法：

   ```python
   def f(x=None):
       if x is None:
           x = []
   ```

2. **`bool` 是 `int` 的子类**：`True == 1`、`False == 0` 都成立。判断"是不是布尔"要 `type(x) is bool`，别靠 `== 1`。

## 类型标注：Python 的"TS 模式"

Python 的类型标注（type hints）**运行时完全不检查**——解释器当注释看，≈ TS 类型擦除后 JS 直接跑。静态检查交给 checker：

```python
from collections.abc import Callable

def retry(fn: Callable[[], int], times: int = 3) -> int | None:
    """fn: 无参返回 int 的函数；times 次都失败返回 None（≈ TS `() => number`）"""
    for _ in range(times):
        try:
            return fn()
        except Exception:
            pass
    return None
```

+ 语法几乎和 TS 一致：`list[str]`、`dict[str, int]`、`X | Y` 联合（3.10+）、`type Config = dict[str, int]`（PEP 695 类型别名，3.12+，≈ TS `type`）
+ Checker 首选 **pyright**（微软出品，VS Code Pylance 的同源引擎，≈ 前端生态自带），传统的是 mypy
+ 3.14 起**延迟求值标注**（PEP 649/749）：函数定义时不再执行标注表达式，需要时才求值（`annotationlib` 提供内省）——写前向引用不用字符串包裹了，≈ TS 类型在编译期才解析、可以引用还没定义的类

## GIL 与并发：和 JS 最像也最不像的一点

JS 是单线程 + 事件循环，CPU 阻塞卡死整页（[浏览器原理](/notes/foundations/browser) 里学过）。CPython 多线程也有"单执行点"约束，但机制不同：

- **GIL（全局解释器锁，Global Interpreter Lock）**：CPython 同一时刻只允许一个线程执行字节码。做 IO 密集（web 服务、爬虫、文件批处理）没影响——IO 等待时会释放 GIL；**CPU 密集任务用 `threading` 基本白搭**（≈ 多个 tab 抢同一个 CPU 核）。
- 替代方案：`multiprocessing`（多进程，各进程独立 GIL ≈ Node cluster）、`asyncio`（协程 ≈ 事件循环，海量 IO）、**free-threaded 构建**（PEP 703，无 GIL 的 CPython；3.13 起实验性可用，3.15 的 macOS 官方包已默认带上，且 3.15 给了它稳定的 C API ABI）。
- 3.14 还加了 `concurrent.interpreters`（子解释器，PEP 734）：一个进程里跑多套隔离解释器 ≈ "一个浏览器里开多个独立 JS 引擎"，各自有独立 GIL。

实际选型：web 服务用 async（FastAPI 默认），重计算交给底层 C/Rust 扩展（[NumPy 与 Python 数据基础](/notes/ai/python-data-stack)：NumPy、PyTorch 都是）或多进程，**不要指望 `threading` 做 CPU 并行**。

## 版本现状与新特性（2026-11）

| 版本 | 发布 | 状态 | 代表性特性 |
|---|---|---|---|
| 3.10 | 2021-10 | 安全支持 2026-10 已结束 | PEP 618 联合语法 `X \| Y`、`match` 结构匹配 |
| 3.11 | 2022-10 | 安全补丁到 2027-10 | 自适应解释器提速（平均 ~25%）、异常组（`except*`） |
| 3.12 | 2023-10 | 安全补丁到 2028-10 | PEP 701 f-string 重写（换行/嵌套同引号）、PEP 695 泛型语法、错误信息改进 |
| 3.13 | 2024-10 | bugfix 2026-10 结束，安全补丁到 2029-10 | free-threading 实验版（PEP 703）、PEP 762 更好的报错 |
| 3.14 | 2025-10 | **成熟主流**（安全补丁到 2030-10） | t-string（PEP 750）、延迟标注（PEP 649/749）、子解释器（PEP 734）、`except` 免括号（PEP 758）、zstd、REPL 语法高亮 |
| **3.15** | 2026-10 | **最新**（3.15.2，安全补丁到 2031-10） | `lazy import` 惰性导入（PEP 810）、Tachyon 高频采样 profiler（PEP 799）、UTF-8 默认编码（PEP 686）、frozendict 内置、free-threaded 稳定 ABI |

选型：**新项目用 3.14**（发版一年，特性齐全，生态兼容成熟）；3.15 刚发 4 周，部分第三方库还在补轮子，不急。注意 AI 生态有版本带：比如 [微调（unsloth）](/notes/ai/fine-tuning) 要求 3.11–3.13（不含 3.14），那个场景单独建环境。本机已装 **3.14.6**，多版本切换用 [mise](/notes/engineering/mise)（`mise install python@3.13`）。

## 读懂 Python 世界的三个对照

+ **PEP ≈ TC39 提案**：Python Enhancement Proposal，流程一样（提案 → 接受 → 随版本落地）。[ECMAScript 标准](/notes/foundations/ecma-script-standard) 那篇的读法直接搬过来，PEP 索引在 [peps.python.org](https://peps.python.org/)。
+ **标准库 ≈ Node 内置模块**：`http.client`、`json`、`pathlib`、`asyncio`，零依赖可用。
+ **PyPI ≈ npm registry**：`requests`/`httpx` ≈ fetch/axios，`pandas` ≈ 没有 JS 对应物的 DataFrame（表格计算）。工具链详见 [Python 生态与工具链](/notes/python/python-ecosystem)。

## 学习路径建议

1. REPL 里（终端 `python3`）过一遍速查表，重点体感：dict、推导式、`with`
2. 写个小 CLI（`argparse` ≈ commander）处理一批文件，体会"脚本语言"定位
3. 给脚本加类型标注，pyright 查一遍
4. 看一个短库源码（推荐 `requests`，几百行能读完）
5. 进 [Python 生态与工具链](/notes/python/python-ecosystem)：用 uv 建环境，起第一个 FastAPI 服务

## 参考

+ [Python 官方文档](https://docs.python.org/3/)
+ [What's New in Python 3.14](https://docs.python.org/3.14/whatsnew/3.14.html) / [What's New in Python 3.15](https://docs.python.org/3.15/whatsnew/3.15.html)
+ [PEP 703：可移除 GIL 的 CPython](https://peps.python.org/pep-0703/)
+ [PEP 649 / 749：延迟求值的类型标注](https://peps.python.org/pep-0649/)
+ [pyright（微软，Pylance 引擎）](https://github.com/Microsoft/pyright)
