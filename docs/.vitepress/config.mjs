import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'FUANZANG',
  description: 'FUANZANG 的个人站点 - 知识库、博客与作品展示',
  lang: 'zh-CN',
  base: '/',

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '笔记', link: '/notes/performance-optimization' },
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
          text: '性能优化',
          items: [
            { text: '前端性能优化', link: '/notes/performance-optimization' },
            { text: 'Webpack 构建优化', link: '/notes/webpack-optimization' }
          ]
        },
        {
          text: '前端基础',
          items: [
            { text: 'HTML', link: '/notes/html-note' },
            { text: 'CSS', link: '/notes/css-note' },
            { text: 'JavaScript', link: '/notes/javascript-note' },
            { text: 'TypeScript', link: '/notes/typescript-note' },
            { text: 'Vue', link: '/notes/vue-note' }
          ]
        },
        {
          text: '进阶',
          items: [
            { text: '浏览器', link: '/notes/browser-note' },
            { text: 'Node', link: '/notes/node-note' },
            { text: '正则与校验', link: '/notes/regex-and-validation' },
            { text: 'ECMA Script 标准', link: '/notes/ecma-script-standard' }
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
