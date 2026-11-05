# Django

> 本文时点：2026-11。最新稳定 **Django 6.1.3**（6.1，2026-08 发布，要求 Python ≥3.12）；生产默认 **5.2 LTS**（5.2.19，安全支持到 2028-04）；4.2 LTS 的安全支持 2026-04 已结束。轻量 API 路线见 [FastAPI](/notes/python/fastapi)，工具链见 [Python 生态与工具链](/notes/python/python-ecosystem)。

Django 是 Python 的全栈全家桶框架，定位 ≈ **"NestJS + Prisma + 自动管理后台 + 内置登录"打包**：ORM、后台、鉴权、迁移全内置，哲学是 batteries included（≈ Nuxt 的"都给我装好了"，但落在框架层）。和 FastAPI 是两条路线：FastAPI 轻量 API 优先，Django 全栈开箱即用。

## Python 后端的两条路线

| | FastAPI | Django |
|---|---|---|
| 定位 | 轻量 API-first | 全栈全家桶 |
| 模板/HTML 渲染 | 无（前后端分离） | 内置模板引擎 |
| ORM | 无（自配 SQLAlchemy 等） | 内置（≈ Prisma） |
| 管理后台 | 无 | **内置 Admin（≈ 零代码 CRUD 后台）** |
| 鉴权 | 自己写（Depends） | 内置 auth + session |
| 典型场景 | API 服务、微服务 | 全栈站点、内部后台、快速原型 |

## 项目 / 应用两级结构

Django 分两层：**project**（站点级：配置、URL 总分发、全局中间件 ≈ Nest 根模块 + main.ts）和 **app**（业务模块：模型、视图、后台注册 ≈ Nest 的 feature module）：

```bash
django-admin startproject shop                    # 建 project
cd shop && python manage.py startapp catalog      # 在 project 里建 app（商品模块）
```

+ `manage.py` ≈ 项目的 `npm run`（`runserver` / `migrate` / `collectstatic` 都从它进）
+ `settings.py` ≈ `.env` + 全局配置（数据库、中间件、时区全在这）
+ URL 按 app 分发（每个 app 一个 `urls.py`，project 总表 include 进来 ≈ Nest 的模块路由前缀）

## ORM：Python 界的 Prisma

```python
# catalog/models.py
from django.db import models

class Book(models.Model):
    title = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]        # 默认排序
```

```python
Book.objects.filter(price__lt=50).order_by("title")   # ≈ prisma.book.findMany({ where: { price: { lt: 50 } } })
Book.objects.create(title="Vue 实战", price=89.9)     # ≈ prisma.book.create({ data })
```

+ QuerySet 惰性求值、可链式（≈ Prisma 链式调用），`count()`/`exists()` 不取全表
+ 模型改了跑两步：`manage.py makemigrations`（生成迁移文件 ≈ `prisma migrate dev` 的 diff 步骤）+ `migrate`（执行 ≈ apply），迁移文件进版本库，与 [数据库迁移（Flyway）](/notes/database/db-migration) 是同一套思想
+ 视图里直接用 ORM，没有 SQLAlchemy 那种"独立 ORM 库"的分层（≈ Prisma 内置在框架里 vs 你手写的 client）

## Admin：零代码管理后台（招牌能力）

三行注册，得到一个完整可用的 CRUD 后台（列表/筛选/编辑/删除 + 登录 + 权限）：

```python
# catalog/admin.py
from django.contrib import admin
from .models import Book

admin.site.register(Book)
```

前端视角：≈ "框架自带一套 Ant Design Pro 列表页"——给运营出管理界面的场景（电商后台、内容管理、内部工具）不用写一行前端。这也是 Django 相对 FastAPI/NestJS 最不可替代的点：后两者出 CRUD 界面要靠现成方案（React Admin / Refine），Django 是内置的。

## 内置鉴权 ≈ Node 鉴权 / Spring Security

+ `django.contrib.auth`：用户模型、登录/登出、密码哈希（默认 PBKDF2）、User/Group/Permission 权限模型，开箱即用（≈ 直接把 [Node 鉴权](/notes/node/node-auth) 那篇的活干完）
+ 中间件层自动带 **CSRF 保护**（跨站请求伪造防护，概念见 [前端安全](/notes/performance/frontend-security)）——表单 POST 必须带 token，API 化之后用 DRF 可关掉
+ 做前后端分离 API 就加 **DRF（Django REST Framework）**：≈ NestJS 在 Node 侧的地位（序列化器 = Pydantic 的角色，但生态更老更厚）

## 版本选型（2026-11）

| 版本 | 发布 | 状态 | Python 要求 |
|---|---|---|---|
| **5.2 LTS** | 2025-04 | **生产默认**（安全到 2028-04） | 3.10–3.14 |
| 6.0 | 2025-12 | 安全到 2027-04 | 3.12–3.14 |
| **6.1** | 2026-08 | **最新**（6.1.3，安全到 2027-12） | 3.12–3.15 |

节奏：每 4 个月一次发布（8 月/12 月/4 月），偶数小版本（4.2 / 5.2）为 LTS，安全支持 3 年——与 [Java 的 LTS 逻辑](/notes/java/java-ecosystem) 同构：新项目生产选 LTS，尝鲜选最新。本机 Python 3.14.6 两个路线都能跑（版本管理见 [mise](/notes/engineering/mise)）。

## 与 Node/Java 栈的总对照

| 概念 | Django | Node 侧 | Java 侧 |
|---|---|---|---|
| 全栈框架 | Django | [NestJS](/notes/node/nestjs) | [Spring Boot](/notes/java/spring-boot) |
| ORM | 内置 Django ORM | [Prisma](/notes/node/node-data) | [MyBatis](/notes/java/mybatis) / [JPA](/notes/java/jpa) |
| 自动 CRUD 后台 | Admin（内置） | —（Refine 等方案） | —（Spring Boot Admin 只监控） |
| 数据库迁移 | makemigrations/migrate | prisma migrate | [Flyway](/notes/database/db-migration) |
| 前后端分离 API 层 | DRF | NestJS | Spring Web |

## 学习路径建议

1. `startproject` + `startapp` 走通"模型 → makemigrations → migrate → Admin 注册"一条线（10 分钟出 CRUD 后台）
2. 写一个基于模板的页面（`{{ }}` 渲染 ≈ Vue 模板的简版），体会全栈路线
3. 读 settings 的中间件栈（≈ Express 中间件链，对照 [Node.js 篇](/notes/node/node.md) 的中间机制）
4. 加 DRF 把一个模型暴露成 REST API，对照 [FastAPI](/notes/python/fastapi) 篇的两条路线差异

## 参考

+ [Django 官方文档](https://docs.djangoproject.com/zh-hans/stable/)
+ [Django 下载与支持版本](https://www.djangoproject.com/download/#supported-versions)
+ [Django REST Framework](https://www.django-rest-framework.org/)
+ [Django 发行说明](https://docs.djangoproject.com/en/stable/releases/)
