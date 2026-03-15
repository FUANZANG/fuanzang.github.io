# GitHub Actions

GitHub Actions 是 GitHub 原生的 **CI/CD（持续集成 / 持续部署）** 服务。通过在工作仓库的 `.github/workflows/` 目录下放 YAML 配置文件，即可在代码推送、PR、定时等事件触发时自动运行流水线。

> 本篇聚焦 GitHub Actions 本身；更宏观的 CI/CD 理念见 [CI/CD](/notes/deploy/ci-cd)。

## 核心概念

+ **Workflow（工作流）**：一个自动化流程，对应 `.github/workflows/` 下的一个 YAML 文件。
+ **Event（事件）**：触发 workflow 的事件，如 `push`、`pull_request`、`schedule`（定时）。
+ **Job（任务）**：一组按顺序执行的 step，运行在独立的 **runner** 上。同一 workflow 内的 job 默认并行，可用 `needs` 指定依赖。
+ **Step（步骤）**：job 中的一个可执行单元，要么运行 shell 命令，要么调用一个 **action**。
+ **Action（动作）**：可复用的命令包，社区生态丰富（如 `actions/checkout`、`actions/setup-node`）。
+ **Runner（运行器）**：执行 job 的机器，GitHub 提供托管的 Linux/macOS/Windows 云机器，也支持自托管。

## 最小示例

`.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4        # 拉取代码
      - uses: actions/setup-node@v4      # 安装 Node.js
        with:
          node-version: 20
          cache: npm
      - run: npm ci                       # 安装依赖（锁定版本，CI 推荐）
      - run: npm run build                # 构建
      - run: npm test                     # 测试
```

### on：触发条件

```yaml
on:
  push:
    branches: [main, dev]
    paths: ['src/**', 'package.json']     # 仅这些路径变化才触发
  pull_request:
    types: [opened, synchronize]
  schedule:
    - cron: '0 0 * * *'                   # 每天 UTC 0 点执行
  workflow_dispatch:                      # 允许手动在 UI 触发
```

### jobs：任务与依赖

```yaml v-pre
jobs:
  test:
    runs-on: ubuntu-latest
    steps: [ ... ]
  build:
    needs: test                           # 等 test 成功后才运行
    runs-on: ubuntu-latest
    steps: [ ... ]
  deploy:
    needs: [test, build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'   # 仅 main 分支部署
    steps: [ ... ]
```

### 矩阵构建（Matrix）

一次跑多版本/多环境组合：

```yaml v-pre
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [18, 20]
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
```

### 缓存依赖

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm            # 自动缓存 ~/.npm
```

或使用通用缓存 action：

```yaml v-pre
- uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
```

## 环境变量与密钥

+ **环境变量**：在 `env:` 或 step 级 `env:` 定义。
+ **Secrets**：在仓库 `Settings → Secrets and variables → Actions` 中配置，workflow 中以 <code v-pre>${{ secrets.NAME }}</code> 引用，**不会出现在日志明文**。

```yaml v-pre
jobs:
  deploy:
    steps:
      - run: echo "Token is $TOKEN"
        env:
          TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

## 发布到 GitHub Pages

GitHub 提供官方 action 简化发布：

```yaml v-pre
jobs:
  deploy:
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci && npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
        id: deployment
```

需在仓库 `Settings → Pages → Build and deployment → Source` 选择 **GitHub Actions**。

## 实战：前端 CI（lint + test + build）

```yaml
name: Frontend CI
on: [push, pull_request]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

## 注意事项

+ CI 用 `npm ci` 而非 `npm install`：`ci` 严格按 `package-lock.json` 安装，更快且可复现。
+ 不要将密钥写进 `run:` 的字符串里（可能被日志泄漏），统一走 `secrets`。
+ 免费额度：公开仓库无限制；私有仓库每月有免费分钟数（随套餐变化）。
+ Actions 市场：优先选用大厂维护、带版本 tag（如 `@v4`）的 action，避免误用未审计的第三方。
