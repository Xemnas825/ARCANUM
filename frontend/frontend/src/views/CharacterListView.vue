<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { api } from '../api/client';

const router = useRouter();
const auth = useAuthStore();

const characters = ref<Array<{ id: string; name_es: string; name_en?: string; class_id: string; race_id: string; level: number }>>([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  if (!auth.user) return;
  loading.value = true;
  error.value = '';
  try {
    characters.value = await api.get(
      `/users/${auth.user.id}/characters`,
      auth.token ?? undefined
    );
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar personajes';
  } finally {
    loading.value = false;
  }
});

function goCreate() {
  router.push('/personajes/nuevo');
}

function goCharacter(id: string) {
  router.push(`/personajes/${id}`);
}

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="page">
    <header class="header">
      <h1>ARCANUM</h1>
      <div class="user">
        <span class="username">{{ auth.user?.username }}</span>
        <button type="button" class="btn ghost" @click="logout">Salir</button>
      </div>
    </header>

    <main class="main">
      <div class="toolbar">
        <h2>Mis personajes</h2>
        <button type="button" class="btn primary" @click="goCreate">Nuevo personaje</button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <div v-else-if="loading" class="loading">Cargando...</div>
      <div v-else-if="characters.length === 0" class="empty">
        <p>Aún no tienes personajes.</p>
        <button type="button" class="btn primary" @click="goCreate">Crear el primero</button>
      </div>
      <ul v-else class="list">
        <li
          v-for="c in characters"
          :key="c.id"
          class="card"
          @click="goCharacter(c.id)"
        >
          <span class="name">{{ c.name_es || c.name_en }}</span>
          <span class="meta">Nivel {{ c.level }} · {{ c.race_id }} · {{ c.class_id }}</span>
        </li>
      </ul>
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
.user {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.username {
  color: var(--text-muted, #888);
  font-size: 0.9rem;
}
.main {
  flex: 1;
  padding: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.toolbar h2 {
  font-size: 1.25rem;
  margin: 0;
}
.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
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
.error {
  color: #e57373;
}
.loading, .empty {
  color: var(--text-muted, #888);
  text-align: center;
  padding: 2rem;
}
.empty .btn {
  margin-top: 1rem;
}
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 1.25rem;
  background: var(--card-bg, #1e1e2e);
  border-radius: 10px;
  border: 1px solid var(--border, #333);
  cursor: pointer;
  transition: border-color 0.2s;
}
.card:hover {
  border-color: var(--accent, #c9a227);
}
.name {
  font-weight: 600;
  font-size: 1.05rem;
}
.meta {
  font-size: 0.85rem;
  color: var(--text-muted, #888);
  text-transform: capitalize;
}
</style>
