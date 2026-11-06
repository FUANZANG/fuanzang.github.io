# Web Agent（让 Agent 操作浏览器）

> 本文基于 2026-11 时点生态（browser-use 0.13 / Stagehand 4.4 / Playwright MCP 0.0.84 / Skyvern 1.0，版本号取自 2026-11-06 的 npm 与 PyPI）。
>
> 关联：[MCP 与工具调用](/notes/ai/mcp-tools)（浏览器工具常以 MCP 交付）、[Agent 设计模式](/notes/ai/agent-patterns)（工具执行循环）、[Agent 接入与部署](/notes/ai/agent-deployment)（登录态与凭据放哪）。

## 定位：浏览器是覆盖面最广的工具

任何没有 API 的 Web 服务，浏览器都是它的"万能接口"——读页面（≈ 取数）、点按钮（≈ 调接口）、填表单（≈ 写数）。让 agent 获得这双手，就是 Web Agent 这条线。

先切两个相邻概念：

+ **Web Agent**：驱动**网页**，基于页面结构（DOM / 可访问性树）定位元素，精确且便宜
+ **Computer-Use**：看**屏幕像素**、点坐标——能驱动任何桌面应用（含无 Web 版的软件），但精度和成本都差一档

## 根本分野：agent 怎么"看见"页面

| 方式 | 特点 | 代表 |
|---|---|---|
| **DOM / 可访问性树（a11y tree）** | 结构化、便宜、可靠；对恶意门户 / 强反爬无效 | Playwright MCP、browser-use 默认 |
| **视觉（像素）** | 像人一样看页面，UI 改版也能扛；贵、精度低 | Skyvern、computer-use |
| **混合** | 结构为主、截图兜底 | browser-use 可选视觉、Stagehand 三工具组合 |

a11y tree（accessibility tree，浏览器给屏幕阅读器用的页面语义树）：agent 读它拿到"带编号的交互元素列表"，回"点击元素 7"——比让模型盯像素猜坐标稳得多。

## 生态版图（2026 四形态）

| 项目 | 定位 | 形态 | 协议 / 许可 |
|---|---|---|---|
| **Playwright MCP**（0.0.84） | **不是 agent**——把浏览器控制暴露成 MCP 工具（click / type / navigate），a11y 树优先、视觉可选 | 工具层（MCP server） | Apache-2.0，任何会 MCP 的模型都能用 |
| **browser-use**（0.13） | 目标级自治："任务进、结果出"（Python 栈最大社区，~114k stars） | agent 框架 | MIT；自带 bu 系列模型 + 托管云 |
| **Stagehand**（4.4） | "Playwright 为测试而生，Stagehand 为 agent 而生"：act / extract / observe / agent 四原语 + **自愈**（指令解析成选择器，UI 改版不崩） | SDK（TS 优先） | MIT；v4 走 CDP、浏览器内扩展、一次批量动作 |
| **Skyvern**（1.0） | 视觉优先，专攻**写操作 RPA**：表单、登录、下载、CAPTCHA、2FA/TOTP | 工作流平台 | AGPL-3.0（强 copyleft）核心 + 云；自托管 Docker + 自带模型 |

**框架 vs MCP server 的分界**：框架 = 你用它，loop 和浏览器都是它的；MCP server = 给你**自己的** loop 一双手。决策就一句：**交接环，还是只接工具**。

认脸即可：Browserbase（托管浏览器基础设施，Stagehand 出品方）、Claude in Chrome（agent 住进你自己已登录的浏览器）、OpenAI ChatGPT Agent（托管式"任务进结果出"）。

一个有参考意义的横评（LangChain 2026 测试，WebVoyager 300 任务）：Stagehand 90% 通过率、总成本 $1.98；Playwright MCP 78%、$26.71——**工具设计（批量动作、a11y 上下文压缩）对成本的影响是数量级的**，印证 harness 篇"工具格式优化超过模型升级"。

## 选型判据

1. 已有 agent（编码 agent、自建循环）要加浏览器手 → **Playwright MCP**（或任意浏览器 MCP），保持自己的 loop
2. 整段任务交给自治 agent、Python 栈 → **browser-use**
3. TS 栈、团队长期维护的浏览器自动化 → **Stagehand**（能确定性 Playwright 的地方就写死，只在不稳的地方用 AI）
4. 老门户写操作（登录 / 验证码 / 2FA 密集）→ **Skyvern**（注意 AGPL 对自托管产品的传染边界）

## 前端视角（你的主场）

+ **a11y 树 = 你应用的可达性层**：agent 的成败很大程度由你的语义质量决定——无 label 的裸 div、纯图标按钮、动态 DOM 乱改，都是 agent 的绊脚石。**"agent-friendly 前端" ≈ 为读屏器写语义 HTML**，同一套功力
+ 页面在 agent 眼里 ≈ 你的 DOM：结构化数据（元素列表 + 编号）永远比像素便宜可靠
+ 登录态（cookie / session）与凭据的管理是部署问题，不在 agent 代码里——见 [Agent 接入与部署](/notes/ai/agent-deployment)

## 三个必踩的坑

1. **成本爆炸**：每步截图 + 全量 a11y 上下文 = token 平方级增长；压缩策略（只发变化区、批量动作）是第一优化项
2. **登录态墙**：2FA / CAPTCHA 是自治 agent 的边界——要么 Skyvern 式专项能力，要么**人机交接**（停下来给人，人在自己的浏览器里过验证再继续）
3. **反爬与指纹**：agent 流量特征明显，托管浏览器（Browserbase 类）常带指纹管理；自托管要自己处理

## 学习路径建议

1. 给一个现成 agent（如 Claude Code / 自建 TS 循环）挂上 **Playwright MCP**，让它开一个页面读点东西——体会"只接工具"
2. 用 **Stagehand** 写 `act("点击提交")` 级操作，观察自愈：改一次 DOM 结构再看它还找不找得到
3. 读 [MCP 与工具调用](/notes/ai/mcp-tools) 的工具链安全节：给 agent 装任何浏览器 MCP 前，先看它的来源与权限
4. 有登录场景就试 Skyvern 的 2FA/TOTP 流，体会"视觉优先"在写操作上的价值

## 参考

+ [Playwright MCP](https://github.com/microsoft/playwright-mcp) · [browser-use](https://github.com/browser-use/browser-use) · [Stagehand](https://github.com/browserbase/stagehand) · [Skyvern](https://github.com/Skyvern-AI/skyvern)
+ [OWASP MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)
+ 本站：[MCP 与工具调用](/notes/ai/mcp-tools) · [Agent 设计模式](/notes/ai/agent-patterns) · [Agent 接入与部署](/notes/ai/agent-deployment)
