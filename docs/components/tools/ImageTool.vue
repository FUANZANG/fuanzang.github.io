<script setup>
import { ref } from 'vue'
import { useTool } from '../useTool.js'

const { error, copy } = useTool()
const imgInput = ref(null)
const imgBase64 = ref('')
const imgPreview = ref('')

function pickImg() {
  imgInput.value && imgInput.value.click()
}
function handleFile(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = '请选择图片文件'
    return
  }
  error.value = ''
  const reader = new FileReader()
  reader.onload = () => {
    imgBase64.value = reader.result
    imgPreview.value = reader.result
  }
  reader.readAsDataURL(file)
}
function onImgPick(e) {
  handleFile(e.target.files[0])
  e.target.value = ''
}
function onImgDrop(e) {
  handleFile(e.dataTransfer.files[0])
}
</script>

<template>
  <div class="panel">
    <div
      class="img-drop"
      @click="pickImg"
      @dragover.prevent
      @drop.prevent="onImgDrop"
    >
      <input
        ref="imgInput"
        type="file"
        accept="image/*"
        hidden
        @change="onImgPick"
      />
      点击选择，或把图片拖拽到此处
    </div>
    <div v-if="imgPreview" class="img-prev">
      <img :src="imgPreview" alt="预览" />
    </div>
    <div class="io">
      <div class="io-col">
        <label class="io-label">
          Base64 结果
          <button v-if="imgBase64" class="copy-btn" @click="copy(imgBase64)">
            复制
          </button>
        </label>
        <textarea
          :value="imgBase64"
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
.img-drop {
  border: 1.5px dashed var(--vp-c-divider);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  color: var(--vp-c-text-2);
  cursor: pointer;
  margin-bottom: 1.2rem;
  transition: all 0.25s;
}
.img-drop:hover {
  border-color: var(--c-purple);
  color: var(--c-purple);
}
.img-prev {
  text-align: center;
  margin-bottom: 1.2rem;
}
.img-prev img {
  max-width: 100%;
  max-height: 240px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
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
