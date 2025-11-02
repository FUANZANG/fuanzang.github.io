# 前端国际化（i18n）

> 📌 本文件记录前端国际化相关知识：i18n 核心概念、ICU 消息格式、主流框架（vue-i18n、react-i18next、FormatJS）、Intl API、日期/数字格式化、翻译管理等。
>
> 📅 基于以下版本：vue-i18n 11.x | react-i18next 15.x | i18next 25.x | FormatJS（react-intl）7.x
>
> 🔗 Vue 项目集成 vue-i18n 见 [Vue 3 笔记](/notes/vue3-note)，React 项目集成见 [React 笔记](/notes/react-note)，小程序国际化见 [小程序开发](/notes/mini-program)

---

## 1. 核心概念

```
i18n = internationalization（首尾 i 和 n 之间有 18 个字母）
l10n = localization
a11y = accessibility

国际化 vs 本地化：
  i18n — 让应用支持多语言的「工程化」工作（代码层面）
  l10n — 针对特定语言/地区的「内容翻译」工作（翻译层面）

关键术语：
  locale      — 语言区域标识，如 zh-CN、en-US、ja-JP
  messages    — 翻译文本键值对
  fallback    — 缺失翻译时的降级语言
  interpolation — 插值，如 "Hello {name}"
  pluralization  — 复数处理，如 "1 item" vs "2 items"
  context     — 上下文，同一 key 在不同语境下不同翻译
```

### locale 标识规范

```
格式：语言代码-地区代码（BCP 47）

常用 locale：
  zh-CN    简体中文
  zh-TW    繁体中文（台湾）
  zh-HK    繁体中文（香港）
  en-US    美式英语
  en-GB    英式英语
  ja-JP    日语
  ko-KR    韩语
  fr-FR    法语
  de-DE    德语
  es-ES    西班牙语
  pt-BR    巴西葡萄牙语
  ar-SA    阿拉伯语（沙特）

注意：zh 和 zh-CN 不同！
  zh     — 泛中文（浏览器可能默认映射）
  zh-CN  — 中国大陆简体中文
  zh-TW  — 台湾繁体中文
```

---

## 2. ICU Message Format

ICU（International Components for Unicode）是业界标准的消息格式语法，FormatJS 和 i18next 都支持。

### 基本插值

```text
// 简单插值
Hello {name}!

// 带类型（格式化）
You have {count, number} items.
The price is {price, number, ::currency/EUR}.
Today is {date, date, long}.
The time is {time, time, short}.
```

### 复数处理

```text
// 英文复数规则：zero / one / two / few / many / other
{count, plural,
  =0 {No items}
  =1 {One item}
  other {{count} items}
}

// 中文不需要复数（只有 other）
{count, plural,
  other {{count} 个项目}
}

// 阿拉伯语需要完整的复数形式
{count, plural,
  =0 {لا عناصر}
  =1 {عنصر واحد}
  =2 {عنصران}
  few {{count} عناصر}
  many {{count} عنصراً}
  other {{count} عنصر}
}
```

### 选择（性别等）

```text
{gender, select,
  male {He}
  female {She}
  other {They}
} went to the store.
```

### 复杂嵌套

```text
{count, plural,
  =0 {{name} has no items}
  one {{name} has # item}
  other {{name} has # items}
}

// 注意：# 是 count 的简写
```

---

## 3. 翻译文件结构

### JSON 文件组织

```
src/
├── locales/
│   ├── en-US.json
│   ├── zh-CN.json
│   └── ja-JP.json

// 或按模块拆分
src/
├── locales/
│   ├── en-US/
│   │   ├── common.json
│   │   ├── auth.json
│   │   └── dashboard.json
│   ├── zh-CN/
│   │   ├── common.json
│   │   ├── auth.json
│   │   └── dashboard.json
```

### 翻译文件示例

```json
// en-US.json
{
  "common": {
    "ok": "OK",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "loading": "Loading...",
    "error": "Something went wrong"
  },
  "auth": {
    "login": "Sign In",
    "logout": "Sign Out",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot password?"
  },
  "dashboard": {
    "welcome": "Welcome, {name}!",
    "itemCount": "{count, plural, =0 {No items} one {1 item} other {{count} items}}",
    "lastLogin": "Last login: {date, date, long}"
  }
}
```

```json
// zh-CN.json
{
  "common": {
    "ok": "确定",
    "cancel": "取消",
    "save": "保存",
    "delete": "删除",
    "loading": "加载中...",
    "error": "出了点问题"
  },
  "auth": {
    "login": "登录",
    "logout": "退出登录",
    "email": "邮箱",
    "password": "密码",
    "forgotPassword": "忘记密码？"
  },
  "dashboard": {
    "welcome": "欢迎，{name}！",
    "itemCount": "{count, plural, other {{count} 个项目}}",
    "lastLogin": "上次登录：{date, date, long}"
  }
}
```

---

## 4. Vue I18n（vue-i18n）

### 安装与配置

```bash
npm install vue-i18n@11
```

```ts
// src/i18n/index.ts
import { createI18n } from 'vue-i18n'
import enUS from './locales/en-US.json'
import zhCN from './locales/zh-CN.json'

const i18n = createI18n({
  legacy: false,          // 使用 Composition API 模式
  locale: 'zh-CN',        // 默认语言
  fallbackLocale: 'en-US', // 回退语言
  messages: {
    'en-US': enUS,
    'zh-CN': zhCN
  }
})

export default i18n
```

```ts
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import i18n from './i18n'

const app = createApp(App)
app.use(i18n)
app.mount('#app')
```

### 模板中使用

```vue
<template>
  <div>
    <!-- 基本翻译 -->
    <h1>{{ $t('common.ok') }}</h1>

    <!-- 插值 -->
    <p>{{ $t('dashboard.welcome', { name: userName }) }}</p>

    <!-- 复数 -->
    <p>{{ $t('dashboard.itemCount', { count: itemCount }) }}</p>

    <!-- 日期格式化 -->
    <p>{{ $t('dashboard.lastLogin', { date: new Date() }) }}</p>

    <!-- 无翻译时显示 key -->
    <p>{{ $t('missing.key') }}</p>
  </div>
</template>
```

### Composition API 中使用

```vue
<script setup>
import { useI18n } from 'vue-i18n'

const { t, locale, locales } = useI18n()

// 翻译函数
const title = t('common.ok')

// 切换语言
function changeLocale(lang: string) {
  locale.value = lang
}

// 动态加载语言包
async function loadLocaleMessages(lang: string) {
  if (!i18n.global.availableLocales.includes(lang)) {
    const messages = await import(`./locales/${lang}.json`)
    i18n.global.setLocaleMessage(lang, messages.default)
  }
  locale.value = lang
}
</script>

<template>
  <select :value="locale" @change="changeLocale($event.target.value)">
    <option v-for="loc in locales" :key="loc" :value="loc">
      {{ loc }}
    </option>
  </select>
</template>
```

### 日期与数字格式化

```ts
import { useI18n } from 'vue-i18n'

const { d, n } = useI18n()

// 日期格式化
d(new Date(), 'long')          // 2026年7月2日
d(new Date(), 'short')         // 2026/7/2
d(new Date(), {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
})                              // 2026年7月2日星期四

// 数字格式化
n(1234567.89, 'currency')       // ¥1,234,567.89
n(0.856, 'percent')             // 86%
n(1234567, {
  notation: 'compact',
  compactDisplay: 'short'
})                              // 123万
```

### 自定义格式化规则

```ts
// src/i18n/index.ts
const i18n = createI18n({
  locale: 'zh-CN',
  numberFormats: {
    'zh-CN': {
      currency: { style: 'currency', currency: 'CNY', notation: 'standard' },
      decimal: { style: 'decimal', minimumFractionDigits: 2 },
      percent: { style: 'percent', minimumFractionDigits: 1 }
    },
    'en-US': {
      currency: { style: 'currency', currency: 'USD' },
      decimal: { style: 'decimal', minimumFractionDigits: 2 },
      percent: { style: 'percent', minimumFractionDigits: 1 }
    }
  },
  datetimeFormats: {
    'zh-CN': {
      short: { year: 'numeric', month: '2-digit', day: '2-digit' },
      long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
    },
    'en-US': {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
    }
  }
})

// 使用
const { d, n } = useI18n()
d(new Date(), 'long')       // 使用 datetimeFormats 中的 long
n(1234.5, 'currency')       // 使用 numberFormats 中的 currency
```

---

## 5. React I18n

### 方案一：react-i18next（推荐）

```bash
npm install react-i18next i18next
```

```ts
// src/i18n/index.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enUS from './locales/en-US.json'
import zhCN from './locales/zh-CN.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': { translation: enUS },
      'zh-CN': { translation: zhCN }
    },
    lng: 'zh-CN',
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false // React 已自动转义
    }
  })

export default i18n
```

```tsx
// src/main.tsx
import './i18n' // 初始化

function App() {
  return <RouterProvider router={router} />
}
```

```tsx
// 使用 useTranslation hook
import { useTranslation } from 'react-i18next'

function Dashboard() {
  const { t, i18n } = useTranslation()

  return (
    <div>
      <h1>{t('dashboard.welcome', { name: '张三' })}</h1>
      <p>{t('dashboard.itemCount', { count: 5 })}</p>

      <select
        value={i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
      >
        <option value="zh-CN">中文</option>
        <option value="en-US">English</option>
      </select>
    </div>
  )
}
```

```tsx
// Trans 组件处理带 HTML 的翻译
import { Trans } from 'react-i18next'

// 翻译文本：'Hello <1>world</1>!'
function App() {
  return (
    <Trans i18nKey="greeting">
      Hello <strong>world</strong>!
    </Trans>
  )
}
```

### 方案二：FormatJS（react-intl）

```bash
npm install @formatjs/intl react-intl
```

```tsx
// src/App.tsx
import { IntlProvider } from 'react-intl'
import enUS from './locales/en-US.json'
import zhCN from './locales/zh-CN.json'

const messages = {
  'en-US': enUS,
  'zh-CN': zhCN
}

function App() {
  const [locale, setLocale] = useState('zh-CN')

  return (
    <IntlProvider locale={locale} messages={messages[locale]}>
      <Dashboard />
    </IntlProvider>
  )
}
```

```tsx
// 使用 useIntl hook
import { useIntl, FormattedMessage, FormattedNumber, FormattedDate } from 'react-intl'

function Dashboard() {
  const intl = useIntl()

  return (
    <div>
      {/* 组件方式 */}
      <FormattedMessage id="dashboard.welcome" values={{ name: '张三' }} />
      <FormattedNumber value={1234.5} style="currency" currency="CNY" />
      <FormattedDate value={new Date()} year="numeric" month="long" day="numeric" />

      {/* hook 方式（适合动态值） */}
      <input placeholder={intl.formatMessage({ id: 'auth.email' })} />
      <span>{intl.formatNumber(0.856, { style: 'percent' })}</span>
    </div>
  )
}
```

### react-i18next vs FormatJS 对比

| | react-i18next | FormatJS（react-intl） |
|---|---|---|
| **消息格式** | 自定义 + ICU | ICU Message（标准） |
| **包体积** | ~15KB（i18next + react-i18next） | ~40KB（含 polyfill） |
| **复数** | 支持 | 支持（ICU 标准） |
| **日期/数字** | 需 Intl API | 内置组件 |
| **翻译提取** | i18next-parser | @formatjs/cli |
| **SSR** | 支持 | 支持 |
| **TypeScript** | 支持 | 支持（类型推断更好） |
| **生态** | i18next 插件丰富 | FormatJS 工具链完整 |
| **适合** | i18next 生态、多框架 | ICU 标准、大型项目 |

---

## 6. i18next 核心

i18next 是框架无关的 i18n 库，react-i18next / vue-i18next 都基于它。

### 基本配置

```ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n
  .use(HttpBackend)           // HTTP 加载翻译文件
  .use(LanguageDetector)      // 自动检测用户语言
  .use(initReactI18next)
  .init({
    fallbackLng: 'en-US',
    debug: process.env.NODE_ENV === 'development',

    // 翻译文件路径模板
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json'
    },

    // 语言检测配置
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang'
    },

    // 命名空间（分模块）
    ns: ['common', 'auth', 'dashboard'],
    defaultNS: 'common',

    interpolation: {
      escapeValue: false
    }
  })
```

### 命名空间（Namespaces）

```ts
// 按模块拆分翻译文件
// locales/en-US/common.json
// locales/en-US/auth.json
// locales/en-US/dashboard.json

// 使用时指定命名空间
const { t } = useTranslation('auth')
t('login')  // 从 auth.json 中取

// 使用多个命名空间
const { t } = useTranslation(['common', 'auth'])
t('ok')     // 先从 common 找，找不到再从 auth 找
t('login')  // 从 auth 找
```

### 动态加载翻译

```ts
// 后端加载（i18next-http-backend）
// 自动从 /locales/{lng}/{ns}.json 加载

// 手动加载
import HttpApi from 'i18next-http-backend'

i18n.use(HttpApi).init({
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
    // 自定义请求
    request: (options, url, payload, callback) => {
      fetch(url)
        .then(res => res.json())
        .then(data => callback(null, { data, status: 200 }))
        .catch(err => callback(err, { data: null, status: 500 }))
    }
  }
})
```

---

## 7. Intl API（浏览器原生）

ECMA-402 标准，现代浏览器原生支持，无需额外依赖。

### Intl.DateTimeFormat

```ts
// 基本日期格式化
const date = new Date('2026-07-02T10:30:00')

new Intl.DateTimeFormat('zh-CN').format(date)
// "2026/7/2"

new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
}).format(date)
// "Thursday, July 2, 2026"

new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
}).format(date)
// "2026年7月2日星期四"

// 相对时间
const rtf = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })
rtf.format(-1, 'day')    // "昨天"
rtf.format(1, 'day')     // "明天"
rtf.format(-3, 'month')  // "3个月前"
```

### Intl.NumberFormat

```ts
// 数字格式化
new Intl.NumberFormat('zh-CN').format(1234567.89)
// "1,234,567.89"

// 货币
new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY'
}).format(1234.5)
// "¥1,234.50"

// 百分比
new Intl.NumberFormat('zh-CN', {
  style: 'percent',
  minimumFractionDigits: 1
}).format(0.856)
// "85.6%"

// 紧凑格式
new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  compactDisplay: 'short'
}).format(1234567)
// "123万"

// 字节单位
new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  style: 'unit',
  unit: 'byte',
  unitDisplay: 'narrow'
}).format(1048576)
// "1MB"
```

### Intl.ListFormat

```ts
// 列表格式化
const list = ['苹果', '香蕉', '橙子']

new Intl.ListFormat('zh-CN', { style: 'long', type: 'conjunction' }).format(list)
// "苹果、香蕉和橙子"

new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' }).format(list)
// "apples, bananas, and oranges"
```

### Intl.PluralRules

```ts
// 复数规则
const pr = new Intl.PluralRules('zh-CN')
pr.select(0)  // "other"
pr.select(1)  // "other"
pr.select(2)  // "other"

const prEn = new Intl.PluralRules('en-US')
prEn.select(0) // "other"
prEn.select(1) // "one"
prEn.select(2) // "other"
```

---

## 8. 语言检测与切换

### 浏览器语言检测

```ts
// 获取浏览器语言偏好
navigator.language        // "zh-CN"（首选语言）
navigator.languages       // ["zh-CN", "en-US", "ja"]（所有偏好）

// i18next-browser-languagedetector 检测顺序
// 1. querystring: ?lang=zh-CN
// 2. cookie: i18next=zh-CN
// 3. localStorage: i18nextLng=zh-CN
// 4. sessionStorage
// 5. navigator (浏览器语言)
// 6. htmlTag: <html lang="zh-CN">
```

### 持久化语言偏好

```ts
// 保存语言偏好到 localStorage
function changeLanguage(lang: string) {
  i18n.changeLanguage(lang)
  localStorage.setItem('i18nextLng', lang)
  document.documentElement.lang = lang  // 更新 html lang 属性
}

// Vue 中
const { locale } = useI18n()
watch(locale, (newLocale) => {
  localStorage.setItem('locale', newLocale)
  document.documentElement.lang = newLocale
})
```

### URL 路径语言切换

```
策略一：路径前缀
  /zh-CN/dashboard
  /en-US/dashboard

策略二：子域名
  zh.example.com
  en.example.com

策略三：查询参数
  /dashboard?lang=zh-CN

策略四：不区分（根据浏览器/用户偏好）
  /dashboard
```

```ts
// Vue Router 路径前缀方案
const routes = [
  {
    path: '/:locale(zh-CN|en-US)?',
    component: Layout,
    children: [
      { path: '', component: Dashboard },
      { path: 'about', component: About }
    ]
  }
]

// 路由守卫中切换语言
router.beforeEach((to) => {
  const locale = to.params.locale as string || 'zh-CN'
  i18n.global.locale.value = locale
})
```

---

## 9. 翻译管理工具

### 翻译提取

```bash
# i18next-parser（从代码中提取翻译 key）
npm install -D i18next-parser

# 配置文件 i18next-parser.config.js
module.exports = {
  input: ['src/**/*.{ts,tsx,vue}'],
  output: 'src/locales/$LOCALE/$NAMESPACE.json',
  defaultNamespace: 'common',
  locales: ['zh-CN', 'en-US'],
  // key 分隔符
  keySeparator: '.',
  // 使用默认值
  defaultValue: (locale, namespace, key) => {
    return locale === 'zh-CN' ? key : ''
  }
}

# 运行
npx i18next
```

```bash
# FormatJS CLI（@formatjs/cli）
npm install -D @formatjs/cli

# 提取
npx formatjs extract 'src/**/*.{ts,tsx}' --out-file lang/zh.json

# 编译
npx formatjs compile lang/zh.json --out-file src/locales/zh.json
```

### 翻译管理平台

```
开源/免费：
  - Crowdin（免费开源项目）
  - POEditor（免费额度）
  - Weblate（自托管）

商业：
  - Lokalise
  - Phrase（原 Memsource）
  - Smartling
  - Transifex

i18next 生态：
  - locize（i18next 官方推荐，有免费额度）
```

---

## 10. SSR 中的国际化

### Vue + Nuxt 3

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    locales: ['zh-CN', 'en-US'],
    defaultLocale: 'zh-CN',
    // 根据请求头检测语言
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected'
    }
  }
})
```

### React + Next.js

```tsx
// next-intl 方案
npm install next-intl

// i18n.ts
import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async ({ locale }) => {
  return {
    messages: (await import(`./messages/${locale}.json`)).default
  }
})

// middleware.ts（语言检测 + 重定向）
import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['zh-CN', 'en-US'],
  defaultLocale: 'zh-CN'
})
```

---

## 11. 常见踩坑

### 翻译 key 不要硬编码在业务逻辑中

```ts
// ❌ 错误：业务逻辑中拼接翻译 key
function getErrorMessage(code: number) {
  return t(`error.${code}`)  // key 不可预测，翻译提取工具找不到
}

// ✅ 正确：使用映射表
const ERROR_MAP: Record<number, string> = {
  401: 'error.unauthorized',
  403: 'error.forbidden',
  404: 'error.notFound',
  500: 'error.serverError'
}
function getErrorMessage(code: number) {
  return t(ERROR_MAP[code] || 'error.unknown')
}
```

### 插值不要拼接字符串

```ts
// ❌ 错误：拼接字符串
t('welcome') + name + t('suffix')

// ✅ 正确：使用插值
t('welcome', { name })
// 翻译文本: "欢迎，{name}！"
```

### 复数形式不要用 if-else

```ts
// ❌ 错误：手动判断复数
const text = count === 1 ? '1 item' : `${count} items`

// ✅ 正确：使用 ICU 复数
t('itemCount', { count })
// 翻译文本: "{count, plural, =0 {No items} one {1 item} other {{count} items}}"
```

### 日期/数字不要手动格式化

```ts
// ❌ 错误：手动格式化
const dateStr = `${year}年${month}月${day}日`
const priceStr = `¥${price.toFixed(2)}`

// ✅ 正确：使用 Intl API
const dateStr = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric'
}).format(date)
const priceStr = new Intl.NumberFormat('zh-CN', {
  style: 'currency', currency: 'CNY'
}).format(price)
```

### 注意 RTL 语言

```css
/* 阿拉伯语、希伯来语是从右到左（RTL） */
/* 需要支持 RTL 时： */

/* 使用逻辑属性替代方向属性 */
.container {
  /* ❌ */
  margin-left: 16px;
  padding-right: 16px;

  /* ✅ */
  margin-inline-start: 16px;
  padding-inline-end: 16px;
}

/* 或使用 CSS 方案 */
[dir="rtl"] .sidebar {
  margin-left: 0;
  margin-right: 16px;
}
```

```html
<!-- 根据语言设置 dir 属性 -->
<html lang="ar" dir="rtl">
```

### 不要用 Math.random() 作为 key

```vue
<!-- ❌ 错误：v-for 中用 index 或 random 作为 key -->
<div v-for="item in list" :key="item.id">
  {{ t(item.translationKey) }}
</div>

<!-- ✅ 正确：使用稳定的 key -->
<div v-for="item in list" :key="item.id">
  {{ t(item.name) }}
</div>
```

---

## 12. 最佳实践

### 翻译文件管理

```
1. key 命名规范
   - 按模块分组：auth.login, auth.logout, dashboard.title
   - 语义化命名：button.submit, label.email, message.success
   - 避免用英文句子作 key

2. 翻译文件拆分
   - 按模块拆分：common.json, auth.json, dashboard.json
   - 大型项目可按路由拆分
   - 公共翻译放 common.json

3. 默认值策略
   - 开发环境显示 key（方便发现未翻译）
   - 生产环境显示回退语言
   - 设置 defaultValue 回退
```

### 开发流程

```
1. 开发阶段
   - 使用默认语言开发
   - 翻译 key 作为占位符
   - 配置 i18next debug 模式

2. 翻译阶段
   - 提取未翻译的 key
   - 导出给翻译团队
   - 导入翻译结果

3. 测试阶段
   - 切换不同语言测试
   - 检查文本溢出（德语比中文长 30%）
   - 测试 RTL 布局
   - 验证日期/数字格式

4. 生产阶段
   - 按需加载语言包
   - 监控缺失翻译
   - A/B 测试翻译效果
```

### 代码组织

```
src/
├── i18n/
│   ├── index.ts          # i18n 初始化配置
│   ├── locales/          # 翻译文件
│   │   ├── en-US/
│   │   │   ├── common.json
│   │   │   └── auth.json
│   │   └── zh-CN/
│   │       ├── common.json
│   │       └── auth.json
│   └── helpers.ts        # 翻译工具函数
├── components/
│   └── LanguageSwitcher.vue  # 语言切换组件
```

---

## 参考

- [vue-i18n 官方文档](https://vue-i18n.intlify.dev/)
- [react-i18next 官方文档](https://react.i18next.com/)
- [i18next 官方文档](https://www.i18next.com/)
- [FormatJS（react-intl）官方文档](https://formatjs.github.io/)
- [ICU Message Format 语法](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- [MDN - Intl API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [ECMA-402 规范](https://tc39.es/ecma402/)
