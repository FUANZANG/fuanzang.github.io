# NestJS

> 本文基于 NestJS 11.x（2026-10 时点）。定位是「有 Express / Vue 经验时，怎么建立 Nest 的心智模型」——模块、DI、Controller/Service，以及一个最小 CRUD；不覆盖微服务与 GraphQL 专章。

NestJS 是 Node 侧最接近 **Spring Boot** 的框架：TypeScript 优先、装饰器驱动、自带 IoC 容器。底层默认挂 Express（可换成 Fastify），你写的是结构化应用，不是一堆 `app.get`。

> 运行时基础见 [Node.js](/notes/backend/node)；对标 Java：[Spring Boot](/notes/backend/spring-boot)。数据层见 [Node 数据访问](/notes/backend/node-data)；鉴权见 [Node 鉴权](/notes/backend/node-auth)。

## 解决什么问题

裸 Express 的痛点：

+ 路由、业务、数据访问全挤在中间件里，项目一大就散
+ 没有标准分层，测试时很难换假实现
+ 类型与运行时结构靠约定，团队难对齐

Nest 的一句话价值：**用模块 + DI 把 Express 能力装进可维护的应用骨架**（≈ Boot 把 Servlet 装进 Spring）。

## 与前端 / Spring 的对照

| Nest | Spring Boot | 前端类比 |
|------|-------------|---------|
| `@Module` | `@Configuration` + 包扫描 | 功能模块目录 |
| `@Injectable` / Provider | `@Service` / Bean | composable / 可注入服务 |
| `@Controller` | `@RestController` | `api/` 路由定义 |
| 构造器注入 | 构造器注入 | `provide/inject`（全局、自动装配） |
| Pipe / Guard / Interceptor | 校验 / Filter / AOP | 路由守卫 + Axios 拦截器 |

## 最小骨架

```bash
npm i -g @nestjs/cli
nest new my-api          # 选 npm / pnpm
cd my-api && npm run start:dev
```

核心文件关系：

```
src/
  main.ts                 # 创建 Nest 应用、listen
  app.module.ts           # 根模块，组装子模块
  users/
    users.module.ts
    users.controller.ts   # HTTP 入口
    users.service.ts      # 业务逻辑
```

### main.ts

```ts
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.setGlobalPrefix('api')
  await app.listen(3000)
}
bootstrap()
```

### 模块：边界与装配

```ts
import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],   // 给别的模块注入时用
})
export class UsersModule {}
```

```ts
// app.module.ts
@Module({
  imports: [UsersModule],
})
export class AppModule {}
```

模块决定「谁能注入谁」：没 `imports` / `exports`，跨模块拿不到 Provider——比 Express 全局单例更清晰。

### DI：构造器注入

```ts
import { Injectable } from '@nestjs/common'

@Injectable()
export class UsersService {
  private readonly users = new Map<number, { id: number; name: string }>()

  findOne(id: number) {
    return this.users.get(id) ?? null
  }

  create(name: string) {
    const id = this.users.size + 1
    const user = { id, name }
    this.users.set(id, user)
    return user
  }
}
```

```ts
import { Controller, Get, Post, Body, Param, ParseIntPipe, NotFoundException } from '@nestjs/common'
import { UsersService } from './users.service'

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}  // 容器注入，不要 new

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const user = this.users.findOne(id)
    if (!user) throw new NotFoundException('user not found')
    return user
  }

  @Post()
  create(@Body() body: { name: string }) {
    return this.users.create(body.name)
  }
}
```

换假实现时：测试模块里 `providers: [{ provide: UsersService, useClass: FakeUsersService }]`，Controller 不用改——这就是 DI 的意义。

## 请求生命周期（比 Express 多几层）

```
HTTP
  → Middleware（可选，偏底层）
  → Guard（认证/授权，能否进）
  → Interceptor（前：改流；后：改响应）
  → Pipe（参数转换与校验）
  → Controller 方法
  → Service …
  → Interceptor（后置）
  → 异常过滤器（有错时）
```

前端直觉：

+ **Guard** ≈ 路由守卫（`beforeEach`）
+ **Pipe** ≈ props 校验 / Zod parse
+ **Interceptor** ≈ Axios 拦截器（进出都能挂）

日常顺序记牢：**先 Guard 拦人，再 Pipe 验参，业务里少写 if**。

## 常用装饰器速查

**结构**

| 装饰器 | 作用 |
|--------|------|
| `@Module` | 声明模块 |
| `@Injectable` | 可注入 Provider |
| `@Controller('path')` | 路由控制器 |

**HTTP**

| 装饰器 | 作用 |
|--------|------|
| `@Get` / `@Post` / `@Patch` / `@Delete` | 方法映射 |
| `@Param` / `@Query` / `@Body` / `@Headers` | 取参 |
| `@HttpCode` / `@Header` | 状态码与响应头 |

**扩展点**

| 装饰器 | 作用 |
|--------|------|
| `@UseGuards` | 挂守卫 |
| `@UsePipes` / `@UseInterceptors` | 挂管道 / 拦截器 |
| `@SetMetadata` | 给反射读的自定义元数据（权限码常用） |

## DTO + ValidationPipe

```bash
npm i class-validator class-transformer
```

```ts
import { IsString, MinLength } from 'class-validator'

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string
}
```

```ts
@Post()
create(@Body() dto: CreateUserDto) {
  return this.users.create(dto.name)
}
```

全局 `ValidationPipe({ whitelist: true })`：剥掉 DTO 未声明字段，防批量赋值脏数据。这点和 Boot 的 `@Valid` + Bean Validation 同一类问题。

## 配置与环境变量

```bash
npm i @nestjs/config
```

```ts
// app.module.ts
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  UsersModule,
],
```

```ts
constructor(private readonly config: ConfigService) {
  const port = this.config.get<number>('PORT', 3000)
}
```

约定：业务代码读 `ConfigService`，不要散落 `process.env.XXX`（测试和多环境会痛）。

## 异常与统一响应

Nest 内置 `HttpException` 子类（`NotFoundException`、`UnauthorizedException` 等）。未捕获异常默认变成 JSON：

```json
{ "statusCode": 404, "message": "user not found", "error": "Not Found" }
```

要统一业务码时，写一个 `ExceptionFilter` 挂全局即可——对标 Boot 的 `@ControllerAdvice`。

## Express 何时还够用

| 场景 | 建议 |
|------|------|
| 脚本、BFF 小接口、原型 | Express / Fastify 直写 |
| 多模块业务、要测、要长期演进 | Nest |
| 已有 Express，慢慢拆 | Nest 可渐进接入；新域优先 Nest 模块 |

选型一句话：**会写 Express 不等于该用 Express 撑中大型 API**；Nest 换的是可维护性，不是性能神话。

## 学习路径建议

1. `nest new` 跑通一个返回 JSON 的 Controller（半天）
2. 拆 Service + 构造器注入，单测里换 Fake（一天）
3. 接 [Prisma](/notes/backend/node-data) 做真实 CRUD
4. 再加 [鉴权](/notes/backend/node-auth)（JWT Guard）与全局 ValidationPipe

## 参考

+ [NestJS 官方文档](https://docs.nestjs.com/)
+ [Nest CLI](https://docs.nestjs.com/cli/overview)
+ 本站：[Node.js](/notes/backend/node) · [Spring Boot](/notes/backend/spring-boot) · [Node 数据访问](/notes/backend/node-data) · [Node 鉴权](/notes/backend/node-auth)
