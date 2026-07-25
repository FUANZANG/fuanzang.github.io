# 前端鉴权实战

> 📌 本文件只写**登录态怎么选、端到端怎么串**：三种方案对比、会话流、OAuth/SSO 前端视角、多页签与清单。
>
> ⚠️ **边界说明（勿在此重复长代码）**：
>
> - XSS / CSRF / Cookie 属性 / JWT 结构与刷新安全 → [前端安全](/notes/performance/frontend-security)
> - Cookie / localStorage API → [Web 存储](/notes/foundations/web-storage)
> - Axios 拦截器与 **Token 无感刷新实现** → [HTTP 请求与数据层 · Token 无感刷新](/notes/frameworks/http-request#5-token-无感刷新)
> - `beforeEach` / ProtectedRoute **完整鉴权流程** → [前端路由](/notes/frameworks/frontend-routing)
>
> 📅 实践向（SPA + BFF 常见形态）

---

## 1. 要回答的三件事

1. **Authentication**：你是谁  
2. **Authorization**：你能干什么（前端只能藏按钮，裁决在服务端）  
3. **凭证生命周期**：存在哪、怎么带、怎么续期、怎么退出  

选错存储位置，比写错一个守卫更致命。

---

## 2. 三种方案怎么选

| 方案 | 凭证 | 携带 | 何时用 | 代价 |
|------|------|------|--------|------|
| **HttpOnly Cookie 会话** | 服务端 Session | 浏览器自动带 Cookie | **同站业务默认** | 必须处理 CSRF（见安全篇） |
| **Access（内存）+ Refresh（HttpOnly Cookie）** | 短 Access + 长 Refresh | `Authorization: Bearer` | 跨端 / 多 API 网关、要短过期 | 刷新与多 Tab 更复杂 → HTTP 篇实现 |
| **Access 长期放 localStorage** | LS 里的 Token | Bearer | 演示/内网 prototype | **XSS 即可盗走，主站不推荐** |

一句话：能 Cookie 会话就 Cookie；必须 Bearer 时 Access 放内存、Refresh 放 HttpOnly。

---

## 3. Cookie 会话流（骨架）

```
POST /login → Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax
GET  /api/me（credentials: 'include'）→ 用户信息
POST /logout → 清 Cookie
```

```ts
await fetch('/api/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})

const me = await fetch('/api/me', { credentials: 'include' }).then((r) => r.json())
```

属性含义、SameSite、CSRF Token → [前端安全](/notes/performance/frontend-security)；读写 API → [Web 存储](/notes/foundations/web-storage)。

---

## 4. Access + Refresh（只留设计，实现外链）

```
登录 → Access（短，内存）+ Refresh（长，HttpOnly Cookie）
请求 → Authorization: Bearer <access>
401  → 合并并发刷新 → 重试；Refresh 也挂 → 去登录
```

内存保存 Access（刷新页面后静默 `/refresh` 或 `/me` 续期）是推荐姿态；**拦截器合并 401、排队重试的代码**直接看：

→ [HTTP 请求 · Token 无感刷新](/notes/frameworks/http-request#5-token-无感刷新)

安全侧注意点（勿把 Refresh 放 LS、旋转 Refresh 等）→ [前端安全 · Token 刷新 / JWT](/notes/performance/frontend-security)。

---

## 5. 第三方登录与 SSO

### 5.1 OAuth 授权码 + PKCE（前端视角）

单应用「用 GitHub / 企业 IdP 登录」常见路径：

1. 跳转 IdP `/authorize`（带 `state`、`code_challenge`）  
2. 回调 `/callback?code&state`，校验 `state`  
3. **把 code 交给自己的后端**换 Token（客户端密钥永不进前端）  
4. 后端 Set-Cookie 或下发短 Access  

```ts
const state = crypto.randomUUID()
sessionStorage.setItem('oauth_state', state)
location.href = `https://idp.example/authorize?${new URLSearchParams({
  client_id: 'web',
  redirect_uri: 'https://app.example/callback',
  response_type: 'code',
  scope: 'openid profile',
  state,
  code_challenge: challenge,
  code_challenge_method: 'S256',
})}`
```

JWT 只是格式：前端 `atob` 看 `exp` 仅供展示，**验签在服务端**（结构见安全篇）。

### 5.2 单点登录（SSO）——站内目前没有专篇

**现状**：笔记体系里**没有 SSO 专篇**；仅 [YApi](/notes/deploy/yapi) 插件表提到过 SSO，不算实战说明。

**SSO 是什么（前端要懂的部分）**：

| 概念 | 含义 |
|------|------|
| SSO | 在**同一身份域**登录一次，访问多个系统不用再输密码 |
| 常见协议 | **OIDC**（OAuth2 + 身份层，Web 最常见）、SAML（偏企业老系统）、CAS 等 |
| 前端体感 | 未登录 → 重定向到统一认证中心 → 带回 code/ticket → 自家后端建本地会话 |

和「第三方登录」的差别：第三方登录是「用别家账号进**你这一个**应用」；SSO 是「**多个自家/生态应用**共用一个登录态」。实现上 Web 端很多 SSO 就是 **OIDC 授权码**，前端动作仍是跳转 + 回调，会话落点仍归到上面第 2～4 节。

若以后要补专篇，建议放 `practice/sso-oidc.md`，覆盖：统一登出（SLO）、静默续期 `prompt=none`、多子系统 Cookie 域、与 BFF 的分工——而不是再把 CSRF/拦截器写第三遍。

---

## 6. 路由与请求：用现有专篇

| 需求 | 去哪看 |
|------|--------|
| Vue `beforeEach` / 角色 meta / React `ProtectedRoute` | [前端路由 · 鉴权流程](/notes/frameworks/frontend-routing) |
| 请求头挂 Token、401 刷新 | [HTTP 请求](/notes/frameworks/http-request) |
| 登录页校验 | [HTML 表单](/notes/foundations/html) / [正则与校验](/notes/foundations/regex-and-validation) |

原则：前端守卫是体验；**接口无权限必须 403**，不能只靠藏菜单。

---

## 7. 多页签与退出（本篇保留）

| 问题 | 做法 |
|------|------|
| 一处退出到处失效 | Cookie 会话天然共享；内存 Access 用 `BroadcastChannel` / `storage` 事件清掉 |
| 展示不同步 | `fetchMe` 进 store；`visibilitychange` 时静默续期 |
| 退出 | `/logout` 清服务端 + 清内存 Token + 复位 store |

```ts
const bc = new BroadcastChannel('auth')
export function logoutLocal() {
  setAccessToken(null)
  bc.postMessage({ type: 'logout' })
}
bc.onmessage = (e) => {
  if (e.data?.type === 'logout') setAccessToken(null)
}
```

---

## 8. 前端清单

+ [ ] HTTPS + `Secure` Cookie  
+ [ ] Session / Refresh 用 `HttpOnly`；主站不用 LS 存长期密钥  
+ [ ] Cookie 会话的写操作防 CSRF（安全篇）  
+ [ ] `redirect` 只允许站内相对路径，防开放重定向  
+ [ ] 401 → 登录；403 → 无权限页  
+ [ ] 第三方 `postMessage` 校验 `origin`  

```ts
function safeRedirect(path: string | null) {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return '/'
  return path
}
```

---

## 9. 笔记地图

```
方案怎么选、OAuth/SSO 前端视角、多页签  → 本篇
Cookie / XSS / CSRF / JWT 安全         → 前端安全
存储 API                               → Web 存储
拦截器 + 无感刷新                      → HTTP 请求
路由守卫完整示例                       → 前端路由
```

---

## 10. 参考

+ [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
+ [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
+ [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
+ 本站：[前端安全](/notes/performance/frontend-security) · [HTTP 请求](/notes/frameworks/http-request) · [前端路由](/notes/frameworks/frontend-routing)
