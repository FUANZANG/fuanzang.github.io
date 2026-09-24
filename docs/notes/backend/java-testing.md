# Java 测试（JUnit + Mockito）

> 本文基于 JUnit 5/6 + Mockito 5.x + AssertJ（2026-09 时点：JUnit 6 于 2025-09 发布——Java 17 基线、统一版本号，Jupiter API 与 5.x 基本不变；Spring Boot 3.x 内置 JUnit 5，新项目可用 6）。

Java 测试栈与前端一一对应：**JUnit ≈ Vitest/Jest（运行器+断言）、Mockito ≈ vi.mock（模拟）、AssertJ ≈ 断言库**。有前端测试经验，这篇基本是“翻译”工作。

> 前置：[Spring Boot](/notes/backend/spring-boot)、[Java 基础](/notes/backend/java-basics)。前端测试对照见 [前端测试](/notes/performance/frontend-testing)。

## 测试栈全景

```
spring-boot-starter-test 一个 starter 全带：
├── JUnit 5/6（JUnit Jupiter）     运行器 + @Test 生命周期
├── Mockito                        mock 依赖
├── AssertJ                        流式断言（主流选择，取代 JUnit 原生断言）
├── Spring Test & Spring Boot Test @SpringBootTest 等集成测试支持
├── JSONassert / JsonPath          JSON 断言
└── Hamcrest                       另一套断言库（了解即可）
```

## JUnit：从 Vitest 翻译

```java
// src/test/java/.../UserServiceTest.java
class UserServiceTest {          // 测试类不需要 public

    @Test                        // ≈ it/test
    void shouldReturnUser() {
        // given-when-then 三段式（前端同样适用）
    }

    @Test
    @DisplayName("用户不存在时应抛出业务异常")   // ≈ it('描述', ...)
    void shouldThrowWhenNotFound() { }

    @BeforeEach                  // ≈ beforeEach
    void setUp() { }

    @AfterEach                   // ≈ afterEach
    void tearDown() { }

    @BeforeAll                   // ≈ beforeAll（必须 static）
    static void initAll() { }
}
```

断言用 AssertJ（starter 自带，流式 API 比 JUnit 原生 `assertEquals` 可读性好得多）：

```java
import static org.assertj.core.api.Assertions.*;

User user = service.getUser(1L);

assertThat(user.getName()).isEqualTo("tom");        // ≈ expect(name).toBe('tom')
assertThat(user.getAge()).isGreaterThan(18);
assertThat(list).hasSize(3).contains("a");          // 链式断言
assertThatThrownBy(() -> service.getUser(-1L))      // ≈ expect(() => ...).toThrow()
    .isInstanceOf(BizException.class)
    .hasMessageContaining("不存在");
```

参数化测试（≈ `it.each`）：

```java
@ParameterizedTest
@ValueSource(ints = {0, -1, -100})
void shouldRejectInvalidAge(int age) {
    assertThatThrownBy(() -> service.validate(age)).isInstanceOf(IllegalArgumentException.class);
}
```

## Mockito：从 vi.mock 翻译

```java
@ExtendWith(MockitoExtension.class)     // 启用 Mockito（≈ 开启 mock 环境）
class OrderServiceTest {

    @Mock                                // ≈ vi.mock：造一个假实现
    private MailService mailService;

    @InjectMocks                         // ≈ 把 mock 注入被测对象（自动构造器注入）
    private OrderService orderService;   // 真实对象，依赖是上面的 mock

    @Test
    void shouldSendMailOnOrder() {
        // given：定义 mock 行为
        when(mailService.send(anyString()))            // ≈ vi.fn().mockResolvedValue()
            .thenReturn(true);

        // when
        orderService.place("order-1");

        // then：验证交互（≈ expect(mockFn).toHaveBeenCalled()）
        verify(mailService).send("order-1");           // ≈ toHaveBeenCalledWith('order-1')
        verify(mailService, times(1)).send(anyString());
        verifyNoInteractions(mailService);             // ≈ 断言从未被调用
    }
}
```

常用 API 速查：

| Mockito | Vitest 等价 |
|---|---|
| `when(x).thenReturn(y)` / `thenThrow(e)` | `mockResolvedValue` / `mockRejectedValue` |
| `anyString()` / `any(Class)` / `eq("a")` | 匹配器概念相同 |
| `verify(mock).method(args)` | `expect(fn).toHaveBeenCalled()` |
| `verify(mock, times(2))` / `never()` | `toHaveBeenCalledTimes(2)` / `not.toHaveBeenCalled()` |
| `@Mock` + `@InjectMocks` | `vi.mock` + 模块替换 |

关键差异：**Mockito mock 的是对象，Vitest mock 的是模块**。Java 里依赖注入天然友好——Service 的依赖是构造器传进来的，直接塞 mock 对象即可，不需要拦截模块系统。

## 分层测试策略

```
单元测试（多，快）          集成测试（少，慢）
Service 层纯 mock 测试  →  @SpringBootTest 起容器连真库
```

### 单元测试：只测 Service 逻辑

如上例：mock 掉 Repository，只验证业务分支。跑得飞快（毫秒级），占测试金字塔的多数。

### 切片测试：只加载需要的层

```java
@WebMvcTest(UserController.class)      // 只起 Web 层：Controller + 过滤器，Service 要 mock
class UserControllerTest {

    @Autowired MockMvc mockMvc;         // 模拟 HTTP 调用（不占端口）
    @MockBean UserService service;      // mock 注入容器（Boot 3.4+ 推荐 @MockitoBean）

    @Test
    void shouldReturnUserJson() throws Exception {
        when(service.getUser(1L)).thenReturn(new UserDTO(1L, "tom", 18));

        mockMvc.perform(get("/api/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("tom"));   // ≈ supertest
    }
}
```

`@WebMvcTest` ≈ 只挂载路由的浅渲染；对应的还有 `@DataJpaTest`（只起数据层 + 内存库/事务回滚）。

### 全量集成：@SpringBootTest

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserApiIT {

    @Autowired TestRestTemplate rest;    // 真发 HTTP

    @Test
    void crudFlow() {
        var resp = rest.postForEntity("/api/users", new UserDTO(null, "tom", 18), UserDTO.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }
}
```

起整个容器，慢（秒级），只留给关键链路。测试数据库惯用 Testcontainers（Docker 起真库，比 H2 内存库保真）——原理与最小示例见 [Docker · Testcontainers](/notes/backend/docker#testcontainers)。

## 运行测试

```bash
mvn test                        # 跑全部（≈ npm run test）
mvn test -Dtest=UserServiceTest # 跑单个类（≈ vitest run user.test.ts）
mvn test -Dtest='UserServiceTest#shouldReturnUser'   # 单个方法
```

IDE（IDEA）里点方法旁的绿三角跑单个测试，体验与 VS Code 的 Vitest 插件一致。

## JUnit 4 → 5/6 迁移提示

读老教程/老项目时常见的 JUnit 4 写法（`@RunWith(SpringRunner.class)`、`@org.junit.Test`、`Assert.assertEquals`）已过时；Spring Boot 4 起 JUnit 4 支持被彻底移除。对照表：

| JUnit 4 | JUnit 5/6 |
|---|---|
| `@RunWith(MockitoJUnitRunner.class)` | `@ExtendWith(MockitoExtension.class)` |
| `@org.junit.Test` | `@org.junit.jupiter.api.Test` |
| `@Before` / `@After` | `@BeforeEach` / `@AfterEach` |
| `Assert.assertEquals(a, b)` | `assertThat(b).isEqualTo(a)`（AssertJ） |

## 学习路径建议

1. 给 Spring Boot 篇的 UserService 写纯 Mockito 单测（分支覆盖：正常/不存在/参数非法）
2. 给 Controller 写 `@WebMvcTest` + MockMvc 测试（练 jsonPath 断言）
3. 体验 `@SpringBootTest` 的慢，理解测试金字塔为什么这么分
4. 之后按需：Testcontainers、参数化测试进阶、`@Nested` 分组

## 参考

+ [JUnit 5 User Guide](https://docs.junit.org/snapshot/user-guide/)
+ [Mockito 官方文档](https://site.mockito.org/)
+ [AssertJ 文档](https://assertj.github.io/doc/)
+ [Spring Boot Testing](https://docs.spring.io/spring-boot/reference/testing/index.html)
