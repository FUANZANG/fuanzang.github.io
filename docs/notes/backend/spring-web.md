# Spring Web 实用

> 本文基于 Spring MVC / Boot 3–4（2026-09 时点）。[Spring Boot](/notes/backend/spring-boot) 篇停在 CRUD + 校验 + 全局异常；本篇补真实项目高频四块：**Filter / Interceptor、统一分页、文件上传、跨域**。

> 前置：Spring Boot。鉴权过滤器见 [Spring Security](/notes/backend/spring-security)；前端上传见 [大文件上传](/notes/practice/large-file-upload)。

## Filter vs Interceptor：两道门

```
请求
  → Servlet Filter（容器级，Security 也在这层）
  → DispatcherServlet
  → HandlerInterceptor（Spring MVC 级）
  → Controller
```

| | Filter | Interceptor |
|---|---|---|
| 归属 | Servlet 规范 | Spring MVC |
| 能否拿到 Handler | 否（太早） | 能（知道进哪个方法） |
| 典型用途 | 编码、CORS、鉴权、gzip | 登录校验（轻量）、耗时日志、租户上下文 |
| 前端类比 | 网关/Nginx 层中间件 | 路由守卫 + axios 拦截器（应用内） |

**经验**：鉴权、CORS 用 Filter（或 Security）；「打日志、塞 TraceId、按 Handler 做差异」用 Interceptor。

### Interceptor 最小写法

```java
@Component
public class AccessLogInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        req.setAttribute("t0", System.currentTimeMillis());
        return true;   // false = 直接中断，不进 Controller
    }
    @Override
    public void afterCompletion(HttpServletRequest req, HttpServletResponse res,
                                Object handler, Exception ex) {
        long t0 = (long) req.getAttribute("t0");
        log.info("{} {} {}ms", req.getMethod(), req.getRequestURI(),
                 System.currentTimeMillis() - t0);
    }
}

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final AccessLogInterceptor accessLog;
    public WebConfig(AccessLogInterceptor accessLog) { this.accessLog = accessLog; }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(accessLog).addPathPatterns("/api/**");
    }
}
```

## 统一分页约定

前后端撕得最多的不是框架，是**分页字段名**。先约定再写代码：

| 字段 | 常见约定 | 说明 |
|---|---|---|
| 页码 | `page`（从 1）或 `pageNum` | 和前端表格组件对齐 |
| 每页条数 | `size` / `pageSize` | 服务端要设上限（防 `size=999999`） |
| 列表 | `list` / `records` / `items` | 选一个全项目统一 |
| 总条数 | `total` | 必有 |
| 总页数 | `pages` | 可选（前端可自己算） |

```java
// 请求
public record PageQuery(
    @Min(1) int page,
    @Min(1) @Max(100) int size   // 硬上限
) {
    public PageQuery {
        if (page < 1) page = 1;
        if (size < 1 || size > 100) size = 20;
    }
}

// 响应（全项目一个类型）
public record PageResult<T>(List<T> list, long total, int page, int size) {
    public static <T> PageResult<T> of(List<T> list, long total, PageQuery q) {
        return new PageResult<>(list, total, q.page(), q.size());
    }
}

@GetMapping
public PageResult<UserDTO> list(PageQuery q) {
    return userService.page(q);
}
```

MyBatis 常用 PageHelper / 手写 `LIMIT`；JPA 用 `Pageable`——**对外 DTO 仍转成你们的 `PageResult`**，别把框架类型直接暴露给前端。

## 文件上传

```java
@PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public Map<String, String> upload(@RequestPart("file") MultipartFile file) throws IOException {
    if (file.isEmpty()) throw new BizException("文件为空");
    if (file.getSize() > 2 * 1024 * 1024) throw new BizException("超过 2MB");
    String ct = file.getContentType();
    if (ct == null || !ct.startsWith("image/")) throw new BizException("仅支持图片");

    String key = UUID.randomUUID() + "-" + sanitize(file.getOriginalFilename());
    Path dest = Path.of("/data/uploads").resolve(key);
    file.transferTo(dest);                    // 本地；生产多改传 OSS
    return Map.of("url", "/files/" + key);
}
```

`application.yml` 限制：

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 2MB
      max-request-size: 3MB
```

工程要点：

+ **校验内容类型 + 扩展名**，不要只信前端
+ 文件名消毒（路径穿越 `../`）
+ 大文件 / 断点续传走对象存储 + 分片，见前端 [大文件上传](/notes/practice/large-file-upload)
+ 下载用 `Resource` + `Content-Disposition`，别把磁盘路径拼进 URL 裸奔

## CORS（跨域）

开发时前端 `localhost:5173` 调后端 `localhost:8080` 必遇。Boot 两种配法：

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173")  // 不要用 * 还带 Cookie
            .allowedMethods("*")
            .allowCredentials(true)
            .maxAge(3600);
    }
}
```

或 Security 链里 `http.cors(Customizer.withDefaults())` + 提供 `CorsConfigurationSource` Bean。

**生产**：网关 / Nginx 反代到同域更省事（前端 `/api` → 后端），能少碰 CORS 就少碰。

## 和 Boot 篇的分工

| 主题 | 所在篇 |
|---|---|
| IoC、分层、CRUD、`@Valid`、全局异常 | [Spring Boot](/notes/backend/spring-boot) |
| Filter / Interceptor、分页、上传、CORS | 本篇 |
| 鉴权过滤器链 | [Spring Security](/notes/backend/spring-security) |
| 事务 | [Spring 事务](/notes/backend/spring-transactions) |

## 学习路径建议

1. 给现有 API 加 AccessLog Interceptor，看日志里的耗时
2. 定一套 `PageQuery` / `PageResult`，所有列表接口改用它
3. 写一个头像上传接口，Postman `multipart/form-data` 跑通，再让前端 `<input type="file">` 对接
4. 本地前后端分端口时配 CORS；理解为何生产更倾向同域反代

## 参考

+ [Spring MVC 文档](https://docs.spring.io/spring-framework/reference/web/webmvc.html)
+ [Boot Web 特性](https://docs.spring.io/spring-boot/reference/web/servlet.html)
