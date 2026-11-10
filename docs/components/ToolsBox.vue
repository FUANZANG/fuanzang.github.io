<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { tools, groupTools } from '../data/tools.js'
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
import PlantUmlTool from './tools/PlantUmlTool.vue'
import MarkdownTool from './tools/MarkdownTool.vue'
import TimezoneTool from './tools/TimezoneTool.vue'

const { toast } = useTool()
const groups = groupTools()
const tabsRef = ref(null)

function toolFromUrl() {
  try {
    const id = new URLSearchParams(window.location.search).get('tool')
    return tools.some(tool => tool.id === id) ? id : tools[0].id
  } catch {
    return tools[0].id
  }
}

const activeTool = ref(toolFromUrl())

function selectTool(id) {
  if (!tools.some(tool => tool.id === id)) return
  activeTool.value = id
  const url = new URL(window.location.href)
  url.searchParams.set('tool', id)
  window.history.replaceState(window.history.state, '', url)
}

const compMap = {
  password: PasswordTool,
  uuid: UuidTool,
  regex: RegexTool,
  date: DateTool,
  img: ImageTool,
  qrcode: QrTool,
  diff: DiffTool,
  plantuml: PlantUmlTool,
  markdown: MarkdownTool,
  timezone: TimezoneTool
}
const current = computed(() => compMap[activeTool.value] || SimpleTool)

/** 手机横滑时把当前 Tab 滚到中间，避免选中项被挤出视口 */
const scrollActiveTabIntoView = async () => {
  await nextTick()
  const el = tabsRef.value?.querySelector('.tab.active')
  el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
}

watch(activeTool, scrollActiveTabIntoView)

function onPopState() {
  activeTool.value = toolFromUrl()
}

// 量取全局页脚高度，写入 :root 的 --footer-h，供 PageShell 满高布局计算（视口 − 导航 − 页脚）
const footerH = ref(64)
let footerRO = null

function measureFooter() {
  const f = document.querySelector('.VPFooter')
  const h = f ? Math.ceil(f.getBoundingClientRect().height) : 0
  footerH.value = h
  document.documentElement.style.setProperty('--footer-h', h + 'px')
}

onMounted(() => {
  window.addEventListener('popstate', onPopState)
  measureFooter()
  const f = document.querySelector('.VPFooter')
  if (f && 'ResizeObserver' in window) {
    footerRO = new ResizeObserver(measureFooter)
    footerRO.observe(f)
  }
  window.addEventListener('resize', measureFooter)
})

onBeforeUnmount(() => {
  footerRO?.disconnect()
  window.removeEventListener('resize', measureFooter)
  window.removeEventListener('popstate', onPopState)
})
</script>

<template>
  <PageShell
    title="前端小工具"
    subtitle="本地运行，随用随走；PlantUML 预览会把图发给渲染服务"
    max-width="1120px"
    fill
  >
    <div class="layout">
      <nav ref="tabsRef" class="tool-nav" aria-label="工具列表">
        <div v-for="group in groups" :key="group.label" class="tool-group">
          <div class="group-label">{{ group.label }}</div>
          <div class="group-tabs" role="tablist" :aria-label="group.label">
            <button
              v-for="t in group.items"
              :key="t.id"
              type="button"
              role="tab"
              class="tab"
              :class="{ active: activeTool === t.id }"
              :aria-selected="activeTool === t.id"
              @click="selectTool(t.id)"
            >
              {{ t.name }}
            </button>
          </div>
        </div>
      </nav>

      <div class="tool-main">
        <component :is="current" :id="activeTool" />

        <footer class="tips">
          提示：PlantUML 预览会把源码发给渲染服务。其余转换都在本地完成，刷新页面即清空，不会保存任何内容。
        </footer>
      </div>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </PageShell>
</template>

<style scoped>
/* 桌面：左侧文字目录 + 右侧工作区 */
.layout {
  display: grid;
  grid-template-columns: 168px minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
  min-width: 0;
  max-width: 100%;
}

.tool-nav {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-right: 0.75rem;
  border-right: 1px solid var(--vp-c-divider);
  min-width: 0;
}

.tool-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.group-label {
  padding: 0 0 0.35rem;
  font-family: var(--font-display, inherit);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
  border-bottom: 1px solid var(--vp-c-divider);
}

.group-tabs {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tool-main {
  min-width: 0;
}

@media (min-width: 861px) {
  .layout {
    height: 100%;
    overflow: hidden;
  }
  .tool-nav {
    align-self: stretch;
    min-height: 0;
    overflow-y: auto;
  }
  .tool-main {
    align-self: stretch;
    min-height: 0;
    min-width: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
}

.tab {
  width: 100%;
  padding: 0.45rem 0.15rem 0.45rem 0.55rem;
  min-height: 34px;
  border: none;
  border-left: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 0.88rem;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.tab:hover {
  color: var(--vp-c-text-1);
}
.tab.active {
  background: transparent;
  color: var(--vp-c-text-1);
  border-left-color: var(--c-ink, var(--vp-c-brand-1));
  font-weight: 600;
}

/* 手机：壳内横滑文字标签，不用负边距 */
@media (max-width: 860px) {
  .layout {
    display: block;
    height: auto;
    min-width: 0;
    overflow-x: hidden;
  }
  .tool-nav {
    flex-direction: row;
    align-items: flex-end;
    gap: 1rem;
    width: 100%;
    max-width: 100%;
    margin: 0 0 1rem;
    padding: 0 0 0.55rem;
    border-right: none;
    border-bottom: 1px solid var(--vp-c-divider);
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
  }
  .tool-group {
    flex: 0 0 auto;
    gap: 0.25rem;
  }
  .group-label {
    padding: 0;
    border-bottom: none;
    font-size: 0.68rem;
  }
  .group-tabs {
    flex-direction: row;
    gap: 0.85rem;
  }
  .tool-nav::-webkit-scrollbar {
    display: none;
  }
  .tool-main {
    overflow: visible;
  }
  .tab {
    flex: 0 0 auto;
    width: auto;
    min-height: auto;
    padding: 0.2rem 0;
    border-left: none;
    border-bottom: 1px solid transparent;
    font-size: 0.88rem;
  }
  .tab.active {
    border-left-color: transparent;
    border-bottom-color: var(--c-ink, var(--vp-c-brand-1));
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
  padding: 0.55rem 1.1rem;
  border-radius: 6px;
  background: var(--c-ink, #141414);
  color: var(--c-on-ink, #fafafa);
  font-size: 0.85rem;
  z-index: 50;
  box-shadow: 0 8px 24px -12px rgba(0, 0, 0, 0.35);
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

<style>
/* 桌面端：让工具面板、输入区、文本域沿高度方向填满右栏（移动端仍用各组件自带高度）。
   选择器刻意提高权重，确保覆盖子组件 scoped 样式而不受打包顺序影响。 */
.layout .tool-main .panel {
  border-radius: 6px;
  border-color: var(--vp-c-divider);
  box-shadow: none;
}

@media (min-width: 861px) {
  .layout .tool-main .panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .layout .tool-main .io {
    flex: 1;
    min-height: 0;
  }
  .layout .tool-main .io-col {
    min-height: 0;
  }
  .layout .tool-main .io-col .io-area {
    flex: 1;
    min-height: 340px;
    height: auto;
  }
  .layout .tool-main .diff-out {
    max-height: 460px;
  }
}

/* 窄屏：工作区单列、表单不撑破视口、字号避免 iOS 聚焦放大 */
@media (max-width: 860px) {
  .layout .tool-main .panel {
    padding: 1rem;
  }
  .layout .tool-main .io {
    grid-template-columns: 1fr;
  }
  .layout .tool-main .io-area,
  .layout .tool-main input,
  .layout .tool-main select,
  .layout .tool-main textarea {
    max-width: 100%;
    font-size: 16px;
  }
  .layout .tool-main .seg {
    max-width: 100%;
  }
}
</style>
