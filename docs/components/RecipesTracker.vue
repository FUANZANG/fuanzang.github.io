<script setup>
import { ref, computed } from 'vue'
import recipes from '../data/recipes.json'

const searchQuery = ref('')
const selectedCategory = ref('全部')
const selectedTag = ref('全部')
const expandedId = ref(null)

const categories = computed(() => {
  const cats = new Set(recipes.map(r => r.category))
  return ['全部', ...Array.from(cats)]
})

const tags = computed(() => {
  const tagSet = new Set()
  recipes.forEach(r => r.tags.forEach(t => tagSet.add(t)))
  return ['全部', ...Array.from(tagSet)]
})

const filteredRecipes = computed(() => {
  return recipes.filter(recipe => {
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const matchName = recipe.name.toLowerCase().includes(q)
      const matchIngredients = recipe.ingredients.some(i =>
        i.name.toLowerCase().includes(q)
      )
      const matchTags = recipe.tags.some(t => t.includes(q))
      if (!matchName && !matchIngredients && !matchTags) return false
    }
    if (
      selectedCategory.value !== '全部' &&
      recipe.category !== selectedCategory.value
    )
      return false
    if (
      selectedTag.value !== '全部' &&
      !recipe.tags.includes(selectedTag.value)
    )
      return false
    return true
  })
})

const toggleExpand = name => {
  expandedId.value = expandedId.value === name ? null : name
}

const difficultyClass = d => {
  if (d === '简单') return 'easy'
  if (d === '中等') return 'medium'
  return 'hard'
}
</script>

<template>
  <div class="recipes-page">
    <header class="page-header">
      <h1>🍳 今天吃什么？</h1>
      <p class="subtitle">记录一些家常菜谱，不知道吃什么的时候翻翻看</p>
    </header>

    <section class="filters">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索菜名、食材..."
          class="search-input"
        />
      </div>
      <div class="filter-group">
        <label>分类：</label>
        <select v-model="selectedCategory" class="filter-select">
          <option v-for="cat in categories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <label>标签：</label>
        <select v-model="selectedTag" class="filter-select">
          <option v-for="tag in tags" :key="tag" :value="tag">{{ tag }}</option>
        </select>
      </div>
    </section>

    <section class="recipe-list">
      <div v-if="filteredRecipes.length === 0" class="empty-state">
        没有找到匹配的菜谱，换个关键词试试？
      </div>
      <div
        v-for="recipe in filteredRecipes"
        :key="recipe.name"
        class="recipe-card"
        :class="{ expanded: expandedId === recipe.name }"
      >
        <div class="card-header" @click="toggleExpand(recipe.name)">
          <div class="card-title-row">
            <h3 class="recipe-name">{{ recipe.name }}</h3>
            <span
              class="difficulty-badge"
              :class="difficultyClass(recipe.difficulty)"
              >{{ recipe.difficulty }}</span
            >
          </div>
          <div class="card-meta">
            <span class="meta-item">⏱ {{ recipe.time }}</span>
            <span class="meta-item">📂 {{ recipe.category }}</span>
          </div>
          <div class="card-tags">
            <span v-for="tag in recipe.tags" :key="tag" class="tag">{{
              tag
            }}</span>
          </div>
          <span class="expand-icon">{{
            expandedId === recipe.name ? '▲' : '▼'
          }}</span>
        </div>
        <div v-show="expandedId === recipe.name" class="card-body">
          <div class="section">
            <h4>🥬 食材</h4>
            <ul class="ingredient-list">
              <li v-for="ing in recipe.ingredients" :key="ing.name">
                <strong>{{ ing.name }}</strong> — {{ ing.amount }}
              </li>
            </ul>
          </div>
          <div class="section">
            <h4>🧂 调料</h4>
            <div class="seasonings">
              <span
                v-for="s in recipe.seasonings"
                :key="s"
                class="seasoning-tag"
                >{{ s }}</span
              >
            </div>
          </div>
          <div class="section">
            <h4>👨‍🍳 做法</h4>
            <ol class="steps-list">
              <li v-for="(step, index) in recipe.steps" :key="index">
                {{ step }}
              </li>
            </ol>
          </div>
          <div v-if="recipe.tips" class="section tips-section">
            <h4>💡 小贴士</h4>
            <p>{{ recipe.tips }}</p>
          </div>
        </div>
      </div>
    </section>

    <footer class="stats-footer">
      共收录 {{ recipes.length }} 道菜谱 · 筛选出
      {{ filteredRecipes.length }} 道
    </footer>
  </div>
</template>

<style scoped>
.recipes-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}
.page-header {
  text-align: center;
  margin-bottom: 2rem;
}
.page-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}
.subtitle {
  color: var(--vp-c-text-2);
  font-size: 1rem;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
}
.search-box {
  flex: 1;
  min-width: 200px;
}
.search-input {
  width: 100%;
  padding: 0.6rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus {
  border-color: var(--vp-c-brand-1);
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.filter-group label {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.filter-select {
  padding: 0.5rem 0.8rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
}
.recipe-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  margin-bottom: 1rem;
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.recipe-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.card-header {
  padding: 1rem 1.25rem;
  cursor: pointer;
  user-select: none;
}
.card-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.recipe-name {
  font-size: 1.15rem;
  margin: 0;
}
.difficulty-badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}
.difficulty-badge.easy {
  background: #dcfce7;
  color: #166534;
}
.difficulty-badge.medium {
  background: #fef3c7;
  color: #92400e;
}
.difficulty-badge.hard {
  background: #fee2e2;
  color: #991b1b;
}

:root.dark .difficulty-badge.easy {
  background: rgba(34, 197, 94, 0.16);
  color: #86efac;
}
:root.dark .difficulty-badge.medium {
  background: rgba(245, 158, 11, 0.16);
  color: #fcd34d;
}
:root.dark .difficulty-badge.hard {
  background: rgba(239, 68, 68, 0.16);
  color: #fca5a5;
}
.card-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}
.meta-item {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}
.card-tags {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.tag {
  font-size: 0.75rem;
  padding: 0.1rem 0.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  color: var(--vp-c-text-2);
}
.expand-icon {
  float: right;
  color: var(--vp-c-text-3);
  font-size: 0.8rem;
}
.card-body {
  padding: 0 1.25rem 1.25rem;
  border-top: 1px solid var(--vp-c-divider);
}
.section {
  margin-top: 1rem;
}
.section h4 {
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
  color: var(--vp-c-text-1);
}
.ingredient-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.4rem;
}
.ingredient-list li {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}
.seasonings {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.seasoning-tag {
  font-size: 0.8rem;
  padding: 0.15rem 0.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  color: var(--vp-c-text-2);
}
.steps-list {
  padding-left: 1.2rem;
  margin: 0;
}
.steps-list li {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  margin-bottom: 0.3rem;
}
.tips-section {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fffbeb;
  border-radius: 8px;
  border-left: 3px solid #f59e0b;
}
.tips-section p {
  font-size: 0.85rem;
  color: #92400e;
  margin: 0;
  line-height: 1.6;
}
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--vp-c-text-2);
}
.stats-footer {
  text-align: center;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}
</style>
