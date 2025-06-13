# Monorepo 笔记

> 📌 本文件记录 Monorepo 架构的核心概念、工具链（pnpm workspace + Turborepo）、依赖管理、构建优化与最佳实践。

---

## 1. 基本概念

### 什么是 Monorepo

```
Monorepo（单一代码仓库）：
  将多个项目的代码放在同一个 Git 仓库中管理

  monorepo/
  ├── packages/
  │   ├── ui/              # 共享 UI 组件库
  │   ├── utils/           # 共享工具函数
  │   └── config/          # 共享配置（ESLint、TS 等）
  ├── apps/
  │   ├── web/             # Web 应用
  │   ├── mobile/          # 移动端应用
  │   └── admin/           # 后台管理
  ├── package.json         # 根 package.json
  ├── pnpm-workspace.yaml  # Workspace 配置
  └── turbo.json           # Turborepo 配置
```

### Monorepo vs Polyrepo

| | Monorepo | Polyrepo（多仓库） |
|---|----------|-------------------|
| **代码组织** | 一个仓库存多个项目 | 每个项目独立仓库 |
| **依赖管理** | 共享依赖统一版本 | 各项目独立管理版本 |
| **代码复用** | 直接引用本地包 | 需发布到 npm 再安装 |
| **原子提交** | 跨项目修改一次提交搞定 | 需多个仓库分别提交 |
| **构建工具** | 需额外配置（Turborepo/Nx） | 各项目独立构建 |
| **权限管理** | 粗粒度（整个仓库） | 细粒度（按仓库） |
| **CI/CD** | 需按需构建（只构建受影响的项目） | 各项目独立 CI |
| **适用场景** | 中大型团队、多项目共享代码 | 小团队、项目间无关联 |

### 谁在用 Monorepo

```
- Google（整个公司几乎一个仓库）
- Meta（React、React Native 等都在一个仓库）
- Microsoft（VS Code、TypeScript、Azure SDK）
- Uber（Go 语言微服务）
- Twitter
- 国内：字节跳动、阿里巴巴、腾讯
```

---

## 2. pnpm Workspace

### 为什么选 pnpm

```
npm / yarn 的问题：
  - node_modules 扁平化，幽灵依赖（phantom dependencies）
  - 同一依赖多版本时，软链接混乱
  - 安装速度慢（无全局缓存复用）

pnpm 的优势：
  - 内容寻址存储（content-addressable store）
  - 全局只存一份依赖，项目间硬链接共享
  - node_modules 通过软链接组织，严格隔离
  - 安装速度最快（比 npm/yarn 快 2-3 倍）
```

### 初始化 Workspace

```bash
# 创建根目录
mkdir my-monorepo && cd my-monorepo

# 初始化根 package.json
pnpm init

# 创建 workspace 配置
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
  - 'apps/*'
EOF

# 创建目录结构
mkdir -p packages/ui packages/utils apps/web
```

### pnpm-workspace.yaml 配置

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'        # packages 下所有目录
  - 'apps/*'            # apps 下所有目录
  - 'tools/*'           # 工具包
  - '!**/test/**'       # 排除测试目录
  - '!**/__tests__/**'  # 排除 __tests__ 目录
```

### 包之间的依赖引用

```json
// packages/ui/package.json
{
  "name": "@my/ui",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}

// apps/web/package.json
{
  "name": "@my/web",
  "version": "1.0.0",
  "dependencies": {
    "@my/ui": "workspace:*",      // 引用本地 workspace 包
    "@my/utils": "workspace:^1.0.0",  // 指定版本范围
    "react": "^18.2.0"
  }
}
```

```
workspace: 协议说明：
  workspace:*        — 任意版本（总是链接本地）
  workspace:^1.0.0   — 本地版本需满足 ^1.0.0
  workspace:~1.0.0   — 本地版本需满足 ~1.0.0
  workspace:1.0.0    — 精确匹配

发布时 workspace:* 会被替换为实际版本号
```

### 常用 pnpm 命令

```bash
# 安装依赖（根目录执行，安装所有 workspace 包的依赖）
pnpm install

# 在特定包中执行命令
pnpm --filter @my/web dev           # 在 web 应用中运行 dev
pnpm --filter @my/ui build          # 构建 ui 包
pnpm --filter @my/web... build      # 构建 web 及其依赖包

# 过滤器语法
pnpm --filter @my/web...            # web 及其所有依赖
pnpm --filter ...@my/ui             # 所有依赖 ui 的包
pnpm --filter './apps/*'            # glob 匹配
pnpm --filter '!@my/admin'          # 排除

# 添加依赖到特定包
pnpm --filter @my/web add axios
pnpm --filter @my/ui add -D typescript

# 在所有包中执行命令
pnpm -r run build                   # 递归执行所有包的 build
pnpm -r --parallel run dev          # 并行执行（不等待）

# 清理
pnpm store prune                    # 清理未引用的全局存储
```

### 依赖提升（Hoisting）

```bash
# .npmrc — 控制依赖提升行为
# 默认 pnpm 不提升依赖（严格模式）
# 但某些工具（如 TypeScript）需要依赖在根目录可访问

# 方案 1：提升所有依赖到根（不推荐，可能引入幽灵依赖）
public-hoist-pattern[]=*

# 方案 2：只提升特定包（推荐）
public-hoist-pattern[]=@types/*
public-hoist-pattern[]=eslint-*

# 方案 3：使用 shamefully-hoist（兼容旧项目）
shamefully-hoist=true
```

---

## 3. Turborepo

### 什么是 Turborepo

```
Turborepo 是一个高性能的 Monorepo 构建系统：
  - 智能任务调度（自动分析依赖图）
  - 远程缓存（团队共享构建结果）
  - 增量构建（只构建变更的部分）
  - 并行执行（无依赖关系的任务并行）

核心价值：
  100 个包的项目，改了 1 个包，只重新构建受影响的包
  第二次构建直接命中缓存，0 秒完成
```

### 安装与配置

```bash
# 在 monorepo 根目录安装
pnpm add -D turbo -w
```

```json
// turbo.json — 任务配置
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    ".env",
    ".env.*"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],      // 依赖上游包的 build
      "outputs": ["dist/**", ".next/**"],  // 缓存产物
      "inputs": [
        "src/**",
        "tsconfig.json",
        "package.json"
      ]
    },
    "dev": {
      "dependsOn": ["^build"],      // dev 前需要先 build 依赖
      "cache": false,               // dev 不缓存
      "persistent": true            // 长期运行的任务
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],       // 测试前需要 build
      "outputs": ["coverage/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

### Pipeline 配置详解

```json
{
  "pipeline": {
    "build": {
      // 依赖关系
      "dependsOn": ["^build"],
      // ^build = 先构建依赖我的包
      // build = 先构建我自己（通常不需要）
      // 空数组 [] = 无依赖，可并行

      // 缓存
      "outputs": ["dist/**"],
      // 哪些文件是构建产物（用于缓存判断）
      // 空数组 [] = 不缓存产物（如 lint）

      // 输入文件（影响缓存 hash）
      "inputs": [
        "src/**",
        "tsconfig.json",
        "package.json"
      ],
      // 默认包含所有文件，可缩小范围加速 hash 计算

      // 环境变量（影响缓存）
      "env": ["NODE_ENV", "API_URL"],
      // 这些环境变量变化会使缓存失效

      // 执行方式
      "cache": true,        // 是否缓存（默认 true）
      "persistent": false   // 是否长期运行（dev server 设为 true）
    }
  }
}
```

### 常用 Turborepo 命令

```bash
# 构建（自动分析依赖，按顺序执行）
turbo run build

# 开发（并行启动所有 dev server）
turbo run dev --parallel

# 只构建特定包及其依赖
turbo run build --filter=@my/web
turbo run build --filter=@my/web...  # web 及其依赖

# 查看任务依赖图
turbo run build --graph=graph.html

# 强制重新构建（忽略缓存）
turbo run build --force

# 查看缓存状态
turbo run build --dry=json

# 清理缓存
turbo clean
rm -rf node_modules/.cache/turbo
```

### 远程缓存（Remote Caching）

```bash
# Vercel Remote Cache（推荐，免费）
# 1. 登录 Vercel
npx vercel login

# 2. 链接项目
npx vercel link

# 3. 启用远程缓存
turbo login
turbo link

# 之后 turbo run build 会自动使用远程缓存
# 团队成员构建过的包，你直接命中缓存，0 秒完成
```

```json
// turbo.json — 配置远程缓存
{
  "remoteCache": {
    "enabled": true,
    "signature": true  // 签名验证（防止缓存投毒）
  }
}
```

### 增量构建原理

```
Turborepo 缓存 hash 计算：
  hash = hash(
    包自身的源代码文件,
    package.json 中的依赖版本,
    turbo.json 中的任务配置,
    依赖包的构建产物 hash,  // 递归
    相关环境变量
  )

任何一项变化 → hash 变化 → 缓存失效 → 重新构建
全部相同 → 命中缓存 → 直接复用产物
```

---

## 4. 共享代码与配置

### 共享 TypeScript 配置

```json
// packages/config/tsconfig/base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "noEmit": true
  }
}

// packages/config/tsconfig/react.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ES2020"]
  }
}

// packages/config/tsconfig/node.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2020"],
    "module": "CommonJS",
    "types": ["node"]
  }
}

// apps/web/tsconfig.json
{
  "extends": "@my/config/tsconfig/react.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../../packages/ui" },
    { "path": "../../packages/utils" }
  ]
}
```

### 共享 ESLint 配置

```javascript
// packages/config/eslint/index.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['node_modules/', 'dist/', '.next/'],
}

// packages/config/eslint/react.js
module.exports = {
  extends: [
    './index.js',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
}

// apps/web/.eslintrc.js
module.exports = {
  extends: ['@my/config/eslint/react'],
}
```

### 共享 Prettier 配置

```json
// packages/config/prettier/index.json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf"
}

// 各项目的 .prettierrc
{
  "extends": "@my/config/prettier/index.json"
}
```

### 共享 UI 组件库

```typescript
// packages/ui/src/Button.tsx
import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@my/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

// packages/ui/src/index.ts
export * from './Button'
export * from './Card'
export * from './Input'

// packages/ui/package.json
{
  "name": "@my/ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch"
  },
  "devDependencies": {
    "@my/config": "workspace:*",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

### 共享工具函数

```typescript
// packages/utils/src/cn.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// packages/utils/src/format.ts
export function formatDate(date: Date | string, locale = 'zh-CN'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatCurrency(
  amount: number,
  currency = 'CNY',
  locale = 'zh-CN'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

// packages/utils/src/index.ts
export * from './cn'
export * from './format'
export * from './debounce'
export * from './throttle'

// packages/utils/package.json
{
  "name": "@my/utils",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "sideEffects": false,
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch"
  }
}
```

---

## 5. 版本管理与发布

### Changesets（推荐）

```bash
# 安装
pnpm add -D @changesets/cli -w

# 初始化
pnpm changeset init
```

```yaml
# .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": [
    "@my/web",
    "@my/admin"  // 忽略应用包（不发布）
  ]
}
```

```bash
# 开发流程
# 1. 修改代码后，记录变更
pnpm changeset
# 交互式选择：哪些包改了？major/minor/patch？变更说明？

# 2. 生成 changelog 和版本号
pnpm changeset version
# 根据 .changeset/ 中的记录，更新 package.json 版本号和 CHANGELOG.md

# 3. 发布到 npm
pnpm changeset publish
# 发布所有有版本变更的包

# 4. 提交变更
git add .
git commit -m "chore: release packages"
git push
```

```markdown
# .changeset/cool-feature.md
---
'@my/ui': minor
'@my/utils': patch
---

feat(ui): 新增 Button 组件的 loading 状态
fix(utils): 修复 formatDate 在 Safari 下的兼容性问题
```

### 发布配置

```json
// packages/ui/package.json — 发布配置
{
  "name": "@my/ui",
  "version": "1.2.0",
  "publishConfig": {
    "access": "public",      // 公开包（scoped 包默认 restricted）
    "registry": "https://registry.npmjs.org/"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/myorg/my-monorepo",
    "directory": "packages/ui"
  }
}
```

### 内部包不发布

```json
// apps/web/package.json — 私有包
{
  "name": "@my/web",
  "version": "1.0.0",
  "private": true,  // 标记为私有，不会发布到 npm
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  }
}
```

---

## 6. CI/CD 集成

### GitHub Actions

```yaml
# .github/workflows/ci.yml
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
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm turbo run lint

      - name: Typecheck
        run: pnpm turbo run typecheck

      - name: Test
        run: pnpm turbo run test

      - name: Build
        run: pnpm turbo run build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

### 按需构建（Affected Only）

```yaml
# 只构建受 PR 影响的包
name: PR Check

on:
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # 需要前一个 commit 来对比

      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      # 只构建受影响的包
      - name: Build affected
        run: |
          pnpm turbo run build --filter=...[HEAD^1]
        # [HEAD^1] = 相对于上一个 commit 的变更
```

### 发布流程

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm turbo run build

      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 7. 常见场景与最佳实践

### 目录结构规范

```
my-monorepo/
├── apps/                    # 可部署的应用
│   ├── web/                 # Web 应用
│   ├── mobile/              # 移动端
│   └── admin/               # 后台管理
├── packages/                # 共享包（发布到 npm）
│   ├── ui/                  # UI 组件库
│   ├── utils/               # 工具函数
│   ├── config/              # 共享配置
│   └── types/               # 共享类型定义
├── tools/                   # 内部工具（不发布）
│   ├── scripts/             # 构建脚本
│   └── generators/          # 代码生成器
├── .changeset/              # Changesets 配置
├── .github/                 # GitHub Actions
├── .vscode/                 # VS Code 配置
├── package.json             # 根 package.json
├── pnpm-workspace.yaml      # Workspace 配置
├── pnpm-lock.yaml           # Lock 文件
├── turbo.json               # Turborepo 配置
├── tsconfig.json            # 根 TypeScript 配置
├── .eslintrc.js             # 根 ESLint 配置
├── .prettierrc              # 根 Prettier 配置
├── .npmrc                   # pnpm 配置
└── README.md
```

### 根 package.json 脚本

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "turbo run build && changeset publish",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\""
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "prettier": "^3.2.0",
    "turbo": "^1.12.0",
    "typescript": "^5.3.0"
  },
  "packageManager": "pnpm@8.15.0",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### TypeScript Project References

```json
// tsconfig.json（根目录）
{
  "files": [],
  "references": [
    { "path": "packages/ui" },
    { "path": "packages/utils" },
    { "path": "apps/web" },
    { "path": "apps/admin" }
  ]
}

// packages/ui/tsconfig.json
{
  "compilerOptions": {
    "composite": true,       // 启用 project references
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../utils" }   // ui 依赖 utils
  ]
}

// 使用 tsc --build 构建整个项目
// 自动按依赖顺序编译，只编译变更的部分
```

### 代码所有权（CODEOWNERS）

```
# .github/CODEOWNERS
# 全局默认 owner
* @myorg/core-team

# 特定包的 owner
/packages/ui/ @myorg/ui-team
/packages/utils/ @myorg/core-team
/apps/web/ @myorg/web-team
/apps/admin/ @myorg/admin-team

# 配置文件
/turbo.json @myorg/core-team
/pnpm-workspace.yaml @myorg/core-team
```

### 避免循环依赖

```bash
# 检测循环依赖
pnpm why @my/ui --recursive

# 或者用 madge
npx madge --circular --extensions ts .
```

```
循环依赖示例：
  A → B → C → A  ❌

解决：
  1. 提取共享代码到独立包 D
  2. A → D, B → D, C → D  ✅
```

### 环境变量管理

```bash
# 根目录 .env（全局环境变量）
NODE_ENV=development
API_BASE_URL=http://localhost:3000

# apps/web/.env（应用特定）
NEXT_PUBLIC_API_URL=http://localhost:3000

# 不要在 packages/ 中放 .env（共享包不应依赖特定环境）
```

```typescript
// packages/utils/src/env.ts — 类型安全的环境变量
export function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not defined`)
  }
  return value
}

// 使用
const apiUrl = getEnvVar('API_BASE_URL', 'http://localhost:3000')
```

---

## 8. 工具对比

### Turborepo vs Nx vs Lerna

| | Turborepo | Nx | Lerna |
|---|-----------|----|----|
| **定位** | 构建系统 | 完整工具链 | 版本管理 + 发布 |
| **学习曲线** | 低 | 中高 | 低 |
| **配置复杂度** | 低（turbo.json） | 高（nx.json + project.json） | 低 |
| **远程缓存** | ✅（Vercel 免费） | ✅（Nx Cloud） | ❌ |
| **增量构建** | ✅ | ✅ | ❌ |
| **代码生成器** | ❌ | ✅（nx generate） | ❌ |
| **依赖图可视化** | ✅（--graph） | ✅（nx graph） | ❌ |
| **适用场景** | 快速上手、中小团队 | 大型企业级项目 | 纯发布场景 |
| **维护方** | Vercel | Nrwl | Nx（现由 Nx 维护） |

### 选型建议

```
- 快速上手、配置简单 → Turborepo
- 需要代码生成、依赖图分析、大型企业项目 → Nx
- 只需要版本管理和发布 → Changesets（不需要 Lerna）
- 已有 Lerna 项目 → 迁移到 Changesets + Turborepo
```

---

## 9. 常见问题

### node_modules 结构

```
pnpm 的 node_modules 结构：
  node_modules/
  ├── .pnpm/                    # 实际依赖存储（硬链接到全局 store）
  │   ├── react@18.2.0/
  │   │   └── node_modules/react/
  │   └── lodash@4.17.21/
  │       └── node_modules/lodash/
  ├── react -> .pnpm/react@18.2.0/node_modules/react  # 软链接
  └── lodash -> .pnpm/lodash@4.17.21/node_modules/lodash

优点：
  - 严格隔离，无幽灵依赖
  - 全局只存一份，节省磁盘
  - 安装速度快（硬链接，非复制）
```

### 幽灵依赖（Phantom Dependencies）

```
问题：
  代码中 import 了未声明的依赖，但因为其他包安装了它而能正常工作
  npm/yarn 的扁平化结构会导致这个问题

pnpm 的解决：
  严格模式，只能 import package.json 中声明的依赖
  未声明的依赖无法访问（除非显式提升）
```

### 依赖版本冲突

```bash
# 查看依赖树
pnpm why react

# 解决版本冲突：使用 overrides 统一版本
# package.json
{
  "pnpm": {
    "overrides": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0"
    }
  }
}

# 或者在特定包中强制版本
# packages/ui/package.json
{
  "resolutions": {
    "typescript": "5.3.0"
  }
}
```

### 构建缓存失效

```
缓存失效的常见原因：
  1. 修改了 turbo.json 中的 pipeline 配置
  2. 修改了包外的文件（如根目录的 .env）
  3. 依赖包重新构建（递归失效）
  4. 环境变量变化（未在 inputs 中声明）
  5. CI 中未配置远程缓存

调试：
  turbo run build --dry=json  # 查看哪些任务会执行
  turbo run build --verbose   # 详细日志
```

### TypeScript 路径别名

```json
// apps/web/tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@my/ui": ["../../packages/ui/src"],
      "@my/utils": ["../../packages/utils/src"]
    }
  }
}

// 开发时直接引用源码（支持 HMR）
// 构建时通过 package.json 的 exports 指向 dist
```

---

## 10. 实战模板

### 快速创建 Monorepo

```bash
# 1. 创建根目录
mkdir my-monorepo && cd my-monorepo

# 2. 初始化
pnpm init
echo 'packages:\n  - "packages/*"\n  - "apps/*"' > pnpm-workspace.yaml

# 3. 安装 Turborepo
pnpm add -D turbo -w

# 4. 创建 turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    }
  }
}
EOF

# 5. 创建共享配置包
mkdir -p packages/config
cd packages/config
pnpm init
# 编辑 package.json: name 改为 @my/config

# 6. 创建 UI 组件库
mkdir -p packages/ui
cd packages/ui
pnpm init
pnpm add -D tsup typescript
# 编辑 package.json: name 改为 @my/ui, 添加 scripts 和 exports

# 7. 创建 Web 应用
mkdir -p apps/web
cd apps/web
pnpm init
pnpm add react react-dom next
pnpm add -D typescript @types/react @types/node
# 编辑 package.json: name 改为 @my/web, private: true

# 8. 安装 Changesets
cd ../..
pnpm add -D @changesets/cli -w
pnpm changeset init

# 9. 创建 .npmrc
cat > .npmrc << 'EOF'
auto-install-peers=true
strict-peer-dependencies=false
public-hoist-pattern[]=@types/*
EOF

# 10. 完成！开始开发
pnpm install
turbo run dev
```

### 完整项目结构示例

```
my-monorepo/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── admin/
│       ├── src/
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── ui/
│   │   ├── src/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   └── index.ts
│   │   ├── tsup.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── utils/
│   │   ├── src/
│   │   │   ├── cn.ts
│   │   │   ├── format.ts
│   │   │   └── index.ts
│   │   ├── tsup.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── config/
│       ├── eslint/
│       │   ├── index.js
│       │   └── react.js
│       ├── tsconfig/
│       │   ├── base.json
│       │   ├── react.json
│       │   └── node.json
│       ├── prettier/
│       │   └── index.json
│       └── package.json
├── .changeset/
│   └── config.json
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── .vscode/
│   └── settings.json
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
├── .npmrc
└── README.md
```

---

## 参考资源

- [pnpm Workspace 文档](https://pnpm.io/workspaces)
- [Turborepo 官方文档](https://turbo.build/repo/docs)
- [Changesets 文档](https://github.com/changesets/changesets)
- [Nx 官方文档](https://nx.dev/)
- [Monorepo 最佳实践（Vercel）](https://vercel.com/docs/concepts/monorepos)
