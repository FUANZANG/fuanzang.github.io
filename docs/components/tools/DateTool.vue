<script setup>
import { ref, computed } from 'vue'
import { useTool } from '../useTool.js'

const { error, copy } = useTool()
const dateStart = ref('')
const dateEnd = ref('')

function todayStr() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

const result = computed(() => {
  error.value = ''
  if (!dateStart.value && !dateEnd.value) return ''
  const a = dateStart.value ? new Date(dateStart.value) : new Date()
  const b = dateEnd.value ? new Date(dateEnd.value) : new Date()
  const diff = b - a
  if (isNaN(diff)) {
    error.value = '日期无效'
    return ''
  }
  const abs = Math.abs(diff)
  const days = Math.floor(abs / 86400000)
  const hours = Math.floor((abs % 86400000) / 3600000)
  const mins = Math.floor((abs % 3600000) / 60000)
  return `相差 ${days} 天 ${hours} 小时 ${mins} 分${diff < 0 ? '（结束早于开始）' : ''}`
})
</script>

<template>
  <div class="panel">
    <div class="date-row">
      <label>开始<input type="date" v-model="dateStart" /></label>
      <span class="arrow">→</span>
      <label>结束<input type="date" v-model="dateEnd" /></label>
      <button class="text-btn" @click="dateEnd = todayStr()">
        结束设为今天
      </button>
      <button class="text-btn" @click="dateStart = ''; dateEnd = ''">清空</button>
    </div>
    <div class="io">
      <div class="io-col">
        <label class="io-label">结果</label>
        <textarea
          :value="result"
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
.date-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.2rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
}
.date-row label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.date-row input[type='date'] {
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  outline: none;
}
.date-row .arrow {
  color: var(--vp-c-text-2);
}
.text-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.82rem;
  transition: all 0.2s;
}
.text-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--c-purple);
}
.io {
  display: grid;
  grid-template-columns: 1fr;
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
.err {
  margin-top: 1rem;
  color: #dc2626;
  font-size: 0.85rem;
}
</style>
