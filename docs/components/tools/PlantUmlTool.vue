<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import pako from 'pako'
import { useTool } from '../useTool.js'

const { copy } = useTool()

// PlantUML 服务端压缩编码：raw deflate + 其专用 6-bit Base64 字母表
const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'

function encode6bit(b) {
  return ALPHABET.charAt(b & 0x3f)
}
function append3bytes(b1, b2, b3) {
  const c1 = b1 >> 2
  const c2 = ((b1 & 0x03) << 4) | (b2 >> 4)
  const c3 = ((b2 & 0x0f) << 2) | (b3 >> 6)
  const c4 = b3 & 0x3f
  return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4)
}
function encode64(data) {
  let r = ''
  for (let i = 0; i < data.length; i += 3) {
    const b1 = data[i]
    const b2 = i + 1 < data.length ? data[i + 1] : 0
    const b3 = i + 2 < data.length ? data[i + 2] : 0
    r += append3bytes(b1, b2, b3)
  }
  return r
}
function plantUmlEncode(text) {
  const bytes = new TextEncoder().encode(text)
  const deflated = pako.deflateRaw(bytes)
  return encode64(deflated)
}

const sample = `@startuml
title 示例时序图
actor 用户
participant 前端
participant 后端
用户 -> 前端: 点击按钮
前端 -> 后端: 请求数据
后端 --> 前端: 返回 JSON
前端 --> 用户: 渲染页面
@enduml`

const input = ref(sample)
const server = ref('https://www.plantuml.com/plantuml')
const format = ref('svg')
const imgUrl = ref('')
const status = ref('idle') // idle | loading | ok | error
const error = ref('')

let timer = null
function build() {
  error.value = ''
  const src = input.value.trim()
  if (!src) {
    imgUrl.value = ''
    status.value = 'idle'
    return
  }
  try {
    const enc = plantUmlEncode(src)
    imgUrl.value = `${server.value.replace(/\/+$/, '')}/${format.value}/${enc}`
    status.value = 'loading'
  } catch (e) {
    error.value = '编码失败：' + (e && e.message ? e.message : e)
    status.value = 'error'
  }
}
function schedule() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(build, 300)
}

watch([input, server, format], schedule, { immediate: true })
onBeforeUnmount(() => timer && clearTimeout(timer))

function onImgLoad() {
  status.value = 'ok'
}
function onImgError() {
  status.value = 'error'
  error.value = '渲染失败：请检查服务器地址或 diagram 语法是否正确'
}
function clearAll() {
  input.value = ''
  error.value = ''
  status.value = 'idle'
  imgUrl.value = ''
}
function loadSample() {
  input.value = sample
}
</script>

<template>
  <div class="panel">
    <div class="mode-row">
      <input
        v-model="server"
        class="server-input"
        placeholder="PlantUML 服务器地址"
        spellcheck="false"
      />
      <select v-model="format" class="style-select">
        <option value="svg">SVG</option>
        <option value="png">PNG</option>
      </select>
      <div class="actions">
        <button class="text-btn" @click="loadSample">示例</button>
        <button class="text-btn" @click="clearAll">清空</button>
        <button class="text-btn" :disabled="!imgUrl" @click="copy(imgUrl)">
          复制链接
        </button>
      </div>
    </div>

    <p class="hint">
      预览需将图源发送至上方服务器渲染（可自托管 PlantUML，或改用
      <code>https://kroki.io</code> 等兼容服务）。
    </p>

    <div class="io">
      <div class="io-col">
        <label class="io-label"
          >源码<span class="count">{{ input.length }} 字符</span></label
        >
        <textarea
          v-model="input"
          class="io-area"
          spellcheck="false"
          placeholder="粘贴 @startuml ... @enduml"
        />
      </div>
      <div class="io-col">
        <label class="io-label">预览</label>
        <div class="preview">
          <img
            v-if="imgUrl && status !== 'error'"
            :src="imgUrl"
            :class="{ loading: status === 'loading' }"
            @load="onImgLoad"
            @error="onImgError"
            alt="PlantUML 预览"
          />
          <div v-else class="placeholder">
            {{ status === 'error' ? '渲染失败' : '暂无内容' }}
          </div>
        </div>
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
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.8rem;
}
.server-input {
  flex: 1;
  min-width: 200px;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 0.86rem;
  outline: none;
}
.server-input:focus {
  border-color: var(--c-brand-1);
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
.text-btn:hover:not(:disabled) {
  color: var(--vp-c-text-1);
  border-color: var(--c-purple);
}
.text-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.hint {
  margin: 0 0 1rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  line-height: 1.5;
}
.hint code {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  background: var(--vp-c-bg-soft);
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
}
.io {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
}
.io-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.io-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.5rem;
}
.io-label .count {
  font-size: 0.74rem;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}
.io-area {
  width: 100%;
  min-height: 320px;
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
.preview {
  flex: 1;
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  overflow: auto;
}
.preview img {
  max-width: 100%;
  max-height: 100%;
}
.preview img.loading {
  opacity: 0.4;
}
.placeholder {
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
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
