import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './style.css'
import { onMounted } from 'vue'

async function registerSW() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    const { registerSW } = await import('virtual:pwa-register')
    registerSW({ immediate: true })
  }
}

export default {
  extends: DefaultTheme,
  Layout,
  setup() {
    onMounted(() => { registerSW() })
  }
}
