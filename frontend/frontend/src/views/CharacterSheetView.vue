<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { api } from '../api/client';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const sheet = ref<Record<string, unknown> | null>(null);
const loading = ref(true);
const error = ref('');

const id = computed(() => route.params.id as string);

onMounted(async () => {
  try {
    sheet.value = await api.get(`/characters/${id.value}`, auth.token ?? undefined);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar personaje';
  } finally {
    loading.value = false;
  }
});

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
      <div v-if="loading" class="loading">Cargando ficha...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <div v-else-if="sheet" class="sheet">
        <div class="sheet-header">
          <div>
            <h2>{{ (sheet.nameEs as string) || (sheet.nameEn as string) }}</h2>
            <p class="meta">
          Nivel {{ sheet.level }} · {{ (sheet.raceNameEs as string) }} · {{ (sheet.classNameEs as string) }}
              <span v-if="sheet.backgroundNameEs"> · {{ sheet.backgroundNameEs }}</span>
            </p>
          </div>
          <router-link :to="`/personajes/${sheet.id}/partida`" class="btn primary">En partida</router-link>
        </div>
        <div class="stats">
          <div class="stat-block">
            <h3>Características</h3>
            <div class="abilities" v-if="sheet.abilities && typeof sheet.abilities === 'object'">
              <div v-for="(val, key) in (sheet.abilities as Record<string, number>)" :key="key" class="ability">
                <span class="ability-name">{{ key }}</span>
                <span class="ability-value">{{ val }}</span>
              </div>
            </div>
          </div>
          <div class="stat-block">
            <h3>Combate</h3>
            <p>CA: {{ sheet.armorClass }}</p>
            <p>Iniciativa: {{ sheet.initiative }}</p>
            <p>Velocidad: {{ sheet.speed }} pies</p>
            <p>PG: {{ (sheet.health as { current: number })?.current }} / {{ (sheet.health as { maximum: number })?.maximum }}</p>
            <p>Oro: {{ sheet.gold }}</p>
          </div>
        </div>
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
}
.sheet-header .btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
  background: var(--accent, #c9a227);
  color: #1a1a1a;
  border: none;
  white-space: nowrap;
}
.sheet h2 {
  margin: 0 0 0.25rem 0;
  font-size: 1.5rem;
}
.meta {
  color: var(--text-muted, #888);
  margin: 0 0 0;
  font-size: 0.95rem;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}
.stat-block {
  background: var(--card-bg, #1e1e2e);
  border: 1px solid var(--border, #333);
  border-radius: 10px;
  padding: 1rem;
}
.stat-block h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  color: var(--accent, #c9a227);
}
.abilities {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.25rem 1rem;
}
.ability-name {
  text-transform: capitalize;
  color: var(--text-muted, #888);
}
.ability-value {
  font-weight: 600;
}
.stat-block p {
  margin: 0.35rem 0;
  font-size: 0.9rem;
}
.error {
  color: #e57373;
}
.loading {
  color: var(--text-muted, #888);
}
</style>
