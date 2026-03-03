<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCampaignStore } from '../stores/campaigns';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const campaignsStore = useCampaignStore();

onMounted(() => {
  if (auth.isLoggedIn && campaignsStore.list.length === 0) {
    campaignsStore.fetchCampaigns();
  }
});

function goPersonajes() {
  router.push('/personajes');
}
function goCampanas() {
  router.push('/campanas');
}

const isPersonajes = () => route.path.startsWith('/personajes');
const isCampanas = () => route.path.startsWith('/campanas');
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
  background: linear-gradient(180deg, rgba(42, 32, 24, 0.98) 0%, rgba(26, 21, 16, 0.99) 100%);
  border-bottom: 2px solid var(--border-parchment);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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
  transition: opacity 0.2s ease;
}
.logo-btn:hover {
  opacity: 0.9;
}
.logo-btn:focus-visible {
  outline: 2px solid var(--accent-gold);
  outline-offset: 2px;
}
.logo-icon {
  color: var(--accent-gold);
  font-size: 1.35rem;
  text-shadow: 0 0 12px var(--accent-glow);
  animation: shimmer 3s ease-in-out infinite;
}
.logo-btn h1 {
  font-family: var(--font-title);
  font-size: 1.5rem;
  margin: 0;
  letter-spacing: 0.2em;
  color: var(--accent-gold-light);
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
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
  border-radius: 4px;
  color: var(--parchment-dark);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  font-family: var(--font-body);
  transition: color 0.2s, background 0.2s;
}
.nav-link:hover {
  color: var(--accent-gold-light);
  background: rgba(184, 134, 11, 0.1);
}
.nav-link.active {
  color: var(--accent-gold);
  background: rgba(184, 134, 11, 0.15);
}
.campaign-select {
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  border: 1px solid var(--border-parchment);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.15);
  color: var(--parchment);
  font-family: var(--font-body);
  cursor: pointer;
  max-width: 160px;
}
.campaign-select:focus {
  outline: none;
  border-color: var(--accent-gold);
}
.actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
</style>
