# 前端部署

> 补充：[CI/CD](/notes/deploy/ci-cd) 关注"怎么自动跑构建"，本节聚焦"构建出来的静态文件怎么安全、高效地跑在生产环境"。

## 缓存策略

前端部署的核心矛盾：**用户需要尽快拿到更新，但缓存又让更新慢下来。**

### 文件名哈希（Content Hash）

通过文件名自带 content hash 实现"永久缓存 + 精准失效"：

```js
// Vite 生产配置
export default {
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[contenthash:8].js',
        chunkFileNames: 'assets/[name].[contenthash:8].js',
        assetFileNames: 'assets/[name].[contenthash:8].[ext]',
      },
    },
  },
};
```

**原理**：文件内容不变 → hash 不变 → 文件名不变 → 浏览器命中永久缓存。文件改了 → 文件名变了 → 浏览器认为是新资源。

```
旧部署：  /assets/index.a1b2c3d4.js
新部署：  /assets/index.e5f6g7h8.js  ← 文件名不同，浏览器重新下载
```

**注意**：CSS 的 `url()` 引用（图片、字体）也会被 Vite 自动添加 hash，不需要手动处理。

### HTML 不缓存

HTML 是最上层入口，**必须每次从服务器获取最新版本**：

```nginx
# Nginx — HTML 强制不缓存
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}
```

**不要**对 HTML 使用 contenthash 命名，HTML 的引用会自动注入 hash（Vite 在 `index.html` 中引用的 JS/CSS 文件名自动带 hash）。

### 静态资源长期缓存

JS、CSS、图片等二进制资源，内容不变就能一直用：

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    # 如果用了文件名哈希（hash 变了文件名就变了），可以用 immutable
}
```

**`immutable`** 表示"这个 URL 的内容永远不会变"，浏览器不会做条件请求（If-Modified-Since），直接命中缓存。前提是文件名带 hash。

### 版本号 fallback

如果团队不习惯 contenthash 命名，可以用全局版本号做简单方案：

```html
<!-- 每次部署改这个版本号 -->
<script src="/app.js?v=20260610"></script>
```

**缺点**：所有文件一起失效，无法做到"只更新改了的文件"。contenthash 是更细粒度的方案，推荐。

## Nginx 完整生产配置

```nginx
# /etc/nginx/conf.d/app.conf
upstream app_backend {
    server 127.0.0.1:3000;  # 后端 API
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    # --- 静态资源根目录 ---
    root /var/www/app/current/dist;
    index index.html;

    # --- HTTPS 重定向（生产环境）---
    # listen 443 ssl http2;
    # ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # --- 安全头 ---
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    # X-XSS-Protection 已被现代浏览器弃用，推荐用 CSP 替代
    # add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 可选：CSP（严格限制外部资源）
    # add_header Content-Security-Policy "default-src 'self'; script-src 'self' cdn.example.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: cdn.example.com;";

    # --- 前端路由（SPA fallback）---
    location / {
        try_files $uri $uri/ /index.html;
    }

    # --- API 代理 ---
    location /api/ {
        proxy_pass http://app_backend/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- 静态资源缓存 ---
    location ~* \.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~* \.(png|jpg|jpeg|gif|ico|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~* \.(woff2?|ttf|eot|otf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # --- HTML 不缓存 ---
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # --- Gzip 压缩 ---
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types
        text/plain text/css text/javascript
        application/javascript application/json
        application/xml application/xml+rss
        image/svg+xml;

    # --- 请求限流（防刷）---
    # limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    # location /api/ {
    #     limit_req zone=api burst=20 nodelay;
    #     ...
    # }

    # --- 健康检查 ---
    location /health {
        return 200 'ok';
        add_header Content-Type text/plain;
        access_log off;
    }

    # --- 日志 ---
    access_log /var/log/nginx/app_access.log;
    error_log /var/log/nginx/app_error.log warn;
}
```

## 部署模式

### 目录切换部署（推荐）

通过切换符号链接实现秒级部署和秒级回滚：

```
/var/www/app/
├── current/     → symlink → releases/v20260610_1530/
├── releases/
│   ├── v20260610_1530/
│   ├── v20260610_1400/
│   └── v20260610_1200/
```

**部署脚本**：

```bash
#!/bin/bash
set -e

APP_DIR="/var/www/app"
RELEASE_DIR="$APP_DIR/releases/v$(date +%Y%m%d_%H%M%S)"
OLD_RELEASE=""

# 1. 创建新版本目录
mkdir -p "$RELEASE_DIR"

# 2. 从 Git 拉取最新构建产物（或从 artifact 下载）
git clone --depth 1 --branch main https://github.com/user/repo.git "$RELEASE_DIR"
cd "$RELEASE_DIR"
npm ci --production
npm run build

# 3. 软切换
if [ -L "$APP_DIR/current" ]; then
    OLD_RELEASE=$(readlink "$APP_DIR/current")
fi
ln -sfn "$RELEASE_DIR" "$APP_DIR/current"

# 4. 重启 Nginx（reload 不需要重启）
nginx -s reload

# 5. 清理旧版本（保留最近 5 个）
cd "$APP_DIR"
ls -dt releases/*/ | tail -n +6 | xargs -r rm -rf

echo "✅ 部署完成: $RELEASE_DIR"
```

**回滚**：只需一行命令

```bash
ln -sfn /var/www/app/releases/v20260610_1400 /var/www/app/current
nginx -s reload
```

### 蓝绿部署

和上面的目录切换本质一样，命名上"蓝"是当前环境，"绿"是新环境，切换即完成。优势在于回滚是 **O(1)** 操作——切换 symlink + reload Nginx，毫秒级完成。

**不适合前端静态部署的场景**：需要两个完整运行环境的后端服务（如 Java/Go 进程切换），前端只需要静态文件 + Nginx，目录切换就够了。

### A/B 测试（前端部署层面）

通过 URL 参数或 Cookie 切换不同版本：

```nginx
# 按 Cookie 分发
map $cookie_ab_test $ab_version {
    default    "blue";
    "version2" "green";
}

server {
    root /var/www/app/versions/$ab_version/dist;
    ...
}
```

前端也可以 JS 层面控制：

```js
// 版本切换
const version = location.search.includes('v=2') ? '2' : '1';
// 加载不同版本的资源或显示不同 UI
```

## CDN 部署

### 架构

```
用户 → CDN（缓存静态资源） → 回源 → Nginx/构建产物
```

CDN 缓存层把请求挡在离用户最近的地方，静态资源命中率通常 90%+。

### 资源上 CDN

**HTML 留在源站**（控制不缓存），JS/CSS/图片走 CDN：

```nginx
# 源站 Nginx — 只 serving HTML + API
location / {
    try_files $uri $uri/ /index.html;
}

# 静态资源代理到 CDN 回源
# 如果用 Cloudflare，可以在 Cloudflare 面板配置 cache rules：
# Cache Rule: /assets/* → Cache Level: Cache Everything → TTL: 1 year
```

### CDN 缓存失效

文件名带 hash 的情况下，**改了文件名自然失效**。但偶尔需要主动清除：

```bash
# Cloudflare API 清除特定 URL
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/purge_cache" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://cdn.example.com/assets/index.e5f6g7h8.js"]}'
```

**Vercel/Netlify 等**自带 CDN 和部署即失效，不需要手动处理。

## 边缘部署

### Vercel

零配置，关联仓库即自动构建部署：

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://api.example.com/$1" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

**分支预览**：每个 PR 自动生成独立 URL，`myapp-git-feature-branch.vercel.app`。

### Cloudflare Pages

和 Vercel 类似，优势是边缘计算和 Pages Functions：

```js
// functions/_middleware.js
export async function onRequest(context) {
    const { next, request, data } = context;
    const response = await next();

    // 添加安全头
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');

    return response;
}
```

## 部署验证

### 冒烟测试（Smoke Test）

构建后、部署前自动验证：

```ts
// playwright tests/smoke.spec.ts
import { test, expect } from '@playwright/test';

test('首页可访问', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});

test('API 连接正常', async ({ page }) => {
  await page.goto('/');
  // 拦截 API 请求，确认响应正常
  const response = await page.waitForResponse(
    resp => resp.url().includes('/api/health')
  );
  expect(response.status()).toBe(200);
});

test('关键页面路由正常', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('main')).toBeVisible();
});
```

在 CI 中集成：

```yaml
# .github/workflows/deploy.yml (片段)
- name: Build
  run: npm run build

- name: Smoke Test
  run: |
    npx serve dist -l 3000 &
    sleep 3
    npx playwright test tests/smoke.spec.ts
```

### 部署后健康检查

部署完成后自动请求页面验证：

```bash
# 部署后验证
curl -sf http://localhost:80/ && echo "✅ 部署成功"
curl -sf http://localhost:80/health && echo "✅ 健康检查通过"
```

## 前端监控接入

部署的同时接入监控，形成闭环：

| 监控项 | 方案 | 部署时关注 |
|--------|------|-----------|
| 错误上报 | Sentry / 自建 | 新部署后错误率对比 |
| 性能监控 | Lighthouse CI / Web Vitals | First Contentful Paint、LCP |
| 可用性 | UptimeRobot / 自建心跳 | 部署后 5 分钟内无异常 |

**部署后自动 Lighthouse 对比**：

```yaml
# .github/workflows/lighthouse.yml
- name: Lighthouse CI
  run: |
    npx lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_TOKEN }}
```

## 常见坑

### 缓存导致部署后用户看不到更新

**症状**：部署了新版本，用户反馈还是旧的。

**根因**：HTML 缓存了、CDN 缓存了、或者 Service Worker 缓存了。

**排查**：
1. 检查 HTML 是否设置了 `Cache-Control: no-cache`
2. 检查 CDN 是否有旧的缓存
3. **Service Worker** 是最常见的隐藏元凶

```js
// Service Worker 更新策略
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    // 监听更新
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          // 通知用户刷新
          alert('新版本已就绪，请刷新页面');
          location.reload();
        }
      });
    });
  });
}
```

**关键**：SW 的注册文件 `sw.js` 也需要不缓存，否则 SW 不会重新注册。

### 部署后白屏

**常见原因**：
1. 构建路径不对（`base` 配置错误，Vite 默认 `/`，如果是子路径要改）
2. 资源 404（文件名变了但 HTML 没更新——HTML 被缓存了）
3. 路由模式问题（history 模式需要 `try_files`）

```js
// Vite base 配置
// 部署到 GitHub Pages 子路径时：
export default {
  base: '/repo-name/',  // 必须和仓库名一致
};
```

### 并发部署导致文件损坏

两个部署脚本同时运行，互相覆盖文件。解决方案：

```bash
# 部署前加锁
LOCKFILE="/var/www/app/.deploy.lock"
if [ -f "$LOCKFILE" ]; then
    echo "⚠️  已有部署在进行，跳过"
    exit 1
fi
touch "$LOCKFILE"
trap "rm -f $LOCKFILE" EXIT

# 部署逻辑...
```

或在 CI 层面用 `concurrency`：

```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true
```

### 大文件上传慢

**优化方向**：
1. 构建产物用 `gzip` / `brotli` 压缩后再上传
2. rsync 增量同步（只传变了的部分）
3. 用 object storage（S3/OSS）+ CDN，部署变成上传几个文件

```bash
# rsync 增量同步（只传变了的部分）
rsync -avz --delete --compress \
  dist/ user@server:/var/www/app/current/dist/
```

### sourcemap 泄露

**生产环境不要暴露 sourcemap**（除非开了 Sentry 的 public project）：

```js
// vite.config.js
export default {
  build: {
    sourcemap: false,  // 生产不生成 sourcemap
  },
};
```

如果需要 sourcemap 但不上线：

```js
build: {
  sourcemap: 'hidden',  // 只在 devtools 中映射，不输出 .map 文件
}
```

## 快速参考：部署方案选型

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| 个人项目 / 博客 | Vercel / GitHub Pages | 零配置，自动构建 |
| 企业前端应用 | Nginx + 目录切换部署 | 完全可控，秒级回滚 |
| 多地域用户 | CDN + 源站 | 全球加速，缓存命中率高 |
| 微前端 | 独立部署 + 配置中心 | 各子应用独立发版 |
| 需要边缘计算 | Cloudflare Pages / Vercel Edge | 边缘函数，低延迟 |
