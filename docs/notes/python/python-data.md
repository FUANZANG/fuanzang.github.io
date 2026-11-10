# Python 数据访问（SQLAlchemy）

> 以 [SQLAlchemy 2.0 asyncio](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html) 与官方 async ORM 示例为准。生态与安装见 [Python 生态](/notes/python/python-ecosystem)；Web 入口见 [FastAPI](/notes/python/fastapi)；SQL 语义见 [SQL 基础](/notes/database/sql-basics)；Node 对标 [Node 数据访问](/notes/node/node-data)（Prisma）。

## 1. 光谱：手写 SQL ↔ ORM

| 方案 | 像什么 | 何时用 |
|------|--------|--------|
| **SQLAlchemy Core / ORM** | 成熟、表达式强 | FastAPI / 通用后端默认候选 |
| **SQLModel** | Pydantic + SQLAlchemy | 想和 FastAPI 模型共用 |
| **Django ORM** | 电池齐全 | 已在 Django 里（见 [Django](/notes/python/django)） |
| **asyncpg / psycopg 手写** | 极致控 SQL | 复杂报表、特殊管道 |

下文以 **SQLAlchemy 2.0 + AsyncSession** 为主（与 FastAPI async 路由同向）。

## 2. 最小 async ORM

官方模式：`create_async_engine` + `async_sessionmaker` + `AsyncSession`。

```python
from sqlalchemy import ForeignKey, select, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, selectinload
from sqlalchemy.ext.asyncio import AsyncAttrs, create_async_engine, async_sessionmaker

class Base(AsyncAttrs, DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True)
    posts: Mapped[list["Post"]] = relationship(back_populates="author")

class Post(Base):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    author: Mapped["User"] = relationship(back_populates="posts")

engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
Session = async_sessionmaker(engine, expire_on_commit=False)

async def list_users():
    async with Session() as session:
        stmt = select(User).options(selectinload(User.posts)).order_by(User.id)
        result = await session.scalars(stmt)
        return list(result)
```

要点（官方文档）：

- **`expire_on_commit=False`**：commit 后仍可读对象属性，否则易触发隐式 IO。  
- **关系加载**：async 下避免默默 lazy load；用 `selectinload` / `joinedload`，或 `AsyncAttrs.awaitable_attrs`。  
- **一个 `AsyncSession` 不要跨多个并发 task 共用**（`asyncio.gather` 时每任务一个 Session）。

建表可用 `await conn.run_sync(Base.metadata.create_all)`（示例写法）；生产迁移用 Alembic，勿只靠 `create_all`。

## 3. 和 FastAPI 怎么接

常见模式：请求级 Session（依赖注入），结束关闭；业务里 `add` / `commit` / `rollback`。

```python
async def get_session():
    async with Session() as session:
        yield session
```

注意 N+1：列表接口务必 `options(selectinload(...))`，与 Prisma `include` 同理。

## 4. 事务与隔离

应用层 `async with session.begin():` 包住一组写。隔离级别见 [事务与隔离级别](/notes/database/transaction-isolation)；需要时在连接/会话上设置，而不是「以为 ORM 自动串行化」。

## 5. 选型对照

| 需求 | 倾向 |
|------|------|
| 新 FastAPI 服务 | SQLAlchemy 2 async 或 SQLModel |
| 已有 Django | 继续 Django ORM |
| 只要几条 SQL | Core 或手写驱动 |
| AI 数据管道 | 常 pandas/polars + 偶发 ORM；别强行一套打天下 |

## 参考

- [SQLAlchemy 2.0 Asynchronous I/O](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [async_orm 官方示例](https://docs.sqlalchemy.org/en/20/orm/examples.html#asyncio-integration)
