import { defineConfig } from 'vitepress'

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
      { text: '笔记', link: '/notes/foundations/html' },
      { text: '博客', link: '/blog/hello-world' },
      {
        text: '探索',
        items: [
          { text: '工具', link: '/tools' },
          { text: '菜谱', link: '/recipes' },
          { text: '导航', link: '/nav' },
          { text: '关于', link: '/about' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [{ text: '快速开始', link: '/guide/getting-started' }]
        }
      ],
      '/blog/': [
        {
          text: '博客',
          items: [{ text: 'Hello World', link: '/blog/hello-world' }]
        }
      ],
      '/notes/': [
        {
          text: '前端基础',
          items: [
            { text: 'HTML', link: '/notes/foundations/html' },
            { text: 'CSS', link: '/notes/foundations/css' },
            { text: '响应式与自适应', link: '/notes/foundations/responsive-design' },
            { text: 'JavaScript', link: '/notes/foundations/javascript' },
            { text: 'TypeScript', link: '/notes/foundations/typescript' },
            { text: 'ECMAScript 标准', link: '/notes/foundations/ecma-script-standard' },
            { text: '浏览器原理', link: '/notes/foundations/browser' },
            { text: '网络协议', link: '/notes/foundations/network-protocol' },
            { text: '正则与校验', link: '/notes/foundations/regex-and-validation' },
            { text: '前端国际化', link: '/notes/foundations/frontend-i18n' },
            { text: '前端动画', link: '/notes/foundations/frontend-animation' },
            { text: '前端设计模式', link: '/notes/foundations/frontend-design-patterns' },
            { text: 'PWA', link: '/notes/foundations/pwa' },
            { text: '前端无障碍（a11y）', link: '/notes/foundations/frontend-a11y' },
            { text: 'Web 存储', link: '/notes/foundations/web-storage' },
            { text: 'Web Components', link: '/notes/foundations/web-components' },
            { text: 'Canvas & WebGL', link: '/notes/foundations/canvas-webgl' }
          ]
        },
        {
          text: '框架',
          collapsed: false,
          items: [
            { text: 'Vue 总览', link: '/notes/frameworks/vue' },
            { text: 'Vue 2 (Options API)', link: '/notes/frameworks/vue2' },
            { text: 'Vue 3 (Composition API)', link: '/notes/frameworks/vue3' },
            { text: 'React', link: '/notes/frameworks/react' },
            { text: 'React vs Vue 对比', link: '/notes/frameworks/react-vs-vue' },
            { text: '状态管理', link: '/notes/frameworks/state-management' },
            { text: '状态管理框架对比', link: '/notes/frameworks/state-managers-compare' },
            { text: '前端路由', link: '/notes/frameworks/frontend-routing' },
            { text: 'HTTP 请求与数据层', link: '/notes/frameworks/http-request' }
          ]
        },
        {
          text: '构建与工程化',
          collapsed: false,
          items: [
            { text: 'Webpack 性能优化', link: '/notes/engineering/webpack-optimization' },
            { text: 'Vite 性能优化', link: '/notes/engineering/vite-optimization' },
            { text: 'Webpack vs Vite', link: '/notes/engineering/webpack-vs-vite' },
            { text: '包管理器', link: '/notes/engineering/package-manager' },
            { text: 'Monorepo', link: '/notes/engineering/monorepo' },
            { text: 'Git 工作流', link: '/notes/engineering/git-workflow' },
            { text: '组件库开发', link: '/notes/engineering/component-library' },
            { text: '微前端', link: '/notes/engineering/micro-frontend' },
            { text: 'SSR / SSG', link: '/notes/engineering/ssr-ssg' },
            { text: 'CSS 工程化方案', link: '/notes/engineering/css-engineering' },
            { text: '代码规范与工程约束', link: '/notes/engineering/code-standard' },
            { text: 'GitHub Actions', link: '/notes/engineering/github-actions' },
            { text: 'Nginx 生产配置', link: '/notes/engineering/nginx' }
          ]
        },
        {
          text: '性能与质量',
          collapsed: false,
          items: [
            { text: '前端性能优化', link: '/notes/performance/performance-optimization' },
            { text: '前端监控', link: '/notes/performance/frontend-monitoring' },
            { text: '前端测试', link: '/notes/performance/frontend-testing' },
            { text: '前端安全', link: '/notes/performance/frontend-security' },
            { text: 'Chrome DevTools', link: '/notes/performance/debug-devtools' },
            { text: 'Web Vitals 性能指标', link: '/notes/performance/web-vitals' }
          ]
        },
        {
          text: '部署与运维',
          collapsed: false,
          items: [
            { text: 'CI/CD', link: '/notes/deploy/ci-cd' },
            { text: '前端部署', link: '/notes/deploy/frontend-deployment' },
            { text: 'YApi 接口平台', link: '/notes/deploy/yapi' }
          ]
        },
        {
          text: '后端与运维',
          collapsed: false,
          items: [
            { text: 'Node.js', link: '/notes/backend/node' },
            { text: 'Docker', link: '/notes/backend/docker' },
            { text: 'Linux', link: '/notes/backend/linux' },
            { text: 'SQL 基础', link: '/notes/backend/sql-basics' },
            { text: 'SQL 基础', link: '/notes/backend/sql-basics' },
            { text: 'Redis 基础', link: '/notes/backend/redis-basics' }
          ]
        },
        {
          text: '跨端开发',
          collapsed: false,
          items: [
            { text: '小程序开发', link: '/notes/cross-platform/mini-program' },
            { text: 'React Native', link: '/notes/cross-platform/react-native' },
            { text: 'Electron', link: '/notes/cross-platform/electron' }
          ]
        },
        {
          text: '场景实战',
          collapsed: false,
          items: [
            { text: '大文件上传', link: '/notes/practice/large-file-upload' },
            { text: '动态表单渲染', link: '/notes/practice/dynamic-form' },
            { text: '虚拟列表', link: '/notes/practice/virtual-list' },
            { text: 'WebSocket 与实时通信', link: '/notes/practice/websocket-realtime' },
            { text: 'ECharts', link: '/notes/practice/echarts' }
          ]
        },
        {
          text: 'AI 与前沿技术',
          collapsed: false,
          items: [
            { text: '前端对接 AI', link: '/notes/frontier/ai-frontend-integration' },
            { text: 'Web AI', link: '/notes/frontier/web-ai' },
            { text: 'WebAssembly', link: '/notes/frontier/wasm' },
            { text: 'AI 流式输出', link: '/notes/frontier/ai-streaming' },
            { text: 'WebGPU', link: '/notes/frontier/webgpu' }
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
