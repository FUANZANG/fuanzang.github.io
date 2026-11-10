#!/usr/bin/env node
/**
 * sync-readme-stats.js
 * 扫描项目文件，自动更新 README.md 中的数量统计。
 *
 * 用法：npm run sync:readme
 * 或：node scripts/sync-readme-stats.js
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const README = path.join(ROOT, 'README.md')

/** 统计目录下 md 篇数（默认排除 index.md） */
function countMd(dir, { skipIndex = true } = {}) {
  if (!fs.existsSync(dir)) return 0
  return fs.readdirSync(dir).filter((f) => {
    if (!f.endsWith('.md')) return false
    if (skipIndex && f === 'index.md') return false
    return true
  }).length
}

function countRecipes() {
  const data = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'docs/data/recipes.json'), 'utf8')
  )
  return data.length
}

function countTools() {
  const src = fs.readFileSync(path.join(ROOT, 'docs/data/tools.js'), 'utf8')
  return (src.match(/\{ id:/g) || []).length
}

function countNavLinks() {
  const src = fs.readFileSync(path.join(ROOT, 'docs/data/navLinks.js'), 'utf8')
  return (src.match(/url: '/g) || []).length
}

function countNavCategories() {
  const src = fs.readFileSync(path.join(ROOT, 'docs/data/navLinks.js'), 'utf8')
  return (src.match(/name: '/g) || []).length
}

function countAlgorithm() {
  const dir = path.join(ROOT, 'docs/algorithm')
  if (!fs.existsSync(dir)) return 0
  const skip = new Set(['index.md', 'fundamentals.md'])
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !skip.has(f)).length
}

// 顺序与侧边栏一致。新增笔记目录时，这里和 README 的目录树要一起加。
const subdirs = [
  { key: 'foundations', label: '前端基础' },
  { key: 'frameworks', label: '前端框架' },
  { key: 'engineering', label: '构建与工程化' },
  { key: 'performance', label: '性能与质量' },
  { key: 'practice', label: '场景实战' },
  { key: 'cross-platform', label: '跨端' },
  { key: 'database', label: '数据库与大数据' },
  { key: 'node', label: 'Node 后端' },
  { key: 'java', label: 'Java 后端' },
  { key: 'python', label: 'Python 后端' },
  { key: 'ops', label: '运维与部署' },
  { key: 'ai', label: 'AI 工程' },
  { key: 'frontier', label: '前沿技术' }
]

const hwSubdirs = [
  { key: 'chips', label: '芯片' },
  { key: 'wired', label: '有线接口' },
  { key: 'wireless', label: '无线标准' },
  { key: 'power', label: '电源与充电' }
]

function assertDirs(dir, expected, label) {
  if (!fs.existsSync(dir)) {
    console.error(`${label} 目录不存在: ${dir}`)
    process.exit(1)
  }
  const actual = fs.readdirSync(dir).filter((name) =>
    fs.statSync(path.join(dir, name)).isDirectory()
  )
  const want = new Set(expected)
  const have = new Set(actual)
  const missing = expected.filter((key) => !have.has(key))
  const extra = actual.filter((key) => !want.has(key))
  if (missing.length === 0 && extra.length === 0) return
  console.error(`${label} 的子目录和脚本名单不一致，已停止，避免写错 README`)
  if (missing.length) console.error('  名单里有、磁盘上没有: ' + missing.join(', '))
  if (extra.length) console.error('  磁盘上有、名单里没有: ' + extra.join(', '))
  process.exit(1)
}

const notesDir = path.join(ROOT, 'docs/notes')
assertDirs(notesDir, subdirs.map((item) => item.key), 'docs/notes')

const hwDir = path.join(ROOT, 'docs/hardware')
assertDirs(hwDir, hwSubdirs.map((item) => item.key), 'docs/hardware')

const stats = {
  totalNotes: 0,
  totalHw: 0,
  recipes: countRecipes(),
  tools: countTools(),
  navLinks: countNavLinks(),
  navCategories: countNavCategories(),
  algorithm: countAlgorithm(),
  sub: {},
  hwSub: {}
}

for (const { key } of subdirs) {
  stats.sub[key] = countMd(path.join(notesDir, key))
  stats.totalNotes += stats.sub[key]
}

for (const { key } of hwSubdirs) {
  stats.hwSub[key] = countMd(path.join(hwDir, key))
  stats.totalHw += stats.hwSub[key]
}

let readme = fs.readFileSync(README, 'utf8')

for (const { key, label } of subdirs) {
  readme = readme.replace(
    new RegExp(label + '（\\d+ 篇）', 'g'),
    `${label}（${stats.sub[key]} 篇）`
  )
}

for (const { key, label } of hwSubdirs) {
  readme = readme.replace(
    new RegExp(label + '（\\d+ 篇）', 'g'),
    `${label}（${stats.hwSub[key]} 篇）`
  )
}

readme = readme.replace(
  /技术笔记（\d+ 大分类，\d+ 篇）/,
  `技术笔记（${subdirs.length} 大分类，${stats.totalNotes} 篇）`
)

readme = readme.replace(
  /硬件杂谈（\d+ 分类，\d+ 篇）/,
  `硬件杂谈（${hwSubdirs.length} 分类，${stats.totalHw} 篇）`
)

readme = readme.replace(/\d+ 篇技术文章/, `${stats.totalNotes} 篇技术文章`)
readme = readme.replace(/\d+ 款前端工具/, `${stats.tools} 款前端工具`)
readme = readme.replace(/\d+ 道家常菜谱/, `${stats.recipes} 道家常菜谱`)
readme = readme.replace(/\d+ 个分类/, `${stats.navCategories} 个分类`)
readme = readme.replace(/\d+\+? 个?开发网站/, `${stats.navLinks} 个开发网站`)

readme = readme.replace(/算法题库（\d+ 题）/g, `算法题库（${stats.algorithm} 题）`)
readme = readme.replace(/算法题库\*\*：\d+ 题/g, `算法题库**：${stats.algorithm} 题`)
readme = readme.replace(/(recipes\.json\s+#\s*)\d+/, `$1${stats.recipes}`)
readme = readme.replace(/(tools\.js\s+#\s*)\d+/, `$1${stats.tools}`)
readme = readme.replace(/(navLinks\.js\s+#\s*)\d+/, `$1${stats.navLinks}`)

fs.writeFileSync(README, readme, 'utf8')

console.log('README.md updated')
console.log(
  `  Notes: ${stats.totalNotes} (${subdirs.map((s) => `${s.label} ${stats.sub[s.key]}`).join(', ')})`
)
console.log(`  Tools: ${stats.tools}`)
console.log(`  Recipes: ${stats.recipes}`)
console.log(
  `  Nav: ${stats.navCategories} categories, ${stats.navLinks} links`
)
console.log(
  `  Hardware: ${stats.totalHw} (${hwSubdirs.map((s) => `${s.label} ${stats.hwSub[s.key]}`).join(', ')})`
)
console.log(`  Algorithm: ${stats.algorithm}`)
