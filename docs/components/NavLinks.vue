<script setup>
import { navCategories } from '../data/navLinks.js'
import PageShell from './PageShell.vue'
</script>

<template>
  <PageShell
    title="🧭 网站导航"
    subtitle="常用网站与工具速查"
    max-width="960px"
  >
    <section v-for="cat in navCategories" :key="cat.name" class="category">
      <h2 class="category-title">
        <span class="cat-icon">{{ cat.icon }}</span>
        {{ cat.name }}
      </h2>
      <div class="cards">
        <a
          v-for="link in cat.links"
          :key="link.url"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="card"
        >
          <div class="card-title">{{ link.title }}</div>
          <div class="card-desc">{{ link.desc }}</div>
        </a>
      </div>
    </section>
  </PageShell>
</template>

<style scoped>
.category {
  margin-bottom: 2rem;
}

.category-title {
  font-size: 1.1rem;
  margin-bottom: 0.8rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.cat-icon {
  font-size: 1.2rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.card {
  display: block;
  padding: 0.8rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  color: inherit;
  transition: all 0.25s;
}

.card:hover {
  border-color: var(--c-purple);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.1);
}

.dark .card:hover {
  box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.4);
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 0.2rem;
}

.card-desc {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  line-height: 1.4;
}

@media (max-width: 640px) {
  .cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
