<script setup>
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import { useRouter } from 'vitepress'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const router = useRouter()
const heroRef = ref(null)
const orbsRef = ref(null)
const titleChars = ref('FUANZANG'.split(''))
const st = ref([])
const tw = ref([])
let scrollHandler = null

// ── Hero 打字机标语 ──
const typedText = ref('')
const taglinePhrases = [
  '前端开发',
  '全栈探索',
  '开源爱好者',
  '偶尔下厨 🍳',
  '记录与分享'
]
let typingTimer = null

function startTyping() {
  let pi = 0,
    ci = 0,
    deleting = false
  const tick = () => {
    const phrase = taglinePhrases[pi]
    if (!deleting) {
      typedText.value = phrase.slice(0, ++ci)
      if (ci === phrase.length) {
        deleting = true
        typingTimer = setTimeout(tick, 1400)
        return
      }
    } else {
      typedText.value = phrase.slice(0, --ci)
      if (ci === 0) {
        deleting = false
        pi = (pi + 1) % taglinePhrases.length
      }
    }
    typingTimer = setTimeout(tick, deleting ? 45 : 95)
  }
  tick()
}

// ── 技术栈（与笔记覆盖的技术对齐） ──
const techStack = [
  'Vue',
  'React',
  'TypeScript',
  'JavaScript',
  'Vite',
  'Webpack',
  'Node.js',
  'GSAP',
  'ECharts',
  'VitePress',
  'Electron'
]

const backToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

function kill() {
  st.value.forEach(t => t.kill())
  tw.value.forEach(t => t.kill())
  st.value = []
  tw.value = []
}

// Orb config: [gradient, size, top, left, blur, parallaxSpeed]
const orbConfig = [
  ['var(--g1)', '550px', '-8%', '8%', '80px', 0.15],
  ['var(--g2)', '480px', '22%', '68%', '90px', 0.3],
  ['var(--g3)', '380px', '58%', '3%', '70px', 0.25],
  ['var(--g4)', '440px', '52%', '80%', '85px', 0.2],
  ['var(--g1)', '300px', '82%', '38%', '75px', 0.4]
]

// Mouse parallax — uses x-axis (scroll parallax owns y-axis)
function onMove(e) {
  if (!orbsRef.value) return
  const mx = (e.clientX / window.innerWidth - 0.5) * 2
  const my = (e.clientY / window.innerHeight - 0.5) * 2
  const orbs = orbsRef.value.querySelectorAll('.parallax-orb')
  orbs.forEach((orb, i) => {
    const factor = (i + 1) * 10
    gsap.to(orb, {
      x: mx * factor,
      y: my * factor * 0.4,
      duration: 0.6,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  })
}

async function run() {
  kill()
  await nextTick()
  await new Promise(r => setTimeout(r, 200))

  const hero = heroRef.value
  if (!hero) return

  // ── Scroll Parallax ──
  const layers = [
    ['.hero-title', -0.5],
    ['.hero-subtitle', -0.35],
    ['.hero-tagline', -0.25],
    ['.hero-actions', -0.15]
  ]
  layers.forEach(([sel, speed]) => {
    const el = hero.querySelector(sel)
    if (!el) return
    st.value.push(
      ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: self => {
          gsap.set(el, { y: self.progress * self.distance * speed })
        }
      })
    )
  })

  // Orb parallax
  const orbs = hero.querySelectorAll('.parallax-orb')
  orbs.forEach((orb, i) => {
    const speed = orbConfig[i]?.[5] || 0.2
    st.value.push(
      ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: self => {
          gsap.set(orb, { y: self.progress * self.distance * -speed })
        }
      })
    )
  })

  // ── Reveal Animations ──
  // Orbs fade in
  if (orbs.length) {
    gsap.set(orbs, { scale: 0.4, opacity: 0 })
    tw.value.push(
      gsap.to(orbs, {
        scale: 1,
        opacity: 1,
        duration: 2,
        stagger: 0.25,
        ease: 'power2.out',
        filter: i => `blur(${orbConfig[i]?.[4]?.replace('px', '') || 80}px)`
      })
    )
  }

  // Title characters fly in
  const chars = hero.querySelectorAll('.char')
  if (chars.length) {
    gsap.set(chars, { y: 120, opacity: 0, rotateX: -90 })
    tw.value.push(
      gsap.to(chars, {
        y: 0,
        opacity: 1,
        rotateX: 0,
        duration: 1.1,
        stagger: 0.07,
        ease: 'back.out(1.4)',
        delay: 0.4
      })
    )
  }

  // Subtitle
  const sub = hero.querySelector('.hero-subtitle')
  if (sub) {
    gsap.set(sub, { y: 50, opacity: 0 })
    tw.value.push(
      gsap.to(sub, {
        y: 0,
        opacity: 1,
        duration: 0.9,
        delay: 1,
        ease: 'power3.out'
      })
    )
  }

  // Tagline
  const tag = hero.querySelector('.hero-tagline')
  if (tag) {
    gsap.set(tag, { y: 30, opacity: 0 })
    tw.value.push(
      gsap.to(tag, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        delay: 1.2,
        ease: 'power3.out'
      })
    )
  }

  // Action buttons
  const btns = hero.querySelectorAll('.action-btn')
  if (btns.length) {
    gsap.set(btns, { y: 30, opacity: 0 })
    tw.value.push(
      gsap.to(btns, {
        y: 0,
        opacity: 1,
        stagger: 0.12,
        duration: 0.7,
        delay: 1.4,
        ease: 'power3.out'
      })
    )
  }

  // ── Feature Cards ──
  const cards = document.querySelectorAll('.feature-card')
  if (cards.length) {
    gsap.set(cards, { y: 100, opacity: 0, scale: 0.85, rotateX: 15 })
    cards.forEach((card, i) => {
      st.value.push(
        ScrollTrigger.create({
          trigger: card,
          start: 'top 90%',
          onEnter: () => {
            tw.value.push(
              gsap.to(card, {
                y: 0,
                opacity: 1,
                scale: 1,
                rotateX: 0,
                duration: 0.9,
                delay: i * 0.12,
                ease: 'power3.out'
              })
            )
          },
          once: true
        })
      )
    })
  }

  // ── Section heading reveal ──
  const sectionHeading = document.querySelector('.section-heading')
  if (sectionHeading) {
    gsap.set(sectionHeading, { y: 40, opacity: 0 })
    st.value.push(
      ScrollTrigger.create({
        trigger: sectionHeading,
        start: 'top 85%',
        onEnter: () => {
          tw.value.push(
            gsap.to(sectionHeading, {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: 'power3.out'
            })
          )
        },
        once: true
      })
    )
  }

  // ── About card reveal ──
  const aboutCard = document.querySelector('.about-card')
  if (aboutCard) {
    gsap.set(aboutCard, { y: 60, opacity: 0, scale: 0.96 })
    st.value.push(
      ScrollTrigger.create({
        trigger: aboutCard,
        start: 'top 85%',
        onEnter: () => {
          tw.value.push(
            gsap.to(aboutCard, {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 0.9,
              ease: 'power3.out'
            })
          )
        },
        once: true
      })
    )
  }

  // ── Footer reveal ──
  const homeFooter = document.querySelector('.home-footer')
  if (homeFooter) {
    gsap.set(homeFooter, { opacity: 0 })
    st.value.push(
      ScrollTrigger.create({
        trigger: homeFooter,
        start: 'top 95%',
        onEnter: () => {
          tw.value.push(
            gsap.to(homeFooter, {
              opacity: 1,
              duration: 0.8,
              ease: 'power2.out'
            })
          )
        },
        once: true
      })
    )
  }

  // Refresh ScrollTrigger after DOM updates
  ScrollTrigger.refresh()
}

function onRoute(url) {
  if (url === '/' || url === '/index.html') {
    document.body.classList.add('cool-home-page')
    setTimeout(run, 400)
  } else {
    document.body.classList.remove('cool-home-page')
    kill()
  }
}

onMounted(() => {
  document.body.classList.add('cool-home-page')
  window.addEventListener('mousemove', onMove, { passive: true })

  // 滚动监听：让导航栏在滚动后显示毛玻璃背景
  scrollHandler = () => {
    const vpNav = document.querySelector('.VPNav')
    if (vpNav) {
      if (window.scrollY > 80) {
        vpNav.classList.add('scrolled')
      } else {
        vpNav.classList.remove('scrolled')
      }
    }
  }
  window.addEventListener('scroll', scrollHandler, { passive: true })

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    typedText.value = taglinePhrases[0]
    return
  }
  startTyping()
  run()
  router.onAfterRouteChange = onRoute
})

onUnmounted(() => {
  document.body.classList.remove('cool-home-page')
  kill()
  if (typingTimer) clearTimeout(typingTimer)
  window.removeEventListener('mousemove', onMove)
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler)
    scrollHandler = null
  }
  router.onAfterRouteChange = null
})
</script>

<template>
  <div class="cool-home">
    <!-- ═══ HERO ═══ -->
    <section ref="heroRef" class="hero">
      <!-- Floating gradient orbs (parallax layers) -->
      <div ref="orbsRef" class="orbs-layer">
        <div
          v-for="(cfg, i) in orbConfig"
          :key="i"
          class="parallax-orb"
          :style="{
            background: cfg[0],
            width: cfg[1],
            height: cfg[1],
            top: cfg[2],
            left: cfg[3],
            filter: `blur(${cfg[4]})`,
            animationDelay: `${i * 1.8}s`
          }"
        />
      </div>

      <!-- Grid overlay -->
      <div class="grid-overlay" />

      <!-- Hero content (split) -->
      <div class="hero-inner">
        <div class="hero-text">
          <div class="hero-title">
            <span class="char-wrapper">
              <span
                v-for="(ch, i) in titleChars"
                :key="i"
                class="char"
                :style="{ animationDelay: `${i * 0.08 + 0.6}s` }"
                >{{ ch }}</span
              >
            </span>
          </div>
          <p class="hero-subtitle">个人知识库 &amp; 博客</p>
          <p class="hero-tagline">
            <span class="typed">{{ typedText }}</span
            ><span class="caret">|</span>
          </p>
          <div class="hero-actions">
            <a href="/notes/html-note" class="action-btn primary">开始阅读</a>
            <a href="/blog/hello-world" class="action-btn ghost">浏览博客</a>
            <a
              href="https://github.com/FUANZANG"
              target="_blank"
              rel="noopener"
              class="action-btn subtle"
              >GitHub ↗</a
            >
          </div>
        </div>

        <div class="hero-visual">
          <div class="code-window">
            <div class="code-bar">
              <span class="dot red" />
              <span class="dot yellow" />
              <span class="dot green" />
              <span class="code-file">dinner.ts</span>
            </div>
            <pre class="code-body" v-pre><code>const dinner = await Recipes
  .filter(r => r.tags.includes('快手菜'))
  .sort((a, b) => a.time - b.time)
  .first()

// 今晚吃什么？
console.log(`今晚吃：${dinner.name} 🍳`)</code></pre>
          </div>
        </div>
      </div>

      <!-- Scroll hint -->
      <div class="scroll-hint">
        <div class="scroll-line" />
        <span>向下滚动</span>
      </div>
    </section>

    <!-- ═══ FEATURES ═══ -->
    <section class="features-section">
      <h2 class="section-heading">探索</h2>
      <div class="features-grid">
        <a href="/notes/html-note" class="feature-card">
          <div class="card-icon">
            <span>📝</span>
          </div>
          <h3>学习笔记</h3>
          <p>记录技术学习心得、读书笔记和知识总结，构建个人知识体系</p>
          <div class="card-shine" />
        </a>
        <a href="/blog/hello-world" class="feature-card">
          <div class="card-icon">
            <span>🚀</span>
          </div>
          <h3>技术博客</h3>
          <p>技术文章与经验分享，记录开发心得与思考</p>
          <div class="card-shine" />
        </a>
        <a href="/tools" class="feature-card">
          <div class="card-icon">
            <span>💡</span>
          </div>
          <h3>工具推荐</h3>
          <p>编码转换、格式化等纯前端小工具，随用随走</p>
          <div class="card-shine" />
        </a>
        <a href="/recipes" class="feature-card recipe-card">
          <div class="card-icon">
            <span>🍳</span>
          </div>
          <h3>家常菜谱</h3>
          <p>不知道吃什么时翻翻看，记录一些简单好做的家常菜</p>
          <div class="card-shine" />
        </a>
        <a class="about-card" href="/about">
          <div class="about-avatar">🧑‍💻</div>
          <div class="about-body">
            <h2 class="about-name">关于我</h2>
            <p class="about-text">
              一名喜欢折腾的前端工程师，平时写代码、记笔记，也研究怎么把复杂的工程做简单。
              这个站点用来沉淀学习笔记、分享技术思考，偶尔也放几道拿手菜谱 🍳。
            </p>
            <div class="tech-tags">
              <span v-for="t in techStack" :key="t" class="tech-tag">{{
                t
              }}</span>
            </div>
            <span class="about-more">了解更多 →</span>
          </div>
        </a>
      </div>
    </section>

    <!-- ═══ FOOTER ═══ -->
    <footer class="home-footer">
      <div class="footer-inner">
        <p class="footer-copy">© 2026 FUANZANG · 基于 VitePress 构建</p>
        <div class="footer-links">
          <a href="https://github.com/FUANZANG" target="_blank" rel="noopener"
            >GitHub</a
          >
          <span class="footer-sep">·</span>
          <a href="/notes/html-note">笔记</a>
          <span class="footer-sep">·</span>
          <a href="/recipes">菜谱</a>
          <button class="footer-top" @click="backToTop">回到顶部 ↑</button>
        </div>
      </div>
    </footer>
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
</style>

<style scoped>
/* ─── CSS Custom Properties ─── */
.cool-home {
  --c-blue: #3b82f6;
  --c-purple: #8b5cf6;
  --c-pink: #ec4899;
  --c-cyan: #06b6d4;
  --g1: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.45),
    rgba(139, 92, 246, 0.35)
  );
  --g2: linear-gradient(
    135deg,
    rgba(236, 72, 153, 0.4),
    rgba(245, 158, 11, 0.3)
  );
  --g3: linear-gradient(
    135deg,
    rgba(6, 182, 212, 0.4),
    rgba(59, 130, 246, 0.3)
  );
  --g4: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.4),
    rgba(236, 72, 153, 0.3)
  );
}

/* Dark mode adjustments */
:root.dark .cool-home {
  --g1: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.25),
    rgba(139, 92, 246, 0.2)
  );
  --g2: linear-gradient(
    135deg,
    rgba(236, 72, 153, 0.2),
    rgba(245, 158, 11, 0.15)
  );
  --g3: linear-gradient(
    135deg,
    rgba(6, 182, 212, 0.2),
    rgba(59, 130, 246, 0.15)
  );
  --g4: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.2),
    rgba(236, 72, 153, 0.15)
  );
}

/* ═══════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════ */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  perspective: 1200px;
}

/* Background gradient */
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 80% 60% at 50% 30%,
      rgba(59, 130, 246, 0.08) 0%,
      transparent 70%
    ),
    radial-gradient(
      ellipse 60% 80% at 70% 60%,
      rgba(139, 92, 246, 0.06) 0%,
      transparent 60%
    );
  pointer-events: none;
}

:root.dark .hero::before {
  background:
    radial-gradient(
      ellipse 80% 60% at 50% 30%,
      rgba(59, 130, 246, 0.12) 0%,
      transparent 70%
    ),
    radial-gradient(
      ellipse 60% 80% at 70% 60%,
      rgba(139, 92, 246, 0.1) 0%,
      transparent 60%
    );
}

/* Grid overlay */
.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(128, 128, 128, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(128, 128, 128, 0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  z-index: 0;
}

:root.dark .grid-overlay {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
}

/* ─── Orbs ─── */
.orbs-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.parallax-orb {
  position: absolute;
  border-radius: 50%;
  opacity: 0.65;
  animation: orb-float 22s ease-in-out infinite alternate;
  will-change: transform;
}

:root.dark .parallax-orb {
  opacity: 0.5;
}

@keyframes orb-float {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }
  33% {
    transform: translate(25px, -35px) rotate(3deg);
  }
  66% {
    transform: translate(-20px, 15px) rotate(-2deg);
  }
  100% {
    transform: translate(15px, -20px) rotate(2deg);
  }
}

/* ─── Hero Content ─── */
.hero-inner {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 7rem 2rem 2rem;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  align-items: center;
  gap: 3rem;
}

.hero-text {
  text-align: left;
}

/* ─── Code Window Visual ─── */
.hero-visual {
  display: flex;
  justify-content: center;
}

.code-window {
  width: 100%;
  max-width: 420px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

:root.dark .code-window {
  background: rgba(2, 6, 23, 0.92);
}

.code-bar {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.7rem 0.9rem;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}
.dot.red {
  background: #ff5f56;
}
.dot.yellow {
  background: #ffbd2e;
}
.dot.green {
  background: #27c93f;
}

.code-file {
  margin-left: 0.6rem;
  font-size: 0.75rem;
  color: #94a3b8;
}

.code-body {
  margin: 0;
  padding: 1.1rem 1.2rem;
  font-size: 0.82rem;
  line-height: 1.8;
  color: #e2e8f0;
  white-space: pre-wrap;
  word-break: break-word;
}

.code-body .ln.k {
  color: #c084fc;
}
.code-body .ln.f {
  color: #38bdf8;
}
.code-body .ln.s {
  color: #86efac;
}
.code-body .ln.c {
  color: #64748b;
  font-style: italic;
}

/* ─── Typed tagline ─── */
.hero-tagline {
  font-size: clamp(0.95rem, 2vw, 1.15rem);
  color: var(--vp-c-text-2);
  margin-bottom: 2.5em;
  letter-spacing: 0.05em;
  min-height: 1.4em;
}

.typed {
  color: var(--c-purple);
  font-weight: 600;
}

.caret {
  display: inline-block;
  margin-left: 2px;
  color: var(--c-purple);
  animation: caret-blink 1s step-end infinite;
  font-weight: 400;
}

@keyframes caret-blink {
  50% {
    opacity: 0;
  }
}

/* Title */
.hero-title {
  font-size: clamp(3rem, 9vw, 5.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin-bottom: 0.5em;
  background: linear-gradient(
    135deg,
    var(--c-blue) 0%,
    var(--c-purple) 40%,
    var(--c-pink) 80%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  filter: drop-shadow(0 0 40px rgba(139, 92, 246, 0.15));
}

.char-wrapper {
  display: inline-flex;
}

.char {
  display: inline-block;
  will-change: transform;
}

/* Subtitle */
.hero-subtitle {
  font-size: clamp(1.2rem, 3vw, 1.8rem);
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 0.5em;
}

/* Tagline */
.hero-tagline {
  font-size: clamp(0.95rem, 2vw, 1.15rem);
  color: var(--vp-c-text-2);
  margin-bottom: 2.5em;
  letter-spacing: 0.05em;
}

/* ─── Action Buttons ─── */
.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.8rem;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--c-blue), var(--c-purple));
  color: #fff;
  box-shadow: 0 4px 20px -4px rgba(99, 102, 241, 0.4);
}

.action-btn.primary:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 8px 30px -4px rgba(99, 102, 241, 0.5);
}

.action-btn.ghost {
  border: 1.5px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(8px);
}

:root.dark .action-btn.ghost {
  background: rgba(255, 255, 255, 0.05);
}

.action-btn.ghost:hover {
  transform: translateY(-3px);
  border-color: var(--c-purple);
  color: var(--c-purple);
  box-shadow: 0 4px 20px -8px rgba(139, 92, 246, 0.3);
}

.action-btn.subtle {
  color: var(--vp-c-text-2);
  background: transparent;
}

.action-btn.subtle:hover {
  color: var(--vp-c-text-1);
  transform: translateY(-2px);
}

/* ─── Scroll Hint ─── */
.scroll-hint {
  position: absolute;
  bottom: 2.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  z-index: 2;
  animation: hint-fade-in 1s ease 2.5s both;
}

.scroll-hint span {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.scroll-line {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, var(--vp-c-text-3), transparent);
  animation: scroll-pulse 2s ease-in-out infinite;
}

@keyframes scroll-pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scaleY(0.6);
  }
  50% {
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes hint-fade-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* ═══════════════════════════════════════
   FEATURES SECTION
   ═══════════════════════════════════════ */
.features-section {
  position: relative;
  padding: 6rem 2rem 8rem;
  max-width: 1100px;
  margin: 0 auto;
}

.section-heading {
  text-align: center;
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 3.5rem;
  letter-spacing: -0.02em;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}

/* ─── Feature Card ─── */
.feature-card {
  position: relative;
  padding: 2.5rem 2rem;
  border-radius: 20px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
  transform-style: preserve-3d;
}

a.feature-card {
  display: block;
  text-decoration: none;
  color: inherit;
}

.feature-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow:
    0 20px 40px -12px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.2);
}

:root.dark .feature-card:hover {
  box-shadow:
    0 20px 40px -12px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(139, 92, 246, 0.15);
}

.card-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1),
    rgba(139, 92, 246, 0.1)
  );
  margin-bottom: 1.5rem;
  font-size: 1.6rem;
}

.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 0.75rem;
}

.feature-card p {
  font-size: 0.92rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

/* Card shine effect on hover */
.card-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.06),
    transparent
  );
  transition: left 0.6s ease;
  pointer-events: none;
}

.feature-card:hover .card-shine {
  left: 100%;
}

/* ═══════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════ */
.home-footer {
  text-align: center;
  padding: 3rem 2rem;
  border-top: 1px solid var(--vp-c-divider);
}

.home-footer p {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}

/* ═══════════════════════════════════════
   ABOUT CARD (in features grid, spans 2 cols)
   ═══════════════════════════════════════ */
.about-card {
  grid-column: span 2;
  display: flex;
  gap: 1.6rem;
  align-items: center;
  padding: 2.2rem;
  border-radius: 20px;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.06),
    rgba(139, 92, 246, 0.06)
  );
  border: 1px solid var(--vp-c-divider);
  text-decoration: none;
  color: inherit;
  transition:
    border-color 0.3s,
    transform 0.3s,
    box-shadow 0.3s;
}

a.about-card:hover {
  border-color: rgba(139, 92, 246, 0.3);
  transform: translateY(-4px);
  box-shadow: 0 16px 36px -16px rgba(139, 92, 246, 0.4);
}

.about-more {
  display: inline-block;
  margin-top: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--c-purple);
  transition: transform 0.25s;
}

a.about-card:hover .about-more {
  transform: translateX(4px);
}

.about-avatar {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.12),
    rgba(139, 92, 246, 0.12)
  );
}

.about-name {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 0.6rem;
}
.about-text {
  font-size: 0.92rem;
  color: var(--vp-c-text-2);
  line-height: 1.8;
  margin: 0 0 1.1rem;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tech-tag {
  font-size: 0.78rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}

/* ═══════════════════════════════════════
   FOOTER (override base)
   ═══════════════════════════════════════ */
.home-footer {
  border-top: 1px solid var(--vp-c-divider);
}
.footer-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  padding: 2.5rem 2rem;
}
.footer-copy {
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
  margin: 0;
}
.footer-links {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
}
.footer-links a {
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s;
}
.footer-links a:hover {
  color: var(--c-purple);
}
.footer-sep {
  color: var(--vp-c-divider);
}
.footer-top {
  background: none;
  border: none;
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}
.footer-top:hover {
  color: var(--c-purple);
}

/* ═══════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════ */
@media (max-width: 960px) {
  .features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .about-card {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .hero {
    min-height: auto;
  }

  .hero-inner {
    grid-template-columns: 1fr;
    gap: 2rem;
    padding: 5rem 1.25rem 1rem;
    text-align: center;
  }

  .hero-text {
    text-align: center;
  }

  .hero-visual {
    order: 2;
  }

  .code-window {
    max-width: 100%;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .action-btn {
    width: 100%;
    max-width: 260px;
    justify-content: center;
  }

  .features-section {
    padding: 4rem 1.5rem 5rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .about-card {
    grid-column: auto;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .tech-tags {
    justify-content: center;
  }

  .parallax-orb {
    transform: scale(0.6);
  }

  .scroll-hint {
    bottom: 1.5rem;
  }
}

/* ═══════════════════════════════════════
   REDUCED MOTION
   ═══════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .parallax-orb {
    animation: none !important;
  }

  .scroll-line {
    animation: none !important;
  }

  .scroll-hint {
    animation: none !important;
  }
}
</style>
