<script setup>
/**
 * 站点壳：顶部滚动进度条 + 滚动时短暂显示滚动条。
 * 路由切换后把侧栏当前项滚入可视区（总览点进深层笔记时需要）。
 * 同步 theme-color，使安卓安装态状态栏跟深浅色一致。
 */
import DefaultTheme from 'vitepress/theme'
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vitepress'
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from './themeColors.js'

const { Layout } = DefaultTheme
const router = useRouter()

let progressHandler = null
let scrollUiHandler = null
let scrollHideTimer = null
let sidebarScrollTimer = null
let themeColorObserver = null
/** 点击来自侧栏时不再自动居中，避免竖线先出现再被滚走 */
let navFromSidebar = false

/** 按 html.dark 更新无 media 的 theme-color，供安卓 Chrome 安装态状态栏使用 */
function syncThemeColor() {
  const dark = document.documentElement.classList.contains('dark')
  const color = dark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT
  let meta = document.querySelector('meta[name="theme-color"]:not([media])')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  if (meta.getAttribute('content') !== color) {
    meta.setAttribute('content', color)
  }
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

function markSidebarNav(e) {
  navFromSidebar = !!e.target?.closest?.('.VPSidebar a')
}

function updateProgress() {
  const h =
    document.documentElement.scrollHeight - window.innerHeight
  const p = h > 0 ? window.scrollY / h : 0
  const bar = document.getElementById('scroll-progress')
  if (bar) bar.style.transform = `scaleX(${p})`
}

/** 滚动时短暂显示滚动条，停下后隐藏 */
function onScrollUi() {
  document.documentElement.classList.add('is-scrolling')
  if (scrollHideTimer) clearTimeout(scrollHideTimer)
  scrollHideTimer = setTimeout(() => {
    document.documentElement.classList.remove('is-scrolling')
    scrollHideTimer = null
  }, 900)
}

/** 侧栏内容区顶边：curtain 底边（桌面站名下方） */
function getSidebarContentTop(sidebar) {
  const curtain = sidebar.querySelector('.curtain')
  if (curtain) return curtain.getBoundingClientRect().bottom
  const pad = parseFloat(getComputedStyle(sidebar).paddingTop) || 0
  return sidebar.getBoundingClientRect().top + pad
}

/** 吸顶后会盖住子项的分组标题底边（按吸顶态预留，不用未吸顶时的位置） */
function getStickyCoverBottom(sidebar, activeRoot) {
  const contentTop = getSidebarContentTop(sidebar)
  const level0 = activeRoot.closest('.VPSidebarItem.level-0')
  if (!level0 || level0 === activeRoot) return contentTop

  const header = level0.querySelector(':scope > .item')
  if (!header) return contentTop

  return contentTop + header.getBoundingClientRect().height
}

/** 平滑滚到侧栏中部；靠近首尾时自然贴边 */
function scrollSidebarToActive() {
  const sidebar = document.querySelector('.VPSidebar')
  const activeRoot = sidebar?.querySelector('.VPSidebarItem.is-active')
  const activeItem = activeRoot?.querySelector(':scope > .item')
  if (!sidebar || !activeRoot || !activeItem) return false

  const coverBottom = getStickyCoverBottom(sidebar, activeRoot)
  const sideRect = sidebar.getBoundingClientRect()
  const itemRect = activeItem.getBoundingClientRect()
  const midY = (coverBottom + sideRect.bottom) / 2
  const itemMid = (itemRect.top + itemRect.bottom) / 2
  const delta = itemMid - midY
  if (Math.abs(delta) < 8) return true

  sidebar.scrollTo({ top: sidebar.scrollTop + delta, behavior: 'smooth' })
  return true
}

/** 等激活项出现、折叠展开后，只做一次平滑滚动 */
function scheduleSidebarScroll() {
  if (sidebarScrollTimer) clearTimeout(sidebarScrollTimer)
  let tries = 0
  const run = () => {
    tries += 1
    const found = !!document.querySelector(
      '.VPSidebar .VPSidebarItem.is-active > .item'
    )
    if (!found && tries < 10) {
      sidebarScrollTimer = setTimeout(run, 40)
      return
    }
    sidebarScrollTimer = setTimeout(() => scrollSidebarToActive(), 80)
  }
  sidebarScrollTimer = setTimeout(run, 50)
}

onMounted(() => {
  document.addEventListener('click', markSidebarNav, true)

  router.onAfterRouteChange = (path) => {
    updateProgress()
    if (navFromSidebar) {
      if (sidebarScrollTimer) clearTimeout(sidebarScrollTimer)
      sidebarScrollTimer = null
    } else {
      scheduleSidebarScroll()
    }
    navFromSidebar = false
    window.dispatchEvent(new CustomEvent('vp-route-change', { detail: path }))
  }

  progressHandler = updateProgress
  scrollUiHandler = onScrollUi
  window.addEventListener('scroll', progressHandler, { passive: true })
  window.addEventListener('scroll', scrollUiHandler, { passive: true })
  window.addEventListener('resize', progressHandler, { passive: true })
  updateProgress()
  scheduleSidebarScroll()

  syncThemeColor()
  themeColorObserver = new MutationObserver(syncThemeColor)
  themeColorObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
})

onUnmounted(() => {
  document.removeEventListener('click', markSidebarNav, true)
  if (progressHandler) {
    window.removeEventListener('scroll', progressHandler)
    window.removeEventListener('resize', progressHandler)
    progressHandler = null
  }
  if (scrollUiHandler) {
    window.removeEventListener('scroll', scrollUiHandler)
    scrollUiHandler = null
  }
  if (scrollHideTimer) {
    clearTimeout(scrollHideTimer)
    scrollHideTimer = null
  }
  if (sidebarScrollTimer) {
    clearTimeout(sidebarScrollTimer)
    sidebarScrollTimer = null
  }
  if (themeColorObserver) {
    themeColorObserver.disconnect()
    themeColorObserver = null
  }
  document.documentElement.classList.remove('is-scrolling')
})
</script>

<template>
  <div id="scroll-progress" />
  <Layout />
</template>

<style>
#scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 100;
  transform: scaleX(0);
  transform-origin: 0 50%;
  background: var(--c-ink);
  box-shadow: 0 0 8px color-mix(in srgb, var(--c-ink) 35%, transparent);
  pointer-events: none;
}
</style>
