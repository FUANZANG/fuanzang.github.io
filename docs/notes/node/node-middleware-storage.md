# Node 中间件与文件存储

> 中间件语义以 [Express: Writing middleware](https://expressjs.com/en/guide/writing-middleware.html) / [Error handling](https://expressjs.com/en/guide/error-handling.html) 为准（Express 5 起，middleware 若返回 rejected Promise 会自动 `next(err)`）。上传以 [multer（expressjs/multer）](https://www.npmjs.com/package/multer) 文档为准。数据访问见 [Node 数据访问](/notes/node/node-data)；鉴权见 [Node 鉴权](/notes/node/node-auth)；分片上传产品形态见 [大文件上传](/notes/practice/large-file-upload)。

## 1. 中间件是什么

Express 应用本质上是一串函数。每个中间件签名：

```js
function (req, res, next) { /* ... */ }
```

可以：执行逻辑、改 `req`/`res`、结束响应、或调用 `next()` 交给下一个。

**关键规则（官方文档原意）：**

- 若不结束请求，**必须**调用 `next()`，否则请求会一直挂起。
- **加载顺序 = 执行顺序**；路由若先结束了响应，后面的中间件不会跑到。
- 错误处理中间件必须是 **4 个参数** `(err, req, res, next)`，否则 Express 不会当错误处理器。

```js
// 日志
function requestLog(req, res, next) {
  console.log(req.method, req.url)
  next()
}

// 异步：Express 5 可直接 throw / reject；Express 4 需自行 try/catch 后 next(err)
async function loadUser(req, res, next) {
  try {
    req.user = await findUser(req.headers.authorization)
    next()
  } catch (err) {
    next(err)
  }
}

// 错误处理：放在路由之后
function errorHandler(err, req, res, next) {
  const status = err.status || 500
  res.status(status).json({
    error: { code: err.code || 'INTERNAL', message: err.message, requestId: req.id }
  })
}

app.use(requestLog)
app.use(loadUser)
app.get('/me', (req, res) => res.json(req.user))
app.use(errorHandler)
```

Fastify 用 hook（`onRequest` / `preHandler` 等）而不是同一套 `next` 栈，但「横切逻辑集中、错误统一出口」的思路一致。

## 2. 常见横切层顺序

生产里常见从外到内：

```
请求
 → 请求 ID / 日志
 → 超时 / 限流
 → CORS / 安全头
 → body 解析（json / urlencoded；multipart 单独走）
 → 鉴权
 → 路由业务
 → 统一错误处理
```

注意：`multipart` 不要和通用 `express.json()` 抢同一请求体；上传路由单独挂 multer。

## 3. 本地上传：multer

multer 解析 `multipart/form-data`。核心选项（npm 文档）：

| 选项 | 作用 |
|------|------|
| `dest` / `storage` | 落盘目录或自定义存储引擎 |
| `limits.fileSize` / `files` | 大小与文件个数上限（传入 busboy） |
| `fileFilter` | 按 MIME/扩展名决定接受或拒绝 |

```js
import multer from 'multer'
import crypto from 'node:crypto'
import path from 'node:path'

const storage = multer.diskStorage({
  destination: '/tmp/uploads', // 字符串时 multer 会确保目录存在；函数形式需自己建目录
  filename(req, file, cb) {
    crypto.randomBytes(16, (err, raw) => {
      if (err) return cb(err)
      // multer 不会自动加扩展名，需自己拼
      const ext = path.extname(file.originalname)
      cb(null, `${file.fieldname}-${raw.toString('hex')}${ext}`)
    })
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('ONLY_IMAGE_ALLOWED'))
    }
    cb(null, true)
  }
})

app.post('/avatars', upload.single('avatar'), (req, res) => {
  // req.file: path / filename / mimetype / size ...
  res.status(201).json({ path: req.file.filename })
})
```

安全注意：

- **不要信任** `file.originalname` 直接当路径（路径穿越）；落盘名用随机值。
- MIME 可伪造，关键场景需魔数嗅探或后端再处理（转码、杀毒）。
- 超限会报 `LIMIT_FILE_SIZE` 等错误，应在错误中间件里映射成 `413`/`400`。

内存存储（`memoryStorage`）适合小文件再转存对象存储；大文件应流式/分片，见大文件上传笔记。

## 4. 对象存储（OSS / S3 类）

本地盘适合开发与小流量；生产常见：

```
浏览器 → API（鉴权 + 签发策略）→ 直传对象存储
         或
浏览器 → API 收流 → 服务端再 put 到对象存储
```

直传优点：省应用带宽；要注意：

- 预签名 URL / 临时凭证有过期时间
- 限制 Content-Type、最大体积、键名前缀（用户隔离）
- 私有桶 + 短时签名下载；公开资源用 CDN 域名

具体 SDK 随云厂商变化，这里只固定**流程与权限边界**，实现时对照当前云文档。

## 5. 与前端约定

字段名、单文件/多文件、大小上限、错误码要写进 [API 设计约定](/notes/practice/api-design)。前端用 `FormData`：

```js
const fd = new FormData()
fd.append('avatar', file) // 字段名必须与 upload.single('avatar') 一致
await fetch('/avatars', { method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` } })
```

不要手动设 `Content-Type: multipart/form-data`（需带 boundary，浏览器会自动带）。

## 参考

- [Express writing middleware](https://expressjs.com/en/guide/writing-middleware.html)
- [Express error handling](https://expressjs.com/en/guide/error-handling.html)
- [multer on npm](https://www.npmjs.com/package/multer)
