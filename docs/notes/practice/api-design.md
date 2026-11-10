# API 设计与前后端约定

> 目标：前后端对「路径、方法、状态码、错误体、分页」有同一套默契。HTTP 语义见 [网络协议](/notes/foundations/network-protocol)；前端请求层见 [HTTP 请求与数据层](/notes/frameworks/http-request)；鉴权见 [前端鉴权实战](/notes/practice/frontend-auth) / [OAuth2](/notes/practice/oauth2)。状态码细节以 [MDN HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status) 为准。

## 1. 资源导向，而不是 RPC 堆砌

优先把 URL 当成**资源**，用方法表达动作：

| 做法 | 示例 |
|------|------|
| 推荐 | `GET /users/42`、`PATCH /users/42`、`POST /orders` |
| 慎用 | `POST /getUser`、`GET /deleteUser?id=42`（动词塞进路径/用错方法） |

常见约定（团队可微调，但要写进接口文档）：

- 集合：`/articles`；成员：`/articles/{id}`
- 子资源：`/articles/{id}/comments`
- 动作用子资源或明确动作名（争议大）：`POST /orders/{id}/cancel` —— 若选这套，全站统一

版本：`/api/v1/...` 或 `Accept: application/vnd.myapp.v1+json`。改破坏性契约时升版本，而不是静默改字段含义。

## 2. 方法与幂等

| 方法 | 典型语义 | 幂等？ |
|------|----------|--------|
| `GET` | 读 | 是 |
| `HEAD` | 只要头 | 是 |
| `PUT` | 整体替换 | 是 |
| `PATCH` | 部分更新 | 通常按约定设计为幂等 |
| `DELETE` | 删除 | 是（重复删同一资源应仍成功或稳定 404/204） |
| `POST` | 创建/非幂等动作 | 否 |

前端重试：只对**幂等**请求自动重试；`POST` 要靠幂等键（`Idempotency-Key`）或业务去重。

## 3. 状态码怎么选

按 MDN 常见用法（不要发明私有含义覆盖标准码）：

| 场景 | 建议 |
|------|------|
| 读成功 | `200` + body；无正文删除成功可用 `204` |
| 创建成功 | `201` + 资源或 `Location` |
| 客户端参数错 | `400` |
| 未登录 | `401` |
| 已登录无权限 | `403` |
| 资源不存在 | `404` |
| 冲突（唯一键、版本冲突） | `409` |
| 条件失败（如 `If-Match`） | `412` |
| 校验失败（字段级） | `422`（若团队采用；否则也可用 `400` + 结构化错误） |
| 限流 | `429` |
| 服务端未捕获异常 | `500` |

**不要**用 `200` + `{ success: false }` 掩盖错误——前端拦截器无法按状态码统一处理。

## 4. 统一响应与错误体

成功体可以薄：

```json
{
  "id": "u_42",
  "name": "Ada",
  "createdAt": "2026-11-10T02:00:00.000Z"
}
```

错误体建议固定字段（示例，非官方标准）：

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "email 格式不正确",
    "details": [{ "field": "email", "reason": "format" }],
    "requestId": "01JB..."
  }
}
```

约定：

- `code`：机器可读，稳定；`message`：给人看，可本地化
- `requestId`：前后端日志串联
- 时间一律 **ISO-8601 UTC**（或明确时区），字段名全站统一 `camelCase` 或 `snake_case`

## 5. 列表：分页、排序、过滤

常见查询约定：

```
GET /articles?page=1&pageSize=20&sort=-createdAt&status=published&q=vite
```

响应示例：

```json
{
  "items": [ /* ... */ ],
  "page": 1,
  "pageSize": 20,
  "total": 133
}
```

或游标分页（无限滚动更稳）：

```json
{
  "items": [ /* ... */ ],
  "nextCursor": "eyJpZCI6MTAwfQ"
}
```

注意：

- `pageSize` 设上限，防一次拉爆
- 排序字段白名单，防注入任意列名
- 过滤条件文档化；复杂搜索可走 `POST /articles/search`（仍要约定 body）

## 6. 前后端协作清单

1. **OpenAPI / 等价契约**先于联调（本站 YApi 笔记见 [YApi](/notes/engineering/yapi)）  
2. 枚举、空值（`null` vs 缺省）、日期格式写死  
3. 鉴权：`Authorization: Bearer …` 或 Cookie；401/403 前端统一跳转/提示  
4. 文件上传：`multipart/form-data` 字段名与大小限制写进文档；实现见 [大文件上传](/notes/practice/large-file-upload)、[Node 中间件与文件存储](/notes/node/node-middleware-storage)  
5. 破坏性变更：先加字段 → 双写/兼容期 → 再删旧字段  

## 参考

- [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)
- [MDN: HTTP request methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods)
