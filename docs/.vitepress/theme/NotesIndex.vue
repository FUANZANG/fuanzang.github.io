<script setup>
/**
 * 栏目总览列表：从 themeConfig.sidebar 读分组，笔记 / 硬件等共用。
 */
import { computed } from 'vue'
import { useData } from 'vitepress'
import { VPLink } from 'vitepress/theme'

const props = defineProps({
  /** sidebar 键，如 '/notes/'、'/hardware/' */
  sidebarKey: { type: String, default: '/notes/' },
  /** 统计文案单位，如「篇笔记」「篇」 */
  unit: { type: String, default: '篇笔记' }
})

const { theme } = useData()

const groups = computed(() => {
  const sidebar = theme.value?.sidebar
  if (!sidebar || typeof sidebar !== 'object') return []
  const section = sidebar[props.sidebarKey]
  if (!Array.isArray(section)) return []

  return section
    .map((group) => {
      const seen = new Set()
      const items = (group.items || []).filter((it) => {
        if (!it || !it.link) return false
        // 跳过总览自链
        if (it.link === props.sidebarKey) return false
        if (seen.has(it.link)) return false
        seen.add(it.link)
        return true
      })
      return {
        text: group.text || '未分组',
        items
      }
    })
    .filter((group) => group.items.length > 0)
})

const total = computed(() =>
  groups.value.reduce((sum, g) => sum + g.items.length, 0)
)
</script>

<template>
  <div class="notes-index">
    <p v-if="total" class="notes-count">
      共 {{ groups.length }} 个分类 · {{ total }} {{ unit }}
    </p>

    <section
      v-for="group in groups"
      :key="group.text"
      class="notes-group"
    >
      <header class="group-head">
        <h2 class="group-title">{{ group.text }}</h2>
        <span class="group-meta">{{ group.items.length }}</span>
      </header>
      <ul class="group-list">
        <li v-for="item in group.items" :key="item.link">
          <VPLink class="note-link" :href="item.link">
            <span class="note-title">{{ item.text }}</span>
            <span class="note-arrow" aria-hidden="true">→</span>
          </VPLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.notes-index {
  margin-top: 0.25rem;
}

.notes-count {
  font-family: var(--font-ui, inherit);
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin: 0 0 2rem;
}

.notes-group {
  margin-bottom: 2.5rem;
}

.group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0 0.85rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.group-title {
  font-family: var(--font-display, inherit);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
  margin: 0;
  padding: 0;
  border: none;
}

.notes-index :deep(.group-title) {
  padding-top: 0;
  border-top: none;
}

.group-meta {
  font-family: var(--font-ui, inherit);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-3);
}

.group-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.15rem 1.5rem;
}

.note-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.15rem;
  color: var(--vp-c-text-1);
  text-decoration: none;
  border-radius: 2px;
  transition: color 0.18s ease;
}

.note-title {
  font-family: var(--font-reading, inherit);
  font-size: 0.98rem;
  line-height: 1.45;
}

.note-arrow {
  flex-shrink: 0;
  opacity: 0;
  transform: translateX(-4px);
  color: var(--c-ink, var(--vp-c-brand-1));
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.note-link:hover {
  color: var(--c-ink, var(--vp-c-brand-1));
}

.note-link:hover .note-arrow {
  opacity: 1;
  transform: none;
}

.note-link:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .group-list {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .note-arrow {
    opacity: 0.45;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .note-link,
  .note-arrow {
    transition: none;
  }
}
</style>
