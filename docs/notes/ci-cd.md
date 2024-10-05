# CI/CD

## 基本概念

+ **CI（持续集成）**：代码提交后自动触发 lint、test、build，尽早发现问题
+ **CD（持续交付/部署）**：构建通过后自动部署到目标环境
+ **核心流程**：代码提交 → lint/test → build → 部署 → 通知

```
开发者 push → 触发 Pipeline → Lint → Test → Build → Deploy → 通知
                                  ↓ 失败则中断并通知
```

## GitHub Actions

### 基本结构

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: 拉取代码
        uses: actions/checkout@v4

      - name: 安装 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: 安装依赖
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm run test

      - name: Build
        run: npm run build
```

### 常用 actions

| Action | 用途 |
|--------|------|
| `actions/checkout@v4` | 拉取代码 |
| `actions/setup-node@v4` | 安装 Node.js + 缓存 |
| `actions/cache@v4` | 自定义缓存（node_modules 等） |
| `actions/upload-artifact@v4` | 上传构建产物 |
| `actions/download-artifact@v4` | 下载构建产物 |
| `peaceiris/actions-gh-pages@v4` | 部署到 GitHub Pages |

### 缓存 node_modules

```yaml
- name: 缓存 node_modules
  uses: actions/cache@v4
  id: cache-deps
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: 安装依赖
  if: steps.cache-deps.outputs.cache-hit != 'true'
  run: npm ci
```

+ 用 `npm ci` 而不是 `npm install`，保证 lock 文件一致性

## 部署方案

### GitHub Pages

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: build # 等 build job 完成后

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - name: 部署到 GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Docker + Nginx

```dockerfile
# Dockerfile — 多阶段构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```nginx
# nginx.conf — SPA 路由支持
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # gzip
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;
}
```

### 部署到服务器（SSH）

```yaml
- name: 部署到服务器
  uses: appleboy/ssh-action@v1
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    script: |
      cd /var/www/app
      docker compose pull
      docker compose up -d
```

### Vercel / Netlify

+ 关联 GitHub 仓库即可自动部署，零配置
+ 适合个人项目和快速原型

```yaml
# 也可以手动用 GitHub Actions 部署到 Vercel
- name: Deploy to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
    vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
    vercel-args: '--prod'
```

## 多环境部署

### 分支策略

| 分支 | 环境 | 触发方式 |
|------|------|---------|
| `main` | 生产环境 | 合并 PR |
| `develop` | 测试环境 | 推送 / 合并 PR |
| `feature/*` | 预览环境 | PR 自动创建 |

### 环境变量管理

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}

    steps:
      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_APP_ENV: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
```

+ **敏感信息**：放在仓库 Settings → Secrets 中，不要硬编码到 YAML 里
+ **非敏感配置**：可以直接写在 YAML 的 `env` 字段

## 常见 Pipeline 模板

### 前端项目完整流程

```yaml
name: Frontend CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # 阶段 1：代码质量
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  # 阶段 2：测试
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --coverage

  # 阶段 3：构建
  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist

  # 阶段 4：部署（仅 main 分支）
  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist
      # 部署步骤...
```

### PR 自动预览

```yaml
name: PR Preview

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      # 上传到临时存储或部署到预览环境
      - uses: actions/upload-artifact@v4
        with:
          name: pr-${{ github.event.pull_request.number }}
          path: dist
```

## 踩坑经验

### npm ci vs npm install

+ CI 中用 `npm ci`，严格按 lock 文件安装，保证环境一致性
+ `npm install` 可能更新依赖版本，导致「本地好好的 CI 挂了」

### Node.js 版本不一致

+ 本地和 CI 的 Node 版本要一致，用 `.nvmrc` 或 `package.json` 的 `engines` 字段锁定：

  ```json
  {
    "engines": {
      "node": ">=20.0.0"
    }
  }
  ```

### 构建产物体积大导致上传慢

+ 只上传必要的文件（dist/），排除 sourcemap（生产不需要）
+ 使用 artifact 的 retention 策略：`retention-days: 7`

### 并发部署冲突

+ 用 `concurrency` 控制同环境只能有一个部署在跑：

  ```yaml
  concurrency:
    group: deploy-${{ github.ref }}
    cancel-in-progress: true # 新的部署取消旧的
  ```

### Secrets 泄漏

+ 不要在日志中打印 secrets
+ 使用 `::add-mask::` 隐藏敏感输出：

  ```yaml
  - run: echo "::add-mask::$MY_SECRET"
  ```
