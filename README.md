# fuanzang.github.io

基于 VitePress 搭建的个人站点 —— 知识库、博客与作品展示。

## 技术栈

- VitePress 1.6.4 + Vue 3 Composition API
- GSAP 3.15（首页动画、视差滚动）
- GitHub Pages 自动部署

## 快速开始

```bash
npm install          # 安装依赖
npm run docs:dev     # 启动开发服务器
npm run docs:build   # 构建
npm run docs:preview # 预览构建结果
```

## 目录结构

```
docs/
├── .vitepress/
│   ├── config.mjs          # 站点配置（导航、侧边栏）
│   └── theme/              # 自定义主题
│       ├── index.js        # 主题入口
│       ├── Layout.vue      # 全局布局（滚动进度条、GSAP 动画）
│       ├── CoolHome.vue    # 首页 Hero 组件
│       ├── NotesIndex.vue  # 笔记总览组件
│       └── style.css       # 全局样式
├── components/             # Vue 组件
│   ├── ToolsBox.vue        # 工具箱外壳
│   ├── RecipesTracker.vue  # 菜谱组件
│   ├── NavLinks.vue        # 导航组件
│   ├── tools/              # 8 个独立工具组件
│   ├── transforms.js       # 编解码转换纯函数
│   └── useTool.js          # 共享 hook（复制、toast）
├── data/
│   ├── recipes.json        # 117 道菜谱数据
│   ├── tools.js            # 20 款工具定义
│   └── navLinks.js         # 112 导航链接
├── notes/                  # 技术笔记（9 大分类，70 篇）
│   ├── foundations/         # 前端基础（17 篇）
│   ├── frameworks/          # 框架（10 篇）
│   ├── engineering/         # 工程化（13 篇）
│   ├── performance/         # 性能与质量（6 篇）
│   ├── deploy/              # 部署（4 篇）
│   ├── backend/             # 后端（5 篇）
│   ├── cross-platform/      # 跨端（3 篇）
│   ├── practice/            # 场景实战（7 篇）
│   ├── frontier/            # AI 与前沿（6 篇）
├── algorithm/             # 算法题库（64 题）
├── blog/                   # 博客文章
├── public/                 # 静态资源
├── about.md                # 关于页
├── nav.md                  # 导航页
├── recipes.md              # 菜谱页
├── tools.md                # 工具箱页
└── index.md                # 首页入口
```

## 功能模块

- **首页**：沉浸式 Hero（打字机、视差滚动、3D 卡片倾斜、渐变光球）
- **笔记**：71 篇技术文章，覆盖前端全栈知识体系
- **工具箱**：20 款纯前端工具（Base64、JSON、正则、密码、二维码等），数据不上传
- **菜谱**：117 道家常菜谱，支持搜索/分类/随机推荐
- **导航**：15 个分类、112 开发网站速查
- **算法题库**：64 题 LeetCode 练习，每日自动生成
- **博客**：技术文章与经验分享

## 开发规范

采用 Angular 风格的 Conventional Commits：

```
<type>(<scope>): <subject>
```

| type | 含义 | type | 含义 |
|------|------|------|------|
| `feat` | 新功能 | `refactor` | 重构 |
| `fix` | 修复 bug | `perf` | 性能优化 |
| `docs` | 文档改动 | `chore` | 构建/工具/依赖 |
| `style` | 代码格式 | `ci` | CI/CD 配置 |
| `test` | 测试相关 | `build` | 构建系统 |

规则：`subject` 使用中文、不加句号；`scope` 可选（如 `notes`、`theme`、`home`）

## 部署

Push 到 `main` 分支后，GitHub Actions 自动构建并部署到 GitHub Pages。
