# Spring AI 与 LangChain4j

> 本文基于 2026-11 时点的 JVM Agent 接入实践（Spring AI 与 Spring Boot 3.x/4.x 同栈；LangChain4j 1.x）。定位：**宿主已经是 Java / Spring 时，怎么接模型与工具**，不是再学一遍微服务。
>
> 关联：[Agent 框架生态](/notes/ai/agent-frameworks)（选型里的 Java 第三梯队）、[Agent 接入与部署](/notes/ai/agent-deployment)（进程内 vs 独立服务）、[Python LLM 开发](/notes/ai/python-llm-apps)（Python 侧镜像）、[Spring Boot](/notes/java/spring-boot)、[MCP 与工具调用](/notes/ai/mcp-tools)。

## 定位：别为了 Agent 重写服务

AI 全栈里 Java 的正确姿势通常是：

```
存量 Spring 服务（订单 / 权限 / 工单）
        ↓ 进程内接入
   ChatClient / AiServices（调模型、工具、结构化输出）
        ↓ 复杂图编排不够用时
   旁路 Python LangGraph（sidecar）或只把「循环」外置
```

**强项**：DI、配置、Security、事务、观测与现有 Bean 无缝拼。  
**弱项**：Agent 工具/记忆/评测生态仍落后 Python；长图编排、HITL 工作流优先看 [LangGraph](/notes/ai/langgraph)。

判据一句：**服务已是 Java → 用 Spring AI / LangChain4j 进程内接；循环极复杂 → 循环用 Python，Java 当客户端**（见 [接入与部署](/notes/ai/agent-deployment) 跨语言变体）。

## 两条路怎么选

| | **Spring AI** | **LangChain4j** |
|---|---|---|
| 出身 | Spring 官方 | 社区，API 更「统一聊天层」 |
| 手感 | `ChatClient`、Advisor、与 Boot starter 一体 | `AiServices`、原生 MCP/向量商店适配多 |
| 适合 | 已在 Spring Boot 里、要官方路线 | 想少绑 Spring、或多后端统一门面 |
| 和 Boot | 一等公民 | 也能进 Spring，但心智是独立库 |

新 Spring 项目默认 **Spring AI**；已有 LangChain4j 或要跨非 Spring JVM 模块 → **LangChain4j**。不必两套并行。

## Spring AI：最小可跑

依赖用 starter（版本跟你 Boot 线；以官方 BOM 为准）：

```xml
<!-- 意象：具体 artifact 以 spring.ai 当前 BOM 为准 -->
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>
```

```yaml
# application.yml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      chat:
        options:
          model: gpt-5.5
# 走网关时改 base-url，逻辑同 [Agent 基建](/notes/ai/agent-infra)
```

```java
@RestController
@RequiredArgsConstructor
class AskController {
  private final ChatClient.Builder chatClientBuilder;

  @PostMapping("/ask")
  String ask(@RequestBody String q) {
    return chatClientBuilder.build()
        .prompt()
        .user(q)
        .call()
        .content();
  }
}
```

结构化输出（≈ Pydantic / `response_model`）：

```java
record Movie(String title, int year) {}

Movie movie = chatClientBuilder.build()
    .prompt()
    .user("从这段话提取电影：《奥本海默》2023 年上映")
    .call()
    .entity(Movie.class);
```

工具调用：把 Spring Bean 方法标成工具，模型只出调用意图，执行仍在你的 JVM 里——与 [MCP](/notes/ai/mcp-tools) 同一原则。

```java
@Component
class OrderTools {
  @Tool(description = "按订单号查状态")
  String status(String orderId) {
    return orderService.findStatus(orderId); // 复用已有领域服务
  }
}

// ChatClient 注册 tools(orderTools) 后即可多轮 tool loop
```

流式：`stream()` 推 token，前端仍走 [AI 流式输出](/notes/ai/ai-streaming) 的 SSE 消费习惯。

## LangChain4j：同一件事的另一种写法

```java
interface Assistant {
  @SystemMessage("你是内部助手，只根据工具结果回答")
  String chat(String userMessage);
}

Assistant assistant = AiServices.builder(Assistant.class)
    .chatLanguageModel(model)
    .tools(orderTools)
    .build();

String answer = assistant.chat("订单 A100 到哪了？");
```

心智：接口 = 契约，运行时生成代理跑工具循环。向量存储、MCP 客户端在生态里认脸即可；复杂 RAG 管线仍按 [RAG](/notes/ai/rag) 那套设计，库只是适配器。

## 和 Python / TS 怎么分工

| 需求 | 优先 |
|---|---|
| 在现有 Spring 里加问答 / 摘要 / 抽字段 | **Spring AI** |
| 多步图、CheckPointer、HITL、子图 | **LangGraph（Python）** + Java HTTP/SSE 客户端 |
| 前端同构流式、边缘/Workers | **TS（Vercel AI SDK / Mastra）** |
| 只调模型、要类型安全、Python 服务 | [Python LLM / Pydantic AI](/notes/ai/python-llm-apps) |

反模式：为了「全栈统一语言」把已经稳定的 Java 订单服务重写成 Python agent 单体。

## 生产注意（Java 特有坑）

1. **阻塞 vs 虚拟线程**：模型调用是 IO 等待；Boot 3+ 可开虚拟线程，避免占用平台线程池把 Web 拖死
2. **超时与预算**：`ChatClient` / WebClient 超时、token 预算要在网关与应用两层都有（见 [应用工程化](/notes/ai/ai-app-engineering)）
3. **密钥**：走配置中心 / 环境变量；工具方法里不要打印 prompt 全文到业务日志
4. **事务边界**：工具若写库，明确「模型幻觉调用」不能直接提交——高危写操作加人工或状态机（HITL 思路同 [LangGraph](/notes/ai/langgraph)）
5. **观测**：接 Micrometer + 若有 Langfuse/OTel bridge；至少记下 model、latency、token、tool 名

## 前端 / 后端视角

+ `ChatClient` ≈ Node 里封装的 `openai.chat` 服务，只是挂在 Spring DI 上
+ `@Tool` Bean ≈ controller 里的 application service，被模型按 schema 调用
+ Java 宿主 + Python 循环 ≈ BFF 调下游：Java 管鉴权与领域，Python 管长任务状态机

## 学习路径建议

1. 在现有 Spring Boot 最小模块里接 OpenAI 兼容端点，跑通 `/ask`
2. 加一个读库的 `@Tool`，验证「模型调你的 OrderService」
3. 把 `base-url` 指到 [Agent 基建](/notes/ai/agent-infra) 式网关，体会换模型零改业务代码
4. 需要多步审批流时：不要硬在 Java 里堆状态机——评估旁路 [LangGraph](/notes/ai/langgraph)
5. 对照 [框架生态](/notes/ai/agent-frameworks) 的语言判据，沉淀一份默认选型表

## 参考

+ [Spring AI 文档](https://docs.spring.io/spring-ai/reference/) · [LangChain4j](https://docs.langchain4j.dev/)
+ 本站：[Agent 框架生态](/notes/ai/agent-frameworks) · [Agent 接入与部署](/notes/ai/agent-deployment) · [Python LLM 开发](/notes/ai/python-llm-apps) · [Spring Boot](/notes/java/spring-boot)
