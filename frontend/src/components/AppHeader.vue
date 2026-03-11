<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCampaignStore } from '../stores/campaigns';
import { useNotificationStore } from '../stores/notifications';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const campaignsStore = useCampaignStore();
const notifications = useNotificationStore();
const showNotifications = ref(false);
let notifPollTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  if (auth.isLoggedIn && campaignsStore.list.length === 0) {
    campaignsStore.fetchCampaigns();
  }
  if (auth.isLoggedIn) {
    notifications.fetchNotifications();
    notifPollTimer = setInterval(() => {
      notifications.fetchNotifications();
    }, 30000);
  }
});

onUnmounted(() => {
  if (notifPollTimer) clearInterval(notifPollTimer);
});

function goPersonajes() { router.push('/personajes'); }
function goCampanas()   { router.push('/campanas'); }
function goHechizos()   { router.push('/hechizos'); }
function goPerfil()     { router.push('/perfil'); }

const isPersonajes = () => route.path.startsWith('/personajes');
const isCampanas   = () => route.path.startsWith('/campanas');
const isHechizos   = () => route.path.startsWith('/hechizos');
const isPerfil     = () => route.path.startsWith('/perfil');

const showUserMenu = ref(false);

function openNotification(notificationId: string, campaignId?: string) {
  notifications.markRead(notificationId);
  showNotifications.value = false;
  if (campaignId) router.push(`/campanas/${campaignId}`);
}

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <header class="header">
    <div class="logo" role="banner">
      <button type="button" class="logo-btn" @click="goPersonajes" aria-label="Ir a inicio">
        <span class="logo-icon" aria-hidden="true">✦</span>
        <h1>ARCANUM</h1>
      </button>
    </div>
    <nav class="nav" aria-label="Principal">
      <button
        type="button"
        class="nav-link"
        :class="{ active: isPersonajes() }"
        @click="goPersonajes"
      >
        Personajes
      </button>
      <button
        type="button"
        class="nav-link"
        :class="{ active: isCampanas() }"
        @click="goCampanas"
      >
        Campañas
      </button>
      <button
        type="button"
        class="nav-link"
        :class="{ active: isHechizos() }"
        @click="goHechizos"
      >
        Hechizos
      </button>
      <select
        v-if="auth.isLoggedIn && campaignsStore.list.length > 0"
        :value="campaignsStore.activeCampaignId ?? ''"
        class="campaign-select"
        aria-label="Campaña activa (contenido homebrew)"
        @change="campaignsStore.setActiveCampaign(($event.target as HTMLSelectElement).value || null)"
      >
        <option value="">Sin campaña</option>
        <option v-for="c in campaignsStore.list" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </nav>
    <div class="actions">
      <div v-if="auth.isLoggedIn" class="notif-wrap">
        <button
          type="button"
          class="notif-btn"
          :aria-label="`Notificaciones (${notifications.unreadCount} sin leer)`"
          @click="showNotifications = !showNotifications; showUserMenu = false"
        >
          🔔
          <span v-if="notifications.unreadCount > 0" class="notif-count">{{ notifications.unreadCount }}</span>
        </button>
        <div v-if="showNotifications" class="notif-panel dark-card">
          <div class="notif-header">
            <strong>Notificaciones</strong>
            <button type="button" class="btn-ghost btn-sm" @click="notifications.markAllRead()">Marcar todo</button>
          </div>
          <ul v-if="notifications.list.length" class="notif-list" role="list">
            <li
              v-for="n in notifications.list.slice(0, 8)"
              :key="n.id"
              class="notif-item"
              :class="{ unread: !n.read_at }"
              role="listitem"
            >
              <button
                type="button"
                class="notif-link"
                @click="openNotification(n.id, (n.data?.campaignId as string | undefined))"
              >
                <span class="notif-title">{{ n.title }}</span>
                <span class="notif-message">{{ n.message }}</span>
              </button>
            </li>
          </ul>
          <p v-else class="notif-empty">Sin notificaciones</p>
        </div>
      </div>

      <!-- Avatar / menú de usuario -->
      <div v-if="auth.isLoggedIn" class="user-wrap">
        <button
          type="button"
          class="user-btn"
          :class="{ active: isPerfil() }"
          @click="showUserMenu = !showUserMenu; showNotifications = false"
          :aria-label="`Menú de ${auth.user?.username}`"
        >
          <span class="user-avatar">{{ auth.user?.username?.charAt(0).toUpperCase() }}</span>
          <span class="user-role-dot" :class="auth.user?.role"></span>
        </button>
        <div v-if="showUserMenu" class="user-menu dark-card">
          <div class="user-menu-header">
            <strong class="um-name">{{ auth.user?.username }}</strong>
            <span class="um-role-badge" :class="auth.user?.role">
              {{ auth.user?.role === 'dm' ? '📖 Dungeon Master' : '⚔️ Jugador' }}
            </span>
          </div>
          <hr class="runic-separator" style="margin:0.4rem 0" />
          <button type="button" class="um-item" @click="goPerfil(); showUserMenu = false">
            ⚙ Perfil y ajustes
          </button>
          <button type="button" class="um-item um-logout" @click="logout">
            ↪ Cerrar sesión
          </button>
        </div>
      </div>

      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-stone) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
.logo {
  display: flex;
  align-items: center;
}
.logo-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  text-decoration: none;
  transition: opacity var(--ease-mist);
}
.logo-btn:hover {
  opacity: 0.95;
}
.logo-btn:focus-visible {
  outline: 2px solid var(--arcane-blue);
  outline-offset: 2px;
}
.logo-icon {
  color: var(--arcane-gold);
  font-size: 1.35rem;
  text-shadow: var(--glow-gold);
  animation: shimmer 3s ease-in-out infinite;
}
.logo-btn h1 {
  font-family: var(--font-title);
  font-size: 1.5rem;
  margin: 0;
  letter-spacing: 0.2em;
  font-weight: 700;
  background: linear-gradient(135deg, var(--gold-light) 0%, var(--arcane) 45%, var(--gold-light) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 6s ease-in-out infinite;
}
@keyframes gradientShift {
  0%, 100% { background-position: 0% center; }
  50%       { background-position: 100% center; }
}
.nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.nav-link {
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  font-family: var(--font-body);
  transition: color var(--ease-mist), background var(--ease-mist), box-shadow var(--ease-mist);
}
.nav-link:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}
.nav-link.active {
  color: var(--arcane);
  background: rgba(192, 84, 40, 0.1);
  border-color: rgba(192, 84, 40, 0.2);
}
.campaign-select {
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: var(--bg-stone-elevated);
  color: var(--text-primary);
  font-family: var(--font-data);
  cursor: pointer;
  max-width: 160px;
}
.campaign-select:focus {
  outline: none;
  border-color: var(--arcane-blue);
}
.actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
}

.notif-wrap {
  position: relative;
}
.notif-btn {
  position: relative;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid var(--border-arcane);
  background: var(--bg-elevated);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.notif-count {
  position: absolute;
  top: -0.3rem;
  right: -0.3rem;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.2rem;
  border-radius: 999px;
  background: var(--danger);
  color: #fff;
  font-family: var(--font-data);
  font-size: 0.65rem;
  line-height: 1rem;
  text-align: center;
}
.notif-panel {
  position: absolute;
  top: calc(100% + 0.4rem);
  right: 0;
  width: 320px;
  max-height: 360px;
  overflow: auto;
  padding: 0.7rem;
  z-index: 20;
}
.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.notif-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.notif-item {
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
}
.notif-item.unread {
  border-color: var(--border-arcane);
  background: var(--arcane-dim);
}
.notif-link {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 0.5rem 0.55rem;
  color: inherit;
}
.notif-title {
  display: block;
  font-family: var(--font-data);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 600;
}
.notif-message {
  display: block;
  color: var(--text-muted);
  font-size: 0.82rem;
  margin-top: 0.2rem;
}
.notif-empty {
  color: var(--text-muted);
  margin: 0.4rem 0;
  font-size: 0.86rem;
}

/* ——— Menú de usuario ——— */
.user-wrap { position: relative; }

.user-btn {
  position: relative;
  width: 2.1rem; height: 2.1rem;
  border-radius: 50%;
  border: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: border-color var(--ease-quick), box-shadow var(--ease-quick);
}
.user-btn:hover, .user-btn.active {
  border-color: var(--border-arcane);
  box-shadow: var(--arcane-glow);
}
.user-avatar {
  font-family: var(--font-title);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--arcane);
}
.user-role-dot {
  position: absolute;
  bottom: 1px; right: 1px;
  width: 8px; height: 8px;
  border-radius: 50%;
  border: 1.5px solid var(--bg-elevated);
  background: var(--arcane);
}
.user-role-dot.dm { background: var(--gold-bright); }
.user-role-dot.player { background: var(--arcane); }

.user-menu {
  position: absolute;
  top: calc(100% + 0.4rem);
  right: 0;
  width: 210px;
  padding: 0.65rem;
  z-index: 20;
  border-radius: 8px;
}
.user-menu-header { padding: 0.2rem 0.4rem 0.4rem; }
.um-name { display: block; font-family: var(--font-data); font-size: 0.88rem; font-weight: 600; color: var(--text-primary); }
.um-role-badge {
  display: inline-block;
  margin-top: 0.25rem;
  font-family: var(--font-data);
  font-size: 0.72rem;
  font-weight: 500;
  padding: 0.14rem 0.5rem;
  border-radius: 99px;
  background: var(--arcane-dim);
  color: var(--arcane);
  border: 1px solid var(--border-arcane);
}
.um-role-badge.dm {
  background: var(--gold-dim);
  color: var(--gold-bright);
  border-color: var(--border-gold);
}
.um-item {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 5px;
  padding: 0.45rem 0.55rem;
  font-family: var(--font-data);
  font-size: 0.86rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--ease-quick), color var(--ease-quick);
}
.um-item:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
.um-logout { color: #e86060; }
.um-logout:hover { background: var(--danger-dim); color: var(--danger); }
</style>
