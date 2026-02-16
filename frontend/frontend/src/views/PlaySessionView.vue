<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { api } from '../api/client';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const sheet = ref<Record<string, unknown> | null>(null);
const conditionsList = ref<Array<{ id: string; nameEs: string }>>([]);
const loading = ref(true);
const error = ref('');
const saving = ref(false);

// Edición local (stats)
const currentHealth = ref(0);
const maximumHealth = ref(0);
const currentGold = ref(0);
const inspiration = ref(0);
const concentratingOn = ref<string | null>(null);
const spellSlotsUsed = ref<Record<string, number>>({});
const spellSlotsTotal = ref<Record<string, number>>({});
const activeConditions = ref<string[]>([]);
const inventory = ref<Array<{ id: string; name: string; quantity: number }>>([]);

// Nuevo objeto / condición a añadir
const newItemName = ref('');
const newItemQty = ref(1);
const conditionToAdd = ref('');

const id = computed(() => route.params.id as string);

function syncFromSheet() {
  if (!sheet.value) return;
  const h = sheet.value.health as { current: number; maximum: number } | undefined;
  if (h) {
    currentHealth.value = h.current;
    maximumHealth.value = h.maximum;
  }
  currentGold.value = Number(sheet.value.gold) || 0;
  inspiration.value = Number(sheet.value.inspiration) || 0;
  concentratingOn.value = (sheet.value.concentratingOn as string) || null;
  const slots = sheet.value.spellSlots as Record<string, number> | undefined;
  if (slots) spellSlotsUsed.value = { ...slots };
  const total = sheet.value.spellSlotsTotal as Record<string, number> | undefined;
  if (total) spellSlotsTotal.value = { ...total };
  activeConditions.value = [...((sheet.value.activeConditions as string[]) || [])];
  inventory.value = [...((sheet.value.inventory as Array<{ id: string; name: string; quantity: number }>) || [])];
}

onMounted(async () => {
  try {
    const [charRes, condRes] = await Promise.all([
      api.get<Record<string, unknown>>(`/characters/${id.value}`, auth.token ?? undefined),
      api.get<Array<{ id: string; nameEs: string }>>('/conditions', auth.token ?? undefined),
    ]);
    sheet.value = charRes;
    conditionsList.value = condRes ?? [];
    syncFromSheet();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar';
  } finally {
    loading.value = false;
  }
});

async function saveStats() {
  saving.value = true;
  error.value = '';
  try {
    const body: Record<string, unknown> = {
      currentHealth: currentHealth.value,
      maximumHealth: maximumHealth.value,
      currentGold: currentGold.value,
      inspirationPoints: inspiration.value,
      concentratingOn: concentratingOn.value ?? '',
    };
    if (Object.keys(spellSlotsUsed.value).length) body.spellSlotsUsed = spellSlotsUsed.value;
    await api.patch(`/characters/${id.value}/stats`, body, auth.token ?? undefined);
    sheet.value = await api.get(`/characters/${id.value}`, auth.token ?? undefined);
    syncFromSheet();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al guardar';
  } finally {
    saving.value = false;
  }
}

function adjustHealth(delta: number) {
  currentHealth.value = Math.max(0, Math.min(maximumHealth.value, currentHealth.value + delta));
}

async function setConditions(ids: string[]) {
  try {
    await api.put(`/characters/${id.value}/conditions`, { conditionIds: ids }, auth.token ?? undefined);
    activeConditions.value = [...ids];
    if (sheet.value) (sheet.value as Record<string, unknown>).activeConditions = ids;
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
  setConditions(activeConditions.value.filter(id => id !== cid));
}

async function addInventoryItem() {
  if (!newItemName.value.trim()) return;
  try {
    const item = await api.post<{ id: string; name: string; quantity: number }>(
      `/characters/${id.value}/inventory`,
      { name: newItemName.value.trim(), quantity: newItemQty.value },
      auth.token ?? undefined
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
    await api.patch(`/characters/${id.value}/inventory/${itemId}`, { quantity: q }, auth.token ?? undefined);
    const i = inventory.value.findIndex(x => x.id === itemId);
    if (i >= 0) inventory.value[i] = { ...inventory.value[i], quantity: q };
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al actualizar';
  }
}

async function removeInventoryItem(itemId: string) {
  try {
    await api.delete(`/characters/${id.value}/inventory/${itemId}`, auth.token ?? undefined);
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

function back() {
  router.push('/personajes');
}
function goSheet() {
  router.push(`/personajes/${id.value}`);
}
</script>

<template>
  <div class="page">
    <header class="header">
      <h1>ARCANUM</h1>
      <div class="nav">
        <button type="button" class="btn ghost" @click="goSheet">Ficha</button>
        <button type="button" class="btn ghost" @click="back">← Volver</button>
      </div>
    </header>

    <main class="main">
      <div v-if="loading" class="loading">Cargando...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <template v-else-if="sheet">
        <h2 class="title">{{ (sheet.nameEs as string) || (sheet.nameEn as string) }}</h2>
        <p class="subtitle">En partida · Nivel {{ sheet.level }} {{ sheet.classNameEs }}</p>

        <section class="panel">
          <h3>Vida y recursos</h3>
          <div class="hp-row">
            <div class="hp-box">
              <label>PG</label>
              <div class="hp-controls">
                <button type="button" class="btn small" @click="adjustHealth(-5)">−5</button>
                <button type="button" class="btn small" @click="adjustHealth(-1)">−1</button>
                <span class="hp-value">{{ currentHealth }} / {{ maximumHealth }}</span>
                <button type="button" class="btn small" @click="adjustHealth(1)">+1</button>
                <button type="button" class="btn small" @click="adjustHealth(5)">+5</button>
              </div>
              <input
                v-model.number="currentHealth"
                type="number"
                min="0"
                :max="maximumHealth"
                class="hp-input"
              />
            </div>
            <div class="hp-box">
              <label>PG máx.</label>
              <input v-model.number="maximumHealth" type="number" min="1" class="hp-input" />
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Oro</label>
              <input v-model.number="currentGold" type="number" min="0" class="input-num" />
            </div>
            <div class="field">
              <label>Inspiración</label>
              <input v-model.number="inspiration" type="number" min="0" max="10" class="input-num" />
            </div>
          </div>
        </section>

        <section v-if="spellLevels.length" class="panel">
          <h3>Puntos de hechizo</h3>
          <div class="spell-slots">
            <div v-for="l in spellLevels" :key="l" class="slot-row">
              <span class="slot-label">Nivel {{ l }}</span>
              <div class="slot-controls">
                <button type="button" class="btn small" @click="adjustSpellSlot(`level${l}`, -1)">−</button>
                <span class="slot-value">
                  {{ spellSlotsUsed[`level${l}`] ?? 0 }} / {{ spellSlotsTotal[`level${l}`] ?? 0 }}
                </span>
                <button type="button" class="btn small" @click="adjustSpellSlot(`level${l}`, 1)">+</button>
              </div>
            </div>
          </div>
        </section>

        <section class="panel">
          <h3>Concentración</h3>
          <div class="concentration-row">
            <input
              v-model="concentratingOn"
              type="text"
              placeholder="Hechizo en el que concentras (ej. Imagen silenciosa)"
              class="input-text"
            />
            <button v-if="concentratingOn" type="button" class="btn ghost small" @click="concentratingOn = null">
              Limpiar
            </button>
          </div>
        </section>

        <section class="panel">
          <h3>Efectos de estado</h3>
          <div class="conditions-add">
            <select v-model="conditionToAdd" class="select">
              <option value="">— Añadir condición —</option>
              <option v-for="c in conditionsList" :key="c.id" :value="c.id">{{ c.nameEs }}</option>
            </select>
            <button type="button" class="btn primary small" @click="addCondition">Añadir</button>
          </div>
          <div v-if="activeConditions.length" class="chips">
            <span v-for="cid in activeConditions" :key="cid" class="chip">
              {{ conditionName(cid) }}
              <button type="button" class="chip-remove" @click="removeCondition(cid)" aria-label="Quitar">×</button>
            </span>
          </div>
          <p v-else class="muted">Ninguna condición activa</p>
        </section>

        <section class="panel">
          <h3>Inventario</h3>
          <div class="inventory-add">
            <input v-model="newItemName" type="text" placeholder="Nombre del objeto" class="input-text" />
            <input v-model.number="newItemQty" type="number" min="1" class="input-num narrow" />
            <button type="button" class="btn primary small" @click="addInventoryItem">Añadir</button>
          </div>
          <ul v-if="inventory.length" class="inventory-list">
            <li v-for="item in inventory" :key="item.id" class="inventory-item">
              <input
                :value="item.quantity"
                type="number"
                min="0"
                class="input-num narrow"
                @change="(e: Event) => updateInventoryQuantity(item.id, Number((e.target as HTMLInputElement).value))"
              />
              <span class="item-name">× {{ item.name }}</span>
              <button type="button" class="btn ghost small danger" @click="removeInventoryItem(item.id)">Eliminar</button>
            </li>
          </ul>
          <p v-else class="muted">Sin objetos</p>
        </section>

        <div class="save-row">
          <button type="button" class="btn primary" :disabled="saving" @click="saveStats">
            {{ saving ? 'Guardando...' : 'Guardar vida, oro, inspiración, hechizos y concentración' }}
          </button>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--card-bg, #1e1e2e);
  border-bottom: 1px solid var(--border, #333);
}
.header h1 {
  font-size: 1.35rem;
  margin: 0;
  letter-spacing: 0.05em;
  color: var(--accent, #c9a227);
}
.nav {
  display: flex;
  gap: 0.5rem;
}
.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
}
.btn.small {
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
}
.btn.primary {
  background: var(--accent, #c9a227);
  color: #1a1a1a;
}
.btn.ghost {
  background: transparent;
  color: var(--text-muted, #888);
}
.btn.ghost:hover {
  color: var(--text, #e0e0e0);
}
.btn.ghost.danger:hover {
  color: #e57373;
}
.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.main {
  flex: 1;
  padding: 1.5rem;
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
}
.title {
  margin: 0 0 0.25rem 0;
  font-size: 1.5rem;
}
.subtitle {
  color: var(--text-muted, #888);
  margin: 0 0 1.5rem 0;
  font-size: 0.9rem;
}
.panel {
  background: var(--card-bg, #1e1e2e);
  border: 1px solid var(--border, #333);
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}
.panel h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--accent, #c9a227);
}

.hp-row {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.hp-box {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.hp-box label,
.field label {
  font-size: 0.8rem;
  color: var(--text-muted, #888);
}
.hp-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.hp-value {
  min-width: 5rem;
  text-align: center;
  font-weight: 600;
}
.hp-input,
.input-num,
.input-text {
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--border, #333);
  background: var(--bg, #252535);
  color: var(--text, #e0e0e0);
  font-size: 0.95rem;
}
.input-num.narrow {
  width: 4rem;
}
.input-text {
  flex: 1;
  min-width: 0;
}
.row {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.spell-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.slot-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.slot-label {
  font-size: 0.9rem;
  min-width: 4rem;
}
.slot-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.slot-value {
  min-width: 3rem;
  text-align: center;
  font-size: 0.9rem;
}

.concentration-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.conditions-add {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.select {
  flex: 1;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--border, #333);
  background: var(--bg, #252535);
  color: var(--text, #e0e0e0);
  font-size: 0.95rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  background: var(--bg, #252535);
  border-radius: 6px;
  font-size: 0.85rem;
}
.chip-remove {
  background: none;
  border: none;
  color: var(--text-muted, #888);
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  padding: 0 0.15rem;
}
.chip-remove:hover {
  color: #e57373;
}

.inventory-add {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}
.inventory-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.inventory-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--border, #333);
}
.inventory-item:last-child {
  border-bottom: none;
}
.item-name {
  flex: 1;
  font-size: 0.95rem;
}

.save-row {
  margin-top: 1rem;
}
.muted {
  color: var(--text-muted, #888);
  font-size: 0.9rem;
  margin: 0;
}
.error {
  color: #e57373;
}
.loading {
  color: var(--text-muted, #888);
}
</style>
