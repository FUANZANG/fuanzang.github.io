# Spring Security 鉴权

> 本文基于 Spring Security 6.x / Boot 3–4（2026-09 时点）。定位是「前后端对接鉴权时，Java 侧在干什么」——过滤器链、Session vs JWT、权限表达式；不覆盖 OAuth2 授权服务器搭建。

> 前置：[Spring Boot](/notes/backend/spring-boot)。前端方案选型见 [前端鉴权实战](/notes/practice/frontend-auth)；XSS/CSRF/JWT 结构见 [前端安全](/notes/performance/frontend-security)。

## 认证 vs 授权（再钉一次）

| 概念 | 英文 | 问的是 | 前端能做什么 |
|---|---|---|---|
| **认证** | Authentication | 你是谁 | 登录页、带凭证 |
| **授权** | Authorization | 你能干什么 | 藏按钮（**裁决必须在服务端**） |

Spring Security 两件事都管：拦请求做认证，再按角色/权限放行。

## 过滤器链：请求怎么过安检

Security 的核心不是一堆注解，是 **Filter Chain**——在 Servlet 容器里、Controller 之前，把请求过一遍安检：

```
HTTP 请求
  → Security Filter Chain（多条过滤器串联）
      ├─ 解析凭证（Cookie Session / Authorization: Bearer）
      ├─ 认证：凭证合法吗？→ 产出 Authentication（主体 + 权限）
      ├─ 授权：这个 URL / 方法允许当前主体吗？
      └─ 放行 / 401 / 403
  → DispatcherServlet → Controller
```

前端类比：Axios 请求拦截器 + 路由守卫叠在一起，但**强制、全局、不可绕过**——漏配一条公开接口，所有人都能打到业务代码。

### 最小配置骨架（Boot 3+）

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())   // 纯 API + Bearer 时常关；Cookie 会话必须开
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login", "/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
```

盯住三点：

1. **默认拒绝**：没写 `permitAll` 的接口一律要登录（比前端守卫「默认放行」更安全）
2. **`hasRole("ADMIN")`**：框架自动加 `ROLE_` 前缀，库里存 `ROLE_ADMIN` 或代码写 `hasRole("ADMIN")` 二选一对齐即可
3. **过滤器插入点**：JWT 校验过滤器挂在用户名密码过滤器之前，解析完把 `Authentication` 塞进 `SecurityContext`

## 两种主流方案（对标前端篇）

| 方案 | Security 侧 | 前端怎么带 | 何时用 |
|---|---|---|---|
| **Session + Cookie** | 默认形态；服务端存会话 | `credentials: 'include'` | 同站业务默认 |
| **JWT / Bearer** | 无状态；自写或用 Resource Server | `Authorization: Bearer …` | SPA 跨域、多服务、网关 |

### Session 流（服务端视角）

```
POST /login（用户名密码）
  → DaoAuthenticationProvider 验密（BCrypt）
  → 创建 HttpSession，Set-Cookie: JSESSIONID=…
GET /api/me（自动带 Cookie）
  → SessionManagementFilter 取出会话 → SecurityContext 有人了 → 放行
```

同站必须处理 **CSRF**（见前端安全篇）；`SameSite` / `HttpOnly` / `Secure` 在 Cookie 上配。

### JWT 流（API 常见）

```
POST /api/auth/login → 验密成功 → 签发 Access（短）+ Refresh（长）
后续请求 Header: Authorization: Bearer <access>
  → JwtAuthFilter：验签 + 过期 → 构造 Authentication → SecurityContext
Access 过期 → 前端用 Refresh 换新 Access（对标 HTTP 篇无感刷新）
```

```java
// 过滤器核心逻辑（示意）
String token = extractBearer(request);
if (token != null && jwtService.isValid(token)) {
    var auth = new UsernamePasswordAuthenticationToken(
        jwtService.username(token), null, jwtService.authorities(token));
    SecurityContextHolder.getContext().setAuthentication(auth);
}
filterChain.doFilter(request, response);
```

**签发与校验分工**：登录接口负责签发；过滤器只负责「有 Token 就验、验过就塞上下文」。别在每个 Controller 里手写验签。

> OAuth2 Resource Server（`spring-boot-starter-oauth2-resource-server`）可把 JWT 校验交给官方 starter，适合接公司统一认证中心；自建小项目手写 Filter 更直观。

## 方法级权限

URL 规则不够时，落到 Service 方法：

```java
@EnableMethodSecurity
public class SecurityConfig { ... }

@Service
public class OrderService {
    @PreAuthorize("hasRole('ADMIN') or #userId == authentication.name")
    public Order getOrder(String userId, Long orderId) { ... }
}
```

`authentication` 是当前登录主体；`#userId` 是方法参数——可做「本人或管理员」这类细粒度规则。

## 密码与用户从哪来

+ 密码：**BCrypt**（`PasswordEncoder` Bean），禁止明文、禁止可逆加密存库
+ 用户来源：实现 `UserDetailsService.loadUserByUsername`——查库返回用户名、哈希密码、角色集合
+ 前端只传明文密码一次（HTTPS）；之后靠 Session/JWT，不再传密码

## 和前端对接的契约清单

写接口文档时把这些钉死（比选框架更重要）：

1. 登录成功响应：Token 放 body 还是 Cookie？字段名？
2. 401 vs 403：未登录 / 已登录无权限——前端刷新与跳转逻辑不同
3. Refresh：路径、是否旋转（每次换新 Refresh）、多 Tab 互踢策略
4. 跨域：Cookie 方案要 `Allow-Credentials` + 明确 Origin；Bearer 方案 CORS 更简单
5. 登出：Session 要 `invalidate`；JWT 无状态则黑名单或短过期 + Refresh 作废

## 常见坑

+ **CSRF 关掉却用 Cookie 会话** → 跨站伪造直达
+ **JWT 长期放 localStorage** → XSS 即盗号（前端鉴权篇已强调）
+ **只藏按钮不做服务端鉴权** → 改个请求就越权
+ **过滤器里抛业务异常却返回 500** → 统一用 `AuthenticationEntryPoint`（401）、`AccessDeniedHandler`（403）

## 学习路径建议

1. 起一个 Boot 项目，加 Security，先跑通「除 `/login` 外全部 401」
2. 接 Session + 表单登录，Postman 看 Set-Cookie / 后续自动带 Cookie
3. 改成 JWT：登录签发、过滤器验签、前端用 Bearer 调 `/api/me`
4. 加 `@PreAuthorize` 与角色账号，对照前端「管理员菜单」——确认改请求也无法越权
5. 之后按需：OAuth2 Resource Server、[SSO 与 OIDC](/notes/practice/sso-oidc)、网关统一鉴权（[Spring Cloud](/notes/backend/spring-cloud) Gateway）

## 参考

+ [Spring Security 参考文档](https://docs.spring.io/spring-security/reference/)
+ [Spring Boot Security](https://docs.spring.io/spring-boot/reference/web/spring-security.html)
+ 本站：[前端鉴权实战](/notes/practice/frontend-auth) · [前端安全](/notes/performance/frontend-security)
