<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { useTool } from '../useTool.js'

const { error, copy } = useTool()
const pwLen = ref(15)
const pwOpts = reactive({
  lower: true,
  upper: true,
  digit: true,
  symbol: true,
  noSimilar: false
})
const password = ref('')

function genPassword() {
  let pool = ''
  if (pwOpts.lower) pool += 'abcdefghijklmnopqrstuvwxyz'
  if (pwOpts.upper) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (pwOpts.digit) pool += '0123456789'
  if (pwOpts.symbol) pool += '!@#$%^&*()-_=+[]{};:,.<>?'
  if (pwOpts.noSimilar) pool = pool.replace(/[il1Lo0O]/g, '')
  if (!pool) {
    error.value = '请至少选择一种字符类型'
    password.value = ''
    return
  }
  error.value = ''
  const arr = new Uint32Array(pwLen.value)
  crypto.getRandomValues(arr)
  let res = ''
  for (let i = 0; i < pwLen.value; i++) res += pool[arr[i] % pool.length]
  password.value = res
}

watch([pwLen, pwOpts], () => genPassword(), { deep: true })
onMounted(genPassword)
</script>

<template>
  <div class="panel">
    <div class="pw-opts">
      <label class="pw-len">
        长度 <strong>{{ pwLen }}</strong>
        <input type="range" min="4" max="64" v-model.number="pwLen" />
      </label>
      <div class="pw-checks">
        <label><input type="checkbox" v-model="pwOpts.lower" /> 小写</label>
        <label><input type="checkbox" v-model="pwOpts.upper" /> 大写</label>
        <label><input type="checkbox" v-model="pwOpts.digit" /> 数字</label>
        <label><input type="checkbox" v-model="pwOpts.symbol" /> 符号</label>
        <label
          ><input type="checkbox" v-model="pwOpts.noSimilar" />
          排除易混字符</label
        >
      </div>
      <button class="gen-btn" @click="genPassword">重新生成</button>
    </div>
    <div class="io">
      <div class="io-col">
        <label class="io-label">
          生成结果
          <button v-if="password" class="copy-btn" @click="copy(password)">
            复制
          </button>
        </label>
        <textarea
          :value="password"
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
.pw-opts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: 1.2rem;
}
.pw-len {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
}
.pw-len input {
  width: 140px;
}
.pw-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}
.pw-checks label {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
}
.gen-btn {
  padding: 0.45rem 1.1rem;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, var(--c-blue), var(--c-purple));
  color: #fff;
  cursor: pointer;
  font-size: 0.85rem;
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
.err {
  margin-top: 1rem;
  color: #dc2626;
  font-size: 0.85rem;
}
</style>
