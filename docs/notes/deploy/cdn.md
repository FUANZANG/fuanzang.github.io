# CDN（内容分发网络）

> 部署流程见 [前端部署](/notes/deploy/frontend-deployment)；缓存与回源的网络基础见 [网络协议](/notes/foundations/network-protocol)；源站用 Nginx 的见 [Nginx 生产配置](/notes/engineering/nginx)。

## 什么是 CDN

CDN（Content Delivery Network，内容分发网络）是一张**分布在全球的缓存节点网络**。它把你的静态资源（JS/CSS/图片/字体/音视频）复制到离用户最近的边缘节点上，用户请求时由最近的节点直接返回，而不是每次都跑到你的源服务器。

```text
没有 CDN：  用户（北京）→ 源站（上海）  延迟高、源站带宽压力大
有 CDN：    用户（北京）→ 北京边缘节点（命中缓存）→ 直接返回
                              └─ 未命中才回源 → 源站（上海）
```

**解决的核心问题**：

+ **延迟**：物理距离决定网络延迟，节点越近越快（RTT 从几百 ms 降到几十 ms）。
+ **源站压力**：90%+ 的静态请求被边缘节点挡掉，源站只处理回源和动态请求。
+ **带宽成本**：CDN 出流量通常比云服务器/对象存储直出便宜，且能扛突发。
+ **可用性**：节点多、有容灾，单点故障影响小；也天然具备一定的 DDoS / CC 缓解能力。

## 工作原理

```text
1. 用户访问 https://cdn.example.com/app.js
2. DNS 解析：CDN 的智能 DNS 把域名解析到「离用户最近的边缘节点」IP
3. 边缘节点查本地缓存：
     命中（Cache Hit）→ 直接返回（最快）
     未命中（Cache Miss）→ 回源（Origin Pull）向源站请求 → 缓存后返回
4. 下次同区域用户再请求，直接命中
```

几个关键角色：

+ **边缘节点 / 缓存节点**：分布各地的缓存服务器，真正给用户返数据的。
+ **源站（Origin）**：资源的真实出处，可以是云服务器（ECS）、对象存储（OSS/OBS）、或你自己的 Nginx。
+ **加速域名**：你绑定到 CDN 的域名（如 `cdn.example.com`），最终通过 CNAME 指向 CDN 的调度域名。
+ **回源**：边缘节点没有缓存时，去源站取数据的过程。

**缓存命中率**是衡量 CDN 效果的核心指标（命中率越高，源站越省）。文件名带内容哈希（`app.a1b2c3.js`）的资源天然适合长缓存、高命中。

## 什么时候需要 CDN

+ 静态资源多（JS/CSS/图片/字体/音视频）——最常见的场景。
+ 用户分布在多地/多国，单源站无法满足就近访问。
+ 大文件下载、点播/直播、安装包分发等带宽密集型业务。
+ 有突发流量（活动、秒杀），需要弹性扛量。

小流量个人项目如果已经用了 Vercel / Netlify / Cloudflare Pages，它们**自带全球 CDN**，无需单独接入——见 [前端部署](/notes/deploy/frontend-deployment) 的边缘部署章节。

## 前端怎么用 CDN

本质是「构建产物上传到源站 + 让 CDN 加速这个源站 + 资源 URL 指向 CDN 域名」。

### 1. 资源路径指向 CDN 域名

构建时把静态资源的 base 改成 CDN 域名，或部署后用脚本改写引用：

```js
// vite.config.js —— 静态资源走 CDN，HTML 仍走主站
export default {
  base: 'https://cdn.example.com/',   // 仅对 JS/CSS/图片等产物生效
  build: {
    assetsDir: 'assets',
  },
};
```

HTML 本身建议**留在源站、不缓存**（或 CDN 配置 HTML 不缓存规则），只有带哈希的 JS/CSS/图片走 CDN 长缓存。

### 2. 文件名哈希 + 长缓存（命中率关键）

```nginx
# 源站 / CDN 缓存规则：带哈希的资源缓存一年
location ~* \.(js|css|png|jpg|svg|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

文件名变了 → URL 变了 → 浏览器/CDN 认为是新资源，天然实现「精准失效」，不需要手动清缓存。详见 [前端部署 · 缓存策略](/notes/deploy/frontend-deployment)。

### 3. 源站类型

+ 对象存储（OSS/OBS）：最省心，上传即源，配合 CDN 一键加速。
+ 云服务器 + Nginx：自己控制，适合还要托管 API/SSR 的场景。
+ 专门的静态托管：Vercel / Netlify / Cloudflare Pages（自带 CDN）。

## 云厂商接入（阿里云 / 华为云）

两家思路完全一致：**准备域名 → 开通 CDN → 添加加速域名并选对象存储作源站 → DNS 配 CNAME → 配缓存/HTTPS**。产品名对照：

| 能力 | 阿里云 | 华为云 |
|------|--------|--------|
| 内容分发 | **CDN** | **CDN** |
| 对象存储（源站） | **对象存储 OSS** | **对象存储服务 OBS** |
| 存储域名示例 | `bucket.oss-cn-hangzhou.aliyuncs.com` | `bucket.obs.cn-north-4.myhuaweicloud.com` |

> 控制台的具体菜单路径会随版本调整，下面给的是**通用接入流程**；操作时以各家控制台当前界面为准。域名解析（CNAME）在你买域名的 DNS 服务商处配置（阿里云万网、DNSPod、Cloudflare 等）。

### 通用接入流程

```text
1. 准备加速域名：cdn.example.com（国内节点必须已完成 ICP 备案）
2. 开通 CDN 服务
3. 添加加速域名：
     - 加速域名填 cdn.example.com
     - 源站类型选「对象存储（OSS / OBS）」，填 bucket 或存储域名
     - 端口 80/443（HTTPS 需上传/托管证书）
4. 平台返回一条 CNAME（如 *.example.com.w.kunlun.com）
5. 去 DNS 服务商给 cdn.example.com 添加 CNAME 记录，指向该值
6. CNAME 生效后，流量即走 CDN
7. 配置缓存规则：/assets/* 长缓存；HTML/API 不缓存
8.（可选）开启 HTTPS、防盗链、跨域、URL 鉴权
```

### 阿里云：OSS + CDN

+ 对象存储 **OSS** 可直接作为 CDN 源站；在 OSS 或 CDN 控制台都能「一键 CDN 加速」某个 bucket。
+ OSS 的访问域名按 region 区分，例如华东 1（杭州）是 `oss-cn-hangzhou.aliyuncs.com`，bucket 域名为 `https://<bucket>.oss-cn-hangzhou.aliyuncs.com`。
+ 上传产物可用 OSS 控制台、CLI（`ossutil`）、或 SDK；前端直传需要**临时凭证（STS）**，不适合把 AccessKey 放前端。
+ 回源 HOST、缓存刷新、HTTPS 证书都在 CDN 控制台对应域名下配置。

```bash
# 上传构建产物到 OSS（需先配置 AK / 用 STS 临时凭证）
ossutil cp -r dist/ oss://your-bucket/assets/ --update
```

### 华为云：OBS + CDN

+ 对象存储服务 **OBS** 作为 CDN 源站；在 OBS 或 CDN 控制台可配置加速。
+ OBS Endpoint 按 region 区分，例如华北-北京四为 `obs.cn-north-4.myhuaweicloud.com`，桶访问域名 `https://<bucket>.obs.cn-north-4.myhuaweicloud.com`。
+ 上传可用 OBS 控制台、命令行工具（obsutil）、或 SDK；浏览器直传同样需要临时凭证。

```bash
# 上传构建产物到 OBS
obsutil cp dist/ obs://your-bucket/assets/ -r -f
```

> 两家「对象存储域名」只是回源地址，用户访问的是你绑定的 CDN 加速域名（`cdn.example.com`），不要直接把存储域名当生产域名暴露出去（难管控、贵、且不便切换）。

## 缓存刷新与预热

资源带哈希时一般**不需要手动刷新**（文件名变了就是新 URL）。但以下情况需要主动操作：

+ 改了未带哈希的资源（如 `favicon.ico`、`robots.txt`、`sw.js`）。
+ 紧急修复了线上静态资源、且没改文件名。
+ **预热（Prefetch）**：新版本发布前把资源推到边缘节点，避免首批用户回源慢。

各平台都提供控制台「刷新/预热」入口和 OpenAPI，例如阿里云 CDN 的 `RefreshObjectCaches` / `PushObjectCache` 接口。

## 计费模型

CDN 不是「包月无限量」，而是按**实际消耗**计费。理解计费维度才能避免账单意外、并做成本优化。

### 主要计费项

+ **按流量（GB）**：最主流的计费方式，按当月从 CDN 流出的总流量（回源流量通常单独算，且更便宜）阶梯计价。适合流量平稳、可预估的业务。
+ **按带宽峰值**：按带宽用量（Mbps）计费，常见口径有「日峰值」「月 95 峰值」（去掉最高的 5% 采样点再取最大值，平滑突发）。**适合有突发大流量**（如活动、直播）的场景，峰值法能显著压低单价。
+ **按请求数**：部分厂商对 HTTPS 请求数单独计费（HTTP/HTTPS 单价不同，HTTPS 更贵）。高并发小文件（如图标、字体）要注意这项。
+ **增值服务**：HTTPS 证书（自有证书免费，平台证书/专属证书可能收费）、QUIC/HTTP3、WAF、防刷、刷新/预热额度（超出免费次数后按条计费）等通常另行计费。

> 具体单价随地域、套餐、活动变动，**不要记忆数字**，以各家定价页为准：阿里云 [CDN 价格](https://www.aliyun.com/price/detail) / 华为云 [CDN 价格](https://www.huaweicloud.com/pricing.html)。

### 选型与省钱要点

+ **流量平稳选流量计费，突发多选带宽峰值（或混合）**：看业务曲线，不是越便宜越好。
+ **提高缓存命中率是省钱核心**：命中率越高，回源和 CDN 出流量都越少（详见上文缓存策略）。
+ **冷热分层**：极少访问的冷资源别上 CDN 长缓存，回源成本可能高于直出。
+ **监控用量**：设用量告警，防止被刷流量（见下文防盗链/鉴权）。

## 边缘函数（Edge Functions）

传统 CDN 只做「缓存命中→返回，未命中→回源」。边缘函数让 CDN 不止能缓存，还能**在边缘节点上运行代码**，在请求/响应经过时动态处理。

```text
普通 CDN：  请求 → 命中缓存? 返回 : 回源
边缘函数：   请求 → 边缘节点运行 JS/WASM → 改写/鉴权/拼接 → 返回（可命中缓存，也可动态生成）
```

### 它解决什么

+ **不用回源就能做动态逻辑**：A/B 测试分流、按地域/设备返回不同内容、请求鉴权、注入响应头（CORS / 安全头）。
+ **低延迟**：代码跑在离用户最近的节点，没有回源 RTT。
+ **自动弹性**：无需管理服务器，按请求量伸缩。

### 典型用途

+ 请求重写 / 重定向（边缘 301/302、改写 URL）
+ 鉴权与限流（校验 token、按规则拦截）
+ 个性化与实验（A/B、特性开关）
+ 修改响应头（加 CSP、CORS、缓存头）
+ Bot 防护、WAF 规则前置

### 厂商对照

| 厂商 | 边缘计算产品 |
|------|-------------|
| 阿里云 | **边缘函数 EdgeRoutine（ER）**、EdgeScript（规则脚本） |
| Cloudflare | **Workers** |
| Vercel / Netlify | **Edge Functions** |
| AWS | **Lambda@Edge**、CloudFront Functions |
| Fastly | **Compute@Edge** |
| 华为云 | 函数工作流 **FunctionGraph** 可配合 CDN 实现边缘逻辑（以官方文档为准） |

### 局限（什么时候不该用）

+ **运行时受限**：通常只支持 JS / WASM，不能跑完整 Node、不能访问本地文件系统、不能长连接。
+ **无状态、短超时**：不能依赖本地内存状态，执行时间有上限（毫秒到秒级），不适合重计算或长任务。
+ **冷启动**：低频调用可能有冷启动延迟（各家优化不同）。
+ 重业务逻辑、需要数据库/长耗时的，仍应放到源站或云函数，不要塞进边缘函数。

### 概念示例

各家 API 不同，下面是接近 Cloudflare Workers / 阿里云 ER 风格的**概念代码**（真实签名以各家文档为准）：

```js
// 边缘函数：为每个响应注入安全头 + 按 Cookie 做 A/B 分流
export default {
  async fetch(request) {
    // 命中缓存或未命中都经过这里，可在回源前改写请求
    const url = new URL(request.url);
    const ab = request.headers.get('cookie')?.includes('ab=B');

    // 动态改写回源地址（例如分流到不同源）
    if (ab) url.hostname = 'origin-b.example.com';

    const response = await fetch(url, request);
    // 在响应阶段注入头
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('Content-Security-Policy', "default-src 'self'");
    return response;
  },
};
```

> 边缘函数与 [SSR/SSG](/notes/engineering/ssr-ssg) 的边界：SSR 在源站（或云函数）生成 HTML，边缘函数更适合「轻量、靠近用户、不改主流程」的拦截/改写。两者可叠加——边缘函数做鉴权与头改写，源站做页面渲染。

## 对象存储直传（STS 临时凭证）

前面「云厂商接入」讲的是**读**——CDN 把静态资源投递给用户。这里讲**写**：前端直接把文件（头像、视频、附件）传到 OSS/OBS，而不是先传你的服务器再转发。好处是省服务器带宽、省中转、上传快。

**核心约束**：对象存储的 AccessKey 绝不能进前端。所以要在「前端直传」和「凭证不下发」之间取平衡——用 **STS 临时凭证**（有时效、有权限边界）给前端临时上传权限。

```text
1. 前端：我要上传 avatars/me.png
2. 后端：调用云厂商 STS 服务（AssumeRole）→ 换一组临时凭证
        { accessKeyId, accessKeySecret, securityToken, expiration }
3. 后端：把临时凭证回给前端（不含任何永久密钥）
4. 前端：用临时凭证初始化 SDK，直接 PUT/POST 到 OSS/OBS
5. 凭证过期自动失效（通常 15min ~ 1h）
```

### 两种主流直传方式

+ **STS 临时凭证**：前端拿临时 AK + token 用 SDK 直传。灵活，支持进度、断点续传；凭证短时效、最小权限。
+ **服务端签名直传（PostObject）**：后端只签一个上传策略（`policy` + `signature`），前端拿签名用表单 POST 直传。**前端无需 SDK、不下发任何密钥**，适合简单表单上传。

安全要点：

+ **永久 AccessKey 绝不能进前端/客户端**（会被扒，后果是整桶数据泄露）。
+ STS 凭证要**短时效 + 最小权限**（只给该 bucket 的 `PutObject`，最好限制到具体前缀，如 `avatars/*`）。
+ 在 `policy` 里约束**文件大小、类型、key 前缀**，防止被拿去传大文件或任意路径。
+ 全程 **HTTPS**，临时凭证和文件都走加密通道。

```js
// 前端：拿后端换来的 STS 临时凭证，初始化客户端并直传（概念示例）
const res = await fetch('/api/sts?key=avatars/me.png');
const { accessKeyId, accessKeySecret, stsToken } = await res.json();

const client = new OSS({
  region: 'oss-cn-hangzhou',
  bucket: 'my-bucket',
  accessKeyId,
  accessKeySecret,
  stsToken,
  secure: true,            // 强制 HTTPS
});

await client.put('avatars/me.png', file);  // 直传对象存储，不经过自己的服务器
```

> 阿里云走 **RAM + STS `AssumeRole`** 获取临时凭证；华为云走**统一身份认证服务的临时访问凭证**。两家 SDK 的方法名、参数、endpoint 不同，**以官方文档为准**，上例仅示意流程。临时凭证过期后需重新向后端换取。

## 多 CDN / 容灾

单家 CDN 也有故障面（厂商故障、区域抖动、突发账单）。多 CDN 主要为了**可用性**，顺带可做成本优化与就近择优。

```text
普通：  用户 → 单家 CDN → 源站
多 CDN： 用户 → 智能调度 → 厂商 A / 厂商 B / 厂商 C → 同一源站
                       ↑ 某家故障则切到健康厂商
```

### 常见架构

+ **智能 DNS / 地理调度**：DNS 层按地域、延迟、健康度把不同用户解析到不同 CDN 厂商。
+ **主备切换**：主 CDN 故障时切 CNAME 到备（手动，或自动健康检查 + API 改解析）。
+ **Anycast（任意播）**：单 IP 由多厂商共同广播，路由层就近到达（更高级、门槛高）。
+ **客户端多源**：前端 SDK 内置多个 CDN 域名，按可用性/延迟自选（如视频播放器多源切换）。

### 要点

+ **源站是单一事实源**：各 CDN 都回源到同一个 OSS/OBS 或源站，内容一致。
+ **命中率被摊薄**：流量分散到多家，单家命中率下降，要权衡成本（多 CDN 通常更贵）。
+ **配置要同步**：证书、缓存规则、HTTPS、防盗链需在每家分别配置。
+ **切换有延迟**：DNS 切换受 TTL 影响，自动 failover 要配合低 TTL 或 **HTTPDNS**（客户端绕过本地 DNS 直接拿最优 IP）。

## CDN + 图片处理（OSS 图片缩放 / WebP）

存原图、按需实时出缩略图，是对象存储最常见的玩法：**只传一份原图，访问时按参数实时生成不同尺寸/格式**，配合 CDN 边缘缓存，既省存储又省流量。

```text
原图：  https://cdn.example.com/photo.jpg
缩略图：https://cdn.example.com/photo.jpg?<图片处理参数>   ← 边缘节点/存储实时处理 + 缓存
```

### 核心思路

+ **原图一份，派生多份**：不预先生成所有尺寸，访问时按 `?w=200`、`?format=webp` 实时处理。
+ **处理结果可被 CDN 缓存**：同一参数组合第一次回源处理，之后命中边缘缓存，几乎零成本。
+ **客户端按设备要图**：移动端拿小图/WebP，桌面端拿大图，省下的流量可观。
+ **格式自适应**：现代浏览器支持 WebP/AVIF，体积比 JPEG/PNG 小很多（正文见 [前端性能优化 · 图片](/notes/performance/performance-optimization)）。

### 概念示例（参数语法以各厂商官方文档为准）

```text
# 阿里云 OSS 图片处理（示意，非完整参数）：
# https://bucket.oss-cn-hangzhou.aliyuncs.com/photo.jpg?x-oss-process=image/resize,w_400/format,webp

# 华为云 OBS 图片处理（示意）：
# https://bucket.obs.cn-north-4.myhuaweicloud.com/photo.jpg?x-image-process=image/resize,w_400
```

> 各家的**参数名和拼接规则不同**（resize / format / quality 的写法、是否需要先建「样式」或「缩略图规则」），且通常要开启对应功能。**不记忆具体语法，以官方文档为准**。

### 前端接法

```html
<!-- 按设备像素给不同尺寸，srcset 自动选 -->
<img
  src="https://cdn.example.com/photo.jpg?w=400"
  srcset="https://cdn.example.com/photo.jpg?w=400 1x,
          https://cdn.example.com/photo.jpg?w=800 2x"
  alt="示例图片"
/>
```

要点：

+ **处理参数要进缓存 key**：CDN 按完整 URL（含 query）区分缓存，所以 `?w=400` 和 `?w=800` 是两份独立缓存，互不影响——这正是我们想要的效果。
+ **防盗与成本**：图片处理本身可能计费（按处理次数或流量计），注意异常参数刷量。
+ **原图保护**：建议把原图放在私有/受限前缀，对外只暴露带处理参数的访问 URL。

## 视频点播 CDN

视频和静态文件不同：单文件大、要**边下边播**、要按网络自适应清晰度。所以视频走的是专门的**点播（VOD）+ 视频 CDN** 体系，不是普通静态 CDN 直接扛。

```text
上传原视频 → 转码（多清晰度 HLS/DASH）→ 切片 → 视频 CDN 分发 → 播放器边下边播
```

### 为什么单独一套

+ **自适应码率（ABR）**：同一视频转成 360p/720p/1080p 多档，播放器按网速动态切换，卡顿少。常见封装是 **HLS（.m3u8）** 或 **DASH**。
+ **切片分发**：视频切成几百个小 .ts 分片，CDN 按分片缓存和分发，支持拖动 seek、断点续传。
+ **防盗链/鉴权更重**：视频价值高，普遍用 **URL 鉴权（带时效 token）** + Referer 防盗链，防止被整站盗播。
+ **边缘转码/处理**：部分厂商支持边缘转码、截图、水印，减少源站压力。

### 厂商对照

| 能力 | 阿里云 | 华为云 |
|------|--------|--------|
| 视频点播 | **视频点播 VOD** | **视频点播 VOD** |
| 直播 | **视频直播 Live** | **视频直播 Live** |
| 媒体处理 | **媒体处理 MPS** | **媒体处理 MPC** |

> 视频点播是独立产品（含上传、转码、媒资管理、播放器 SDK），CDN 只是它的分发底座。前端用一个播放器 SDK（如阿里云播放器、Video.js + hls.js）拿到播放地址即可。

### 前端接法

```html
<!-- 概念示意：播放器加载一个 HLS 地址（带时效鉴权） -->
<video id="player" controls></video>
<script>
  // 真实播放器 SDK 初始化方式各异，这里只示意「拿到地址 → 播放」
  const playUrl = 'https://vod-cdn.example.com/sv/abc/play.m3u8?auth_key=xxx';
  // 例：Video.js + hls.js（HLS 在非 Safari 浏览器需 hls.js 支持）
  player.src({ src: playUrl, type: 'application/x-mpegURL' });
</script>
```

要点：

+ **首屏优化**：m3u8 先下，播放器再按需下载前几个分片，首帧快；可配「首片更小」降低起播延迟。
+ **CDN 预热首片**：热门视频发布前预热前几个分片，避免首批用户起播慢。
+ **鉴权地址会过期**：播放地址常带 `auth_key` 时效参数，过期需向业务后端重新换取（播放中途过期要能刷新）。

## 常见坑

+ **国内 CDN 必须备案**：加速域名未完成 ICP 备案，国内节点无法生效（海外节点除外）。
+ **更新不生效**：多半是缓存没失效。确认资源是否带哈希；未带哈希的要先刷新 CDN + 清浏览器缓存。HTML 被缓存是白屏/旧版最常见元凶。
+ **回源带宽费用**：CDN 省钱的前提是命中率高；命中率低反而可能比直出更贵。大文件、低频资源要评估。
+ **跨域（CORS）**：CDN 节点会透传源站的 CORS 头，但回源配置不当可能丢掉；字体、API 跨域要同时确认源站和 CDN 规则。
+ **防盗链 / 鉴权**：对象存储默认可能公开，建议在 CDN 层配 Referer 防盗链或 URL 鉴权，避免被人盗刷流量。
+ **HTTPS**：CDN 域名要单独配证书（可用平台免费证书或上传自有证书），否则混合内容（mixed content）会被浏览器拦截。

## 参考

+ [阿里云 CDN 文档](https://help.aliyun.com/zh/cdn/)
+ [阿里云对象存储 OSS 文档](https://help.aliyun.com/zh/oss/)
+ [华为云 CDN 文档](https://support.huaweicloud.com/cdn/)
+ [华为云对象存储服务 OBS 文档](https://support.huaweicloud.com/obs/)
