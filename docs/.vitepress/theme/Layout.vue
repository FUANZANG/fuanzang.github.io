<script setup>
/**
 * 站点壳：顶部滚动进度条 + 滚动时短暂显示滚动条。
 * 首页已改 CoolHome，不再依赖默认 VPHero / VPFeature 入场动画。
 */
import DefaultTheme from 'vitepress/theme'
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vitepress'

const { Layout } = DefaultTheme
const router = useRouter()

let progressHandler = null
let scrollUiHandler = null
let scrollHideTimer = null

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

onMounted(() => {
  router.onAfterRouteChange = (path) => {
    updateProgress()
    window.dispatchEvent(new CustomEvent('vp-route-change', { detail: path }))
  }

  progressHandler = updateProgress
  scrollUiHandler = onScrollUi
  window.addEventListener('scroll', progressHandler, { passive: true })
  window.addEventListener('scroll', scrollUiHandler, { passive: true })
  window.addEventListener('resize', progressHandler, { passive: true })
  updateProgress()
})

onUnmounted(() => {
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
  background: #141414;
  box-shadow: 0 0 8px rgba(20, 20, 20, 0.35);
  pointer-events: none;
}

.dark #scroll-progress {
  background: #f0f0f0;
  box-shadow: 0 0 8px rgba(240, 240, 240, 0.35);
}
</style>
