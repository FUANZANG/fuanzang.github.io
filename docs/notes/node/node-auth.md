# Node 鉴权

> 本文基于 Passport + JWT（NestJS 11 / 2026-10 时点）。定位是「Node 服务端怎么做认证与授权」——凭证形态、Guard、刷新与权限；不覆盖自建 OAuth 授权服务器。

> 前置：[NestJS](/notes/node/nestjs)、[Node.js · JWT 小节](/notes/node/node#jwt-认证)。前端选型见 [前端鉴权实战](/notes/practice/frontend-auth)；Java 对标 [Spring Security](/notes/java/spring-security)；SSO 见 [SSO 与 OIDC](/notes/practice/sso-oidc)。

## 认证 vs 授权

| 概念 | 问的是 | Node 侧典型落点 |
|------|--------|----------------|
| **认证** Authentication | 你是谁 | 登录签发凭证、Guard 验票 |
| **授权** Authorization | 你能干什么 | roles / permissions 判断，**必须在服务端** |

前端藏按钮不等于安全；没过 Guard 的接口等于裸奔。

## 两种主流凭证

| 方案 | 服务端 | 前端怎么带 | 何时用 |
|------|--------|------------|--------|
| **Session + Cookie** | `express-session` / Redis 存会话 | `credentials: 'include'` | 同站、要可吊销 |
| **JWT Bearer** | 签名校验，可无状态 | `Authorization: Bearer …` | SPA 跨域、多服务、网关 |

和前端篇同一套表：能 Cookie 会话就 Cookie；必须 Bearer 时 Access 短、Refresh 放 HttpOnly。

### JWT 流（API 常见）

```
POST /api/auth/login（用户名密码）
  → 验密（bcrypt）→ 签发 accessToken（+ 可选 refreshToken）
GET /api/me
  → Guard 读 Authorization → verify → request.user = payload → 放行
```

注意：Payload **可解码不可篡改**，别塞密码、别塞隐私；过期时间要短，续期走 Refresh。

## Nest 里最小 JWT 骨架

```bash
npm i @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt
npm i -D @types/passport-jwt @types/bcrypt
```

### 签发（AuthService）

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email)
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('invalid credentials')
    }
    const payload = { sub: user.id, email: user.email, roles: user.roles }
    return {
      accessToken: await this.jwt.signAsync(payload, { expiresIn: '15m' }),
    }
  }
}
```

密码只存 **bcrypt / argon2 哈希**，永远不明文。

### Strategy + Guard

```ts
// jwt.strategy.ts
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    })
  }

  validate(payload: { sub: number; email: string; roles: string[] }) {
    // 返回值会挂到 request.user
    return { userId: payload.sub, email: payload.email, roles: payload.roles }
  }
}
```

```ts
// jwt-auth.guard.ts
import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

```ts
@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { userId: number } }) {
    return { id: req.user.userId }
  }
}
```

全局挂守卫时，用 `@Public()` + 自定义装饰器跳过登录接口（元数据 + `Reflector`），模式和 Spring Security 的 `permitAll` 同类。

## 授权：角色与权限

```ts
// roles.decorator.ts
import { SetMetadata } from '@nestjs/common'
export const Roles = (...roles: string[]) => SetMetadata('roles', roles)

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.get<string[]>('roles', ctx.getHandler())
    if (!roles?.length) return true
    const { user } = ctx.switchToHttp().getRequest()
    return roles.some((r) => user.roles?.includes(r))
  }
}
```

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Delete(':id')
remove(@Param('id') id: string) { /* … */ }
```

细粒度权限（`order:write`）同理：元数据换权限码，Guard 里查用户权限集合。

## Refresh 与吊销

无状态 JWT 的弱点是**难以踢人**。常见补齐：

| 手段 | 做法 |
|------|------|
| **短 Access + 长 Refresh** | Access 15m；Refresh 存 Redis/DB，可吊销 |
| **黑名单** | 登出把 jti 写入 Redis，Guard 校验时查 |
| **版本号** | 用户 `tokenVersion++`，payload 带版本，不匹配即失效 |

```
登录 → access + refresh
刷新 → 验 refresh（服务端存储）→ 轮转新 refresh → 发新 access
登出 → 删 refresh / 拉黑 jti
```

前端无感刷新见 [HTTP 请求与数据层](/notes/frameworks/http-request#5-token-无感刷新)。

## Session 何时更好

同站管理后台、强合规「立刻下线」：

```ts
// Express 示意；Nest 可用 @nestjs/passport 的 local + session
app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  cookie: { httpOnly: true, secure: true, sameSite: 'lax' },
}))
```

同站 Cookie 必须处理 **CSRF**（见 [前端安全](/notes/performance/frontend-security)）。

## Express 手写够不够

[Node.js](/notes/node/node) 里的 JWT 中间件适合演示。上生产建议：

1. 统一走 Passport Strategy 或 Nest Guard（别每个路由复制 `verify`）
2. 密钥进环境变量 / 密钥管理，禁止进仓
3. 登录接口限流（防撞库）
4. 错误信息不暴露「用户是否存在」时的细节差异可按安全要求收敛

## 和前端怎么对齐

| 前端方案 | Node 侧 |
|----------|---------|
| Cookie 会话 | Session 中间件 + CSRF |
| Access 内存 + Refresh Cookie | JWT Access + Refresh 存 Redis，Refresh 路径设 Cookie |
| 纯 Bearer（移动端） | 双 Token 都可放 body；Refresh 仍建议可吊销存储 |

契约先定：**登录响应字段、401/403 语义、刷新入口**，再写 Guard。

## 学习路径建议

1. Nest 里跑通 login → 签发 JWT → `JwtAuthGuard` 保护 `/me`（一天）
2. 加 `RolesGuard` 与用户表（接 [Prisma](/notes/node/node-data)）
3. 上 Refresh + Redis 吊销
4. 需要对外登录时再接 [SSO / OIDC](/notes/practice/sso-oidc)

## 参考

+ [Passport](http://www.passportjs.org/)
+ [NestJS Authentication](https://docs.nestjs.com/security/authentication)
+ [NestJS Authorization](https://docs.nestjs.com/security/authorization)
+ 本站：[NestJS](/notes/node/nestjs) · [前端鉴权实战](/notes/practice/frontend-auth) · [Spring Security](/notes/java/spring-security)
