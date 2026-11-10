# 图片压缩与处理

> 浏览器端以 [MDN: createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap)、[HTMLCanvasElement.toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob) 为准。服务端以 [sharp](https://sharp.pixelplumbing.com/)（[resize](https://sharp.pixelplumbing.com/api-resize/)、[output](https://sharp.pixelplumbing.com/api-output/)）为准。上传链路见 [大文件上传](/notes/practice/large-file-upload)、[Node 中间件与文件存储](/notes/node/node-middleware-storage)；重活可丢 [Node 异步任务](/notes/node/node-job-queue)。

## 1. 先定目标

| 目标 | 常见手段 |
|------|----------|
| 上传前减小体积 | 浏览器缩放 + 有损重编码（JPEG/WebP） |
| 多尺寸展示 | 服务端出 1x/2x 或固定宽缩略图 |
| 统一格式 | 转 WebP/AVIF（注意浏览器与业务兼容） |
| 方向正确 | 尊重 EXIF orientation，避免「横图竖着」 |

「压缩」在 Canvas 路径上通常是：**解码 → 画到位图 → 再编码**，不是无损缩小原文件字节。

## 2. 浏览器：Canvas + toBlob

```js
async function compressImage(file, { maxWidth = 1920, quality = 0.8, type = 'image/jpeg' } = {}) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, maxWidth / bitmap.width)
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')

    // JPEG 无透明：需要时可先铺底，避免透明变黑
    if (type === 'image/jpeg') {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, w, h)
    }
    ctx.drawImage(bitmap, 0, 0, w, h)

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        type,
        quality // 0–1；对 PNG 等无损格式通常被忽略
      )
    })
    return blob
  } finally {
    bitmap.close()
  }
}
```

MDN 要点：

- `toBlob(cb, type, quality)`：`quality` 仅对支持有损的类型（如 `image/jpeg`、`image/webp`）有意义。  
- 不支持的 `type` 会回退；浏览器**必须**支持 `image/png`。  
- `createImageBitmap` 的 `imageOrientation: 'from-image'` 为默认：按 EXIF 取向（若有）。  
- 可用 `resizeWidth` / `resizeHeight` 在创建 bitmap 时缩放（见 MDN options）。

注意：对已是 JPEG 的图再 `toBlob` 是**二次有损**；`quality: 1` 也不是「原样字节」。大图解码可能占内存，可配合 [Web Workers](/notes/practice/web-workers) 或限制最大边长。

## 3. 服务端：sharp

[sharp](https://www.npmjs.com/package/sharp) 基于 libvips，适合 Worker 里出多尺寸：

```js
import sharp from 'sharp'

await sharp(inputBuffer)
  .rotate() // 按 EXIF 转正（sharp 常见用法；以当前文档为准）
  .resize({ width: 1280, fit: 'inside' })
  .webp({ quality: 80 }) // quality 1–100，默认 80（官方 output 文档）
  .toFile('out.webp')
```

`resize` 的 `fit`：`cover`（默认）/ `contain` / `fill` / `inside` / `outside`，语义对齐 CSS `object-fit`（见 [sharp resize](https://sharp.pixelplumbing.com/api-resize/)）。

安装需注意可选原生依赖与 Node 版本（官方 install：Node-API v9，如 Node ≥ 20.9）——以 [sharp install](https://sharp.pixelplumbing.com/install/) 为准。

## 4. 产品策略

```
客户端：超大图先压一档，改善上传体验
服务端：权威处理（校验魔数、转码、多尺寸、剥不安全元数据）
CDN：带 hash 的 URL + 长缓存（见 HTTP 缓存 / CDN 笔记）
```

安全：扩展名不可信；服务端按内容识别。不要把用户图当 HTML 内联而不设 CSP。

## 参考

- [MDN: createImageBitmap()](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap)
- [MDN: HTMLCanvasElement.toBlob()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
- [sharp resize](https://sharp.pixelplumbing.com/api-resize/)
- [sharp output (webp 等)](https://sharp.pixelplumbing.com/api-output/)
