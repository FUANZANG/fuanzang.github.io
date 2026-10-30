# mise — 多语言开发工具版本管理器

> 📅 基于版本：mise 3.x（原名 rtx）
>
> 官网：https://mise.jdx.dev/

---

## 1. 是什么

**mise**（读作 "meez"，来自法语 *mise en place*，原 rtx）是一个跨平台的**多语言运行时与工具版本管理器**，同时兼具 Task Runner 和 Dotenv 管理功能。

一句话：它用一个工具替代 `nvm + pyenv + tfenv + ...`，在切换目录时自动激活对应版本。

| 功能 | 类比 |
|------|------|
| 多语言版本管理 | asdf / nvm / pyenv |
| 自动切换版本 | direnv |
| Task Runner | make / just |
| 环境变量管理 | dotenv / direnv |
| Daemon 管理 | pitchfork（插件） |

支持的插件超过 **2000 个**，包括 Node、Python、Rust、Go、Ruby、Terraform、jq、docker-buildx 等几乎所有常用开发工具。

---

## 2. 安装

### macOS

```bash
# Homebrew
brew install mise

# 或使用官方脚本
curl https://mise.run | sh
```

### Linux / Windows

```bash
# 官方安装脚本（支持 Linux / Windows WSL）
curl https://mise.run | sh
```

安装后需要在 shell 配置文件中激活：

```bash
# ~/.zshrc 或 ~/.bashrc
eval "$(mise activate zsh)"   # 替换为 bash/fish
```

激活后 mise 会在每次进入目录时自动读取配置文件并切换版本。

---

## 3. 基本用法

### 查看版本

```bash
mise current            # 列出全局已配置的所有工具及版本
mise current node       # 查看当前目录生效的 node 版本（项目 pin 优先）
mise ls                 # 列出本机已安装的所有版本（含未激活的）
```

### 安装工具版本

```bash
mise install node@22.13.0       # 安装特定版本
mise install python@3.13        # 安装 Python
mise install terraform@1.7.4    # 安装 Terraform
```

### 设置项目版本（写入 `mise.toml`）

```bash
mise use -g node@22             # 全局默认（~/.config/mise/config.toml）
mise use node@22                # 仅当前项目（写入 mise.toml）
mise use python@3.13.4
```

执行后会在项目根目录生成 `mise.toml`：

```toml
[tools]
node = "22"
python = "3.13.4"
```

### 自动切换到正确版本

```bash
# 进入有 mise.toml 的项目目录，mise 自动安装并激活声明的版本
cd my-project
# mise 会在后台静默安装缺失的版本
```

### 安装 CLI 工具（npm backend）

mise 可以通过 `npm:` 前缀直接从 npm registry 安装全局 CLI 包，等价于 `npm install -g`：

```bash
# 全局安装
mise use --global npm:pnpm@11.21.0
mise use --global npm:typescript@5.6.3

# 项目级（写入 mise.toml，仅当前项目生效）
cd my-project
mise use npm:serve@14.2.6
```

安装后的 `mise.toml` 或全局配置（`~/.config/mise/config.toml`）内容：

```toml
[tools]
"npm:pnpm" = "11.21.0"
"npm:typescript" = "5.6.3"
"npm:serve" = "14.2.6"
```

mise 会将二进制暴露到 `~/.local/share/mise/shims/`，激活 shell 后自动加入 PATH。

> 与 Volta 的对比：`volta install pnpm` ≈ `mise use --global npm:pnpm@latest`，行为等价，但 mise 不依赖 Volta 的运行时机制。

---

## 4. 配置方式

### 项目级：`mise.toml`

放在仓库根目录，提交到 git：

```toml
[tools]
node = "22"
python = "3.13"
rust = "1.80"
go = "1.22"
terraform = "1.7"
jq = "latest"

# 可选：设置任务
[tasks.build]
run = "npm run build"
depends = ["node"]

[tasks.test]
run = "npm test"
depends = ["build"]
```

### 全局配置：`~/.config/mise/config.toml`

```toml
[tools]
jq = "latest"
curl = "latest"
git = "latest"
node = "24"

[settings]
jobs = 3                        # 并行安装任务数
skip_missing_depends = true     # 跳过依赖项缺失（不中断）
legacy_version_file = true      # 支持 .nvmrc / .ruby-version 等旧格式
```

> ⚠️ 全局和项目的 tools 节名相同（都是 `[tools]`），只是文件路径不同：项目用 `mise.toml`，全局用 `~/.config/mise/config.toml`。

### 兼容旧格式

mise 可以读取并转换传统版本文件：

| 旧文件 | mise 支持 |
|--------|-----------|
| `.nvmrc` | ✅ 自动读取并转为 node 版本 |
| `.tool-versions`（asdf） | ✅ 完全兼容 |
| `.python-version` | ✅ |
| `.ruby-version` | ✅ |
| `.go-version` | ✅ |

```toml
[settings]
legacy_version_file = true      # 启用旧格式兼容
alias.node.lts = "lts/*"        # 可自定义别名
```

---

## 5. Task Runner

mise 内置任务管理，在 `mise.toml` 中定义：

```toml
[tasks.dev]
run = "npm run dev"
description = "启动开发服务器"

[tasks.build]
run = "npm run build"
description = "构建生产版本"

[tasks.test]
run = "pnpm test"
description = "运行测试"
depends = ["build"]          # 自动先跑 build 任务

[tasks.deploy]
run = "terraform apply"
description = "部署基础设施"
env.TERRAFORM_VAR = "prod"
```

运行：

```bash
mise run dev        # 运行单个任务
mise run test       # 自动先执行 depends 中的任务
mise run --list     # 列出所有任务
```

---

## 6. 环境变量管理

```toml
[env]
DATABASE_URL = "postgres://localhost:5432/mydb"
API_KEY = "{{ secrets.API_KEY }}"   # 从密钥管理器注入
```

或使用命令行：

```bash
mise local DATABASE_URL=postgres://localhost:5432/db   # 项目级
mise global API_KEY=abc123                              # 全局级
```

---

## 7. 常用命令速查

| 命令 | 说明 |
|------|------|
| `mise install` | 安装 `mise.toml` 中声明的所有工具版本 |
| `mise use <tool>@<ver>` | 在项目配置中声明工具版本 |
| `mise use -g <tool>@<ver>` | 全局设置工具版本 |
| `mise current` | 显示当前激活的所有工具和版本 |
| `mise ls` | 列出所有已安装版本 |
| `mise upgrade` | 升级 mise 自身 |
| `mise install -g node@22` | 全局安装 Node |
| `mise run <task>` | 运行定义的任务 |
| `mise trust <path>` | 信任项目的 `mise.toml`（CI 环境需要） |
| `mise x <cmd>` | 在指定工具版本下运行命令（不切换 shell） |
| `mise x node -- npm run build` | 用当前版本执行 node 命令 |

---

## 8. 与 Volta / nvm 对比

| 特性 | mise | Volta | nvm |
|------|------|-------|-----|
| 多语言支持 | ✅ 2000+ 插件 | ❌ 仅 Node | ❌ 仅 Node |
| Task Runner | ✅ | ❌ | ❌ |
| 环境变量管理 | ✅ | ❌ | ❌ |
| 兼容旧格式 | ✅（.nvmrc 等） | ✅ | ✅ |
| 自动切换 | ✅ | ✅ | ✅ |
| Node + 包管理器锁定 | ✅ | ✅（原生支持） | ❌ |
| CLI 工具管理 | ✅（`npm:` backend） | ✅（原生支持） | ❌ |
| 跨平台 | ✅ | ✅ | ✅ |
| 激活方式 | shell hook | shell hook | shell hook |

**选型建议：**
- 纯 Node 前端项目 → **Volta**（更简单，包管理器锁定体验更好）
- 多语言 / 全栈项目（Node + Python + Go + Terraform）→ **mise**
- 已有 nvm 习惯不想迁移 → 继续用 nvm，但 mise 可以替代它

---

## 9. 注意事项

1. **首次进入项目可能较慢**：mise 需要检查并安装未安装的工具版本，建议提前 `mise install` 预热。
2. **Windows 支持有限**：部分插件（如 Python）在 Windows 上有兼容问题，推荐 WSL。
3. **信任机制**：CI 环境需要运行 `mise trust <project-path>` 才能激活，否则会忽略 `mise.toml`。
4. **不要和 nvm 混用**：两者都管理 Node 版本，会产生冲突；选择其中一个即可。
