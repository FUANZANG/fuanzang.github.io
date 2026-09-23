# Spring Cloud 与微服务

> 本文基于 Spring Cloud 2025.x（2026-09 时点：2025.1 Oakwood 配 Boot 4.0，2025.0 Northfields 配 Boot 3.5）。定位是"识字 + 会读"：听懂微服务团队的黑话，读懂一个 Feign 调用背后的全链路；不覆盖搭建与运维。

> 前置：[Spring Boot](/notes/backend/spring-boot)（IoC/代理）、[MyBatis](/notes/backend/mybatis)（动态代理先例）。仓库组织对照见 [Monorepo](/notes/engineering/monorepo)。

## 微服务解决什么问题——以及什么时候不要拆

单体应用（一个 jar 部署）的痛点出现在规模变大后：任何小改动要整体重新部署、一个模块 OOM 全站陪葬、几十人改同一个仓库互相踩。微服务 = **按业务边界拆成独立部署的服务**（用户服务、订单服务各一个进程），每个服务有自己的库。

**代价先摆清楚**（这是"要不要拆"的核心）：

| 单体 | 微服务 | |
|---|---|---|
| 部署 | 一个包 | N 个服务 + 注册中心 + 网关 + 链路追踪… |
| 调用 | 方法调用（进程内） | 网络调用（可能失败、超时、重试） |
| 事务 | 一个数据库事务 | 分布式事务（复杂度陡增） |
| 排查 | 一个日志文件 | 日志分散在 N 台机器 |

**判断标准**：团队 < 20 人、业务单一——单体 + 模块化（Maven 多模块）就够；微服务是组织规模问题的技术解法，不是架构审美。

> 微服务 ≠ monorepo：前者拆**部署单元**（服务各自独立发布），后者是**仓库组织**方式（Google 全公司一个 monorepo 同时有海量微服务）。国内常见"一个 git 仓 = 一个微服务"，也常见多模块仓打包多个服务。

## Spring Cloud 组件地图

Spring Cloud 不是单一框架，是微服务基础设施的"全家桶品牌"（各组件独立版本，用 release train 统一对齐 Boot 版本）：

| 问题 | 组件 | 说明 |
|---|---|---|
| 服务在哪 | **注册中心** | Nacos（国内主流）/ Eureka（Netflix 系，维护模式）/ Consul |
| 怎么调别人 | **OpenFeign** | 声明式 HTTP 客户端（下文精讲） |
| 谁来负载均衡 | Spring Cloud LoadBalancer | 取代 Netflix Ribbon |
| 挂了怎么办 | 熔断限流 | Sentinel（国内主流）/ Resilience4j（取代 Hystrix） |
| 统一入口 | Spring Cloud Gateway | 边缘网关：路由、鉴权、限流（≈ 前端的 Nginx 反代 + 中间层） |
| 配置怎么管 | 配置中心 | Nacos Config / Spring Cloud Config，配置热更新 |
| 谁动了我的服务 | 链路追踪 | Micrometer Tracing（原 Sleuth）/ SkyWalking |

> Netflix OSS（Eureka/Ribbon/Hystrix/Zuul）是微服务教材时代的标配，现已全线维护模式或停更——读老教程时统一映射到 Nacos/LoadBalancer/Resilience4j/Gateway。国内实际项目基本是 **Spring Cloud Alibaba** 套件：Nacos（注册+配置）+ Gateway + OpenFeign + Sentinel。

## OpenFeign：声明式 HTTP 客户端

微服务间调用的标准姿势。**只写接口，不写实现**：

```java
// 1. 启用：@EnableFeignClients
// 2. 定义接口——注解就是 HTTP 语义
@FeignClient(name = "user-service")        // 目标服务名（注册中心里查这个名字）
public interface UserClient {
    @GetMapping("/api/users/{id}")
    UserDTO getUser(@PathVariable("id") Long id);

    @PostMapping("/api/users")
    UserDTO create(@RequestBody UserDTO user);
}

// 3. 注入即用——像调本地方法一样调远程
@Service
public class OrderService {
    private final UserClient userClient;
    // 构造器注入...
    public OrderDTO createOrder(Long userId) {
        UserDTO user = userClient.getUser(userId);   // 这一行 = 一次 HTTP 调用
        // ...
    }
}
```

### 原理：动态代理（第三次见面）

和 [MyBatis Mapper](/notes/backend/mybatis)、[Spring 事务代理](/notes/backend/spring-transactions) 同一机制——这也是 Java 生态的惯用套路：

```
编译期：只有接口（没有实现类）
运行期：Feign 为接口生成动态代理
  调用 getUser(1L)
    → 代理拦截：读注解拼出 "GET /api/users/1"
    → 负载均衡器：从注册中心拿 "user-service" 的实例列表，挑一个
    → HTTP 客户端发请求
    → 响应 JSON 反序列化成 UserDTO 返回
```

前端类比：**≈ 从 OpenAPI 规范生成的 API SDK**——你在前端 `import { userApi } from '@/api'` 时调用的那层封装，Java 用注解声明出来、框架生成。区别是前端 SDK 生成时打的是具体 URL，Feign 打的是**服务名**，地址由注册中心在运行时解析。

### 超时与降级

网络调用必配的两件事（Feign 默认超时很短，不配必然踩坑）：

```yaml
spring:
  cloud:
    openfeign:
      client:
        config:
          default:
            connect-timeout: 2000    # 连接 2s
            read-timeout: 5000       # 读 5s
          user-service:              # 可按服务覆盖
            read-timeout: 10000
```

**降级（fallback）**：目标服务挂了走备用逻辑，不让故障顺着调用链蔓延：

```java
@FeignClient(name = "user-service", fallback = UserClientFallback.class)
public interface UserClient { ... }

@Component
public class UserClientFallback implements UserClient {
    public UserDTO getUser(Long id) {
        return UserDTO.degraded(id);   // 返回兜底数据/默认值
    }
}
```

更完整的熔断限流（按错误率自动熔断、限流排队）用 Sentinel/Resilience4j，概念同前端的"接口失败重试 + 骨架屏兜底"，只是下沉到了调用层统一治理。

## 一次跨服务请求的全链路

把组件串起来，看一个完整故事：

```
前端请求 GET /api/orders/1
  → Gateway（统一入口：鉴权、限流、按路径路由到 order-service）
  → order-service 处理，需要用户信息
      → UserClient.getUser(1L)（OpenFeign 声明式调用）
      → LoadBalancer 问 Nacos："user-service 活着的实例有哪些？"
      → 挑一个实例，HTTP 调用，带链路 trace-id
  → user-service 返回 JSON → 反序列化 → 组装订单响应
  → 全链路日志靠 trace-id 串起来（SkyWalking/Micrometer Tracing）
```

注册中心的心跳机制：每个服务实例定期向 Nacos 报心跳，挂了被摘除——调用方拿到的永远是健康实例列表。这就是"服务发现"解决的事：**地址从硬编码变成运行时查询**。

## 学习路径建议

1. 本地起一个 Nacos（docker 一行命令），注册两个一样的 user-service 实例（不同端口）
2. 写 order-service 用 Feign 调它，多刷几次观察负载均衡轮询
3. 杀掉一个实例，观察调用不中断（摘除后流量全到另一个）
4. 加 fallback 和超时，模拟慢响应看降级生效
5. 之后按需：Gateway 路由/过滤器、Sentinel 规则、链路追踪接入

## 参考

+ [Spring Cloud 官方文档](https://docs.spring.io/spring-cloud/reference/)
+ [Spring Cloud OpenFeign](https://docs.spring.io/spring-cloud-openfeign/reference/)
+ [Spring Cloud Alibaba（中文）](https://sca.aliyun.com/)
+ [Nacos 官方文档](https://nacos.io/)
