# Spring Boot

> 本文基于 Spring Boot 3.x / 4.x（2026-09 时点：4.0 已 GA，3.x 存量最多，两者核心概念一致）。

Spring Boot 是 Java 后端的事实标准框架。它的核心价值一句话：**让 Spring 的配置成本趋近于零**。本篇聚焦前端最容易懵的三个概念——IoC/DI、分层架构、注解驱动——以及一个最小可运行的 CRUD。

> 语言基础见 [Java 基础](/notes/backend/java-basics)；工具链与 Spring 生态地图见 [Java 生态与工具链](/notes/backend/java-ecosystem)。

## 先理解 Spring：IoC 与 DI

Spring 的地基是 **IoC（控制反转）容器**：你写的类不自己 `new` 依赖，而是交给容器，容器负责**创建对象、组装依赖、管理生命周期**。被容器管理的对象叫 **Bean**。

**DI（依赖注入）** 是实现手段：依赖通过构造器/Setter 从外部"注入"进来。

前端最贴近的类比是 Vue 的 `provide/inject`，但要理解量级差异——`provide/inject` 是组件树内的一条链，IoC 容器是**全局的、自动的依赖图**：容器启动时扫描所有类，按声明的依赖关系自动把整张对象图拼装出来。

```java
// ❌ 不用容器：自己 new，依赖关系写死在代码里
public class OrderService {
    private final MailService mail = new MailService(new SmtpClient(cfg)); // 硬编码
}

// ✅ 用容器：声明"我需要什么"，容器负责装配
@Service
public class OrderService {
    private final MailService mail;

    public OrderService(MailService mail) {   // 构造器注入：容器传入
        this.mail = mail;
    }
}
```

换实现（比如测试时换成不发邮件的 FakeMailService）不需要改 OrderService 一行代码——这就是"控制反转"：对象的组装权从你手里反转给了容器。

### 注入方式：只用构造器注入

```java
@Service
public class UserService {
    private final UserRepository repo;    // final：依赖不可变

    // 只有一个构造器时，@Autowired 可省略
    public UserService(UserRepository repo) {
        this.repo = repo;
    }
}
```

字段注入（`@Autowired private UserRepository repo;`）虽然代码更短，但依赖不能是 final、离开容器无法实例化（单测麻烦），主流规范一律推荐**构造器注入**。

## Spring Boot 解决了什么

裸 Spring（XML/Java 配置）时代，配一个 Web 应用要写大量样板。Boot 的三板斧：

1. **Starter 依赖**：`spring-boot-starter-web` 一个坐标拉齐 Web 开发全家桶（MVC + 内嵌 Tomcat + Jackson）
2. **自动配置**：检测到 classpath 里有什么，就自动配好对应的 Bean——引了 starter-web 就有 Web 服务器，零配置
3. **内嵌服务器**：打成 jar 直接 `java -jar` 运行，不用先装 Tomcat（≈ Vite 内置 dev server，不用自己配 webpack-dev-server）

初始化项目用 [start.spring.io](https://start.spring.io)（≈ create-vue / npm create vite）：选 Maven + Java 21 + 依赖，下载即用。

## 分层架构：请求的一生

Spring Boot 项目约定俗成的四层，职责和前端分层可以一一对照：

```
HTTP 请求
  │
  ▼
Controller 层     接收/校验请求，返回响应     ≈ 前端的 api/ 模块（定义接口怎么调）
  │               不写业务逻辑
  ▼
Service 层        业务逻辑、事务边界         ≈ composables / store（真正的逻辑）
  │
  ▼
Repository/Mapper 数据库读写                 ≈ 前端没有对应层（前端到 api 就结束了）
  │
  ▼
数据库
```

一个请求的完整链路：

```
GET /api/users/1
  → 路由匹配到 @GetMapping("/api/users/{id}")
  → 参数解析（@PathVariable 把 "1" 转成 Long）
  → 调用 UserService.getUser(1L)
  → Service 调用 UserRepository.findById(1L)
  → 数据库返回行 → 映射成实体对象，逐层返回
  → Controller 把对象交给 Jackson 序列化成 JSON
  → 200 OK + JSON body
```

对照前端：你在 Vue 里 `axios.get('/api/users/1')` 拿到的那个 JSON，就是这条链路的终点产物。

## 常用注解速查

注解是 Spring 的"API 面孔"。分层记忆：

**启动与配置**

| 注解 | 作用 |
|---|---|
| `@SpringBootApplication` | 主类标记 = 自动配置 + 组件扫描 + 配置类，三合一 |
| `@Configuration` | 声明配置类（里面用 `@Bean` 手工组装对象） |
| `@Bean` | 方法返回值注册为 Bean（≈ 工厂函数） |
| `@Value("${app.key}")` | 注入配置项（≈ import.meta.env.VITE_XXX） |

**声明 Bean（组件扫描识别）**

| 注解 | 语义（对容器而言都是"注册为 Bean"） |
|---|---|
| `@Component` | 通用组件 |
| `@Service` | 业务逻辑层（语义化标记） |
| `@Repository` | 数据访问层 |
| `@RestController` | Web 接口层 |

**Web 接口**

| 注解 | 作用 |
|---|---|
| `@RestController` | = `@Controller` + `@ResponseBody`（返回值直接序列化为 JSON） |
| `@RequestMapping("/api/users")` | 类级路由前缀 |
| `@GetMapping` / `@PostMapping` / `@PutMapping` / `@DeleteMapping` | 方法级路由 |
| `@PathVariable` | 取路径参数 `/users/{id}` |
| `@RequestParam` | 取查询参数 `?page=1` |
| `@RequestBody` | 把请求 body 反序列化成对象（≈ axios 传的 data） |

**其他高频**

| 注解 | 作用 |
|---|---|
| `@Autowired` | 注入点标记（构造器注入时可省略） |
| `@Transactional` | 方法/类自动开启事务，异常回滚 |
| `@Qualifier("beanName")` | 同类型多个 Bean 时指定注入哪个 |

## 最小 CRUD 示例

```java
// 实体：用 record 当 DTO（不可变、免样板）
public record UserDTO(Long id, String name, Integer age) {}

// Controller
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {   // 构造器注入
        this.service = service;
    }

    @GetMapping("/{id}")
    public UserDTO getUser(@PathVariable Long id) {
        return service.getUser(id);      // 返回对象 → Jackson 自动转 JSON
    }

    @GetMapping
    public List<UserDTO> listUsers(@RequestParam(defaultValue = "1") int page) {
        return service.list(page);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)          // 返回 201
    public UserDTO createUser(@RequestBody UserDTO user) {
        return service.create(user);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)       // 返回 204
    public void deleteUser(@PathVariable Long id) {
        service.delete(id);
    }
}

// Service
@Service
public class UserService {
    private final UserRepository repo;

    public UserService(UserRepository repo) { this.repo = repo; }

    @Transactional
    public UserDTO create(UserDTO dto) {
        var entity = new UserEntity(dto.name(), dto.age());
        var saved = repo.save(entity);
        return new UserDTO(saved.getId(), saved.getName(), saved.getAge());
    }
    // getUser / list / delete 同理...
}
```

读这段代码时盯住一点：**没有任何一行 `new UserService(...)`**——容器启动时已经把 Controller → Service → Repository 这条链装配好了。

## 配置文件

`src/main/resources/application.yml`（≈ `.env` + 应用配置合一）：

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/demo
    username: root
    password: ${DB_PASSWORD}      # 环境变量占位，敏感信息不进仓库

app:
  page-size: 20
```

**Profile 环境隔离**：`application-dev.yml` / `application-prod.yml`，启动时 `--spring.profiles.active=dev` 激活（≈ Vite 的 mode + .env.development/.env.production）。

## 3.x / 4.x 注意点

+ 基线：Boot 3 要 Java 17 起，Boot 4 同样 Java 17 起（推荐 21/25 LTS）
+ `javax.*` → `jakarta.*`：Boot 3 完成了包名迁移，读老教程时所有 `javax.servlet` 类推成 `jakarta.servlet`
+ Boot 4（2025-11 GA）：模块化拆分更细、内置 API 版本管理，核心用法与 3.x 无缝
+ 学资料时认准 **Spring Boot 2.4+ / Spring 5.3+** 之后的内容，太老的 XML 配置式教程已过时

## 学习路径建议

1. start.spring.io 建项目，跑通一个 Controller 返回 JSON（半天）
2. 加一层 Service + 内存 Map 存储，理解 DI（一天）
3. 接 Spring Data JPA 连数据库，跑通完整 CRUD
4. 之后按需深入：事务、异常处理（`@RestControllerAdvice`）、拦截器、参数校验（`@Valid`）

## 参考

+ [Spring Boot 官方文档](https://docs.spring.io/spring-boot/index.html)
+ [Spring Initializr](https://start.spring.io)
+ [Spring Guides（官方入门教程）](https://spring.io/guides)
