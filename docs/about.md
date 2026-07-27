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
  :title="`👋 ${about?.title || '关于我'}`"
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
      <li>折腾前端动画、可视化与工程化</li>
      <li>收集好用的小工具，做成纯前端在线版</li>
    </ul>
  </section>

  <section class="about-block">
    <h2>技术栈</h2>
    <div class="tech-tags">
      <span v-for="t in techStack" :key="t">{{ t }}</span>
    </div>
  </section>

  <section class="about-block">
    <h2>找到我</h2>
    <p>
      <a href="https://github.com/FUANZANG" target="_blank" rel="noopener"
        >GitHub ↗</a
      >
    </p>
  </section>

  <button class="back-btn" @click="router.go('/')">← 返回首页</button>
</PageShell>

<style>
.about-block {
  margin-bottom: 2rem;
}
.about-block h2 {
  font-size: 1.25rem;
  color: var(--vp-c-text-1);
  margin: 0 0 0.8rem;
  padding-left: 0.7rem;
  border-left: 3px solid var(--c-purple, #8b5cf6);
}
.about-block p {
  color: var(--vp-c-text-2);
  line-height: 1.8;
  margin: 0;
}
.about-block ul {
  color: var(--vp-c-text-2);
  line-height: 1.9;
  padding-left: 1.2rem;
  margin: 0;
}
.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tech-tags span {
  font-size: 0.82rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}
.back-btn {
  margin-top: 1rem;
  padding: 0.6rem 1.4rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.25s;
}
.back-btn:hover {
  border-color: var(--c-purple, #8b5cf6);
  color: var(--c-purple, #8b5cf6);
}
</style>
