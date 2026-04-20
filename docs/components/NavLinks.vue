<script setup>
import { navCategories } from '../data/navLinks.js'
</script>

<template>
  <div class="nav-page">
    <header class="page-header">
      <h1>网站导航</h1>
      <p class="subtitle">常用网站与工具速查</p>
    </header>

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
  </div>
</template>

<style scoped>
.nav-page {
  --c-blue: #3b82f6;
  --c-purple: #8b5cf6;
  --c-pink: #ec4899;
  max-width: 960px;
  margin: 0 auto;
  padding: 1rem 1.5rem 2rem;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
  padding: 1rem 0 0.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
  margin-bottom: 0.6rem;
  background: linear-gradient(135deg, var(--c-blue), var(--c-purple), var(--c-pink));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
}

.subtitle::after {
  content: '';
  display: block;
  width: 40px;
  height: 3px;
  margin: 0.3rem auto 0;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--c-blue), var(--c-purple));
}

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
