# MyBatis

> 本文基于 MyBatis 3.5.x（2026-09 时点最新 3.5.19）+ Spring Boot 3.x。

MyBatis 是国内 Java 后端最主流的数据访问框架：**SQL 写在 XML（或注解）里，Java 接口自动绑定实现**。定位是"SQL 映射器"——不像 ORM 那样屏蔽 SQL，而是把"手写 JDBC 的样板代码"自动化，SQL 仍由你掌控。

> 对照理解：Spring Data JPA ≈ TypeORM/Prisma（生成 SQL），MyBatis ≈ 手写 SQL + 自动映射结果。国内业务系统偏 MyBatis（SQL 可控、可调优），本篇聚焦它。

> 前置：[Spring Boot](/notes/backend/spring-boot)、[Java 基础](/notes/backend/java-basics)。

## 解决什么问题：JDBC 的样板地狱

不用 MyBatis 时，一个查询要写：建连接 → 拼 SQL → 设参数 → 执行 → 遍历 ResultSet 手动 `rs.getString("name")` 塞进对象 → 关资源（各包 try-catch）。MyBatis 把这个流程压缩成：**写 SQL + 定义接口**。

## 核心概念：三件套

```
Mapper 接口（UserMapper.java）      你定义的接口，无实现类
        ↑ 绑定
Mapper XML（UserMapper.xml）        SQL 写在这里
        ↑ 执行返回
实体/DTO（User.java / UserDTO）      结果自动映射
```

### 最小示例

```xml
<!-- resources/mapper/UserMapper.xml -->
<mapper namespace="com.example.demo.mapper.UserMapper">

    <select id="findById" resultType="com.example.demo.entity.User">
        SELECT id, name, age FROM users WHERE id = #{id}
    </select>

    <insert id="insert">
        INSERT INTO users (name, age) VALUES (#{name}, #{age})
    </insert>

</mapper>
```

```java
// 接口：方法名 = XML 的 id，参数 = SQL 的 #{}，返回值 = resultType
@Mapper
public interface UserMapper {
    User findById(Long id);
    int insert(User user);
}

// Service 里直接调用——没有实现类，MyBatis 运行时动态代理生成
User user = userMapper.findById(1L);
```

**接口没有实现类为什么能跑**：MyBatis 用 JDK 动态代理生成实现，方法调用被拦截后转向"执行绑定的 SQL"。和 Spring 的 Bean 一样，这是"运行时生成实现"的又一案例——前端可类比为 axios 实例方法或 RPC 客户端的自动生成。

## #{} 与 ${}：第一个必懂的坑

```xml
<!-- #{}：预编译参数占位，值以 ? 传给 JDBC —— 防 SQL 注入 -->
SELECT * FROM users WHERE name = #{name}
-- 实际执行: SELECT * FROM users WHERE name = ?  （值安全绑定）

<!-- ${}：字符串直接拼接 —— 有 SQL 注入风险！ -->
SELECT * FROM users ORDER BY ${columnName}
-- 用户传 columnName = "1; DROP TABLE users" 就完了
```

规则：**一切"值"用 `#{}`**；`${}` 只允许用于无法预编译的位置（列名/表名/`ORDER BY` 字段），且必须是**白名单校验过的值**，永远不要拼接用户输入。这和前端拼 SQL/拼 URL 一个道理——注入风险的本质相同。

## 动态 SQL

MyBatis 最实用的能力：按条件拼 SQL，全在 XML 标签里完成（≈ 前端在 JS 里拼查询条件，但这里是声明式）：

```xml
<select id="search" resultType="User">
    SELECT * FROM users
    <where>                              <!-- 自动处理开头多余的 AND -->
        <if test="name != null and name != ''">
            AND name LIKE CONCAT('%', #{name}, '%')
        </if>
        <if test="minAge != null">
            AND age &gt;= #{minAge}      <!-- XML 里 > 要写成 &gt; 或 CDATA -->
        </if>
        <choose>                          <!-- ≈ switch：多选一 -->
            <when test="orderBy == 'age'">ORDER BY age</when>
            <otherwise>ORDER BY id</otherwise>
        </choose>
    </where>
</select>

<!-- 批量 IN 查询 -->
<select id="findByIds" resultType="User">
    SELECT * FROM users WHERE id IN
    <foreach collection="ids" item="id" open="(" separator="," close=")">
        #{id}
    </foreach>
</select>
```

常用标签：`<if>`、`<where>`、`<set>`（UPDATE 自动去尾逗号）、`<choose>/<when>/<otherwise>`、`<foreach>`、`<trim>`（通用前后缀处理）。

## 结果映射

```xml
<!-- 列名与属性名不一致时 -->
<resultMap id="userMap" type="User">
    <id property="id" column="user_id"/>
    <result property="name" column="user_name"/>
</resultMap>
<select id="find" resultMap="userMap">
    SELECT user_id, user_name FROM users
</select>
```

+ 开启驼峰自动映射后（`map-underscore-to-camel-case: true`，Spring Boot 默认已开），`user_name` 列自动映射到 `userName` 属性，多数场景不需要手写 resultMap
+ 多表关联（`<association>` 一对一 / `<collection>` 一对多）留到实际用到再学

## Spring Boot 集成

```xml
<dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter</artifactId>
    <version>3.0.x</version>
</dependency>
```

```yaml
# application.yml
mybatis:
  mapper-locations: classpath:mapper/*.xml   # XML 扫描位置
  configuration:
    map-underscore-to-camel-case: true
```

```java
// 启动类或配置类上指定接口扫描
@MapperScan("com.example.demo.mapper")
```

## 事务：与 MyBatis 无关，归 Spring 管

常见误区：以为事务是 MyBatis 配的。实际链路是 **Spring `@Transactional` → 事务管理器 → JDBC 连接**，MyBatis 只是执行 SQL 的工具。Service 方法加 `@Transactional`，里面的多条 SQL 就在一个事务里，异常回滚——这在 [Spring Boot](/notes/backend/spring-boot) 篇已讲过，此处不重复。

## MyBatis-Plus（知道即可）

国内流行的增强层（苞米豆出品，当前 3.5.x）：继承 `BaseMapper<T>` 免写单表 CRUD、Lambda 条件构造器、分页插件。代价是多一层抽象、复杂 SQL 仍要回到 XML。**建议先把 MyBatis 本身吃透**，Plus 只是语法糖——面试和读源码时，裸 MyBatis 的 `#{}/${}`、动态 SQL、代理机制才是考点。

## 学习路径建议

1. Spring Boot 项目引入 starter，建一张表跑通"接口 + XML"完整链路（半天）
2. 故意用 `${}` 拼一个注入示例（本机测试库），亲眼看注入发生，再换 `#{}` 修复
3. 写一个多条件搜索（`<where>` + `<if>` + `<foreach>`），覆盖 90% 日常动态 SQL
4. 之后按需：`<resultMap>` 关联映射、分页插件、批量操作

## 参考

+ [MyBatis 官方文档（有中文）](https://mybatis.org/mybatis-3/zh_CN/index.html)
+ [mybatis-spring-boot-starter](https://mybatis.org/spring-boot-starter/mybatis-spring-boot-autoconfigure/)
+ [MyBatis-Plus 官网](https://baomidou.com/)
