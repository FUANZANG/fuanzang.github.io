<script setup>
import { ref, computed } from 'vue'
import { renderMarkdown } from '../markdownLite.js'

const sample = `# 标题

一段 **加粗** 和 *斜体*，以及 \`行内代码\`。

- 列表一
- 列表二

\`\`\`
const n = 1
\`\`\`

[链接](https://vitepress.dev)`

const input = ref(sample)
const html = computed(() => renderMarkdown(input.value))
</script>

<template>
  <div class="panel">
    <div class="io">
      <div class="io-col">
        <label class="io-label">Markdown</label>
        <textarea v-model="input" class="io-area" spellcheck="false" />
      </div>
      <div class="io-col">
        <label class="io-label">预览</label>
        <div class="preview" v-html="html" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  padding: 1.4rem 1.6rem;
}
.io {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
}
.io-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.io-label {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.5rem;
}
.io-area,
.preview {
  width: 100%;
  min-height: 320px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.io-area {
  resize: vertical;
  padding: 0.9rem 1rem;
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  line-height: 1.6;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  outline: none;
}
.preview {
  padding: 0.4rem 1rem 1rem;
  overflow: auto;
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
  line-height: 1.7;
}
.preview :deep(h1),
.preview :deep(h2),
.preview :deep(h3) {
  margin: 0.8rem 0 0.4rem;
  line-height: 1.3;
}
.preview :deep(p) {
  margin: 0.4rem 0;
}
.preview :deep(code) {
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: var(--vp-c-bg);
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 0.86em;
}
.preview :deep(pre) {
  padding: 0.8rem 1rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  overflow: auto;
}
.preview :deep(pre code) {
  padding: 0;
  background: none;
}
.preview :deep(a) {
  color: var(--c-purple);
}
@media (max-width: 640px) {
  .io {
    grid-template-columns: 1fr;
  }
}
</style>
