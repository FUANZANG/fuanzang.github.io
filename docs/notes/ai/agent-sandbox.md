# Agent 沙箱与 Code Agent

> 本文基于 2026-11 时点的执行隔离实践（E2B / 开源 microVM 沙箱 / 自建 Docker 方案）。[Agent 设计模式](/notes/ai/agent-patterns) 讲隔离阶梯概念；本篇讲**Coding Agent 怎么安全动手、产物怎么出来、权限怎么批**。
>
> 关联：[Agent Harness](/notes/ai/agent-harness)（E 层）、[MCP 与工具调用](/notes/ai/mcp-tools)、[AI Coding 工作流](/notes/ai/ai-coding-workflow)、[Agent 基建](/notes/ai/agent-infra)、[LangGraph](/notes/ai/langgraph)（HITL interrupt）。

## 定位：大脑在外，手在沙箱里

Coding Agent = 能读改文件、跑命令、偶尔起预览服务的 agent。危险不在「会写 TypeScript」，而在**命令跑在谁的内核上、凭据碰不碰得到**。

硬规则：

1. **循环与密钥留在信任域**（你的后端 / LangGraph）
2. **不可信代码进沙箱**（独立根文件系统与网络策略）
3. **出站默认拒绝**，只开白名单；封云元数据端点
4. **高危动作要 HITL**（删库、推生产、读密钥文件）

## 选型：隔离强度 vs 成本

延续模式篇的阶梯，Coding Agent 场景下的常用落点：

| 方案 | 隔离 | 适合 | 代价 |
|---|---|---|---|
| 本机 Docker 容器 | 共享宿主内核 | 内网、可信开发者 | 运维自己扛；内核逃逸面仍在 |
| **E2B** 等 microVM | 自带 guest 内核 | 多租户、不可信用户代码 | 按秒计费；网络/冷启要设计 |
| 开源自托管沙箱（OpenSandbox 一类） | 视实现（容器～microVM） | 要数据不出域 | 自己维护镜像与编排 |
| WebContainer | 浏览器内 WASM Node | 演示、教学、无后端预览 | 能力边界紧；非服务端执行 |

**2026 默认**：面向不可信租户的「在线跑代码」→ microVM；团队内部工具且代码可信 → 强化配置的容器也可能够用。别用「进程内 `eval`」糊弄生产。

## Coding Agent 参考架构

```
用户 / IDE
   ↓
Agent 循环（工具决策、HITL、记忆）——信任域
   ↓ 下发「执行请求」
沙箱后端（创建/复用/销毁会话，挂载策略）
   ↓
沙箱实例（装好的语言运行时 + 只读工具链）
   ↓ 产物
对象存储 / 预览 URL（见 [Agent 基建](/notes/ai/agent-infra)）
```

会话生命周期常见能力：

+ **创建**：镜像、CPU/内存、超时、网络策略
+ **复用 / pause-resume**：保留工作区，省冷启（产品若承诺「接着改」就需要）
+ **挂载点**：只读模板 vs 可写 workspace；密钥文件尽量不挂，用短时注入
+ **销毁**：超时与显式 teardown，防止僵尸 VM 烧钱

E2B 最小执行（密钥留在宿主机环境变量，不进沙箱镜像）：

```python
# pip: e2b-code-interpreter
from e2b_code_interpreter import Sandbox

with Sandbox.create() as sbx:          # 一次会话一个隔离环境
    ex = sbx.run_code("print(2 + 2)")  # 代码在沙箱里跑
    print(ex.logs.stdout)              # → ['4\n']
    # 不要：把 OPENAI_API_KEY 写进 run_code 字符串
# with 结束即销毁；长任务要显式设 timeout / pause 策略
```

本地 Docker 等价心智：`docker run --network none --read-only -v workspace:/workspace:rw ...`——先把网络和根文件系统收紧，再谈功能。

## 权限与 HITL

工具权限建议分层，而不是「全开 bash」：

| 级别 | 例子 | 策略 |
|---|---|---|
| 只读 | 列目录、读文件、跑测试（无写） | 可自动 |
| 工作区写入 | 改 src/、装依赖到 workspace | 可自动或按路径白名单 |
| 高危 | `rm -rf`、推远程、读 `~/.ssh`、碰生产 API | **必须审批** |
| 网络 | 任意出站 | 默认关；按域名开 |

HITL 中间件形态（LangGraph 里就是 interrupt 前后）：

```
模型提出 tool_call
  → 策略引擎判定级别
  → 高危：推给前端展示参数，等人 approve / edit / deny
  → 恢复执行或改写参数后再进沙箱
```

「先计划再行动」适合破坏性任务：先输出计划（只读分析），人点确认再进入写入工具集——与 [AI Coding 工作流](/notes/ai/ai-coding-workflow) 的 Spec 门禁一致。

路径白名单 + 高危拦截（信任域里、进沙箱前）：

```python
from pathlib import PurePosixPath

ALLOWED_ROOT = PurePosixPath("/workspace")
DANGEROUS = ("rm", "git push", "curl", "wget")

def assert_safe_path(path: str) -> PurePosixPath:
    p = PurePosixPath(path)
    if ".." in p.parts:
        raise PermissionError(f"path escape: {path}")
    full = (ALLOWED_ROOT / p).resolve() if not p.is_absolute() else p
    if ALLOWED_ROOT not in full.parents and full != ALLOWED_ROOT:
        raise PermissionError(f"outside workspace: {path}")
    return full

def classify_command(cmd: str) -> str:
    low = cmd.strip().lower()
    if any(low.startswith(d) or f" {d} " in f" {low} " for d in DANGEROUS):
        return "hitl"   # 必须审批
    if low.startswith(("ls", "cat", "pytest", "npm test")):
        return "auto"
    return "hitl"       # 默认收紧：未知命令也要人审
```

## 产物预览与技能注入

用户要的往往不是「命令 stdout」，而是**可点开的结果**：

+ 静态站点 / 截图 / 数据包 → 上传对象存储 → 返回预览链接
+ 沙箱直传 MinIO（预签名）减少后端扛大文件
+ 同 run 多步可用共享卷；跨 run 只信对象存储里的版本

技能（Skill）与 MCP 仍在信任域装配：沙箱里只放执行所需的最小工具。Skill 描述「何时用沙箱、产物命名规范」；真正执行 API 由沙箱后端暴露。对比见 [Agent Skill](/notes/ai/agent-skills) 与 [MCP](/notes/ai/mcp-tools)。

## 三个坑

1. **密钥进镜像**：烤进镜像的 token 会随快照泄漏；用运行时注入 + 短 TTL
2. **出站没管**：沙箱里 `curl` 到云元数据或内网 Redis = 横向移动；默认 deny
3. **无限会话**：忘记 teardown → 账单与僵尸进程；务必有 TTL 与并发上限

## 前端视角

+ 沙箱会话 ≈ 远程开发容器的「按次租用」；UI 需要：状态（创建中/就绪/超时）、日志流、审批卡片
+ 产物预览 ≈ 上传后的 iframe / 新标签；注意 CSP 与临时 URL 过期
+ 权限分级 ≈ 操作系统权限提示：读相册可自动，删全部要二次确认
+ 与本地 IDE agent 分工：本地改可信仓库；多租户「用户代码」必须进沙箱

## 学习路径建议

1. 用 E2B（或本地 Docker）跑「在隔离环境执行 `pytest`」的最小工具，密钥留在宿主机
2. 加路径白名单：只允许写 `/workspace`，尝试写 `/etc` 应失败
3. 给 `rm` / 推远程加 HITL：未批准时工具层直接拒绝
4. 跑通「生成 HTML → 预签名上传 → 返回预览 URL」
5. 接到 [LangGraph](/notes/ai/langgraph) 的 interrupt，或接到 [Agent 基建](/notes/ai/agent-infra) 的网关与存储

## 参考

+ [E2B 文档](https://e2b.dev/docs) · [Vercel Sandbox](https://vercel.com/sandbox) · [Firecracker](https://firecracker-microvm.github.io)
+ 本站：[Agent 设计模式](/notes/ai/agent-patterns) · [AI Coding 工作流](/notes/ai/ai-coding-workflow) · [Agent 基建](/notes/ai/agent-infra)
