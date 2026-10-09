# Node 测试

> 前置：[NestJS](/notes/node/nestjs)、[Node 鉴权](/notes/node/node-auth)。前端组件和 E2E 见 [前端测试](/notes/performance/frontend-testing)；Java 侧对标 [Java 测试](/notes/java/java-testing)。

测的是服务端：纯函数、Service、一条 HTTP。浏览器里的组件测试不要塞进这个仓库的同一套配置里硬凑。

## 测哪一层

| 层 | 工具 | 断言什么 |
|---|---|---|
| 纯函数、领域规则 | Vitest | 输入输出，不碰网络和数据库 |
| Nest Service | `@nestjs/testing` 的 `TestingModule` | 用假的 Repository，验证业务分支 |
| HTTP | Supertest | 状态码、响应体、鉴权失败是 401 |
| 真数据库 | Testcontainers | 只留给迁移和关键查询，见 [Docker](/notes/ops/docker) |

和前端测试金字塔一样：越往下越多、越快。一条链路的 E2E 不能代替 Service 单测。

## Service：换掉依赖

```ts
import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
import { UserService } from './user.service'

describe('UserService', () => {
  it('找不到用户时抛业务异常', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: 'UserRepo', useValue: { findById: async () => null } },
      ],
    }).compile()

    const service = moduleRef.get(UserService)
    await expect(service.getOrThrow(1)).rejects.toThrow(/not found/)
  })
})
```

假依赖只实现这个用例会碰到的方法。不要把整个 Prisma Client 原样留在单测里。

## HTTP：Supertest

```ts
import request from 'supertest'
import { beforeAll, afterAll, describe, it } from 'vitest'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from './app.module'

describe('GET /users/:id', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(() => app.close())

  it('未登录返回 401', () => {
    return request(app.getHttpServer()).get('/users/1').expect(401)
  })
})
```

Express 应用把 `app` 本身交给 `request()`，不必先 `listen` 一个端口。

## 和前端 Vitest 的差别

前端那套 `jsdom`、Testing Library 这里用不上。Node 侧要额外注意：

+ 测完关掉应用和数据库连接，否则 Vitest 进程不退出
+ 时间、随机数、`fetch` 要注入或 `vi.useFakeTimers()`，避免用例互相污染
+ 鉴权用例至少留一条「没 Token」和一条「角色不够」，逻辑细节见 [Node 鉴权](/notes/node/node-auth)

## 学习路径建议

1. 给一个纯函数写三条 Vitest（正常、边界、非法输入）
2. 用假 Repository 测 Service 的一个失败分支
3. 用 Supertest 打一条需要登录的接口，断言 401
4. 再对照 [Java 测试](/notes/java/java-testing) 看同一分层在 JUnit 里长什么样

## 参考

+ [Vitest](https://vitest.dev/)
+ [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
+ [Supertest](https://github.com/ladjs/supertest)
