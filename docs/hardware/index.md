---
title: 硬件杂谈
layout: page
---

<script setup>
import PageShell from '../components/PageShell.vue'
import NotesIndex from '../.vitepress/theme/NotesIndex.vue'
</script>

<PageShell
  title="硬件杂谈"
  subtitle="芯片、接口、无线、充电——零散但实用的硬件知识"
  max-width="820px"
>
  <NotesIndex sidebar-key="/hardware/" unit="篇" />

  <section class="hw-refs">
    <h2 class="refs-title">参考</h2>
    <ul class="refs-list">
      <li>
        <a href="https://www.anandtech.com/" target="_blank" rel="noopener"
          >AnandTech</a
        >
        <span class="refs-desc">深度芯片评测</span>
      </li>
      <li>
        <a href="https://www.chiphell.com/" target="_blank" rel="noopener"
          >Chiphell</a
        >
        <span class="refs-desc">中文硬件社区</span>
      </li>
      <li>
        <a
          href="https://www.usb.org/documents"
          target="_blank"
          rel="noopener"
          >USB-IF 官方规范</a
        >
        <span class="refs-desc">USB 标准文档</span>
      </li>
    </ul>
  </section>
</PageShell>

<style>
.hw-refs {
  margin-top: 0.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--vp-c-divider);
}
.refs-title {
  font-family: var(--font-display, inherit);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 0.55rem;
  color: var(--vp-c-text-1);
}
.refs-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.refs-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.55rem 1rem;
  padding: 0.65rem 0.1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.refs-list a {
  color: var(--vp-c-text-1);
  font-weight: 600;
  text-decoration: none;
  border-bottom: 1px solid transparent;
}
.refs-list a:hover {
  border-bottom-color: var(--c-ink, var(--vp-c-brand-1));
}
.refs-desc {
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
}
</style>
