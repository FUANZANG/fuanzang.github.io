import { defineConfig } from 'vitepress'
import { getExploreNavItems } from '../data/siteSections.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_DIR = path.resolve(__dirname, '..')

// 读取 algorithm 目录，按 index.md 表格的顺序和难度分组生成 sidebar
function getAlgorithmSidebar() {
  const algDir = path.join(DOCS_DIR, 'algorithm')
  const indexPath = path.join(algDir, 'index.md')
  // 解析 index.md 表格: | 题目 | 难度 | [slug](./slug.md) |
  const order = [] // { text, slug, level }
  if (fs.existsSync(indexPath)) {
    const lines = fs.readFileSync(indexPath, 'utf-8').split('\n')
    for (const ln of lines) {
      const m = ln.match(/^\|\s*(.+?)\s*\|\s*(Easy|Medium|Hard)\s*\|\s*\[([\w-]+)\]\(\.\/([\w-]+)\.md\)\s*\|/)
      if (m) {
        order.push({ text: m[1].trim(), slug: m[4], level: m[2] })
      }
    }
  }
  // 若解析失败，回退到目录扫描
  if (order.length === 0) {
    for (const f of fs.readdirSync(algDir)) {
      if (f.endsWith('.md') && f !== 'index.md') {
        const slug = f.replace(/\.md$/, '')
        order.push({ text: slug, slug, level: 'Medium' })
      }
    }
  }
  const groups = {
    Easy: { text: 'Easy', items: [] },
    Medium: { text: 'Medium', items: [] },
    Hard: { text: 'Hard', items: [] },
  }
  for (const item of order) {
    const grp = groups[item.level] || groups.Medium
    grp.items.push({ text: item.text, link: `/algorithm/${item.slug}` })
  }
  const items = [
    { text: '算法题库（目录）', link: '/algorithm/' },
    { text: '数据结构与算法基础', link: '/algorithm/fundamentals' },
    ...Object.values(groups).filter((g) => g.items.length > 0),
  ]
  return [{ text: '算法题库', items }]
}

export default defineConfig({
  title: 'FUANZANG',
  description: 'FUANZANG 的个人站点 - 知识库、博客与作品展示',
  lang: 'zh-CN',
  base: '/',

  vite: {
    build: {
      chunkSizeWarningLimit: 2000
    }
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'FUANZANG' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'FUANZANG 的个人站点 - 知识库、博客与作品展示'
      }
    ],
    ['meta', { property: 'og:image', content: '/og-default.svg' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'FUANZANG' }],
    [
      'meta',
      {
        name: 'twitter:description',
        content: 'FUANZANG 的个人站点 - 知识库、博客与作品展示'
      }
    ]
  ],

  themeConfig: {
    nav: [
      { text: '笔记', link: '/notes/' },
      { text: '算法', link: '/algorithm/' },
      { text: '博客', link: '/blog/hello-world' },
      {
        text: '探索',
        items: getExploreNavItems()
      }
    ],

    sidebar: {
      '/algorithm/': getAlgorithmSidebar(),
      '/blog/': [
        {
          text: '博客',
          items: [{ text: 'Hello World', link: '/blog/hello-world' }]
        }
      ],
      '/notes/': [
        {
          text: '前端基础',
          collapsed: true,
          items: [
            { text: 'HTML', link: '/notes/foundations/html' },
            { text: 'CSS', link: '/notes/foundations/css' },
            { text: '响应式与自适应', link: '/notes/foundations/responsive-design' },
            { text: '前端无障碍（a11y）', link: '/notes/foundations/frontend-a11y' },
            { text: 'JavaScript', link: '/notes/foundations/javascript' },
            { text: 'JS 实用片段', link: '/notes/foundations/javascript-snippets' },
            { text: 'ECMAScript 标准', link: '/notes/foundations/ecma-script-standard' },
            { text: '正则与校验', link: '/notes/foundations/regex-and-validation' },
            { text: 'TypeScript', link: '/notes/foundations/typescript' },
            { text: '前端设计模式', link: '/notes/foundations/frontend-design-patterns' },
            { text: '浏览器原理', link: '/notes/foundations/browser' },
            { text: '网络协议', link: '/notes/foundations/network-protocol' },
            { text: 'Web 存储', link: '/notes/foundations/web-storage' },
            { text: 'Web Components', link: '/notes/foundations/web-components' },
            { text: '前端动画', link: '/notes/foundations/frontend-animation' },
            { text: 'Canvas & WebGL', link: '/notes/foundations/canvas-webgl' },
            { text: 'PWA', link: '/notes/foundations/pwa' },
            { text: '前端国际化', link: '/notes/foundations/frontend-i18n' }
          ]
        },
        {
          text: '前端框架',
          collapsed: true,
          items: [
            { text: 'Vue 总览', link: '/notes/frameworks/vue' },
            { text: 'Vue 2 (Options API)', link: '/notes/frameworks/vue2' },
            { text: 'Vue 3 (Composition API)', link: '/notes/frameworks/vue3' },
            { text: 'SSR / SSG', link: '/notes/engineering/ssr-ssg' },
            { text: 'Nuxt', link: '/notes/frameworks/nuxt' },
            { text: 'React', link: '/notes/frameworks/react' },
            { text: 'Next.js', link: '/notes/frameworks/nextjs' },
            { text: 'React vs Vue 对比', link: '/notes/frameworks/react-vs-vue' },
            { text: '状态管理', link: '/notes/frameworks/state-management' },
            { text: '状态管理框架对比', link: '/notes/frameworks/state-managers-compare' },
            { text: '前端路由', link: '/notes/frameworks/frontend-routing' },
            { text: 'HTTP 请求与数据层', link: '/notes/frameworks/http-request' },
            { text: 'GraphQL 与 tRPC', link: '/notes/frameworks/graphql-trpc' }
          ]
        },
        {
          text: '构建与工程化',
          collapsed: true,
          items: [
            { text: '包管理器', link: '/notes/engineering/package-manager' },
            { text: 'Git 工作流', link: '/notes/engineering/git-workflow' },
            { text: '代码规范与工程约束', link: '/notes/engineering/code-standard' },
            { text: 'CSS 工程化方案', link: '/notes/engineering/css-engineering' },
            { text: 'Webpack vs Vite', link: '/notes/engineering/webpack-vs-vite' },
            { text: 'Webpack 性能优化', link: '/notes/engineering/webpack-optimization' },
            { text: 'Vite 性能优化', link: '/notes/engineering/vite-optimization' },
            { text: 'Monorepo', link: '/notes/engineering/monorepo' },
            { text: '组件库开发', link: '/notes/engineering/component-library' },
            { text: '微前端', link: '/notes/engineering/micro-frontend' },
            { text: 'YApi 接口平台', link: '/notes/engineering/yapi' }
          ]
        },
        {
          text: '性能与质量',
          collapsed: true,
          items: [
            { text: 'Web Vitals 性能指标', link: '/notes/performance/web-vitals' },
            { text: 'Chrome DevTools', link: '/notes/performance/debug-devtools' },
            { text: '前端性能优化', link: '/notes/performance/performance-optimization' },
            { text: '性能分析案例', link: '/notes/performance/performance-case' },
            { text: '前端监控', link: '/notes/performance/frontend-monitoring' },
            { text: '前端测试', link: '/notes/performance/frontend-testing' },
            { text: '前端安全', link: '/notes/performance/frontend-security' }
          ]
        },
        {
          text: '场景实战',
          collapsed: true,
          items: [
            { text: '大文件上传', link: '/notes/practice/large-file-upload' },
            { text: '动态表单渲染', link: '/notes/practice/dynamic-form' },
            { text: '虚拟列表', link: '/notes/practice/virtual-list' },
            { text: 'WebSocket 与实时通信', link: '/notes/practice/websocket-realtime' },
            { text: 'ECharts', link: '/notes/practice/echarts' },
            { text: '前端鉴权实战', link: '/notes/practice/frontend-auth' },
            { text: 'OAuth2 入门', link: '/notes/practice/oauth2' },
            { text: 'SSO 与 OIDC', link: '/notes/practice/sso-oidc' },
            { text: 'Web Workers 实战', link: '/notes/practice/web-workers' }
          ]
        },
        {
          text: '跨端开发',
          collapsed: true,
          items: [
            { text: '小程序开发', link: '/notes/cross-platform/mini-program' },
            { text: 'React Native', link: '/notes/cross-platform/react-native' },
            { text: 'Electron', link: '/notes/cross-platform/electron' }
          ]
        },
        {
          text: '数据库与大数据',
          collapsed: true,
          items: [
            { text: 'SQL 基础', link: '/notes/database/sql-basics' },
            { text: '数据库设计', link: '/notes/database/db-design' },
            { text: 'MySQL 深入', link: '/notes/database/mysql-deep' },
            { text: '数据库迁移（Flyway）', link: '/notes/database/db-migration' },
            { text: 'Redis 基础', link: '/notes/database/redis-basics' },
            { text: 'Redis 与 Java', link: '/notes/database/redis-java' },
            { text: '数仓与大数据基础', link: '/notes/database/data-warehouse' }
          ]
        },
        {
          text: 'Node 后端',
          collapsed: true,
          items: [
            { text: 'Node.js', link: '/notes/node/node' },
            { text: 'NestJS', link: '/notes/node/nestjs' },
            { text: 'Node 数据访问', link: '/notes/node/node-data' },
            { text: 'Node 鉴权', link: '/notes/node/node-auth' },
            { text: 'Node 测试', link: '/notes/node/node-testing' }
          ]
        },
        {
          text: 'Java 后端',
          collapsed: true,
          items: [
            { text: 'Java 基础', link: '/notes/java/java-basics' },
            { text: 'Java 生态与工具链', link: '/notes/java/java-ecosystem' },
            { text: 'JVM 基础', link: '/notes/java/jvm-basics' },
            { text: 'Java 并发', link: '/notes/java/java-concurrency' },
            { text: 'Spring Boot', link: '/notes/java/spring-boot' },
            { text: 'Spring Web 实用', link: '/notes/java/spring-web' },
            { text: 'Spring 事务', link: '/notes/java/spring-transactions' },
            { text: 'MyBatis', link: '/notes/java/mybatis' },
            { text: 'JPA 与 Spring Data JPA', link: '/notes/java/jpa' },
            { text: 'Spring Security 鉴权', link: '/notes/java/spring-security' },
            { text: 'Spring Cloud 与微服务', link: '/notes/java/spring-cloud' },
            { text: '消息队列基础', link: '/notes/java/message-queue' },
            { text: '消息队列与 Java', link: '/notes/java/message-queue-java' },
            { text: 'Java 测试（JUnit + Mockito）', link: '/notes/java/java-testing' }
          ]
        },
        {
          text: '运维与部署',
          collapsed: true,
          items: [
            { text: 'Linux', link: '/notes/ops/linux' },
            { text: 'Docker', link: '/notes/ops/docker' },
            { text: 'Kubernetes', link: '/notes/ops/kubernetes' },
            { text: 'Rancher 管理平台', link: '/notes/ops/rancher' },
            { text: 'Nginx 生产配置', link: '/notes/ops/nginx' },
            { text: 'CDN 内容分发', link: '/notes/ops/cdn' },
            { text: 'CI/CD', link: '/notes/ops/ci-cd' },
            { text: 'GitHub Actions', link: '/notes/ops/github-actions' },
            { text: '前端部署', link: '/notes/ops/frontend-deployment' },
            { text: '监控栈（Prometheus/Grafana/ELK）', link: '/notes/ops/monitoring' },
            { text: '后端可观测', link: '/notes/ops/observability' }
          ]
        },
        {
          text: 'AI 工程',
          collapsed: true,
          items: [
            { text: 'LLM 基础概念', link: '/notes/ai/llm-fundamentals' },
            { text: '本地大模型', link: '/notes/ai/local-llm' },
            { text: '前端对接 AI', link: '/notes/ai/ai-frontend-integration' },
            { text: 'AI 流式输出', link: '/notes/ai/ai-streaming' },
            { text: 'RAG 检索增强生成', link: '/notes/ai/rag' },
            { text: 'Agent Harness', link: '/notes/ai/agent-harness' },
            { text: 'MCP 与工具调用', link: '/notes/ai/mcp-tools' },
            { text: 'Agent Skill', link: '/notes/ai/agent-skills' },
            { text: 'Web AI', link: '/notes/ai/web-ai' },
            { text: 'AI 评测与可观测', link: '/notes/ai/ai-eval-observability' }
          ]
        },
        {
          text: '前沿技术',
          collapsed: true,
          items: [
            { text: 'WebAssembly', link: '/notes/frontier/wasm' },
            { text: 'WebGPU', link: '/notes/frontier/webgpu' },
            { text: 'Three.js', link: '/notes/frontier/threejs' }
          ]
        }
      ]
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/FUANZANG' }],

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2026 FUANZANG'
    },

    search: {
      provider: 'local'
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    outline: {
      label: '页面导航'
    },

    lastUpdated: {
      text: '最后更新于'
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式'
  }
})
