# 多环境与配置管理

> 前端以 [Vite: Env Variables and Modes](https://vite.dev/guide/env-and-mode) 为准。后端通用原则：密钥不进仓库、按环境注入。部署见 [前端部署](/notes/ops/frontend-deployment)、[CI/CD](/notes/ops/ci-cd)；本地多语言运行时见 [mise](/notes/engineering/mise)；拿线上环境跑本地代码（反向"多环境"）见 [Whistle 线上调试](/notes/engineering/whistle)。

## 1. 环境 ≠ 随便改几个常量

常见分层：

| 层 | 例子 | 谁注入 |
|----|------|--------|
| **本地开发** | `.env.development`、本机 Docker | 开发者 |
| **预发 / staging** | 接近生产的数据与域名 | CI / 平台 |
| **生产** | 真实密钥、最小权限 | 密钥管理 / K8s Secret |

原则：

1. **能进前端包的，就不是机密**（见下节 `VITE_`）。  
2. 同一套代码，用**配置**区分环境，而不是改业务分支乱飞。  
3. `.env*.local`、真实密钥进 `.gitignore`。

## 2. Vite：mode 与 `import.meta.env`

按官方文档：

- `vite` / `vite dev` → 默认 mode **`development`**
- `vite build` → 默认 mode **`production`**
- 自定义：`vite build --mode staging` → 会加载 `.env.staging` 等

文件加载（优先级：已存在的进程环境变量最高，不会被 `.env` 覆盖）：

```
.env                # 总是加载
.env.local          # 总是；应 gitignore
.env.[mode]         # 仅该 mode
.env.[mode].local   # 仅该 mode；应 gitignore
```

内置常量：`MODE`、`BASE_URL`、`PROD`、`DEV`、`SSR`。

### 只有 `VITE_` 前缀会进客户端

```bash
VITE_API_BASE=https://api.example.com
DB_PASSWORD=secret          # 不会出现在前端包里
```

```js
console.log(import.meta.env.VITE_API_BASE) // 字符串
console.log(import.meta.env.DB_PASSWORD)   // undefined
```

官方明确：**不要把 API 私钥写进 `VITE_*`**——它们会打进产物。机密走后端或边缘函数。

解析结果都是**字符串**；布尔/数字需自己转换。改 `.env` 后需**重启** dev server。

`vite.config` 执行时**不会**自动带上 `.env*`；若配置文件本身要用这些变量，需 `loadEnv`（见 [Configuring Vite](https://vite.dev/config/)）。

## 3. 后端 / Node：怎么放配置

| 做法 | 说明 |
|------|------|
| 进程环境变量 | 容器 / systemd / 平台面板注入 |
| `.env` + dotenv | 仅本地；生产仍以平台注入为准 |
| 配置中心 | 多服务、动态配置时再上 |

校验：启动时用 schema（Zod / convict 等）把必填项读齐，缺了直接失败，避免「跑到一半才发现没配库」。

```ts
// 示意：启动失败优于默默连错库
const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV
})
```

## 4. 前端常见坑

1. **staging 当 production 构建**：需要生产优化时，官方示例会用 `vite build --mode staging` 并在 `.env.staging` 里设 `NODE_ENV=production`（见 Vite mode 文档说明）。  
2. **把密钥写进仓库「方便同事」**：改用密钥管理或每人 `.env.local`。  
3. **以为改 `.env` 会热更新**：要重启。  
4. **SSR**：分清「只在服务端可读」与「会序列化到客户端」的配置，避免泄密。

## 5. 清单

- [ ] `.env.example` 列出键名与含义（无真实值）  
- [ ] 机密未出现在前端产物与 git 历史  
- [ ] CI 按环境注入，不把生产密钥写进 workflow 明文  
- [ ] 启动校验必填配置  

## 参考

- [Vite Env Variables and Modes](https://vite.dev/guide/env-and-mode)
- [Vite Configuring（loadEnv）](https://vite.dev/config/)
