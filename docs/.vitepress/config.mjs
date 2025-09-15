import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'FUANZANG',
  description: 'FUANZANG 的个人站点 - 知识库、博客与作品展示',
  lang: 'zh-CN',
  base: '/',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
  ],

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '笔记', link: '/notes/html-note' },
      { text: '博客', link: '/blog/hello-world' }
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
            { text: 'HTML', link: '/notes/html-note' },
            { text: 'CSS', link: '/notes/css-note' },
            { text: '响应式与自适应', link: '/notes/responsive-design' },
            { text: 'JavaScript', link: '/notes/javascript-note' },
            { text: 'TypeScript', link: '/notes/typescript-note' },
            { text: 'ECMAScript 标准', link: '/notes/ecma-script-standard' },
            { text: '浏览器原理', link: '/notes/browser-note' },
            { text: '网络协议', link: '/notes/network-protocol' },
            { text: '正则与校验', link: '/notes/regex-and-validation' },
            { text: '前端国际化', link: '/notes/frontend-i18n' },
            { text: '前端动画', link: '/notes/frontend-animation' }
          ]
        },
        {
          text: '框架',
          collapsed: false,
          items: [
            { text: 'Vue 总览', link: '/notes/vue-note' },
            { text: 'Vue 2 (Options API)', link: '/notes/vue2-note' },
            { text: 'Vue 3 (Composition API)', link: '/notes/vue3-note' },
            { text: 'React', link: '/notes/react-note' },
            { text: 'React vs Vue 对比', link: '/notes/react-vs-vue' },
            { text: '状态管理', link: '/notes/state-management' },
            { text: '前端路由', link: '/notes/frontend-routing' },
            { text: 'HTTP 请求与数据层', link: '/notes/http-request' }
          ]
        },
        {
          text: '构建与工程化',
          collapsed: false,
          items: [
            { text: 'Webpack 性能优化', link: '/notes/webpack-optimization' },
            { text: 'Vite 性能优化', link: '/notes/vite-optimization' },
            { text: 'Webpack vs Vite', link: '/notes/webpack-vs-vite' },
            { text: 'Monorepo', link: '/notes/monorepo' },
            { text: '组件库开发', link: '/notes/component-library' },
            { text: '微前端', link: '/notes/micro-frontend' },
            { text: 'SSR / SSG', link: '/notes/ssr-ssg' },
            { text: 'CSS 工程化方案', link: '/notes/css-engineering' },
            { text: '代码规范与工程约束', link: '/notes/code-standard' }
          ]
        },
        {
          text: '性能与质量',
          collapsed: false,
          items: [
            { text: '前端性能优化', link: '/notes/performance-optimization' },
            { text: '前端监控', link: '/notes/frontend-monitoring' },
            { text: '前端测试', link: '/notes/frontend-testing' },
            { text: '前端安全', link: '/notes/frontend-security' }
          ]
        },
        {
          text: '部署与运维',
          collapsed: false,
          items: [
            { text: 'CI/CD', link: '/notes/ci-cd' },
            { text: '前端部署', link: '/notes/frontend-deployment' },
            { text: 'YApi 接口平台', link: '/notes/yapi' }
          ]
        },
        {
          text: '后端与工具',
          collapsed: false,
          items: [
            { text: 'Node.js', link: '/notes/node-note' }
          ]
        },
        {
          text: '跨端开发',
          collapsed: false,
          items: [
            { text: '小程序开发', link: '/notes/mini-program' },
            { text: 'React Native', link: '/notes/react-native-note' },
            { text: 'Electron', link: '/notes/electron-note' }
          ]
        },
        {
          text: '场景实战',
          collapsed: false,
          items: [
            { text: '大文件上传', link: '/notes/large-file-upload' },
            { text: '动态表单渲染', link: '/notes/dynamic-form' },
            { text: '虚拟列表', link: '/notes/virtual-list' },
            { text: 'WebSocket 与实时通信', link: '/notes/websocket-realtime' }
          ]
        },
        {
          text: 'AI 与前沿技术',
          collapsed: false,
          items: [
            { text: '前端对接 AI', link: '/notes/ai-frontend-integration' },
            { text: 'WebAssembly', link: '/notes/wasm-note' },
            { text: 'ECharts', link: '/notes/echarts-note' }
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
