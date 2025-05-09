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
            { text: '前端安全', link: '/notes/frontend-security' },
            { text: '网络协议', link: '/notes/network-protocol' }
          ]
        },
        {
          text: '框架与工程化',
          collapsed: false,
          items: [
            { text: 'Vue 总览', link: '/notes/vue-note' },
            { text: 'Vue 2 (Options API)', link: '/notes/vue2-note' },
            { text: 'Vue 3 (Composition API)', link: '/notes/vue3-note' },
            { text: 'React', link: '/notes/react-note' },
            { text: 'React vs Vue 对比', link: '/notes/react-vs-vue' },
            { text: '前端性能优化', link: '/notes/performance-optimization' },
            { text: 'Webpack 性能优化', link: '/notes/webpack-optimization' },
            { text: 'Vite 性能优化', link: '/notes/vite-optimization' },
            { text: 'Webpack vs Vite', link: '/notes/webpack-vs-vite' },
            { text: '微前端', link: '/notes/micro-frontend' },
            { text: '大文件上传', link: '/notes/large-file-upload' },
            { text: '动态表单渲染', link: '/notes/dynamic-form' },
            { text: '虚拟列表', link: '/notes/virtual-list' },
            { text: 'CI/CD', link: '/notes/ci-cd' },
            { text: 'YApi 接口平台', link: '/notes/yapi' },
            { text: '前端监控', link: '/notes/frontend-monitoring' },
            { text: '前端测试', link: '/notes/frontend-testing' }
          ]
        },
        {
          text: '后端与工具',
          collapsed: false,
          items: [
            { text: 'Node.js', link: '/notes/node-note' },
            { text: '正则与校验', link: '/notes/regex-and-validation' }
          ]
        },
        {
          text: 'AI 与工程化',
          collapsed: false,
          items: [
            { text: '前端对接 AI', link: '/notes/ai-frontend-integration' }
          ]
        },
        {
          text: '跨端开发',
          collapsed: false,
          items: [
            { text: 'React Native', link: '/notes/react-native-note' },
            { text: 'Electron', link: '/notes/electron-note' }
          ]
        },
        {
          text: '数据可视化',
          collapsed: false,
          items: [
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
