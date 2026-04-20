export const navCategories = [
  {
    name: '编程语言',
    icon: '💻',
    links: [
      { title: 'TypeScript', desc: '类型安全的 JavaScript', url: 'https://www.typescriptlang.org' },
      { title: 'Python', desc: '通用编程语言', url: 'https://docs.python.org' },
      { title: 'Go', desc: 'Google 编程语言', url: 'https://go.dev/doc' },
      { title: 'Rust', desc: '安全高性能语言', url: 'https://www.rust-lang.org/learn' },
      { title: 'Java', desc: '企业级编程语言', url: 'https://docs.oracle.com/en/java' }
    ]
  },
  {
    name: '前端框架',
    icon: '⚛️',
    links: [
      { title: 'Vue', desc: '渐进式 JavaScript 框架', url: 'https://vuejs.org' },
      { title: 'React', desc: '声明式 UI 库', url: 'https://react.dev' },
      { title: 'Angular', desc: '企业级前端框架', url: 'https://angular.dev' },
      { title: 'Svelte', desc: '编译时前端框架', url: 'https://svelte.dev' },
      { title: 'Nuxt', desc: 'Vue 全栈框架', url: 'https://nuxt.com' },
      { title: 'Next.js', desc: 'React 全栈框架', url: 'https://nextjs.org' }
    ]
  },
  {
    name: 'UI 组件库',
    icon: '🎨',
    links: [
      { title: 'Element', desc: 'Vue 2 组件库', url: 'https://element.eleme.cn' },
      { title: 'Element Plus', desc: 'Vue 3 组件库', url: 'https://element-plus.org' },
      { title: 'Ant Design Vue', desc: '企业级 UI 设计语言', url: 'https://antdv.com' },
      { title: 'Naive UI', desc: 'Vue 3 轻量组件库', url: 'https://www.naiveui.com' },
      { title: 'shadcn/ui', desc: '可定制的 React 组件', url: 'https://ui.shadcn.com' },
      { title: 'Ant Design', desc: 'React 企业级组件库', url: 'https://ant.design' },
      { title: 'MUI', desc: 'React Material 设计框架', url: 'https://mui.com' },
      { title: 'Radix UI', desc: '无样式可访问 React 组件', url: 'https://www.radix-ui.com' },
      { title: 'Vant', desc: '移动端 Vue 组件库', url: 'https://vant-ui.github.io/vant' },
      { title: 'TDesign', desc: '腾讯设计系统', url: 'https://tdesign.tencent.com' },
      { title: 'Arco Design', desc: '字节跳动设计系统', url: 'https://arco.design' },
      { title: 'Ant Design Mobile', desc: 'Ant Design 移动端', url: 'https://mobile.ant.design' },
      { title: 'Tailwind CSS', desc: '原子化 CSS 框架', url: 'https://tailwindcss.com' },
      { title: 'UnoCSS', desc: '即时原子化 CSS 引擎', url: 'https://unocss.dev' }
    ]
  },
  {
    name: '构建工具',
    icon: '🔨',
    links: [
      { title: 'Vite', desc: '下一代前端构建', url: 'https://vitejs.dev' },
      { title: 'Webpack', desc: '模块打包器', url: 'https://webpack.js.org' },
      { title: 'Rollup', desc: 'ES Module 打包器', url: 'https://rollupjs.org' },
      { title: 'esbuild', desc: '极速 JS 打包器', url: 'https://esbuild.github.io' },
      { title: 'Turbopack', desc: 'Vercel 增量打包器', url: 'https://turbo.build/pack' }
    ]
  },
  {
    name: '包管理',
    icon: '📦',
    links: [
      { title: 'npm', desc: 'Node 包管理平台', url: 'https://www.npmjs.com' },
      { title: 'yarn', desc: 'Facebook 包管理器', url: 'https://yarnpkg.com' },
      { title: 'pnpm', desc: '快速、节省磁盘', url: 'https://pnpm.io' }
    ]
  },
  {
    name: '测试',
    icon: '🧪',
    links: [
      { title: 'Vitest', desc: 'Vite 原生测试框架', url: 'https://vitest.dev' },
      { title: 'Playwright', desc: '端到端测试框架', url: 'https://playwright.dev' },
      { title: 'Cypress', desc: '前端 E2E 测试', url: 'https://www.cypress.io' },
      { title: 'Jest', desc: 'JavaScript 测试框架', url: 'https://jestjs.io' }
    ]
  },
  {
    name: '后端框架',
    icon: '🖥️',
    links: [
      { title: 'Node.js', desc: '服务端 JavaScript', url: 'https://nodejs.org' },
      { title: 'Deno', desc: '安全的 JS/TS 运行时', url: 'https://deno.land' },
      { title: 'Bun', desc: '极速 JS 运行时', url: 'https://bun.sh' },
      { title: 'NestJS', desc: 'Node 企业级框架', url: 'https://nestjs.com' },
      { title: 'Express', desc: 'Node Web 框架', url: 'https://expressjs.com' },
      { title: 'Spring Boot', desc: 'Java 微服务框架', url: 'https://spring.io' },
      { title: 'Django', desc: 'Python Web 框架', url: 'https://www.djangoproject.com' },
      { title: 'FastAPI', desc: 'Python 高性能 API', url: 'https://fastapi.tiangolo.com' },
      { title: 'Gin', desc: 'Go Web 框架', url: 'https://gin-gonic.com' }
    ]
  },
  {
    name: '数据库',
    icon: '🗄️',
    links: [
      { title: 'MySQL', desc: '关系型数据库', url: 'https://dev.mysql.com/doc' },
      { title: 'PostgreSQL', desc: '高级开源数据库', url: 'https://www.postgresql.org/docs' },
      { title: 'Redis', desc: '内存数据结构存储', url: 'https://redis.io/docs' },
      { title: 'MongoDB', desc: '文档数据库', url: 'https://www.mongodb.com/docs' },
      { title: 'SQLite', desc: '轻量嵌入式数据库', url: 'https://www.sqlite.org/docs.html' },
      { title: 'Elasticsearch', desc: '分布式搜索引擎', url: 'https://www.elastic.co/guide' },
      { title: 'ClickHouse', desc: '列式 OLAP 数据库', url: 'https://clickhouse.com/docs' },
      { title: 'MariaDB', desc: 'MySQL 分支数据库', url: 'https://mariadb.com/kb/en/documentation' },
      { title: 'Supabase', desc: '开源 Firebase 替代', url: 'https://supabase.com/docs' }
    ]
  },
  {
    name: 'DevOps & 云',
    icon: '☁️',
    links: [
      { title: 'Docker', desc: '容器化平台', url: 'https://docs.docker.com' },
      { title: 'Kubernetes', desc: '容器编排系统', url: 'https://kubernetes.io/docs' },
      { title: 'Nginx', desc: 'Web 服务器', url: 'https://nginx.org/en/docs' },
      { title: 'GitHub Actions', desc: 'CI/CD 自动化', url: 'https://docs.github.com/actions' },
      { title: 'Vercel', desc: '前端部署平台', url: 'https://vercel.com/docs' },
      { title: 'Netlify', desc: 'JAMstack 部署平台', url: 'https://docs.netlify.com' },
      { title: 'Cloudflare', desc: 'CDN 与安全服务', url: 'https://developers.cloudflare.com' },
      { title: 'Terraform', desc: '基础设施即代码', url: 'https://developer.hashicorp.com/terraform' },
      { title: 'AWS', desc: '亚马逊云服务', url: 'https://docs.aws.amazon.com' },
      { title: 'Azure', desc: '微软云服务', url: 'https://learn.microsoft.com/azure' },
      { title: 'GCP', desc: '谷歌云服务', url: 'https://cloud.google.com/docs' }
    ]
  },
  {
    name: '移动端',
    icon: '📱',
    links: [
      { title: 'React Native', desc: '跨平台移动应用', url: 'https://reactnative.dev' },
      { title: 'Flutter', desc: 'Google 跨平台 UI', url: 'https://flutter.dev' },
      { title: 'uni-app', desc: '跨平台移动框架', url: 'https://uniapp.dcloud.net.cn' },
      { title: 'Taro', desc: '多端开发框架', url: 'https://taro.zone' },
      { title: 'Swift', desc: 'iOS 开发语言', url: 'https://swift.org/documentation' },
      { title: 'Kotlin', desc: 'Android 开发语言', url: 'https://kotlinlang.org/docs' }
    ]
  },
  {
    name: 'AI & 机器学习',
    icon: '🤖',
    links: [
      { title: 'ChatGPT', desc: 'OpenAI 对话模型', url: 'https://chat.openai.com' },
      { title: 'Claude', desc: 'Anthropic AI 助手', url: 'https://claude.ai' },
      { title: 'OpenAI API', desc: 'GPT 模型 API', url: 'https://platform.openai.com/docs' },
      { title: 'LangChain', desc: 'LLM 应用框架', url: 'https://python.langchain.com' },
      { title: 'LangGraph', desc: 'LLM Agent 工作流编排', url: 'https://langchain-ai.github.io/langgraph/' },
      { title: 'LlamaIndex', desc: 'LLM 数据连接框架', url: 'https://www.llamaindex.ai' },
      { title: 'Dify', desc: '开源 LLM 应用开发平台', url: 'https://dify.ai' },
      { title: 'Hugging Face', desc: 'ML 模型社区', url: 'https://huggingface.co/docs' },
      { title: 'Cursor', desc: 'AI 代码编辑器', url: 'https://cursor.com' },
      { title: 'OpenCode', desc: '开源 AI 编码助手', url: 'https://opencode.ai' },
      { title: 'GitHub Copilot', desc: 'AI 代码补全', url: 'https://docs.github.com/copilot' },
      { title: 'Gemini', desc: 'Google AI 模型', url: 'https://ai.google.dev/docs' },
      { title: 'Ollama', desc: '本地大模型运行', url: 'https://ollama.com' }
    ]
  },
  {
    name: '动画 & 可视化',
    icon: '✨',
    links: [
      { title: 'GSAP', desc: '专业级 JS 动画引擎', url: 'https://gsap.com' },
      { title: 'Framer Motion', desc: 'React 声明式动画库', url: 'https://motion.dev' },
      { title: 'Anime.js', desc: '轻量 JS 动画库', url: 'https://animejs.com' },
      { title: 'ECharts', desc: 'Apache 可视化图表库', url: 'https://echarts.apache.org' },
      { title: 'D3.js', desc: '数据驱动文档可视化', url: 'https://d3js.org' },
      { title: 'Three.js', desc: 'WebGL 3D 图形库', url: 'https://threejs.org' }
    ]
  },
  {
    name: '开发文档',
    icon: '📖',
    links: [
      { title: 'MDN', desc: 'Web 技术权威文档', url: 'https://developer.mozilla.org' },
      { title: 'Can I Use', desc: '浏览器兼容性查询', url: 'https://caniuse.com' },
      { title: 'DevDocs', desc: '多语言 API 离线文档', url: 'https://devdocs.io' },
      { title: 'Git', desc: '版本控制系统', url: 'https://git-scm.com/doc' },
      { title: 'Linux', desc: 'Linux 命令手册', url: 'https://man7.org/linux/man-pages.html' },
      { title: 'GitHub', desc: '代码托管与协作', url: 'https://github.com' },
      { title: 'GitLab', desc: 'DevOps 平台', url: 'https://docs.gitlab.com' },
      { title: 'Bitbucket', desc: 'Atlassian 代码托管', url: 'https://support.atlassian.com/bitbucket-cloud' }
    ]
  },
  {
    name: '设计资源',
    icon: '🖌',
    links: [
      { title: 'Figma', desc: '在线协作设计工具', url: 'https://www.figma.com' },
      { title: 'Dribbble', desc: '设计师作品社区', url: 'https://dribbble.com' },
      { title: 'Heroicons', desc: 'Tailwind 官方图标', url: 'https://heroicons.com' },
      { title: 'Iconify', desc: '统一图标集合', url: 'https://iconify.design' }
    ]
  },
  {
    name: '在线工具',
    icon: '🔧',
    links: [
      { title: 'CodePen', desc: '前端在线代码沙盒', url: 'https://codepen.io' },
      { title: 'StackBlitz', desc: '浏览器端 IDE', url: 'https://stackblitz.com' },
      { title: 'Carbon', desc: '代码截图美化工具', url: 'https://carbon.now.sh' },
      { title: 'Excalidraw', desc: '手绘风格白板', url: 'https://excalidraw.com' },
      { title: 'Regex101', desc: '正则表达式测试工具', url: 'https://regex101.com' },
      { title: 'JSON Formatter', desc: 'JSON 格式化与校验', url: 'https://jsonformatter.curiousconcept.com' },
      { title: 'Postman', desc: 'API 调试工具', url: 'https://www.postman.com' },
      { title: 'Swagger', desc: 'API 文档工具', url: 'https://swagger.io' },
      { title: 'Supabase', desc: 'BaaS 数据库平台', url: 'https://supabase.com' }
    ]
  }
]
