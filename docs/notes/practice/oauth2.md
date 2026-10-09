# OAuth2 识字

> 定位和 [消息队列识字](/notes/java/message-queue) 一样：听懂角色和授权码，不写一套登录实现。前端跳转步骤见 [前端鉴权实战](/notes/practice/frontend-auth)；多个系统共用登录态、OIDC 多出来的 `id_token` 见 [SSO 与 OIDC](/notes/practice/sso-oidc)。

OAuth 2.0 解决的是**授权**：用户同意某个应用，在有限范围里访问他在另一家服务上的资源。它不负责「这个人是谁」——那是后面 OIDC 补上的身份层。

## 四个角色

| 角色 | 是谁 | 例子 |
|---|---|---|
| 资源所有者 Resource Owner | 人 | 点「允许」的用户 |
| 客户端 Client | 想要访问的应用 | 你的网站、手机 App |
| 授权服务器 Authorization Server | 发通行证的 | 公司 IdP、GitHub、微信 |
| 资源服务器 Resource Server | 拿通行证换数据的 API | `/api/user`、GitHub API |

浏览器里的前端几乎都是**公开客户端**：包进 JS 的密钥谁都能看到，所以不能把 Client Secret 放进前端。

## 授权码

用户不应该把密码交给第三方应用。授权码把「人在授权服务器上登录」和「应用拿 Token」拆开：

```
浏览器打开授权服务器 /authorize
  → 用户登录并同意
  → 重定向回应用，URL 上带着一次性 code（和 state）
  → 应用的后端用 code +（机密客户端的）secret 向授权服务器换 access token
  → 拿 token 调资源服务器
```

`code` 只能用一次、寿命很短。换 Token 这一步放在后端，是为了不把 secret 暴露给浏览器。公开客户端没有 secret，就靠下一节的 PKCE。

## 为什么浏览器端要 PKCE

授权码可能被截走（恶意 App 抢自定义协议的回调、开放重定向）。PKCE 让「发起授权的那个客户端」才能拿 code 去换 Token：

1. 前端生成随机 `code_verifier`，只留在自己这边
2. 跳转时带上它的摘要 `code_challenge`
3. 换 Token 时再交出原来的 `code_verifier`，授权服务器比对摘要

同时带上 `state`，回调时对上号，挡 CSRF。具体跳转代码见 [前端鉴权实战](/notes/practice/frontend-auth)。

## 别的授权方式认脸即可

| 方式 | 现在怎么看 |
|---|---|
| 授权码 + PKCE | 浏览器、App 的默认选择 |
| 客户端凭证 Client Credentials | 没有用户，服务之间自己调自己。密钥只放服务器 |
| 设备码 Device Code | 电视、没有好用浏览器的设备 |
| 隐式授权 Implicit | 已废弃。Token 直接出现在 URL 片段里，留不住、也防不住泄漏 |
| 密码模式 Resource Owner Password | 已废弃。应用不该碰用户密码 |

## 和登录的边界

OAuth2 的 access token 表示「被允许做什么」，不保证里面有稳定的用户身份。要「登录进我的系统」，在授权码上再要一个 `id_token`，那就是 OIDC。多子系统、统一登出、Cookie 域见 [SSO 与 OIDC](/notes/practice/sso-oidc)。

## 学习路径建议

1. 对着四个角色，把一次「用 GitHub 登录」点名：谁是客户端、谁发 code、谁换 token
2. 读 [前端鉴权实战](/notes/practice/frontend-auth) 里的跳转四步，确认 secret 不进浏览器
3. 有多个自家系统时再读 [SSO 与 OIDC](/notes/practice/sso-oidc)

## 参考

+ [OAuth 2.0（RFC 6749）](https://datatracker.ietf.org/doc/html/rfc6749)
+ [PKCE（RFC 7636）](https://datatracker.ietf.org/doc/html/rfc7636)
+ [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
