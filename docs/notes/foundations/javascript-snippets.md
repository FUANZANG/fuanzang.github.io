# JS 实用片段

语言机制见 [JavaScript](/notes/foundations/javascript)。这里只留和语言核心无关、但项目里会碰到的小片段。Service Worker 见 [PWA](/notes/foundations/pwa)。

## HTML 转 PDF

把节点截成一张长图再按 A4 分页。文字不能选中，一行内容也可能被从中间切开。

```js
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

async function exportToPDF(elementId, filename = 'document.pdf') {
  const element = document.getElementById(elementId)
  if (!element) throw new Error('找不到要导出的节点')

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false
  })
  const imgData = canvas.toDataURL('image/jpeg', 1.0)
  const pdf = new jsPDF('p', 'mm', 'a4')
  const imgWidth = pdf.internal.pageSize.getWidth()
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  addLongImage(pdf, imgData, imgWidth, imgHeight)
  pdf.save(filename)
}

function addLongImage(pdf, imgData, imgWidth, imgHeight) {
  const pageHeight = pdf.internal.pageSize.getHeight()
  let heightLeft = imgHeight
  let position = 0

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight
  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }
}
```

## 禁止滚动

用固定 `body` 锁住页面，并记住原来的滚动位置。弹层内部要滚动时，把滚动留给弹层自己的 `overflow`。

```js
let scrollY = 0
let scrollLocked = false

function stopScroll() {
  if (scrollLocked) return
  scrollY = window.scrollY
  const { style } = document.body
  style.position = 'fixed'
  style.top = `-${scrollY}px`
  style.left = '0'
  style.right = '0'
  style.overflow = 'hidden'
  scrollLocked = true
}

function canScroll() {
  if (!scrollLocked) return
  const { style } = document.body
  style.position = ''
  style.top = ''
  style.left = ''
  style.right = ''
  style.overflow = ''
  window.scrollTo(0, scrollY)
  scrollLocked = false
}
```

## 下载文件

接口返回的是文件流。先看状态码，再从 `Content-Disposition` 取文件名。Excel、PDF、压缩包都走这一段。

```js
function filenameFromDisposition(header, fallback) {
  if (!header) return fallback
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (encoded) return decodeURIComponent(encoded[1])
  const plain = header.match(/filename="?([^";]+)"?/i)
  return plain ? plain[1] : fallback
}

function saveBlob(blob, filename) {
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}

async function downloadFile(url, fallbackName) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`下载失败: ${response.status}`)
  const blob = await response.blob()
  const header = response.headers.get('Content-Disposition')
  saveBlob(blob, filenameFromDisposition(header, fallbackName))
}
```

axios 在非 2xx 时会直接抛错，成功的响应体已经是二进制。下面沿用上面的 `saveBlob` 和 `filenameFromDisposition`。

```js
import axios from 'axios'

async function downloadWithAxios(url, fallbackName, params) {
  const res = await axios.get(url, { params, responseType: 'blob' })
  const header = res.headers['content-disposition']
  saveBlob(new Blob([res.data]), filenameFromDisposition(header, fallbackName))
}
```

## 前端生成 Excel

数据在浏览器里，用 SheetJS 直接生成。上面的下载是另一件事：文件已经由接口生成好了。

```js
import * as XLSX from 'xlsx'

function exportExcel(rows, filename = 'export.xlsx') {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Sheet1')
  XLSX.writeFile(book, filename)
}
```

## 复制到剪贴板

需要 HTTPS（或 localhost），并且由点击等用户操作触发。

```js
async function copyText(text) {
  await navigator.clipboard.writeText(text)
}
```

## 拼接查询参数

```js
function toQuery(params) {
  return new URLSearchParams(params).toString()
}

const url = `/api/search?${toQuery({ keyword: 'vue', page: '1' })}`
const page = new URLSearchParams(location.search).get('page')
```

## 格式化日期和金额

```js
function formatMoney(amount) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

function formatDate(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date)
}
```

## 按 id 去重

相同 `id` 只保留第一次出现的对象。

```js
function uniqueById(list) {
  const map = new Map()
  for (const item of list) {
    if (!map.has(item.id)) map.set(item.id, item)
  }
  return [...map.values()]
}
```

## 过滤空值

`0` 和 `false` 会保留。

```js
function omitEmpty(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value != null && value !== '')
  )
}
```
