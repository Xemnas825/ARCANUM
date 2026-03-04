<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCampaignStore } from '../stores/campaigns';
import { pathWithCampaign } from '../stores/campaigns';
import { api } from '../api/client';
import type { CharacterCreationOptionsDto } from '../types/api';
import AppHeader from '../components/AppHeader.vue';
import { useToastStore } from '../stores/toasts';

const router = useRouter();
const auth = useAuthStore();
const campaignsStore = useCampaignStore();
const toasts = useToastStore();

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
const selectedSubrace = computed(() => selectedRace.value?.subraces?.find((sr) => sr.id === subraceId.value) ?? null);

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

const DRAFT_KEY = 'arcanum_character_creation_draft_v1';
const hasLoadedDraft = ref(false);
const attemptedSubmit = ref(false);
const touchedName = ref(false);

function getRequiredSkillChoices(classItem: CharacterCreationOptionsDto['classes'][0] | null): number {
  const count = classItem?.skillOptions?.length ?? 0;
  if (!count) return 0;
  const explicit = classItem?.skillChoicesCount;
  if (typeof explicit === 'number' && explicit > 0) return Math.min(explicit, count);
  return Math.min(2, count);
}

function abilityModifier(score: number): number {
  return Math.floor((Number(score) - 10) / 2);
}

function raceBonusFor(key: typeof ABILITY_KEYS[number]): number {
  const raceBonus = Number(selectedRace.value?.abilityBonus?.[key] ?? 0);
  const subraceBonus = Number(selectedSubrace.value?.abilityBonus?.[key] ?? 0);
  return raceBonus + subraceBonus;
}

const finalAbilities = computed(() => ({
  strength: Number(abilities.value.strength) + raceBonusFor('strength'),
  dexterity: Number(abilities.value.dexterity) + raceBonusFor('dexterity'),
  constitution: Number(abilities.value.constitution) + raceBonusFor('constitution'),
  intelligence: Number(abilities.value.intelligence) + raceBonusFor('intelligence'),
  wisdom: Number(abilities.value.wisdom) + raceBonusFor('wisdom'),
  charisma: Number(abilities.value.charisma) + raceBonusFor('charisma'),
}));

const initialHpEstimate = computed(() => {
  const hitDice = Number(selectedClass.value?.hitDice ?? 8);
  return Math.max(1, hitDice + abilityModifier(finalAbilities.value.constitution));
});

const baseAcEstimate = computed(() => 10 + abilityModifier(finalAbilities.value.dexterity));

const raceBonusSummary = computed(() => {
  return ABILITY_KEYS
    .map((key) => ({ key, bonus: raceBonusFor(key) }))
    .filter((x) => x.bonus !== 0)
    .map((x) => `${x.bonus > 0 ? '+' : ''}${x.bonus} ${ABILITY_NAMES[x.key]}`);
});
const invalidAbilityCount = computed(() =>
  ABILITY_KEYS.filter((k) => Number(abilities.value[k]) < 8 || Number(abilities.value[k]) > 20).length
);
const nameFieldError = computed(() => {
  if (!attemptedSubmit.value && !touchedName.value) return '';
  return nameEs.value.trim() ? '' : 'El nombre en español es obligatorio.';
});
const skillsFieldError = computed(() => {
  const opts = selectedClass.value?.skillOptions?.length ?? 0;
  if (!opts) return '';
  if (!attemptedSubmit.value) return '';
  if (skillProficiencies.value.length === requiredSkillChoices.value) return '';
  return `Debes elegir ${requiredSkillChoices.value} competencias para esta clase.`;
});
const abilitiesFieldError = computed(() => {
  if (!attemptedSubmit.value) return '';
  return invalidAbilityCount.value > 0 ? 'Todas las características deben estar entre 8 y 20.' : '';
});

async function loadOptions(campaignIdForOptions: string | null) {
  loading.value = true;
  error.value = '';
  try {
    const prevRace = raceId.value;
    const prevClass = classId.value;
    const prevSubrace = subraceId.value;
    const prevSubclass = subclassId.value;
    const prevSkills = [...skillProficiencies.value];

    const path = pathWithCampaign('/character-creation-options', campaignIdForOptions || null);
    options.value = await api.get<CharacterCreationOptionsDto>(path);
    if (options.value?.races?.length) {
      raceId.value = options.value.races.some((r) => r.id === prevRace) ? prevRace : (options.value.races[0]?.id ?? '');
    }
    if (options.value?.classes?.length) {
      classId.value = options.value.classes.some((c) => c.id === prevClass) ? prevClass : (options.value.classes[0]?.id ?? '');
    }
    selectedRace.value = options.value?.races.find((r) => r.id === raceId.value) ?? null;
    selectedClass.value = options.value?.classes.find((c) => c.id === classId.value) ?? null;

    if (selectedRace.value?.subraces?.some((sr) => sr.id === prevSubrace)) subraceId.value = prevSubrace;
    else subraceId.value = '';

    if (selectedClass.value?.subclasses?.some((sc) => sc.id === prevSubclass)) subclassId.value = prevSubclass;
    else subclassId.value = '';

    const validSkills = prevSkills.filter((s) => selectedClass.value?.skillOptions?.includes(s));
    skillProficiencies.value = validSkills.slice(0, getRequiredSkillChoices(selectedClass.value));
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar opciones';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  hasLoadedDraft.value = loadDraft();
  campaignsStore.fetchCampaigns();
  if (!hasLoadedDraft.value) applyStandardArray();
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
  const max = requiredSkillChoices.value;
  if (list.includes(key)) {
    skillProficiencies.value = list.filter((k) => k !== key);
  } else if (list.length < max) {
    skillProficiencies.value = [...list, key];
  }
}

const requiredSkillChoices = computed(() => {
  return getRequiredSkillChoices(selectedClass.value);
});

const skillLabelByKey = computed(() => {
  const catalog = options.value?.skills ?? [];
  return Object.fromEntries(catalog.map((s) => [s.key, s.nameEs])) as Record<string, string>;
});

const sortedSkillOptions = computed(() => {
  const list = selectedClass.value?.skillOptions ?? [];
  return [...list].sort((a, b) => {
    const la = skillLabelByKey.value[a] ?? a;
    const lb = skillLabelByKey.value[b] ?? b;
    return la.localeCompare(lb);
  });
});

const skillHint = computed(() => {
  const opts = selectedClass.value?.skillOptions?.length ?? 0;
  if (opts === 0) return null;
  const required = requiredSkillChoices.value;
  const n = skillProficiencies.value.length;
  if (n === required) return `Has elegido ${required} competencias.`;
  const remaining = Math.max(0, required - n);
  if (remaining > 0) return `Elige ${remaining} competencia${remaining === 1 ? '' : 's'} más para esta clase.`;
  return `Elige ${required} competencias de la lista para esta clase.`;
});

const canSubmit = computed(() => {
  if (!nameEs.value.trim() || !raceId.value || !classId.value) return false;
  const opts = selectedClass.value?.skillOptions?.length ?? 0;
  if (opts > 0 && skillProficiencies.value.length !== requiredSkillChoices.value) return false;
  return true;
});

async function submit() {
  attemptedSubmit.value = true;
  if (!auth.user || !nameEs.value.trim() || !raceId.value || !classId.value) {
    error.value = 'Nombre, raza y clase son obligatorios';
    return;
  }
  if (invalidAbilityCount.value > 0) {
    error.value = 'Revisa las características: deben estar entre 8 y 20.';
    return;
  }
  const opts = selectedClass.value?.skillOptions?.length ?? 0;
  if (opts > 0 && skillProficiencies.value.length !== requiredSkillChoices.value) {
    error.value = `Elige ${requiredSkillChoices.value} competencias de la clase antes de crear el personaje.`;
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
    clearDraft(false);
    toasts.push('Personaje creado correctamente', 'success');
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

function clearDraft(notify = true) {
  localStorage.removeItem(DRAFT_KEY);
  if (notify) toasts.push('Borrador eliminado', 'info');
}

function clearDraftFromButton() {
  clearDraft(true);
}

function saveDraft() {
  const payload = {
    nameEs: nameEs.value,
    nameEn: nameEn.value,
    raceId: raceId.value,
    subraceId: subraceId.value,
    classId: classId.value,
    subclassId: subclassId.value,
    backgroundId: backgroundId.value,
    alignmentId: alignmentId.value,
    campaignId: campaignId.value,
    skillProficiencies: skillProficiencies.value,
    abilityMethod: abilityMethod.value,
    abilities: abilities.value,
    diceRolled: diceRolled.value,
    personalityIdeals: personalityIdeals.value,
    personalityBonds: personalityBonds.value,
    personalityFlaws: personalityFlaws.value,
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
}

function loadDraft(): boolean {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    nameEs.value = String(parsed.nameEs ?? '');
    nameEn.value = String(parsed.nameEn ?? '');
    raceId.value = String(parsed.raceId ?? '');
    subraceId.value = String(parsed.subraceId ?? '');
    classId.value = String(parsed.classId ?? '');
    subclassId.value = String(parsed.subclassId ?? '');
    backgroundId.value = String(parsed.backgroundId ?? '');
    alignmentId.value = String(parsed.alignmentId ?? '');
    campaignId.value = String(parsed.campaignId ?? '');
    skillProficiencies.value = Array.isArray(parsed.skillProficiencies)
      ? parsed.skillProficiencies.filter((x): x is string => typeof x === 'string')
      : [];
    abilityMethod.value = parsed.abilityMethod === 'dice' ? 'dice' : 'standard';
    const incoming = (parsed.abilities && typeof parsed.abilities === 'object') ? parsed.abilities as Record<string, unknown> : {};
    ABILITY_KEYS.forEach((k) => {
      abilities.value[k] = Number(incoming[k] ?? abilities.value[k]) || 10;
    });
    diceRolled.value = Boolean(parsed.diceRolled);
    personalityIdeals.value = String(parsed.personalityIdeals ?? '');
    personalityBonds.value = String(parsed.personalityBonds ?? '');
    personalityFlaws.value = String(parsed.personalityFlaws ?? '');
    toasts.push('Borrador restaurado', 'info');
    return true;
  } catch {
    return false;
  }
}

watch(
  [
    nameEs, nameEn, raceId, subraceId, classId, subclassId, backgroundId, alignmentId, campaignId,
    skillProficiencies, abilityMethod, abilities, diceRolled, personalityIdeals, personalityBonds, personalityFlaws,
  ],
  () => {
    saveDraft();
  },
  { deep: true }
);
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
              <input v-model="nameEs" type="text" required placeholder="Ej. Thorin" @blur="touchedName = true" />
              <p v-if="nameFieldError" class="field-error">{{ nameFieldError }}</p>
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
          <p v-if="abilitiesFieldError" class="field-error">{{ abilitiesFieldError }}</p>
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
          <p class="hint">Elige {{ requiredSkillChoices }} competencias de la lista (obligatorio para esta clase).</p>
          <p
            v-if="skillHint"
            class="hint skill-hint"
            :class="{ 'skill-warn': selectedClass?.skillOptions?.length && skillProficiencies.length < requiredSkillChoices }"
          >
            {{ skillHint }}
          </p>
          <div class="chips">
            <button
              v-for="key in sortedSkillOptions"
              :key="key"
              type="button"
              class="chip"
              :class="{ active: skillProficiencies.includes(key) }"
              @click="toggleSkill(key)"
            >
              {{ skillLabelByKey[key] || key }}
            </button>
          </div>
          <p v-if="skillsFieldError" class="field-error">{{ skillsFieldError }}</p>
        </section>

        <!-- 6. Resumen final -->
        <section class="panel parchment-panel animate-fade-in">
          <h3 class="panel-title">Resumen previo</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">HP inicial estimado</span>
              <strong class="summary-value">{{ initialHpEstimate }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">CA base estimada</span>
              <strong class="summary-value">{{ baseAcEstimate }}</strong>
            </div>
            <div class="summary-item summary-wide">
              <span class="summary-label">Bonos raciales aplicados</span>
              <p class="summary-text">
                {{ raceBonusSummary.length ? raceBonusSummary.join(' · ') : 'Sin bonos raciales directos' }}
              </p>
            </div>
            <div class="summary-item summary-wide">
              <span class="summary-label">Competencias elegidas</span>
              <p class="summary-text">
                {{ skillProficiencies.length ? skillProficiencies.map((k) => skillLabelByKey[k] || k).join(', ') : 'Ninguna' }}
              </p>
            </div>
          </div>
        </section>

        <div class="actions">
          <button type="button" class="btn ghost" @click="clearDraftFromButton">Borrar borrador</button>
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
  border: 3px solid rgba(45, 212, 191, 0.18);
  border-top-color: var(--arcane);
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
.field-error {
  margin: 0;
  color: var(--danger);
  font-size: 0.82rem;
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
  background: rgba(45, 212, 191, 0.1);
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
  background: rgba(45, 212, 191, 0.14);
  color: var(--accent-gold);
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
  flex-wrap: wrap;
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}
.summary-item {
  border: 1px solid var(--border-parchment);
  border-radius: 6px;
  padding: 0.65rem 0.8rem;
  background: rgba(255, 255, 255, 0.04);
}
.summary-wide { grid-column: 1 / -1; }
.summary-label {
  display: block;
  font-size: 0.78rem;
  color: var(--ink-muted);
  margin-bottom: 0.25rem;
}
.summary-value {
  font-family: var(--font-title);
  color: var(--ink);
}
.summary-text {
  margin: 0;
  color: var(--ink);
  font-size: 0.92rem;
}
</style>
