# Python 测试（pytest）

> 本文时点：2026-11。pytest **9.2.0**（2026-10-27 发布，要求 Python ≥3.10；9.0 于 2025-11 发布）。对照 [前端测试](/notes/performance/frontend-testing)（Vitest/Jest）、[Node 测试](/notes/node/node-testing)、[Java 测试](/notes/java/java-testing)。

pytest 栈和前端一一对应：**pytest ≈ Vitest/Jest（运行器 + 断言）、`unittest.mock` ≈ vi.mock（模拟）、fixture ≈ beforeEach + 依赖注入**。有前端测试经验，这篇基本是"翻译"。最大的体感差异：pytest 用 Python 原生 `assert` 断言——不需要 `expect(...)`（pytest 在编译期改写 assert，失败时自动打出每步中间值，比手写断言库的信息更全）。

## 测试栈全景

| 层 | 工具 | 断言什么 |
|---|---|---|
| 纯函数 | pytest（原生 assert） | 输入输出，不碰网络和数据库 |
| 模拟 | `unittest.mock` | 替换依赖（≈ vi.mock / Jest 的 jest.mock） |
| 参数化 | `@pytest.mark.parametrize` | 一组输入 ≈ `it.each` / `test.each` |
| 共享数据 | fixture（`conftest.py` 收集） | ≈ beforeEach 设置 + 按名注入 |
| HTTP（FastAPI） | Starlette `TestClient` | 状态码、响应体（≈ supertest） |

## 核心：函数名 + assert

```python
def add(a, b):
    return a + b

def test_add():                    # 文件名 test_*.py、函数名 test_* 才会被收集
    assert add(1, 2) == 3          # 原生 assert；失败信息：1 + 2 = 3, 期望 4 这类自动展开

@pytest.mark.parametrize("a, b, expect", [
    (1, 2, 3),
    (0, 0, 0),
    (-1, 1, 0),
])
def test_add_params(a, b, expect):  # ≈ it.each：参数名直接当形参注入
    assert add(a, b) == expect
```

没有 `describe/it` 嵌套——pytest 靠**模块结构 + 函数命名**表达层级（`test_user.py::test_create`），比嵌套 describe 更平，读起来像"文件路径"。

## fixture ≈ beforeEach + 注入

```python
import pytest

@pytest.fixture
def client():                     # fixture 函数：按名注入到需要它的测试参数
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)        # 不起真实端口（≈ supertest(app)）

def test_hello(client):           # 参数 client → pytest 自动注入
    r = client.get("/")
    assert r.status_code == 200
```

`conftest.py` 里的 fixture 自动对同目录及子目录生效（≈ jest.setup / globalSetup，不用 import）。`scope="function"`（默认）/ `"session"` 控制复用粒度（≈ `beforeEach` vs `beforeAll`）。

## 模拟：`unittest.mock` ≈ vi.mock

```python
from unittest.mock import patch, MagicMock

@patch("mymodule.requests.get")    # patch 指定"被引用处"的符号（≈ vi.mock 路径）
def test_fetch(mock_get):
    mock_get.return_value = MagicMock(status_code=200, json=lambda: {"ok": 1})
    assert mymodule.fetch()["ok"] == 1
    mock_get.assert_called_once()  # ≈ expect(fn).toHaveBeenCalledTimes(1)
```

mock 对象是 `MagicMock`（任意属性自动返回 mock，≈ `vi.fn().mockResolvedValue` 的自由度更高）；`patch` 以装饰器或 `with` 两种写法存在（`with` ≈ `beforeEach` 里开、`afterEach` 里关）。

## 运行与配置

```bash
uv run pytest                      # ≈ npm test（uv 自动按 uv.lock 建环境）
uv run pytest -k user             # 按名字过滤（≈ --testPathPattern）
uv run pytest -x                  # 首个失败即停（≈ --bail）
```

配置写在 pyproject.toml（≈ jest.config，不用再建独立配置文件）：

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]              # 只找 tests/ 下的测试
asyncio_mode = "auto"             # 配 pytest-asyncio 后，async def 测试直接跑
```

异步测试（测 FastAPI 的 async 路由）装 `pytest-asyncio`，或直接用同步 `TestClient`（它内部处理事件循环，单测层一般不用手写 `async def test_xxx`）。

## 和 Node/Java 测试的分层一致性

| 层 | 本篇（pytest） | [Node 测试](/notes/node/node-testing)（Vitest） | [Java 测试](/notes/java/java-testing)（JUnit） |
|---|---|---|---|
| 纯函数 | `assert` | `expect().toEqual` | `Assertions.assertEquals` |
| 换依赖 | `@patch` | `vi.mock` / 假 provider | `@Mock` + Mockito |
| HTTP | `TestClient` | `supertest` | `TestRestTemplate` / MockMvc |
| 参数化 | `@pytest.mark.parametrize` | `it.each` | `@ParameterizedTest` |

分层原则三边一致：越靠下越多越快，HTTP 层只留关键路径。

## 学习路径建议

1. 给一个纯函数写三条 `assert`（正常、边界、非法输入），看失败时的自动展开信息
2. 用 `parametrize` 把边界输入铺开（≈ `it.each`）
3. 写一个 `conftest.py` fixture，替换掉测试里的重复搭建
4. 对照 [FastAPI](/notes/python/fastapi) 篇，用 `TestClient` 打一条鉴权接口，断言 401
5. 对同一分层读一遍 [Node 测试](/notes/node/node-testing)，体感"翻译"的对应关系

## 参考

+ [pytest 官方文档](https://docs.pytest.org/)
+ [unittest.mock（标准库）](https://docs.python.org/3/library/unittest.mock.html)
+ [Starlette TestClient](https://www.starlette.io/testclient/)
+ [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
