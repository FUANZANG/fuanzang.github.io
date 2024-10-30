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

## GitLab CI/CD

+ 配置写在项目根目录的 `.gitlab-ci.yml`，推送到 GitLab 自动执行
+ 核心概念：Pipeline → Stage → Job

### 基本结构

```yaml
# .gitlab-ci.yml
stages:
  - lint
  - test
  - build
  - deploy

variables:
  NODE_VERSION: '20'

# 缓存 node_modules
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/

# 通用安装步骤（被后续 job 复用）
.setup: &setup
  before_script:
    - npm ci --cache .npm --prefer-offline

# Lint
lint:
  stage: lint
  image: node:20-alpine
  <<: *setup
  script:
    - npm run lint

# Test
test:
  stage: test
  image: node:20-alpine
  <<: *setup
  script:
    - npm run test -- --coverage
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'  # 提取覆盖率

# Build
build:
  stage: build
  image: node:20-alpine
  <<: *setup
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 7 days

# 部署（仅 main 分支）
deploy:
  stage: deploy
  image: alpine:latest
  dependencies:
    - build
  script:
    - apk add --no-cache rsync openssh
    - rsync -avz --delete dist/ user@server:/var/www/app/
  only:
    - main
  environment:
    name: production
    url: https://example.com
```

### 常用关键字

| 关键字 | 用途 |
|--------|------|
| `stages` | 定义阶段顺序 |
| `image` | 指定 Docker 镜像 |
| `script` | 执行命令 |
| `artifacts` | 传递构建产物 |
| `cache` | 缓存文件（跨 Pipeline） |
| `only` / `except` | 分支/标签过滤 |
| `rules` | 更灵活的条件控制（替代 only/except） |
| `environment` | 部署环境 |
| `needs` | Job 依赖（DAG 模式，不等待同 stage） |
| `retry` | 失败自动重试 |
| `timeout` | 超时时间 |

### rules 条件控制

```yaml
deploy-staging:
  stage: deploy
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"
      when: always
    - if: $CI_MERGE_REQUEST_ID
      when: manual  # MR 中手动触发
    - when: never

deploy-production:
  stage: deploy
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual  # 生产环境手动触发
```

### 变量管理

```yaml
variables:
  # 非敏感变量直接写
  VITE_APP_TITLE: 'My App'

deploy:
  script:
    # 敏感变量在 GitLab Settings → CI/CD → Variables 中配置
    - echo $DEPLOY_TOKEN  # 自动注入，不会打印到日志
    - npm run build
      -- --mode $CI_ENVIRONMENT_NAME
```

+ **Protected Variables**：仅在 protected 分支/tag 可用
+ **Masked Variables**：日志中自动隐藏值

### Docker 构建 & 推送

```yaml
docker-build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    # 打 latest 标签（仅 main 分支）
    - |
      if [ "$CI_COMMIT_BRANCH" = "main" ]; then
        docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
        docker push $CI_REGISTRY_IMAGE:latest
      fi
```

## Jenkins

+ 配置通过 `Jenkinsfile`（Pipeline as Code）或 Web UI 管理
+ 核心概念：Pipeline → Stage → Step

### Jenkinsfile（声明式语法）

```groovy
pipeline {
    agent any

    environment {
        NODE_HOME = tool 'NodeJS-20'
        PATH      = "${NODE_HOME}/bin:${env.PATH}"
    }

    options {
        timeout(time: 15, unit: 'MINUTES')
        timestamps()
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test -- --coverage'
            }
            post {
                always {
                    // 收集测试报告
                    junit 'test-results/*.xml'
                }
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'deploy-key',
                    keyFileVariable: 'SSH_KEY'
                )]) {
                    sh '''
                        rsync -avz --delete \
                          -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
                          dist/ user@server:/var/www/app/
                    '''
                }
            }
        }
    }

    post {
        success {
            // 部署成功通知
            echo '✅ 部署成功'
        }
        failure {
            echo '❌ 构建失败'
        }
        always {
            // 清理工作空间
            cleanWs()
        }
    }
}
```

### Jenkinsfile（脚本式语法）

```groovy
node {
    def nodeHome = tool 'NodeJS-20'
    env.PATH = "${nodeHome}/bin:${env.PATH}"

    stage('Checkout') {
        checkout scm
    }

    stage('Install') {
        sh 'npm ci'
    }

    // 并行执行
    stage('Quality') {
        parallel(
            'Lint': { sh 'npm run lint' },
            'Test': { sh 'npm run test' }
        )
    }

    stage('Build') {
        sh 'npm run build'
        archiveArtifacts artifacts: 'dist/**', fingerprint: true
    }

    stage('Deploy') {
        if (env.BRANCH_NAME == 'main') {
            input message: '确认部署到生产环境？', ok: '部署'
            sh 'rsync -avz dist/ user@server:/var/www/app/'
        }
    }
}
```

## 三者对比

| | Jenkins | GitLab CI | GitHub Actions |
|---|---------|-----------|---------------|
| **配置方式** | Jenkinsfile (Groovy) | .gitlab-ci.yml | YAML |
| **运行环境** | 自建服务器 | 自建/GitLab.com | GitHub 托管 |
| **学习曲线** | 高（Groovy 语法） | 中 | 低 |
| **插件生态** | 非常丰富（1500+） | 内置为主 | Marketplace |
| **Docker 支持** | 需要配置 | 原生支持 | 原生支持 |
| **维护成本** | 高（服务器、插件更新） | 中 | 低（SaaS） |
| **适用场景** | 复杂流程、老项目 | 企业自建 GitLab | 开源/GitHub 项目 |

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

+ GitHub Actions 用 `concurrency` 控制同环境只能有一个部署在跑：

  ```yaml
  concurrency:
    group: deploy-${{ github.ref }}
    cancel-in-progress: true # 新的部署取消旧的
  ```

+ Jenkins 用 `disableConcurrentBuilds()` 避免同分支并发部署冲突

### Secrets 泄漏

+ 不要在日志中打印 secrets
+ GitHub Actions 使用 `::add-mask::` 隐藏敏感输出：

  ```yaml
  - run: echo "::add-mask::$MY_SECRET"
  ```

### Jenkins 特有坑

+ **Groovy 沙箱**：声明式 Pipeline 默认在沙箱中运行，很多 Groovy 语法被禁止，需要用 `@NonCPS` 或在 Script Approval 中审批
+ **环境变量注入**：用 `withCredentials` 注入敏感信息，不要直接写在 Jenkinsfile 里
+ **Workspace 清理**：每次构建后 `cleanWs()`，避免残留文件影响下次构建
