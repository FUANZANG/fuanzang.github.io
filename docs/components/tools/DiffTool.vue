<script setup>
import { ref, computed } from 'vue'
import { useTool } from '../useTool.js'

const { error, copy } = useTool()
const diffOld = ref('')
const diffNew = ref('')
const diffIgnoreWs = ref(false)

function diffLines(oldStr, newStr, ignoreWs) {
  const a = oldStr.split(/\r\n|\r|\n/)
  const b = newStr.split(/\r\n|\r|\n/)
  const eq = (x, y) => (ignoreWs ? x.trim() === y.trim() : x === y)
  const n = a.length
  const m = b.length
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (eq(a[i], b[j])) dp[i][j] = dp[i + 1][j + 1] + 1
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const res = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (eq(a[i], b[j])) {
      res.push({ t: 'eq', text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      res.push({ t: 'del', text: a[i] })
      i++
    } else {
      res.push({ t: 'add', text: b[j] })
      j++
    }
  }
  while (i < n) res.push({ t: 'del', text: a[i++] })
  while (j < m) res.push({ t: 'add', text: b[j++] })
  return res
}

const result = computed(() => {
  if (!diffOld.value && !diffNew.value) return []
  return diffLines(diffOld.value, diffNew.value, diffIgnoreWs.value)
})

function swapDiff() {
  const tmp = diffOld.value
  diffOld.value = diffNew.value
  diffNew.value = tmp
}
function clearAll() {
  diffOld.value = ''
  diffNew.value = ''
}
</script>

<template>
  <div class="panel">
    <div class="mode-row">
      <label class="diff-opt">
        <input type="checkbox" v-model="diffIgnoreWs" /> 忽略空白
      </label>
      <div class="actions">
        <button class="text-btn" @click="swapDiff">⇄ 互换</button>
        <button class="text-btn" @click="clearAll">清空</button>
      </div>
    </div>
    <div class="io">
      <div class="io-col">
        <label class="io-label">原文本</label>
        <textarea
          v-model="diffOld"
          class="io-area"
          placeholder="粘贴原始内容…"
          spellcheck="false"
        />
      </div>
      <div class="io-col">
        <label class="io-label">新文本</label>
        <textarea
          v-model="diffNew"
          class="io-area"
          placeholder="粘贴修改后的内容…"
          spellcheck="false"
        />
      </div>
    </div>
    <div class="diff-out">
      <div
        v-for="(l, idx) in result"
        :key="idx"
        class="diff-line"
        :class="'d-' + l.t"
      >
        <span class="diff-sign">{{
          l.t === 'del' ? '−' : l.t === 'add' ? '+' : ' '
        }}</span>
        <span class="diff-text">{{ l.text === '' ? ' ' : l.text }}</span>
      </div>
      <p v-if="!result.length" class="diff-empty">
        在左右两侧输入文本后显示差异
      </p>
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
.mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.2rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
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
.diff-out {
  margin-top: 1.2rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  max-height: 380px;
  overflow: auto;
}
.diff-line {
  display: flex;
  gap: 0.5rem;
  padding: 0.1rem 0.8rem;
  white-space: pre-wrap;
  word-break: break-all;
}
.diff-line.d-del {
  background: rgba(239, 68, 68, 0.14);
  color: #f87171;
}
.diff-line.d-add {
  background: rgba(34, 197, 94, 0.14);
  color: #4ade80;
}
.diff-sign {
  flex-shrink: 0;
  opacity: 0.85;
  user-select: none;
}
.diff-empty {
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 1rem;
}
.diff-opt {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.diff-opt input {
  accent-color: var(--c-purple);
  cursor: pointer;
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
