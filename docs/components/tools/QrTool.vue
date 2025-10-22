<script setup>
import { ref, watch } from 'vue'
import QRCode from 'qrcode'
import { useTool } from '../useTool.js'

const { error, copy } = useTool()
const qrText = ref('')
const qrSize = ref(240)
const qrLevel = ref('M')
const qrDataUrl = ref('')

watch([qrText, qrSize, qrLevel], async () => {
  if (!qrText.value) {
    qrDataUrl.value = ''
    error.value = ''
    return
  }
  try {
    qrDataUrl.value = await QRCode.toDataURL(qrText.value, {
      margin: 1,
      width: qrSize.value,
      errorCorrectionLevel: qrLevel.value
    })
    error.value = ''
  } catch (e) {
    error.value = '生成失败：' + (e && e.message ? e.message : e)
    qrDataUrl.value = ''
  }
})
</script>

<template>
  <div class="panel">
    <div class="mode-row">
      <div class="base-selects">
        <span class="qr-label">尺寸</span>
        <select v-model.number="qrSize" class="style-select">
          <option :value="128">128</option>
          <option :value="160">160</option>
          <option :value="200">200</option>
          <option :value="240">240</option>
          <option :value="300">300</option>
        </select>
        <span class="qr-label">容错</span>
        <select v-model="qrLevel" class="style-select">
          <option value="L">L</option>
          <option value="M">M</option>
          <option value="Q">Q</option>
          <option value="H">H</option>
        </select>
      </div>
    </div>
    <div class="io">
      <div class="io-col">
        <label class="io-label">输入文本 / 链接</label>
        <textarea
          v-model="qrText"
          class="io-area"
          placeholder="https://github.com/FUANZANG"
          spellcheck="false"
        />
      </div>
      <div class="io-col qr-col">
        <label class="io-label">二维码</label>
        <div class="qr-box">
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            :style="{ width: qrSize + 'px', maxWidth: '100%' }"
            alt="qr"
          />
          <span v-else class="qr-empty">输入内容后自动生成</span>
        </div>
        <button v-if="qrDataUrl" class="copy-btn" @click="copy(qrDataUrl)">
          复制图片 DataURL
        </button>
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
.qr-col {
  align-items: flex-start;
}
.mode-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.2rem;
  flex-wrap: wrap;
}
.base-selects {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
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
.style-select:focus {
  border-color: var(--c-purple);
}
.qr-label {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}
.qr-box {
  width: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  padding: 1rem;
}
.qr-box img {
  max-width: 100%;
  height: auto;
}
.qr-empty {
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
}
.copy-btn {
  border: none;
  background: none;
  color: var(--c-purple);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0;
  margin-top: 0.5rem;
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
