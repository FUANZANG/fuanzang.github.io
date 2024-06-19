# 提交规范（Conventional Commits）

本项目采用 Angular 风格的 Conventional Commits 规范。

## 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

- `type`（必需）：提交类型
- `scope`（可选）：影响范围
- `subject`（必需）：简短描述

## 常用类型

| 类型 | 含义 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档改动 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具/依赖等杂项 |
| `ci` | CI/CD 配置 |
| `build` | 构建系统 |

## 示例

```bash
# 新功能
feat(docs): add blog section with markdown support

# 修复 bug
fix(theme): resolve scroll-hint cut off by VPContent padding

# 重构
refactor(home): simplify GSAP scroll animations

# 文档
docs(readme): update installation guide

# 构建
chore(deps): upgrade vitepress to v1.6.4
```

## 规则

1. `subject` 使用**小写**开头，不加句号
2. `subject` 不超过 50 个字符
3. `body` 每行不超过 72 个字符
4. 使用**现在时**（"add feature" 而非 "added feature"）
