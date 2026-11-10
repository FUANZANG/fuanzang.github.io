<script setup>
/**
 * 网站导航：手帐式书签列表（去卡片网格）。
 */
import { navCategories } from '../data/navLinks.js'
import PageShell from './PageShell.vue'
</script>

<template>
  <PageShell
    title="网站导航"
    subtitle="常用网站与工具速查"
    max-width="820px"
  >
    <section v-for="cat in navCategories" :key="cat.name" class="category">
      <h2 class="category-title">{{ cat.name }}</h2>
      <ul class="link-list">
        <li v-for="link in cat.links" :key="link.url">
          <a
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="link-row"
          >
            <span class="link-title">{{ link.title }}</span>
            <span class="link-desc">{{ link.desc }}</span>
          </a>
        </li>
      </ul>
    </section>
  </PageShell>
</template>

<style scoped>
.category {
  margin-bottom: 1.75rem;
  min-width: 0;
}

.category-title {
  font-family: var(--font-display, inherit);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 0.35rem;
  padding-bottom: 0.45rem;
  border-bottom: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.link-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.link-row {
  display: grid;
  grid-template-columns: minmax(0, 9.5rem) minmax(0, 1fr);
  gap: 0.75rem 1.25rem;
  align-items: baseline;
  padding: 0.7rem 0.15rem;
  border-bottom: 1px solid var(--vp-c-divider);
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
  min-width: 0;
}

.link-row:hover {
  background: rgba(20, 20, 20, 0.02);
}

.link-row:hover .link-title {
  border-bottom-color: var(--c-ink, var(--vp-c-brand-1));
}

.link-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s;
  overflow-wrap: anywhere;
}

.link-desc {
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
  line-height: 1.45;
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .link-row {
    grid-template-columns: 1fr;
    gap: 0.2rem;
    padding: 0.75rem 0.1rem;
  }
}
</style>
