<script setup>
import { ref, computed } from 'vue'
import { useTool } from '../useTool.js'

const MATCH_LIMIT = 10000

const { error, copy } = useTool()
const mode = ref('match')
const pattern = ref('')
const flags = ref('g')
const replacement = ref('')
const regexText = ref('')

function compile(source, flagStr, forceGlobal) {
  const next = forceGlobal && !flagStr.includes('g') ? flagStr + 'g' : flagStr
  return new RegExp(source, next)
}

function listMatches(text, re) {
  const out = []
  let match
  while ((match = re.exec(text)) !== null) {
    out.push(match)
    if (match.index === re.lastIndex) re.lastIndex++
    if (out.length >= MATCH_LIMIT) break
  }
  return out
}

function formatGroups(match) {
  const lines = match
    .slice(1)
    .map((group, index) => `   $${index + 1}: ${group ?? ''}`)
  if (match.groups) {
    for (const [name, value] of Object.entries(match.groups)) {
      lines.push(`   $${name}: ${value ?? ''}`)
    }
  }
  return lines
}

function formatMatches(matches) {
  return matches
    .map((match, index) => {
      const head = `${index + 1}. [${match.index}]  ${match[0]}`
      const groups = formatGroups(match)
      return groups.length ? head + '\n' + groups.join('\n') : head
    })
    .join('\n')
}

const analysis = computed(() => {
  error.value = ''
  if (!pattern.value || !regexText.value) return { matches: [], replaced: '' }
  try {
    const matches = listMatches(regexText.value, compile(pattern.value, flags.value, true))
    const replaced =
      mode.value === 'replace'
        ? regexText.value.replace(compile(pattern.value, flags.value, false), replacement.value)
        : ''
    return { matches, replaced }
  } catch (e) {
    error.value = '正则无效：' + (e && e.message ? e.message : e)
    return { matches: [], replaced: '' }
  }
})

const matches = computed(() => analysis.value.matches)
const outText = computed(() =>
  mode.value === 'replace' ? analysis.value.replaced : formatMatches(matches.value)
)
</script>

<template>
  <div class="panel">
    <div class="mode-row">
      <button
        type="button"
        class="text-btn"
        :class="{ on: mode === 'match' }"
        @click="mode = 'match'"
      >
        匹配
      </button>
      <button
        type="button"
        class="text-btn"
        :class="{ on: mode === 'replace' }"
        @click="mode = 'replace'"
      >
        替换
      </button>
    </div>
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
    <input
      v-if="mode === 'replace'"
      v-model="replacement"
      class="replace-input"
      placeholder="替换为…（$1 为捕获组；flags 含 g 则全部替换，留空即删除匹配）"
      spellcheck="false"
    />
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
          {{ mode === 'replace' ? '替换结果' : '匹配结果' }}（{{ matches.length }} 处）
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
.mode-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
}
.text-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.82rem;
}
.text-btn.on {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, var(--c-blue), var(--c-purple));
}
.replace-input {
  width: 100%;
  margin: -0.4rem 0 1rem;
  padding: 0.55rem 0.8rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  outline: none;
}
.replace-input:focus {
  border-color: var(--c-brand-1);
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
