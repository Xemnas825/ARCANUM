<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api/client';
import type { CharacterSheetDto } from '../types/api';
import AppHeader from '../components/AppHeader.vue';
import ContextHelp from '../components/ContextHelp.vue';
import { useToastStore } from '../stores/toasts';

const route = useRoute();
const router = useRouter();
const toasts = useToastStore();

const sheet = ref<CharacterSheetDto | null>(null);
const conditionsList = ref<Array<{ id: string; nameEs: string }>>([]);
const loading = ref(true);
const error = ref('');
const saving = ref(false);

const currentHealth = ref(0);
const maximumHealth = ref(0);
const currentGold = ref(0);
const inspiration = ref(0);
const concentratingOn = ref<string | null>(null);
const spellSlotsUsed = ref<Record<string, number>>({});
const spellSlotsTotal = ref<Record<string, number>>({});
const activeConditions = ref<string[]>([]);
const inventory = ref<Array<{ id: string; name: string; quantity: number }>>([]);
const saveSuccess = ref(false);
let saveSuccessTimer: ReturnType<typeof setTimeout> | null = null;
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
const dirty = ref(false);
const autoSaving = ref(false);
const lastSavedAt = ref<number | null>(null);
const isSyncingFromServer = ref(false);

const newItemName = ref('');
const newItemQty = ref(1);
const conditionToAdd = ref('');
const combatLogNote = ref('');

const id = computed(() => route.params.id as string);
const campaignIdFromQuery = computed(() => (route.query.campaignId as string) || '');
const isDMView = computed(() => sheet.value?.viewerRole === 'master');

type InitiativeEntry = { id: string; name: string; initiative: number };
const initiativeList = ref<InitiativeEntry[]>([]);
const initiativeName = ref('');
const initiativeValue = ref(10);
const currentTurnIndex = ref(0);
const currentRound = ref(1);

type CombatLogType = 'damage' | 'heal' | 'condition' | 'turn' | 'rest' | 'misc';
type CombatLogEntry = { id: string; at: string; type: CombatLogType; text: string };
const combatLog = ref<CombatLogEntry[]>([]);

function initiativeStorageKey() {
  return `arcanum_initiative_${id.value}`;
}
function combatLogStorageKey() {
  return `arcanum_combat_log_${id.value}`;
}

const hpPercent = computed(() => {
  if (!maximumHealth.value) return 0;
  return Math.round((currentHealth.value / maximumHealth.value) * 100);
});

const hpColor = computed(() => {
  const p = hpPercent.value;
  if (p > 60) return 'var(--success)';
  if (p > 25) return 'var(--gold)';
  return 'var(--danger)';
});

function syncFromSheet() {
  isSyncingFromServer.value = true;
  if (!sheet.value) {
    isSyncingFromServer.value = false;
    return;
  }
  const h = sheet.value.health;
  if (h) { currentHealth.value = h.current; maximumHealth.value = h.maximum; }
  currentGold.value = Number(sheet.value.gold) || 0;
  inspiration.value = Number(sheet.value.inspiration) || 0;
  concentratingOn.value = sheet.value.concentratingOn ?? null;
  const slots = sheet.value.spellSlots;
  if (slots) spellSlotsUsed.value = { ...slots };
  const total = sheet.value.spellSlotsTotal;
  if (total) spellSlotsTotal.value = { ...total };
  activeConditions.value = [...(sheet.value.activeConditions ?? [])];
  inventory.value = [...(sheet.value.inventory ?? [])];
  dirty.value = false;
  isSyncingFromServer.value = false;
}

onMounted(async () => {
  try {
    const [charRes, condRes] = await Promise.all([
      api.get<CharacterSheetDto>(`/characters/${id.value}`),
      api.get<Array<{ id: string; nameEs: string }>>('/conditions'),
    ]);
    sheet.value = charRes;
    conditionsList.value = condRes ?? [];
    syncFromSheet();
    loadInitiativeState();
    loadCombatLogState();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar';
  } finally {
    loading.value = false;
  }
});

async function saveStats(mode: 'manual' | 'auto' = 'manual') {
  saving.value = true;
  autoSaving.value = mode === 'auto';
  error.value = '';
  if (mode === 'manual') saveSuccess.value = false;
  if (saveSuccessTimer) clearTimeout(saveSuccessTimer);
  try {
    const body: Record<string, unknown> = {
      currentHealth: currentHealth.value,
      maximumHealth: maximumHealth.value,
      currentGold: currentGold.value,
      inspirationPoints: inspiration.value,
      concentratingOn: concentratingOn.value ?? '',
    };
    if (Object.keys(spellSlotsUsed.value).length) body.spellSlotsUsed = spellSlotsUsed.value;
    await api.patch(`/characters/${id.value}/stats`, body);
    sheet.value = await api.get<CharacterSheetDto>(`/characters/${id.value}`);
    syncFromSheet();
    lastSavedAt.value = Date.now();
    dirty.value = false;
    if (mode === 'manual') {
      saveSuccess.value = true;
      saveSuccessTimer = setTimeout(() => { saveSuccess.value = false; }, 2500);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al guardar';
  } finally {
    saving.value = false;
    autoSaving.value = false;
  }
}

function saveStatsManual() {
  saveStats('manual');
}

function adjustHealth(delta: number) {
  const prev = currentHealth.value;
  currentHealth.value = Math.max(0, Math.min(maximumHealth.value, currentHealth.value + delta));
  const realDelta = currentHealth.value - prev;
  if (realDelta !== 0) {
    addCombatLog(realDelta < 0 ? `Daño ${Math.abs(realDelta)} PG` : `Curación ${realDelta} PG`, realDelta < 0 ? 'damage' : 'heal');
  }
}

function shortRest() {
  const recover = Math.max(1, Math.floor(maximumHealth.value * 0.25));
  const before = currentHealth.value;
  currentHealth.value = Math.min(maximumHealth.value, currentHealth.value + recover);
  addCombatLog(`Descanso corto: +${Math.max(0, currentHealth.value - before)} PG`, 'rest');
}

function longRest() {
  currentHealth.value = maximumHealth.value;
  const reset: Record<string, number> = {};
  for (const key of Object.keys(spellSlotsUsed.value)) reset[key] = 0;
  spellSlotsUsed.value = reset;
  concentratingOn.value = null;
  addCombatLog('Descanso largo: vida al máximo, slots reiniciados y concentración limpiada', 'rest');
}

async function setConditions(ids: string[]) {
  try {
    const previous = [...activeConditions.value];
    await api.put(`/characters/${id.value}/conditions`, { conditionIds: ids });
    activeConditions.value = [...ids];
    if (sheet.value) sheet.value.activeConditions = ids;
    const added = ids.filter((x) => !previous.includes(x));
    const removed = previous.filter((x) => !ids.includes(x));
    for (const cid of added) addCombatLog(`Condición aplicada: ${conditionName(cid)}`, 'condition');
    for (const cid of removed) addCombatLog(`Condición eliminada: ${conditionName(cid)}`, 'condition');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al actualizar condiciones';
  }
}

function addCondition() {
  if (!conditionToAdd.value.trim()) return;
  const ids = [...new Set([...activeConditions.value, conditionToAdd.value.trim()])];
  setConditions(ids);
  conditionToAdd.value = '';
}

function removeCondition(cid: string) {
  setConditions(activeConditions.value.filter(x => x !== cid));
}

async function addInventoryItem() {
  if (!newItemName.value.trim()) return;
  try {
    const item = await api.post<{ id: string; name: string; quantity: number }>(
      `/characters/${id.value}/inventory`,
      { name: newItemName.value.trim(), quantity: newItemQty.value }
    );
    inventory.value = [...inventory.value, item];
    newItemName.value = '';
    newItemQty.value = 1;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al añadir objeto';
  }
}

async function updateInventoryQuantity(itemId: string, quantity: number) {
  const q = Math.max(0, quantity);
  try {
    await api.patch(`/characters/${id.value}/inventory/${itemId}`, { quantity: q });
    const i = inventory.value.findIndex(x => x.id === itemId);
    const item = inventory.value[i];
    if (i >= 0 && item) inventory.value[i] = { id: item.id, name: item.name, quantity: q };
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al actualizar';
  }
}

async function removeInventoryItem(itemId: string) {
  try {
    await api.delete(`/characters/${id.value}/inventory/${itemId}`);
    inventory.value = inventory.value.filter(x => x.id !== itemId);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al eliminar';
  }
}

function adjustSpellSlot(level: string, delta: number) {
  const total = spellSlotsTotal.value[level] ?? 0;
  const used = (spellSlotsUsed.value[level] ?? 0) + delta;
  spellSlotsUsed.value = { ...spellSlotsUsed.value, [level]: Math.max(0, Math.min(total, used)) };
}

const spellLevels = computed(() =>
  [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(l => (spellSlotsTotal.value[`level${l}`] ?? 0) > 0)
);

const conditionName = (cid: string) => conditionsList.value.find(c => c.id === cid)?.nameEs ?? cid;

const orderedInitiative = computed(() =>
  [...initiativeList.value].sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    return a.name.localeCompare(b.name);
  })
);

const activeInitiativeId = computed(() => orderedInitiative.value[currentTurnIndex.value]?.id ?? null);
const lastSavedLabel = computed(() => {
  if (!lastSavedAt.value) return 'Sin guardar aún';
  const seconds = Math.floor((Date.now() - lastSavedAt.value) / 1000);
  if (seconds < 3) return 'Guardado justo ahora';
  if (seconds < 60) return `Guardado hace ${seconds}s`;
  const min = Math.floor(seconds / 60);
  return `Guardado hace ${min}m`;
});

function scheduleAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    if (!dirty.value || saving.value || loading.value || !sheet.value) return;
    saveStats('auto');
  }, 1800);
}

function saveInitiativeState() {
  localStorage.setItem(
    initiativeStorageKey(),
    JSON.stringify({
      list: initiativeList.value,
      currentTurnIndex: currentTurnIndex.value,
      currentRound: currentRound.value,
    })
  );
}

function loadInitiativeState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(initiativeStorageKey()) || '{}');
    const list = Array.isArray(parsed.list) ? parsed.list : [];
    initiativeList.value = list
      .map((x: unknown) => {
        const item = x as { id?: string; name?: string; initiative?: number };
        if (!item.id || !item.name) return null;
        return { id: item.id, name: item.name, initiative: Number(item.initiative) || 0 };
      })
      .filter((x: InitiativeEntry | null): x is InitiativeEntry => Boolean(x));
    currentTurnIndex.value = Number(parsed.currentTurnIndex) || 0;
    currentRound.value = Math.max(1, Number(parsed.currentRound) || 1);
  } catch {
    initiativeList.value = [];
    currentTurnIndex.value = 0;
    currentRound.value = 1;
  }
  if (currentTurnIndex.value >= orderedInitiative.value.length) currentTurnIndex.value = 0;
}

function addInitiativeEntry() {
  const name = initiativeName.value.trim();
  if (!name) return;
  initiativeList.value = [
    ...initiativeList.value,
    { id: `init_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name, initiative: Number(initiativeValue.value) || 0 },
  ];
  initiativeName.value = '';
  initiativeValue.value = 10;
  saveInitiativeState();
}

function removeInitiativeEntry(entryId: string) {
  const prevActiveId = activeInitiativeId.value;
  initiativeList.value = initiativeList.value.filter((x) => x.id !== entryId);
  if (initiativeList.value.length === 0) {
    currentTurnIndex.value = 0;
    currentRound.value = 1;
    saveInitiativeState();
    return;
  }
  const activeIdx = orderedInitiative.value.findIndex((x) => x.id === prevActiveId);
  currentTurnIndex.value = activeIdx >= 0 ? activeIdx : 0;
  saveInitiativeState();
}

function nextTurn() {
  const total = orderedInitiative.value.length;
  if (!total) return;
  currentTurnIndex.value += 1;
  if (currentTurnIndex.value >= total) {
    currentTurnIndex.value = 0;
    currentRound.value += 1;
  }
  const active = orderedInitiative.value[currentTurnIndex.value];
  if (active) addCombatLog(`Turno de ${active.name} (Ronda ${currentRound.value})`, 'turn');
  saveInitiativeState();
}

function previousTurn() {
  const total = orderedInitiative.value.length;
  if (!total) return;
  currentTurnIndex.value -= 1;
  if (currentTurnIndex.value < 0) {
    currentTurnIndex.value = total - 1;
    currentRound.value = Math.max(1, currentRound.value - 1);
  }
  const active = orderedInitiative.value[currentTurnIndex.value];
  if (active) addCombatLog(`Retroceso a turno de ${active.name} (Ronda ${currentRound.value})`, 'turn');
  saveInitiativeState();
}

function resetInitiative() {
  initiativeList.value = [];
  currentTurnIndex.value = 0;
  currentRound.value = 1;
  localStorage.removeItem(initiativeStorageKey());
  addCombatLog('Iniciativa reiniciada', 'turn');
}

function saveCombatLogState() {
  localStorage.setItem(combatLogStorageKey(), JSON.stringify(combatLog.value));
}

function loadCombatLogState() {
  try {
    const raw = localStorage.getItem(combatLogStorageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    combatLog.value = Array.isArray(parsed)
      ? parsed.filter((x): x is CombatLogEntry => Boolean(x?.id && x?.at && x?.text && x?.type))
      : [];
  } catch {
    combatLog.value = [];
  }
}

function addCombatLog(text: string, type: CombatLogType = 'misc') {
  const entry: CombatLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    type,
    text,
  };
  combatLog.value = [entry, ...combatLog.value].slice(0, 300);
  saveCombatLogState();
}

function addManualCombatLog() {
  const note = combatLogNote.value.trim();
  if (!note) return;
  addCombatLog(note, 'misc');
  combatLogNote.value = '';
}

function clearCombatLog() {
  combatLog.value = [];
  localStorage.removeItem(combatLogStorageKey());
}

async function copyCombatLog() {
  const text = combatLog
    .value
    .slice()
    .reverse()
    .map((e) => `[${new Date(e.at).toLocaleTimeString()}] ${e.text}`)
    .join('\n');
  try {
    await navigator.clipboard.writeText(text || 'Sin entradas de combate.');
    toasts.push('Registro copiado al portapapeles', 'success');
  } catch {
    error.value = 'No se pudo copiar el registro';
    toasts.push('No se pudo copiar el registro', 'error');
  }
}

function exportCombatLog() {
  const text = combatLog
    .value
    .slice()
    .reverse()
    .map((e) => `[${new Date(e.at).toLocaleString()}] ${e.text}`)
    .join('\n');
  const blob = new Blob([text || 'Sin entradas de combate.'], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `combat-log-${id.value}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toasts.push('Registro exportado (.txt)', 'success');
}

function back() { router.push('/personajes'); }
function goSheet() { router.push(`/personajes/${id.value}`); }

function backToParty() {
  if (campaignIdFromQuery.value) router.push(`/campanas/${campaignIdFromQuery.value}/grupo`);
  else back();
}

watch(
  [currentHealth, maximumHealth, currentGold, inspiration, concentratingOn, spellSlotsUsed],
  () => {
    if (loading.value || !sheet.value || isSyncingFromServer.value) return;
    dirty.value = true;
    scheduleAutosave();
  },
  { deep: true }
);
</script>

<template>
  <div class="page">
    <AppHeader>
      <template #actions>
        <button v-if="isDMView && campaignIdFromQuery" type="button" class="btn-ghost btn-sm" @click="backToParty" aria-label="Volver al panel del grupo">← Grupo</button>
        <button type="button" class="btn-ghost btn-sm" @click="goSheet" aria-label="Ver ficha del personaje">Ficha</button>
        <button type="button" class="btn-ghost btn-sm" @click="back" aria-label="Volver a personajes">← Volver</button>
      </template>
    </AppHeader>

    <main class="main">
      <div v-if="loading" class="loader-wrap" aria-live="polite">
        <div class="loader"></div>
        <p>Preparando la partida...</p>
      </div>

      <div v-else-if="error" class="error-banner animate-fade-in" role="alert">{{ error }}</div>

      <template v-else-if="sheet">
        <ContextHelp
          title="Ayuda rápida de partida"
          :tips="[
            'Usa Iniciativa para ordenar turnos y avanzar rondas.',
            'Guarda estado al final de cada combate para no perder cambios.',
            'Condiciones e inventario se actualizan al momento.'
          ]"
          compact
        />

        <!-- Banner modo DM: gestionando la ficha de un jugador -->
        <div v-if="isDMView" class="dm-banner dark-card" role="status">
          <span class="dm-banner-icon" aria-hidden="true">📖</span>
          <div class="dm-banner-text">
            <strong>Vista como Dungeon Master</strong>
            <p>Estás editando la ficha de <strong>{{ sheet.nameEs }}</strong>. Los cambios (PG, oro, condiciones, inventario, slots) se guardan en tiempo real en la ficha del jugador.</p>
          </div>
        </div>

        <!-- Cabecera del personaje -->
        <header class="session-header animate-fade-in">
          <div>
            <h2 class="session-name">{{ (sheet.nameEs as string) || (sheet.nameEn as string) }}</h2>
            <p class="session-meta">
              <span class="badge badge-arcane">Nv. {{ sheet.level }}</span>
              {{ sheet.classNameEs }}
              <span class="sep" aria-hidden="true">·</span>
              En partida
            </p>
          </div>
        </header>

        <hr class="runic-separator" />

        <div class="session-grid">
          <!-- ——— Panel: Vida ——— -->
          <section class="panel dark-card animate-fade-in" aria-labelledby="hp-title">
            <h3 id="hp-title" class="section-title">Puntos de golpe</h3>

            <!-- Barra de vida visual -->
            <div class="hp-bar-wrap" aria-label="Vida" :aria-valuenow="currentHealth" :aria-valuemax="maximumHealth" role="progressbar">
              <div class="hp-bar-track">
                <div class="hp-bar-fill" :style="{ width: hpPercent + '%', background: hpColor }"></div>
              </div>
              <span class="hp-text font-data">{{ currentHealth }} / {{ maximumHealth }}</span>
            </div>

            <!-- Controles rápidos -->
            <div class="hp-quick" role="group" aria-label="Ajuste rápido de vida">
              <button type="button" class="hp-btn hp-btn-dmg" @click="adjustHealth(-5)" aria-label="Restar 5 PG">−5</button>
              <button type="button" class="hp-btn hp-btn-dmg" @click="adjustHealth(-1)" aria-label="Restar 1 PG">−1</button>
              <button type="button" class="hp-btn hp-btn-heal" @click="adjustHealth(1)" aria-label="Añadir 1 PG">+1</button>
              <button type="button" class="hp-btn hp-btn-heal" @click="adjustHealth(5)" aria-label="Añadir 5 PG">+5</button>
            </div>
            <div class="rest-actions" role="group" aria-label="Acciones de descanso">
              <button type="button" class="btn-ghost btn-sm" @click="shortRest">Descanso corto</button>
              <button type="button" class="btn-gold btn-sm" @click="longRest">Descanso largo</button>
            </div>

            <!-- Inputs precisos -->
            <div class="hp-inputs">
              <div class="input-group">
                <label for="hp-current" class="input-label">Actuales</label>
                <input id="hp-current" v-model.number="currentHealth" type="number" min="0" :max="maximumHealth" class="num-input" aria-label="PG actuales" />
              </div>
              <div class="input-group">
                <label for="hp-max" class="input-label">Máximos</label>
                <input id="hp-max" v-model.number="maximumHealth" type="number" min="1" class="num-input" aria-label="PG máximos" />
              </div>
              <div class="input-group">
                <label for="gold" class="input-label">Oro</label>
                <input id="gold" v-model.number="currentGold" type="number" min="0" class="num-input" aria-label="Monedas de oro" />
              </div>
              <div class="input-group">
                <label for="inspiration" class="input-label">Inspiración</label>
                <input id="inspiration" v-model.number="inspiration" type="number" min="0" max="10" class="num-input" aria-label="Puntos de inspiración" />
              </div>
            </div>
          </section>

          <!-- ——— Panel: Hechizos ——— -->
          <section v-if="spellLevels.length" class="panel dark-card animate-fade-in" aria-labelledby="slots-title">
            <h3 id="slots-title" class="section-title">Espacios de hechizo</h3>
            <div class="slots-grid">
              <div v-for="l in spellLevels" :key="l" class="slot-row">
                <span class="slot-lvl font-data">Nv {{ l }}</span>
                <div class="slot-pips">
                  <button
                    v-for="n in (spellSlotsTotal[`level${l}`] ?? 0)"
                    :key="n"
                    type="button"
                    class="slot-pip"
                    :class="{ used: n <= (spellSlotsUsed[`level${l}`] ?? 0) }"
                    :aria-label="`Espacio nivel ${l} ${n <= (spellSlotsUsed[`level${l}`] ?? 0) ? 'usado' : 'disponible'}`"
                    @click="adjustSpellSlot(`level${l}`, n <= (spellSlotsUsed[`level${l}`] ?? 0) ? -1 : 1)"
                  ></button>
                </div>
                <span class="slot-count font-data">{{ spellSlotsUsed[`level${l}`] ?? 0 }}/{{ spellSlotsTotal[`level${l}`] ?? 0 }}</span>
              </div>
            </div>
          </section>

          <!-- ——— Panel: Concentración ——— -->
          <section class="panel dark-card animate-fade-in" aria-labelledby="conc-title">
            <h3 id="conc-title" class="section-title">Concentración</h3>
            <div class="conc-row">
              <input
                v-model="concentratingOn"
                type="text"
                placeholder="Hechizo en concentración..."
                class="conc-input"
                aria-label="Hechizo en concentración"
              />
              <button
                v-if="concentratingOn"
                type="button"
                class="btn-ghost btn-sm"
                @click="concentratingOn = null"
                aria-label="Limpiar concentración"
              >✕</button>
            </div>
            <div v-if="concentratingOn" class="conc-active">
              <span class="badge badge-nature">⊙ Concentrándose</span>
              <span class="conc-spell">{{ concentratingOn }}</span>
            </div>
          </section>

          <!-- ——— Panel: Condiciones ——— -->
          <section class="panel dark-card animate-fade-in" aria-labelledby="cond-title">
            <h3 id="cond-title" class="section-title">Efectos de estado</h3>
            <div class="cond-add">
              <select v-model="conditionToAdd" class="cond-select" aria-label="Seleccionar condición a añadir">
                <option value="">— Añadir condición —</option>
                <option v-for="c in conditionsList" :key="c.id" :value="c.id">{{ c.nameEs }}</option>
              </select>
              <button type="button" class="btn-arc btn-sm" @click="addCondition" :disabled="!conditionToAdd" aria-label="Añadir condición seleccionada">Añadir</button>
            </div>
            <div v-if="activeConditions.length" class="chips" role="list" aria-label="Condiciones activas">
              <span
                v-for="cid in activeConditions"
                :key="cid"
                class="chip badge badge-danger"
                role="listitem"
              >
                {{ conditionName(cid) }}
                <button
                  type="button"
                  class="chip-remove"
                  @click="removeCondition(cid)"
                  :aria-label="`Quitar condición ${conditionName(cid)}`"
                >×</button>
              </span>
            </div>
            <p v-else class="empty-note">Sin condiciones activas</p>
          </section>

          <!-- ——— Panel: Iniciativa / Turnos ——— -->
          <section class="panel dark-card animate-fade-in" aria-labelledby="init-title">
            <h3 id="init-title" class="section-title">Iniciativa y turnos</h3>
            <div class="init-round">
              <span class="badge badge-gold">Ronda {{ currentRound }}</span>
            </div>
            <div class="init-add">
              <input
                v-model="initiativeName"
                type="text"
                placeholder="Nombre (PJ/NPC/Monstruo)"
                class="conc-input"
                aria-label="Nombre del combatiente"
                @keydown.enter="addInitiativeEntry"
              />
              <input
                v-model.number="initiativeValue"
                type="number"
                class="num-input init-num"
                aria-label="Valor de iniciativa"
              />
              <button type="button" class="btn-arc btn-sm" @click="addInitiativeEntry">Añadir</button>
            </div>
            <ul v-if="orderedInitiative.length" class="init-list" role="list" aria-label="Orden de iniciativa">
              <li v-for="(entry, idx) in orderedInitiative" :key="entry.id" class="init-item" :class="{ active: idx === currentTurnIndex }">
                <div class="init-main">
                  <span class="init-order">{{ idx + 1 }}</span>
                  <span class="init-name">{{ entry.name }}</span>
                  <span class="init-score font-data">{{ entry.initiative }}</span>
                </div>
                <button type="button" class="btn-danger btn-sm" @click="removeInitiativeEntry(entry.id)">✕</button>
              </li>
            </ul>
            <p v-else class="empty-note">Sin combatientes aún.</p>
            <div class="init-actions">
              <button type="button" class="btn-ghost btn-sm" @click="previousTurn" :disabled="orderedInitiative.length === 0">Turno anterior</button>
              <button type="button" class="btn-gold btn-sm" @click="nextTurn" :disabled="orderedInitiative.length === 0">Siguiente turno</button>
              <button type="button" class="btn-danger btn-sm" @click="resetInitiative" :disabled="orderedInitiative.length === 0">Reiniciar</button>
            </div>
          </section>

          <!-- ——— Panel: Inventario ——— -->
          <section class="panel dark-card animate-fade-in inv-panel" aria-labelledby="inv-title">
            <h3 id="inv-title" class="section-title">Inventario</h3>
            <div class="inv-add">
              <input
                v-model="newItemName"
                type="text"
                placeholder="Nombre del objeto"
                class="inv-name"
                aria-label="Nombre del nuevo objeto"
                @keydown.enter="addInventoryItem"
              />
              <input
                v-model.number="newItemQty"
                type="number"
                min="1"
                class="num-input qty-input"
                aria-label="Cantidad"
              />
              <button type="button" class="btn-arc btn-sm" @click="addInventoryItem" :disabled="!newItemName.trim()" aria-label="Añadir objeto al inventario">+ Añadir</button>
            </div>
            <ul v-if="inventory.length" class="inv-list" role="list" aria-label="Objetos en inventario">
              <li v-for="item in inventory" :key="item.id" class="inv-item" role="listitem">
                <input
                  :value="item.quantity"
                  type="number"
                  min="0"
                  class="num-input qty-input"
                  :aria-label="`Cantidad de ${item.name}`"
                  @change="(e: Event) => updateInventoryQuantity(item.id, Number((e.target as HTMLInputElement).value))"
                />
                <span class="inv-name-text">{{ item.name }}</span>
                <button
                  type="button"
                  class="btn-danger btn-sm"
                  @click="removeInventoryItem(item.id)"
                  :aria-label="`Eliminar ${item.name} del inventario`"
                >✕</button>
              </li>
            </ul>
            <p v-else class="empty-note">Sin objetos</p>
          </section>

          <!-- ——— Panel: Registro de combate ——— -->
          <section class="panel dark-card animate-fade-in inv-panel" aria-labelledby="log-title">
            <h3 id="log-title" class="section-title">Registro de combate</h3>
            <div class="log-add">
              <input
                v-model="combatLogNote"
                type="text"
                class="conc-input"
                placeholder="Anotar acción manual (ej. Crítico de goblin por 12)"
                @keydown.enter="addManualCombatLog"
              />
              <button type="button" class="btn-arc btn-sm" @click="addManualCombatLog" :disabled="!combatLogNote.trim()">Añadir</button>
            </div>
            <div class="log-actions">
              <button type="button" class="btn-ghost btn-sm" @click="copyCombatLog">Copiar</button>
              <button type="button" class="btn-gold btn-sm" @click="exportCombatLog">Exportar .txt</button>
              <button type="button" class="btn-danger btn-sm" @click="clearCombatLog" :disabled="combatLog.length === 0">Limpiar</button>
            </div>
            <ul v-if="combatLog.length" class="log-list" role="list" aria-label="Entradas del registro de combate">
              <li v-for="entry in combatLog" :key="entry.id" class="log-item" :class="`log-${entry.type}`" role="listitem">
                <span class="log-time font-data">{{ new Date(entry.at).toLocaleTimeString() }}</span>
                <span class="log-text">{{ entry.text }}</span>
              </li>
            </ul>
            <p v-else class="empty-note">Aún no hay acciones registradas.</p>
          </section>
        </div>

        <!-- Guardar -->
        <footer class="save-footer">
          <div v-if="saveSuccess" class="success-banner animate-fade-in" role="status">
            ✓ Guardado correctamente
          </div>
          <div class="save-meta font-data" :class="{ dirty }" role="status">
            <span v-if="autoSaving">Guardado automático...</span>
            <span v-else-if="dirty">Cambios sin guardar</span>
            <span v-else>{{ lastSavedLabel }}</span>
          </div>
          <button
            type="button"
            class="btn-gold btn-lg save-btn"
            :disabled="saving"
            :aria-busy="saving"
            @click="saveStatsManual"
          >
            <span v-if="saving" class="btn-spinner" aria-hidden="true"></span>
            {{ saving ? 'Guardando...' : 'Guardar estado' }}
          </button>
        </footer>
      </template>
    </main>
  </div>
</template>

<style scoped>
.main {
  flex: 1;
  padding: 1.5rem;
  max-width: 860px;
  margin: 0 auto;
  width: 100%;
}

/* Banner modo DM */
.dm-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.9rem 1.1rem;
  margin-bottom: 1rem;
  border-left: 4px solid var(--gold-bright);
  background: var(--gold-dim);
}
.dm-banner-icon { font-size: 1.4rem; line-height: 1; flex-shrink: 0; }
.dm-banner-text strong { display: block; font-family: var(--font-data); font-size: 0.88rem; color: var(--text-primary); margin-bottom: 0.25rem; }
.dm-banner-text p { margin: 0; font-family: var(--font-data); font-size: 0.82rem; color: var(--text-muted); line-height: 1.4; }

/* Cabecera de sesión */
.session-header { margin-bottom: 0; }
.session-name {
  font-family: var(--font-title);
  font-size: 1.55rem;
  margin: 0 0 0.4rem 0;
}
.session-meta {
  font-family: var(--font-data);
  font-size: 0.88rem;
  color: var(--text-muted);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.sep { color: var(--text-faint); }

/* Grid de paneles */
.session-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1rem;
}

.panel {
  padding: 1.25rem 1.4rem;
}

/* Barra de vida */
.hp-bar-wrap {
  margin-bottom: 0.85rem;
}
.hp-bar-track {
  height: 8px;
  background: rgba(255,255,255,0.06);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.4rem;
}
.hp-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s var(--ease-out), background 0.5s ease;
  box-shadow: 0 0 8px currentColor;
}
.hp-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  text-align: right;
}

/* Botones de HP */
.hp-quick {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1rem;
}
.hp-btn {
  flex: 1;
  padding: 0.4rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: var(--font-data);
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  transition: box-shadow var(--ease-out), transform var(--ease-spring);
}
.hp-btn:active { transform: scale(0.96); }
.hp-btn-dmg {
  background: var(--danger-dim);
  color: var(--danger);
  border-color: rgba(216, 64, 64, 0.3);
}
.hp-btn-dmg:hover { box-shadow: var(--danger-glow); }
.hp-btn-heal {
  background: var(--success-dim);
  color: var(--success);
  border-color: rgba(90, 144, 96, 0.3);
}
.hp-btn-heal:hover { box-shadow: 0 0 10px rgba(90, 144, 96, 0.2); }
.rest-actions {
  display: flex;
  gap: 0.45rem;
  margin-bottom: 0.95rem;
  flex-wrap: wrap;
}

/* Inputs de HP y recursos */
.hp-inputs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.input-label {
  font-family: var(--font-data);
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
  letter-spacing: 0.03em;
}
.num-input {
  width: 100%;
  font-family: var(--font-data);
  font-weight: 600;
  font-size: 1.1rem;
  text-align: center;
  padding: 0.4rem;
}

/* Espacios de hechizo: pips visuales */
.slots-grid { display: flex; flex-direction: column; gap: 0.6rem; }
.slot-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.slot-lvl {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--arcane);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  min-width: 2.5rem;
}
.slot-pips { display: flex; gap: 0.3rem; flex-wrap: wrap; flex: 1; }
.slot-pip {
  width: 18px; height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--arcane);
  background: var(--arcane-dim);
  cursor: pointer;
  transition: background var(--ease-quick), box-shadow var(--ease-quick);
  padding: 0;
}
.slot-pip.used {
  background: var(--arcane);
  box-shadow: 0 0 6px rgba(167,139,250,0.4);
}
.slot-pip:hover { box-shadow: 0 0 10px rgba(167,139,250,0.45); }
.slot-count {
  font-size: 0.78rem;
  color: var(--text-muted);
  min-width: 2rem;
  text-align: right;
}

/* Concentración */
.conc-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; }
.conc-input { flex: 1; }
.conc-active { display: flex; align-items: center; gap: 0.6rem; animation: fadeIn 0.3s ease; }
.conc-spell { font-family: var(--font-title); font-size: 0.95rem; color: var(--nature); }

/* Condiciones */
.cond-add { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.cond-select { flex: 1; font-size: 0.9rem; }
.chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: default;
}
.chip-remove {
  background: none;
  border: none;
  color: var(--danger);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  opacity: 0.7;
  transition: opacity var(--ease-quick);
}
.chip-remove:hover { opacity: 1; }

/* Iniciativa */
.init-round { margin-bottom: 0.7rem; }
.init-add {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}
.init-num { width: 5rem !important; }
.init-list {
  list-style: none;
  margin: 0 0 0.75rem 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.init-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: rgba(255,255,255,0.02);
}
.init-item.active {
  border-color: var(--border-gold);
  box-shadow: var(--gold-glow);
  background: var(--gold-dim);
}
.init-main {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}
.init-order {
  width: 1.4rem;
  height: 1.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-arcane);
  border-radius: 999px;
  font-family: var(--font-data);
  font-size: 0.75rem;
  color: var(--text-muted);
}
.init-name {
  color: var(--text-primary);
  font-size: 0.95rem;
}
.init-score {
  color: var(--gold-light);
  font-weight: 700;
  font-size: 0.9rem;
}
.init-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Inventario */
.inv-panel { grid-column: 1 / -1; }
.inv-add { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
.inv-name { flex: 1; min-width: 160px; }
.qty-input { width: 4.5rem !important; }
.inv-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.inv-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  transition: background var(--ease-quick);
}
.inv-item:hover { background: rgba(255,255,255,0.05); }
.inv-name-text { flex: 1; font-size: 0.95rem; color: var(--text-primary); }

/* Registro de combate */
.log-add {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
}
.log-actions {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  margin-bottom: 0.7rem;
}
.log-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 220px;
  overflow: auto;
}
.log-item {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 0.4rem 0.55rem;
  background: rgba(255,255,255,0.02);
}
.log-time {
  color: var(--text-faint);
  font-size: 0.75rem;
  min-width: 4.6rem;
}
.log-text {
  color: var(--text-primary);
  font-size: 0.9rem;
}
.log-damage { border-color: rgba(216, 64, 64, 0.25); }
.log-heal { border-color: rgba(90, 144, 96, 0.25); }
.log-condition { border-color: rgba(167,139,250,0.25); }
.log-turn { border-color: rgba(192, 84, 40, 0.25); }

.empty-note { color: var(--text-faint); font-size: 0.9rem; margin: 0; font-style: italic; }

/* Footer de guardado */
.save-footer {
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}
.save-meta {
  color: var(--text-muted);
  font-size: 0.82rem;
}
.save-meta.dirty {
  color: var(--gold-light);
}
.save-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-title);
  letter-spacing: 0.06em;
}
.btn-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(192, 84, 40, 0.2);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .session-grid { grid-template-columns: 1fr; }
  .hp-inputs { grid-template-columns: 1fr 1fr; }
}
</style>
