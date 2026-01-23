# Web 存储

> 📌 本文件记录浏览器端存储方案：Cookie、localStorage、sessionStorage、IndexedDB 的 API、容量限制、适用场景与对比。
>
> 📅 参考：MDN Web Docs | Storage quotas and eviction criteria

---

## 1. 存储方案对比

| 特性 | Cookie | localStorage | sessionStorage | IndexedDB |
|------|--------|-------------|----------------|-----------|
| 容量 | ~4 KB | 5 MiB | 5 MiB | 动态（磁盘 % ） |
| 生命周期 | 手动设置 / Session | 持久（手动清除） | 标签页关闭即清除 | 持久（手动清除） |
| 随请求发送 | ✅ 自动携带 | ❌ | ❌ | ❌ |
| 同步 / 异步 | 同步 | 同步 | 同步 | 异步 |
| 跨标签页共享 | ✅ | ✅ | ❌ | ✅ |
| 支持的数据类型 | 字符串 | 字符串 | 字符串 | 任意结构化数据 |
| 适用场景 | 身份凭证、服务端读取 | 用户偏好、持久状态 | 单次会话状态 | 大量结构化数据、离线缓存 |

---

## 2. Cookie

### 基本操作

```js
// 写入（格式：key=value; 属性...）
document.cookie = 'token=abc123; max-age=3600; path=/; SameSite=Lax'

// 读取（所有 cookie 拼成一个字符串）
document.cookie  // "token=abc123; theme=dark"

// 删除（设置过期时间为过去）
document.cookie = 'token=; max-age=0; path=/'
```

### 重要属性

```
Expires / Max-Age   — 过期时间；不设则为 Session Cookie（浏览器关闭即删）
Path                — 哪些路径可访问，默认当前路径
Domain              — 哪些域名可访问
Secure              — 仅 HTTPS 发送
HttpOnly            — JS 无法读取（防 XSS 窃取 token）
SameSite            — 控制跨站请求携带：Strict | Lax | None
```

### SameSite 对比

| 值 | 行为 |
|----|------|
| `Strict` | 仅同站请求携带，跨站导航也不携带 |
| `Lax`（默认） | 同站 + 跨站顶级导航（GET）携带 |
| `None` | 跨站均携带，**必须同时设置 Secure** |

### Cookie 的局限

- 每次 HTTP 请求都会携带，增大请求体积
- 容量仅 ~4 KB（各浏览器不同，通常每域名 20~50 个 cookie）
- `document.cookie` API 原始且不便，推荐用封装库（如 `js-cookie`）

---

## 3. localStorage

### API

```js
// 存储（值必须是字符串，对象需 JSON 序列化）
localStorage.setItem('user', JSON.stringify({ name: 'Alice', age: 25 }))

// 读取
const user = JSON.parse(localStorage.getItem('user'))

// 删除单项
localStorage.removeItem('user')

// 清空全部
localStorage.clear()

// 查询数量
localStorage.length

// 按索引获取 key
localStorage.key(0)
```

### StorageEvent（跨标签页通信）

```js
// 监听其他标签页对 localStorage 的修改
window.addEventListener('storage', (event) => {
  console.log(event.key)        // 修改的 key
  console.log(event.oldValue)   // 旧值
  console.log(event.newValue)   // 新值
  console.log(event.storageArea) // localStorage 或 sessionStorage
})

// 注意：当前标签页自己的修改不会触发此事件，只有其他标签页的修改才会
```

### 注意事项

- API 是**同步**的，频繁大量读写会阻塞主线程
- 容量超出抛出 `QuotaExceededError`，需 `try/catch`
- 隐私模式下，`localStorage` 行为等同于 `sessionStorage`，标签页关闭即清除
- 第三方 `<iframe>` 在禁用第三方 Cookie 时无法访问父页面的 localStorage

---

## 4. sessionStorage

与 localStorage API 完全相同，差异仅在生命周期和作用域：

```js
sessionStorage.setItem('step', '2')
sessionStorage.getItem('step')  // '2'
sessionStorage.removeItem('step')
sessionStorage.clear()
```

**与 localStorage 的关键区别**：

- 数据隔离到**单个标签页**，新标签页打开同一 URL 时 sessionStorage 不共享
- 标签页关闭或导航到其他 origin 后数据清除
- 适合多步骤表单、单次会话的临时状态

---

## 5. IndexedDB

IndexedDB 是浏览器内置的 NoSQL 数据库，支持事务、索引、游标，适合大量结构化数据。

### 容量

MDN 文档的存储配额规则：

- **Chrome / Chromium**：可用磁盘空间的 60%
- **Firefox**：最佳努力模式下为磁盘空间 10%（上限 10 GiB），持久模式 50%（上限 8 TiB）
- **Safari**：约磁盘空间的 60%

超出时抛出 `QuotaExceededError`。可通过 `navigator.storage.estimate()` 查询用量：

```js
const { usage, quota } = await navigator.storage.estimate()
console.log(`已用: ${(usage / 1024 / 1024).toFixed(2)} MiB`)
console.log(`配额: ${(quota / 1024 / 1024).toFixed(2)} MiB`)
```

### 核心概念

```
Database（数据库）
  └── ObjectStore（对象仓库，类似表）
        ├── Record（记录，以 keyPath 或 autoIncrement 作为主键）
        └── Index（索引，用于按非主键字段查询）

Transaction（事务）— 所有读写都在事务内进行
  ├── readonly  — 允许并发读
  └── readwrite — 独占写，同一时刻只有一个 readwrite 事务
```

### 打开数据库

```js
const request = indexedDB.open('MyDB', 1)  // 数据库名, 版本号

// 版本号升高时触发，用于创建/修改 ObjectStore
request.onupgradeneeded = (event) => {
  const db = event.target.result

  // 创建 ObjectStore，keyPath 指定主键字段
  const store = db.createObjectStore('users', { keyPath: 'id' })

  // 创建索引（可按 name 字段查询）
  store.createIndex('by_name', 'name', { unique: false })
}

request.onsuccess = (event) => {
  const db = event.target.result
  // 使用 db ...
}

request.onerror = (event) => {
  console.error('打开失败', event.target.error)
}
```

### CRUD 操作

```js
// 增：add() 主键冲突会报错；put() 是 upsert（插入或覆盖）
function addUser(db, user) {
  const tx = db.transaction('users', 'readwrite')
  const store = tx.objectStore('users')
  const req = store.add(user)
  req.onsuccess = () => console.log('已添加', req.result)
  req.onerror = (e) => console.error(e.target.error)
}

// 查：按主键
function getUser(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readonly')
    const req = tx.objectStore('users').get(id)
    req.onsuccess = () => resolve(req.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

// 查：按索引
function getUserByName(db, name) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readonly')
    const index = tx.objectStore('users').index('by_name')
    const req = index.get(name)
    req.onsuccess = () => resolve(req.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

// 改：先 get 再 put
async function updateUser(db, id, patch) {
  const user = await getUser(db, id)
  Object.assign(user, patch)
  const tx = db.transaction('users', 'readwrite')
  tx.objectStore('users').put(user)
}

// 删
function deleteUser(db, id) {
  const tx = db.transaction('users', 'readwrite')
  tx.objectStore('users').delete(id)
}

// 遍历（游标，内存友好）
function getAllUsers(db) {
  return new Promise((resolve) => {
    const users = []
    const tx = db.transaction('users', 'readonly')
    const req = tx.objectStore('users').openCursor()
    req.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        users.push(cursor.value)
        cursor.continue()
      } else {
        resolve(users)
      }
    }
  })
}
```

### add() vs put()

| | `add()` | `put()` |
|---|---|---|
| 主键已存在 | 报错（`ConstraintError`） | 覆盖（upsert） |
| 主键不存在 | 插入 | 插入 |

### getAll() vs openCursor()

| | `getAll()` | `openCursor()` |
|---|---|---|
| 返回 | 数组，一次全部加载到内存 | 逐条迭代，内存友好 |
| 适用场景 | 数据量小，需要完整数组 | 数据量大，或边读边处理 |

### 封装推荐：idb

原生 IndexedDB API 基于回调，推荐用 `idb` 库（Promise 封装，体积小）：

```js
import { openDB } from 'idb'

const db = await openDB('MyDB', 1, {
  upgrade(db) {
    db.createObjectStore('users', { keyPath: 'id' })
  }
})

// CRUD — Promise 风格
await db.add('users', { id: 1, name: 'Alice' })
const user = await db.get('users', 1)
await db.put('users', { id: 1, name: 'Bob' })
await db.delete('users', 1)
const all = await db.getAll('users')
```

---

## 6. 持久化存储（Persistent Storage）

默认情况下存储是"最佳努力"模式，浏览器在磁盘空间不足时可能驱逐数据。可请求持久化：

```js
// 请求持久化存储权限
const granted = await navigator.storage.persist()
if (granted) {
  console.log('存储不会被自动驱逐')
}

// 检查当前是否持久化
const isPersisted = await navigator.storage.persisted()
```

---

## 7. 选型建议

| 场景 | 推荐方案 |
|------|---------|
| 登录 token（需服务端读取） | Cookie（`HttpOnly` + `Secure`） |
| 用户偏好（主题、语言） | localStorage |
| 多步骤表单临时状态 | sessionStorage |
| 离线数据、大量结构化数据 | IndexedDB（建议用 `idb`） |
| 敏感数据（密钥、密码） | 不要存在任何客户端存储 |
