# SEO 与 SSR 衔接

> 搜索侧以 [Google Search Central](https://developers.google.com/search/docs) 为准（title、snippet、canonical、robots）。渲染模式见 [SSR / SSG](/notes/engineering/ssr-ssg)；元信息与 i18n 可对照 [前端国际化](/notes/foundations/frontend-i18n)。本篇只谈「可被抓取与展示」的工程要点，不做黑帽。

## 1. 爬虫看到什么

| 模式 | 首次响应 HTML | 对 SEO |
|------|---------------|--------|
| **CSR 空壳** | 几乎无正文 | 差：依赖爬虫执行 JS，不可靠且慢 |
| **SSR** | 服务端带正文 | 好：首字节即有内容 |
| **SSG / ISR** | 构建或按需生成的完整 HTML | 好：且易 CDN 缓存 |

Google 能执行部分 JS，但**工程上仍应保证关键内容在初始 HTML 或明确可抓取**。营销页、文档、商品详情优先 SSR/SSG；后台控制台可 CSR。

## 2. Title 与 meta description

按 [Influencing title links](https://developers.google.com/search/docs/appearance/title-link) / [Meta descriptions](https://developers.google.com/search/docs/appearance/snippet)：

```html
<title>清晰、具体、每页不同的标题</title>
<meta name="description" content="概括本页独特卖点的短摘要" />
```

实务：

- 每页**独特** title / description；避免整站同一句「便宜好货」。  
- title 简洁；过长会在结果里被截断。  
- 避免关键字堆砌。  
- description **不保证**当摘要用——Google 也可能从正文抽；但仍值得写好。  
- title 链接可能来自 `<title>`、可见主标题、`og:title` 等，主标题视觉权重要清晰。

框架里（Nuxt/Next）用官方 `useHead` / `metadata` API 按路由填，避免客户端事后才改 title 却让首屏 HTML 仍是默认值。

## 3. Canonical：指定代表性 URL

重复内容（带参列表、HTTP/HTTPS、尾斜杠）时，用 canonical 表达偏好。见 [Consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)：

```html
<link rel="canonical" href="https://example.com/docs/seo" />
```

要点（Google 文档）：

- `rel=canonical` 是**强信号**，不是绝对命令。  
- 规范页建议带**指向自己的** canonical。  
- 站内链接尽量链到规范 URL。  
- **不要**用 robots.txt 做规范化；disallow 仍可能被索引成「无正文」页。  
- CSR 时：canonical 最好在**初始 HTML**里就有；避免仅靠 JS 事后注入造成信号不清。

## 4. robots：索引与否

[Robots meta](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)：

```html
<meta name="robots" content="noindex" />
```

- `noindex`：不要进结果（登录页、筛选结果页常用）。  
- robots.txt 挡的是**抓取**，不保证「永不索引」。要排除结果用 `noindex`。  

## 5. 和 SSR/SSG 落地清单

1. 选渲染模式：公开内容 → SSR/SSG；再谈微调。  
2. 每条公开路由：唯一 title、description、self-canonical。  
3. `sitemap.xml` 列规范 URL（弱信号，但仍有用）。  
4. 结构化数据（JSON-LD）按需加；与 robots 限制关系见 Google 文档。  
5. 用 Search Console「网址检查」看 Google 拿到的 HTML，而不是只看浏览器水合后 DOM。  
6. 性能（LCP 等）影响体验与间接排名信号——见 [Web Vitals](/notes/performance/web-vitals)。

## 参考

- [Google: Title links](https://developers.google.com/search/docs/appearance/title-link)
- [Google: Meta descriptions](https://developers.google.com/search/docs/appearance/snippet)
- [Google: Canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google: Robots meta tags](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
