<script setup>
import { computed } from 'vue'
import { useData } from 'vitepress'
import { VPLink } from 'vitepress/theme'

const { theme } = useData()

// 直接读取 themeConfig.sidebar['/notes/']，与导航分组保持一致，新增笔记自动同步
const groups = computed(() => {
  const sidebar = theme.value?.sidebar
  if (!sidebar || typeof sidebar !== 'object') return []
  const notesSidebar = sidebar['/notes/']
  if (!Array.isArray(notesSidebar)) return []

  return notesSidebar.map(group => {
    // 按链接去重，避免 config 中重复项（如 SQL 基础）在总览页重复出现
    const seen = new Set()
    const items = (group.items || []).filter(it => {
      if (!it || !it.link) return false
      if (seen.has(it.link)) return false
      seen.add(it.link)
      return true
    })
    return {
      text: group.text || '未分组',
      items
    }
  })
})

const total = computed(() =>
  groups.value.reduce((sum, g) => sum + g.items.length, 0)
)
</script>

<template>
  <div class="notes-index">
    <p v-if="total" class="notes-count">
      共 {{ groups.length }} 个分类 · {{ total }} 篇笔记
    </p>

    <section
      v-for="group in groups"
      :key="group.text"
      class="notes-group"
    >
      <h2 class="group-title">{{ group.text }}</h2>
      <div class="group-grid">
        <VPLink
          v-for="item in group.items"
          :key="item.link"
          class="note-card"
          :href="item.link"
        >
          {{ item.text }}
        </VPLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.notes-index {
  margin-top: 1.5rem;
}

.notes-count {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin-bottom: 2rem;
}

.notes-group {
  margin-bottom: 2.5rem;
}

.group-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 1.1rem;
  padding-left: 0.7rem;
  border-left: 3px solid transparent;
  border-image: linear-gradient(180deg, var(--c-blue, #3b82f6), var(--c-purple, #8b5cf6)) 1;
}

/* 分类标题上方留白收紧（默认 .vp-doc h2 padding-top 过大，显空） */
.notes-index :deep(.group-title) {
  padding-top: 8px;
}

.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.8rem;
}

.note-card {
  display: block;
  padding: 0.9rem 1.1rem;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  font-size: 0.92rem;
  font-weight: 500;
  text-decoration: none;
  transition:
    transform 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    color 0.25s ease;
}

.note-card:hover {
  transform: translateY(-3px);
  border-color: rgba(139, 92, 246, 0.35);
  color: var(--c-purple, #8b5cf6);
  box-shadow: 0 8px 20px -10px rgba(139, 92, 246, 0.4);
}

@media (max-width: 640px) {
  .group-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.6rem;
  }

  .note-card {
    padding: 0.8rem 0.9rem;
    font-size: 0.88rem;
  }
}
</style>
