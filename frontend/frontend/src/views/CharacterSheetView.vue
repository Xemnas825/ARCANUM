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
      <div class="logo">
        <span class="logo-icon">✦</span>
        <h1>ARCANUM</h1>
      </div>
      <button type="button" class="btn ghost" @click="back">← Volver</button>
    </header>

    <main class="main">
      <div v-if="loading" class="loading-wrap">
        <div class="loader"></div>
        <p>Cargando ficha...</p>
      </div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <div v-else-if="sheet" class="sheet animate-fade-in">
        <div class="sheet-header parchment-panel">
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
          <div class="stat-block parchment-panel">
            <h3>Características</h3>
            <div class="abilities" v-if="sheet.abilities && typeof sheet.abilities === 'object'">
              <div v-for="(val, key) in (sheet.abilities as Record<string, number>)" :key="key" class="ability">
                <span class="ability-name">{{ key }}</span>
                <span class="ability-value">{{ val }}</span>
              </div>
            </div>
          </div>
          <div class="stat-block parchment-panel">
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
  background: linear-gradient(180deg, rgba(42, 32, 24, 0.98) 0%, rgba(26, 21, 16, 0.99) 100%);
  border-bottom: 2px solid var(--border-parchment);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
.logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.logo-icon {
  color: var(--accent-gold);
  font-size: 1.25rem;
}
.header h1 {
  font-family: var(--font-title);
  font-size: 1.4rem;
  margin: 0;
  letter-spacing: 0.15em;
  color: var(--accent-gold-light);
  font-weight: 700;
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
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
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
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 0.04em;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-parchment);
}
.abilities {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.35rem 1rem;
}
.ability-name {
  text-transform: capitalize;
  color: var(--ink-muted);
  font-size: 0.95rem;
}
.ability-value {
  font-weight: 700;
  color: var(--ink);
}
.stat-block p {
  margin: 0.4rem 0;
  font-size: 0.95rem;
  color: var(--ink);
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
