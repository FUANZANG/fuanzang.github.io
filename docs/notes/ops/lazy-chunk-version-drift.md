# 懒加载 chunk 版本漂移

> 本文基于 Vite 8.3 / Vue Router 5.5 / qiankun 2.10（2026-11 时点：npm registry 与官方文档核验）
> 关联：[前端部署](/notes/ops/frontend-deployment)（缓存策略）· [Nginx 生产配置](/notes/ops/nginx) · [CDN 内容分发](/notes/ops/cdn) · [HTTP 缓存](/notes/foundations/http-caching) · [微前端](/notes/engineering/micro-frontend)

**版本漂移**：跑在用户手里的入口（entry，即 `index.html` 及其引用的主 chunk）和服务器上部署的资产（assets，带内容哈希的 js/css）不是同一代构建——旧入口引用的 chunk 文件名，服务器已经删了。

版本漂移 + SPA（Single Page Application，只加载一个 HTML、路由切换全靠 JS 的应用）+ 懒加载（路由/组件级 `import()`，构建时拆成独立 chunk，首次访问该路由才下载）三件事凑齐时，症状是：

**发版后，用户开着的旧 tab 里点进未加载过的懒路由，报：**

```
Failed to fetch dynamically imported module: /assets/TemplateEditor.eNBKiZpH.js
Failed to load module script: Expected a JavaScript module script to be served with an
application/javascript MIME type, but the server responded with a Content-Type of
text/html
```

（MIME 类型，响应的内容类型声明，如 `text/html`、`application/javascript`；报错措辞各浏览器略有差异。）

该路由白屏、功能不可用；硬刷新（Chrome/Edge：Ctrl+Shift+R；Safari：开发者工具"清空缓存并重新加载"）恢复。

## 漂移发生在哪一环

版本漂移不是单点，而是一串缓存环节——任何一环还攥着"上一代入口"都会触发：

| 缓存环节 | 攥着什么 | 何时漂移 | 处理（后文对应小节） |
|---|---|---|---|
| 旧 tab（页面内存） | 已加载的旧入口 | 发版后首次进入某懒路由 | 客户端兜底 |
| 浏览器 HTTP 缓存 | 带长 max-age 的入口 HTML | 发版后浏览器直接命中缓存、不回源 | 入口 no-cache（服务端） |
| 网关 / CDN 边缘缓存 | 边缘节点上的入口 HTML | 发版没刷入口缓存 | 发版 SOP 刷新入口（发布流程）；查 CDN"忽略源站 Cache-Control"开关 |
| 微前端子应用 entry | 宿主侧抓取 / 缓存的子应用 entry HTML | 子应用独立发版，宿主侧还是旧 entry | 子应用 entry no-cache，兜底加在子应用侧（微前端） |

CDN 的机制与配置（TTL、刷新策略）见 [CDN 内容分发](/notes/ops/cdn)；本篇只管"这一环怎么防漂移"。

## 失效链路

```
旧构建的入口 HTML（在旧 tab / 浏览器缓存 / CDN 缓存里，引用的还是旧 hash chunk）
  ↓ 用户进入未加载过的懒路由
import('旧hash.js')
  ↓ 服务器已删除旧产物，该文件 404
Nginx SPA 回退 try_files 命中 /index.html → 200 + text/html（HTML 页面）
  ↓ 浏览器对 <script type="module"> 做 MIME 强校验
动态 import 被拒绝 → 白屏 / 路由不可用
```

三个关键点：

1. **旧 tab 跑的是旧入口**。发版后入口引用的 chunk 文件名换成新 hash；旧 tab（或缓存里的旧入口）仍引用旧 hash。只有"发版后才第一次点的懒路由"会触发——已加载过的路由内存里已有模块，不受影响。
2. **404 被 SPA 回退吞掉了**。Nginx 的 `try_files $uri $uri/ /index.html` 本意是"刷新子路由不 404"，但静态资源 404 也落进这条回退——拿到的是 200 + HTML，而不是 404。
3. **MIME 报错是指纹**。module script 的内容类型校验很严：200 但 Content-Type 是 text/html 也按失败处理。看到"期望 JS 拿到 HTML"，基本可以确诊是 SPA 回退吞了 chunk 的 404。

一行验证法：把报错里的 chunk URL 在新标签页打开——返回的是网站首页（HTML），说明该文件在当前构建里已不存在。

## 客户端兜底（第一道防线）

思路：识别"chunk 加载失败"→ 整页刷新一次 → 重新拉入口（拿到新 chunk 引用）→ 继续导航。

### Vue Router

```js
// router/index.js（vue-router 4/5 的 onError 签名一致，5.5 类型已核验）
router.onError((error, to, from) => {
  const chunkFail =
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed') // 新 Chromium 的措辞
  if (!chunkFail) return

  // TTL（Time To Live，失效时间）防循环：距上次自动刷新不足 10s 仍失败 → 停止 reload，把错误暴露出来
  const last = Number(sessionStorage.getItem('chunk-reload-at') ?? 0)
  if (Date.now() - last <= 10_000) return

  sessionStorage.setItem('chunk-reload-at', String(Date.now()))
  window.location = to?.fullPath || window.location.pathname // 整页跳到用户想去的路线
})
```

+ 为什么用 `window.location = to.fullPath` 而不是 `reload()`：刷新后用户仍停留在"当时想去的路线"，`to` 就是失败时正在导航的目标。
+ 为什么是 TTL 而不是"每个 session 只来一次"：tab 放了一周回来再失败，多半是真网络/部署问题，无限 reload 只会掩盖它。
+ 兜底只对"动态 import 失败"生效，其他路由错误（守卫返回 false 等）不要误伤。

### Vite 项目（与框架无关）

Vite 构建入口会为动态 import 包一层 preload helper，失败时在 window 上派发 `vite:preloadError` 全局事件（官方 Vite 8.3 文档 Load Error Handling 一节，并明确说明这就是"发版后旧 tab 拿不到旧 chunk"的标准处理）：

```js
// main.ts，应用初始化之前
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault() // 阻止原始错误继续抛出
  window.location.reload()
})
```

> 官方文档同时强调：**入口 HTML 必须设 `Cache-Control: no-cache`**，否则刷新拿到的还是旧入口、旧 chunk 引用，兜底直接失效。

`no-cache` ≠ 完全不缓存：浏览器可以缓存资源，但每次使用前必须向服务器/CDN 做条件请求（If-Modified-Since / ETag）重新验证。这就是"HTML 短缓存、hash 资源长缓存"能成立的原因。

## 服务端（治本）

| 策略 | 解决什么 | 成本 / 局限 |
|---|---|---|
| 入口 HTML `no-cache`，发版后刷新 CDN 入口缓存 | 新 tab / 刷新立即拿新入口 | 客户端兜底生效的**前置条件** |
| 带 hash 的 js/css 长缓存（`immutable`） | 避免重复下载 | 文件名必须带内容哈希；`immutable` = 浏览器连条件请求都不做 |
| 静态扩展名缺失直接 404，不回退 index.html | MIME 错变干净 404，客户端判断更可靠 | 需要维护扩展名白名单 |
| 保留最近 N 次构建产物 | N 版本内的旧 tab 仍能加载 | 磁盘持续增长；更老的 tab 照样挂——是止血不是治本 |

Nginx 示例：

```nginx
# 静态资源：缺失直接 404，绝不回退 index.html；带内容哈希 → 长缓存
location ~* \.(?:js|css|svg|png|jpe?g|gif|ico|woff2?)$ {
    try_files $uri =404;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# 入口：no-cache（同时覆盖 / 和 /index.html 两种访问方式）
location = / {
    add_header Cache-Control "no-cache";
}
location = /index.html {
    add_header Cache-Control "no-cache";
}

# 其余动态路由：SPA 回退（只对"非静态"路径生效）
location / {
    try_files $uri $uri/ /index.html;
}
```

匹配顺序说明：Nginx 的 regex location（`~*` 开头）优先于普通前缀 location，所以静态扩展名请求先命中第一条直接 404，SPA 回退只兜底"不存在的路由路径"。

> CDN 场景：上面的头也要在 CDN 层生效。部分 CDN 平台有"忽略源站 Cache-Control / 强制回源"开关，开了会覆盖 no-cache——发版流程里要包含**刷新入口 HTML 的 CDN 缓存**这一步（hash 资源不用刷，文件名已变）。"CDN 没刷入口"是最常见的漂移源之一：用户刷新拿到的仍是边缘节点缓存的旧入口。

## 微前端为什么更严重

微前端：拆成宿主（主应用）+ 多个子应用的架构，每个子应用是独立的 SPA 仓库，独立构建、**独立发版**——发版节奏不受宿主控制、频率通常更高。

+ **子应用独立发版放大漂移概率**：宿主旧 tab（或宿主侧对子应用 entry 的缓存）仍引用子应用旧 chunk——同一套失效链路，只是碰撞频率随子应用发版次数上涨。
+ **子应用 entry HTML 也是缓存点**。以 qiankun（把子应用加载进宿主并接管其生命周期的微前端框架）为例：宿主会抓取子应用的 entry HTML 再解析其中的 script 标签（其 FAQ 的排查项"entry html 中入口的 js 是不是最后一个"说明的就是这个解析行为）。entry HTML 若被浏览器/CDN 长缓存，发版后宿主重新进子应用解析到的还是旧 script 列表。子应用 entry 同样要 no-cache。
+ **兜底加在子应用侧**：懒路由的 router 在子应用里，`router.onError` / `vite:preloadError` 都写在子应用；宿主侧的收益只是"重新进子应用时拿到新 entry"。

## 发布流程与监控

+ 发布 SOP 加一步：**发版后刷新 CDN/网关对入口 HTML 的缓存**（hash 资源不需要）。
+ 前端监控（见 [前端监控](/notes/performance/frontend-monitoring)）跟踪 `Failed to fetch dynamically imported module` 错误率：
  - 发版后几分钟内出现、随后回落 → 正常版本漂移，兜底在吸收；
  - 持续上升或不回落 → 兜底没生效（入口仍被缓存），查入口缓存链（浏览器 → 网关 → CDN）。
+ CI/CD 发版冒烟：`curl -I https://host/assets/<本次构建入口hash>.js`，确认 200 且 Content-Type 为 JS。

## 速查

| 症状 | 先查什么 | 动作 |
|---|---|---|
| 发版后旧 tab 懒路由白屏 + MIME 报错 | 入口 HTML 是否 no-cache | 客户端兜底（上文）+ 入口 no-cache + 刷新 CDN 入口 |
| 缺的 .js 返回了 HTML（200 text/html） | SPA 回退是否吞了静态 404 | Nginx 静态扩展名 `try_files $uri =404` |
| 硬刷新后仍加载旧 chunk | CDN/网关对入口的缓存 | 刷新入口缓存；检查 CDN"忽略源站 Cache-Control"开关 |
| 刷新循环不停 / 刷新后仍失败 | 入口缓存链整体失效 | 查浏览器 → 网关 → CDN 三层入口缓存 |
| 微前端宿主正常、子应用挂 | 子应用 entry HTML 缓存 | 子应用 entry no-cache，子应用侧加兜底 |

## 参考

+ Vite 官方文档 — Build / Load Error Handling（`vite:preloadError`、入口 HTML no-cache 的官方说明）：<https://vite.dev/guide/build>
+ Vue Router API — `router.onError`（类型：`(error: any, to, from) => any`）：<https://router.vuejs.org/api/>
+ Nginx 文档 — `try_files`（ngx_http_try_files_module）：<https://nginx.org/en/docs/http/ngx_http_try_files_module.html>
+ MDN — `Cache-Control`：<https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control>
+ qiankun 文档 — API（`registerMicroApps` entry）与 FAQ（entry html 脚本解析）：<https://qiankun.umijs.org/zh/api/>
