# 提交规范（Conventional Commits）

本项目采用 Angular 风格的 Conventional Commits 规范。

## 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

- `type`（必需）：提交类型
- `scope`（可选）：影响范围，简单改动可省略
- `subject`（必需）：简短描述，使用中文

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
feat(notes): 新增 H5 响应式布局笔记

# 修复 bug
fix(theme): 修复侧边栏在移动端的溢出问题

# 重构
refactor(home): 精简首页动画逻辑

# 文档
docs(readme): 更新安装说明

# 构建
chore(deps): 升级 vitepress 到 v1.6.4

# 简单改动可省略 scope
fix: 修复首页导航链接
```

## 规则

1. `subject` 使用中文描述
2. `subject` 不加句号
3. `body` 每行不超过 72 个字符
4. `scope` 可选，复杂改动建议加上以便区分
