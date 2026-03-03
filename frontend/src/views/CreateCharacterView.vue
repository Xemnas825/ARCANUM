<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCampaignStore } from '../stores/campaigns';
import { pathWithCampaign } from '../stores/campaigns';
import { api } from '../api/client';
import type { CharacterCreationOptionsDto } from '../types/api';
import AppHeader from '../components/AppHeader.vue';

const router = useRouter();
const auth = useAuthStore();
const campaignsStore = useCampaignStore();

const options = ref<CharacterCreationOptionsDto | null>(null);
const loading = ref(true);
const sending = ref(false);
const error = ref('');

const nameEs = ref('');
const nameEn = ref('');
const raceId = ref('');
const subraceId = ref('');
const classId = ref('');
const subclassId = ref('');
const backgroundId = ref('');
const alignmentId = ref('');
const campaignId = ref('');
const skillProficiencies = ref<string[]>([]);

// Estadísticas: método y valores
const abilityMethod = ref<'standard' | 'dice'>('standard');
const abilities = ref({ strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 });
const diceRolled = ref(false);

const personalityIdeals = ref('');
const personalityBonds = ref('');
const personalityFlaws = ref('');

const selectedRace = ref<CharacterCreationOptionsDto['races'][0] | null>(null);
const selectedClass = ref<CharacterCreationOptionsDto['classes'][0] | null>(null);

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const ABILITY_KEYS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const;
const ABILITY_NAMES: Record<string, string> = {
  strength: 'Fuerza',
  dexterity: 'Destreza',
  constitution: 'Constitución',
  intelligence: 'Inteligencia',
  wisdom: 'Sabiduría',
  charisma: 'Carisma',
};

async function loadOptions(campaignIdForOptions: string | null) {
  loading.value = true;
  error.value = '';
  try {
    const path = pathWithCampaign('/character-creation-options', campaignIdForOptions || null);
    options.value = await api.get<CharacterCreationOptionsDto>(path);
    if (options.value?.races?.length) raceId.value = options.value.races[0]?.id ?? '';
    if (options.value?.classes?.length) classId.value = options.value.classes[0]?.id ?? '';
    applyStandardArray();
    updateSelected();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar opciones';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  campaignsStore.fetchCampaigns();
  await loadOptions(campaignId.value || null);
});

watch(campaignId, async (newId) => {
  if (options.value) await loadOptions(newId || null);
});

function updateSelected() {
  if (!options.value) return;
  selectedRace.value = options.value.races.find((r) => r.id === raceId.value) ?? null;
  selectedClass.value = options.value.classes.find((c) => c.id === classId.value) ?? null;
  subraceId.value = '';
  subclassId.value = '';
  skillProficiencies.value = [];
}

function applyStandardArray() {
  abilityMethod.value = 'standard';
  diceRolled.value = false;
  const arr = [...STANDARD_ARRAY];
  ABILITY_KEYS.forEach((key, i) => {
    abilities.value[key] = arr[i] ?? 10;
  });
}

function roll4d6DropLowest(): number {
  const rolls = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
  rolls.sort((a, b) => b - a);
  return (rolls[0] ?? 0) + (rolls[1] ?? 0) + (rolls[2] ?? 0);
}

function rollAbilities() {
  abilityMethod.value = 'dice';
  const values = Array.from({ length: 6 }, () => roll4d6DropLowest());
  for (let i = 0; i < ABILITY_KEYS.length; i++) {
    const key = ABILITY_KEYS[i];
    const val = values[i];
    if (key !== undefined && val !== undefined) abilities.value[key] = val;
  }
  diceRolled.value = true;
}

function toggleSkill(key: string) {
  const list = skillProficiencies.value;
  const max = 2;
  if (list.includes(key)) {
    skillProficiencies.value = list.filter((k) => k !== key);
  } else if (list.length < max) {
    skillProficiencies.value = [...list, key];
  }
}

const skillHint = computed(() => {
  const opts = selectedClass.value?.skillOptions?.length ?? 0;
  if (opts === 0) return null;
  const n = skillProficiencies.value.length;
  if (n === 2) return 'Has elegido 2 competencias.';
  if (n === 1) return 'Puedes elegir 1 competencia más para esta clase.';
  return 'Recomendado: elige 2 competencias de la lista para esta clase.';
});

const canSubmit = computed(() => {
  if (!nameEs.value.trim() || !raceId.value || !classId.value) return false;
  const opts = selectedClass.value?.skillOptions?.length ?? 0;
  if (opts > 0 && skillProficiencies.value.length < 2) return false;
  return true;
});

async function submit() {
  if (!auth.user || !nameEs.value.trim() || !raceId.value || !classId.value) {
    error.value = 'Nombre, raza y clase son obligatorios';
    return;
  }
  const opts = selectedClass.value?.skillOptions?.length ?? 0;
  if (opts > 0 && skillProficiencies.value.length < 2) {
    error.value = 'Elige 2 competencias de la clase antes de crear el personaje.';
    return;
  }
  error.value = '';
  sending.value = true;
  try {
    const body = {
      nameEs: nameEs.value.trim(),
      nameEn: nameEn.value.trim() || undefined,
      raceId: raceId.value,
      subraceId: subraceId.value || undefined,
      classId: classId.value,
      subclassId: subclassId.value || undefined,
      backgroundId: backgroundId.value || undefined,
      alignmentId: alignmentId.value || undefined,
      campaignId: campaignId.value.trim() || undefined,
      skillProficiencies: skillProficiencies.value.length ? skillProficiencies.value : undefined,
      personality: {
        ideals: personalityIdeals.value.trim() || undefined,
        bonds: personalityBonds.value.trim() || undefined,
        flaws: personalityFlaws.value.trim() || undefined,
      },
      abilities: {
        strength: abilities.value.strength,
        dexterity: abilities.value.dexterity,
        constitution: abilities.value.constitution,
        intelligence: abilities.value.intelligence,
        wisdom: abilities.value.wisdom,
        charisma: abilities.value.charisma,
      },
    };
    await api.post('/characters', body);
    router.push('/personajes');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al crear personaje';
  } finally {
    sending.value = false;
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
      <h2 class="title">Nuevo personaje</h2>
      <p class="subtitle">Completa los apartados para crear tu ficha de D&D 5e.</p>

      <div v-if="loading" class="loading-wrap">
        <div class="loader"></div>
        <p>Cargando opciones...</p>
      </div>

      <form v-else-if="options" @submit.prevent="submit" class="form">
        <p v-if="error" class="error">{{ error }}</p>

        <!-- 1. Datos básicos -->
        <section class="panel parchment-panel animate-fade-in">
          <h3 class="panel-title">Datos básicos</h3>
          <div class="row">
            <div class="field">
              <label>Nombre (español) *</label>
              <input v-model="nameEs" type="text" required placeholder="Ej. Thorin" />
            </div>
            <div class="field">
              <label>Nombre (inglés)</label>
              <input v-model="nameEn" type="text" placeholder="Opcional" />
            </div>
          </div>
          <div v-if="campaignsStore.list.length > 0" class="field">
            <label>Asociar a campaña</label>
            <select v-model="campaignId">
              <option value="">— Sin campaña —</option>
              <option v-for="c in campaignsStore.list" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <p class="hint">Opcional. Si eliges una campaña, el personaje quedará vinculado a ella.</p>
          </div>
          <div class="row">
            <div class="field">
              <label>Raza *</label>
              <select v-model="raceId" @change="updateSelected">
                <option v-for="r in options.races" :key="r.id" :value="r.id">{{ r.nameEs }}</option>
              </select>
            </div>
            <div class="field" v-if="selectedRace?.subraces?.length">
              <label>Subraza</label>
              <select v-model="subraceId">
                <option value="">—</option>
                <option v-for="sr in selectedRace!.subraces" :key="sr.id" :value="sr.id">{{ sr.nameEs }}</option>
              </select>
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Clase *</label>
              <select v-model="classId" @change="updateSelected">
                <option v-for="c in options.classes" :key="c.id" :value="c.id">{{ c.nameEs }}</option>
              </select>
            </div>
            <div class="field" v-if="selectedClass?.subclasses?.length">
              <label>Subclase</label>
              <select v-model="subclassId">
                <option value="">—</option>
                <option v-for="sc in selectedClass!.subclasses" :key="sc.id" :value="sc.id">{{ sc.nameEs }}</option>
              </select>
            </div>
          </div>
        </section>

        <!-- 2. Estadísticas -->
        <section class="panel parchment-panel animate-fade-in">
          <h3 class="panel-title">Características (estadísticas)</h3>
          <div class="ability-method">
            <button type="button" class="method-btn" :class="{ active: abilityMethod === 'standard' }" @click="applyStandardArray">
              Modo estándar
            </button>
            <button type="button" class="method-btn" :class="{ active: abilityMethod === 'dice' }" @click="rollAbilities">
              Tiradas de dados
            </button>
          </div>
          <p class="hint">
            <span v-if="abilityMethod === 'standard'">Array estándar: 15, 14, 13, 12, 10, 8. Asigna cada valor a la característica que quieras.</span>
            <span v-else>4d6 y quitar el más bajo, 6 veces. Pulsa "Tiradas de dados" para generar.</span>
          </p>
          <div class="abilities-grid">
            <div v-for="key in ABILITY_KEYS" :key="key" class="ability-field">
              <label>{{ ABILITY_NAMES[key] }}</label>
              <input v-model.number="abilities[key]" type="number" min="8" max="20" step="1" />
            </div>
          </div>
        </section>

        <!-- 3. Trasfondo y alineamiento -->
        <section class="panel parchment-panel animate-fade-in">
          <h3 class="panel-title">Trasfondo y alineamiento</h3>
          <div class="row">
            <div class="field">
              <label>Trasfondo</label>
              <select v-model="backgroundId">
                <option value="">— Elegir —</option>
                <option v-for="b in options.backgrounds" :key="b.id" :value="b.id">{{ b.nameEs }}</option>
              </select>
            </div>
            <div class="field">
              <label>Alineamiento</label>
              <select v-model="alignmentId">
                <option value="">— Elegir —</option>
                <option v-for="a in options.alignments" :key="a.id" :value="a.id">{{ a.nameEs }}</option>
              </select>
            </div>
          </div>
        </section>

        <!-- 4. Personalidad (rasgos del trasfondo) -->
        <section class="panel parchment-panel animate-fade-in">
          <h3 class="panel-title">Personalidad</h3>
          <p class="hint">Ideales, vínculos y defectos (suelen venir del trasfondo, pero puedes personalizarlos).</p>
          <div class="field">
            <label>Ideales</label>
            <textarea v-model="personalityIdeals" rows="2" placeholder="Qué principios guían a tu personaje..."></textarea>
          </div>
          <div class="field">
            <label>Vínculos</label>
            <textarea v-model="personalityBonds" rows="2" placeholder="Personas, lugares o objetos importantes..."></textarea>
          </div>
          <div class="field">
            <label>Defectos</label>
            <textarea v-model="personalityFlaws" rows="2" placeholder="Debilidades o rasgos negativos..."></textarea>
          </div>
        </section>

        <!-- 5. Competencias -->
        <section class="panel parchment-panel animate-fade-in" v-if="selectedClass?.skillOptions?.length">
          <h3 class="panel-title">Competencias de la clase</h3>
          <p class="hint">Elige 2 competencias de la lista (obligatorio para esta clase).</p>
          <p v-if="skillHint" class="hint skill-hint" :class="{ 'skill-warn': selectedClass?.skillOptions?.length && skillProficiencies.length < 2 }">
            {{ skillHint }}
          </p>
          <div class="chips">
            <button
              v-for="key in selectedClass!.skillOptions"
              :key="key"
              type="button"
              class="chip"
              :class="{ active: skillProficiencies.includes(key) }"
              @click="toggleSkill(key)"
            >
              {{ key }}
            </button>
          </div>
        </section>

        <div class="actions">
          <button type="button" class="btn ghost" @click="back">Cancelar</button>
          <button type="submit" class="btn primary" :disabled="sending || !canSubmit">
            {{ sending ? 'Creando...' : 'Crear personaje' }}
          </button>
        </div>
      </form>
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
  padding: 2rem 1.5rem;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}
.title {
  font-family: var(--font-title);
  font-size: 1.55rem;
  margin: 0 0 0.35rem 0;
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 0.06em;
}
.subtitle {
  color: var(--ink-muted);
  margin: 0 0 1.75rem 0;
  font-size: 1rem;
}

.loading-wrap {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.6);
}
.loader {
  width: 36px;
  height: 36px;
  margin: 0 auto 0.75rem;
  border: 3px solid rgba(201, 162, 39, 0.2);
  border-top-color: #c9a227;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.panel {
  border-radius: 6px;
  padding: 1.5rem;
  box-shadow: var(--shadow-paper);
}
.panel-title {
  font-family: var(--font-title);
  margin: 0 0 1rem 0;
  font-size: 1.05rem;
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 0.04em;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-parchment);
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.field label {
  font-size: 0.85rem;
  color: var(--ink-muted);
  font-weight: 600;
}
.field input,
.field select,
.field textarea {
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--border-parchment);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.5);
  color: var(--ink);
  font-size: 1rem;
  font-family: inherit;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
}
.field textarea {
  resize: vertical;
  min-height: 60px;
}
.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--accent-gold);
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 0 0 2px var(--accent-glow);
}
.hint {
  font-size: 0.9rem;
  color: var(--ink-muted);
  margin: 0 0 1rem 0;
}
.skill-hint {
  margin-top: -0.5rem;
}
.skill-hint.skill-warn {
  color: var(--accent-gold);
  font-weight: 500;
}

.ability-method {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.method-btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.method-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}
.method-btn.active {
  border-color: var(--accent-gold);
  background: rgba(184, 134, 11, 0.15);
  color: var(--accent-gold);
}
.abilities-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.ability-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.ability-field label {
  font-size: 0.85rem;
  color: var(--ink-muted);
}
.ability-field input {
  width: 100%;
  padding: 0.5rem;
  text-align: center;
  font-weight: 600;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.chip {
  padding: 0.4rem 0.85rem;
  border-radius: 4px;
  border: 1px solid var(--border-parchment);
  background: rgba(255, 255, 255, 0.4);
  color: var(--ink);
  font-size: 0.9rem;
  cursor: pointer;
  text-transform: capitalize;
  transition: all 0.2s ease;
}
.chip:hover {
  background: rgba(255, 255, 255, 0.6);
  border-color: var(--accent-gold);
}
.chip.active {
  border-color: var(--accent-gold);
  background: rgba(184, 134, 11, 0.2);
  color: var(--accent-gold);
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}
.btn {
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}
.btn:hover {
  transform: translateY(-1px);
}
.btn.primary {
  background: linear-gradient(180deg, var(--accent-gold-light) 0%, var(--accent-gold) 100%);
  color: var(--ink);
  border: 1px solid var(--parchment-shadow);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.2), inset 0 1px 0 rgba(255,255,255,0.3);
}
.btn.primary:hover:not(:disabled) {
  box-shadow: 0 4px 14px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.3);
}
.btn.primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}
.error {
  color: #b71c1c;
  margin: 0;
  font-size: 0.9rem;
  padding: 0.5rem;
  background: rgba(183, 28, 28, 0.08);
  border-radius: 4px;
  border: 1px solid rgba(183, 28, 28, 0.2);
}
.loading-wrap {
  color: var(--ink-muted);
}
</style>
