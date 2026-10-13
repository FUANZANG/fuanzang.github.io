import { defineConfig } from '@vite-pwa/assets-generator/config'

/**
 * 第二趟：maskable + apple-touch-icon
 *
 * 这两类按规范必须不透明（maskable 的透明区会被系统填成黑块），
 * 生成器默认用 padding 0.3 + 白色背景填充，会在 logo 外形成一圈白边。
 *
 * 改用全出血源图 icon-maskable.svg + padding 0：
 * 渐变铺满整个图标，背景根本不可见，由系统自己去裁圆角/圆形。
 *
 * 注意：生成器没有 output 目录选项，产物落在源图所在目录。
 * 源图放在 docs/icon-src/（不进部署产物），所以 npm run pwa:assets
 * 在这趟之后会把两个 PNG 搬回 docs/public/。
 */
export default defineConfig({
  preset: {
    transparent: { sizes: [] },
    maskable: { sizes: [512], padding: 0 },
    apple: { sizes: [180], padding: 0 }
  },
  images: ['docs/icon-src/icon-maskable.svg']
})
