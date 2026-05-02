#!/usr/bin/env node
/**
 * sync-readme-stats.js
 * 扫描项目文件，自动更新 README.md 中的数量统计。
 *
 * 用法：node scripts/sync-readme-stats.js
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const README = path.join(ROOT, 'README.md')

// ── 扫描函数 ──
function countMd(dir) {
  if (!fs.existsSync(dir)) return 0
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).length
}

function countRecipes() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/data/recipes.json'), 'utf8'))
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

// ── 统计 ──
const notesDir = path.join(ROOT, 'docs/notes')
const subdirs = [
  { key: 'foundations', label: '前端基础' },
  { key: 'frameworks', label: '框架' },
  { key: 'engineering', label: '工程化' },
  { key: 'performance', label: '性能与质量' },
  { key: 'deploy', label: '部署' },
  { key: 'backend', label: '后端' },
  { key: 'cross-platform', label: '跨端' },
  { key: 'practice', label: '场景实战' },
  { key: 'frontier', label: 'AI 与前沿' }
]

const stats = {
  totalNotes: 0,
  recipes: countRecipes(),
  tools: countTools(),
  navLinks: countNavLinks(),
  navCategories: countNavCategories(),
  sub: {}
}

for (const { key } of subdirs) {
  stats.sub[key] = countMd(path.join(notesDir, key))
  stats.totalNotes += stats.sub[key]
}

// ── 更新 README ──
let readme = fs.readFileSync(README, 'utf8')

// 更新子目录行：替换 "标签（N 篇）" 中的数字
for (const { key, label } of subdirs) {
  const regex = new RegExp(label + '\\uFF08' + '\\d+' + ' \\u7BC7\\uFF09', 'g')
  const replacement = label + '\uFF08' + stats.sub[key] + ' \u7BC7\uFF09'
  readme = readme.replace(regex, replacement)
}

// 更新汇总行
readme = readme.replace(/(\d+)\+?\s*\u7BC7\u6280\u672F\u6587\u7AE0/, stats.totalNotes + '+ \u7BC7\u6280\u672F\u6587\u7AE0')
readme = readme.replace(/(\d+)\s*\u6B3E\u7EAF\u524D\u7AEF\u5DE5\u5177/, stats.tools + ' \u6B3E\u7EAF\u524D\u7AEF\u5DE5\u5177')
readme = readme.replace(/(\d+)\+?\s*\u9053\u5BB6\u5E38\u83DC\u8C31/, stats.recipes + '+ \u9053\u5BB6\u5E38\u83DC\u8C31')
readme = readme.replace(/(\d+)\s*\u4E2A\u5206\u7C7B/, stats.navCategories + ' \u4E2A\u5206\u7C7B')
readme = readme.replace(/(\d+)\+?\s*\u4E2A\u5F00\u53D1\u7F51\u7AD9/, stats.navLinks + '+ \u4E2A\u5F00\u53D1\u7F51\u7AD9')

fs.writeFileSync(README, readme, 'utf8')

// ── 输出 ──
console.log('README.md updated')
console.log(`  Notes: ${stats.totalNotes} (${subdirs.map(s => `${s.label} ${stats.sub[s.key]}`).join(', ')})`)
console.log(`  Tools: ${stats.tools}`)
console.log(`  Recipes: ${stats.recipes}`)
console.log(`  Nav: ${stats.navCategories} categories, ${stats.navLinks} links`)
