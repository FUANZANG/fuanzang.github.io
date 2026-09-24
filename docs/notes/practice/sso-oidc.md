# SSO 与 OIDC

> 本文基于 2026-09 时点的 Web SSO 主流形态（OIDC 授权码 + PKCE）。定位：多个系统共用登录态时，前端与 BFF/资源服务器各自干什么。

> 前置：[前端鉴权实战](/notes/practice/frontend-auth)（方案选型与会话落点）、[Spring Security](/notes/backend/spring-security)（过滤器链 / JWT）。安全细节（CSRF、开放重定向）见 [前端安全](/notes/performance/frontend-security)——本篇不重写。

## SSO vs 第三方登录

| | **SSO** | **第三方登录** |
|---|---|---|
| 目标 | 同一身份域内：登一次，进多个自家/生态应用 | 用别家账号进**你这一个**应用 |
| 典型 | 公司统一认证、产品矩阵（邮件/文档/工单） | 「用 GitHub / 微信登录」 |
| 协议 | 多为 **OIDC**（也有 SAML/CAS） | 也常是 OAuth2/OIDC，语义是「委托身份」 |

前端动作长得很像（跳转 IdP → 回调带 code），差在**会话归属**：SSO 要考虑多子系统共享；第三方登录通常只在你自己的应用建会话。

## OIDC 在 OAuth2 上多了什么

OAuth2 本意是**授权**（能不能调 API）；OIDC 在上面加了**身份**：

+ **ID Token**（JWT）：给客户端看「这人是谁」（`sub`、邮箱等）——**不拿它当 API 访问凭证**
+ **Access Token**：调 API 用（可能是 JWT，也可能是不透明 token）
+ **UserInfo 端点**：用 Access Token 换更全的资料
+ 标准 scope：`openid`（必带）+ `profile` / `email` …

记一句：**登录看 ID Token / UserInfo；调业务 API 看 Access Token（或换成本地 Session）。**

## 授权码 + PKCE 主流程（浏览器）

SPA / 移动端默认这条；**不要**用隐式流（已废弃）。

```
1. 前端生成 code_verifier → 算出 code_challenge，保存 state
2. 跳转 IdP /authorize
     ?client_id & redirect_uri & response_type=code
     &scope=openid profile & state & code_challenge & code_challenge_method=S256
3. 用户在 IdP 登录/同意
4. IdP 重定向回 redirect_uri?code=...&state=...
5. 前端校验 state → 把 code + code_verifier 交给**自家后端**换 token
6. 后端验 ID Token、建本地 Session 或下发自家 JWT
```

```ts
// 发起（前端只负责跳转；换 token 交给 BFF 更稳）
sessionStorage.setItem('oauth_state', state)
sessionStorage.setItem('code_verifier', verifier)
location.href = `${IDP}/authorize?${new URLSearchParams({
  client_id: 'web',
  redirect_uri: 'https://app.example/callback',
  response_type: 'code',
  scope: 'openid profile',
  state,
  code_challenge: challenge,
  code_challenge_method: 'S256',
})}`
```

**BFF 模式（推荐）**：回调打到后端或同域 BFF，code 不经纯前端换 token——Access/Refresh 落 HttpOnly Cookie，前端少碰密钥。纯 SPA 直连 IdP 时 Access 放内存，Refresh 仍尽量 HttpOnly（见鉴权篇方案表）。

### 后端（Resource Server）在干什么

```
API 请求带 Authorization: Bearer <access>
  → Spring Security OAuth2 Resource Server
  → 按 Issuer 拉 JWKS 验签、校验 aud/exp
  → SecurityContext 有人了 → 进业务
```

你的业务服务**通常不是授权服务器**——只验 IdP 签发的 token，或验自家网关换发的内部 JWT。自建完整授权服务器成本高，本笔记不覆盖。

## 多子系统：Cookie 域与统一登出

### Cookie 域

```
app.example.com      → Cookie Domain=.example.com 可共享
admin.example.com
docs.example.com
```

子域共享要统一父域、`Secure`、`SameSite` 策略；跨主域（`a.com` / `b.com`）不能靠 Cookie 共享，只能各自会话 + IdP SSO（第二次进子系统时 IdP 已有会话，往往一次重定向就回来）。

### 静默续期 `prompt=none`

页面可见时（`visibilitychange`）向 IdP 发起隐藏 iframe / 静默授权：已登录则拿新 code；未登录则失败——前端据此决定要不要跳登录页。别拿它当唯一续期手段，Access 过期仍走 Refresh。

### 统一登出（SLO）

```
用户点退出
  → 清本地 Session / Token
  → 重定向 IdP /logout（带 id_token_hint、post_logout_redirect_uri）
  → IdP 清中央会话 → 可选回到应用
```

只清本地、不清 IdP：关掉标签再进别的子系统会「免登」回来——有时是特性，有时是安全事故，产品和安全要定清楚。

## 和现有笔记的分工

| 主题 | 所在篇 |
|---|---|
| Session / Bearer / 多页签 / 清单 | [前端鉴权实战](/notes/practice/frontend-auth) |
| 过滤器链、JWT 自建登录 | [Spring Security](/notes/backend/spring-security) |
| SSO 跳转、OIDC、SLO、多子系统 | 本篇 |
| CSRF / 开放重定向 / XSS | [前端安全](/notes/performance/frontend-security) |

## 常见坑

+ **把 ID Token 当 Access Token** 调 API → 网关拒或权限错乱
+ **`redirect_uri` 开放重定向** → 只允许预登记精确 URI
+ **state / PKCE 不做** → CSRF 换码、授权码拦截
+ **前端存长期 Refresh** → XSS 一锅端
+ **只做前端藏菜单** → SSO 进了子系统照样越权，授权仍在服务端

## 学习路径建议

1. 用 Keycloak / Auth0 免费租户起一个 Realm，注册一个 SPA 客户端（开 PKCE）
2. 跑通授权码回调；先用 BFF 换 token，Cookie 会话进 `/api/me`
3. 再挂第二个子系统域名，体验「IdP 已登录 → 第二次几乎无感」
4. 做一次统一登出，确认两个子系统都失效
5. 之后按需：Spring 接 Resource Server、网关统一验票、企业微信/飞书作 IdP

## 参考

+ [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
+ [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
+ [Keycloak 文档](https://www.keycloak.org/documentation)
+ 本站：[前端鉴权实战](/notes/practice/frontend-auth) · [Spring Security](/notes/backend/spring-security)
