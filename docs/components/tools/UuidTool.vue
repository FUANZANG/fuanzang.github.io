<script setup>
import { ref, watch, onMounted } from 'vue'
import { useTool } from '../useTool.js'

const { error, copy } = useTool()
const uuidCount = ref(1)
const uuidList = ref('')

function genUuid() {
  if (!crypto || !crypto.randomUUID) {
    error.value = '当前环境不支持 crypto.randomUUID'
    uuidList.value = ''
    return
  }
  error.value = ''
  const arr = []
  for (let i = 0; i < uuidCount.value; i++) arr.push(crypto.randomUUID())
  uuidList.value = arr.join('\n')
}

watch(uuidCount, genUuid)
onMounted(genUuid)
</script>

<template>
  <div class="panel">
    <div class="pw-opts">
      <label class="pw-len">
        数量 <strong>{{ uuidCount }}</strong>
        <input type="range" min="1" max="20" v-model.number="uuidCount" />
      </label>
      <button class="gen-btn" @click="genUuid">重新生成</button>
    </div>
    <div class="io">
      <div class="io-col">
        <label class="io-label">
          生成结果
          <button v-if="uuidList" class="copy-btn" @click="copy(uuidList)">
            复制
          </button>
        </label>
        <textarea
          :value="uuidList"
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
