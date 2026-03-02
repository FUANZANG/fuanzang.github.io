# 包管理器

> 📌 本文件记录前端三大包管理器 npm、pnpm、Yarn 的核心机制、Workspace 支持与选型建议。
>
> 📅 基于以下版本：npm 12.x | pnpm 11.x | Yarn 4.x（Berry）

---

## 1. 核心机制对比

| 特性 | npm | pnpm | Yarn |
|------|-----|------|------|
| `node_modules` 结构 | 扁平化（hoisted） | 隔离（symlink + content-addressable store） | Plug'n'Play（默认无 node_modules） |
| 磁盘占用 | 每个项目独立副本 | 全局内容寻址存储，硬链接复用 | PnP 模式下无冗余 |
| 安装速度 | 一般 | 快（并行 + 复用） | 快（缓存） |
| Workspace | ✅ | ✅ | ✅ |
| 内容寻址存储 | ❌ | ✅ | ❌ |
| Zero-Installs | ❌ | ❌ | ✅（PnP + 缓存提交到 git） |
| Catalog（版本目录） | ❌ | ✅ | ❌ |
| 管理 Node 运行时 | ❌ | ✅（`pnpm env`） | ❌ |
| 自动安装 peer deps | ✅ | ✅ | ❌ |

---

## 2. npm

### 基本命令

```bash
# 安装所有依赖
npm install

# 安装生产依赖
npm install lodash

# 安装开发依赖
npm install --save-dev typescript

# 安装指定版本
npm install react@18.2.0

# 全局安装
npm install -g typescript

# 卸载
npm uninstall lodash

# 更新
npm update lodash
npm update            # 更新所有（在 semver 范围内）

# 查看过时的包
npm outdated

# 运行脚本
npm run build
npm run dev

# 清理缓存
npm cache clean --force
```

### package.json 版本范围

```json
{
  "dependencies": {
    "lodash": "4.17.21",   // 精确版本
    "react": "^18.2.0",    // 兼容版本（18.x.x，不升大版本）
    "vue": "~3.4.0",       // 近似版本（3.4.x，只升 patch）
    "axios": ">=1.0.0",    // 大于等于
    "express": "*"         // 任意版本（不推荐）
  }
}
```

### package-lock.json

锁定依赖树的精确版本，保证所有环境安装结果一致：

```bash
# CI 环境推荐用 ci 而非 install，严格遵循 lock 文件
npm ci
```

`npm install` 可以更新 lock 文件；`npm ci` 不会，如果 lock 文件与 package.json 不一致会直接报错。

### npm scripts 技巧

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    // pre/post 钩子：自动在对应脚本前/后执行
    "prebuild": "echo 'starting build...'",
    "postbuild": "echo 'build done'",
    // 并行执行（需要 concurrently 或 &）
    "dev:all": "concurrently \"npm run dev:api\" \"npm run dev:web\""
  }
}
```

---

## 3. pnpm

pnpm 最大的特点是**内容寻址存储（Content-Addressable Store）**：所有包存储在全局 `~/.pnpm-store`，项目内通过硬链接引用，同一包的同一版本在磁盘上只存一份。

### 基本命令

```bash
# 安装
pnpm install
pnpm add lodash
pnpm add -D typescript
pnpm add -g typescript     # 全局安装

# 卸载
pnpm remove lodash

# 更新
pnpm update
pnpm update lodash --latest

# 运行脚本
pnpm dev
pnpm run build

# 查看磁盘占用
pnpm store status

# 清理无用的全局缓存
pnpm store prune
```

### node_modules 结构

pnpm 默认使用隔离的 `node_modules`，防止"幽灵依赖"（直接使用未在 package.json 中声明的包）：

```
node_modules/
  .pnpm/               ← 实际存放所有包（扁平）
    lodash@4.17.21/
      node_modules/
        lodash/        ← 硬链接到全局 store
  lodash -> .pnpm/lodash@4.17.21/node_modules/lodash  ← 符号链接
```

### pnpm Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - '!**/test/**'   # 排除
```

```bash
# 在所有 workspace 运行命令
pnpm -r run build

# 在指定包运行
pnpm --filter @myapp/web run dev

# 向特定包添加依赖
pnpm --filter @myapp/web add axios

# 添加 workspace 内部依赖
pnpm --filter @myapp/web add @myapp/utils --workspace
```

### Catalog（版本目录，pnpm 独有）

统一管理多个包的依赖版本，避免版本不一致：

```yaml
# pnpm-workspace.yaml
catalog:
  react: ^18.2.0
  typescript: ^5.4.0
  "@types/react": ^18.2.0
```

```json
// packages/app/package.json
{
  "dependencies": {
    "react": "catalog:"   // 使用 catalog 中定义的版本
  }
}
```

### 管理 Node.js 版本（pnpm env）

```bash
# 安装指定版本的 Node.js
pnpm env use --global 20
pnpm env use --global lts

# 查看已安装的版本
pnpm env list

# 移除版本
pnpm env remove --global 18
```

---

## 4. Yarn

Yarn 有两个主要版本线：
- **Yarn Classic（1.x）**：老版本，已进入维护模式
- **Yarn Berry（2.x+，当前 4.x）**：完全重写，支持 PnP、Zero-Installs

### 安装 Yarn 4

```bash
# 通过 corepack 启用（Node.js 内置，推荐方式）
corepack enable
corepack prepare yarn@4 --activate

# 或在项目中指定
yarn set version 4
```

### 基本命令

```bash
yarn install   # 或 yarn（安装所有依赖）
yarn add lodash
yarn add -D typescript
yarn remove lodash
yarn upgrade lodash
yarn run build  # 或 yarn build
```

### Plug'n'Play（PnP）

Yarn 4 默认使用 PnP，没有 `node_modules`，改用 `.pnp.cjs` 文件映射包位置：

```
优点：
- 安装速度更快（无需写入大量文件）
- 磁盘占用更小
- 幽灵依赖问题在安装时就能发现

缺点：
- 与部分工具（如某些 webpack loader）不兼容
- 需要额外配置编辑器（VSCode 需安装 ZipFS 插件）
```

兼容性问题时可切换回 `node_modules` 模式：

```yaml
# .yarnrc.yml
nodeLinker: node-modules
```

### Zero-Installs

将 Yarn 缓存提交到 git，clone 后无需 `yarn install` 即可使用：

```bash
# .gitignore 中去掉 .yarn/cache 和 .pnp.cjs 的忽略
# 直接提交这些文件
```

### Yarn Workspace

```json
// 根 package.json
{
  "private": true,
  "workspaces": ["packages/*", "apps/*"]
}
```

```bash
# 在所有 workspace 运行
yarn workspaces foreach run build

# 在指定包运行
yarn workspace @myapp/web run dev

# 向指定包添加依赖
yarn workspace @myapp/web add axios
```

---

## 5. lock 文件

每个包管理器都有自己的 lock 文件：

| 包管理器 | lock 文件 |
|---------|-----------|
| npm | `package-lock.json` |
| pnpm | `pnpm-lock.yaml` |
| Yarn | `yarn.lock` |

**最佳实践**：
- lock 文件必须提交到 git
- 同一项目只使用一种包管理器（可在根目录 `package.json` 的 `engines` 字段或 `.npmrc` 限制）
- CI 使用 `npm ci` / `pnpm install --frozen-lockfile` / `yarn install --immutable` 严格还原依赖

```json
// package.json — 限制只能用 pnpm
{
  "engines": {
    "node": ">=18",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@11.0.0"  // corepack 会自动使用此版本
}
```

---

## 6. .npmrc / .yarnrc

```ini
# .npmrc
registry=https://registry.npmmirror.com   # 使用国内镜像
save-exact=true                           # 保存精确版本号（不带 ^）
```

```yaml
# .yarnrc.yml（Yarn Berry）
nodeLinker: node-modules
npmRegistryServer: "https://registry.npmmirror.com"
```

---

## 7. 选型建议

| 场景 | 推荐 |
|------|------|
| 新项目（个人或小团队） | pnpm — 速度快、磁盘省、体验好 |
| Monorepo | pnpm — Workspace + Catalog 最完善 |
| 企业项目（稳定优先） | npm — 生态最广，无额外学习成本 |
| 追求极致安装速度 | Yarn Berry（PnP + Zero-Installs） |
| 已有老项目 | 保持原有工具，不必迁移 |
