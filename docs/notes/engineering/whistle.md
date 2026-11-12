# Whistle 线上调试

> 本文基于 whistle 2.10.14（npm `whistle`）与 SwitchyOmega 3（2026-11 时点：npm registry、wproxy.org 官方文档、`w2 -h` 实测核验）
> 关联：[多环境与配置管理](/notes/engineering/env-config)（本篇是"多环境"的调试面：拿真实线上环境跑本地代码）

Whistle：基于 Node.js 的跨平台抓包与调试代理（HTTP/HTTP2/HTTPS/WebSocket/TCP），`npm i -g whistle` 后 CLI 命令为 `w2`，默认代理端口 8899，管理界面 `http://local.whistlejs.com`。JS/TS 对照：可以理解为**装在浏览器网络层的全局 axios 拦截器**——所有出浏览器请求都被它截住，按规则转发、替换、改写。

## 和 SwitchyOmega 的分工

官方 README 明确推荐用 ZeroOmega 的 SwitchyOmega 插件做浏览器代理切换，两者分工：

| 层 | 谁负责 | 干什么 |
|---|---|---|
| 连接层 | SwitchyOmega 3 | 决定**哪些域名**的浏览器流量走 whistle；本身不改任何请求 |
| 内容层 | whistle 规则 | 流量进来后按规则映射 / 替换 / 改写 |

接法两种：

+ **auto 模式**：只把目标域名（主站 + 它的 CDN 域 + API 域）指到 Whistle 代理（`127.0.0.1:8899`），其余 Direct。注意浏览器是**按 host 选代理**的——没被指过去的域名（比如独立 CDN 域）的子资源 whistle 看不见、拦不住，得把那个域也加进 auto 规则。
+ **manual 模式**：全量流量走 whistle，whistle 对没配规则的请求默认透传——心智最简单、任何子资源都能拦，但 whistle 必须常开；它一停，这个浏览器所有请求直接挂。

不装扩展也可以：`w2 proxy` 命令配置系统代理，`w2 start --init` 会自动设置代理并安装根证书——但影响的是全机所有应用。

## 两个方向：线上 ↔ 本地

| 方向 | 场景 | whistle 规则（官方示例语法） |
|---|---|---|
| 线上页面 ← 本地资源（最常用） | 在生产页面上跑本地改的代码，配真实数据 / 真实 cookie | `https://prod.example.com/assets/  https://localhost:5173/assets/`（URL 映射）或 `…/build/  file:///Users/you/dist/`（本地目录映射） |
| 本地 / 测试请求 → 线上后端 | 测试环境页面调生产 API 验数据 | `http://dev.example.com/api/  https://prod.example.com/api/` |

规则语法是 `pattern protocol://[value]`（或裸 URL 映射），官方 quickstart 已验证的用法：

```
# Hosts 映射（相当于 hosts 文件，支持带端口 / 路径 / 正则 / 通配符）
test1.wproxy.org 127.0.0.1:6001

# URL 映射：请求（含其子路径）的响应头和内容用另一个 URL 的替换
test.wproxy.org/test  https://ke.qq.com

# 本地文件 / 目录映射：test.wproxy.org/test/xxx 读本地 /Users/xx/statics/xxx
test.wproxy.org/test  file:///Users/xx/statics

# 改请求 Cookie（换账号 / 换环境身份）
www.qq.com  reqCookies://custom_key1=123&custom_key2=789

# 模拟 500（statusCode 不到后台；replaceStatus 会到后台）
test3.example.com/path  statusCode://500

# 查看页面 console.log 与 JS 报错
ke.qq.com  log://
```

完整协议清单（Map Local / Map Remote / DNS Spoofing / Rewrite Request / Rewrite Response / Throttle 等分类）见官方"协议列表"。

## HTTPS 拦截三步（真正的坑）

whistle 是 MITM（Man-in-the-Middle，中间人）代理：HTTPS 要解密拦截，它得冒充目标服务器——用自己的根证书签一张目标域的叶子证书。所以：

1. **装根证书**：管理界面 HTTPS 入口下载 rootca（`w2 ca` 也可管理）；macOS 导入钥匙串后设"始终信任"。
2. **开启 HTTPS 抓包**：官方 FAQ——"未安装根证书或未开启 `Enable HTTPS` 选项"时，whistle 只能看到加密隧道，无法解密。
3. **IP 直连的特殊情况**：直接对 IP 发 HTTPS 时握手常不带 SNI（Server Name Indication，TLS 握手中声明的域名），whistle 判断不了要不要解密，需显式写规则 `ip[:port] enable://capture`。

边界：**HSTS 不影响拦截**（证书链合法就行）；只有做了**证书 pinning**（客户端硬编码信任特定证书 / 公钥，拒绝其它 CA）的站点拦不了。

## 常见坑

| 坑 | 说明 |
|---|---|
| auto 模式漏配 CDN 域 | 主文档走了 whistle、CDN 子资源直连 → 那些资源映射不生效 |
| Service Worker 缓存命中 | SW 命中缓存的响应不走网络 → whistle 看不见；调 PWA 类站点先清 SW |
| whistle 停了 | manual profile 下整个浏览器全挂；auto profile 只挂目标域 |
| 调生产 API 用真实账号 | 方向二的请求是真实身份，**别做写操作** |
| Node 端请求 | 不经浏览器代理，天然不在 whistle 范围内 |

## 速查

| 需求 | 操作 |
|---|---|
| 线上页面跑本地代码 | 浏览器指到 whistle（auto/manual）+ URL 映射 / `file://` 映射规则 |
| 测试环境调生产 API | URL 映射规则；真实账号，禁写 |
| mock 接口响应 | `statusCode://` + 内联值 `file://({"ec":0})` 或本地文件 |
| 模拟弱网 | Throttle 协议：`reqDelay` / `resSpeed` |
| 拦截不生效 | 依次查：域名是否走了 whistle → 根证书是否装好 → `Enable HTTPS` 是否开（IP 直连加 `enable://capture`） |

## 参考

+ whistle GitHub（安装、`w2` 命令、推荐 ZeroOmega 插件）：<https://github.com/avwo/whistle>
+ Whistle 官方文档 — 快速上手（Hosts / 请求替换 / 本地映射示例）：<https://wproxy.org/whistle/quickstart.html>
+ Whistle 官方文档 — 协议列表：<https://wproxy.org/whistle/rules/>
+ Whistle 官方文档 — operation 语法（`protocol://[value]`、内嵌值、模板字符串）：<https://wproxy.org/docs/rules/operation.html>
+ Whistle 官方文档 — FAQ（HTTPS 解密条件、IP 抓包）：<https://wproxy.org/docs/faq.html>
+ SwitchyOmega 3 (ZeroOmega) — Chrome 商店：<https://chromewebstore.google.com/detail/proxy-switchyomega-3-zero/pfnededegaaopdmhkdmcofjmoldfiped>
