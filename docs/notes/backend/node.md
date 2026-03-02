# Node.js

## Node.js 基础

### 事件循环（Event Loop）

+ Node.js 的事件循环分为 **6 个阶段**，按顺序依次执行：

  ```
     ┌───────────────────────┐
  ┌─>│       timers          │  setTimeout / setInterval 回调
  │  └──────────┬────────────┘
  │  ┌──────────┴────────────┐
  │  │   pending callbacks   │  系统操作回调（如 TCP 错误）
  │  └──────────┬────────────┘
  │  ┌──────────┴────────────┐
  │  │    idle, prepare      │  内部使用
  │  └──────────┬────────────┘
  │  ┌──────────┴────────────┐
  │  │        poll           │  I/O 回调（文件读写、网络请求等）
  │  └──────────┬────────────┘
  │  ┌──────────┴────────────┐
  │  │        check          │  setImmediate 回调
  │  └──────────┬────────────┘
  │  ┌──────────┴────────────┐
  └──│    close callbacks    │  关闭回调（如 socket.on('close')）
     └───────────────────────┘
  ```

+ **与浏览器事件循环的区别**：
  + 浏览器：宏任务 → 微任务 → 渲染 → 宏任务...
  + Node.js：每个阶段执行完所有回调后，才进入下一个阶段，微任务在阶段之间清空

+ **执行顺序示例**：

  ```js
  setTimeout(() => console.log('timeout'), 0)
  setImmediate(() => console.log('immediate'))

  // 在主模块中，两者顺序不确定（取决于系统性能）
  // 在 I/O 回调中，setImmediate 一定先于 setTimeout

  const fs = require('fs')
  fs.readFile(__filename, () => {
    setTimeout(() => console.log('timeout'), 0)
    setImmediate(() => console.log('immediate'))
  })
  // 输出：immediate → timeout（setImmediate 在 check 阶段，先于 timers 阶段）
  ```

+ **`process.nextTick` vs 微任务**：
  + `process.nextTick` 的优先级**高于** Promise 的 `then`
  + 它在每个阶段切换时执行，不属于任何阶段

  ```js
  Promise.resolve().then(() => console.log('promise'))
  process.nextTick(() => console.log('nextTick'))
  // 输出：nextTick → promise
  ```

### 模块化

+ **CommonJS**（Node.js 默认）

  ```js
  // 导出
  module.exports = { name: 'tom' }
  // 或
  exports.name = 'tom'

  // 导入
  const mod = require('./mod')
  ```

+ **ESM**（ES Modules）

  ```js
  // 导出
  export const name = 'tom'
  export default function() {}

  // 导入
  import { name } from './mod.mjs'
  import fn from './mod.mjs'
  ```

+ **两种模块的区别**：

  | 特性 | CommonJS | ESM |
  |------|----------|-----|
  | 加载方式 | 运行时加载（同步） | 编译时加载（静态分析） |
  | 值传递 | 值的拷贝 | 值的引用（只读绑定） |
  | this 指向 | `module.exports` | `undefined` |
  | 文件后缀 | `.js` / `.cjs` | `.mjs` 或 `package.json` 中 `"type": "module"` |
  | Tree Shaking | 不支持 | 支持 |

+ **互操作**：

  ```js
  // 在 ESM 中导入 CommonJS
  import mod from './cjs-module.cjs'  // default import 获取 module.exports

  // 在 CommonJS 中导入 ESM（需要动态 import）
  const mod = await import('./esm-module.mjs')
  ```

### 核心模块

#### path 路径处理

```js
const path = require('path')

path.join('/foo', 'bar', 'baz')     // '/foo/bar/baz'
path.resolve('/foo', 'bar')          // '/foo/bar'（绝对路径）
path.resolve('foo', 'bar')           // '/当前工作目录/foo/bar'

path.basename('/home/user/file.js')  // 'file.js'
path.basename('/home/user/file.js', '.js') // 'file'
path.dirname('/home/user/file.js')   // '/home/user'
path.extname('file.js')              // '.js'

path.parse('/home/user/file.js')
// { root: '/', dir: '/home/user', base: 'file.js', ext: '.js', name: 'file' }
```

#### fs 文件系统

```js
const fs = require('fs')
const fsp = require('fs/promises')

// 同步
const data = fs.readFileSync('file.txt', 'utf-8')

// 异步回调
fs.readFile('file.txt', 'utf-8', (err, data) => {
  if (err) throw err
  console.log(data)
})

// Promise（推荐）
const data = await fsp.readFile('file.txt', 'utf-8')

// 写文件
await fsp.writeFile('output.txt', 'hello')
await fsp.appendFile('log.txt', 'new line\n')

// 判断文件是否存在
try {
  await fsp.access('file.txt')
  console.log('文件存在')
} catch {
  console.log('文件不存在')
}

// 读取目录
const files = await fsp.readdir('./dir')
const filesWithTypes = await fsp.readdir('./dir', { withFileTypes: true })
filesWithTypes.forEach(f => {
  console.log(f.name, f.isDirectory() ? '目录' : '文件')
})
```

#### events 事件发射器

```js
const EventEmitter = require('events')

class MyEmitter extends EventEmitter {}
const emitter = new MyEmitter()

// 监听
emitter.on('data', (payload) => {
  console.log('收到:', payload)
})

// 只触发一次
emitter.once('init', () => {
  console.log('初始化完成')
})

// 触发
emitter.emit('data', { id: 1 })
emitter.emit('init')
emitter.emit('init') // 不会再触发

// 移除监听
const handler = () => console.log('hello')
emitter.on('test', handler)
emitter.removeListener('test', handler)

// 设置最大监听数（默认 10，超过会警告）
emitter.setMaxListeners(20)
```

#### stream 流

+ 流是处理大文件/大数据的核心方式，避免一次性加载到内存

```js
const fs = require('fs')

// 可读流
const readStream = fs.createReadStream('big-file.txt', {
  encoding: 'utf-8',
  highWaterMark: 64 * 1024  // 每次读取 64KB
})

readStream.on('data', (chunk) => {
  console.log('读取了', chunk.length, '字节')
})
readStream.on('end', () => console.log('读取完成'))
readStream.on('error', (err) => console.error(err))

// 可写流
const writeStream = fs.createWriteStream('output.txt')
writeStream.write('hello ')
writeStream.write('world')
writeStream.end() // 结束写入

// pipe：管道连接（最常用的方式）
fs.createReadStream('input.txt')
  .pipe(fs.createWriteStream('output.txt'))

// 转换流（Transform Stream）
const { Transform } = require('stream')
const upperCase = new Transform({
  transform(chunk, encoding, callback) {
    callback(null, chunk.toString().toUpperCase())
  }
})

fs.createReadStream('input.txt')
  .pipe(upperCase)
  .pipe(fs.createWriteStream('output.txt'))
```

#### Buffer

```js
// 创建 Buffer
const buf1 = Buffer.alloc(10)         // 10 字节的零填充
const buf2 = Buffer.from('hello')     // 从字符串创建
const buf3 = Buffer.from([0x68, 0x69]) // 从字节数组创建

// 常用操作
buf2.toString('utf-8')   // 'hello'
buf2.toString('hex')     // '68656c6c6f'
buf2.toString('base64')  // 'aGVsbG8='
buf2.length              // 5

// 拼接
const combined = Buffer.concat([buf2, Buffer.from(' world')])
combined.toString()  // 'hello world'

// 注意：Buffer 是全局对象，不需要 require
```

### process 对象

```js
// 环境变量
console.log(process.env.NODE_ENV)  // 'development' / 'production'
console.log(process.env.PORT)

// 命令行参数
// node app.js --port 3000
console.log(process.argv)
// ['node', '/path/app.js', '--port', '3000']

// 路径相关
console.log(process.cwd())   // 当前工作目录（运行 node 命令的目录）
console.log(__dirname)       // 当前文件所在目录
console.log(__filename)      // 当前文件的完整路径

// 退出
process.exit(0)   // 正常退出
process.exit(1)   // 异常退出

// 内存使用
console.log(process.memoryUsage())
// { rss: ..., heapTotal: ..., heapUsed: ..., external: ..., arrayBuffers: ... }

// 平台信息
console.log(process.platform)  // 'darwin' / 'linux' / 'win32'
console.log(process.arch)      // 'x64' / 'arm64'
console.log(process.version)   // 'v20.10.0'
```

---

## 包管理

### npm vs yarn vs pnpm

| 特性 | npm | yarn (classic) | pnpm |
|------|-----|----------------|------|
| node_modules 结构 | 扁平化（有幽灵依赖问题） | 扁平化（同 npm） | 嵌套 + 硬链接（严格隔离） |
| 磁盘占用 | 高（重复安装） | 高（重复安装） | 低（全局 store + 硬链接） |
| 锁文件 | `package-lock.json` | `yarn.lock` | `pnpm-lock.yaml` |
| 安装速度 | 较慢 | 快 | 最快 |
| monorepo | workspaces | workspaces | workspaces（原生支持最好） |

+ **幽灵依赖**：npm/yarn 扁平化安装时，未在 `package.json` 中声明的包也能被 `require` 到（因为被提升到顶层 `node_modules`），这是一个潜在风险
+ **pnpm 的优势**：通过硬链接到全局 store，项目间共享依赖，节省磁盘空间；严格的 `node_modules` 结构杜绝幽灵依赖

### package.json 关键字段

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "prebuild": "rm -rf dist",
    "build": "tsc",
    "postbuild": "echo Build done!",
    "dev": "node --watch app.js",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {},
  "devDependencies": {},
  "peerDependencies": {}
}
```

+ **依赖类型**：
  + `dependencies`：运行时依赖，会被安装
  + `devDependencies`：开发时依赖（构建工具、测试框架），生产环境不安装
  + `peerDependencies`：声明需要宿主环境提供的包（插件开发常用）

+ **scripts 生命周期钩子**：
  + `pre<script>` 在对应脚本之前自动执行
  + `post<script>` 在对应脚本之后自动执行
  + 例：运行 `npm run build` 时，会自动先执行 `prebuild`，再执行 `build`，最后执行 `postbuild`

### 版本语义（SemVer）

```
版本号格式：MAJOR.MINOR.PATCH
  MAJOR：不兼容的 API 变更
  MINOR：向下兼容的功能新增
  PATCH：向下兼容的 bug 修复
```

| 符号 | 含义 | 示例 | 允许范围 |
|------|------|------|----------|
| `^` | 允许 MINOR 和 PATCH 更新 | `^1.2.3` | `>=1.2.3 <2.0.0` |
| `~` | 只允许 PATCH 更新 | `~1.2.3` | `>=1.2.3 <1.3.0` |
| `*` | 任意版本 | `*` | `>=0.0.0` |
| 无符号 | 精确版本 | `1.2.3` | 仅 `1.2.3` |

```bash
# 常用命令
npm install express          # 安装到 dependencies
npm install -D typescript    # 安装到 devDependencies
npm install express@4.18.2   # 安装指定版本
npm update                   # 根据语义版本规则更新
npm outdated                 # 检查过时的依赖
npm audit                    # 安全审计
npm audit fix                # 自动修复安全漏洞
```

---

## 异步编程进阶

### Promise 组合方法

```js
// Promise.all：全部成功才成功，任一失败则失败
const [users, posts] = await Promise.all([
  fetchUsers(),
  fetchPosts()
])

// Promise.allSettled：等待全部完成，不管成功失败
const results = await Promise.allSettled([
  fetchA(),
  fetchB(),
  fetchC()
])
results.forEach(r => {
  if (r.status === 'fulfilled') console.log(r.value)
  else console.log(r.reason)
})

// Promise.race：第一个完成的结果（无论成功失败）
const result = await Promise.race([
  fetchData(),
  timeout(5000)  // 5 秒超时
])

// Promise.any：第一个成功的结果（全部失败才失败）
const fastest = await Promise.any([
  fetchFromCDN1(),
  fetchFromCDN2(),
  fetchFromCDN3()
])
```

### 并发控制

```js
// 限制并发数量的工具函数
async function parallelLimit(tasks, limit) {
  const results = []
  const executing = new Set()

  for (const task of tasks) {
    const p = task().then(result => {
      executing.delete(p)
      return result
    })
    executing.add(p)
    results.push(p)

    if (executing.size >= limit) {
      await Promise.race(executing)
    }
  }
  return Promise.all(results)
}

// 使用：最多同时执行 3 个任务
const urls = Array.from({ length: 100 }, (_, i) => `https://api.example.com/item/${i}`)
const tasks = urls.map(url => () => fetch(url).then(r => r.json()))
const results = await parallelLimit(tasks, 3)
```

### EventEmitter 最佳实践

```js
const EventEmitter = require('events')

class TaskQueue extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(50) // 避免大量监听器时的警告
  }

  add(task) {
    // ... 处理任务
    this.emit('task:added', task)
  }

  complete(task) {
    this.emit('task:complete', task)
  }
}

const queue = new TaskQueue()

// ✅ 正确：使用具名函数方便移除
const onAdd = (task) => console.log('added:', task)
queue.on('task:added', onAdd)

// 不再需要时及时移除，避免内存泄漏
queue.removeListener('task:added', onAdd)

// ✅ 使用 AbortController 管理生命周期（Node 16+）
const ac = new AbortController()
queue.on('task:added', (task) => {
  console.log(task)
}, { signal: ac.signal })

// 一键移除所有监听
ac.abort()
```

---

## Web 开发

### Express 基础

```js
const express = require('express')
const app = express()

// 内置中间件
app.use(express.json())                    // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true })) // 解析 URL 编码请求体
app.use(express.static('public'))           // 静态文件服务

// 路由
app.get('/api/users', (req, res) => {
  res.json({ users: [] })
})

app.post('/api/users', (req, res) => {
  const { name, email } = req.body
  res.status(201).json({ id: 1, name, email })
})

// 路由参数
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params
  res.json({ id })
})

// 查询参数
// GET /api/search?q=hello&page=1
app.get('/api/search', (req, res) => {
  const { q, page } = req.query
  res.json({ q, page })
})

// 错误处理中间件（4 个参数）
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message })
})

app.listen(3000, () => console.log('Server running on port 3000'))
```

### 中间件机制

+ Express 中间件是**线性模型**（不同于 Koa 的洋葱模型）
+ 每个中间件可以：修改 req/res、终止响应、调用 `next()` 传递控制权

```js
// 手写一个日志中间件
function logger(req, res, next) {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`)
  })
  next()
}

// 手写一个鉴权中间件
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' })
  }
  try {
    const payload = verifyToken(token)
    req.user = payload
    next()
  } catch {
    return res.status(403).json({ error: '认证失败' })
  }
}

// 使用中间件
app.use(logger)                    // 全局中间件
app.get('/profile', auth, handler) // 路由级中间件
```

+ **中间件执行顺序**：按 `app.use()` 的注册顺序从上到下执行，一旦某个中间件发送了响应（`res.send` / `res.json`），后续中间件不再执行（除非主动调用 `next()`）

### CORS 跨域

```js
const cors = require('cors')

// 简单配置：允许所有来源
app.use(cors())

// 精细配置
app.use(cors({
  origin: ['http://localhost:5173', 'https://example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,  // 允许携带 cookie
  maxAge: 86400       // 预检请求缓存时间（秒）
}))
```

+ **预检请求（OPTIONS）**：当请求满足以下任一条件时，浏览器会先发送 OPTIONS 预检请求：
  + 非简单方法（PUT、DELETE、PATCH 等）
  + 非简单请求头（Authorization、自定义头等）
  + Content-Type 不是 `text/plain`、`multipart/form-data`、`application/x-www-form-urlencoded`

### JWT 认证

```js
const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET || 'your-secret-key'

// 签发 Token
function signToken(payload) {
  return jwt.sign(payload, SECRET, {
    expiresIn: '7d'  // 过期时间
  })
}

// 验证 Token
function verifyToken(token) {
  return jwt.verify(token, SECRET)
}

// 登录接口
app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  const user = findUser(username, password) // 验证用户
  if (!user) return res.status(401).json({ error: '用户名或密码错误' })

  const token = signToken({ id: user.id, role: user.role })
  res.json({ token })
})

// 保护路由
app.get('/api/me', auth, (req, res) => {
  res.json({ user: req.user })  // req.user 来自 auth 中间件
})
```

+ **JWT 结构**：`Header.Payload.Signature`
  + Header：算法和类型（`{ "alg": "HS256", "typ": "JWT" }`）
  + Payload：数据（用户 ID、角色、过期时间等）
  + Signature：签名（防篡改）
+ **注意**：Payload 是 Base64 编码的，**不是加密的**，不要放敏感信息

---

## 进程与部署

### 子进程

```js
const { exec, spawn, fork, execFile } = require('child_process')

// exec：执行 shell 命令，返回完整输出
exec('ls -la', (err, stdout, stderr) => {
  console.log(stdout)
})

// spawn：流式执行，适合长时间运行或大量输出
const child = spawn('ls', ['-la'])
child.stdout.on('data', (data) => console.log(data.toString()))
child.stderr.on('data', (data) => console.error(data.toString()))
child.on('close', (code) => console.log(`退出码: ${code}`))

// execFile：直接执行文件，不经过 shell（更安全）
execFile('/usr/bin/node', ['script.js'], (err, stdout) => {
  console.log(stdout)
})

// fork：创建 Node.js 子进程，自带 IPC 通信通道
const worker = fork('./worker.js')
worker.send({ type: 'start', data: 'hello' })
worker.on('message', (msg) => {
  console.log('收到子进程消息:', msg)
})
```

| 方法 | Shell | 流式输出 | IPC | 适用场景 |
|------|-------|---------|-----|----------|
| `exec` | ✅ | ❌（缓冲） | ❌ | 简单 shell 命令 |
| `spawn` | ❌ | ✅ | ❌ | 大量输出 / 长时间运行 |
| `execFile` | ❌ | ❌（缓冲） | ❌ | 直接执行可执行文件 |
| `fork` | ❌ | ✅ | ✅ | Node.js 子进程通信 |

### Cluster 多进程

```js
const cluster = require('cluster')
const os = require('os')
const express = require('express')

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length
  console.log(`主进程 ${process.pid} 启动，CPU 核心数: ${numCPUs}`)

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code) => {
    console.log(`工作进程 ${worker.process.pid} 退出，重启中...`)
    cluster.fork() // 自动重启
  })
} else {
  const app = express()
  app.get('/', (req, res) => res.send(`Hello from worker ${process.pid}`))
  app.listen(3000)
  console.log(`工作进程 ${process.pid} 已启动`)
}
```

### PM2 进程管理

```bash
# 安装
npm install -g pm2

# 启动应用
pm2 start app.js --name "my-app"

# 集群模式（根据 CPU 核心数启动多个实例）
pm2 start app.js -i max --name "my-app"

# 常用命令
pm2 list                 # 查看进程列表
pm2 logs my-app          # 查看日志
pm2 monit                # 实时监控面板
pm2 restart my-app       # 重启
pm2 reload my-app        # 零停机重启（推荐生产环境）
pm2 stop my-app          # 停止
pm2 delete my-app        # 删除
pm2 startup              # 设置开机自启
pm2 save                 # 保存当前进程列表

# 配置文件 ecosystem.config.js
```

```js
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'my-app',
    script: './dist/index.js',
    instances: 'max',        // 集群模式
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    }
  }]
}
```

```bash
# 使用配置文件启动
pm2 start ecosystem.config.js
pm2 start ecosystem.config.js --env production
```

### 环境变量管理

```js
// 安装 dotenv
npm install dotenv

// .env 文件（不要提交到 git）
// PORT=3000
// DB_HOST=localhost
// DB_PASSWORD=secret

// 在项目入口加载
require('dotenv').config()
// 或 ESM
import 'dotenv/config'

console.log(process.env.PORT)       // '3000'
console.log(process.env.DB_HOST)    // 'localhost'
```

+ **最佳实践**：
  + `.env` 文件放在 `.gitignore` 中
  + 提供 `.env.example` 作为模板（只包含变量名和注释）
  + 不同环境使用不同 `.env` 文件：`.env.development`、`.env.production`

---

## 调试与性能

### 调试方式

```bash
# --inspect 模式（推荐）
node --inspect app.js
# 然后在 Chrome 打开 chrome://inspect，点击 "Open dedicated DevTools for Node"

# 自动在代码中暂停
node --inspect-brk app.js

# --watch 模式（Node 18+，文件变化自动重启）
node --watch app.js
```

```js
// 代码中使用 debugger
function processData(data) {
  debugger // 当 --inspect 连接时，会在此处暂停
  const result = data.map(item => item.value * 2)
  return result
}

// console 调试技巧
console.trace('调用栈追踪')
console.table([{ name: 'a', value: 1 }, { name: 'b', value: 2 }])
console.time('耗时')
// ... 执行操作
console.timeEnd('耗时')
```

### 内存泄漏排查

+ **常见泄漏原因**：
  + 全局变量/缓存不断增长
  + 事件监听器未移除
  + 闭包持有大对象引用
  + 定时器未清理

```js
// 启动时增加内存限制
node --max-old-space-size=4096 app.js  // 4GB

// 使用 heapdump 生成堆快照
const heapdump = require('heapdump')

// 在怀疑泄漏的地方手动触发
heapdump.writeSnapshot(`/tmp/heap-${Date.now()}.heapsnapshot`)

// 用 Chrome DevTools 打开 .heapsnapshot 文件分析
// 对比两个快照，找到持续增长的对象
```

```js
// ❌ 泄漏示例：缓存无限增长
const cache = {}
app.get('/api/data', (req, res) => {
  const key = req.query.id
  if (!cache[key]) {
    cache[key] = fetchExpensiveData(key) // 永远不会被清理
  }
  res.json(cache[key])
})

// ✅ 修复：使用 LRU 缓存限制大小
const { LRUCache } = require('lru-cache')
const cache = new LRUCache({ max: 500, ttl: 1000 * 60 * 10 }) // 最多 500 条，10 分钟过期
```

### 性能优化

```js
// ❌ 一次性读取大文件（占用大量内存）
app.get('/download', async (req, res) => {
  const data = await fs.readFile('huge-file.zip') // 2GB 文件全部加载到内存
  res.send(data)
})

// ✅ 使用流式处理
app.get('/download', (req, res) => {
  const stream = fs.createReadStream('huge-file.zip')
  stream.pipe(res)
})
```

+ **Worker Threads（CPU 密集型任务）**：

```js
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')

if (isMainThread) {
  // 主线程：将 CPU 密集任务交给 Worker
  function heavyCompute(data) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, { workerData: data })
      worker.on('message', resolve)
      worker.on('error', reject)
    })
  }

  app.get('/compute', async (req, res) => {
    const result = await heavyCompute(req.body.data)
    res.json({ result })
  })
} else {
  // Worker 线程：执行计算
  const result = doExpensiveCalculation(workerData)
  parentPort.postMessage(result)
}
```

+ **性能优化清单**：
  + 大文件用 Stream，不要一次性读入内存
  + CPU 密集任务用 Worker Threads，避免阻塞事件循环
  + 合理使用缓存（Redis / LRU Cache），减少重复计算
  + 数据库查询加索引，使用连接池
  + 开启 gzip 压缩（`compression` 中间件）
  + 使用 Cluster 模式利用多核 CPU
