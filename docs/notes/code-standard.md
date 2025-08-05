# 代码规范与工程约束

> 📌 本文件记录前端代码规范工具链：ESLint、Prettier、Stylelint、Husky、lint-staged、commitlint、EditorConfig、Commitizen 的配置与最佳实践。
>
> 📅 基于以下版本：ESLint 10.x（Flat Config） | Prettier 3.x | Stylelint 17.x | Husky 9.x | lint-staged 17.x | commitlint 21.x | @typescript-eslint 8.x | eslint-plugin-vue 10.x

---

## 1. 工具链全景

```
代码规范工具链：

┌─────────────────────────────────────────────────┐
│              代码规范与工程约束                    │
├──────────────┬──────────────┬───────────────────┤
│  代码质量      │  代码风格      │  Git 工作流        │
├──────────────┼──────────────┼───────────────────┤
│ ESLint       │ Prettier     │ Husky             │
│ Stylelint    │ EditorConfig │ lint-staged       │
│ TypeScript   │              │ commitlint        │
│              │              │ Commitizen        │
└──────────────┴──────────────┴───────────────────┘

ESLint      → 检查代码质量（未使用变量、隐式 any、禁止 var）
Prettier    → 格式化代码风格（缩进、引号、换行）
Stylelint   → 检查 CSS/SCSS 规范
Husky       → Git hooks 管理（pre-commit、commit-msg）
lint-staged → 只对暂存文件执行 lint
commitlint  → 校验 commit message 格式
EditorConfig→ 跨编辑器统一基础配置
Commitizen  → 交互式生成规范 commit message
```

### ESLint vs Prettier

```
ESLint — 代码质量 + 代码风格
  ✅ 未使用变量、空块、eval 等代码问题
  ✅ 最佳实践（no-var, prefer-const）
  ⚠️ 也能格式化，但不如 Prettier 好

Prettier — 纯格式化
  ✅ 缩进、引号、换行、空格
  ✅ 0 配置，opinionated
  ❌ 不检查代码质量

最佳实践：ESLint 管质量 + Prettier 管格式
  → 用 eslint-config-prettier 关闭 ESLint 中与 Prettier 冲突的规则
```

---

## 2. ESLint

### 安装与初始化

```bash
# 交互式初始化（推荐）
npm init @eslint/config@latest

# 或手动安装
npm install -D eslint @eslint/js
```

### Flat Config（ESLint 9+ 默认）

> ESLint 9+ 使用 Flat Config（`eslint.config.js`），替代了旧的 `.eslintrc` 格式。

```js
// eslint.config.js — 纯 JS 项目
import { defineConfig } from 'eslint/config'
import js from '@eslint/js'

export default defineConfig([
  // 所有文件
  {
    files: ['**/*.js'],
    plugins: { js },
    extends: ['js/recommended'],
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  // 忽略文件
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  },
])
```

### TypeScript 项目

```bash
npm install -D eslint @eslint/js typescript-eslint
```

```js
// eslint.config.js — TypeScript 项目
import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default defineConfig([
  // JS 文件
  {
    files: ['**/*.js'],
    plugins: { js },
    extends: ['js/recommended'],
  },
  // TS 文件
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { js, ts: tseslint },
    extends: ['js/recommended', 'ts/recommended'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/'],
  },
])
```

### Vue 项目

```bash
npm install -D eslint @eslint/js eslint-plugin-vue
```

```js
// eslint.config.js — Vue 3 + TS 项目
import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default defineConfig([
  // JS
  {
    files: ['**/*.js'],
    plugins: { js },
    extends: ['js/recommended'],
  },
  // TS
  {
    files: ['**/*.ts'],
    plugins: { js, ts: tseslint },
    extends: ['js/recommended', 'ts/recommended'],
  },
  // Vue SFC
  {
    files: ['**/*.vue'],
    plugins: { vue: pluginVue },
    extends: ['vue/recommended'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/'],
  },
])
```

### 常用规则

```js
rules: {
  // 代码质量
  'no-unused-vars': 'error',           // 未使用变量
  'no-undef': 'error',                 // 未定义变量
  'no-console': 'warn',                // console
  'no-debugger': 'error',              // debugger
  'no-var': 'error',                   // 禁止 var
  'prefer-const': 'error',             // 优先 const
  'eqeqeq': 'error',                   // 严格等号
  'no-eval': 'error',                  // 禁止 eval
  'no-implied-eval': 'error',          // 禁止隐式 eval

  // TypeScript
  '@typescript-eslint/no-explicit-any': 'warn',        // any
  '@typescript-eslint/no-non-null-assertion': 'error', // ! 断言
  '@typescript-eslint/no-unused-vars': 'error',
  '@typescript-eslint/consistent-type-imports': 'error', // import type

  // Vue
  'vue/no-v-html': 'error',            // 禁止 v-html
  'vue/require-default-prop': 'warn',  // prop 默认值
  'vue/attributes-order': 'error',     // 属性顺序
}
```

### 命令行

```bash
# 检查
npx eslint src/

# 检查并自动修复
npx eslint src/ --fix

# 指定文件
npx eslint src/main.ts src/App.vue

# 输出报告
npx eslint src/ --format json > eslint-report.json
```

### ESLint 9 vs 8 关键变化

| | ESLint 8 | ESLint 9+ |
|---|---|---|
| 配置格式 | `.eslintrc.*`（JSON/YAML/JS） | `eslint.config.js`（Flat Config） |
| 配置继承 | `extends` 字段 | 数组展开 |
| 插件引用 | 字符串名 | 对象导入 |
| 环境配置 | `env: { browser: true }` | `languageOptions.globals` |
| 解析器 | `parser` 字符串 | `languageOptions.parser` 对象 |

---

## 3. Prettier

### 安装

```bash
npm install -D --save-exact prettier
```

> Prettier 建议用 `--save-exact` 锁定精确版本，因为不同版本的格式化结果可能不同。

### 配置

```json
// .prettierrc
{
  "semi": false,           // 不加分号
  "singleQuote": true,     // 单引号
  "trailingComma": "all",  // 尾逗号
  "printWidth": 100,       // 行宽
  "tabWidth": 2,           // 缩进
  "useTabs": false,        // 空格缩进
  "bracketSpacing": true,  // 对象空格 { foo: 1 }
  "arrowParens": "always", // 箭头函数括号
  "endOfLine": "lf"        // 换行符
}
```

```yaml
# .prettierignore
dist/
node_modules/
coverage/
*.min.js
pnpm-lock.yaml
```

### 命令行

```bash
# 格式化所有文件
npx prettier . --write

# 检查是否已格式化（CI 用）
npx prettier . --check

# 格式化特定目录
npx prettier src/ --write
```

### 与 ESLint 集成

```bash
npm install -D eslint-config-prettier
```

```js
// eslint.config.js
import prettierConfig from 'eslint-config-prettier'

export default defineConfig([
  // ...其他配置
  prettierConfig,  // 放最后，关闭与 Prettier 冲突的规则
])
```

> `eslint-config-prettier` 只关闭规则，不运行 Prettier。格式化由 Prettier 负责（通过 IDE 或 pre-commit hook）。

### Prettier 插件

```bash
# Vue SFC 中的 CSS/SCSS 格式化
npm install -D prettier-plugin-organize-imports

# .prettierrc
{
  "plugins": ["prettier-plugin-organize-imports"]
}
```

---

## 4. Stylelint

Stylelint 是 CSS/SCSS/Less 的 linter。

### 安装

```bash
npm install -D stylelint stylelint-config-standard
```

### 配置

```json
// .stylelintrc.json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "indentation": 2,
    "color-hex-length": "long",
    "at-rule-no-unknown": null,
    "scss/at-rule-no-unknown": true
  }
}
```

```bash
# 检查
npx stylelint "src/**/*.{css,scss,vue}"

# 自动修复
npx stylelint "src/**/*.{css,scss,vue}" --fix
```

### 与 Prettier 集成

```bash
npm install -D stylelint-config-prettier
```

```json
{
  "extends": ["stylelint-config-standard", "stylelint-config-prettier"]
}
```

---

## 5. EditorConfig

EditorConfig 是跨编辑器统一基础配置的文件，**不需要安装任何东西**，主流编辑器都支持（VS Code 需要安装 EditorConfig 插件）。

```ini
# .editorconfig
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false  # Markdown 保留行尾空格（换行）

[Makefile]
indent_style = tab  # Makefile 必须用 tab
```

### EditorConfig vs Prettier

```
EditorConfig：
  - 基础格式（缩进、换行符、编码）
  - 跨编辑器统一（包括非 JS 文件）
  - 不做代码格式化（不调整引号、空格位置）

Prettier：
  - 代码格式化（引号、分号、换行位置）
  - 只处理 Prettier 支持的文件类型

两者互补：EditorConfig 管基础，Prettier 管代码格式
```

---

## 6. Husky（Git Hooks 管理）

Husky 让你在项目中轻松使用 Git hooks。

### 安装与初始化

```bash
npm install -D husky
npx husky init  # 创建 .husky/pre-commit 和 package.json 的 prepare 脚本
```

```
项目结构：
.husky/
  pre-commit     # commit 前执行
  commit-msg     # 校验 commit message
  pre-push       # push 前执行
package.json     # "prepare": "husky"
```

### 配置 hooks

```bash
# .husky/pre-commit — commit 前执行
npx lint-staged
```

```bash
# .husky/commit-msg — 校验 commit message
npx --no-install commitlint --edit $1
```

```bash
# .husky/pre-push — push 前执行
npm run test
```

### 禁用 hooks

```bash
# 临时跳过 hooks（紧急情况）
HUSKY=0 git commit -m "hotfix"

# 全局禁用
export HUSKY=0
```

### Husky 9 vs 8 变化

| | Husky 8 | Husky 9 |
|---|---|---|
| hook 文件 | 需要 `#!/usr/bin/env sh` 头 | 不需要 |
| 初始化 | `npx husky install` | `npx husky init` |
| 目录 | `.husky/_/` | `.husky/`（更简洁） |

---

## 7. lint-staged

lint-staged 只对**暂存（staged）文件**执行命令，避免每次 commit 都 lint 全部文件。

### 安装

```bash
npm install -D lint-staged
```

### 配置

```json
// package.json
{
  "lint-staged": {
    "*.{js,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{vue,css,scss}": [
      "stylelint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml}": [
      "prettier --write"
    ]
  }
}
```

```js
// 或独立配置文件 lint-staged.config.js
export default {
  '*.{js,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{vue,css,scss}': ['stylelint --fix', 'prettier --write'],
  '*.{json,md,yml}': ['prettier --write'],
}
```

### 工作流程

```
git add src/main.ts src/style.css
git commit -m "feat: xxx"

  ↓ 触发 pre-commit hook
  ↓ npx lint-staged
  ↓ 只 lint 暂存的文件：
    eslint --fix src/main.ts
    prettier --write src/main.ts
    stylelint --fix src/style.css
    prettier --write src/style.css
  ↓ 修改后的文件重新 add
  ↓ commit 完成
```

---

## 8. commitlint（Commit Message 校验）

commitlint 校验 commit message 是否符合规范（通常用 Conventional Commits）。

### 安装

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

### 配置

```js
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复 bug
        'docs',     // 文档
        'style',    // 格式（不影响代码运行）
        'refactor', // 重构
        'perf',     // 性能优化
        'test',     // 测试
        'build',    // 构建
        'ci',       // CI 配置
        'chore',    // 杂务
        'revert',   // 回退
      ],
    ],
    'subject-max-length': [2, 'always', 72],  // subject 最长 72 字符
    'subject-min-length': [2, 'always', 5],   // subject 最短 5 字符
  },
}
```

### Conventional Commits 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

```
feat: 新增用户列表页面
fix(auth): 修复登录跳转问题
docs: 更新 README
refactor(utils): 重构日期格式化函数
perf: 优化列表渲染性能
chore: 升级依赖版本
revert: 回退 feat: 用户列表的提交

带 scope：
feat(user): 新增用户管理模块

带 breaking change：
feat(api): 更改 API 响应格式

BREAKING CHANGE: API 返回从 { data } 改为 { data, code, message }
```

### 校验规则

| 规则 | 说明 |
|------|------|
| `type-enum` | type 必须在允许列表中 |
| `type-empty` | type 不能为空 |
| `subject-empty` | subject 不能为空 |
| `subject-case` | subject 大小写规则 |
| `header-max-length` | header 最大长度 |
| `body-leading-blank` | body 前要有空行 |

---

## 9. Commitizen（交互式 Commit）

Commitizen 提供交互式命令生成规范的 commit message。

### 安装

```bash
npm install -D commitizen cz-conventional-changelog
```

```json
// package.json
{
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  },
  "scripts": {
    "cz": "cz"
  }
}
```

### 使用

```bash
npm run cz

# 交互式提示：
? Select the type of change: (Use arrow keys)
❯ feat:     A new feature
  fix:      A bug fix
  docs:     Documentation only changes
  ...

? What is the scope of this change:
? Write a short, imperative tense description of the change:
? Provide a longer description of the change:
? Are there any breaking changes?
? Does this change affect any issues?
```

### cz-git 扩展（更友好的交互）

```bash
npm install -D cz-git
```

```js
// .czrc 或 commitizen 配置
{
  "path": "cz-git",
  "czConfig": {
    "scopes": [
      "auth", "user", "order", "ui", "utils", "api"
    ]
  }
}
```

---

## 10. 完整配置实战

### Vue 3 + TS 项目完整配置

```bash
# 一次性安装所有工具
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-vue \
  eslint-config-prettier prettier \
  stylelint stylelint-config-standard stylelint-config-prettier \
  husky lint-staged \
  @commitlint/cli @commitlint/config-conventional \
  commitizen cz-git
```

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from 'eslint-config-prettier'

export default defineConfig([
  // JS
  {
    files: ['**/*.js'],
    plugins: { js },
    extends: ['js/recommended'],
  },
  // TS
  {
    files: ['**/*.ts'],
    plugins: { js, ts: tseslint },
    extends: ['js/recommended', 'ts/recommended'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Vue
  {
    files: ['**/*.vue'],
    plugins: { vue: pluginVue },
    extends: ['vue/recommended'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  prettierConfig,
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },
])
```

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf"
}
```

```json
// package.json
{
  "scripts": {
    "lint": "eslint . --fix",
    "lint:style": "stylelint \"src/**/*.{css,scss,vue}\" --fix",
    "format": "prettier . --write",
    "prepare": "husky",
    "cz": "cz"
  },
  "lint-staged": {
    "*.{js,ts,vue}": ["eslint --fix", "prettier --write"],
    "*.{css,scss}": ["stylelint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

```js
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-max-length': [2, 'always', 72],
  },
}
```

```ini
# .editorconfig
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

```bash
# 初始化 Husky hooks
npx husky init
echo "npx lint-staged" > .husky/pre-commit
echo "npx --no-install commitlint --edit \$1" > .husky/commit-msg
```

---

## 11. CI 集成

### GitHub Actions

```yaml
# .github/workflows/lint.yml
name: Lint

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      # ESLint
      - name: ESLint
        run: npx eslint . --max-warnings 0

      # Prettier
      - name: Prettier
        run: npx prettier . --check

      # Stylelint
      - name: Stylelint
        run: npx stylelint "src/**/*.{css,scss,vue}"

      # commitlint（仅 PR）
      - name: commitlint
        if: github.event_name == 'pull_request'
        run: |
          npx commitlint --from ${{ github.event.pull_request.head.sha }}~${{ github.event.pull_request.commits }} --to ${{ github.event.pull_request.head.sha }}
```

### pre-push hook（可选）

```bash
# .husky/pre-push — push 前跑测试
npm run test || (echo "测试失败，阻止 push" && exit 1)
```

---

## 12. VS Code 集成

```json
// .vscode/settings.json — 项目级配置
{
  // 保存时自动修复
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.fixAll.stylelint": "explicit"
  },

  // 保存时自动格式化
  "editor.formatOnSave": true,
  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[vue]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[json]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[css]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[scss]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },

  // ESLint 配置
  "eslint.validate": ["javascript", "typescript", "vue"],

  // Stylelint 配置
  "stylelint.validate": ["css", "scss", "vue"]
}
```

```json
// .vscode/extensions.json — 推荐安装的插件
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "stylelint.vscode-stylelint",
    "EditorConfig.EditorConfig",
    "Vue.volar"
  ]
}
```

---

## 13. 常见踩坑

### ESLint 和 Prettier 规则冲突

```
问题：ESLint 要求单引号，Prettier 要求双引号
解决：eslint-config-prettier 放在 extends 最后，关闭冲突规则

// eslint.config.js
import prettierConfig from 'eslint-config-prettier'
export default defineConfig([
  // ...其他配置
  prettierConfig,  // 必须放最后！
])
```

### Husky hooks 不执行

```bash
# 检查 hooks 是否安装
ls .husky/

# 重新初始化
npx husky init

# 检查 git hooks 路径
git config core.hooksPath
# 应该输出 .husky

# 如果不是
git config core.hooksPath .husky
```

### lint-staged 没有重新 add 修改的文件

```
问题：eslint --fix 修改了文件，但没有重新 git add
原因：旧版本 lint-staged 需要手动配置
解决：lint-staged 15+ 自动重新 add，不需要额外配置
```

### commitlint 不生效

```bash
# 检查 commit-msg hook 是否存在
cat .husky/commit-msg
# 应该包含 commitlint 命令

# 手动测试
echo "feat: test" | npx commitlint
echo "random message" | npx commitlint  # 应该报错
```

### ESLint Flat Config 不识别 .vue 文件

```js
// 确保在 eslint.config.js 中显式声明 files
{
  files: ['**/*.vue'],
  plugins: { vue: pluginVue },
  extends: ['vue/recommended'],
}
```

### pnpm 项目 ESLint 报错

```ini
# .npmrc — pnpm 需要额外配置
auto-install-peers=true
node-linker=hoisted
```

---

## 14. 最佳实践

### 配置文件组织

```
项目根目录：
├── .editorconfig              # 跨编辑器基础配置
├── .prettierrc                # Prettier 配置
├── .prettierignore            # Prettier 忽略
├── eslint.config.js           # ESLint Flat Config
├── .stylelintrc.json          # Stylelint 配置
├── commitlint.config.js       # commitlint 配置
├── .czrc                      # commitizen 配置
├── .husky/
│   ├── pre-commit             # lint-staged
│   └── commit-msg             # commitlint
├── .vscode/
│   ├── settings.json          # 编辑器配置
│   └── extensions.json        # 推荐插件
└── package.json               # lint-staged 配置 + scripts
```

### 规则严格度分级

```
error（必须修复）：
  - no-unused-vars（未使用变量）
  - no-undef（未定义变量）
  - eqeqeq（严格等号）

warn（建议修复）：
  - no-console（console）
  - @typescript-eslint/no-explicit-any（any）

off（关闭）：
  - 与 Prettier 冲突的规则
  - 项目不需要的规则
```

### 逐步引入规范

```
已有项目引入规范的策略：

1. 先加 Prettier（格式化，不改变行为）
   → npx prettier . --write
   → 一次性格式化，commit

2. 再加 ESLint（只报 warn，不阻断）
   → 先用 warn 级别，让团队适应
   → 后续逐步升级为 error

3. 最后加 Husky + lint-staged
   → 确保新提交的代码符合规范
   → 旧代码不强制修改

4. 逐步收紧
   → CI 中 --max-warnings 0 逐步启用
   → 旧 warning 修完后再设为 error
```

---

## 参考

- [ESLint 官方文档](https://eslint.org/docs/latest/)
- [Prettier 官方文档](https://prettier.io/docs/)
- [Stylelint 官方文档](https://stylelint.io/)
- [Husky 官方文档](https://typicode.github.io/husky/)
- [lint-staged GitHub](https://github.com/lint-staged/lint-staged)
- [commitlint 官方文档](https://commitlint.js.org/)
- [Conventional Commits 规范](https://www.conventionalcommits.org/)
- [EditorConfig 规范](https://editorconfig.org/)
- [typescript-eslint 文档](https://typescript-eslint.io/)
- [eslint-plugin-vue 文档](https://eslint.vuejs.org/)
