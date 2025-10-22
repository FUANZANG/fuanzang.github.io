import { ref } from 'vue'

// 模块级单例：toast 在所有工具组件间共享，由外壳统一渲染
const toast = ref('')
let timer = null

export function useTool() {
  const error = ref('')

  function showToast(msg) {
    toast.value = msg
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (toast.value = ''), 1600)
  }

  async function copy(text) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      showToast('已复制 ✓')
    } catch (e) {
      error.value = '复制失败，请手动选择复制'
    }
  }

  return { error, toast, showToast, copy }
}
