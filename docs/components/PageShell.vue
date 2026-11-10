<script setup>
/**
 * 轻应用页统一壳：页头、色板、页宽与内边距。
 * 页头 emoji 与正文拆开渲染；色板与全站单墨黑对齐。
 */
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  maxWidth: { type: String, default: '880px' },
  /** 满高模式：占满「视口 − 导航 − 页脚」，页面 body 不再滚动，仅内部区域滚动 */
  fill: { type: Boolean, default: false }
})

/** 拆出标题开头的 emoji，其余走标题字 */
const titleParts = computed(() => {
  const m = props.title.match(
    /^((?:\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)+)\s*(.*)$/u
  )
  if (!m) return { emoji: '', text: props.title }
  return { emoji: m[1], text: m[2] || '' }
})
</script>

<template>
  <div class="page-shell" :class="{ fill }" :style="{ maxWidth }">
    <header class="page-header">
      <h1>
        <span v-if="titleParts.emoji" class="title-emoji">{{ titleParts.emoji }}</span>
        <span v-if="titleParts.text" class="title-text">{{ titleParts.text }}</span>
      </h1>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </header>
    <div class="page-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.page-shell {
  --c-ink: var(--vp-c-text-1, #141414);
  --c-on-ink: var(--vp-c-bg, #fafafa);
  margin: 0 auto;
  padding: 1rem 1.5rem 2rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.page-body {
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
}

.page-header {
  text-align: center;
  margin-bottom: 1.5rem;
  padding: 1rem 0 0.5rem;
}

.page-header h1 {
  font-family: var(--font-display, inherit);
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0 0 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
}

.title-emoji {
  line-height: 1;
  flex-shrink: 0;
}

.title-text {
  color: var(--c-ink);
}

.subtitle {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
  overflow-wrap: anywhere;
}
@media (max-width: 860px) {
  .page-shell {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
  .page-header {
    margin-bottom: 1rem;
    padding-top: 0.4rem;
  }
  .subtitle {
    font-size: 0.86rem;
  }
}

.subtitle::after {
  content: '';
  display: block;
  width: 40px;
  height: 3px;
  margin: 0.3rem auto 0;
  border-radius: 2px;
  background: var(--c-ink);
}

/* 满高模式（仅桌面）：锁住高度，body 不滚动，内部区域各自滚动 */
@media (min-width: 861px) {
  .page-shell.fill {
    height: calc(100vh - var(--vp-nav-height, 64px) - var(--footer-h, 64px));
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .page-shell.fill .page-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
}
</style>
