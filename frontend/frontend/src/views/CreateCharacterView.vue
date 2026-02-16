<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { api } from '../api/client';

const router = useRouter();
const auth = useAuthStore();

interface CreationOptions {
  races: Array<{ id: string; nameEs: string; nameEn: string; subraces?: Array<{ id: string; nameEs: string; nameEn: string }> }>;
  classes: Array<{ id: string; nameEs: string; nameEn: string; skillOptions: string[]; subclasses: Array<{ id: string; nameEs: string; nameEn: string }> }>;
  backgrounds: Array<{ id: string; nameEs: string; nameEn: string }>;
  alignments: Array<{ id: string; nameEs: string; nameEn: string }>;
}

const options = ref<CreationOptions | null>(null);
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
const skillProficiencies = ref<string[]>([]);

const selectedRace = ref<CreationOptions['races'][0] | null>(null);
const selectedClass = ref<CreationOptions['classes'][0] | null>(null);

onMounted(async () => {
  try {
    options.value = await api.get<CreationOptions>('/character-creation-options');
    if (options.value?.races?.length) raceId.value = options.value.races[0].id;
    if (options.value?.classes?.length) classId.value = options.value.classes[0].id;
    updateSelected();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar opciones';
  } finally {
    loading.value = false;
  }
});

function updateSelected() {
  if (!options.value) return;
  selectedRace.value = options.value.races.find((r) => r.id === raceId.value) ?? null;
  selectedClass.value = options.value.classes.find((c) => c.id === classId.value) ?? null;
  subraceId.value = '';
  subclassId.value = '';
  skillProficiencies.value = [];
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

async function submit() {
  if (!auth.user || !nameEs.value.trim() || !raceId.value || !classId.value) {
    error.value = 'Nombre, raza y clase son obligatorios';
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
      skillProficiencies: skillProficiencies.value.length ? skillProficiencies.value : undefined,
    };
    await api.post('/characters', body, auth.token ?? undefined);
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
    <header class="header">
      <h1>ARCANUM</h1>
      <button type="button" class="btn ghost" @click="back">← Volver</button>
    </header>

    <main class="main">
      <h2>Nuevo personaje</h2>

      <div v-if="loading" class="loading">Cargando opciones...</div>
      <form v-else-if="options" @submit.prevent="submit" class="form">
        <p v-if="error" class="error">{{ error }}</p>

        <div class="row">
          <div class="field">
            <label>Nombre (español) *</label>
            <input v-model="nameEs" type="text" required placeholder="Ej. Thorin" />
          </div>
          <div class="field">
            <label>Nombre (inglés)</label>
            <input v-model="nameEn" type="text" placeholder="Optional" />
          </div>
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

        <div class="row">
          <div class="field">
            <label>Trasfondo</label>
            <select v-model="backgroundId">
              <option value="">—</option>
              <option v-for="b in options.backgrounds" :key="b.id" :value="b.id">{{ b.nameEs }}</option>
            </select>
          </div>
          <div class="field">
            <label>Alineamiento</label>
            <select v-model="alignmentId">
              <option value="">—</option>
              <option v-for="a in options.alignments" :key="a.id" :value="a.id">{{ a.nameEs }}</option>
            </select>
          </div>
        </div>

        <div v-if="selectedClass?.skillOptions?.length" class="field">
          <label>Competencias de la clase (elige hasta 2)</label>
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
        </div>

        <div class="actions">
          <button type="button" class="btn ghost" @click="back">Cancelar</button>
          <button type="submit" class="btn primary" :disabled="sending">
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
.btn.ghost {
  background: transparent;
  color: var(--text-muted, #888);
  border: none;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 0.95rem;
}
.main {
  flex: 1;
  padding: 1.5rem;
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
}
.main h2 {
  font-size: 1.25rem;
  margin: 0 0 1.5rem 0;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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
  color: var(--text-muted, #888);
}
.field input,
.field select {
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border, #333);
  border-radius: 8px;
  background: var(--input-bg, #252535);
  color: var(--text, #e0e0e0);
  font-size: 1rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.chip {
  padding: 0.4rem 0.75rem;
  border-radius: 20px;
  border: 1px solid var(--border, #333);
  background: var(--input-bg, #252535);
  color: var(--text, #e0e0e0);
  font-size: 0.85rem;
  cursor: pointer;
  text-transform: capitalize;
}
.chip.active {
  border-color: var(--accent, #c9a227);
  background: rgba(201, 162, 39, 0.15);
  color: var(--accent, #c9a227);
}
.actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}
.btn.primary {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 8px;
  background: var(--accent, #c9a227);
  color: #1a1a1a;
  font-weight: 600;
  cursor: pointer;
}
.btn.primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.error {
  color: #e57373;
  margin: 0;
}
.loading {
  color: var(--text-muted, #888);
}
</style>
