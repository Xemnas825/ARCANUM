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
      path: '/campanas',
      name: 'Campanas',
      component: () => import('../views/CampaignListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campanas/nueva',
      name: 'NuevaCampana',
      component: () => import('../views/CreateCampaignView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campanas/:id',
      name: 'DetalleCampana',
      component: () => import('../views/CampaignDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campanas/:id/combate',
      name: 'CombateCampana',
      component: () => import('../views/EncounterTrackerView.vue'),
      meta: { requiresAuth: true },
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
    {
      path: '/hechizos',
      name: 'Hechizos',
      component: () => import('../views/SpellBrowserView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/invitacion/:token',
      name: 'InvitacionCampana',
      component: () => import('../views/InviteJoinView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/perfil',
      name: 'Perfil',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campanas/:id/grupo',
      name: 'GrupoCampana',
      component: () => import('../views/PartyDashboardView.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  auth.initFromStorage();
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
    return;
  }
  if (to.meta.guest && auth.isLoggedIn) {
    next({ path: '/personajes' });
    return;
  }
  next();
});

export default router;
