<script setup>
import { ref, computed, watch, nextTick } from 'vue'
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
const tabsRef = ref(null)

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

/** 手机横滑时把当前 Tab 滚到中间，避免选中项被挤出视口 */
const scrollActiveTabIntoView = async () => {
  await nextTick()
  const el = tabsRef.value?.querySelector('.tab.active')
  el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
}

watch(activeTool, scrollActiveTabIntoView)
</script>

<template>
  <PageShell
    title="🛠 前端小工具"
    subtitle="纯浏览器本地运行，数据不上传，随用随走"
  >
    <div ref="tabsRef" class="tabs" role="tablist" aria-label="工具列表">
      <button
        v-for="t in tools"
        :key="t.id"
        type="button"
        role="tab"
        class="tab"
        :class="{ active: activeTool === t.id }"
        :aria-selected="activeTool === t.id"
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
  padding: 0.35rem 1rem;
  min-height: 36px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.25s;
  -webkit-tap-highlight-color: transparent;
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

@media (max-width: 768px) {
  .tabs {
    flex-wrap: nowrap;
    justify-content: flex-start;
    gap: 0.45rem;
    margin-inline: -1.5rem;
    margin-bottom: 1.15rem;
    padding: 0.15rem 1.5rem 0.35rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
  }
  .tabs::-webkit-scrollbar {
    display: none;
  }
  .tab {
    flex: 0 0 auto;
    min-height: 40px;
    padding: 0.45rem 1rem;
    font-size: 0.88rem;
  }
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
