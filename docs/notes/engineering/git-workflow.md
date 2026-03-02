# Git 工作流

> 📌 本文件记录 Git 核心命令、分支策略（GitFlow / GitHub Flow / Trunk-Based）、rebase vs merge、cherry-pick、以及团队协作最佳实践。

---

## 1. 分支策略对比

### GitFlow

适合有明确发版节奏的项目（如移动 App、定期版本发布）：

```
main          — 生产代码，只接受 release/hotfix 合并
develop       — 集成分支，feature 合并到这里
feature/*     — 功能开发，从 develop 切出，合并回 develop
release/*     — 发版准备，从 develop 切出，修 bug 后合并到 main + develop
hotfix/*      — 生产 bug 修复，从 main 切出，合并到 main + develop
```

```bash
# 开始新功能
git checkout -b feature/login develop

# 完成功能
git checkout develop
git merge --no-ff feature/login  # --no-ff 保留合并节点，可追踪历史
git branch -d feature/login

# 准备发版
git checkout -b release/1.2 develop
# 修复发版 bug，更新版本号...
git checkout main
git merge --no-ff release/1.2
git tag -a v1.2 -m "Release 1.2"
git checkout develop
git merge --no-ff release/1.2
git branch -d release/1.2
```

**优点**：结构清晰，适合多版本并行维护
**缺点**：分支多、流程重，持续交付场景下摩擦大

### GitHub Flow

简化版，适合 Web 应用持续部署：

```
main          — 始终是可部署状态
feature/*     — 从 main 切出，PR 合并回 main，合并后立即部署
```

```bash
git checkout -b feature/search main
# 开发、提交...
# 发 PR，Code Review，通过后合并到 main，自动部署
```

**优点**：简单，适合 CI/CD，部署频率高
**缺点**：不适合需要维护多个版本的项目

### Trunk-Based Development（主干开发）

所有人直接提交到 `main`（trunk），用 Feature Flag 控制功能可见性：

```bash
# 小团队：直接提交
git commit -m "feat: add search"
git push origin main

# 大团队：短生命周期分支（1-2天合并）
git checkout -b feat/search
# 快速开发，尽快合并，避免长期分支
```

**核心原则**：
- 分支生命周期不超过 1-2 天
- 频繁集成（每天多次合并到主干）
- 未完成的功能用 Feature Flag 隐藏，不用分支隔离

**优点**：集成冲突最小，适合 CI/CD，Google/Facebook 等大型团队采用
**缺点**：需要完善的测试覆盖和 Feature Flag 基础设施

### 选型建议

| 场景 | 推荐策略 |
|------|---------|
| 定期版本发布（移动 App、桌面软件） | GitFlow |
| Web 应用持续部署，小团队 | GitHub Flow |
| 高频发布，成熟 CI/CD，大团队 | Trunk-Based |

---

## 2. merge vs rebase

### merge

```bash
git checkout main
git merge feature/login
```

```
Before:
  main:    A - B - C
  feature:     B - D - E

After merge:
  main:    A - B - C - M   ← M 是合并提交
                  \   /
  feature:         D - E
```

- 保留完整历史，可看到分支合并节点
- `--no-ff` 强制产生合并提交（即使可以 fast-forward），便于 `git log --graph` 查看

### rebase

```bash
git checkout feature/login
git rebase main
```

```
Before:
  main:    A - B - C
  feature:     B - D - E

After rebase:
  main:    A - B - C
  feature:         C - D' - E'  ← D、E 被重新应用，产生新提交
```

- 历史线性，`git log` 清晰
- **黄金法则：不要 rebase 已推送到远端的公共分支**，会改写历史，导致他人混乱

### interactive rebase（整理提交历史）

```bash
# 整理最近 3 个提交
git rebase -i HEAD~3
```

编辑器中可以：
```
pick abc1234 feat: add login form
squash def5678 fix: typo in login          ← squash 合并到上一个提交
reword ghi9012 feat: add validation        ← reword 修改提交信息
drop   jkl3456 wip: debug logs             ← drop 删除此提交
```

常用操作：

| 命令 | 作用 |
|------|------|
| `pick` | 保留提交 |
| `squash` / `s` | 合并到前一个提交 |
| `fixup` / `f` | 合并到前一个提交，丢弃此提交的 message |
| `reword` / `r` | 保留提交，修改 message |
| `drop` / `d` | 删除此提交 |
| `edit` / `e` | 暂停，允许修改提交内容 |

### merge vs rebase 选择

| 场景 | 推荐 |
|------|------|
| 将主干更新同步到功能分支 | `rebase` — 保持线性历史 |
| 功能分支合并到主干（团队项目） | `merge --no-ff` — 保留分支合并记录 |
| 整理个人本地提交再推送 | `rebase -i` — 清理 WIP 提交 |
| 公共分支同步 | `merge` — 安全，不改写历史 |

---

## 3. cherry-pick

将某个提交应用到当前分支，不合并整个分支：

```bash
# 应用单个提交
git cherry-pick <commit-hash>

# 应用多个提交
git cherry-pick abc1234 def5678

# 应用一个范围（不含起始提交）
git cherry-pick abc1234..def5678

# 应用一个范围（含起始提交）
git cherry-pick abc1234^..def5678

# cherry-pick 但不自动提交（先检查再决定）
git cherry-pick --no-commit <commit-hash>
```

**典型场景**：
- hotfix 分支修复了 bug，需要把这个修复也应用到 develop
- 某功能只需要部分提交，不想合并整个分支

---

## 4. reset vs revert

### reset（本地修改，慎用于已推送的提交）

```bash
# --soft: 撤销提交，改动保留在暂存区
git reset --soft HEAD~1

# --mixed（默认）: 撤销提交，改动保留在工作区（未暂存）
git reset HEAD~1

# --hard: 撤销提交，改动全部丢弃（危险！）
git reset --hard HEAD~1

# 撤销到指定提交
git reset --hard <commit-hash>
```

### revert（安全，适合已推送的提交）

```bash
# 创建一个新提交来撤销指定提交的改动
git revert <commit-hash>

# 撤销但不自动提交
git revert --no-commit <commit-hash>
```

`revert` 不修改历史，适合在公共分支上撤销改动。

---

## 5. stash

```bash
# 保存当前工作区改动（不包含未跟踪的文件）
git stash

# 保存时附加描述
git stash push -m "wip: login form"

# 保存时包含未跟踪的文件
git stash push -u

# 查看 stash 列表
git stash list

# 恢复最新 stash（保留 stash 记录）
git stash apply

# 恢复并删除 stash 记录
git stash pop

# 恢复指定 stash
git stash apply stash@{2}

# 删除指定 stash
git stash drop stash@{0}

# 清空所有 stash
git stash clear
```

---

## 6. 标签（Tag）

```bash
# 轻量标签（只是一个指针）
git tag v1.0

# 附注标签（包含打标签者、日期、信息）
git tag -a v1.0 -m "Release 1.0"

# 给历史提交打标签
git tag -a v0.9 <commit-hash>

# 查看标签
git tag
git show v1.0

# 推送标签
git push origin v1.0
git push origin --tags   # 推送所有标签

# 删除本地标签
git tag -d v1.0

# 删除远端标签
git push origin --delete v1.0
```

---

## 7. 常用操作速查

### 修改最后一次提交

```bash
# 修改提交信息
git commit --amend -m "新的提交信息"

# 追加文件到最后一次提交
git add forgotten-file.js
git commit --amend --no-edit
```

> ⚠️ `--amend` 会改写历史，只用于**未推送**的提交。

### 找回丢失的提交（reflog）

```bash
# 查看所有操作历史（包括 reset 删掉的提交）
git reflog

# 恢复到某个状态
git reset --hard HEAD@{3}
```

### 子模块（submodule）

```bash
# 添加子模块
git submodule add https://github.com/example/lib.git libs/lib

# 克隆含子模块的仓库
git clone --recurse-submodules <repo-url>

# 已克隆的仓库初始化子模块
git submodule update --init --recursive

# 更新子模块到最新
git submodule update --remote
```

### 查看文件历史

```bash
# 查看某文件的提交历史
git log --follow -p -- src/utils/api.ts

# 查看某行代码是谁写的
git blame src/utils/api.ts

# 二分查找引入 bug 的提交
git bisect start
git bisect bad           # 当前是坏的
git bisect good v1.0     # v1.0 是好的
# Git 自动切换提交，测试后标记 good/bad，直到找到引入 bug 的提交
git bisect reset         # 结束二分查找
```

---

## 8. .gitignore 最佳实践

```gitignore
# 依赖
node_modules/
.pnp
.pnp.js

# 构建产物
dist/
build/
.next/
out/

# 环境变量（含密钥，绝对不提交）
.env
.env.local
.env.*.local

# 编辑器
.vscode/
.idea/
*.swp

# 系统文件
.DS_Store
Thumbs.db

# 日志
*.log
npm-debug.log*

# 测试覆盖率
coverage/
```

> 已被跟踪的文件需要先 `git rm --cached <file>` 再添加到 `.gitignore` 才会生效。
