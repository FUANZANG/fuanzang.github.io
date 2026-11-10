# OpenAPI 接口契约

> 契约格式以 [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.2.html) 与 [learn.openapis.org](https://learn.openapis.org/specification/) 为准（下文按 **3.1** 叙述）。约定「怎么设计 API」见 [API 设计与前后端约定](/notes/practice/api-design)；本站历史上的可视化平台见 [YApi](/notes/engineering/yapi)（维护趋缓，新项目更常见 OpenAPI 源文件 + 代码生成/文档站）。

## 1. 为什么要契约文件

口头约定和「Wiki 截图」会漂。OpenAPI Description（常叫 OAD）把路径、方法、参数、请求/响应 schema、鉴权写成机器可读文档，用于：

- 生成文档站 / Mock  
- 生成客户端 SDK 或校验中间件  
- CI 里做 breaking change 检查  

它描述的是 **HTTP API 的接口形状**，不是实现代码本身。

## 2. 文档根结构（3.1）

按官方结构说明，根对象必填：

- `openapi`：规范版本字符串，如 `"3.1.0"`  
- `info`：至少 `title`、`version`（这里的 version 是**你的 API 版本**，不是 OAS 版本）  

并且 **`paths` / `components` / `webhooks` 至少有一个**。

```yaml
openapi: 3.1.0
info:
  title: Demo API
  version: 1.0.0
servers:
  - url: https://api.example.com/v1
paths:
  /users/{id}:
    get:
      summary: 获取用户
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: Not found
components:
  schemas:
    User:
      type: object
      required: [id, email]
      properties:
        id: { type: string }
        email: { type: string, format: email }
```

## 3. paths 与 operation

- `paths` 的键是以 `/` 开头的相对路径，拼在 `servers.url` 后面。  
- 每个 path 下用 `get` / `post` / `put` / `patch` / `delete` 等挂 Operation。  
- `responses`：至少定义一个响应；推荐包含成功码；也可用 `2XX` 等通配（具体码优先于通配）。  

参数位置：`in: path | query | header | cookie`。Path 参数通常 `required: true`。

## 4. components 与 `$ref`

`components` 放可复用的 `schemas`、`parameters`、`responses`、`requestBodies`、`securitySchemes` 等。未被 `$ref` 引用的 component **不会自动生效**（规范原文精神：放着不等于挂上）。

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
security:
  - bearerAuth: []
```

## 5. 和代码、YApi 怎么协作

| 工作流 | 说明 |
|--------|------|
| **设计优先** | 先改 YAML/JSON → 评审 → 再实现 / 生成客户端 |
| **代码优先** | 注解或装饰器生成 OAD（Nest/Spring/FastAPI 生态常见） |
| **平台托管** | 把 OAD 导入文档站；YApi 可当历史方案，新团队多直接用 OAS |

前端对接：用生成的类型或对响应做运行时校验（Zod 等），与 [HTTP 请求与数据层](/notes/frameworks/http-request) 一致。

## 6. 落地清单

1. 成功/错误响应都有 schema，避免只写 `200` 无 body。  
2. `info.version` 与破坏性变更策略对齐（见 API 设计笔记）。  
3. 文件进仓库，PR 里审契约 diff。  
4. 鉴权写进 `securitySchemes`，别只在口头说「带 Bearer」。  
5. 生成物（SDK）不要手改；改源契约再生成。

## 参考

- [OpenAPI Specification v3.1.2](https://spec.openapis.org/oas/v3.1.2.html)
- [Structure of an OpenAPI Description](https://learn.openapis.org/specification/structure.html)
- [API Endpoints (paths)](https://learn.openapis.org/specification/paths.html)
- [Components](https://learn.openapis.org/specification/components.html)
