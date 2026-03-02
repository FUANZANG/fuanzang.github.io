# 组件库开发笔记

> 📌 本文件记录组件库开发的核心流程：设计系统、工程化搭建、主题定制、文档生成、按需加载、测试与发布。

---

## 1. 组件库架构设计

### 技术选型

```
框架选择：
  - Vue 组件库 → Vite + Vue 3 + TypeScript
  - React 组件库 → Vite/Rollup + React + TypeScript
  - 跨框架 → Web Components / Headless UI + 多框架适配

构建工具：
  - tsup（推荐，基于 esbuild，快）
  - Rollup（灵活，生态成熟）
  - Vite Library Mode（简单场景）

文档工具：
  - Storybook（交互式组件预览，推荐）
  - VitePress / Docusaurus（文档站）
  - Histoire（Vue 专用，类 Storybook）

样式方案：
  - CSS Variables（主题定制，推荐）
  - CSS Modules（样式隔离）
  - Tailwind CSS / UnoCSS（原子化）
  - CSS-in-JS（动态主题，运行时开销）
```

### 目录结构

```
my-component-lib/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.vue          # 组件
│   │   │   ├── Button.test.ts      # 测试
│   │   │   ├── style/
│   │   │   │   ├── index.css       # 基础样式
│   │   │   │   ├── index.less      # 或 less/scss
│   │   │   │   └── vars.css        # CSS 变量
│   │   │   ├── index.ts            # 导出
│   │   │   └── stories/
│   │   │       └── Button.stories.ts  # Storybook
│   │   ├── Input/
│   │   └── ...
│   ├── composables/                # 共享 hooks/composables
│   │   ├── useClickOutside.ts
│   │   └── useZIndex.ts
│   ├── utils/                      # 工具函数
│   │   ├── dom.ts
│   │   └── validate.ts
│   ├── styles/
│   │   ├── variables.css           # 全局 CSS 变量
│   │   ├── reset.css               # 样式重置
│   │   ├── mixins.less             # Less mixins
│   │   └── index.css               # 全量样式入口
│   ├── tokens/                     # Design Tokens
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   └── typography.ts
│   ├── index.ts                    # 全量导出
│   └── types.ts                    # 全局类型
├── docs/                           # 文档（VitePress）
├── stories/                        # Storybook 配置
├── tests/                          # 测试配置
├── dist/                           # 构建产物
│   ├── es/                         # ESM 格式
│   ├── lib/                        # CJS 格式
│   └── styles/                     # 样式文件
├── tsup.config.ts
├── vite.config.ts
├── tsconfig.json
├── vitest.config.ts
├── .storybook/
│   └── main.ts
├── package.json
└── README.md
```

---

## 2. 构建配置

### tsup 构建（推荐）

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',                    // 全量入口
    // 按需导入入口（每个组件独立）
    'button': 'src/components/Button/index.ts',
    'input': 'src/components/Input/index.ts',
    'modal': 'src/components/Modal/index.ts',
  },
  format: ['cjs', 'esm'],                     // 同时输出 CJS 和 ESM
  dts: true,                                  // 生成 .d.ts 类型声明
  splitting: true,                            // 代码分割（共享代码提取）
  clean: true,                                // 构建前清理 dist
  treeshake: true,                            // Tree Shaking
  external: ['vue', 'react'],                 // 外部依赖（不打包）
  outDir: 'dist',
  // 样式处理
  onSuccess: 'npm run build:styles',          // 构建完成后执行样式构建
})
```

```json
// package.json — exports 配置
{
  "name": "@my/ui",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./button": {
      "import": "./dist/button.js",
      "require": "./dist/button.cjs",
      "types": "./dist/button.d.ts"
    },
    "./button/style": "./dist/styles/button.css",
    "./styles/*": "./dist/styles/*"
  },
  "files": ["dist", "README.md"]
}
```

### Vite Library Mode

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyUI',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `my-ui.${format}.js`,
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' },
        // 每个组件单独输出
        manualChunks: {
          button: ['src/components/Button'],
          input: ['src/components/Input'],
        },
      },
    },
    cssCodeSplit: true,  // CSS 按组件分割
  },
})
```

### 样式构建

```typescript
// scripts/build-styles.ts
import { build } from 'vite'
import { readdirSync, existsSync } from 'fs'
import { resolve } from 'path'

const componentsDir = resolve(__dirname, '../src/components')
const components = readdirSync(componentsDir).filter(dir =>
  existsSync(resolve(componentsDir, dir, 'style/index.css'))
)

async function buildStyles() {
  // 1. 构建全量样式
  await build({
    build: {
      outDir: 'dist/styles',
      lib: {
        entry: resolve(__dirname, '../src/styles/index.css'),
        formats: ['es'],
        fileName: 'index',
      },
      rollupOptions: {
        output: { assetFileNames: '[name].[ext]' },
      },
    },
  })

  // 2. 构建每个组件的独立样式
  for (const comp of components) {
    await build({
      build: {
        outDir: 'dist/styles',
        lib: {
          entry: resolve(componentsDir, comp, 'style/index.css'),
          formats: ['es'],
          fileName: comp.toLowerCase(),
        },
        rollupOptions: {
          output: { assetFileNames: `${comp.toLowerCase()}.[ext]` },
        },
      },
    })
  }
}

buildStyles()
```

---

## 3. Design Tokens（设计变量）

### 什么是 Design Tokens

```
Design Tokens 是设计系统的最小单元：
  颜色、字体、间距、圆角、阴影、动画时长等

  设计 → Tokens → 代码（CSS Variables / JS / Android / iOS）
  保证多端设计一致性
```

### CSS Variables 方案

```css
/* src/styles/variables.css */
:root {
  /* 品牌色 */
  --my-color-primary: #1677ff;
  --my-color-primary-hover: #4096ff;
  --my-color-primary-active: #0958d9;
  --my-color-primary-bg: #e6f4ff;

  /* 功能色 */
  --my-color-success: #52c41a;
  --my-color-warning: #faad14;
  --my-color-error: #ff4d4f;
  --my-color-info: #1677ff;

  /* 中性色 */
  --my-color-text: #000000e0;
  --my-color-text-secondary: #00000073;
  --my-color-text-disabled: #00000040;
  --my-color-border: #d9d9d9;
  --my-color-bg: #ffffff;
  --my-color-bg-secondary: #f5f5f5;

  /* 字体 */
  --my-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --my-font-size-xs: 12px;
  --my-font-size-sm: 14px;
  --my-font-size-md: 16px;
  --my-font-size-lg: 18px;
  --my-font-size-xl: 20px;
  --my-font-weight-regular: 400;
  --my-font-weight-medium: 500;
  --my-font-weight-bold: 600;

  /* 间距 */
  --my-spacing-xs: 4px;
  --my-spacing-sm: 8px;
  --my-spacing-md: 12px;
  --my-spacing-lg: 16px;
  --my-spacing-xl: 24px;
  --my-spacing-2xl: 32px;

  /* 圆角 */
  --my-radius-sm: 4px;
  --my-radius-md: 6px;
  --my-radius-lg: 8px;
  --my-radius-full: 9999px;

  /* 阴影 */
  --my-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --my-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --my-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);

  /* 动画 */
  --my-duration-fast: 0.1s;
  --my-duration-normal: 0.2s;
  --my-duration-slow: 0.3s;
  --my-easing-standard: cubic-bezier(0.4, 0, 0.2, 1);

  /* z-index */
  --my-z-dropdown: 1000;
  --my-z-modal: 1050;
  --my-z-popover: 1060;
  --my-z-tooltip: 1070;
}

/* 暗色主题 */
[data-theme='dark'] {
  --my-color-text: #ffffffe0;
  --my-color-text-secondary: #ffffff73;
  --my-color-bg: #141414;
  --my-color-bg-secondary: #1f1f1f;
  --my-color-border: #434343;
}
```

### JS Tokens（与 CSS Variables 同步）

```typescript
// src/tokens/colors.ts
export const colors = {
  primary: 'var(--my-color-primary)',
  primaryHover: 'var(--my-color-primary-hover)',
  success: 'var(--my-color-success)',
  warning: 'var(--my-color-warning)',
  error: 'var(--my-color-error)',
  text: 'var(--my-color-text)',
  textSecondary: 'var(--my-color-text-secondary)',
  border: 'var(--my-color-border)',
  bg: 'var(--my-color-bg)',
} as const

// src/tokens/spacing.ts
export const spacing = {
  xs: 'var(--my-spacing-xs)',
  sm: 'var(--my-spacing-sm)',
  md: 'var(--my-spacing-md)',
  lg: 'var(--my-spacing-lg)',
  xl: 'var(--my-spacing-xl)',
} as const

// 使用（在 JS/TS 中引用）
import { colors } from '@my/ui/tokens'
element.style.color = colors.primary
```

---

## 4. 组件开发规范

### Vue 组件示例

```vue
<!-- src/components/Button/Button.vue -->
<script setup lang="ts">
import { computed, useSlots } from 'vue'
import type { ButtonProps } from './types'

defineOptions({ name: 'MyButton' })

const props = withDefaults(defineProps<ButtonProps>(), {
  type: 'default',
  size: 'md',
  block: false,
  loading: false,
  disabled: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const slots = useSlots()

const classes = computed(() => [
  'my-btn',
  `my-btn--${props.type}`,
  `my-btn--${props.size}`,
  {
    'my-btn--block': props.block,
    'my-btn--loading': props.loading,
    'my-btn--disabled': props.disabled,
    'my-btn--icon-only': !slots.default && slots.icon,
  },
])

function handleClick(e: MouseEvent) {
  if (props.disabled || props.loading) return
  emit('click', e)
}
</script>

<template>
  <button :class="classes" :disabled="disabled" @click="handleClick">
    <span v-if="loading" class="my-btn__loading">
      <svg class="my-btn__spinner" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" />
      </svg>
    </span>
    <span v-if="$slots.icon && !loading" class="my-btn__icon">
      <slot name="icon" />
    </span>
    <span v-if="$slots.default" class="my-btn__content">
      <slot />
    </span>
  </button>
</template>
```

```typescript
// src/components/Button/types.ts
import type { ExtractPropTypes, PropType } from 'vue'

export type ButtonType = 'default' | 'primary' | 'success' | 'warning' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonNativeType = 'button' | 'submit' | 'reset'

export const buttonProps = {
  type: { type: String as PropType<ButtonType>, default: 'default' },
  size: { type: String as PropType<ButtonSize>, default: 'md' },
  nativeType: { type: String as PropType<ButtonNativeType>, default: 'button' },
  block: Boolean,
  loading: Boolean,
  disabled: Boolean,
} as const

export type ButtonProps = ExtractPropTypes<typeof buttonProps>
```

```css
/* src/components/Button/style/index.css */
.my-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--my-spacing-xs);
  border: 1px solid var(--my-color-border);
  border-radius: var(--my-radius-md);
  font-family: var(--my-font-family);
  font-weight: var(--my-font-weight-medium);
  cursor: pointer;
  transition: all var(--my-duration-normal) var(--my-easing-standard);
  outline: none;
  background: var(--my-color-bg);
  color: var(--my-color-text);
}

.my-btn:hover {
  border-color: var(--my-color-primary);
  color: var(--my-color-primary);
}

/* 尺寸 */
.my-btn--sm { height: 28px; padding: 0 var(--my-spacing-sm); font-size: var(--my-font-size-xs); }
.my-btn--md { height: 36px; padding: 0 var(--my-spacing-lg); font-size: var(--my-font-size-sm); }
.my-btn--lg { height: 44px; padding: 0 var(--my-spacing-xl); font-size: var(--my-font-size-md); }

/* 类型 */
.my-btn--primary {
  background: var(--my-color-primary);
  border-color: var(--my-color-primary);
  color: #fff;
}
.my-btn--primary:hover {
  background: var(--my-color-primary-hover);
  border-color: var(--my-color-primary-hover);
  color: #fff;
}

/* 状态 */
.my-btn--block { display: flex; width: 100%; }
.my-btn--disabled { opacity: 0.5; cursor: not-allowed; }
.my-btn--loading { cursor: wait; }

/* 动画 */
.my-btn__spinner {
  width: 1em;
  height: 1em;
  animation: my-btn-spin 1s linear infinite;
}
@keyframes my-btn-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

```typescript
// src/components/Button/index.ts
import Button from './Button.vue'
export { Button }
export * from './types'
export default Button
```

### React 组件示例

```tsx
// src/components/Button/Button.tsx
import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-background border border-border hover:bg-accent',
        primary: 'bg-primary text-white hover:bg-primary/90',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        danger: 'bg-error text-white hover:bg-error/90',
      },
      size: {
        sm: 'h-7 px-2 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
```

---

## 5. 主题定制方案

### 方案一：CSS Variables（推荐）

```css
/* 用户覆盖主题 */
:root {
  --my-color-primary: #7c3aed;  /* 改成紫色 */
  --my-radius-md: 12px;          /* 更大圆角 */
}
```

```typescript
// 组件库提供主题切换 API
import { ref, watch } from 'vue'

const theme = ref<'light' | 'dark'>('light')

export function useTheme() {
  function setTheme(value: 'light' | 'dark') {
    theme.value = value
    document.documentElement.setAttribute('data-theme', value)
  }

  function setCustomTheme(tokens: Record<string, string>) {
    const root = document.documentElement
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(`--my-${key}`, value)
    })
  }

  return { theme, setTheme, setCustomTheme }
}
```

### 方案二：ConfigProvider（组件级主题）

```vue
<!-- Vue: ConfigProvider 组件 -->
<script setup lang="ts">
import { provide, reactive } from 'vue'

interface ThemeConfig {
  primaryColor?: string
  borderRadius?: number
  fontSize?: number
}

const props = defineProps<{ theme?: ThemeConfig }>()

const themeConfig = reactive({
  primaryColor: '#1677ff',
  borderRadius: 6,
  fontSize: 14,
  ...props.theme,
})

provide('my-theme', themeConfig)
</script>

<template>
  <div
    :style="{
      '--my-color-primary': themeConfig.primaryColor,
      '--my-radius-md': `${themeConfig.borderRadius}px`,
      '--my-font-size-sm': `${themeConfig.fontSize}px`,
    }"
  >
    <slot />
  </div>
</template>

<!-- 使用 -->
<ConfigProvider :theme="{ primaryColor: '#7c3aed' }">
  <App />
</ConfigProvider>
```

```tsx
// React: ConfigProvider
import { createContext, useContext } from 'react'

const ThemeContext = createContext({
  primaryColor: '#1677ff',
  borderRadius: 6,
})

export function ConfigProvider({ theme, children }) {
  const cssVars = {
    '--my-color-primary': theme.primaryColor,
    '--my-radius-md': `${theme.borderRadius}px`,
  }

  return (
    <ThemeContext.Provider value={theme}>
      <div style={cssVars}>{children}</div>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
```

### 方案三：CSS-in-JS 动态主题

```typescript
// 使用 vanilla-extract（编译时 CSS-in-JS，零运行时）
// styles.css.ts
import { style, createTheme } from '@vanilla-extract/css'

export const [themeClass, vars] = createTheme({
  color: {
    primary: '#1677ff',
    bg: '#ffffff',
  },
  space: {
    sm: '8px',
    md: '16px',
  },
})

export const button = style({
  backgroundColor: vars.color.primary,
  padding: vars.space.sm,
  borderRadius: '6px',
})
```

---

## 6. 按需加载

### 自动导入（unplugin-vue-components）

```typescript
// 组件库提供 resolver
// src/resolver.ts
import type { ComponentResolver } from 'unplugin-vue-components/types'

export function MyUIResolver(): ComponentResolver {
  return {
    type: 'component',
    resolve: (name) => {
      // MyButton → button
      if (name.startsWith('My')) {
        const compName = name.slice(2).toLowerCase()
        return {
          name,
          from: `@my/ui`,
          sideEffects: `@my/ui/${compName}/style`,
        }
      }
    },
  }
}

// 用户使用
// vite.config.ts
import Components from 'unplugin-vue-components/vite'
import { MyUIResolver } from '@my/ui/resolver'

export default defineConfig({
  plugins: [
    Components({
      resolvers: [MyUIResolver()],
    }),
  ],
})

// 然后在代码中直接用，自动按需导入组件和样式
// <MyButton>点击</MyButton>
// 自动转换为:
// import { MyButton } from '@my/ui'
// import '@my/ui/button/style'
```

### Babel 插件（手动配置）

```javascript
// babel-plugin-import 配置
// .babelrc
{
  "plugins": [
    ["import", {
      "libraryName": "@my/ui",
      "libraryDirectory": "dist/es",
      "style": (name) => `${name}/style.css`
    }]
  ]
}

// 代码中
import { Button, Input } from '@my/ui'
// 转换为:
// import Button from '@my/ui/dist/es/button'
// import '@my/ui/dist/es/button/style.css'
// import Input from '@my/ui/dist/es/input'
// import '@my/ui/dist/es/input/style.css'
```

### Tree Shaking 支持

```json
// package.json — 关键配置
{
  "sideEffects": false,
  // 如果样式文件有副作用：
  // "sideEffects": ["*.css", "*.less"]
}
```

```typescript
// 组件代码必须是纯 ESM 导出
// src/index.ts
export { default as Button } from './components/Button'
export { default as Input } from './components/Input'
export { default as Modal } from './components/Modal'

// 避免在入口做副作用操作
// ❌ import './styles/global.css'  // 会阻止 Tree Shaking
// ✅ 让用户手动导入全量样式
```

---

## 7. 文档与 Storybook

### Storybook 配置

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',      // 无障碍检查
    '@storybook/addon-interactions',
    '@storybook/addon-links',
  ],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',  // 自动生成文档
  },
}

export default config
```

```typescript
// src/components/Button/Button.stories.ts
import type { Meta, StoryObj } from '@storybook/vue3'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['default', 'primary', 'success', 'warning', 'danger'],
      description: '按钮类型',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '按钮尺寸',
    },
    loading: {
      control: 'boolean',
      description: '加载状态',
    },
    disabled: {
      control: 'boolean',
      description: '禁用状态',
    },
    onClick: { action: 'clicked' },
  },
}

export default meta
type Story = StoryObj<typeof Button>

// 默认按钮
export const Default: Story = {
  args: {
    default: '默认按钮',
  },
}

// 主要按钮
export const Primary: Story = {
  args: {
    type: 'primary',
    default: '主要按钮',
  },
}

// 所有类型
export const AllTypes: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div style="display: flex; gap: 8px;">
        <Button>默认</Button>
        <Button type="primary">主要</Button>
        <Button type="success">成功</Button>
        <Button type="warning">警告</Button>
        <Button type="danger">危险</Button>
      </div>
    `,
  }),
}

// 所有尺寸
export const AllSizes: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div style="display: flex; gap: 8px; align-items: center;">
        <Button size="sm">小按钮</Button>
        <Button size="md">中按钮</Button>
        <Button size="lg">大按钮</Button>
      </div>
    `,
  }),
}

// 加载状态
export const Loading: Story = {
  args: {
    type: 'primary',
    loading: true,
    default: '加载中...',
  },
}

// 禁用状态
export const Disabled: Story = {
  args: {
    type: 'primary',
    disabled: true,
    default: '禁用按钮',
  },
}

// 带图标
export const WithIcon: Story = {
  render: () => ({
    components: { Button },
    template: `
      <Button type="primary">
        <template #icon>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </template>
        下一步
      </Button>
    `,
  }),
}
```

### VitePress 文档

```typescript
// docs/.vitepress/config.ts
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'My UI',
  description: '组件库文档',
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/quick-start' },
      { text: '组件', link: '/components/button' },
    ],
    sidebar: {
      '/guide/': [
        { text: '快速开始', link: '/guide/quick-start' },
        { text: '主题定制', link: '/guide/theming' },
        { text: '国际化', link: '/guide/i18n' },
      ],
      '/components/': [
        {
          text: '基础组件',
          items: [
            { text: 'Button 按钮', link: '/components/button' },
            { text: 'Input 输入框', link: '/components/input' },
            { text: 'Icon 图标', link: '/components/icon' },
          ],
        },
        {
          text: '反馈组件',
          items: [
            { text: 'Modal 对话框', link: '/components/modal' },
            { text: 'Toast 提示', link: '/components/toast' },
          ],
        },
      ],
    },
  },
})
```

```markdown
<!-- docs/components/button.md -->
# Button 按钮

常用的操作按钮。

## 基础用法

<demo src="../../examples/button/basic.vue" />

## 按钮类型

<demo src="../../examples/button/types.vue" />

## 按钮尺寸

<demo src="../../examples/button/sizes.vue" />

## 加载状态

<demo src="../../examples/button/loading.vue" />

## API

### Props

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| type | 按钮类型 | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger'` | `'default'` |
| size | 按钮尺寸 | `'sm' \| 'md' \| 'lg'` | `'md'` |
| loading | 加载状态 | `boolean` | `false` |
| disabled | 禁用状态 | `boolean` | `false` |

### Events

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| click | 点击按钮 | `(event: MouseEvent) => void` |

### Slots

| 插槽名 | 说明 |
|--------|------|
| default | 按钮内容 |
| icon | 自定义图标 |
```

---

## 8. 测试

### 单元测试（Vitest + Vue Test Utils）

```typescript
// src/components/Button/Button.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Button } from './Button'

describe('Button', () => {
  it('renders correctly', () => {
    const wrapper = mount(Button, {
      slots: { default: '点击我' },
    })
    expect(wrapper.text()).toBe('点击我')
    expect(wrapper.classes()).toContain('my-btn')
  })

  it('applies type class', () => {
    const wrapper = mount(Button, {
      props: { type: 'primary' },
    })
    expect(wrapper.classes()).toContain('my-btn--primary')
  })

  it('applies size class', () => {
    const wrapper = mount(Button, {
      props: { size: 'lg' },
    })
    expect(wrapper.classes()).toContain('my-btn--lg')
  })

  it('emits click event', async () => {
    const wrapper = mount(Button)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not emit click when disabled', async () => {
    const wrapper = mount(Button, {
      props: { disabled: true },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('does not emit click when loading', async () => {
    const wrapper = mount(Button, {
      props: { loading: true },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('shows loading spinner', () => {
    const wrapper = mount(Button, {
      props: { loading: true },
    })
    expect(wrapper.find('.my-btn__loading').exists()).toBe(true)
  })

  it('renders icon slot', () => {
    const wrapper = mount(Button, {
      slots: {
        icon: '<span class="custom-icon">★</span>',
        default: '收藏',
      },
    })
    expect(wrapper.find('.custom-icon').exists()).toBe(true)
    expect(wrapper.text()).toContain('收藏')
  })

  it('applies block class', () => {
    const wrapper = mount(Button, {
      props: { block: true },
    })
    expect(wrapper.classes()).toContain('my-btn--block')
  })
})
```

### 视觉回归测试（Chromatic）

```yaml
# .github/workflows/chromatic.yml
name: Chromatic

on: push

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          cache: 'pnpm'

      - run: pnpm install

      - name: Publish to Chromatic
        uses: chromaui/action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
```

### 无障碍测试

```typescript
// 使用 jest-axe / @storybook/addon-a11y
import { axe } from 'jest-axe'

it('should have no accessibility violations', async () => {
  const wrapper = mount(Button, {
    slots: { default: '点击' },
  })
  const results = await axe(wrapper.element)
  expect(results).toHaveNoViolations()
})
```

---

## 9. 发布与版本管理

### package.json 配置

```json
{
  "name": "@my/ui",
  "version": "1.0.0",
  "description": "My UI Component Library",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./resolver": {
      "import": "./dist/resolver.js",
      "require": "./dist/resolver.cjs"
    },
    "./styles/*": "./dist/styles/*"
  },
  "files": [
    "dist",
    "README.md",
    "CHANGELOG.md"
  ],
  "scripts": {
    "dev": "tsup --watch",
    "build": "tsup && npm run build:styles",
    "build:styles": "tsx scripts/build-styles.ts",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "lint": "eslint src --ext .ts,.vue",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "npm run build && changeset publish"
  },
  "peerDependencies": {
    "vue": "^3.3.0"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "@storybook/vue3-vite": "^7.6.0",
    "@vue/test-utils": "^2.4.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.2.0",
    "vue": "^3.4.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### 发布流程

```bash
# 1. 开发完成后，记录变更
pnpm changeset
# 选择包、版本类型（major/minor/patch）、写变更说明

# 2. 更新版本号
pnpm version
# 自动更新 package.json 和 CHANGELOG.md

# 3. 构建
pnpm build

# 4. 发布
pnpm release
# 发布到 npm

# 5. 提交
git add .
git commit -m "chore: release v1.1.0"
git push && git push --tags
```

---

## 10. 知名组件库参考

### 架构对比

| 组件库 | 框架 | 样式方案 | 构建工具 | 文档工具 |
|--------|------|----------|----------|----------|
| Element Plus | Vue 3 | SCSS + CSS Variables | Vite | VitePress |
| Ant Design | React | CSS-in-JS (cssinjs) | Webpack | Dumi |
| Naive UI | Vue 3 | CSS-in-JS (vueuc) | Vite | VitePress |
| shadcn/ui | React | Tailwind CSS | — | — |
| Radix UI | React | 无样式（Headless） | — | — |
| MUI | React | Emotion (CSS-in-JS) | Webpack | — |
| Arco Design | Vue/React | Less | Webpack | Arco Design |

### 值得学习的设计

```
Element Plus:
  - 完善的 TypeScript 类型
  - 主题定制（CSS Variables + ConfigProvider）
  - 国际化方案
  - 按需导入（unplugin-vue-components）

Ant Design:
  - Design Token 系统（4 层 Token 架构）
  - CSS-in-JS 动态主题
  - 完善的组件 API 设计

shadcn/ui:
  - 代码直接复制到项目中（非 npm 包）
  - Tailwind CSS 原子化
  - 高度可定制

Radix UI:
  - Headless（无样式，只提供行为和可访问性）
  - 适合需要完全自定义样式的场景
```

---

## 参考资源

- [Element Plus 源码](https://github.com/element-plus/element-plus)
- [Ant Design 源码](https://github.com/ant-design/ant-design)
- [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Storybook 文档](https://storybook.js.org/)
- [tsup 文档](https://tsup.egoist.dev/)
- [vanilla-extract](https://vanilla-extract.style/)
- [class-variance-authority](https://cva.style/)
