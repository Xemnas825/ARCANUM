<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCampaignStore } from '../stores/campaigns';
import AppHeader from '../components/AppHeader.vue';

const router = useRouter();
const auth = useAuthStore();
const campaignsStore = useCampaignStore();
const deletingId = ref<string | null>(null);

onMounted(() => {
  campaignsStore.fetchCampaigns();
});

function goCreate() {
  router.push('/campanas/nueva');
}

function goCampaign(id: string) {
  router.push(`/campanas/${id}`);
}

async function confirmDelete(id: string, name: string, e: Event) {
  e.stopPropagation();
  if (!window.confirm(`¿Eliminar la campaña "${name}"? Se eliminarán también los datos de la campaña. Esta acción no se puede deshacer.`)) return;
  deletingId.value = id;
  try {
    await campaignsStore.deleteCampaign(id);
  } catch (err) {
    campaignsStore.error = err instanceof Error ? err.message : 'Error al eliminar';
  } finally {
    deletingId.value = null;
  }
}

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="page">
    <AppHeader>
      <template #actions>
        <span class="username">{{ auth.user?.username }}</span>
        <button type="button" class="btn ghost" @click="logout">Salir</button>
      </template>
    </AppHeader>

    <main class="main">
      <section class="hero parchment-panel">
        <div class="hero-ornament">※</div>
        <div class="hero-content">
          <h2>Mis campañas</h2>
          <p class="hero-text">Crea campañas como Master e invita jugadores, o únete a partidas como jugador.</p>
          <button type="button" class="btn primary btn-hero" @click="goCreate">
            <span class="btn-icon">+</span>
            Nueva campaña
          </button>
        </div>
        <div class="hero-ornament">※</div>
      </section>

      <p v-if="campaignsStore.error" class="error">{{ campaignsStore.error }}</p>

      <div v-else-if="campaignsStore.loading" class="loading-wrap">
        <div class="loader"></div>
        <p>Cargando campañas...</p>
      </div>

      <div v-else-if="campaignsStore.list.length === 0" class="empty parchment-panel">
        <div class="empty-icon">⚔</div>
        <h3>Aún no tienes campañas</h3>
        <p>Crea una campaña como Master o pide a tu DM que te invite.</p>
        <button type="button" class="btn primary" @click="goCreate">Crear campaña</button>
      </div>

      <ul v-else class="list">
        <li
          v-for="(c, i) in campaignsStore.list"
          :key="c.id"
          class="card parchment-panel"
          :style="{ animationDelay: `${i * 0.07}s` }"
          @click="goCampaign(c.id)"
        >
          <div class="card-ribbon"></div>
          <div class="card-body">
            <span class="name">{{ c.name }}</span>
            <span class="role-badge" :class="c.role">{{ c.role === 'master' ? 'Master' : 'Jugador' }}</span>
            <p v-if="c.description" class="description">{{ c.description }}</p>
            <div class="card-actions">
              <button type="button" class="btn card-btn primary" @click.stop="goCampaign(c.id)">Ver campaña</button>
              <button
                v-if="c.role === 'master'"
                type="button"
                class="btn card-btn danger"
                :disabled="deletingId === c.id"
                :aria-label="`Eliminar campaña ${c.name}`"
                @click.stop="confirmDelete(c.id, c.name, $event)"
              >
                {{ deletingId === c.id ? '…' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </li>
      </ul>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.username {
  color: var(--parchment-dark);
  font-size: 0.95rem;
}
.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family: var(--font-body);
}
.btn.primary {
  background: linear-gradient(180deg, var(--accent-gold-light) 0%, var(--accent-gold) 100%);
  color: var(--ink);
  border: 1px solid var(--parchment-shadow);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.2), inset 0 1px 0 rgba(255,255,255,0.3);
}
.btn.primary:hover {
  box-shadow: 0 4px 14px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.3);
}
.btn.ghost {
  background: transparent;
  color: var(--parchment-dark);
  border: 1px solid transparent;
}
.btn.ghost:hover {
  color: var(--parchment);
  border-color: var(--border-parchment);
}
.main {
  flex: 1;
  padding: 2rem 1.5rem;
  max-width: 920px;
  margin: 0 auto;
  width: 100%;
}
.hero {
  margin-bottom: 2.5rem;
  padding: 2rem 2.5rem;
  position: relative;
  animation: fadeIn 0.6s ease;
}
.hero-ornament {
  position: absolute;
  top: 1rem;
  color: var(--accent-gold);
  opacity: 0.5;
  font-size: 1rem;
}
.hero-ornament:first-of-type { left: 1.5rem; }
.hero-ornament:last-of-type { right: 1.5rem; }
.hero-content h2 {
  font-family: var(--font-title);
  margin: 0 0 0.5rem 0;
  font-size: 1.6rem;
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 0.08em;
}
.hero-text {
  margin: 0 0 1.5rem 0;
  color: var(--ink-muted);
  font-size: 1.05rem;
}
.btn-hero {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1.05rem;
}
.btn-icon {
  font-size: 1.2rem;
  line-height: 1;
}
.loading-wrap {
  text-align: center;
  padding: 3rem;
  color: var(--ink-muted);
  animation: fadeIn 0.4s ease;
}
.loader {
  width: 44px;
  height: 44px;
  margin: 0 auto 1rem;
  border: 3px solid var(--parchment-shadow);
  border-top-color: var(--accent-gold);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.empty {
  text-align: center;
  padding: 3rem 2rem;
  animation: fadeIn 0.5s ease;
}
.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.8;
}
.empty h3 {
  font-family: var(--font-title);
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: var(--ink);
  font-weight: 600;
}
.empty p {
  margin: 0 0 1.5rem 0;
  color: var(--ink-muted);
  font-size: 1rem;
}
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.card {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  animation: cardIn 0.45s ease backwards;
}
@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow: var(--shadow-float, 0 8px 24px rgba(0,0,0,0.15)), 0 0 0 1px var(--accent-gold);
}
.card-ribbon {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--accent-gold), transparent);
  opacity: 0.6;
}
.card-body {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.name {
  font-family: var(--font-title);
  font-weight: 600;
  font-size: 1.2rem;
  color: var(--ink);
  letter-spacing: 0.03em;
}
.role-badge {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  align-self: flex-start;
}
.role-badge.master {
  background: rgba(184, 134, 11, 0.2);
  color: var(--accent-gold);
  border: 1px solid var(--accent-gold);
}
.role-badge.player {
  background: rgba(44, 24, 16, 0.1);
  color: var(--ink-muted);
  border: 1px solid var(--border-parchment);
}
.description {
  margin: 0;
  font-size: 0.95rem;
  color: var(--ink-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.card-btn {
  padding: 0.4rem 0.9rem;
  font-size: 0.9rem;
  background: rgba(44, 24, 16, 0.08);
  color: var(--ink);
  border: 1px solid var(--border-parchment);
}
.card-btn:hover {
  background: rgba(44, 24, 16, 0.12);
  border-color: var(--accent-gold);
  color: var(--accent-gold);
}
.card-btn.primary {
  background: linear-gradient(180deg, rgba(184, 134, 11, 0.25) 0%, rgba(184, 134, 11, 0.15) 100%);
  color: var(--accent-gold);
  border-color: var(--accent-gold);
}
.card-btn.primary:hover {
  background: linear-gradient(180deg, rgba(184, 134, 11, 0.35) 0%, rgba(184, 134, 11, 0.2) 100%);
  box-shadow: 0 2px 8px var(--accent-glow);
}
.card-btn.danger {
  background: rgba(183, 28, 28, 0.08);
  color: #b71c1c;
  border-color: rgba(183, 28, 28, 0.3);
}
.card-btn.danger:hover:not(:disabled) {
  background: rgba(183, 28, 28, 0.15);
  border-color: #b71c1c;
}
.card-btn.danger:disabled {
  opacity: 0.7;
}
.error {
  color: #b71c1c;
  text-align: center;
  padding: 1rem;
  background: rgba(183, 28, 28, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(183, 28, 28, 0.3);
}
</style>
