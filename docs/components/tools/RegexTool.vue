<script setup>
import { ref, computed } from 'vue'
import { useTool } from '../useTool.js'

const { error, copy } = useTool()
const pattern = ref('')
const flags = ref('g')
const regexText = ref('')

const matches = computed(() => {
  error.value = ''
  if (!pattern.value || !regexText.value) return []
  let re
  try {
    re = new RegExp(
      pattern.value,
      flags.value.includes('g') ? flags.value : flags.value + 'g'
    )
  } catch (e) {
    error.value = '正则无效：' + (e && e.message ? e.message : e)
    return []
  }
  const out = []
  let m
  let guard = 0
  while ((m = re.exec(regexText.value)) !== null) {
    out.push({ index: m.index, text: m[0] })
    if (m.index === re.lastIndex) re.lastIndex++
    if (++guard > 10000) break
  }
  return out
})

const outText = computed(() =>
  matches.value.length
    ? matches.value
        .map((x, i) => `${i + 1}. [${x.index}]  ${x.text}`)
        .join('\n')
    : ''
)
</script>

<template>
  <div class="panel">
    <div class="regex-row">
      <span class="slash">/</span>
      <input
        v-model="pattern"
        class="regex-pattern"
        placeholder="输入正则，如：\d+"
        spellcheck="false"
      />
      <span class="slash">/</span>
      <input
        v-model="flags"
        class="regex-flags"
        placeholder="g"
        spellcheck="false"
      />
    </div>
    <div class="io">
      <div class="io-col">
        <label class="io-label">测试文本</label>
        <textarea
          v-model="regexText"
          class="io-area"
          placeholder="粘贴待匹配的文本…"
          spellcheck="false"
        />
      </div>
      <div class="io-col">
        <label class="io-label">
          匹配结果（{{ matches.length }} 处）
          <button v-if="outText" class="copy-btn" @click="copy(outText)">
            复制
          </button>
        </label>
        <textarea
          :value="outText"
          class="io-area out"
          readonly
          spellcheck="false"
        />
      </div>
    </div>
    <p v-if="error" class="err">{{ error }}</p>
  </div>
</template>

<style scoped>
.panel {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  padding: 1.4rem 1.6rem;
}
.regex-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 1.2rem;
  padding: 0.5rem 0.8rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}
.regex-row .slash {
  color: var(--c-purple);
  font-size: 1.1rem;
}
.regex-pattern {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
  outline: none;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
}
.regex-flags {
  width: 56px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  outline: none;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
}
.io {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
}
.io-col {
  display: flex;
  flex-direction: column;
}
.io-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.5rem;
}
.copy-btn {
  border: none;
  background: none;
  color: var(--c-purple);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0;
}
.io-area {
  width: 100%;
  min-height: 200px;
  resize: vertical;
  padding: 0.9rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  line-height: 1.6;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  outline: none;
}
.io-area:focus {
  border-color: var(--c-brand-1);
}
.io-area.out {
  background: var(--vp-c-bg-soft);
}
.err {
  margin-top: 1rem;
  color: #dc2626;
  font-size: 0.85rem;
}
@media (max-width: 640px) {
  .io {
    grid-template-columns: 1fr;
  }
}
</style>
