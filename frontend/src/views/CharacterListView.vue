<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCampaignStore } from '../stores/campaigns';
import { api } from '../api/client';
import type { CharacterListItemDto } from '../types/api';
import AppHeader from '../components/AppHeader.vue';

const router = useRouter();
const auth = useAuthStore();
const campaignsStore = useCampaignStore();

const characters = ref<CharacterListItemDto[]>([]);
const loading = ref(true);
const error = ref('');
const searchQuery = ref('');
const campaignFilter = ref<string>('');
const deletingId = ref<string | null>(null);

const filteredCharacters = computed(() => {
  let list = characters.value;
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((c) => {
      const name = (c.name_es || c.name_en || '').toLowerCase();
      const cls = className(c.class_id).toLowerCase();
      const race = raceName(c.race_id).toLowerCase();
      return name.includes(q) || cls.includes(q) || race.includes(q);
    });
  }
  if (campaignFilter.value) {
    list = list.filter((c) => c.campaign_id === campaignFilter.value);
  }
  return list;
});

const campaignName = (id: string) => campaignsStore.list.find((c) => c.id === id)?.name ?? 'Campaña';

async function loadCharacters() {
  if (!auth.user) return;
  loading.value = true;
  error.value = '';
  try {
    characters.value = await api.get<CharacterListItemDto[]>(`/users/${auth.user.id}/characters`);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar personajes';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  campaignsStore.fetchCampaigns();
  loadCharacters();
});

function goCreate() {
  router.push('/personajes/nuevo');
}

function goCharacter(id: string) {
  router.push(`/personajes/${id}`);
}

function goPlay(id: string) {
  router.push(`/personajes/${id}/partida`);
}

async function confirmDelete(c: CharacterListItemDto, e: Event) {
  e.stopPropagation();
  const name = c.name_es || c.name_en || 'este personaje';
  if (!window.confirm(`¿Eliminar a "${name}"? Esta acción no se puede deshacer.`)) return;
  deletingId.value = c.id;
  try {
    await api.delete(`/characters/${c.id}`);
    characters.value = characters.value.filter((ch) => ch.id !== c.id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error al eliminar';
  } finally {
    deletingId.value = null;
  }
}

function logout() {
  auth.logout();
  router.push('/login');
}

const classNames: Record<string, string> = {
  barbarian: 'Bárbaro', bard: 'Bardo', cleric: 'Clérigo', druid: 'Druida', fighter: 'Guerrero',
  monk: 'Monje', paladin: 'Paladín', ranger: 'Guardabosques', rogue: 'Pícaro', sorcerer: 'Hechicero',
  warlock: 'Brujo', wizard: 'Mago', artificer: 'Artífice',
};
const raceNames: Record<string, string> = {
  human: 'Humano', elf: 'Elfo', dwarf: 'Enano', halfling: 'Mediano', dragonborn: 'Dracónido',
  gnome: 'Gnomo', 'half-orc': 'Semiorco', tiefling: 'Tiefling', 'half-elf': 'Semielfo',
  genasi: 'Genasi', warforged: 'Forjado', goliath: 'Goliath', tabaxi: 'Tabaxi', kenku: 'Kenku',
  aarakocra: 'Aarakocra',
};
function className(id: string) {
  return classNames[id] || id;
}
function raceName(id: string) {
  return raceNames[id] || id;
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
          <h2>Mis personajes</h2>
          <p class="hero-text">Gestiona tus fichas de D&D 5e y llévalas a la partida.</p>
          <button type="button" class="btn primary btn-hero" @click="goCreate">
            <span class="btn-icon">+</span>
            Nuevo personaje
          </button>
        </div>
        <div class="hero-ornament">※</div>
      </section>

      <div v-if="!loading && characters.length > 0" class="toolbar">
        <input
          v-model="searchQuery"
          type="search"
          class="search-input"
          placeholder="Buscar por nombre, clase o raza..."
          aria-label="Buscar personajes"
        />
        <select v-model="campaignFilter" class="search-input campaign-filter" aria-label="Filtrar por campaña">
          <option value="">Todas las campañas</option>
          <option v-for="c in campaignsStore.list" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button type="button" class="btn ghost btn-sm" @click="loadCharacters" title="Refrescar lista">
          Actualizar
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div v-else-if="loading" class="loading-wrap">
        <div class="loader"></div>
        <p>Cargando personajes...</p>
      </div>

      <div v-else-if="characters.length === 0" class="empty parchment-panel">
        <div class="empty-icon">📜</div>
        <h3>Aún no tienes personajes</h3>
        <p>Crea tu primera ficha para empezar a jugar.</p>
        <button type="button" class="btn primary" @click="goCreate">Crear personaje</button>
      </div>

      <div v-else-if="filteredCharacters.length === 0" class="empty parchment-panel">
        <p>Ningún personaje coincide con la búsqueda.</p>
        <button type="button" class="btn ghost" @click="searchQuery = ''">Limpiar búsqueda</button>
      </div>

      <ul v-else class="list">
        <li
          v-for="(c, i) in filteredCharacters"
          :key="c.id"
          class="card parchment-panel"
          :style="{ animationDelay: `${i * 0.07}s` }"
          @click="goCharacter(c.id)"
        >
          <div class="card-ribbon"></div>
          <div class="card-body">
            <span class="name">{{ c.name_es || c.name_en }}</span>
            <span class="meta">
              <span class="level">Nivel {{ c.level }}</span>
              <span class="dot">·</span>
              <span>{{ className(c.class_id) }}</span>
              <span class="dot">·</span>
              <span class="race">{{ raceName(c.race_id) }}</span>
              <span v-if="c.campaign_id" class="campaign-badge" :title="campaignName(c.campaign_id)">Campaña</span>
            </span>
            <div class="card-actions">
              <button type="button" class="btn card-btn" @click.stop="goCharacter(c.id)">Ficha</button>
              <button type="button" class="btn card-btn primary" @click.stop="goPlay(c.id)">En partida</button>
              <button
                type="button"
                class="btn card-btn danger"
                :disabled="deletingId === c.id"
                :aria-label="`Eliminar a ${c.name_es || c.name_en}`"
                @click.stop="confirmDelete(c, $event)"
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
  filter: grayscale(0.2);
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
  box-shadow: var(--shadow-float), 0 0 0 1px var(--accent-gold);
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
.meta {
  font-size: 0.95rem;
  color: var(--ink-muted);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.level {
  color: var(--accent-gold);
  font-weight: 600;
}
.dot {
  opacity: 0.6;
}
.race {
  text-transform: capitalize;
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
.toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.search-input {
  flex: 1;
  min-width: 200px;
  padding: 0.6rem 1rem;
  border: 1px solid var(--border-parchment);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.6);
  color: var(--ink);
  font-size: 1rem;
  font-family: var(--font-body);
}
.search-input::placeholder {
  color: var(--ink-muted);
}
.search-input:focus {
  outline: none;
  border-color: var(--accent-gold);
  box-shadow: 0 0 0 2px var(--accent-glow);
}
.campaign-filter {
  min-width: 160px;
}
.campaign-badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.4rem;
  background: rgba(184, 134, 11, 0.2);
  color: var(--accent-gold);
  border-radius: 4px;
  margin-left: 0.25rem;
}
.btn-sm {
  padding: 0.4rem 0.75rem;
  font-size: 0.9rem;
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
