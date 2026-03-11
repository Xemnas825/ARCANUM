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

// Edición de personalidad
const editingPersonality = ref(false);
const editIdeals  = ref('');
const editBonds   = ref('');
const editFlaws   = ref('');
const savingPersonality = ref(false);

// Subir nivel
const levelingUp = ref(false);

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

function startEditPersonality() {
  if (!sheet.value) return;
  editIdeals.value = sheet.value.personality?.ideals ?? '';
  editBonds.value  = sheet.value.personality?.bonds  ?? '';
  editFlaws.value  = sheet.value.personality?.flaws  ?? '';
  editingPersonality.value = true;
}

function cancelEditPersonality() {
  editingPersonality.value = false;
}

async function savePersonality() {
  savingPersonality.value = true;
  error.value = '';
  try {
    await api.patch(`/characters/${id.value}`, {
      personality: {
        ideals: editIdeals.value.trim() || null,
        bonds:  editBonds.value.trim()  || null,
        flaws:  editFlaws.value.trim()  || null,
      },
    });
    if (sheet.value) {
      sheet.value = {
        ...sheet.value,
        personality: {
          ideals: editIdeals.value.trim() || null,
          bonds:  editBonds.value.trim()  || null,
          flaws:  editFlaws.value.trim()  || null,
        },
      };
    }
    editingPersonality.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al guardar';
  } finally {
    savingPersonality.value = false;
  }
}

async function levelUp() {
  if (!sheet.value) return;
  if (sheet.value.level >= 20) { error.value = 'Tu personaje ya ha alcanzado el nivel máximo (20).'; return; }
  if (!window.confirm(`¿Subir a ${sheet.value.nameEs} al nivel ${sheet.value.level + 1}?`)) return;
  levelingUp.value = true;
  try {
    await api.patch(`/characters/${id.value}`, { level: sheet.value.level + 1 });
    await loadSheet();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al subir de nivel';
  } finally {
    levelingUp.value = false;
  }
}
</script>

<template>
  <div class="page">
    <AppHeader>
      <template #actions>
        <button type="button" class="btn btn-ghost" @click="back">← Volver</button>
      </template>
    </AppHeader>

    <main class="main sheet-main">
      <div v-if="loading" class="loading-wrap">
        <div class="loader"></div>
        <p>Cargando ficha...</p>
      </div>
      <p v-else-if="error" class="error-msg">{{ error }}</p>
      <div v-else-if="sheet" class="sheet animate-fade-in">
        <!-- Cabecera: nombre y acciones -->
        <header class="sheet-header dark-card">
          <div class="sheet-title-block">
            <template v-if="!editingName">
              <h2 class="sheet-name">{{ displayName }}</h2>
              <button type="button" class="btn-icon" @click="startEditName" title="Editar nombre" aria-label="Editar nombre">✎</button>
            </template>
            <template v-else>
              <div class="edit-name-fields">
                <input v-model="editNameEs" type="text" class="edit-name-input" placeholder="Nombre (español)" />
                <input v-model="editNameEn" type="text" class="edit-name-input" placeholder="Nombre (inglés, opcional)" />
                <div class="edit-name-actions">
                  <button type="button" class="btn btn-ghost btn-sm" :disabled="savingName" @click="cancelEditName">Cancelar</button>
                  <button type="button" class="btn btn-primary btn-sm" :disabled="savingName || !editNameEs.trim()" @click="saveName">
                    {{ savingName ? 'Guardando…' : 'Guardar' }}
                  </button>
                </div>
              </div>
            </template>
            <p class="sheet-meta">
              Nivel {{ sheet.level }} · {{ (sheet.raceNameEs as string) }} · {{ (sheet.classNameEs as string) }}
              <span v-if="sheet.backgroundNameEs"> · {{ sheet.backgroundNameEs }}</span>
            </p>
          </div>
          <div class="sheet-header-actions">
            <button
              type="button"
              class="btn btn-primary"
              :disabled="levelingUp || sheet.level >= 20"
              :title="sheet.level >= 20 ? 'Nivel máximo alcanzado' : `Subir al nivel ${sheet.level + 1}`"
              @click="levelUp"
            >
              {{ levelingUp ? '…' : `↑ Nv ${sheet.level + 1}` }}
            </button>
            <router-link :to="`/personajes/${sheet.id}/partida`" class="btn btn-primary">▶ En partida</router-link>
            <button
              type="button"
              class="btn btn-danger"
              :disabled="deleting"
              @click="confirmDelete"
            >
              {{ deleting ? '…' : 'Eliminar' }}
            </button>
          </div>
        </header>

        <hr class="runic-separator" />

        <div class="stats-grid">
          <div class="stat-block dark-card">
            <h3 class="section-title">Características</h3>
            <div class="abilities-grid" v-if="sheet.abilities && sheet.abilityModifiers">
              <div
                v-for="key in abilityKeys"
                :key="key"
                class="ability-card"
              >
                <span class="ability-name">{{ abilityLabel(key) }}</span>
                <span class="ability-value font-data">{{ (sheet.abilities as Record<string, number>)[key] }}</span>
                <span class="ability-mod font-data">{{ formatModifier((sheet.abilityModifiers as Record<string, number>)[key] ?? 0) }}</span>
              </div>
            </div>
          </div>
          <div class="stat-block dark-card">
            <h3 class="section-title">Combate y recursos</h3>
            <dl class="combat-list">
              <dt>CA</dt><dd class="font-data">{{ sheet.armorClass }}</dd>
              <dt>Iniciativa</dt><dd class="font-data">{{ formatModifier(sheet.initiative as number) }}</dd>
              <dt>Velocidad</dt><dd class="font-data">{{ sheet.speed }} pies</dd>
              <dt>PG</dt><dd class="font-data">{{ (sheet.health as { current: number })?.current }} / {{ (sheet.health as { maximum: number })?.maximum }}</dd>
              <dt>Oro</dt><dd class="font-data">{{ sheet.gold }}</dd>
              <template v-if="sheet.proficiencyBonus != null">
                <dt>Bonif. competencia</dt><dd class="font-data">{{ formatModifier(sheet.proficiencyBonus as number) }}</dd>
              </template>
            </dl>
          </div>
        </div>

        <!-- Personalidad (vista + edición inline) -->
        <section class="panel dark-card personality">
          <div class="section-header-row">
            <h3 class="section-title" style="margin:0">Personalidad &amp; trasfondo</h3>
            <button
              v-if="!editingPersonality"
              type="button"
              class="btn btn-ghost btn-sm"
              @click="startEditPersonality"
            >✎ Editar</button>
          </div>

          <!-- Modo edición -->
          <div v-if="editingPersonality" class="personality-edit-form">
            <div class="pers-field">
              <label class="pers-label">Ideales</label>
              <textarea v-model="editIdeals" rows="2" placeholder="¿Qué principios guían a tu personaje?" />
            </div>
            <div class="pers-field">
              <label class="pers-label">Vínculos</label>
              <textarea v-model="editBonds" rows="2" placeholder="¿Qué o quién le importa más?" />
            </div>
            <div class="pers-field">
              <label class="pers-label">Defectos</label>
              <textarea v-model="editFlaws" rows="2" placeholder="¿Cuáles son sus debilidades o vicios?" />
            </div>
            <div class="pers-actions">
              <button type="button" class="btn btn-ghost btn-sm" @click="cancelEditPersonality" :disabled="savingPersonality">Cancelar</button>
              <button type="button" class="btn btn-primary btn-sm" @click="savePersonality" :disabled="savingPersonality">
                {{ savingPersonality ? 'Guardando…' : 'Guardar' }}
              </button>
            </div>
          </div>

          <!-- Modo visualización -->
          <div v-else class="personality-grid">
            <div v-if="sheet.personality?.ideals" class="personality-item">
              <strong>Ideales</strong>
              <p>{{ sheet.personality.ideals }}</p>
            </div>
            <div v-if="sheet.personality?.bonds" class="personality-item">
              <strong>Vínculos</strong>
              <p>{{ sheet.personality.bonds }}</p>
            </div>
            <div v-if="sheet.personality?.flaws" class="personality-item">
              <strong>Defectos</strong>
              <p>{{ sheet.personality.flaws }}</p>
            </div>
            <p v-if="!sheet.personality?.ideals && !sheet.personality?.bonds && !sheet.personality?.flaws"
               class="empty-personality">
              Sin trasfondo escrito aún. Pulsa "Editar" para añadirlo.
            </p>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.sheet-main {
  padding: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
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
  color: var(--danger);
  padding: 1rem 1.25rem;
  background: var(--danger-dim);
  border-radius: 8px;
  border: 1px solid rgba(216, 64, 64, 0.25);
}

/* Cabecera */
.sheet-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0;
  padding: 1.5rem 1.75rem;
  flex-wrap: wrap;
}

.sheet-title-block {
  flex: 1;
  min-width: 0;
}

.sheet-name {
  font-family: var(--font-title);
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-primary);
  margin: 0 0.35rem 0 0;
  display: inline;
}

.btn-icon {
  background: transparent;
  border: 1px solid var(--arcane-blue-dim);
  color: var(--arcane-blue);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: box-shadow var(--ease-mist), border-color var(--ease-mist);
}

.btn-icon:hover {
  box-shadow: var(--glow-arcane);
  border-color: var(--arcane-blue);
}

.edit-name-fields {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.edit-name-input {
  padding: 0.5rem 0.75rem;
  max-width: 280px;
  font-size: 1rem;
}

.edit-name-actions {
  display: flex;
  gap: 0.5rem;
}

.sheet-meta {
  color: var(--text-muted);
  margin: 0.5rem 0 0 0;
  font-size: 0.95rem;
}

.sheet-header-actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
}

/* Botones */
.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
  border: 1px solid transparent;
  transition: box-shadow var(--ease-mist), transform var(--ease-pulse);
}

.btn:hover {
  box-shadow: var(--glow-arcane);
}

.btn:active {
  transform: scale(0.98);
}

.btn-primary {
  background: rgba(192, 84, 40, 0.14);
  color: var(--arcane);
  border-color: rgba(192, 84, 40, 0.3);
}

.btn-primary:hover:not(:disabled) {
  box-shadow: var(--glow-arcane-hover);
}

.btn-ghost {
  background: transparent;
  color: var(--text-muted);
  border-color: transparent;
}

.btn-ghost:hover {
  color: var(--text-primary);
  border-color: var(--arcane-blue-dim);
}

.btn-danger {
  background: transparent;
  color: var(--danger);
  border-color: rgba(216, 64, 64, 0.35);
}

.btn-danger:hover:not(:disabled) {
  box-shadow: var(--danger-glow);
  background: var(--danger-dim);
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.9rem;
}

/* Grid de estadísticas */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.stat-block {
  padding: 1.25rem 1.5rem;
  transition: box-shadow var(--ease-mist), transform var(--ease-mist);
}

.stat-block:hover {
  box-shadow: var(--glow-arcane-hover);
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
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  border: 1px solid rgba(123, 142, 207, 0.14);
  transition: box-shadow var(--ease-mist), border-color var(--ease-mist);
}

.ability-card:hover {
  box-shadow: 0 0 12px rgba(123, 142, 207, 0.18);
  border-color: rgba(123, 142, 207, 0.3);
}

.ability-name {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.ability-value {
  font-weight: 600;
  font-size: 1.4rem;
  color: var(--text-primary);
  margin: 0.15rem 0;
}

.ability-mod {
  font-size: 0.9rem;
  color: var(--arcane-gold);
  font-weight: 500;
}

.combat-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.4rem 1.5rem;
  margin: 0;
  font-size: 0.95rem;
}

.combat-list dt {
  color: var(--text-muted);
  font-weight: 500;
}

.combat-list dd {
  margin: 0;
  color: var(--text-primary);
}

/* Personalidad */
.panel.personality {
  padding: 1.25rem 1.5rem;
}

.personality-grid {
  display: grid;
  gap: 1rem;
}

.personality-item strong {
  display: block;
  font-size: 0.8rem;
  color: var(--arcane-gold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.personality-item p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
}

.empty-personality {
  color: var(--text-faint);
  font-style: italic;
  font-size: 0.9rem;
  margin: 0;
}

.personality-edit-form { display: flex; flex-direction: column; gap: 0.7rem; }
.pers-field { display: flex; flex-direction: column; gap: 0.25rem; }
.pers-label {
  font-family: var(--font-data);
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.pers-field textarea { width: 100%; resize: vertical; min-height: 56px; }
.pers-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
</style>
