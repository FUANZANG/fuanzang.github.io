<script setup>
import { ref, computed } from 'vue'
import { tools } from '../data/tools.js'
import { useTool } from './useTool.js'
import PageShell from './PageShell.vue'
import SimpleTool from './tools/SimpleTool.vue'
import PasswordTool from './tools/PasswordTool.vue'
import UuidTool from './tools/UuidTool.vue'
import RegexTool from './tools/RegexTool.vue'
import DateTool from './tools/DateTool.vue'
import ImageTool from './tools/ImageTool.vue'
import QrTool from './tools/QrTool.vue'
import DiffTool from './tools/DiffTool.vue'

const { toast } = useTool()
const activeTool = ref(tools[0].id)

const compMap = {
  password: PasswordTool,
  uuid: UuidTool,
  regex: RegexTool,
  date: DateTool,
  img: ImageTool,
  qrcode: QrTool,
  diff: DiffTool
}
const current = computed(() => compMap[activeTool.value] || SimpleTool)
</script>

<template>
  <PageShell
    title="🛠 前端小工具"
    subtitle="纯浏览器本地运行，数据不上传，随用随走"
  >
    <div class="tabs">
      <button
        v-for="t in tools"
        :key="t.id"
        class="tab"
        :class="{ active: activeTool === t.id }"
        @click="activeTool = t.id"
      >
        {{ t.name }}
      </button>
    </div>

    <component :is="current" :id="activeTool" />

    <footer class="tips">
      提示：所有转换均在本地完成，刷新页面即清空，不会保存任何内容。
    </footer>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </PageShell>
</template>

<style scoped>
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 1.5rem;
}
.tab {
  padding: 0.3rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.25s;
}
.tab:hover {
  color: var(--vp-c-text-1);
  border-color: var(--c-purple);
}
.tab.active {
  background: linear-gradient(135deg, var(--c-blue), var(--c-purple));
  color: #fff;
  border-color: transparent;
}

.tips {
  margin-top: 1.4rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 2.2rem;
  transform: translateX(-50%);
  padding: 0.6rem 1.3rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  font-size: 0.85rem;
  z-index: 50;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.25s,
    transform 0.25s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
