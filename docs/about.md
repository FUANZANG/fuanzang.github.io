---
title: 关于我
layout: page
---

<script setup>
import { useRouter } from 'vitepress'
const router = useRouter()
</script>

<div class="about-page">
  <div class="about-hero">
    <div class="about-avatar">🧑‍💻</div>
    <h1>关于我</h1>
    <p class="about-tag">前端工程师 · 爱折腾 · 偶尔下厨 🍳</p>
  </div>

  <section class="about-block">
    <h2>我是谁</h2>
    <p>一名喜欢折腾的前端工程师，平时写代码、记笔记，也研究怎么把复杂的工程做简单。这个站点用来沉淀学习笔记、分享技术思考，偶尔也放几道拿手菜谱。</p>
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
      <span>Vue</span>
      <span>React</span>
      <span>TypeScript</span>
      <span>JavaScript</span>
      <span>Vite</span>
      <span>Webpack</span>
      <span>Node.js</span>
      <span>GSAP</span>
      <span>ECharts</span>
      <span>VitePress</span>
      <span>Electron</span>
    </div>
  </section>

  <section class="about-block">
    <h2>找到我</h2>
    <p><a href="https://github.com/FUANZANG" target="_blank" rel="noopener">GitHub ↗</a></p>
  </section>

  <button class="back-btn" @click="router.go('/')">← 返回首页</button>
</div>

<style>
.about-page { max-width: 720px; margin: 0 auto; padding: 3rem 1.5rem 4rem; }
.about-hero { text-align: center; margin-bottom: 2.5rem; }
.about-avatar {
  width: 88px; height: 88px; margin: 0 auto 1rem;
  display: flex; align-items: center; justify-content: center;
  font-size: 2.6rem; border-radius: 24px;
  background: linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12));
}
.about-hero h1 { font-size: 2rem; margin: 0 0 0.4rem; color: var(--vp-c-text-1); }
.about-tag { color: var(--vp-c-text-2); margin: 0; }
.about-block { margin-bottom: 2rem; }
.about-block h2 {
  font-size: 1.25rem; color: var(--vp-c-text-1);
  margin: 0 0 0.8rem; padding-left: 0.7rem;
  border-left: 3px solid #8b5cf6;
}
.about-block p { color: var(--vp-c-text-2); line-height: 1.8; margin: 0; }
.about-block ul { color: var(--vp-c-text-2); line-height: 1.9; padding-left: 1.2rem; margin: 0; }
.tech-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.tech-tags span {
  font-size: 0.82rem; padding: 0.35rem 0.8rem; border-radius: 999px;
  background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); color: var(--vp-c-text-2);
}
.back-btn {
  margin-top: 1rem; padding: 0.6rem 1.4rem; border-radius: 10px;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1); cursor: pointer; font-size: 0.9rem; transition: all 0.25s;
}
.back-btn:hover { border-color: #8b5cf6; color: #8b5cf6; }
</style>
