<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCampaignStore } from '../stores/campaigns';
import { api } from '../api/client';
import type { CharacterListItemDto } from '../types/api';
import AppHeader from '../components/AppHeader.vue';
import ContextHelp from '../components/ContextHelp.vue';

const router = useRouter();
const auth = useAuthStore();
const campaignsStore = useCampaignStore();

const characters = ref<CharacterListItemDto[]>([]);
const loading = ref(true);
const error = ref('');
const searchQuery = ref('');
const campaignFilter = ref<string>('');
const deletingId = ref<string | null>(null);
const showOnboarding = ref(false);
const ONBOARDING_KEY = 'arcanum_onboarding_v1_done';

const filteredCharacters = computed(() => {
  let list = characters.value;
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((c) => {
      const name = (c.name_es || c.name_en || '').toLowerCase();
      return name.includes(q) || className(c.class_id).toLowerCase().includes(q) || raceName(c.race_id).toLowerCase().includes(q);
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
  try {
    showOnboarding.value = localStorage.getItem(ONBOARDING_KEY) !== '1';
  } catch {
    showOnboarding.value = false;
  }
  campaignsStore.fetchCampaigns();
  loadCharacters();
});

function goCreate() { router.push('/personajes/nuevo'); }
function goCharacter(id: string) { router.push(`/personajes/${id}`); }
function goPlay(id: string) { router.push(`/personajes/${id}/partida`); }

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

function logout() { auth.logout(); router.push('/login'); }

function closeOnboarding() {
  showOnboarding.value = false;
  localStorage.setItem(ONBOARDING_KEY, '1');
}

function onboardingGoCreateCharacter() {
  closeOnboarding();
  router.push('/personajes/nuevo');
}

function onboardingGoCreateCampaign() {
  closeOnboarding();
  router.push('/campanas/nueva');
}

function onboardingGoSpells() {
  closeOnboarding();
  router.push('/hechizos');
}

const classIcons: Record<string, string> = {
  barbarian: '⚔', bard: '♪', cleric: '✝', druid: '🌿', fighter: '🛡',
  monk: '☯', paladin: '✦', ranger: '🏹', rogue: '🗡', sorcerer: '✧',
  warlock: '◈', wizard: '⚡', artificer: '⚙',
};
const classNames: Record<string, string> = {
  barbarian: 'Bárbaro', bard: 'Bardo', cleric: 'Clérigo', druid: 'Druida', fighter: 'Guerrero',
  monk: 'Monje', paladin: 'Paladín', ranger: 'Guardabosques', rogue: 'Pícaro', sorcerer: 'Hechicero',
  warlock: 'Brujo', wizard: 'Mago', artificer: 'Artífice',
};
const raceNames: Record<string, string> = {
  human: 'Humano', elf: 'Elfo', dwarf: 'Enano', halfling: 'Mediano', dragonborn: 'Dracónido',
  gnome: 'Gnomo', 'half-orc': 'Semiorco', tiefling: 'Tiefling', 'half-elf': 'Semielfo',
  genasi: 'Genasi', warforged: 'Forjado', goliath: 'Goliath', tabaxi: 'Tabaxi',
};
function className(id: string) { return classNames[id] || id; }
function classIcon(id: string) { return classIcons[id] || '◇'; }
function raceName(id: string) { return raceNames[id] || id; }
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
      <ContextHelp
        title="Primeros pasos recomendados"
        :tips="[
          'Crea personaje para empezar tu hoja de juego.',
          'Filtra por campaña para organizar mejor tus fichas.',
          'Entra en En partida para gestionar vida, inventario e iniciativa.'
        ]"
        compact
      />
      <!-- Cabecera de sección -->
      <header class="page-header animate-fade-in">
        <div class="page-header-text">
          <h2 class="page-title">Mis personajes</h2>
          <p class="page-subtitle">Gestiona tus fichas de D&amp;D 5e y llévalas a la partida.</p>
        </div>
        <button type="button" class="btn-gold btn-lg create-btn" @click="goCreate" aria-label="Crear nuevo personaje">
          <span aria-hidden="true">+</span> Nuevo personaje
        </button>
      </header>

      <hr class="runic-separator" />

      <!-- Barra de filtros (solo si hay personajes) -->
      <div v-if="!loading && characters.length > 0" class="toolbar animate-fade-in">
        <div class="search-wrap">
          <span class="search-icon" aria-hidden="true">◇</span>
          <input
            v-model="searchQuery"
            type="search"
            class="search-input"
            placeholder="Buscar por nombre, clase o raza..."
            aria-label="Buscar personajes"
          />
        </div>
        <select
          v-if="campaignsStore.list.length > 0"
          v-model="campaignFilter"
          class="campaign-select"
          aria-label="Filtrar por campaña"
        >
          <option value="">Todas las campañas</option>
          <option v-for="c in campaignsStore.list" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <!-- Error -->
      <div v-if="error" class="error-banner animate-fade-in" role="alert">{{ error }}</div>

      <!-- Cargando -->
      <div v-else-if="loading" class="loader-wrap" aria-live="polite">
        <div class="loader"></div>
        <p>Invocando tus aventureros...</p>
      </div>

      <!-- Sin personajes -->
      <div v-else-if="characters.length === 0" class="empty-state dark-card animate-fade-in">
        <div class="empty-icon" aria-hidden="true">◈</div>
        <h3 class="empty-title">El grimorio está vacío</h3>
        <p class="empty-desc">Crea tu primer personaje y empieza tu aventura.</p>
        <button type="button" class="btn-arc btn-lg" @click="goCreate">Crear personaje</button>
      </div>

      <!-- Sin resultados de búsqueda -->
      <div v-else-if="filteredCharacters.length === 0" class="empty-state dark-card animate-fade-in">
        <div class="empty-icon" aria-hidden="true">◇</div>
        <p class="empty-desc">Ningún personaje coincide con la búsqueda.</p>
        <button type="button" class="btn-ghost" @click="searchQuery = ''; campaignFilter = ''">Limpiar filtros</button>
      </div>

      <!-- Lista de personajes -->
      <ul v-else class="char-list" role="list">
        <li
          v-for="(c, i) in filteredCharacters"
          :key="c.id"
          class="char-card dark-card"
          :style="{ animationDelay: `${i * 0.06}s` }"
          role="listitem"
          tabindex="0"
          :aria-label="`${c.name_es || c.name_en}, nivel ${c.level} ${className(c.class_id)}`"
          @click="goCharacter(c.id)"
          @keydown.enter="goCharacter(c.id)"
          @keydown.space.prevent="goCharacter(c.id)"
        >
          <!-- Barra de acento superior -->
          <div class="card-accent" aria-hidden="true"></div>

          <div class="char-card-body">
            <!-- Icono de clase y datos -->
            <div class="char-icon" aria-hidden="true">{{ classIcon(c.class_id) }}</div>

            <div class="char-info">
              <h3 class="char-name">{{ c.name_es || c.name_en }}</h3>
              <p class="char-meta">
                <span class="char-level badge badge-arcane">Nv. {{ c.level }}</span>
                <span class="char-class">{{ className(c.class_id) }}</span>
                <span class="char-sep" aria-hidden="true">·</span>
                <span class="char-race">{{ raceName(c.race_id) }}</span>
                <span v-if="c.campaign_id" class="badge badge-gold" :title="campaignName(c.campaign_id)">
                  {{ campaignName(c.campaign_id) }}
                </span>
              </p>
            </div>

            <!-- Acciones -->
            <div class="char-actions" @click.stop role="group" :aria-label="`Acciones para ${c.name_es || c.name_en}`">
              <button
                type="button"
                class="btn-ghost btn-sm"
                @click="goCharacter(c.id)"
                :aria-label="`Ver ficha de ${c.name_es || c.name_en}`"
              >
                Ficha
              </button>
              <button
                type="button"
                class="btn-arc btn-sm"
                @click="goPlay(c.id)"
                :aria-label="`Llevar a partida a ${c.name_es || c.name_en}`"
              >
                En partida
              </button>
              <button
                type="button"
                class="btn-danger btn-sm"
                :disabled="deletingId === c.id"
                :aria-label="`Eliminar a ${c.name_es || c.name_en}`"
                @click="confirmDelete(c, $event)"
              >
                {{ deletingId === c.id ? '…' : '✕' }}
              </button>
            </div>
          </div>
        </li>
      </ul>

      <Teleport to="body">
        <div v-if="showOnboarding" class="onboarding-backdrop" @click.self="closeOnboarding">
          <div class="onboarding-modal dark-card" role="dialog" aria-modal="true" aria-label="Onboarding inicial">
            <h3 class="onboarding-title">Bienvenido a ARCANUM</h3>
            <p class="onboarding-text">
              Configura tu flujo en menos de 1 minuto: personaje, campaña y grimorio.
            </p>
            <div class="onboarding-actions">
              <button type="button" class="btn-gold" @click="onboardingGoCreateCharacter">Crear personaje</button>
              <button type="button" class="btn-arc" @click="onboardingGoCreateCampaign">Crear campaña</button>
              <button type="button" class="btn-ghost" @click="onboardingGoSpells">Abrir hechizos</button>
            </div>
            <button type="button" class="btn-ghost btn-sm onboarding-close" @click="closeOnboarding">
              Omitir por ahora
            </button>
          </div>
        </div>
      </Teleport>
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

/* Cabecera */
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0;
  flex-wrap: wrap;
}
.page-title {
  font-size: 1.75rem;
  margin: 0 0 0.3rem 0;
}
.page-subtitle {
  color: var(--text-muted);
  margin: 0;
  font-size: 0.95rem;
}
.create-btn {
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-title);
  letter-spacing: 0.06em;
}

/* Barra de filtros */
.toolbar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
}
.search-wrap {
  position: relative;
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 0.85rem;
  color: var(--arcane);
  font-size: 0.85rem;
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding-left: 2.25rem;
}
.campaign-select {
  min-width: 160px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2360a5fa' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2rem;
}

/* Nombre de usuario en header */
.username-label {
  font-family: var(--font-data);
  font-size: 0.88rem;
  color: var(--text-muted);
  padding: 0.3rem 0;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  max-width: 400px;
  margin: 2rem auto;
}
.empty-icon {
  font-size: 2.5rem;
  color: var(--arcane);
  opacity: 0.4;
  display: block;
  margin-bottom: 1rem;
}
.empty-title {
  font-size: 1.3rem;
  margin: 0 0 0.5rem 0;
}
.empty-desc {
  color: var(--text-muted);
  margin: 0 0 1.5rem 0;
}

/* Lista */
.char-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Tarjeta de personaje */
.char-card {
  position: relative;
  cursor: pointer;
  overflow: hidden;
  animation: cardIn 0.45s var(--ease-out) both;
}
.char-card:hover {
  transform: translateY(-2px);
}
.char-card:focus-visible {
  outline: 2px solid var(--arcane);
  outline-offset: 2px;
}

.card-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--arcane-dim), var(--arcane), var(--arcane-dim), transparent);
  transition: opacity var(--ease-out);
}
.char-card:hover .card-accent {
  background: linear-gradient(90deg, transparent, rgba(45,212,191,0.3), var(--arcane), rgba(45,212,191,0.3), transparent);
}

.char-card-body {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.1rem 1.4rem;
}

.char-icon {
  font-size: 1.6rem;
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(45, 212, 191, 0.07);
  border: 1px solid var(--border-arcane);
  border-radius: 8px;
  flex-shrink: 0;
  transition: background var(--ease-out), box-shadow var(--ease-out);
}
.char-card:hover .char-icon {
  background: rgba(45, 212, 191, 0.1);
  box-shadow: none;
}

.char-info {
  flex: 1;
  min-width: 0;
}
.char-name {
  font-family: var(--font-title);
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-primary);
  margin: 0 0 0.35rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.char-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  flex-wrap: wrap;
  font-family: var(--font-data);
  font-size: 0.85rem;
}
.char-level { margin-right: 0.1rem; }
.char-class { color: var(--text-primary); font-weight: 500; }
.char-sep { color: var(--text-faint); }
.char-race { color: var(--text-muted); }

.char-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
  align-items: center;
}

.onboarding-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  z-index: 999;
}
.onboarding-modal {
  width: 100%;
  max-width: 520px;
  padding: 1.25rem 1.25rem 1rem 1.25rem;
}
.onboarding-title {
  margin: 0 0 0.4rem 0;
  font-size: 1.25rem;
}
.onboarding-text {
  margin: 0 0 0.9rem 0;
  color: var(--text-muted);
}
.onboarding-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.onboarding-close {
  margin-top: 0.7rem;
}

@media (max-width: 540px) {
  .char-card-body { flex-wrap: wrap; }
  .char-actions { width: 100%; justify-content: flex-end; }
  .page-header { flex-direction: column; align-items: flex-start; }
}
</style>
