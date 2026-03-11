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

onMounted(() => { campaignsStore.fetchCampaigns(); });

function goCreate() { router.push('/campanas/nueva'); }
function goCampaign(id: string) { router.push(`/campanas/${id}`); }

async function confirmDelete(id: string, name: string, e: Event) {
  e.stopPropagation();
  if (!window.confirm(`¿Eliminar la campaña "${name}"? Esta acción no se puede deshacer.`)) return;
  deletingId.value = id;
  try {
    await campaignsStore.deleteCampaign(id);
  } catch (err) {
    campaignsStore.error = err instanceof Error ? err.message : 'Error al eliminar';
  } finally {
    deletingId.value = null;
  }
}

function logout() { auth.logout(); router.push('/login'); }
</script>

<template>
  <div class="page">
    <AppHeader>
      <template #actions>
        <span class="username-label">{{ auth.user?.username }}</span>
        <button type="button" class="btn-ghost btn-sm" @click="logout" aria-label="Cerrar sesión">Salir</button>
      </template>
    </AppHeader>

    <main class="main">
      <header class="page-header animate-fade-in">
        <div>
          <h2 class="page-title">Campañas</h2>
          <p class="page-subtitle">Crea mundos como Máster o únete a aventuras como jugador.</p>
        </div>
        <button type="button" class="btn-gold btn-lg create-btn" @click="goCreate" aria-label="Crear nueva campaña">
          <span aria-hidden="true">+</span> Nueva campaña
        </button>
      </header>

      <hr class="runic-separator" />

      <div v-if="campaignsStore.error" class="error-banner animate-fade-in" role="alert">{{ campaignsStore.error }}</div>

      <div v-else-if="campaignsStore.loading" class="loader-wrap" aria-live="polite">
        <div class="loader"></div>
        <p>Cargando campañas...</p>
      </div>

      <div v-else-if="campaignsStore.list.length === 0" class="empty-state dark-card animate-fade-in">
        <div class="empty-icon" aria-hidden="true">⚔</div>
        <h3 class="empty-title">El mapa está en blanco</h3>
        <p class="empty-desc">Crea una campaña como Máster o pide a tu DM que te invite.</p>
        <button type="button" class="btn-gold btn-lg" @click="goCreate">Crear campaña</button>
      </div>

      <ul v-else class="campaign-list" role="list">
        <li
          v-for="(c, i) in campaignsStore.list"
          :key="c.id"
          class="campaign-card dark-card"
          :style="{ animationDelay: `${i * 0.07}s` }"
          role="listitem"
          tabindex="0"
          :aria-label="`Campaña ${c.name}, rol: ${c.role === 'master' ? 'Máster' : 'Jugador'}`"
          @click="goCampaign(c.id)"
          @keydown.enter="goCampaign(c.id)"
          @keydown.space.prevent="goCampaign(c.id)"
        >
          <div class="card-accent" :class="c.role" aria-hidden="true"></div>
          <div class="campaign-card-body">
            <div class="campaign-icon" aria-hidden="true">{{ c.role === 'master' ? '♛' : '⚔' }}</div>
            <div class="campaign-info">
              <div class="campaign-title-row">
                <h3 class="campaign-name">{{ c.name }}</h3>
                <span class="badge" :class="c.role === 'master' ? 'badge-gold' : 'badge-arcane'">
                  {{ c.role === 'master' ? 'Máster' : 'Jugador' }}
                </span>
              </div>
              <p v-if="c.description" class="campaign-desc">{{ c.description }}</p>
            </div>
            <div class="campaign-actions" @click.stop role="group" :aria-label="`Acciones para ${c.name}`">
              <button type="button" class="btn-arc btn-sm" @click="goCampaign(c.id)" :aria-label="`Ver campaña ${c.name}`">
                Ver campaña
              </button>
              <button
                v-if="c.role === 'master'"
                type="button"
                class="btn-danger btn-sm"
                :disabled="deletingId === c.id"
                :aria-label="`Eliminar campaña ${c.name}`"
                @click="confirmDelete(c.id, c.name, $event)"
              >
                {{ deletingId === c.id ? '…' : '✕' }}
              </button>
            </div>
          </div>
        </li>
      </ul>
    </main>
  </div>
</template>

<style scoped>
.main {
  flex: 1;
  padding: 2rem 1.5rem;
  max-width: 940px;
  margin: 0 auto;
  width: 100%;
}
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.page-title { font-size: 1.75rem; margin: 0 0 0.3rem 0; }
.page-subtitle { color: var(--text-muted); margin: 0; font-size: 0.95rem; }
.create-btn {
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-title);
  letter-spacing: 0.06em;
}
.username-label { font-family: var(--font-data); font-size: 0.88rem; color: var(--text-muted); }
.empty-state { text-align: center; padding: 4rem 2rem; max-width: 400px; margin: 2rem auto; }
.empty-icon { font-size: 2.5rem; opacity: 0.3; display: block; margin-bottom: 1rem; }
.empty-title { font-size: 1.3rem; margin: 0 0 0.5rem 0; }
.empty-desc { color: var(--text-muted); margin: 0 0 1.5rem 0; }

/* Lista */
.campaign-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
.campaign-card {
  position: relative;
  cursor: pointer;
  overflow: hidden;
  animation: cardIn 0.45s var(--ease-out) both;
}
.campaign-card:focus-visible { outline: 2px solid var(--arcane); outline-offset: 2px; }
.campaign-card:hover { transform: translateY(-2px); }

.card-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  transition: opacity var(--ease-out);
}
.card-accent.master {
  background: linear-gradient(90deg, transparent, var(--gold-dim), var(--gold), var(--gold-dim), transparent);
}
.card-accent.player {
  background: linear-gradient(90deg, transparent, var(--arcane-dim), var(--arcane), var(--arcane-dim), transparent);
}

.campaign-card-body {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.1rem 1.4rem;
}
.campaign-icon {
  font-size: 1.5rem;
  width: 2.75rem; height: 2.75rem;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-gold);
  border-radius: 8px;
  flex-shrink: 0;
  transition: background var(--ease-out), box-shadow var(--ease-out);
}
.campaign-card:hover .campaign-icon { background: rgba(192, 84, 40, 0.12); box-shadow: var(--arcane-glow); }
.campaign-info { flex: 1; min-width: 0; }
.campaign-title-row { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.3rem; flex-wrap: wrap; }
.campaign-name {
  font-family: var(--font-title);
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.campaign-desc {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.campaign-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }

@media (max-width: 540px) {
  .campaign-card-body { flex-wrap: wrap; }
  .campaign-actions { width: 100%; justify-content: flex-end; }
}
</style>
