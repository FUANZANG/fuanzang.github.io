---
title: 关于我
layout: page
---

<script setup>
import { useRouter } from 'vitepress'
import PageShell from './components/PageShell.vue'
import { siteSections } from './data/siteSections.js'
import { profileTagline, techStack } from './data/profile.js'

const router = useRouter()
const about = siteSections.find((s) => s.id === 'about')
</script>

<PageShell
  :title="about?.title || '关于我'"
  :subtitle="profileTagline"
  max-width="720px"
>
  <section class="about-block">
    <h2>我是谁</h2>
    <p>{{ about?.description }}</p>
  </section>

  <section class="about-block">
    <h2>在做什么</h2>
    <ul>
      <li>维护这套个人知识库与博客</li>
      <li>折腾工程化、可视化，偶尔碰碰 AI / Agent</li>
      <li>收集好用的小工具，做成纯前端在线版</li>
      <li>不知道吃什么时，往菜谱手帐里记一道</li>
    </ul>
  </section>

  <section class="about-block">
    <h2>技术栈</h2>
    <ul class="tech-list">
      <li v-for="t in techStack" :key="t">{{ t }}</li>
    </ul>
  </section>

  <section class="about-block">
    <h2>找到我</h2>
    <p>
      <a
        class="about-link"
        href="https://github.com/FUANZANG"
        target="_blank"
        rel="noopener"
        >GitHub ↗</a
      >
    </p>
  </section>

  <button class="back-btn" type="button" @click="router.go('/')">
    ← 返回首页
  </button>
</PageShell>

<style scoped>
.about-block {
  margin-bottom: 1.75rem;
  padding-bottom: 1.35rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.about-block:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}
.about-block h2 {
  font-family: var(--font-display, inherit);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
  margin: 0 0 0.65rem;
  padding: 0;
  border: none;
}
.about-block p {
  color: var(--vp-c-text-2);
  line-height: 1.8;
  margin: 0;
}
.about-block ul {
  color: var(--vp-c-text-2);
  line-height: 1.9;
  padding-left: 1.15rem;
  margin: 0;
}
.tech-list {
  list-style: none;
  padding: 0 !important;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1.1rem;
}
.tech-list li {
  font-size: 0.88rem;
  color: var(--vp-c-text-2);
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 0.1rem;
}
.about-link {
  color: var(--vp-c-text-1);
  font-weight: 600;
  text-decoration: none;
  border-bottom: 1px solid var(--c-ink, var(--vp-c-brand-1));
}
.about-link:hover {
  opacity: 0.75;
}
.back-btn {
  margin-top: 0.5rem;
  padding: 0.45rem 0;
  border: none;
  border-bottom: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.9rem;
}
.back-btn:hover {
  color: var(--vp-c-text-1);
  border-bottom-color: var(--c-ink, var(--vp-c-brand-1));
}
</style>
