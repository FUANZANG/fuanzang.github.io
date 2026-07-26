/**
 * 站点栏目单一数据源：同时喂顶栏「探索」下拉与首页探索卡片。
 * 新增栏目时改这里即可；showOnHome / showInExplore 控制出现位置。
 * icon 对应 SectionIcon 的 name（细线 SVG）。
 */
export const siteSections = [
  {
    id: 'notes',
    title: '学习笔记',
    description: '记录技术学习心得、读书笔记和知识总结，构建个人知识体系',
    link: '/notes/',
    icon: 'book',
    showOnHome: true,
    showInExplore: false,
    homeVariant: 'card'
  },
  {
    id: 'blog',
    title: '技术博客',
    description: '技术文章与经验分享，记录开发心得与思考',
    link: '/blog/hello-world',
    icon: 'file-text',
    showOnHome: true,
    showInExplore: false,
    homeVariant: 'card'
  },
  {
    id: 'tools',
    title: '工具',
    navText: '工具',
    description: '编码转换、格式化等纯前端小工具，随用随走',
    link: '/tools',
    icon: 'wrench',
    showOnHome: true,
    showInExplore: true,
    homeVariant: 'card'
  },
  {
    id: 'recipes',
    title: '家常菜谱',
    navText: '菜谱',
    description: '不知道吃什么时翻翻看，记录一些简单好做的家常菜',
    link: '/recipes',
    icon: 'utensils',
    showOnHome: true,
    showInExplore: true,
    homeVariant: 'recipe'
  },
  {
    id: 'nav',
    title: '站点导航',
    navText: '导航',
    description: '开发常用网站速查',
    link: '/nav',
    icon: 'compass',
    showOnHome: false,
    showInExplore: true,
    homeVariant: 'card'
  },
  {
    id: 'about',
    title: '关于我',
    navText: '关于',
    description:
      '一名从前端转向全栈的软件开发工程师，喜欢把复杂的工程做简单。这个站点用来沉淀学习笔记、记录技术思考，偶尔也放几道拿手菜谱。',
    link: '/about',
    icon: 'user',
    showOnHome: true,
    showInExplore: true,
    homeVariant: 'about'
  }
]

/** 顶栏「探索」下拉项 */
export function getExploreNavItems() {
  return siteSections
    .filter((s) => s.showInExplore)
    .map((s) => ({
      text: s.navText || s.title,
      link: s.link
    }))
}

/** 首页探索区卡片（含关于通栏） */
export function getHomeSections() {
  return siteSections.filter((s) => s.showOnHome)
}
