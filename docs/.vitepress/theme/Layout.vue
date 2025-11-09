<script setup>
import DefaultTheme from 'vitepress/theme'
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vitepress'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const { Layout } = DefaultTheme
const router = useRouter()

gsap.registerPlugin(ScrollTrigger)

let tweens = []
let scrollTriggers = []
let progressHandler = null

function killAll() {
  tweens.forEach(t => t.kill())
  tweens = []
  scrollTriggers.forEach(t => t.kill())
  scrollTriggers = []
}

// 顶部滚动进度条
function updateProgress() {
  const h =
    document.documentElement.scrollHeight - window.innerHeight
  const p = h > 0 ? window.scrollY / h : 0
  const bar = document.getElementById('scroll-progress')
  if (bar) bar.style.transform = `scaleX(${p})`
}

// 首页 Hero 动画
function animateHero() {
  const hero = document.querySelector('.VPHero')
  if (!hero) return

  const name = hero.querySelector('.name')
  const text = hero.querySelector('.text')
  const tagline = hero.querySelector('.tagline')
  const buttons = hero.querySelectorAll('.actions .VPButton')

  // 先设置初始状态
  if (name) gsap.set(name, { y: 50, autoAlpha: 0 })
  if (text) gsap.set(text, { y: 30, autoAlpha: 0 })
  if (tagline) gsap.set(tagline, { y: 20, autoAlpha: 0 })
  if (buttons.length) gsap.set(buttons, { y: 20, autoAlpha: 0 })

  // 再动画到最终状态
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

  if (name) tl.to(name, { y: 0, autoAlpha: 1, duration: 1, ease: 'power4.out' })
  if (text) tl.to(text, { y: 0, autoAlpha: 1, duration: 0.8 }, '-=0.5')
  if (tagline) tl.to(tagline, { y: 0, autoAlpha: 1, duration: 0.8 }, '-=0.4')
  if (buttons.length) tl.to(buttons, { y: 0, autoAlpha: 1, stagger: 0.15, duration: 0.6 }, '-=0.3')

  tweens.push(tl)
}

// Features 卡片滚动动画
function animateFeatures() {
  const features = document.querySelectorAll('.VPFeature')
  if (!features.length) return

  // 设置初始状态
  gsap.set(features, { y: 60, autoAlpha: 0 })

  features.forEach((feature, i) => {
    const st = ScrollTrigger.create({
      trigger: feature,
      start: 'top 85%',
      onEnter: () => {
        const t = gsap.to(feature, {
          y: 0,
          autoAlpha: 1,
          duration: 0.8,
          delay: i * 0.1,
          ease: 'power2.out'
        })
        tweens.push(t)
      },
      once: true
    })
    scrollTriggers.push(st)
  })
}

// 文章页面无额外入场动画，避免切换抖动
function animateDoc() {}

// 路由切换页面入场
function runAnimations() {
  killAll()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  // 延迟 300ms 确保 VitePress 渲染完成
  setTimeout(() => {
    animateHero()
    animateFeatures()
    animateDoc()
    ScrollTrigger.refresh()
  }, 300)
}

onMounted(() => {
  runAnimations()
  router.onAfterRouteChange = path => {
    runAnimations()
    window.dispatchEvent(new CustomEvent('vp-route-change', { detail: path }))
  }

  progressHandler = updateProgress
  window.addEventListener('scroll', progressHandler, { passive: true })
  window.addEventListener('resize', progressHandler, { passive: true })
  updateProgress()
})

onUnmounted(() => {
  killAll()
  if (progressHandler) {
    window.removeEventListener('scroll', progressHandler)
    window.removeEventListener('resize', progressHandler)
    progressHandler = null
  }
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
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.6);
  pointer-events: none;
}
</style>
