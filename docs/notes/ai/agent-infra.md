# Agent 基础设施建设

> 本文基于 2026-11 时点的 Agent 生产基建实践（LiteLLM 类网关、配置中心、产物对象存储）。[Agent 接入与部署](/notes/ai/agent-deployment) 讲「agent 住哪、怎么触发」；本篇讲**多 agent / 多模型共享的那一层管道**。
>
> 关联：[AI 应用工程化](/notes/ai/ai-app-engineering)（成本与可靠性）、[AI 评测与可观测](/notes/ai/ai-eval-observability)、[Agent 沙箱](/notes/ai/agent-sandbox)、[vLLM 推理服务](/notes/ai/vllm-serving)、[Python LLM 开发](/notes/ai/python-llm-apps)。

## 定位：应用之上、模型之下

单个 demo 可以直接调 OpenAI SDK。团队里一旦出现「多个 agent、多家模型、要限流/回退/审计」，就会长出一层基建：

```
业务 Agent / LangGraph / 平台
        ↓
   AI 网关（统一 API、路由、凭证、策略）
        ↓
  模型提供商 / 自托管推理（vLLM 等）
```

旁路还有：**配置与资产注册**（哪个 agent 用哪模型）、**沙箱与产物存储**、**观测与评测**。缺任何一块，线上都能「偶发能用」。

## AI 网关：为什么要多一跳

网关解决的不是「多写一层 proxy」，而是把横切能力从业务代码里撕出来：

| 能力 | 没有网关时 | 有网关时 |
|---|---|---|
| 凭证 | 每个服务各藏一把 key | 集中托管，业务只拿网关 token |
| 模型切换 | 改代码发版 | 改路由/映射 |
| 兼容性 | 各家细微差别散落各处 | OpenAI 兼容面收敛（见 [前端对接 AI](/notes/ai/ai-frontend-integration)） |
| 限流 / 熔断 / 回退 | 各写各的 | 统一策略 |
| 审计日志 | 难以对齐 | 统一 Logging Callback |

常见选型认脸：**LiteLLM**（代理 + 多厂商适配）、云厂商模型网关、自研基于 OpenAI 兼容反向代理。原则：**业务只依赖一种请求形状**。

业务侧只改 `base_url`（OpenAI 兼容），密钥留给网关：

```python
# 网关已起在 localhost:4000；业务不再直连各厂商
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:4000/v1",
    api_key="sk-gateway-token",  # 网关自己的令牌，不是上游 key
)
r = client.chat.completions.create(
    model="chat-smart",  # 逻辑名：网关映射到真实模型
    messages=[{"role": "user", "content": "ping"}],
)
```

LiteLLM 代理侧最小回退意象（配置因版本而异，抓住语义即可）：

```yaml
# 逻辑模型 chat-smart：主 → 备
model_list:
  - model_name: chat-smart
    litellm_params:
      model: openai/gpt-5.5
      api_key: os.environ/OPENAI_API_KEY
  - model_name: chat-smart
    litellm_params:
      model: openai/gpt-4.1-mini
      api_key: os.environ/OPENAI_API_KEY

router_settings:
  routing_strategy: simple-shuffle
  # 失败时同一 model_name 下换部署；业务代码零改动
```

### 路由与韧性

生产上常配的策略（名字因产品而异，语义通用）：

+ **模型分组 / 映射**：`chat-smart` → 实际模型 A；灰度时可映射到 B
+ **会话粘滞**：同一 `thread_id` / 用户尽量打到同一后端（前缀缓存、会话态）
+ **负载与并发**：按模型 RPM/TPM 限额；网关并发与模型并发分开计
+ **熔断**：错误率飙升时短时间切断，避免雪崩重试
+ **回退 / 多级回退**：主模型失败 → 次选 → 本地小模型；要定义「什么算失败」（超时、5xx、内容过滤）
+ **Deployment**：同一逻辑模型多个部署端点，做主备

回退不是免费的：次选模型可能更弱，产品要接受「降级回答」或「明确告知降级」。

## AI 资产与动态配置

把「哪个环境的哪个 agent 用什么模型、温度、工具集」当成**配置资产**，而不是硬编码：

```
AgentSpec（逻辑名、默认模型、工具白名单、超时、评测集指针）
    ↓ 注册到配置中心 / 服务发现（如 Nacos 一类）
运行时读取 → 热更新（慎改：提示词与工具变更要有版本）
```

最小实践：

1. **配置清单**：每个 agent 一份 YAML/JSON（模型、超时、预算）
2. **环境隔离**：dev/staging/prod 不同凭证与限额
3. **变更审计**：谁在什么时候把 `chat-smart` 从 A 切到 B
4. **与评测联动**：切模型前跑离线集（见 [评测与可观测](/notes/ai/ai-eval-observability)）

缓存通用函数（embedding、稳定工具结果）可以挂在网关旁或应用侧——注意缓存键必须包含模型版本与提示版本，否则会「静默用旧脑」。

AgentSpec 最小清单（可进配置中心，也可先放仓库）：

```yaml
# agents/docs-qa.yaml
name: docs-qa
version: 3
model: chat-smart          # 逻辑名，经网关解析
timeout_sec: 60
budget_tokens: 50000
tools:
  allow: [search_docs, cite]
  deny: [shell, write_repo]
eval_suite: suites/docs-qa-v3.json
```

运行时读取时把 `version` 打进 trace / 缓存键；热更新提示词要升版本，避免旧缓存命中新行为。

## 产物与对象存储

Coding Agent / 漫剧 / 报表类任务会产出文件。基建要回答：

| 问题 | 常见做法 |
|---|---|
| 产物放哪 | MinIO / S3 兼容对象存储 |
| 谁上传 | 沙箱直传（预签名）或后端代传 |
| 怎么发布 | 自动同步到静态托管 / 内网预览桶 |
| 怎么隔离 | 按 tenant / thread / run 分前缀 |

沙箱共享卷适合「同一 run 内多步接力」；跨 run 持久化仍应落对象存储。细节与权限边界见 [Agent 沙箱](/notes/ai/agent-sandbox)。

预签名上传（S3/MinIO 语义，伪代码级）：

```python
# 信任域签发；沙箱或浏览器拿 URL PUT，后端不扛大文件
def presign_put(s3, bucket: str, key: str, expires: int = 600) -> str:
    return s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": bucket, "Key": key, "ContentType": "text/html"},
        ExpiresIn=expires,
    )

# key 约定：tenant/thread/run/artifact.html —— 隔离靠前缀，不靠「文件名好看」
```

## 观测接到哪

网关层至少要有：

+ 请求级：**模型、延迟、token、状态码、路由命中、是否回退**
+ 关联键：把网关 request id 与 agent `trace_id` / `thread_id` 打通
+ 告警：错误率、P95、预算烧尽

应用层的 Trace / LLM-as-Judge 仍按 [评测与可观测](/notes/ai/ai-eval-observability)；网关不能替代「答案好不好」的评测，只保证「调用链看得见、成本算得清」。

## 前端视角

+ AI 网关 ≈ 你们前端的 BFF / API 网关：鉴权、路由、限流、日志——只是上游变成了模型
+ AgentSpec ≈ 远程配置的 feature flag + 服务名解析
+ 产物预览 ≈ 上传 CDN 后的静态资源 URL，前端只消费链接
+ 回退策略 ≈ 弱网降级：主通道挂了还有可读的降级体验

## 学习路径建议

1. 本地 Docker Compose 起一个 OpenAI 兼容网关，把现有脚本的 `base_url` 指过去
2. 配一条「主模型失败 → 次选」回退，故意弄挂主端点验证
3. 给两个假 agent 写 AgentSpec，用环境变量/配置中心切换模型映射
4. 接 MinIO：跑通「生成文件 → 预签名上传 → 返回可预览 URL」
5. 把网关日志字段与 Langfuse/OTel trace 对齐，能从一次用户会话点进模型调用

## 参考

+ [LiteLLM](https://docs.litellm.ai/) · [OpenAI 兼容代理实践](https://platform.openai.com/docs/guides/production-best-practices)
+ 本站：[Agent 接入与部署](/notes/ai/agent-deployment) · [AI 应用工程化](/notes/ai/ai-app-engineering) · [Agent 沙箱](/notes/ai/agent-sandbox) · [vLLM](/notes/ai/vllm-serving)
