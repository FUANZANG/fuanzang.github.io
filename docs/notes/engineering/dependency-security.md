# 依赖与供应链安全

> npm 侧以 [npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/)、[npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)、[provenance / audit signatures](https://docs.npmjs.com/viewing-package-provenance/) 为准。Python / uv 侧以 Astral [uv audit 公告](https://astral.sh/blog/uv-audit) 与 [preview features](https://docs.astral.sh/uv/concepts/preview/) 为准（`uv audit` 目前为 preview，行为可能迭代）。包管理基础见 [包管理器](/notes/engineering/package-manager)、[Python 生态](/notes/python/python-ecosystem)；密钥与环境见 [多环境配置](/notes/engineering/env-config)。

## 1. 供应链在怕什么

| 风险 | 表现 |
|------|------|
| **已知漏洞** | 依赖里有公开 CVE，可被扫描到 |
| **投毒 / 恶意包** | typosquat、账户劫持后发恶意版本 |
| **锁文件被篡改** | PR 改 `resolved`/`integrity` 指向恶意产物 |
| **构建不可追溯** | 不知道包是不是从声称的仓库/CI 打出来的 |

目标不是「零告警」，而是：**安装可复现、变更可审、高危可挡、机密不进包**。

## 2. Node：锁文件 + CI 冻结安装

按 npm 文档：

```bash
# 开发可改锁
npm install

# CI / 发布：必须有 lock；与 package.json 不一致则失败；不写回 lock
npm ci
```

- **提交** `package-lock.json`（或等价锁）。  
- 生产/CI 用 **`npm ci`**，不要用会改树的 `npm install`。  

注意：锁文件里的 `integrity` 只保证「和锁定时同一产物」；若锁本身被恶意改掉，hash 会对着坏产物也对得上——所以还要审 PR、尽量做签名校验（见下）。

## 3. `npm audit` 与签名

```bash
npm audit
npm audit fix                 # 能自动修的会改树；审 diff
npm audit --audit-level=high  # CI：高危及以上失败（按团队策略调）
npm audit signatures          # 校验 registry 签名 + provenance 证明（需较新 npm）
```

要点（官方）：

- `audit` 向 registry 提交依赖描述，换回已知漏洞报告；无漏洞时 exit 0。  
- 默认需要 lock；部分漏洞无法自动 fix。  
- **`npm audit signatures`**：验证已下载包的签名与 provenance；缺失/无效会报错，有助于发现「锁指向了不像官方发布的东西」。查看 provenance 说明见 [Viewing package provenance](https://docs.npmjs.com/viewing-package-provenance/)。

GitHub Dependabot / 同类机器人：持续告警与修 PR；**CI audit 是门禁，Dependabot 是雷达**——两者互补。

## 4. Python：uv audit（preview）

Astral 宣布的能力（以当前文档为准，标记为 preview）：

```bash
uv audit                 # 查已知漏洞等；有问题非 0 退出
# 可选：安装路径上的恶意包检查（需显式开启，见官方 blog）
UV_MALWARE_CHECK=1 uv sync
```

- 默认走 OSV 一类数据源；细节与忽略 advisory 的参数随版本看 `uv audit --help`。  
- 也可用 PyPA **`pip-audit`**（导出 requirements 再扫）；与 `uv audit` 数据库可能不同，结果数量不必强求一致。  
- CI 建议锁文件提交 + 审计失败即红。

## 5. 工程清单

1. 锁文件进 git；CI `npm ci` / `uv sync --locked`（或等价）。  
2. PR 必看锁文件 diff（尤其 `resolved` URL）。  
3. CI 跑 `npm audit`（设 `--audit-level`）+ 有条件跑 `npm audit signatures`。  
4. Python 项目跑 `uv audit`（接受 preview）或 `pip-audit`。  
5. 限制谁能发版、启用 2FA；少用「任意 git URL 依赖」。  
6. 前端 `VITE_*` 永不放密钥（配置笔记）。  

## 参考

- [npm-audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/)
- [npm-ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [npm provenance](https://docs.npmjs.com/viewing-package-provenance/)
- [uv audit（Astral blog）](https://astral.sh/blog/uv-audit)
- [uv preview features](https://docs.astral.sh/uv/concepts/preview/)
