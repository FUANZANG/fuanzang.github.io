<script setup>
import { onMounted, onUnmounted, ref, nextTick, computed } from 'vue'
import { useRouter } from 'vitepress'
import recipes from '../../data/recipes.json'
import { getHomeSections } from '../../data/siteSections.js'
import { profileTagline, techStack } from '../../data/profile.js'
import SectionIcon from '../../components/SectionIcon.vue'

const router = useRouter()
const heroRef = ref(null)
let scrollHandler = null
let io = null

// ── 首页探索区（与顶栏栏目同源：docs/data/siteSections.js）──
const homeSections = getHomeSections()
const homeCards = computed(() =>
  homeSections.filter((s) => s.homeVariant !== 'about')
)
const aboutSection = computed(() =>
  homeSections.find((s) => s.homeVariant === 'about')
)

// ── Hero 代码窗口：随机菜谱 + 打字机 ──
const codeText = ref('')
const codeHtml = ref('')
const typing = ref(true)
const currentRecipeName = ref('')
let codeTimer = null

const recipesDeepLink = computed(() =>
  currentRecipeName.value
    ? `/recipes?name=${encodeURIComponent(currentRecipeName.value)}`
    : '/recipes'
)

function pickRandomRecipe() {
  const list = recipes.length ? recipes : []
  if (!list.length) return null
  if (list.length === 1) {
    currentRecipeName.value = list[0].name
    return list[0]
  }
  let next = list[Math.floor(Math.random() * list.length)]
  // 连续点击换菜时尽量不重复
  let guard = 0
  while (next.name === currentRecipeName.value && guard++ < 8) {
    next = list[Math.floor(Math.random() * list.length)]
  }
  currentRecipeName.value = next.name
  return next
}

function buildCode(recipe) {
  if (!recipe) return ''
  return `const dinner = await Recipes
  .filter(r => r.name === '${recipe.name}')
  .first()

// 今晚吃什么？
console.log(\`今晚吃：${recipe.name}\`)`
}

// 轻量语法高亮：关键字 / 标识符 / 方法 / 字符串 / 注释
function highlight(code) {
  const escape = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  let html = escape(code)
  // 注释先上色，避免后续规则吃掉
  html = html.replace(/(\/\/.*)/g, '<span class="ln c">$1</span>')
  // 字符串（单引号 / 模板字符串）
  html = html.replace(/('[^']*'|`[^`]*`)/g, '<span class="ln s">$1</span>')
  // 方法调用（.xxx(）
  html = html.replace(/(\.\w+)(?=\()/g, '<span class="ln f">$1</span>')
  // 关键字
  html = html.replace(/\b(const|await)\b/g, '<span class="ln k">$1</span>')
  // 类型 / 对象名
  html = html.replace(/\b(Recipes|console)\b/g, '<span class="ln n">$1</span>')
  return html
}

function stopCodeTyping() {
  if (codeTimer) {
    clearTimeout(codeTimer)
    codeTimer = null
  }
}

function startCodeTyping() {
  stopCodeTyping()
  const recipe = pickRandomRecipe()
  const full = buildCode(recipe)
  let i = 0
  codeText.value = ''
  codeHtml.value = ''
  typing.value = true
  const tick = () => {
    if (i <= full.length) {
      codeText.value = full.slice(0, i)
      i++
      const ch = full[i - 1]
      const delay = ch === '\n' ? 40 : 28
      codeTimer = setTimeout(tick, delay)
    } else {
      // 打完：高亮 + 淡入上色
      codeHtml.value = highlight(full)
      requestAnimationFrame(() => {
        typing.value = false
      })
    }
  }
  tick()
}

/** 点击「换一道」：换一道菜并重新打字 */
function reshuffleDinner() {
  startCodeTyping()
}

// ── 滚动揭示：一次性，进入视口即停 ──
function setupReveal() {
  const els = document.querySelectorAll('.reveal')
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => {
      el.classList.remove('is-pending')
      el.classList.add('is-in')
    })
    return
  }
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'))
    return
  }
  if (io) io.disconnect()
  io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.remove('is-pending')
        entry.target.classList.add('is-in')
        io.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -4% 0px', threshold: 0.08 }
  )
  els.forEach((el, i) => {
    el.classList.add('is-pending')
    el.style.transitionDelay = `${(i % 3) * 60}ms`
    io.observe(el)
  })
}

function onHomeRoute(e) {
  if (e.detail === '/' || e.detail === '/index.html') {
    document.body.classList.add('cool-home-page')
    setTimeout(() => setupReveal(), 60)
  } else {
    document.body.classList.remove('cool-home-page')
  }
}

onMounted(() => {
  document.body.classList.add('cool-home-page')
  nextTick(() => setupReveal())

  // 滚动监听：让导航栏在滚动后显示毛玻璃背景
  scrollHandler = () => {
    const vpNav = document.querySelector('.VPNav')
    if (vpNav) {
      vpNav.classList.toggle('scrolled', window.scrollY > 80)
    }
  }
  window.addEventListener('scroll', scrollHandler, { passive: true })

  // 监听全局路由事件（由 Layout.vue 派发，避免覆盖 router 回调）
  window.addEventListener('vp-route-change', onHomeRoute)

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const rc = pickRandomRecipe()
    codeHtml.value = highlight(buildCode(rc))
    typing.value = false
    return
  }
  startCodeTyping()
})

onUnmounted(() => {
  document.body.classList.remove('cool-home-page')
  if (io) io.disconnect()
  window.removeEventListener('vp-route-change', onHomeRoute)
  stopCodeTyping()
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler)
    scrollHandler = null
  }
})
</script>

<template>
  <div class="cool-home">
    <!-- ═══ HERO：同一纸面，代码窗作签名，避免左右硬切 ═══ -->
    <section ref="heroRef" class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <h1 class="hero-title">FUANZANG</h1>
          <p class="hero-subtitle">个人知识库 &amp; 博客</p>
          <p class="hero-tagline">{{ profileTagline }}</p>
          <div class="hero-actions">
            <a href="/notes/" class="action-btn primary">开始阅读</a>
            <a
              href="https://github.com/FUANZANG"
              target="_blank"
              rel="noopener"
              class="action-btn subtle"
              >GitHub ↗</a
            >
          </div>
        </div>

        <div class="hero-visual" aria-label="今晚吃什么代码演示">
          <div class="code-window">
            <div class="code-bar">
              <span class="dot" />
              <span class="dot" />
              <span class="dot" />
              <a
                class="code-file"
                :href="recipesDeepLink"
                :title="
                  currentRecipeName
                    ? `查看「${currentRecipeName}」`
                    : '打开家常菜谱'
                "
                >dinner.ts → 菜谱</a
              >
              <button
                type="button"
                class="code-refresh"
                title="换一道菜"
                aria-label="换一道菜"
                @click="reshuffleDinner"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <polyline points="21 3 21 9 15 9" />
                </svg>
                <span>换一道</span>
              </button>
            </div>
            <pre class="code-body" :class="{ typing }"><code class="code-plain">{{ codeText }}<span
                  class="code-caret"
                  v-show="typing"
                >▋</span></code><code
                class="code-hl"
                v-html="codeHtml"
              /><span class="code-caret" v-show="!typing">▋</span></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 全部内容 ═══ -->
    <section class="features-section">
      <h2 class="section-heading">全部内容</h2>
      <div class="features-grid">
        <a
          v-for="item in homeCards"
          :key="item.id"
          :href="item.link"
          class="feature-card reveal"
        >
          <h3>
            <span class="card-icon" aria-hidden="true">
              <SectionIcon :name="item.icon" :size="18" />
            </span>
            {{ item.title }}
          </h3>
          <p>{{ item.description }}</p>
        </a>
      </div>
    </section>

    <!-- ═══ 关于我 ═══ -->
    <section class="about-section">
      <h2 class="section-heading">关于我</h2>
      <a v-if="aboutSection" class="about-card reveal" :href="aboutSection.link">
        <div class="about-body">
          <p class="about-text">{{ aboutSection.description }}</p>
          <ul class="tech-tags">
            <li v-for="t in techStack" :key="t" class="tech-tag">{{ t }}</li>
          </ul>
        </div>
      </a>
    </section>
  </div>
</template>

<style>
/* ─── Global: page layout overrides ─── */
.cool-home .VPContent.has-sidebar,
.cool-home .VPContent {
  max-width: 100% !important;
  padding: 0 !important;
}

.cool-home .VPDoc {
  padding-top: 0 !important;
}

/* 代码窗口语法高亮：墨色窗里用灰度拉开层级，避免糊成一片 */
.code-body .ln.k {
  color: #fafafa;
  font-weight: 600;
}
.code-body .ln.n {
  color: #d4d4d8;
}
.code-body .ln.f {
  color: #a1a1aa;
}
.code-body .ln.s {
  color: #e7e5e4;
}
.code-body .ln.c {
  color: #737373;
  font-style: italic;
}
</style>

<style scoped>
/* ─── CSS Custom Properties ─── */
.cool-home {
  overflow-x: hidden;
  --c-ink: var(--vp-c-text-1, #141414);
  --c-on-ink: var(--vp-c-bg, #fafafa);
  --c-accent: var(--vp-c-text-1, #141414);
  --c-accent-deep: var(--vp-c-brand-2, #000000);
}

/* ═══════════════════════════════════════
   HERO：同一纸面双栏，去掉左右硬切
   ═══════════════════════════════════════ */
.hero {
  position: relative;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.hero-inner {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 5.5rem 1.75rem 3rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  align-items: center;
  gap: clamp(1.5rem, 4vw, 3rem);
}

.hero-copy {
  animation: home-rise 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

.hero-visual {
  animation: home-rise 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) 0.08s both;
}

@keyframes home-rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 5vw, 3.6rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0 0 0.45em;
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

.hero-subtitle {
  font-size: clamp(1.05rem, 2vw, 1.35rem);
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 0.5em;
}

.hero-tagline {
  font-size: 0.98rem;
  color: var(--vp-c-text-2);
  margin: 0 0 1.6rem;
  letter-spacing: 0.01em;
  max-width: 26rem;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1.35rem;
  border-radius: 8px;
  font-size: 0.92rem;
  font-weight: 600;
  text-decoration: none;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    color 0.25s ease,
    background 0.25s ease,
    border-color 0.25s ease;
  cursor: pointer;
}

.action-btn.primary {
  background: var(--c-ink);
  color: var(--c-on-ink, #fafafa);
  box-shadow: 0 4px 18px -10px rgba(0, 0, 0, 0.45);
}

.action-btn.primary:hover {
  background: var(--c-accent-deep);
  color: var(--c-on-ink, #fafafa);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -10px rgba(0, 0, 0, 0.55);
}

.action-btn.subtle {
  color: var(--vp-c-text-2);
  background: transparent;
  border: 1px solid var(--vp-c-divider);
}

.action-btn.subtle:hover {
  color: var(--vp-c-text-1);
  border-color: var(--c-ink);
  transform: translateY(-2px);
}

/* ─── Code Window：纸面上的墨色签名块 ─── */
.code-window {
  width: 100%;
  min-height: 260px;
  height: clamp(250px, 32vh, 320px);
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: #141414;
  border: 1px solid rgba(20, 20, 20, 0.85);
  box-shadow: 0 18px 40px -24px rgba(0, 0, 0, 0.55);
  overflow: hidden;
  font-family: var(--vp-font-family-mono);
}

.code-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.8rem;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.28);
}

.code-file {
  margin-left: 0.45rem;
  margin-right: auto;
  font-size: 0.75rem;
  color: rgba(240, 240, 240, 0.62);
  text-decoration: none;
  transition: color 0.2s;
  border-radius: 2px;
}
.code-file:hover {
  color: #f0f0f0;
}

.code-refresh {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  background: transparent;
  color: rgba(240, 240, 240, 0.62);
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;
}
.code-refresh:hover {
  color: #f0f0f0;
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.05);
}

.code-body {
  flex: 1;
  height: 100%;
  margin: 0;
  padding: 1rem 1.15rem;
  font-size: 0.86rem;
  line-height: 1.75;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: hidden;
  position: relative;
}

.code-caret {
  display: inline-block;
  margin-left: 1px;
  color: #fafafa;
  animation: code-blink 1s step-end infinite;
}

@keyframes code-blink {
  50% {
    opacity: 0;
  }
}

/* 两层叠放：打字层（纯文本）与高亮层交叉淡入，避免节点替换闪烁 */
.code-plain,
.code-hl {
  transition: opacity 0.4s ease;
}
.code-hl {
  position: absolute;
  inset: 1.1rem 1.2rem;
  opacity: 0;
  pointer-events: none;
}
.code-body.typing .code-plain {
  opacity: 1;
}
.code-body.typing .code-hl {
  opacity: 0;
}
.code-body:not(.typing) .code-plain {
  opacity: 0;
}
.code-body:not(.typing) .code-hl {
  opacity: 1;
}

/* ═══════════════════════════════════════
   揭示动画（滚动进入视口，一次性）
   ═══════════════════════════════════════ */
/* 默认可见，避免 IO 未触发时「全部内容」一片空白；入场只做轻位移 */
.cool-home .reveal {
  opacity: 1;
  transform: none;
  transition:
    opacity 0.45s ease-out,
    transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.cool-home .reveal.is-pending {
  opacity: 0;
  transform: translateY(14px);
}
.cool-home .reveal.is-in {
  opacity: 1;
  transform: none;
}

/* ═══════════════════════════════════════
   全部内容
   ═══════════════════════════════════════ */
.features-section {
  position: relative;
  padding: 4.5rem 2rem 3rem;
  max-width: 1100px;
  margin: 0 auto;
}

.section-heading {
  text-align: left;
  font-family: var(--font-display);
  font-size: clamp(1.45rem, 3vw, 1.9rem);
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 1.75rem;
  letter-spacing: -0.03em;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}

/* ─── Feature Card ─── */
.feature-card {
  position: relative;
  display: block;
  padding: 1.35rem 1.25rem 1.45rem;
  border-radius: 0;
  background: transparent;
  border: none;
  border-top: 1px solid var(--vp-c-divider);
  text-decoration: none;
  color: inherit;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.feature-card:hover {
  background: rgba(20, 20, 20, 0.04);
  border-top-color: var(--c-ink);
}

.card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: auto;
  margin: 0 0.45rem 0 0;
  color: var(--c-accent);
  vertical-align: -0.15em;
}

.feature-card h3 {
  display: flex;
  align-items: center;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 0.45rem;
}

.feature-card p {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.65;
  margin: 0;
  padding-left: 1.55rem;
}

/* ═══════════════════════════════════════
   关于我
   ═══════════════════════════════════════ */
.about-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1rem 2rem 7rem;
}

.about-section .section-heading {
  margin-bottom: 1.25rem;
}

.about-card {
  position: relative;
  display: block;
  padding: 1.75rem 0 0;
  border-radius: 0;
  background: transparent;
  border: none;
  border-top: 1px solid var(--vp-c-divider);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s;
}

.about-card:hover {
  border-top-color: var(--c-accent);
}

.about-text {
  font-size: 1rem;
  color: var(--vp-c-text-1);
  line-height: 1.8;
  margin: 0 0 1.15rem;
  max-width: 46rem;
}

.tech-tags {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
}

.tech-tag {
  font-size: 0.8rem;
  padding: 0 0 0.1rem;
  border-radius: 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}

/* ─── 键盘焦点 ─── */
.action-btn:focus-visible,
.feature-card:focus-visible,
.about-card:focus-visible,
.code-refresh:focus-visible,
.code-file:focus-visible {
  outline: 2px solid var(--c-accent);
  outline-offset: 3px;
}

/* ═══════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════ */
@media (max-width: 960px) {
  .features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .hero {
    min-height: 100vh;
    min-height: 100svh;
  }

  .hero-inner {
    grid-template-columns: 1fr;
    padding: 5rem 1.25rem 2.5rem;
    gap: 1.5rem;
  }

  .hero-actions {
    gap: 0.7rem;
  }

  .code-window {
    height: 240px;
    min-height: 230px;
  }

  .features-section {
    padding: 3rem 1.5rem 2.5rem;
  }

  .section-heading {
    margin-bottom: 1.5rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .feature-card {
    padding: 1.15rem 0.2rem 1.25rem;
  }

  .feature-card p {
    padding-left: 0;
  }

  .about-section {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

/* ═══════════════════════════════════════
   REDUCED MOTION
   ═══════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .hero-copy,
  .hero-visual {
    animation: none;
  }

  .cool-home .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .code-caret {
    animation: none !important;
  }

  .code-plain,
  .code-hl {
    transition: none;
  }

  .feature-card,
  .about-card,
  .action-btn {
    transition: none;
  }
}
</style>
