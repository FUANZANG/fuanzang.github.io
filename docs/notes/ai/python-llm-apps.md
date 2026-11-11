# Python LLM 开发

> 本文基于 2026-11 时点（OpenAI Python SDK 3.46.0，v3 自 2026-08 起默认 HTTP 客户端为 HTTPX2；Pydantic AI 2.66；litellm 1.108.1；均在 PyPI 当日核验。OpenAI 已关停 Assistants API（2026-08-26），Responses API 是官方推荐的新项目入口，工具调用仅 Responses 支持）。

> 关联：[前端对接 AI](/notes/ai/ai-frontend-integration)（Node/浏览器侧的镜像）、[Agent 框架生态](/notes/ai/agent-frameworks)（框架选型对照）、[LLM 基础概念](/notes/ai/llm-fundamentals)（消息结构与采样参数）、[vLLM 推理服务](/notes/ai/vllm-serving)（本地 OpenAI 兼容端点）。

## 定位：JS 侧笔记的服务端镜像

[前端对接 AI](/notes/ai/ai-frontend-integration) 讲的是浏览器/Node 怎么调 LLM；这篇是**服务端另一半**：用 Python 写调模型的逻辑（批处理、Agent、给前端供数）。两套心智几乎同构：OpenAI SDK ≈ OpenAI Node SDK，Pydantic AI ≈ Mastra 的 TS 侧对应物（都是"类型安全的 LLM 应用层"）。

## OpenAI Python SDK v3（官方 API）

```bash
uv add openai
```

```python
from openai import AsyncOpenAI   # 异步版（服务端首选）；同步版叫 OpenAI

client = AsyncOpenAI()          # 读环境变量 OPENAI_API_KEY（≈ .env 里的 key）

# ① 单轮：Responses API（2026 现状的新项目入口；旧 Chat Completions 仍支持但不再是推荐）
resp = await client.responses.create(
    model="gpt-5.5",
    input="把这句话翻译成日语：今天的代码评审改一下命名",
    instructions="你是翻译助手，只输出译文",   # ≈ system 消息的独立参数
)
print(resp.output_text)        # 提取全部文本输出的便捷属性

# ② 多轮：服务器端会话——不回传历史，用 previous_response_id 接着聊
resp2 = await client.responses.create(
    model="gpt-5.5",
    input="再简短一点",
    previous_response_id=resp.id,
)

# ③ 结构化输出：传 Pydantic 类直接拿类型化结果（≈ FastAPI 的 response_model）
from pydantic import BaseModel

class Movie(BaseModel):
    title: str
    year: int

result = await client.responses.parse(
    model="gpt-5.5",
    input="从这段话里提取电影名和年份：《奥本海默》2023 年上映",
    text_format=Movie,          # v3 写法：直接传 Pydantic 模型类（旧版是 text={'format': ...}）
)
movie: Movie = result.output    # 已解析成 Movie 实例，.title/.year 直接取
```

**v3 迁移注意点（存量教程都是 1.x/2.x 代码）**：v3.0（2026-08）把默认 HTTP 客户端换成 **HTTPX2**（OpenAI 自研的异步 HTTP 库），**不再自动安装 `httpx`**——自定义 transport/client 的老代码要按 HTTPX2 迁移指南改。另外 `input` 既接受字符串也接受消息列表；**工具调用（`tools=[...]`）只走 Responses API**（Chat Completions 的工具流程已在弃用通道上）。

## 异步并发：asyncio 的 LLM 批处理惯用法

LLM 调用是典型 IO 密集（等网络/等模型），`asyncio` 正好（机制见 [Python 基础](/notes/python/python-basics)：async ≈ 事件循环）。JS 开发者对应 `Promise.all` + 自写并发上限：

```python
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def extract(doc_id: int, text: str) -> str:
    r = await client.responses.create(model="gpt-5.5", input=f"提取要点：{text}")
    return f"doc{doc_id}: {r.output_text}"

async def main():
    sem = asyncio.Semaphore(10)          # 并发上限 10（≈ limitConcurrency 手限）
    async def limited(i, t):
        async with sem:
            return await extract(i, t)
    results = await asyncio.gather(*(limited(i, t) for i, t in enumerate(docs)))
```

## 统一层：litellm（≈ LLM 的 API 网关）

```python
import litellm

resp = litellm.completion(model="openai/gpt-5.5", messages=[{"role": "user", "content": "hi"}])
#  换模型只改前缀：anthropic/claude-...、google/...、groq/...
#  本地端点：model="ollama/qwen3" 或开 base_url 指向 Ollama/LM Studio/vllm-metal
```

**litellm（1.108.x）**把 100+ 家的 API 抹平成一套 `completion()` 调用——≈ 给 LLM 请求加一层"API 网关"（认证、限流、路由、日志都有 proxy 服务端形态）。多供应商场景下省掉 N 套 SDK 的 if/else。

## Agent 框架层：Pydantic AI 为主

选型对照见 [Agent 框架生态](/notes/ai/agent-frameworks)；Python 侧的默认主力是 **Pydantic AI（2.66）**——和 FastAPI/Pydantic 同家，类型安全最顺：

```python
from pydantic_ai import Agent
from pydantic import BaseModel

class Fact(BaseModel):
    claim: str
    source: str

agent = Agent(
    "openai:gpt-5.5",               # 模型串 = 供应商前缀:模型名（换供应商只改这里）
    output_type=Fact,               # 结构化输出：直接声明 Pydantic 模型
    tools=[my_python_function],     # 工具：普通 Python 函数（类型提示即文档）
)

result = await agent.run("查一下 VitePress 4 的 SSR 支持")
print(result.output.claim)          # 已校验为 Fact 实例
```

| 场景 | 用什么 |
|---|---|
| 单 Agent + 工具 + 结构化输出（80% 应用） | **Pydantic AI**（`run` / `run_sync` / `run_stream` 三入口，≈ OpenAI SDK 的 async + 类型强化） |
| 多节点图、检查点、human-in-the-loop | **LangGraph**（图化工作流，见 [LangGraph 实战](/notes/ai/langgraph) / [框架生态](/notes/ai/agent-frameworks)） |
| 多 Agent 角色协作 | CrewAI / AG2（认脸，见同上） |
| 只想要 OpenAI 官方的 Agent 原语 | OpenAI Agents SDK（Python 为参考实现） |

**认脸即可的训练/优化侧**：DSPy（3.4.x，声明式 prompt 流水线 + 自动调优）、TRL（1.17.x，SFT/DPO/GRPO 训练循环，是 [模型微调与定制](/notes/ai/fine-tuning) 三路线在 Python 侧的落点）。

## 学习路径建议

1. `uv add openai pydantic`，用 ①②③ 三个调用各跑一次（有 OpenAI key）；没有 key 就用 [vLLM 推理服务](/notes/ai/vllm-serving)/Ollama 的本地端点 + `base_url` 指过去，接口零改动。
2. 把 ③ 的 `parse` 换成流式（`stream=True`，遍历事件），对照 [AI 流式输出](/notes/ai/ai-streaming) 的 JS 事件语义。
3. 跑一遍 Semaphore 并发批处理，观察 10 并发 vs 50 并发的耗时与 429。
4. Pydantic AI 写一个带两个工具的 Agent（工具 = 两个普通函数），体验 `output_type` 的类型化。
5. 读 [Agent 框架生态](/notes/ai/agent-frameworks) 的 Python 列，决定要不要上 LangGraph；上手见 [LangGraph 实战](/notes/ai/langgraph)。

## 参考

+ [OpenAI Python SDK 仓库（v3 changelog / HTTPX2 迁移）](https://github.com/openai/openai-python)
+ [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)
+ [Pydantic AI 官方文档（Agent / 结构化输出）](https://pydantic.dev/docs/ai/)
+ [litellm 官方文档](https://docs.litellm.ai/)
+ [LangGraph 官方](https://langchain-ai.github.io/langgraph/)
