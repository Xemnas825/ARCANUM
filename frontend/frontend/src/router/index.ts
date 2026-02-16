import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: () => (useAuthStore().isLoggedIn ? '/personajes' : '/login'),
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/AuthView.vue'),
      meta: { guest: true },
    },
    {
      path: '/personajes',
      name: 'Personajes',
      component: () => import('../views/CharacterListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/personajes/nuevo',
      name: 'NuevoPersonaje',
      component: () => import('../views/CreateCharacterView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/personajes/:id',
      name: 'FichaPersonaje',
      component: () => import('../views/CharacterSheetView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/personajes/:id/partida',
      name: 'EnPartida',
      component: () => import('../views/PlaySessionView.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  auth.initFromStorage();
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    next({ name: 'Login' });
    return;
  }
  if (to.meta.guest && auth.isLoggedIn) {
    next({ path: '/personajes' });
    return;
  }
  next();
});

export default router;
