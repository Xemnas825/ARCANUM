<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api/client';
import type { CharacterSheetDto } from '../types/api';
import AppHeader from '../components/AppHeader.vue';

const route = useRoute();
const router = useRouter();

const sheet = ref<CharacterSheetDto | null>(null);
const loading = ref(true);
const error = ref('');
const editingName = ref(false);
const editNameEs = ref('');
const editNameEn = ref('');
const savingName = ref(false);
const deleting = ref(false);

const id = computed(() => route.params.id as string);
const displayName = computed(() => {
  if (!sheet.value) return '';
  return sheet.value.nameEs || sheet.value.nameEn || '';
});

const ABILITY_NAMES_ES: Record<string, string> = {
  strength: 'Fuerza',
  dexterity: 'Destreza',
  constitution: 'Constitución',
  intelligence: 'Inteligencia',
  wisdom: 'Sabiduría',
  charisma: 'Carisma',
};

const abilityKeys = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const;

function abilityLabel(key: string) {
  return ABILITY_NAMES_ES[key] || key;
}

function formatModifier(mod: number) {
  return mod >= 0 ? `+${mod}` : String(mod);
}

onMounted(loadSheet);

async function loadSheet() {
  try {
    sheet.value = await api.get<CharacterSheetDto>(`/characters/${id.value}`);
    editNameEs.value = sheet.value?.nameEs ?? '';
    editNameEn.value = sheet.value?.nameEn ?? '';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar personaje';
  } finally {
    loading.value = false;
  }
}

function startEditName() {
  if (sheet.value) {
    editNameEs.value = sheet.value.nameEs ?? '';
    editNameEn.value = sheet.value.nameEn ?? '';
    editingName.value = true;
  }
}

function cancelEditName() {
  editingName.value = false;
}

async function saveName() {
  if (!editNameEs.value.trim()) return;
  savingName.value = true;
  error.value = '';
  try {
    await api.patch(`/characters/${id.value}`, {
      nameEs: editNameEs.value.trim(),
      nameEn: editNameEn.value.trim() || undefined,
    });
    if (sheet.value) {
      sheet.value = { ...sheet.value, nameEs: editNameEs.value.trim(), nameEn: editNameEn.value.trim() || null };
    }
    editingName.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al guardar';
  } finally {
    savingName.value = false;
  }
}

async function confirmDelete() {
  const name = displayName.value || 'este personaje';
  if (!window.confirm(`¿Eliminar a "${name}"? Se borrará la ficha y todos sus datos. Esta acción no se puede deshacer.`)) return;
  deleting.value = true;
  try {
    await api.delete(`/characters/${id.value}`);
    router.push('/personajes');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al eliminar';
  } finally {
    deleting.value = false;
  }
}

function back() {
  router.push('/personajes');
}
</script>

<template>
  <div class="page">
    <AppHeader>
      <template #actions>
        <button type="button" class="btn ghost" @click="back">← Volver</button>
      </template>
    </AppHeader>

    <main class="main">
      <div v-if="loading" class="loading-wrap">
        <div class="loader"></div>
        <p>Cargando ficha...</p>
      </div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <div v-else-if="sheet" class="sheet animate-fade-in">
        <div class="sheet-header parchment-panel">
          <div class="sheet-title-block">
            <template v-if="!editingName">
              <h2>{{ displayName }}</h2>
              <button type="button" class="btn-edit-name" @click="startEditName" title="Editar nombre">✎</button>
            </template>
            <template v-else>
              <div class="edit-name-fields">
                <input v-model="editNameEs" type="text" class="edit-name-input" placeholder="Nombre (español)" />
                <input v-model="editNameEn" type="text" class="edit-name-input" placeholder="Nombre (inglés, opcional)" />
                <div class="edit-name-actions">
                  <button type="button" class="btn ghost btn-sm" :disabled="savingName" @click="cancelEditName">Cancelar</button>
                  <button type="button" class="btn primary btn-sm" :disabled="savingName || !editNameEs.trim()" @click="saveName">
                    {{ savingName ? 'Guardando…' : 'Guardar' }}
                  </button>
                </div>
              </div>
            </template>
            <p class="meta">
              Nivel {{ sheet.level }} · {{ (sheet.raceNameEs as string) }} · {{ (sheet.classNameEs as string) }}
              <span v-if="sheet.backgroundNameEs"> · {{ sheet.backgroundNameEs }}</span>
            </p>
          </div>
          <div class="sheet-header-actions">
            <router-link :to="`/personajes/${sheet.id}/partida`" class="btn primary">En partida</router-link>
            <button
              type="button"
              class="btn danger-outline"
              :disabled="deleting"
              @click="confirmDelete"
            >
              {{ deleting ? '…' : 'Eliminar personaje' }}
            </button>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-block parchment-panel">
            <h3>Características</h3>
            <div class="abilities-grid" v-if="sheet.abilities && sheet.abilityModifiers">
              <div
                v-for="key in abilityKeys"
                :key="key"
                class="ability-card"
              >
                <span class="ability-name">{{ abilityLabel(key) }}</span>
                <span class="ability-value">{{ (sheet.abilities as Record<string, number>)[key] }}</span>
                <span class="ability-mod">({{ formatModifier((sheet.abilityModifiers as Record<string, number>)[key] ?? 0) }})</span>
              </div>
            </div>
          </div>
          <div class="stat-block parchment-panel">
            <h3>Combate y recursos</h3>
            <dl class="combat-list">
              <dt>CA</dt><dd>{{ sheet.armorClass }}</dd>
              <dt>Iniciativa</dt><dd>{{ formatModifier(sheet.initiative as number) }}</dd>
              <dt>Velocidad</dt><dd>{{ sheet.speed }} pies</dd>
              <dt>PG</dt><dd>{{ (sheet.health as { current: number })?.current }} / {{ (sheet.health as { maximum: number })?.maximum }}</dd>
              <dt>Oro</dt><dd>{{ sheet.gold }}</dd>
              <template v-if="sheet.proficiencyBonus != null">
                <dt>Bonif. competencia</dt><dd>{{ formatModifier(sheet.proficiencyBonus as number) }}</dd>
              </template>
            </dl>
          </div>
        </div>

        <section
          v-if="sheet.personality && ((sheet.personality as { ideals?: string }).ideals || (sheet.personality as { bonds?: string }).bonds || (sheet.personality as { flaws?: string }).flaws)"
          class="panel parchment-panel personality"
        >
          <h3>Personalidad</h3>
          <div class="personality-grid">
            <div v-if="(sheet.personality as { ideals?: string }).ideals" class="personality-item">
              <strong>Ideales</strong>
              <p>{{ (sheet.personality as { ideals: string }).ideals }}</p>
            </div>
            <div v-if="(sheet.personality as { bonds?: string }).bonds" class="personality-item">
              <strong>Vínculos</strong>
              <p>{{ (sheet.personality as { bonds: string }).bonds }}</p>
            </div>
            <div v-if="(sheet.personality as { flaws?: string }).flaws" class="personality-item">
              <strong>Defectos</strong>
              <p>{{ (sheet.personality as { flaws: string }).flaws }}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.btn.ghost {
  background: transparent;
  color: var(--parchment-dark);
  border: 1px solid transparent;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 0.95rem;
}
.btn.ghost:hover {
  color: var(--parchment);
  border-color: var(--border-parchment);
}
.main {
  flex: 1;
  padding: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}
.sheet-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1.25rem 1.5rem;
  box-shadow: var(--shadow-paper);
  flex-wrap: wrap;
}
.sheet-title-block {
  flex: 1;
  min-width: 0;
}
.sheet-title-block h2 {
  display: inline;
  margin-right: 0.5rem;
}
.btn-edit-name {
  background: none;
  border: none;
  color: var(--ink-muted);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.2rem;
  vertical-align: middle;
}
.btn-edit-name:hover {
  color: var(--accent-gold);
}
.edit-name-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.edit-name-input {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border-parchment);
  border-radius: 4px;
  font-size: 1rem;
  max-width: 280px;
}
.edit-name-actions {
  display: flex;
  gap: 0.5rem;
}
.sheet-header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}
.btn.danger-outline {
  background: transparent;
  color: #b71c1c;
  border: 1px solid rgba(183, 28, 28, 0.5);
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}
.btn.danger-outline:hover:not(:disabled) {
  background: rgba(183, 28, 28, 0.1);
}
.sheet-header .btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  background: linear-gradient(180deg, var(--accent-gold-light) 0%, var(--accent-gold) 100%);
  color: var(--ink);
  border: 1px solid var(--parchment-shadow);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.2);
  white-space: nowrap;
}
.sheet-header .btn:hover {
  box-shadow: 0 4px 14px var(--accent-glow);
}
.sheet h2 {
  font-family: var(--font-title);
  margin: 0 0 0.25rem 0;
  font-size: 1.5rem;
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 0.04em;
}
.meta {
  color: var(--ink-muted);
  margin: 0;
  font-size: 0.95rem;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}
.stat-block {
  padding: 1.25rem;
  box-shadow: var(--shadow-paper);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stat-block:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-float);
}
.stat-block h3 {
  font-family: var(--font-title);
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 0.04em;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-parchment);
}
.abilities-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
.ability-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  border: 1px solid var(--border-parchment);
}
.ability-name {
  font-size: 0.8rem;
  color: var(--ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ability-value {
  font-weight: 700;
  font-size: 1.35rem;
  color: var(--ink);
}
.ability-mod {
  font-size: 0.9rem;
  color: var(--accent-gold);
  font-weight: 600;
}
.combat-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.35rem 1.5rem;
  margin: 0;
  font-size: 0.95rem;
}
.combat-list dt {
  color: var(--ink-muted);
  font-weight: 600;
}
.combat-list dd {
  margin: 0;
  color: var(--ink);
}
.panel.personality {
  margin-top: 0;
}
.personality h3 {
  font-family: var(--font-title);
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--ink);
  font-weight: 600;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-parchment);
}
.personality-grid {
  display: grid;
  gap: 1rem;
}
.personality-item strong {
  display: block;
  font-size: 0.85rem;
  color: var(--accent-gold);
  margin-bottom: 0.25rem;
}
.personality-item p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--ink);
  white-space: pre-wrap;
}
.loading-wrap {
  text-align: center;
  padding: 2rem;
  color: var(--ink-muted);
}
.loader {
  width: 40px;
  height: 40px;
  margin: 0 auto 0.75rem;
  border: 3px solid var(--parchment-shadow);
  border-top-color: var(--accent-gold);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.error {
  color: #b71c1c;
  padding: 1rem;
  background: rgba(183, 28, 28, 0.08);
  border-radius: 4px;
  border: 1px solid rgba(183, 28, 28, 0.2);
}
</style>
