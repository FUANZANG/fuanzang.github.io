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
    title="🛠 前端小工具"
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
/* 默认（桌面）：左侧竖向工具导航 + 右侧工作区，两栏在满高外壳内各自内部滚动 */
.layout {
  display: grid;
  grid-template-columns: 208px minmax(0, 1fr);
  gap: 1.8rem;
  align-items: start;
}

.tool-nav {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-right: 0.2rem;
}

.tool-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.group-label {
  padding: 0 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
}

.group-tabs {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.tool-main {
  min-width: 0;
}

/* 桌面满高：锁住高度，页面 body 不滚动，左栏与右栏各自内部滚动 */
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
  padding: 0.5rem 0.9rem;
  min-height: 38px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 0.88rem;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.tab:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}
.tab.active {
  background: linear-gradient(135deg, var(--c-blue), var(--c-purple));
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8px 20px -14px var(--c-purple);
}

/* 移动端：恢复顶部横向滑动标签，整页正常滚动 */
@media (max-width: 860px) {
  .layout {
    display: block;
    height: auto;
    min-width: 0;
    overflow: visible;
  }
  .tool-nav {
    position: static;
    flex-direction: row;
    align-items: flex-end;
    gap: 0.85rem;
    width: calc(100% + 2rem);
    min-width: 0;
    max-height: none;
    margin-inline: -1rem;
    margin-bottom: 1.15rem;
    padding: 0.15rem 1rem 0.5rem;
    box-sizing: border-box;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
  }
  .tool-group {
    flex: 0 0 auto;
    gap: 0.3rem;
    scroll-snap-align: start;
  }
  .group-tabs {
    flex-direction: row;
    gap: 0.45rem;
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
    min-height: 40px;
    padding: 0.45rem 1rem;
    border: 1px solid var(--vp-c-divider);
    border-radius: 999px;
    background: var(--vp-c-bg-soft);
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

<style>
/* 桌面端：让工具面板、输入区、文本域沿高度方向填满右栏（移动端仍用各组件自带高度）。
   选择器刻意提高权重，确保覆盖子组件 scoped 样式而不受打包顺序影响。 */
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
