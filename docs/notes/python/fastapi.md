# FastAPI

> 本文时点：2026-11。FastAPI **0.162.0**（要求 Python ≥3.10，依赖 starlette ≥0.46、pydantic ≥2.9；当前配套 starlette 1.10.0、Pydantic 2.14.2）。Web 框架侧对标 [NestJS](/notes/node/nestjs)、[Spring Boot](/notes/java/spring-boot)；持久化见 [Python 数据访问](/notes/python/python-data)；鉴权见 [Python 鉴权](/notes/python/python-auth)；测试见 [Python 测试](/notes/python/python-testing)，工具链见 [Python 生态与工具链](/notes/python/python-ecosystem)。

FastAPI 是 Python 的 web 框架，定位 ≈ **NestJS 的"轻装版"**：装饰器路由 + 依赖注入 + 类型校验三件套，但不带 NestJS 那种模块体系（Nest 的全家桶、Guard/Interceptor 全家在 FastAPI 里是"够用就好"的轻量等价物）。

三个核心卖点，每个都有前端对照物：

1. **运行时类型校验**（Pydantic）：请求体自动解析 + 校验 + 422，≈ Nest 的 class-validator 或 JS 里的 Zod parse——但 Python 的类型标注本来运行时不查（见 [Python 基础](/notes/python/python-basics)），Pydantic 就是补上"运行时真的查"的那一层。
2. **自动生成 API 文档**（OpenAPI/Swagger UI）：路由和 Pydantic 模型推导出完整 schema，`/docs` 直接出可交互文档，≈ 不用手写文档的 springdoc/Swagger，且开箱即用。
3. **async by default**（ASGI）：基于 ASGI 异步协议（≈ Node 事件循环那套；老式的 WSGI 是同步版），IO 密集场景天然适合。

## 最小完整服务

```python
# main.py
from fastapi import FastAPI, Header
from pydantic import BaseModel

app = FastAPI()                      # ≈ NestFactory.create() / Express()

class UserIn(BaseModel):            # ≈ Nest 的 DTO + class-validator / Zod schema
    name: str
    age: int | None = None          # 可选字段（≈ TS 的 age?: number）

@app.get("/")                       # ≈ @Controller + @Get()
def hello() -> dict[str, str]:
    return {"msg": "hi"}            # dict 自动序列化成 JSON（≈ 返回 JS 对象）

@app.post("/users")                 # ≈ @Post('/users')
def create_user(user: UserIn, token: str | None = Header(None)):
    if user.age is not None and user.age < 0:
        return {"error": "age 不能为负"}   # 也可 raise HTTPException（≈ Nest 抛异常进管道）
    return {"ok": True, "name": user.name} # 请求体自动解析成 UserIn 实例
```

跑起来（工具链见 [uv](/notes/python/python-ecosystem)）：

```bash
uv add fastapi uvicorn
uv run uvicorn main:app --reload    # ≈ vite / nest start --watch，--reload 热重载
# 浏览器打开 http://127.0.0.1:8000/docs → Swagger UI 自动文档
# http://127.0.0.1:8000/openapi.json → 完整 OpenAPI schema
```

uvicorn 是 ASGI 服务器（≈ Node 里 `app.listen()` 那个 http server）；生产用 `uvicorn main:app --workers 4`（多进程 ≈ Node cluster，各进程独立 GIL 不互相拖慢，见 [GIL 一节](/notes/python/python-basics)）。

## 依赖注入：`Depends` ≈ Nest 的 @Inject

FastAPI 没有模块/服务层那套（没有 Nest 的 `@Module`、没有 Spring 的 IoC 容器），DI 是**函数级**的：`Depends(函数)` 声明依赖，框架在路由执行前自动调用并注入结果。鉴权 Guard 的典型写法：

```python
from fastapi import Depends, HTTPException

async def require_admin(token: str = Header(None)) -> str:   # ≈ Nest 的 Guard
    if not token:
        raise HTTPException(status_code=401, detail="missing token")
    return token    # 返回值注入下游（框架会缓存同一请求内的重复依赖）

@app.get("/admin/users")
def list_users(admin: str = Depends(require_admin)):
    # admin 就是 require_admin 的返回值（框架自动传入）
    return {"token": admin}
```

对照 NestJS：`@UseGuards(AuthGuard)` + `@Inject` 拆成两层（Guard 拦截 + Provider 提供值）；FastAPI 一个 `Depends` 同时干两件事（校验 + 供值）。复杂度更低，但"全局拦截器"要用 `Middleware`（≈ Express middleware / Nest Interceptor）补。

## Pydantic：Python 的"运行时类型系统"

| | Pydantic | JS/TS 对应物 |
|---|---|---|
| 定位 | 运行时解析 + 校验 JSON → Python 对象 | Zod / class-validator |
| 失败行为 | 收 422 + 字段级错误明细（≈ 表单校验报错） | Zod 的 `error.issues` / Nest 的 400 |
| 性能 | v2 核心是 Rust（pydantic-core），解析速度高 | — |
| 额外能力 | `Field(..., ge=0)` 约束、嵌套模型、序列化 `model_dump()` | Zod 的 refine / Nest 的 @IsNested |

```python
class Order(BaseModel):
    items: list[str]                        # 类型不对 → 422（≈ Zod 的 z.array(z.string())）
    total: float = Field(ge=0)              # 约束校验（≈ Zod 的 .min()）
    status: Literal["open", "paid"] = "open"  # ≈ z.enum(["open", "paid"])
```

Pydantic 和 TS 类型的根本差异：TS 类型擦除（运行时不存在，只在编译期查）；Pydantic 是**真运行时对象**（请求体进来先被它校验一遍才进函数）。这也是 Python web 栈和 Node 栈体感最大的区别：Node 侧"类型"停在编译期（Zod 除外），Python 侧 Pydantic 把校验做进了运行流程。

## 四个框架横比

| | Express | **FastAPI** | NestJS | Spring Boot |
|---|---|---|---|---|
| 路由 | 字符串 + 函数 | 装饰器 `@app.get` | 装饰器 `@Get` | 装饰器 `@GetMapping` |
| 类型/参数校验 | 手动（zod 补） | **Pydantic 自动** | class-validator | record + Bean Validation |
| 依赖注入 | 无 | `Depends`（函数级） | `@Inject` + 模块 | IoC 容器 |
| 异步模型 | 事件循环 | ASGI/asyncio | 事件循环 | 虚拟线程 |
| 自动 API 文档 | 无 | **OpenAPI/Swagger 开箱** | 可选插件 | 可选 springdoc |
| 学习曲线 | 平 | 低 | 中（模块体系） | 高（全家桶） |

## 学习路径建议

1. 把"最小完整服务"跑起来，`/docs` 里点一遍（体感自动文档的价值）
2. 给 `/users` 加鉴权 `Depends`，对照 NestJS 的 Guard 写法（[NestJS 篇](/notes/node/nestjs) 里的拦截器章节）
3. 用 Pydantic 建带 `Field` 约束的模型，故意发坏 JSON 看 422 明细
4. 写 `TestClient` 测试（[Python 测试](/notes/python/python-testing) 的 FastAPI 一节）
5. 部署：`uvicorn --workers` + [Docker](/notes/ops/docker) 多阶段镜像

## 参考

+ [FastAPI 官方文档](https://docs.fastapi.dev/)
+ [Pydantic 官方文档](https://docs.pydantic.dev/)
+ [Starlette（FastAPI 的 ASGI 底层）](https://www.starlette.io/)
+ [ASGI 规范](https://asgi.readthedocs.io/)
