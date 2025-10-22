<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useTool } from '../useTool.js'
import {
  runTransform,
  simpleMeta,
  placeholderMap,
  colorPreview
} from '../transforms.js'

const props = defineProps({ id: { type: String, required: true } })

const { error, copy } = useTool()

const input = ref('')
const mode = ref('encode')
const caseStyle = ref('camel')
const hashAlgo = ref('SHA-256')
const fromBase = ref(10)
const toBase = ref(16)
const lineOpts = reactive({
  dedupe: false,
  sort: false,
  trim: false,
  dropEmpty: false
})
const preview = ref('')
const hashOut = ref('')

const meta = computed(() => simpleMeta[props.id] || {})
const hasMode = computed(() => !!meta.value.mode)
const modeLabels = computed(() => meta.value.modeLabels || ['编码', '解码'])
const placeholder = computed(() => placeholderMap[props.id] || '')

const syncOut = computed(() => {
  error.value = ''
  preview.value = ''
  if (!input.value) return ''
  try {
    if (props.id === 'color') preview.value = colorPreview(input.value)
    return runTransform(props.id, input.value, {
      mode: mode.value,
      caseStyle: caseStyle.value,
      fromBase: fromBase.value,
      toBase: toBase.value,
      lineOpts
    })
  } catch (e) {
    error.value = '转换失败：' + (e && e.message ? e.message : e)
    return ''
  }
})

// 哈希为异步（Web Crypto），单独处理
watch(
  [() => props.id, input, hashAlgo],
  async () => {
    if (props.id !== 'hash') {
      hashOut.value = ''
      return
    }
    if (!input.value) {
      hashOut.value = ''
      error.value = ''
      return
    }
    error.value = ''
    try {
      if (!crypto || !crypto.subtle)
        throw new Error('当前环境不支持 Web Crypto')
      const data = new TextEncoder().encode(input.value)
      const buf = await crypto.subtle.digest(hashAlgo.value, data)
      hashOut.value = Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    } catch (e) {
      error.value = '计算失败：' + (e && e.message ? e.message : e)
      hashOut.value = ''
    }
  },
  { immediate: true }
)

const result = computed(() =>
  props.id === 'hash' ? hashOut.value : syncOut.value
)

function swap() {
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
}
function clearAll() {
  input.value = ''
  error.value = ''
  lineOpts.dedupe = lineOpts.sort = lineOpts.trim = lineOpts.dropEmpty = false
}
</script>

<template>
  <div class="panel">
    <div class="mode-row">
      <select
        v-if="meta.control === 'case'"
        v-model="caseStyle"
        class="style-select"
      >
        <option value="camel">camelCase</option>
        <option value="pascal">PascalCase</option>
        <option value="snake">snake_case</option>
        <option value="kebab">kebab-case</option>
        <option value="constant">CONSTANT_CASE</option>
      </select>
      <select
        v-else-if="meta.control === 'hash'"
        v-model="hashAlgo"
        class="style-select"
      >
        <option value="SHA-1">SHA-1</option>
        <option value="SHA-256">SHA-256</option>
        <option value="SHA-384">SHA-384</option>
        <option value="SHA-512">SHA-512</option>
      </select>
      <div v-else-if="meta.control === 'base'" class="base-selects">
        <select v-model.number="fromBase" class="style-select">
          <option :value="2">2 进制</option>
          <option :value="8">8 进制</option>
          <option :value="10">10 进制</option>
          <option :value="16">16 进制</option>
        </select>
        <span class="arrow">→</span>
        <select v-model.number="toBase" class="style-select">
          <option :value="2">2 进制</option>
          <option :value="8">8 进制</option>
          <option :value="10">10 进制</option>
          <option :value="16">16 进制</option>
        </select>
      </div>
      <div v-else-if="meta.control === 'lines'" class="line-opts">
        <label><input type="checkbox" v-model="lineOpts.dedupe" /> 去重</label>
        <label><input type="checkbox" v-model="lineOpts.sort" /> 排序</label>
        <label
          ><input type="checkbox" v-model="lineOpts.trim" /> 去首尾空白</label
        >
        <label
          ><input type="checkbox" v-model="lineOpts.dropEmpty" /> 去空行</label
        >
      </div>
      <div v-else-if="hasMode" class="seg">
        <button :class="{ on: mode === 'encode' }" @click="mode = 'encode'">
          {{ modeLabels[0] }}
        </button>
        <button :class="{ on: mode === 'decode' }" @click="mode = 'decode'">
          {{ modeLabels[1] }}
        </button>
      </div>
      <div class="actions">
        <button v-if="hasMode" class="text-btn" @click="swap">⇄ 互换</button>
        <button class="text-btn" @click="clearAll">清空</button>
      </div>
    </div>

    <div class="io">
      <div class="io-col">
        <label class="io-label">输入</label>
        <textarea
          v-model="input"
          class="io-area"
          :placeholder="placeholder"
          spellcheck="false"
        />
      </div>
      <div class="io-col">
        <label class="io-label">
          输出
          <span
            v-if="id === 'color' && preview"
            class="swatch"
            :style="{ background: preview }"
          />
          <button v-if="result" class="copy-btn" @click="copy(result)">
            复制
          </button>
        </label>
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
.mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.2rem;
  flex-wrap: wrap;
  gap: 0.8rem;
}
.seg {
  display: inline-flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
}
.seg button {
  padding: 0.45rem 1.2rem;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.88rem;
  transition: all 0.2s;
}
.seg button.on {
  background: var(--vp-c-brand-1);
  color: #fff;
}
.style-select {
  padding: 0.5rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.88rem;
  cursor: pointer;
  outline: none;
}
.base-selects {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}
.base-selects .arrow {
  color: var(--vp-c-text-2);
}
.line-opts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  font-size: 0.86rem;
  color: var(--vp-c-text-2);
}
.line-opts label {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
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
  transition: border-color 0.2s;
}
.io-area:focus {
  border-color: var(--c-brand-1);
}
.io-area.out {
  background: var(--vp-c-bg-soft);
}
.swatch {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  display: inline-block;
  vertical-align: middle;
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
