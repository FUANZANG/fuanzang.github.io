# YApi 接口管理平台

> YApi 是去哪儿网开源的可视化接口管理平台，支持 API 文档、Mock、自动化测试、团队协作。
> GitHub: [YMFE/yapi](https://github.com/YMFE/yapi) | Stars: 27k+

## 项目现状

+ 最后 npm 版本：`1.12.0`（2022-11），此后无新版本发布
+ 官方维护节奏放缓，但功能稳定，社区仍有大量使用
+ 已知安全问题：早期版本存在未授权访问漏洞，**务必升级到最新版并配置鉴权**

---

## 安装部署

### Docker 部署（推荐）

最简单的方式，适合团队快速搭建：

```bash
# 一键启动（MongoDB + YApi）
docker run -d --name yapi \
  -p 3000:3000 \
  -e VERSION=1.12.0 \
  -e DB_SERVER=mongo:27017 \
  -e DB_NAME=yapi \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD=your_password \
  --link mongo:mongo \
  makingwc/yapi
```

**docker-compose 方式**（更推荐，便于管理）：

```yaml
version: '3'
services:
  mongo:
    image: mongo:4.4
    volumes:
      - mongo_data:/data/db
    restart: always

  yapi:
    image: makingwc/yapi:1.12.0
    depends_on:
      - mongo
    ports:
      - "3000:3000"
    environment:
      - VERSION=1.12.0
      - DB_SERVER=mongo:27017
      - DB_NAME=yapi
      - ADMIN_EMAIL=admin@example.com
      - ADMIN_PASSWORD=your_password
    restart: always

volumes:
  mongo_data:
```

```bash
docker-compose up -d
# 访问 http://localhost:3000
```

---

### 源码部署

适合需要定制或二次开发的场景：

```bash
# 1. 环境要求：Node.js >= 12, MongoDB >= 4
# 2. 克隆仓库
git clone https://github.com/YMFE/yapi.git
cd yapi

# 3. 安装依赖
npm install

# 4. 初始化配置（交互式，填写 MongoDB 地址、管理员邮箱等）
npm run install-server

# 5. 启动
npm run start
```

**配置文件** `config.json`：

```json
{
  "port": 3000,
  "adminAccount": "admin@example.com",
  "db": {
    "servername": "127.0.0.1",
    "DATABASE": "yapi",
    "port": 27017
  },
  "mail": {
    "enable": true,
    "host": "smtp.163.com",
    "port": 465,
    "from": "your@163.com",
    "auth": {
      "user": "your@163.com",
      "pass": "your_password"
    }
  },
  "closeRegister": false
}
```

---

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name yapi.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 项目集成

### 创建项目

1. 登录后台 → 新建项目
2. 填写项目名称、描述、基本路径（Base Path）
3. 配置环境变量（开发、测试、生产）
4. 邀请团队成员，分配角色（owner / dev / guest）

### 定义接口

+ 支持 **RESTful**、**GraphQL** 风格
+ 请求参数：Query / Body / Header / Cookie
+ 响应格式：JSON Schema 定义，自动生成文档
+ 支持 Swagger / Postman / HAR 格式导入导出

```json
// 接口请求参数示例（JSON Schema）
{
  "type": "object",
  "properties": {
    "id": { "type": "integer", "description": "用户ID" },
    "name": { "type": "string", "description": "用户名" }
  },
  "required": ["id"]
}
```

### Mock 数据

YApi 内置 Mock 引擎，根据 JSON Schema 自动生成模拟数据：

```javascript
// Mock 脚本示例（在接口的 Mock 面板编写）
{
  "code": 0,
  "message": "success",
  "data": {
    "list|10": [
      {
        "id|+1": 1,
        "name": "@cname",
        "email": "@email",
        "date": "@datetime"
      }
    ],
    "total": 100
  }
}
```

**Mock 语法**（基于 Mock.js）：

| 语法 | 说明 | 示例 |
|------|------|------|
| `@cname` | 中文名 | 张三 |
| `@email` | 邮箱 | test@qq.com |
| `@datetime` | 日期时间 | 2026-05-31 12:00:00 |
| `\|min-max` | 随机范围 | `"age\|18-60": 0` |
| `\|+step` | 自增 | `"id\|+1": 1` |
| `\|count` | 重复 | `"list\|10": [{}]` |

---

## 对接前端

### 基础：使用 Mock 地址开发

YApi 为每个接口提供 Mock 地址，前端可直接使用：

```
Mock 地址：http://yapi.example.com/mock/{project_id}/{path}
真实地址：http://api.example.com/{path}
```

**axios 配置切换环境**：

```typescript
// src/utils/request.ts
import axios from 'axios'

const instance = axios.create({
  // 开发环境用 YApi Mock，生产用真实接口
  baseURL: import.meta.env.DEV
    ? 'http://yapi.example.com/mock/15'
    : 'http://api.example.com',
  timeout: 10000
})

// 请求拦截
instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截
instance.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      // token 过期处理
    }
    return Promise.reject(err)
  }
)

export default instance
```

---

### 进阶：自动生成 API 代码

使用 [yapi-to-typescript](https://github.com/fjc0k/yapi-to-typescript) 自动生成 TypeScript 类型和请求函数：

```bash
npm i -D yapi-to-typescript
```

**配置文件** `yapi.config.ts`：

```typescript
import { defineConfig } from 'yapi-to-typescript'

export default defineConfig([
  {
    serverUrl: 'http://yapi.example.com',
    projectId: 15,
    token: 'your-project-token', // 项目设置 → token 配置
    typesOnly: false,             // true 只生成类型，false 生成完整代码
    target: 'typescript',
    requestLibPath: "import request from '@/utils/request'",
    requestOptionsType: 'AxiosRequestConfig',
    comment: {
      enabled: true,
      updateTime: false
    },
    output: 'src/api/generated',  // 输出目录
    dataKey: 'data'               // 响应数据字段
  }
])
```

```bash
# 生成代码
npx ytt
```

**生成结果示例**：

```typescript
// src/api/generated/index.ts

/** 获取用户信息 */
export type GetUserParams = {
  /** 用户ID */
  id: number
}

export type GetUserResponse = {
  code: number
  message: string
  data: {
    id: number
    name: string
    email: string
  }
}

export function getUser(params: GetUserParams, options?: AxiosRequestConfig) {
  return request<GetUserResponse>('/api/user', { method: 'GET', params, ...options })
}
```

---

### 进阶：Swagger 导出对接

YApi 支持导出 Swagger/OpenAPI 格式，前端可用其他工具消费：

```bash
# 从 YApi 导出 Swagger JSON
# 项目设置 → 数据导出 → Swagger OpenAPI V2

# 前端使用 openapi-typescript 生成类型
npx openapi-typescript swagger.json -o src/api/types.ts
```

---

### 进阶：自动化 Mock 服务

本地开发时，可以用 YApi CLI 插件同步 Mock 数据到本地：

```javascript
// vite.config.ts 中配置代理到 YApi Mock
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://yapi.example.com/mock/15',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  }
})
```

---

## 自动化测试

YApi 内置接口测试功能：

+ **单接口测试**：直接在接口详情页执行
+ **测试集合**：按流程编排多个接口，顺序执行
+ **断言**：验证响应状态码、字段值、JSON Schema
+ **环境变量**：测试集合中可传递上下文（如登录 token）

```javascript
// 测试脚本示例（在接口的"测试"面板）
// 前置脚本：设置 token
const loginRes = await yapi.http.post('/api/login', {
  username: 'admin',
  password: '123456'
})
yapi.setEnv('token', loginRes.data.token)

// 后置断言
const response = await yapi.http.get('/api/user/1')
yapi.assert.equal(response.status, 200)
yapi.assert.equal(response.data.code, 0)
```

---

## 插件开发

YApi 支持自定义插件扩展功能：

```bash
# 安装插件
yapi plugin --name yapi-plugin-xxx
```

**常用社区插件**：

| 插件 | 功能 |
|------|------|
| `yapi-plugin-qsso` | SSO 单点登录 |
| `yapi-plugin-import-postman` | Postman 导入增强 |
| `yapi-plugin-interface-oauth2-token` | OAuth2 自动获取 Token |
| `yapi-plugin-advanced-mock` | 高级 Mock（条件判断、脚本） |

---

## 安全注意事项

1. **关闭注册**：生产环境设置 `closeRegister: true`，仅管理员创建账号
2. **升级版本**：使用 >= 1.12.0，修复了早期的命令注入漏洞
3. **鉴权配置**：配置 SSO 或 OAuth2 插件
4. **网络隔离**：内网部署，Nginx 限制访问 IP
5. **定期备份**：MongoDB 数据库定时备份

---

## 替代方案对比

| 平台 | 特点 | 适用场景 |
|------|------|----------|
| **Apifox** | 国产，功能全面，免费版够用 | 国内团队首选 |
| **Postman** | 全球主流，生态丰富 | 国际化团队 |
| **ApiFox / ApiPost** | 类 Postman，支持中文 | 国内小团队 |
| **Swagger UI** | 纯文档展示 | 后端已有 Swagger 注解 |
| **Hoppscotch** | 开源，轻量级 | 自托管，隐私敏感 |

> YApi 适合需要私有部署、深度定制的场景。如果不需要私有化，Apifox 或 Postman 可能更省心。

---

## 参考

+ [YApi 官方文档](https://hellosean1025.github.io/yapi/)
+ [YApi GitHub](https://github.com/YMFE/yapi)
+ [yapi-to-typescript](https://github.com/fjc0k/yapi-to-typescript) 自动生成 TS 类型
+ [Mock.js 文档](http://mockjs.com/) YApi Mock 引擎基于 Mock.js
