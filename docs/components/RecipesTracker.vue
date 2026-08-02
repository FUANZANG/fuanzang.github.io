<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import recipes from '../data/recipes.json'
import PageShell from './PageShell.vue'

const searchQuery = ref('')
const selectedCategory = ref('全部')
const selectedTags = ref([])
const expandedId = ref(null)
const randomNotice = ref('')
const viewMode = ref('grid')
const sortBy = ref('default')
const currentPage = ref(1)
const perPage = 12

// 烹饪模式
const cookingMode = ref(false)
const cookingRecipe = ref(null)
const cookingStep = ref(0)
const timerRunning = ref(false)
const timerSeconds = ref(0)
let timerInterval = null

// 收藏
const favorites = ref([])
onMounted(() => {
  try {
    const saved = localStorage.getItem('recipe-favorites')
    if (saved) favorites.value = JSON.parse(saved)
  } catch {}
})
watch(favorites, val => {
  localStorage.setItem('recipe-favorites', JSON.stringify(val))
}, { deep: true })

const toggleFavorite = name => {
  const idx = favorites.value.indexOf(name)
  if (idx === -1) favorites.value.push(name)
  else favorites.value.splice(idx, 1)
}
const isFavorite = name => favorites.value.includes(name)

const categories = computed(() => {
  const cats = new Set(recipes.map(r => r.category))
  return ['全部', ...Array.from(cats)]
})

/** 标签展示顺序：高频/常用靠前，便于手机横滑时优先点到 */
const TAG_ORDER = [
  '下饭',
  '快手菜',
  '荤菜',
  '素食',
  '辣',
  '清淡',
  '荤素',
  '凉菜',
  '汤',
  '甜口',
  '海鲜'
]

const allTags = computed(() => {
  const present = new Set()
  recipes.forEach((r) => r.tags.forEach((t) => present.add(t)))
  const ordered = TAG_ORDER.filter((t) => present.has(t))
  const rest = Array.from(present)
    .filter((t) => !TAG_ORDER.includes(t))
    .sort((a, b) => a.localeCompare(b, 'zh'))
  return [...ordered, ...rest]
})

const toggleTag = tag => {
  const idx = selectedTags.value.indexOf(tag)
  if (idx === -1) selectedTags.value.push(tag)
  else selectedTags.value.splice(idx, 1)
  currentPage.value = 1
}

const filteredRecipes = computed(() => {
  return recipes.filter(recipe => {
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const matchName = recipe.name.toLowerCase().includes(q)
      const matchIngredients = recipe.ingredients.some(i =>
        i.name.toLowerCase().includes(q)
      )
      const matchTags = recipe.tags.some(t => t.includes(q))
      if (!matchName && !matchIngredients && !matchTags) return false
    }
    if (
      selectedCategory.value !== '全部' &&
      recipe.category !== selectedCategory.value
    )
      return false
    if (
      selectedTags.value.length > 0 &&
      !selectedTags.value.every(t => recipe.tags.includes(t))
    )
      return false
    return true
  })
})

const difficultyRank = d => {
  if (d === '简单') return 1
  if (d === '中等') return 2
  return 3
}
const parseTime = t => parseInt(t) || 999

const sortedRecipes = computed(() => {
  const arr = [...filteredRecipes.value]
  if (sortBy.value === 'time-asc') arr.sort((a, b) => parseTime(a.time) - parseTime(b.time))
  else if (sortBy.value === 'time-desc') arr.sort((a, b) => parseTime(b.time) - parseTime(a.time))
  else if (sortBy.value === 'difficulty') arr.sort((a, b) => difficultyRank(a.difficulty) - difficultyRank(b.difficulty))
  else if (sortBy.value === 'favorites') arr.sort((a, b) => (isFavorite(b.name) ? 1 : 0) - (isFavorite(a.name) ? 1 : 0))
  return arr
})

const totalPages = computed(() => Math.ceil(sortedRecipes.value.length / perPage))
const pagedRecipes = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return sortedRecipes.value.slice(start, start + perPage)
})

const recommendedId = ref(null)

watch([searchQuery, selectedCategory, selectedTags, sortBy], () => {
  currentPage.value = 1
  recommendedId.value = null
})

/**
 * 滚到指定菜卡片。
 * 翻页后目标卡片可能还没渲染进 DOM，故找不到时按帧重试（最多 ~20 帧 / ~330ms）。
 * 找到后还需再等几帧让 Vue 完成重渲染与浏览器 reflow（否则滚动会读到旧布局），
 * 然后用 window.scrollTo 按绝对位置滚动，避开顶部 sticky 工具栏。
 * behavior 默认 'auto'（深链用，避免与 VitePress SPA 切换后的 scrollTo(0) 复位打架）；
 * 页内随机传 'smooth' 恢复平滑滚动动画。返回 Promise<boolean>。
 */
const scrollRecipeIntoView = (name, { retries = 20, settleFrames = 3, behavior = 'auto' } = {}) => {
  return new Promise((resolve) => {
    const tryOnce = (n) => {
      const el = document.querySelector(
        `.recipe-card[data-name="${CSS.escape(name)}"]`
      )
      if (el) {
        // 等布局稳定：再走 settleFrames 帧，确保翻页后的新卡片已完成 reflow
        let f = settleFrames
        const settle = () => {
          if (f-- > 0) {
            requestAnimationFrame(settle)
            return
          }
          const top =
            el.getBoundingClientRect().top + window.scrollY - 80
          window.scrollTo({ top: Math.max(0, top), behavior })
          resolve(true)
        }
        settle()
      } else if (n > 0) {
        requestAnimationFrame(() => tryOnce(n - 1))
      } else {
        resolve(false)
      }
    }
    tryOnce(retries)
  })
}

/**
 * 定位到指定菜：重置筛选 → 展开 → 翻到所在页 → 滚动。
 * 滚动用带重试的 scrollRecipeIntoView，避免翻页后卡片未渲染导致滚动失效。
 */
const focusRecipeByName = async (name, { scroll = true, behavior = 'auto', resetFilters = true, recommend = false } = {}) => {
  if (!name) return false
  // 重置筛选，确保目标一定在列表里（空数组勿重复赋值，避免触发 watch）
  if (resetFilters) {
    searchQuery.value = ''
    selectedCategory.value = '全部'
    if (selectedTags.value.length) selectedTags.value = []
    sortBy.value = 'default'
  }
  await nextTick()

  const index = sortedRecipes.value.findIndex((r) => r.name === name)
  if (index === -1) return false

  // 仅随机推荐才点亮「换一道」；调味参考/返回跳转不触发
  if (recommend) recommendedId.value = name
  expandedId.value = name
  currentPage.value = Math.floor(index / perPage) + 1
  if (!scroll) return true
  // 滚动交由 scrollRecipeIntoView 内部等布局稳定后再滚
  return scrollRecipeIntoView(name, { behavior })
}
const EXCLUDED_RANDOM_CATEGORIES = ['调料配方']

// 实例菜 → 调味公式 的交叉引用（不污染 JSON 数据，仅前端展示）
const SEASONING_REF = {
  '鱼香肉丝': '鱼香酱汁',
  '鱼香茄子': '鱼香酱汁',
  '鱼香鸡蛋': '鱼香酱汁',
  '照烧鸡腿肉': '照烧酱汁',
  '糖醋排骨': '糖醋比例',
  '糖醋荷包蛋': '糖醋比例',
  '凉拌黄瓜': '凉拌蒜辣汁',
  '凉拌木耳': '凉拌蒜辣汁',
  '凉拌海带丝': '凉拌蒜辣汁',
  '凉拌金针菇': '凉拌蒜辣汁',
  '凉拌猪肝': '凉拌蒜辣汁',
  '凉拌粉丝': '凉拌蒜辣汁',
  '皮蛋豆腐': '凉拌蒜辣汁',
  '小葱豆腐': '凉拌蒜辣汁',
  '蒜泥白肉': '凉拌蒜辣汁',
  '红烧排骨': '炖肉类调料',
  '红烧肉': '炖肉类调料',
  '土豆炖排骨': '炖肉类调料',
  '猪肉炖粉条': '炖肉类调料',
  '萝卜炖排骨': '煲汤公式',
  '鸡爪煲': '煲汤公式',
  '青椒肉丝': '炒肉菜公式',
  '宫保鸡丁': '炒肉菜公式',
  '蒜薹炒肉丝': '炒肉菜公式',
  '尖椒炒肉丝': '炒肉菜公式',
  '京酱肉丝': '炒肉菜公式',
  '包菜炒肉片': '炒肉菜公式',
  '西葫芦炒肉片': '炒肉菜公式'
}
const seasoningRefFor = name => SEASONING_REF[name] || null

// 调味参考跳转的返回来源（点链接时记录，展示返回按钮）
const refFrom = ref(null)
const openSeasoningRef = async (recipeName) => {
  refFrom.value = recipeName
  const target = seasoningRefFor(recipeName)
  if (target) await focusRecipeByName(target, { behavior: 'smooth' })
}
const backToRecipe = async () => {
  if (!refFrom.value) return
  const from = refFrom.value
  refFrom.value = null
  await focusRecipeByName(from, { behavior: 'smooth' })
}
const pickRandom = async () => {
  // 在当前筛选结果内随机（保留用户已选的标签/分类），但排除「调料配方」这类公式/调味汁
  let pool = sortedRecipes.value.filter(
    r => !EXCLUDED_RANDOM_CATEGORIES.includes(r.category)
  )
  let fallback = false
  if (pool.length === 0) {
    // 筛选结果为空（如交集标签互斥）：回退到全量菜谱中排除调料配方后的集合
    pool = recipes.filter(r => !EXCLUDED_RANDOM_CATEGORIES.includes(r.category))
    fallback = true
  }
  const index = Math.floor(Math.random() * pool.length)
  // 页内随机：无路由切换，用 smooth 恢复平滑滚动动画；不重置筛选
  const name = pool[index].name
  randomNotice.value = fallback
    ? `当前筛选没有匹配的菜，已为你从全部 ${recipes.length} 道菜里随机一道`
    : ''
  await focusRecipeByName(name, { behavior: 'smooth', resetFilters: false, recommend: true })
}

/**
 * 首页深链：/recipes?name=xxx
 * VitePress 在 SPA 切换后会异步 scrollTo(0) 复位（约 300ms 内），
 * 若我们过早滚动会被顶回。故等一拍（nextTick + 延迟）让路由复位结束，
 * 再交给 scrollRecipeIntoView 按绝对位置滚动。
 */
const focusFromDeepLink = async (name) => {
  await nextTick()
  // 等 VitePress 路由切换的 scrollTo(0) 复位完成
  await new Promise((r) => setTimeout(r, 350))
  await focusRecipeByName(name, { scroll: true })
}

onMounted(() => {
  try {
    const name = new URLSearchParams(window.location.search).get('name')
    if (name) focusFromDeepLink(name)
  } catch {}
})

const toggleExpand = name => {
  const collapsing = expandedId.value === name
  expandedId.value = collapsing ? null : name
  // 收起推荐卡，或手动点开其他菜 → 去掉「换一道」
  if (!recommendedId.value) return
  if (collapsing && name === recommendedId.value) recommendedId.value = null
  else if (!collapsing && name !== recommendedId.value) recommendedId.value = null
}

const difficultyClass = d => {
  if (d === '简单') return 'easy'
  if (d === '中等') return 'medium'
  return 'hard'
}

// 烹饪模式
const startCooking = recipe => {
  cookingRecipe.value = recipe
  cookingStep.value = 0
  cookingMode.value = true
  timerRunning.value = false
  timerSeconds.value = 0
}
const closeCooking = () => {
  cookingMode.value = false
  cookingRecipe.value = null
  stopTimer()
}
const prevStep = () => { if (cookingStep.value > 0) cookingStep.value-- }
const nextStep = () => {
  if (cookingRecipe.value && cookingStep.value < cookingRecipe.value.steps.length - 1)
    cookingStep.value++
}
const toggleTimer = () => {
  if (timerRunning.value) { stopTimer() }
  else {
    timerRunning.value = true
    timerInterval = setInterval(() => timerSeconds.value++, 1000)
  }
}
const stopTimer = () => {
  timerRunning.value = false
  clearInterval(timerInterval)
}
const resetTimer = () => { stopTimer(); timerSeconds.value = 0 }
const formatTime = s => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
</script>

<template>
  <PageShell
    title="🍳 今天吃什么？"
    subtitle="记录一些家常菜谱，不知道吃什么的时候翻翻看"
    max-width="1100px"
  >
    <section class="toolbar">
      <div class="toolbar-search">
        <input
          v-model="searchQuery"
          type="search"
          enterkeyhint="search"
          placeholder="搜索菜名、食材..."
          class="search-input"
        />
      </div>
      <div class="toolbar-row">
        <button class="random-btn" type="button" @click="pickRandom">🎲 随机推荐</button>
        <transition name="notice-fade">
          <span v-if="randomNotice" class="random-notice">{{ randomNotice }}</span>
        </transition>
        <div class="view-toggle" aria-label="视图切换">
          <button
            type="button"
            :class="{ active: viewMode === 'grid' }"
            title="网格视图"
            @click="viewMode = 'grid'"
          >▦</button>
          <button
            type="button"
            :class="{ active: viewMode === 'list' }"
            title="列表视图"
            @click="viewMode = 'list'"
          >☰</button>
        </div>
        <div class="filters-scroll">
          <div class="filter-group">
            <select v-model="selectedCategory" class="filter-select" aria-label="分类">
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div class="filter-group">
            <select v-model="sortBy" class="filter-select" aria-label="排序">
              <option value="default">默认排序</option>
              <option value="time-asc">时间 ↑</option>
              <option value="time-desc">时间 ↓</option>
              <option value="difficulty">难度</option>
              <option value="favorites">收藏优先</option>
            </select>
          </div>
        </div>
      </div>
      <div class="tag-bar" aria-label="标签筛选">
        <button
          v-for="tag in allTags"
          :key="tag"
          type="button"
          class="tag-chip"
          :class="{ selected: selectedTags.includes(tag) }"
          @click="toggleTag(tag)"
        >{{ tag }}</button>
        <button
          v-if="selectedTags.length > 0"
          type="button"
          class="tag-clear"
          @click="selectedTags = []"
        >清除</button>
      </div>
    </section>

    <section class="recipe-list" :class="viewMode">
      <div v-if="sortedRecipes.length === 0" class="empty-state">
        没有找到匹配的菜谱，换个关键词试试？
      </div>
      <div
        v-for="recipe in pagedRecipes"
        :key="recipe.name"
        class="recipe-card"
        :data-name="recipe.name"
        :class="{ expanded: expandedId === recipe.name, recommended: recommendedId === recipe.name }"
      >
        <div class="card-header" @click="toggleExpand(recipe.name)">
          <div class="card-title-row">
            <button class="fav-btn" @click.stop="toggleFavorite(recipe.name)" :title="isFavorite(recipe.name) ? '取消收藏' : '收藏'">
              {{ isFavorite(recipe.name) ? '★' : '☆' }}
            </button>
            <h3 class="recipe-name">{{ recipe.name }}</h3>
            <span class="difficulty-badge" :class="difficultyClass(recipe.difficulty)">{{ recipe.difficulty }}</span>
            <span class="expand-chevron" :class="{ open: expandedId === recipe.name }">›</span>
          </div>
          <div class="card-meta">
            <span class="meta-item">⏱ {{ recipe.time }}</span>
            <span class="meta-item">📂 {{ recipe.category }}</span>
          </div>
          <div class="card-tags">
            <span v-for="tag in recipe.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
        <div v-show="expandedId === recipe.name" class="card-body">
          <div class="section">
            <h4>🥬 食材</h4>
            <ul class="ingredient-list">
              <li v-for="ing in recipe.ingredients" :key="ing.name">
                <strong>{{ ing.name }}</strong> — {{ ing.amount }}
              </li>
            </ul>
          </div>
          <div class="section">
            <h4>🧂 调料</h4>
            <div class="seasonings">
              <span v-for="s in recipe.seasonings" :key="s" class="seasoning-tag">{{ s }}</span>
            </div>
          </div>
          <div class="section">
            <h4>👨‍🍳 做法</h4>
            <ol class="steps-list">
              <li v-for="(step, index) in recipe.steps" :key="index">{{ step }}</li>
            </ol>
          </div>
          <div v-if="recipe.tips" class="section tips-section">
            <h4>💡 小贴士</h4>
            <p>{{ recipe.tips }}</p>
          </div>
          <div v-if="seasoningRefFor(recipe.name)" class="section ref-section">
            <h4>🔗 调味参考</h4>
            <button
              type="button"
              class="ref-link"
              @click.stop="openSeasoningRef(recipe.name)"
            >{{ seasoningRefFor(recipe.name) }}</button>
          </div>
          <button class="cook-btn" @click.stop="startCooking(recipe)">🔥 开始烹饪</button>
        </div>
      </div>
    </section>

    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="currentPage <= 1" @click="currentPage--">‹ 上一页</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button :disabled="currentPage >= totalPages" @click="currentPage++">下一页 ›</button>
    </div>

    <footer class="stats-footer">
      共收录 {{ recipes.length }} 道菜谱 · 筛选出 {{ sortedRecipes.length }} 道
    </footer>

    <!-- 随机「换一道」+ 调味参考「返回」：同容器纵向排列，避免重叠 -->
    <Teleport to="body">
      <div
        v-if="(recommendedId || refFrom) && !cookingMode"
        class="fab-stack"
      >
        <button
          v-if="refFrom"
          class="ref-back-fab"
          type="button"
          @click="backToRecipe"
        >
          ← 返回 {{ refFrom }}
        </button>
        <button
          v-if="recommendedId"
          class="random-fab"
          type="button"
          @click="pickRandom"
        >
          🎲 换一道
        </button>
      </div>
    </Teleport>

    <!-- 烹饪模式弹窗 -->
    <Teleport to="body">
      <div v-if="cookingMode" class="cooking-overlay" @click.self="closeCooking">
        <div class="cooking-modal">
          <div class="cooking-header">
            <h2>{{ cookingRecipe.name }}</h2>
            <button class="close-btn" @click="closeCooking">✕</button>
          </div>
          <div class="cooking-step-indicator">
            步骤 {{ cookingStep + 1 }} / {{ cookingRecipe.steps.length }}
          </div>
          <div class="cooking-step-progress">
            <div class="progress-bar" :style="{ width: ((cookingStep + 1) / cookingRecipe.steps.length * 100) + '%' }"></div>
          </div>
          <div class="cooking-step-content">
            <p>{{ cookingRecipe.steps[cookingStep] }}</p>
          </div>
          <div class="cooking-timer">
            <span class="timer-display">{{ formatTime(timerSeconds) }}</span>
            <div class="timer-btns">
              <button @click="toggleTimer">{{ timerRunning ? '⏸' : '▶' }}</button>
              <button @click="resetTimer">↺</button>
            </div>
          </div>
          <div class="cooking-nav">
            <button :disabled="cookingStep <= 0" @click="prevStep">‹ 上一步</button>
            <button :disabled="cookingStep >= cookingRecipe.steps.length - 1" @click="nextStep">下一步 ›</button>
          </div>
        </div>
      </div>
    </Teleport>
  </PageShell>
</template>

<style scoped>
/* ── Toolbar ── */
.toolbar { margin-bottom: 1.5rem; }
.toolbar-search { margin-bottom: 0.65rem; }
.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  margin-bottom: 0.75rem;
}
.filters-scroll {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  min-width: 0;
}
.search-input {
  width: 100%;
  padding: 0.55rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus { border-color: var(--vp-c-brand-1); }

.random-btn {
  padding: 0.55rem 1rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.15s, box-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.random-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px -4px rgba(99,102,241,0.5); }
.random-btn:active { transform: translateY(0); }

/* 随机回退提示 */
.random-notice {
  margin-left: 0.5rem;
  font-size: 0.82rem;
  color: var(--vp-c-warning-1, #b45309);
  background: var(--vp-c-warning-soft, rgba(245, 158, 11, 0.12));
  border: 1px solid var(--vp-c-warning-2, rgba(245, 158, 11, 0.3));
  padding: 0.28rem 0.6rem;
  border-radius: 999px;
  white-space: nowrap;
}
.notice-fade-enter-active,
.notice-fade-leave-active {
  transition: opacity 0.25s ease;
}
.notice-fade-enter-from,
.notice-fade-leave-to {
  opacity: 0;
}

/* 随机推荐后的悬浮换一道 */
/* 悬浮按钮纵向容器：用 gap 控制间距，避免硬算 bottom 重叠 */
.fab-stack {
  position: fixed;
  right: 1.25rem;
  bottom: 1.75rem;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.6rem;
}

.random-fab {
  padding: 0.7rem 1.15rem;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 24px -6px rgba(99, 102, 241, 0.55);
  transition: transform 0.15s, box-shadow 0.15s;
}
.random-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -6px rgba(99, 102, 241, 0.6);
}
.random-fab:active {
  transform: translateY(0);
}

/* 调味参考跳转后的返回按钮 */
.ref-back-fab {
  padding: 0.6rem 1.05rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg);
  color: #6366f1;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 24px -8px rgba(99, 102, 241, 0.4);
  transition: transform 0.15s, box-shadow 0.15s;
}
.ref-back-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -8px rgba(99, 102, 241, 0.5);
}
.ref-back-fab:active {
  transform: translateY(0);
}

.view-toggle {
  display: flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}
.view-toggle button {
  padding: 0.45rem 0.7rem;
  border: none;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.15s, color 0.15s;
}
.view-toggle button.active {
  background: var(--vp-c-brand-1);
  color: #fff;
}
.view-toggle button:hover:not(.active) { background: var(--vp-c-bg); }

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
  outline: none;
  cursor: pointer;
}

/* ── Tags ── */
.tag-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.tag-chip {
  padding: 0.3rem 0.7rem;
  min-height: 34px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.tag-chip:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
.tag-chip.selected {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}
.tag-clear {
  padding: 0.3rem 0.6rem;
  min-height: 34px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 20px;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 0.75rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

/* ── Recipe List ── */
.recipe-list.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

/* ── Mobile：工具栏收束 + 标签横滑 ── */
@media (max-width: 768px) {
  .toolbar { margin-bottom: 1.1rem; }
  .toolbar-search { margin-bottom: 0.55rem; }
  .search-input {
    font-size: 1rem; /* 避免 iOS 聚焦缩放 */
    min-height: 44px;
  }
  .toolbar-row {
    flex-wrap: nowrap;
    gap: 0.5rem;
    margin-bottom: 0.65rem;
  }
  .random-btn {
    flex: 0 0 auto;
    min-height: 40px;
    padding: 0.5rem 0.85rem;
    font-size: 0.85rem;
  }
  .view-toggle { flex: 0 0 auto; }
  .view-toggle button {
    min-height: 40px;
    padding: 0.4rem 0.65rem;
  }
  .filters-scroll {
    flex: 1 1 auto;
    flex-wrap: nowrap;
    gap: 0.45rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
  }
  .filters-scroll::-webkit-scrollbar { display: none; }
  .filter-group { flex: 0 0 auto; }
  .filter-select {
    min-height: 40px;
    font-size: 0.85rem;
  }

  .tag-bar {
    flex-wrap: nowrap;
    gap: 0.45rem;
    margin-inline: -1.5rem;
    padding: 0.1rem 1.5rem 0.25rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
  }
  .tag-bar::-webkit-scrollbar { display: none; }
  .tag-chip,
  .tag-clear {
    flex: 0 0 auto;
    min-height: 40px;
    padding: 0.4rem 0.85rem;
    font-size: 0.85rem;
  }

  .recipe-list.grid {
    grid-template-columns: 1fr;
  }
}
.recipe-list.grid .recipe-card { margin-bottom: 0; }

.recipe-list.list .recipe-card { margin-bottom: 0.75rem; }

.recipe-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
  /* 为固定导航预留下方空间，避免 scrollIntoView 贴顶被遮挡 */
  scroll-margin-top: calc(var(--vp-nav-height, 64px) + 12px);
}
.recipe-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }
.recipe-card.recommended { border-color: rgba(139,92,246,0.5); box-shadow: 0 0 0 2px rgba(139,92,246,0.2); }

.card-header { padding: 1rem 1.15rem; cursor: pointer; user-select: none; position: relative; }
.card-title-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
.recipe-name { font-size: 1.1rem; margin: 0; flex: 1; }

.expand-chevron {
  font-size: 1.1rem;
  color: var(--vp-c-text-3);
  transition: transform 0.2s;
  transform: rotate(0deg);
  line-height: 1;
  margin-left: 0.25rem;
}
.expand-chevron.open { transform: rotate(90deg); }

.fav-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #f59e0b;
  padding: 0;
  line-height: 1;
  transition: transform 0.15s;
}
.fav-btn:hover { transform: scale(1.2); }

.difficulty-badge {
  font-size: 0.7rem;
  padding: 0.12rem 0.45rem;
  border-radius: 4px;
  font-weight: 500;
  white-space: nowrap;
}
.difficulty-badge.easy { background: #dcfce7; color: #166534; }
.difficulty-badge.medium { background: #fef3c7; color: #92400e; }
.difficulty-badge.hard { background: #fee2e2; color: #991b1b; }

:root.dark .difficulty-badge.easy { background: rgba(34,197,94,0.16); color: #86efac; }
:root.dark .difficulty-badge.medium { background: rgba(245,158,11,0.16); color: #fcd34d; }
:root.dark .difficulty-badge.hard { background: rgba(239,68,68,0.16); color: #fca5a5; }

.card-meta { display: flex; gap: 0.8rem; margin-bottom: 0.35rem; }
.meta-item { font-size: 0.8rem; color: var(--vp-c-text-2); }
.card-tags { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.tag { font-size: 0.7rem; padding: 0.08rem 0.4rem; background: var(--vp-c-bg-soft); border-radius: 4px; color: var(--vp-c-text-2); }

.card-body { padding: 0 1.15rem 1.15rem; border-top: 1px solid var(--vp-c-divider); }
.section { margin-top: 0.9rem; }
.section h4 { font-size: 0.9rem; margin-bottom: 0.4rem; color: var(--vp-c-text-1); }

.ingredient-list {
  list-style: none; padding: 0; margin: 0;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.3rem;
}
.ingredient-list li { font-size: 0.85rem; color: var(--vp-c-text-2); }

.seasonings { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.seasoning-tag { font-size: 0.75rem; padding: 0.1rem 0.45rem; background: var(--vp-c-bg-soft); border-radius: 4px; color: var(--vp-c-text-2); }

.steps-list { padding-left: 1.2rem; margin: 0; }
.steps-list li { font-size: 0.85rem; line-height: 1.7; color: var(--vp-c-text-2); margin-bottom: 0.25rem; }

.tips-section {
  margin-top: 0.9rem; padding: 0.65rem 0.75rem;
  background: var(--vp-c-bg-soft); border-radius: 8px;
  border-left: 3px solid #f59e0b;
}
.tips-section p { font-size: 0.8rem; color: var(--vp-c-text-2); margin: 0; line-height: 1.5; }

.ref-section {
  margin-top: 0.6rem; padding: 0.55rem 0.75rem;
  background: var(--vp-c-bg-soft); border-radius: 8px;
  border-left: 3px solid #6366f1;
}
.ref-section h4 { margin: 0 0 0.4rem; font-size: 0.8rem; color: var(--vp-c-text-1); }
.ref-link {
  display: inline-block; padding: 0.3rem 0.7rem;
  border: 1px solid var(--vp-c-divider); border-radius: 999px;
  background: var(--vp-c-bg); color: #6366f1;
  font-size: 0.8rem; cursor: pointer; transition: all 0.18s;
}
.ref-link:hover { border-color: #6366f1; background: rgba(99,102,241,0.08); }

.cook-btn {
  margin-top: 1rem;
  width: 100%;
  padding: 0.6rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #f97316, #ef4444);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.cook-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px -2px rgba(249,115,22,0.4); }

/* ── Pagination ── */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}
.pagination button {
  padding: 0.45rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s;
}
.pagination button:hover:not(:disabled) { background: var(--vp-c-brand-1); color: #fff; border-color: var(--vp-c-brand-1); }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 0.85rem; color: var(--vp-c-text-2); }

.empty-state { text-align: center; padding: 3rem; color: var(--vp-c-text-2); grid-column: 1 / -1; }
.stats-footer { text-align: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--vp-c-divider); font-size: 0.8rem; color: var(--vp-c-text-3); }

/* ── Cooking Mode ── */
.cooking-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
}
.cooking-modal {
  background: var(--vp-c-bg); border-radius: 16px;
  width: 90%; max-width: 520px; max-height: 90vh;
  overflow-y: auto; padding: 2rem;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.cooking-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.cooking-header h2 { margin: 0; font-size: 1.4rem; }
.close-btn { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: var(--vp-c-text-2); padding: 0.25rem; }
.close-btn:hover { color: var(--vp-c-text-1); }

.cooking-step-indicator { text-align: center; font-size: 0.9rem; color: var(--vp-c-text-2); margin-bottom: 0.5rem; }
.cooking-step-progress { height: 4px; background: var(--vp-c-divider); border-radius: 2px; overflow: hidden; margin-bottom: 1.5rem; }
.progress-bar { height: 100%; background: linear-gradient(90deg, #f97316, #ef4444); transition: width 0.3s; border-radius: 2px; }

.cooking-step-content {
  background: var(--vp-c-bg-soft); border-radius: 12px;
  padding: 1.5rem; min-height: 120px;
  display: flex; align-items: center; justify-content: center;
  text-align: center;
}
.cooking-step-content p { font-size: 1.15rem; line-height: 1.8; margin: 0; color: var(--vp-c-text-1); }

.cooking-timer {
  display: flex; align-items: center; justify-content: center;
  gap: 1rem; margin: 1.5rem 0;
}
.timer-display {
  font-size: 2rem; font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-1);
}
.timer-btns { display: flex; gap: 0.5rem; }
.timer-btns button {
  width: 2.5rem; height: 2.5rem;
  border-radius: 50%; border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  font-size: 1rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.timer-btns button:hover { background: var(--vp-c-brand-1); color: #fff; border-color: var(--vp-c-brand-1); }

.cooking-nav { display: flex; gap: 0.75rem; }
.cooking-nav button {
  flex: 1; padding: 0.7rem; border: none; border-radius: 8px;
  font-size: 0.95rem; font-weight: 600; cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
.cooking-nav button:first-child { background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); }
.cooking-nav button:last-child { background: linear-gradient(135deg, #f97316, #ef4444); color: #fff; }
.cooking-nav button:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
.cooking-nav button:hover:not(:disabled) { transform: translateY(-1px); }

:root.dark .cooking-modal { background: var(--vp-c-bg-soft); }
:root.dark .cooking-step-content { background: var(--vp-c-bg); }
</style>
