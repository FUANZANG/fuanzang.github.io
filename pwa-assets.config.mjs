import { defineConfig } from '@vite-pwa/assets-generator/config'

/**
 * 第一趟：透明图标 + favicon
 *
 * 沿用最初的设计 favicon.svg（圆角方块 + 透明留白）。
 * maskable / apple 置空，交给 pwa-assets.maskable.config.mjs 用全出血源图生成。
 *
 * 注意：图片路径相对 process.cwd()（项目根）解析，不要用配置里的 root
 * —— CLI 的 root 只认 -r/--root 参数，配置文件里的 root 是给 unconfig 找配置用的。
 */
export default defineConfig({
  preset: {
    transparent: {
      sizes: [64, 192, 512],
      favicons: [[64, 'favicon.ico']]
    },
    maskable: { sizes: [] },
    apple: { sizes: [] }
  },
  images: ['docs/public/favicon.svg']
})
