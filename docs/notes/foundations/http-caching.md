# HTTP 缓存实战

> 协议层缓存语义以 [MDN: HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) 与 [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control) 为准。网络基础见 [网络协议](/notes/foundations/network-protocol)；边缘节点与回源见 [CDN](/notes/ops/cdn)；构建侧带 hash 的静态资源见 [Vite 性能优化](/notes/engineering/vite-optimization)。

## 1. 两层问题：新鲜度 vs 校验

缓存要回答两件事：

1. **还能不能直接用？**（freshness：在新鲜期内可直接复用，不必问源站）
2. **过期了，内容有没有变？**（validation：带条件请求，源站可回 `304 Not Modified`）

```
请求资源
  ├─ 缓存新鲜 → 直接用本地副本（0 往返或仅读本地）
  └─ 已过期 / 要求每次校验
       └─ 条件请求（If-None-Match / If-Modified-Since）
            ├─ 未变 → 304，刷新新鲜度，继续用本地正文
            └─ 已变 → 200 + 新正文 + 新校验器
```

## 2. Cache-Control：最常用的指令

响应里常见组合（含义按 MDN）：

| 指令 | 含义（务必分清） |
|------|------------------|
| `max-age=N` | 自**响应生成**起 N 秒内视为新鲜（共享缓存还要看 `Age`） |
| `s-maxage=N` | 只约束**共享缓存**（代理/CDN），优先于 `max-age` |
| `no-cache` | **可以存**，但每次复用前必须向源站**再验证** |
| `no-store` | **不要存**（敏感页、一次性令牌页） |
| `private` | 只允许浏览器私有缓存，不要进共享 CDN |
| `public` | 可被共享缓存存储（即使带 `Authorization` 等通常不可缓存的情况，也需谨慎理解规范） |
| `immutable` | 新鲜期内内容不会变（适合带内容哈希的静态文件） |
| `must-revalidate` | 过期后不得在未验证时继续当新鲜用 |
| `stale-while-revalidate=N` | 过期后可先返回陈旧副本，同时后台再验证 |

**易错点**：`no-cache` ≠「禁止缓存」。禁止存储用 `no-store`。

```http
# 带 hash 的打包产物：浏览器与 CDN 可长缓存
Cache-Control: public, max-age=31536000, immutable

# HTML 入口：短缓存或每次校验，避免用户长期卡在旧壳
Cache-Control: no-cache

# 登录后的个人信息：不要进 CDN
Cache-Control: private, no-store
```

## 3. 校验器：ETag 与 Last-Modified

按 [MDN: ETag](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag) / 条件请求指南：

- **ETag**：资源某一版本的不透明标识；变化则必须换新值。
- **弱 ETag**（`W/"…"`）：语义等价即可；强 ETag：字节级一致，更适合 Range。
- 客户端过期后带 `If-None-Match: "<etag>"`；未变则 `304`。
- 也可配合 `Last-Modified` / `If-Modified-Since`。若两者同时出现，**校验时 `If-None-Match` 优先**（RFC 9110 精神，MDN 亦如此说明）。
- 规范建议：`200` 响应尽量同时带 `ETag` 与 `Last-Modified`。

```http
HTTP/1.1 200 OK
ETag: "33a64df5"
Cache-Control: max-age=3600
Last-Modified: Tue, 15 Nov 1994 12:45:26 GMT
```

```http
GET /app.js HTTP/1.1
If-None-Match: "33a64df5"
```

```http
HTTP/1.1 304 Not Modified
ETag: "33a64df5"
Cache-Control: max-age=3600
```

## 4. 前端工程常见策略

| 资源 | 建议 |
|------|------|
| `app.[hash].js` / CSS / 字体 | 长 `max-age` + `immutable`；文件名变即新 URL |
| `index.html` / 不含 hash 的壳 | `no-cache` 或极短 `max-age`，保证能拉到新入口 |
| API JSON | 默认 `private` / `no-store`；只读公开列表可短缓存 + ETag |
| 用户头像等可变资源 | 短 `max-age` 或 URL 带版本查询参数 |

与 CDN 的配合：边缘节点尊重源站 `Cache-Control`/`s-maxage`；**改内容却 URL 不变**时，需要主动**刷新/预热/改文件名**，详见 [CDN](/notes/ops/cdn)。

## 5. 浏览器与 Service Worker

- 普通 HTTP 缓存：由浏览器按响应头自动管理。
- **Service Worker**（见 [PWA](/notes/foundations/pwa)）是另一套可编程缓存：可与 HTTP 缓存叠加，也更容易写出错乱（缓存了不该缓存的 HTML）。策略要显式：`NetworkFirst` / `CacheFirst` / `StaleWhileRevalidate` 等。

## 6. 排查清单

1. DevTools → Network：看 **Size** 是 `(disk cache)` / `(memory cache)` 还是真实下载。  
2. 看响应头：`Cache-Control`、`Age`、`ETag`、`CF-Cache-Status`（若走 Cloudflare）等。  
3. 硬刷新（忽略缓存）与普通刷新对比，确认是入口 HTML 还是静态资源问题。  
4. 注意中间代理、公司网关可能改写缓存头。

## 参考

- [MDN: HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
- [MDN: Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
- [MDN: ETag](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag)
- [MDN: Conditional requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests)
