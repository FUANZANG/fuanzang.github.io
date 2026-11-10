# 前后端鉴权对照

> 把已有三篇串成一条链路：**前端怎么带凭证** ↔ **Node/Java 怎么验** ↔ **授权裁决在哪**。不重复长代码；细节跳转到专文。
>
> - 前端选型与存储：[前端鉴权实战](/notes/practice/frontend-auth)
> - 安全属性（Cookie / XSS / CSRF）：[前端安全](/notes/performance/frontend-security)
> - Node：[Node 鉴权](/notes/node/node-auth)
> - Java：[Spring Security](/notes/java/spring-security)
> - 协议层：[OAuth2](/notes/practice/oauth2)、[SSO 与 OIDC](/notes/practice/sso-oidc)
> - 接口约定：[API 设计](/notes/practice/api-design)

## 1. 一张表对齐术语

| 环节 | 前端 | Node（Nest 等） | Java（Spring Security） |
|------|------|-----------------|-------------------------|
| 登录成功 | 存会话 Cookie / 收 Token | 签发 Session 或 JWT | `Authentication` + Token/Session |
| 后续请求 | `credentials` 或 `Authorization` | Guard / Passport 策略 | Filter Chain |
| 当前用户 | `/me` 或解析 claims（仅展示） | `request.user` | `SecurityContext` |
| 能否操作 | 藏按钮（UX） | **必须**再鉴权 | `@PreAuthorize` 等 |
| 登出 | 清本地态 + 调 logout | 废会话 / 黑名单 Refresh | invalidate session |

**铁律**：授权只信任服务端；前端路由守卫防的是「误入页面」，不是攻击者。

## 2. 两条主流链路（对照）

### A. 同站 Cookie 会话（优先）

```
浏览器                BFF / API
  │ POST /login ─────────► 验密，Set-Cookie: sid; HttpOnly; Secure; SameSite=…
  │ GET  /api/… ─────────► 读 Cookie → 查 Session → 授权
  │ POST /logout ────────► 清服务端会话 + 过期 Cookie
```

前端：`fetch(url, { credentials: 'include' })`。  
必须处理 **CSRF**（SameSite + CSRF Token 等，见安全篇）。  
Node：`express-session` / Redis 存会话；Java：Session 或 Spring Session。

### B. SPA + Bearer（跨 API 域常见）

```
登录 → access（短，内存）+ refresh（HttpOnly Cookie 或安全存储）
API  → Authorization: Bearer <access>
401  → 用 refresh 换新 access → 重放（见 HTTP 请求篇无感刷新）
```

Node：`passport-jwt` / `@nestjs/jwt` 验签；**Refresh 旋转与吊销**要设计。  
Java：Resource Server 验 JWT；网关与各服务时钟、jwks 一致。

不要：Access 长期塞 `localStorage` 当默认方案。

## 3. 角色与权限放哪

| 做法 | 适用 |
|------|------|
| JWT claims 带 `roles` | 网关快速拒绝；**权限变更要等过期或主动吊销** |
| 每次查库 / 权限服务 | 可立即生效；多一次依赖 |
| 前端根据 roles 渲染菜单 | 仅 UX；接口仍要校验 |

粗粒度用角色，细粒度用权限点（`order:write`）；两边枚举对齐，写进 OpenAPI `security`。

## 4. 联调检查清单

1. 未登录访问受保护 API → **401**（不是 200 + 空）。  
2. 登录用户越权访问他人资源 → **403**。  
3. CORS：带 Cookie 时 `Access-Control-Allow-Credentials` + 明确 Origin（不能 `*`）。  
4. 生产 Cookie：`Secure`；本地 http 勿照搬生产属性。  
5. Token 载荷无密码、无过多 PII。  
6. 多 Tab 登出：BroadcastChannel / 存储事件与前端篇一致。  
7. SSO：前端只跑授权码 + PKCE 浏览器侧；客户端密钥永不进前端（OIDC 篇）。

## 5. 什么时候读哪篇

| 你在做… | 打开 |
|---------|------|
| 选 Cookie 还是 Bearer | 前端鉴权实战 |
| Nest Guard / 签发 JWT | Node 鉴权 |
| Filter、方法级安全 | Spring Security |
| 接企业 IdP | OAuth2 / SSO·OIDC |
| 错误码与 `/login` 契约 | API 设计 |

把三边对照表贴进团队 Wiki 往往比再写一套「鉴权框架」更有用。

## 参考

- [OAuth 2.0（RFC 6749）](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE（RFC 7636）](https://datatracker.ietf.org/doc/html/rfc7636)
- [Bearer Token（RFC 6750）](https://datatracker.ietf.org/doc/html/rfc6750)
- [JWT（RFC 7519）](https://datatracker.ietf.org/doc/html/rfc7519)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 Security BCP（RFC 9700）](https://datatracker.ietf.org/doc/html/rfc9700)
- [MDN: Using HTTP cookies（SameSite 等属性）](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
