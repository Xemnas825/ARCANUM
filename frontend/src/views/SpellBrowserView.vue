<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useCampaignStore } from '../stores/campaigns';
import { pathWithCampaign } from '../stores/campaigns';
import { api } from '../api/client';
import type { SpellDto } from '../types/api';
import AppHeader from '../components/AppHeader.vue';
import ContextHelp from '../components/ContextHelp.vue';

const campaignsStore = useCampaignStore();
const spells = ref<SpellDto[]>([]);
const loading = ref(true);
const error = ref('');
const searchQuery = ref('');
const levelFilter = ref<number | 'all'>('all');
const selectedSpell = ref<SpellDto | null>(null);
const quickFilter = ref<'all' | 'favorites' | 'prepared'>('all');

const favoriteSpellIds = ref<string[]>([]);
const preparedSpellIds = ref<string[]>([]);

const FAVORITES_KEY = 'arcanum_spells_favorites';
const PREPARED_KEY = 'arcanum_spells_prepared';

const filteredSpells = computed(() => {
  let list = [...spells.value];
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (s) =>
        (s.nameEs || '').toLowerCase().includes(q) ||
        (s.nameEn || '').toLowerCase().includes(q) ||
        (s.school || '').toLowerCase().includes(q)
    );
  }
  if (levelFilter.value !== 'all') {
    list = list.filter((s) => s.level === levelFilter.value);
  }
  if (quickFilter.value === 'favorites') {
    list = list.filter((s) => favoriteSpellIds.value.includes(s.id));
  } else if (quickFilter.value === 'prepared') {
    list = list.filter((s) => preparedSpellIds.value.includes(s.id));
  }
  list.sort((a, b) => {
    const favA = favoriteSpellIds.value.includes(a.id) ? 1 : 0;
    const favB = favoriteSpellIds.value.includes(b.id) ? 1 : 0;
    if (favA !== favB) return favB - favA;
    return (a.nameEs || a.nameEn || '').localeCompare(b.nameEs || b.nameEn || '');
  });
  return list;
});

async function loadSpells() {
  loading.value = true;
  error.value = '';
  try {
    const path = pathWithCampaign('/spells', campaignsStore.activeCampaignId ?? undefined);
    spells.value = await api.get<SpellDto[]>(path);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar hechizos';
    spells.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  try {
    favoriteSpellIds.value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    preparedSpellIds.value = JSON.parse(localStorage.getItem(PREPARED_KEY) || '[]');
  } catch {
    favoriteSpellIds.value = [];
    preparedSpellIds.value = [];
  }
  campaignsStore.fetchCampaigns();
  loadSpells();
});

watch(
  () => campaignsStore.activeCampaignId,
  () => {
    loadSpells();
  }
);

function levelLabel(level: number) {
  return level === 0 ? 'Trucos' : `Nivel ${level}`;
}

function openDetail(spell: SpellDto) {
  selectedSpell.value = spell;
}

function closeDetail() {
  selectedSpell.value = null;
}

function saveSpellPreferences() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteSpellIds.value));
  localStorage.setItem(PREPARED_KEY, JSON.stringify(preparedSpellIds.value));
}

function isFavorite(id: string) {
  return favoriteSpellIds.value.includes(id);
}

function isPrepared(id: string) {
  return preparedSpellIds.value.includes(id);
}

function toggleFavorite(id: string) {
  favoriteSpellIds.value = isFavorite(id)
    ? favoriteSpellIds.value.filter((x) => x !== id)
    : [...favoriteSpellIds.value, id];
  saveSpellPreferences();
}

function togglePrepared(id: string) {
  preparedSpellIds.value = isPrepared(id)
    ? preparedSpellIds.value.filter((x) => x !== id)
    : [...preparedSpellIds.value, id];
  saveSpellPreferences();
}
</script>

<template>
  <div class="page">
    <AppHeader />

    <main class="main spell-main">
      <header class="browser-header">
        <h1 class="browser-title">Buscador de hechizos</h1>
        <p class="browser-subtitle">Consulta el grimorio arcano. El contenido de tu campaña activa se incluye si está seleccionada.</p>
      </header>
      <ContextHelp
        title="Guía rápida de hechizos"
        :tips="[
          'Marca favoritos para tener tus conjuros clave siempre arriba.',
          'Usa Preparados para separar lo que llevas hoy a mesa.',
          'Filtra por nivel + texto para encontrar hechizos en segundos.'
        ]"
        compact
      />

      <div v-if="loading" class="loading-wrap">
        <div class="loader"></div>
        <p>Cargando hechizos...</p>
      </div>
      <p v-else-if="error" class="error-msg">{{ error }}</p>
      <template v-else>
        <div class="toolbar dark-card">
          <div class="search-wrap">
            <span class="search-icon" aria-hidden="true">◇</span>
            <input
              v-model="searchQuery"
              type="search"
              class="search-input"
              placeholder="Buscar por nombre o escuela..."
              aria-label="Buscar hechizos"
            />
          </div>
          <div class="quick-filters">
            <button
              type="button"
              class="filter-chip"
              :class="{ active: quickFilter === 'all' }"
              @click="quickFilter = 'all'"
            >Todos</button>
            <button
              type="button"
              class="filter-chip"
              :class="{ active: quickFilter === 'favorites' }"
              @click="quickFilter = 'favorites'"
            >Favoritos ★</button>
            <button
              type="button"
              class="filter-chip"
              :class="{ active: quickFilter === 'prepared' }"
              @click="quickFilter = 'prepared'"
            >Preparados ✓</button>
          </div>
          <div class="level-filters">
            <button
              type="button"
              class="filter-chip"
              :class="{ active: levelFilter === 'all' }"
              @click="levelFilter = 'all'"
            >
              Todos
            </button>
            <button
              v-for="l in [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]"
              :key="l"
              type="button"
              class="filter-chip"
              :class="{ active: levelFilter === l }"
              @click="levelFilter = l"
            >
              {{ l === 0 ? 'Trucos' : l }}
            </button>
          </div>
        </div>

        <hr class="runic-separator" />

        <div class="spell-grid">
          <article
            v-for="spell in filteredSpells"
            :key="spell.id"
            class="spell-card dark-card"
            @click="openDetail(spell)"
          >
            <div class="spell-card-header">
              <span class="spell-level font-data" :class="{ cantrip: spell.level === 0 }">
                {{ levelLabel(spell.level) }}
              </span>
              <span class="spell-school">{{ spell.school }}</span>
            </div>
            <h3 class="spell-name">{{ spell.nameEs || spell.nameEn }}</h3>
            <p class="spell-meta">
              {{ spell.castingTime }} · {{ spell.range }} · {{ spell.duration }}
              <span v-if="spell.isConcentration" class="concentration"> · Concentración</span>
            </p>
            <div class="spell-tags">
              <span v-if="isFavorite(spell.id)" class="badge badge-gold">Favorito</span>
              <span v-if="isPrepared(spell.id)" class="badge badge-arcane">Preparado</span>
            </div>
            <div class="spell-actions" @click.stop>
              <button
                type="button"
                class="btn-ghost btn-sm"
                :aria-label="isFavorite(spell.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'"
                @click="toggleFavorite(spell.id)"
              >
                {{ isFavorite(spell.id) ? '★ Favorito' : '☆ Favorito' }}
              </button>
              <button
                type="button"
                class="btn-arc btn-sm"
                :aria-label="isPrepared(spell.id) ? 'Quitar de preparados' : 'Marcar como preparado'"
                @click="togglePrepared(spell.id)"
              >
                {{ isPrepared(spell.id) ? 'Preparado' : 'Preparar' }}
              </button>
            </div>
          </article>
        </div>

        <p v-if="!loading && filteredSpells.length === 0" class="empty-msg">
          No hay hechizos que coincidan con la búsqueda.
        </p>
      </template>

      <!-- Modal detalle -->
      <Teleport to="body">
        <div v-if="selectedSpell" class="modal-backdrop" @click.self="closeDetail">
          <div class="modal dark-card" role="dialog" aria-modal="true" :aria-label="selectedSpell.nameEs || selectedSpell.nameEn">
            <div class="modal-header">
              <h2 class="modal-title">{{ selectedSpell.nameEs || selectedSpell.nameEn }}</h2>
              <button type="button" class="btn-icon modal-close" aria-label="Cerrar" @click="closeDetail">×</button>
            </div>
            <div class="modal-body">
              <p class="spell-level-badge font-data" :class="{ cantrip: selectedSpell.level === 0 }">
                {{ levelLabel(selectedSpell.level) }} · {{ selectedSpell.school }}
              </p>
              <div class="modal-actions">
                <button type="button" class="btn-ghost btn-sm" @click="toggleFavorite(selectedSpell.id)">
                  {{ isFavorite(selectedSpell.id) ? '★ Favorito' : '☆ Añadir favorito' }}
                </button>
                <button type="button" class="btn-arc btn-sm" @click="togglePrepared(selectedSpell.id)">
                  {{ isPrepared(selectedSpell.id) ? '✓ Preparado' : 'Preparar hechizo' }}
                </button>
              </div>
              <dl class="spell-details">
                <dt>Tiempo de lanzamiento</dt>
                <dd>{{ selectedSpell.castingTime }}</dd>
                <dt>Alcance</dt>
                <dd>{{ selectedSpell.range }}</dd>
                <dt>Componentes</dt>
                <dd>{{ (selectedSpell.components || []).join(', ') || '—' }}</dd>
                <dt>Duración</dt>
                <dd>
                  {{ selectedSpell.duration }}
                  <span v-if="selectedSpell.isConcentration" class="concentration"> (concentración)</span>
                </dd>
              </dl>
              <hr class="runic-separator" />
              <pre class="spell-description">{{ selectedSpell.descriptionEs || selectedSpell.descriptionEn || '—' }}</pre>
            </div>
          </div>
        </div>
      </Teleport>
    </main>
  </div>
</template>

<style scoped>
.spell-main {
  padding: 1.5rem;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}

.browser-header {
  margin-bottom: 1.5rem;
}

.browser-title {
  font-family: var(--font-title);
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-primary);
  margin: 0 0 0.35rem 0;
}

.browser-subtitle {
  color: var(--text-muted);
  margin: 0;
  font-size: 0.95rem;
}

.loading-wrap {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text-muted);
}

.loader {
  width: 44px;
  height: 44px;
  margin: 0 auto 1rem;
  border: 2px solid var(--arcane-blue-dim);
  border-top-color: var(--arcane-blue);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-msg {
  color: #f87171;
  padding: 1rem 1.25rem;
  background: rgba(248, 113, 113, 0.08);
  border-radius: 6px;
  border: 1px solid rgba(248, 113, 113, 0.25);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.25rem;
  margin-bottom: 0;
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 200px;
}

.search-icon {
  color: var(--arcane-blue);
  font-size: 0.9rem;
  opacity: 0.8;
}

.search-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  max-width: 320px;
}

.quick-filters {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.level-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.filter-chip {
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  font-family: var(--font-data);
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(224, 152, 72, 0.2);
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--ease-mist);
}

.filter-chip:hover {
  color: var(--text-primary);
  border-color: var(--border-arcane);
  box-shadow: 0 0 12px rgba(224, 152, 72, 0.18);
}

.filter-chip.active {
  background: rgba(224, 152, 72, 0.15);
  border-color: var(--arcane);
  color: var(--text-primary);
  box-shadow: var(--glow-arcane);
}

.spell-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.spell-card {
  padding: 1.25rem;
  cursor: pointer;
  transition: box-shadow var(--ease-mist), transform var(--ease-mist), border-color var(--ease-mist);
}

.spell-card:hover {
  box-shadow: 0 0 22px rgba(155, 114, 212, 0.38), 0 0 50px rgba(155, 114, 212, 0.1);
  transform: translateY(-2px);
  border-color: rgba(155, 114, 212, 0.38);
}

.spell-card:active {
  transform: translateY(0) scale(0.99);
}

.spell-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.spell-level {
  font-size: 0.75rem;
  color: var(--arcane-blue);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.spell-level.cantrip {
  color: #4ade80;
}

.spell-school {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.spell-name {
  font-family: var(--font-title);
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-primary);
  margin: 0 0 0.35rem 0;
}

.spell-meta {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0;
}

.spell-tags {
  margin-top: 0.55rem;
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.spell-actions {
  margin-top: 0.65rem;
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.concentration {
  color: #4ade80;
}

.empty-msg {
  text-align: center;
  color: var(--text-muted);
  padding: 2rem;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 1000;
  animation: fadeIn 0.3s var(--ease-mist);
}

.modal {
  max-width: 520px;
  width: 100%;
  max-height: 85vh;
  overflow: auto;
  padding: 0;
  animation: fadeInScale 0.35s var(--ease-mist);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(155, 114, 212, 0.22);
}

.modal-title {
  font-family: var(--font-title);
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin: 0;
  color: var(--text-primary);
}

.modal-close {
  font-size: 1.5rem;
  line-height: 1;
  padding: 0.2rem;
}

.modal-body {
  padding: 1.25rem 1.5rem;
}

.modal-actions {
  margin-bottom: 0.8rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.spell-level-badge {
  font-size: 0.8rem;
  color: var(--arcane-blue);
  margin-bottom: 1rem;
}

.spell-level-badge.cantrip {
  color: #4ade80;
}

.spell-details {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.35rem 1.25rem;
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
}

.spell-details dt {
  color: var(--text-muted);
  font-weight: 500;
}

.spell-details dd {
  margin: 0;
  color: var(--text-primary);
}

.spell-description {
  font-family: var(--font-body);
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  margin: 0;
}
</style>
