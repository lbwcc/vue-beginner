import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './stores'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/tool-unified.css'
import { initAppMonitor } from './utils/monitor'
import { useAuthStore } from './stores/auth'
import { installGsapMotion } from './plugins/gsapMotion'

const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(ElementPlus)
installGsapMotion(app)

const authStore = useAuthStore()
authStore.hydrateFromStorage()
initAppMonitor()

app.mount('#app')
