# Java 生态与工具链

> 本文时点：2026-09。Java 生态的"版本焦虑"比前端小得多——LTS 每两年一个，框架向后兼容做得好，但**工具链概念密度高**：JVM、JDK、Maven、Spring 各是一层。本篇把这些概念一次性理清，全程对标 npm 生态。

> 语言本身见 [Java 基础](/notes/backend/java-basics)；Web 框架见 [Spring Boot](/notes/backend/spring-boot)。

## JVM / JDK / JRE

三个词经常混用，实际是三层：

```
JDK（开发工具包）
├── JRE（运行环境）
│    └── JVM（虚拟机：加载字节码、执行、GC、JIT 编译）
│         + 核心类库（java.lang / java.util ...）
└── 编译器 javac、REPL jshell、打包 jar 等工具
```

+ **JVM**：只认字节码（`.class` 文件），不认 `.java` 源码。跨平台的本质是"字节码跨平台"——编译一次，任何装了 JVM 的系统都能跑（≈ 你可以把 JS 看成各引擎的"字节码"）。
+ **JDK**：开发时装的东西；**JRE**：只运行时装的（现代 JDK 已不单独提供 JRE，直接装 JDK 即可）。

```
.java --javac--> .class（字节码） --JVM--> 运行
        编译期                        运行期（JIT 把热点字节码编译成机器码）
```

## 版本与 LTS

Java 每 6 个月发一个新版本，**每 2 年一个 LTS**（从 21 起节奏从 3 年缩短为 2 年）。非 LTS 版本生产环境基本不用。

| 版本 | 发布 | 状态（2026-09） | 里程碑特性 |
|---|---|---|---|
| 8 | 2014-03 | 存量巨大，Oracle 支持到 2030 | Lambda / Stream |
| 11 | 2018-09 | 社区支持本月结束，加速迁移中 | `var`、HTTP Client |
| 17 | 2021-09 | 存量主流 | sealed、模式匹配（预览） |
| **21** | 2023-09 | **当前生产主流** | 虚拟线程、record 模式匹配 |
| **25** | 2025-09 | **最新 LTS** | 紧凑源文件（JEP 512）、结构化并发（预览） |
| 27 | 2027-09（计划） | 下一个 LTS | — |

选型：**新项目直接 21 或 25**（Spring Boot 4 要求最低 17）；读老项目大概率是 8/11/17。

### JDK 发行版

JDK 有规范（OpenJDK）+ 多家发行版，与"Node 有官方 + 各家构建"类似但更碎片：

+ **Oracle JDK**：官方版，新 LTS 在"下一个 LTS 发布后一年内"免费商用，之后要订阅——生产环境一般不选
+ **Eclipse Temurin**：社区发行版，免费，最常见的选择
+ **Amazon Corretto**：亚马逊发行版，免费，支持周期长
+ 还有 Azul Zulu、微软 Build of OpenJDK 等

日常开发装 Temurin 或 Corretto 即可，与 Oracle JDK 功能一致。

### 安装与多版本管理

macOS 推荐 **SDKMAN**（≈ 前端的 Volta/nvm）：

```bash
curl -s "https://get.sdkman.io" | bash
sdk list java                  # 列出可用版本
sdk install java 21-tem        # 装 Temurin 21
sdk install java 25-tem
sdk use java 21                # 当前 shell 切换
sdk default java 21            # 设默认
java -version                  # 验证
```

## 构建工具：Maven（对标 npm）

Java 世界两大构建工具：**Maven**（声明式 XML，约定驱动，市场主流）和 **Gradle**（Groovy/Kotlin DSL，更灵活，Android 官方）。国内后端项目 Maven 占绝对多数，本篇聚焦 Maven。

### 心智模型对照

| 概念 | npm | Maven |
|---|---|---|
| 清单文件 | `package.json` | `pom.xml` |
| 锁文件 | `package-lock.json` | 无（Maven 3 靠"最近优先"仲裁版本） |
| 依赖存放 | 项目内 `node_modules/` | 全局本地仓库 `~/.m2/repository/` |
| 包标识 | 包名 `vue` | 三元坐标 `groupId:artifactId:version` |
| 中央仓库 | npm registry | Maven Central（国内常配阿里云镜像） |
| 运行任意脚本 | `npm run xxx` | 无（只有固定生命周期阶段） |
| 项目内 CLI | `npx` | 无直接等价（有 exec 插件） |
| 多包管理 | workspace / monorepo 工具 | 原生多模块（parent + modules） |
| 版本锁定文件随仓库 | 是 | 否（`~/.m2` 是缓存，可随时重建） |

几个关键差异展开：

**1. 依赖是全局缓存的**。npm 每个项目一份 `node_modules`（动辄几百 MB）；Maven 把所有依赖按坐标存进 `~/.m2/repository/`，多项目共享，项目本身只有 `pom.xml`。删了 `.m2` 下次构建自动重新下载。

**2. 没有任意脚本**。`npm run build` 本质是执行 package.json 里的一段 shell；Maven 只有固定的**生命周期阶段**，行为由插件实现：

```bash
mvn compile     # 编译 src/main/java
mvn test        # 跑测试（src/test/java）
mvn package     # 打包 → target/*.jar
mvn install     # package + 装进本地仓库（供其他项目依赖）
mvn clean       # 删 target/
mvn clean install -DskipTests   # 最常用的组合
```

**3. 多模块是原生的**。父 POM 声明 `modules`，子模块相互依赖，一条命令按依赖顺序构建整个仓库——不需要 pnpm workspace / Turborepo 这类外部工具。

### pom.xml 最小骨架

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>

  <!-- 坐标：这个项目在 Maven 世界的"身份证" -->
  <groupId>com.example</groupId>       <!-- 组织，≈ npm 的 @scope -->
  <artifactId>demo-api</artifactId>    <!-- 项目名 -->
  <version>1.0.0</version>             <!-- SNAPSHOT 后缀 = 开发中版本 -->

  <properties>
    <maven.compiler.release>21</maven.compiler.release>  <!-- 编译目标 JDK -->
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
      <version>4.0.0</version>
      <scope>compile</scope>   <!-- 默认值，可省 -->
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <scope>test</scope>      <!-- 只进测试 classpath -->
    </dependency>
  </dependencies>
</project>
```

### 依赖 scope

| scope | 语义 | npm 近似 |
|---|---|---|
| `compile`（默认） | 编译+运行都要 | `dependencies` |
| `test` | 仅测试 | `devDependencies` |
| `provided` | 编译要、运行由环境提供（如 Servlet 容器） | `peerDependencies` |
| `runtime` | 编译不要、运行要（如 JDBC 驱动） | — |

### 版本仲裁：传递依赖

Maven 也解析传递依赖（A 依赖 B、B 依赖 C），但策略与 npm 不同：**"最短路径优先"，同级则先声明者优先**，且没有 lockfile。追求可复现构建时，企业项目常用 `<dependencyManagement>` 统一锁定版本（≈ 手写的 lockfile 片段）。

### Maven Wrapper

很多项目仓库里有 `mvnw` 脚本（≈ Node 项目锁版本的 `.nvmrc` + volta pin，但更彻底）：它会自动下载并使用 pom 声明的 Maven 版本，团队成员无需预装 Maven。

```bash
./mvnw clean install    # 用法与 mvn 一致
```

## Spring 生态地图

"Spring" 不是单一框架，是一个家族。类比前端：Spring 之于 Java ≈ Vue 之于 JS 生态，但覆盖面更广（全家桶由同一团队维护）：

| 项目 | 定位 | 前端近似 |
|---|---|---|
| **Spring Framework** | 核心：IoC 容器、AOP、事务 | Vue core |
| **Spring Boot** | 约定+自动配置+内嵌服务器，让 Spring 好用 | Nuxt（让 Vue 好用） |
| Spring Data | 统一的数据库访问层（JPA/Redis/Mongo…） | — |
| Spring Security | 认证授权 | 见 [Spring Security 鉴权](/notes/backend/spring-security) |
| Spring Cloud | 微服务治理（网关/注册/配置中心） | 见 [Spring Cloud](/notes/backend/spring-cloud) |
| **MyBatis**（非 Spring 出品） | SQL 映射框架，国内主流 | — |
| Jackson | JSON 序列化（Spring 默认） | `JSON.parse` / axios 的序列化层 |
| Lombok | 编译期生成 getter/setter 等样板代码 | — |
| JUnit 5 + Mockito | 单测 + mock 框架 | Vitest + vi.mock() |

读后端代码时的速记：`spring-boot-starter-xxx` 是 Boot 的"场景包"——引入一个 starter，相关的依赖和默认配置自动就位（≈ 装 Nuxt module）。

## 日志体系：SLF4J + Logback

Java 日志是出了名的"套娃"——历史包袱导致**门面**和**实现**分离，前端没有对应物，第一次见必然困惑：

```
你的代码 → SLF4J（门面：统一 API，只管调用）
              ↓ 桥接
           Logback（实现：真正写日志，决定格式/输出/滚动）
```

为什么分离：早年日志实现混战（Log4j、java.util.logging…），库作者不知道用户最终用哪个实现，于是都面向 SLF4J 门面编程，用户自己插实现。**类比：SLF4J ≈ 前端 ORM 接口，Logback ≈ 具体数据库驱动**——代码只依赖接口，底层可换。

```java
// 用法（Lombok 的 @Slf4j 注解自动生成下面这行）
private static final Logger log = LoggerFactory.getLogger(MyService.class);

log.info("user {} logged in", userId);   // 占位符 {}，不要字符串拼接（省掉无谓的格式化开销）
log.error("save failed", e);             // 异常作为最后一个参数，打印完整堆栈
```

Spring Boot 默认带 Logback + 预设格式，`application.yml` 调级别即可：

```yaml
logging:
  level:
    com.example.demo: debug      # 自己的包开 debug
    root: info
```

读代码时认脸即可：`log.info`/`@Slf4j` 就是这个体系，别深究桥接细节（除非真要排查日志冲突）。

## 参考

+ [Maven 官方文档](https://maven.apache.org/guides/)
+ [SDKMAN](https://sdkman.io/)
+ [Spring 官网项目列表](https://spring.io/projects)
+ [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)
