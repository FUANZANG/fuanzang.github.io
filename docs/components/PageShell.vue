<script setup>
/**
 * 轻应用页统一壳：页头、色板、页宽与内边距。
 * 页头 emoji 与渐变文字拆开渲染，避免 background-clip 把 emoji 透明掉。
 */
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  maxWidth: { type: String, default: '880px' }
})

/** 拆出标题开头的 emoji，其余走渐变字 */
const titleParts = computed(() => {
  const m = props.title.match(
    /^((?:\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)+)\s*(.*)$/u
  )
  if (!m) return { emoji: '', text: props.title }
  return { emoji: m[1], text: m[2] || '' }
})
</script>

<template>
  <div class="page-shell" :style="{ maxWidth }">
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
  --c-blue: #3b82f6;
  --c-purple: #8b5cf6;
  --c-pink: #ec4899;
  --c-cyan: #06b6d4;
  margin: 0 auto;
  padding: 1rem 1.5rem 2rem;
}

.page-header {
  text-align: center;
  margin-bottom: 1.5rem;
  padding: 1rem 0 0.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
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
  background: linear-gradient(
    135deg,
    var(--c-blue),
    var(--c-purple),
    var(--c-pink)
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  margin: 0;
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
</style>
