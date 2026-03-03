import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.mount('#app')

// Si el backend devuelve 401 (token expirado o inválido), cerrar sesión y redirigir a login
window.addEventListener('arcanum:unauthorized', () => {
  const auth = useAuthStore()
  auth.logout()
  router.push('/login')
})
