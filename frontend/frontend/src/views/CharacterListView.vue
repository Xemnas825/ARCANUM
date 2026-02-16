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

function goPlay(id: string) {
  router.push(`/personajes/${id}/partida`);
}

function logout() {
  auth.logout();
  router.push('/login');
}

const classNames: Record<string, string> = {
  barbarian: 'Bárbaro', bard: 'Bardo', cleric: 'Clérigo', druid: 'Druida', fighter: 'Guerrero',
  monk: 'Monje', paladin: 'Paladín', ranger: 'Guardabosques', rogue: 'Pícaro', sorcerer: 'Hechicero',
  warlock: 'Brujo', wizard: 'Mago', artificer: 'Artífice',
};
function className(id: string) {
  return classNames[id] || id;
}
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="logo">
        <span class="logo-icon">✦</span>
        <h1>ARCANUM</h1>
      </div>
      <div class="user">
        <span class="username">{{ auth.user?.username }}</span>
        <button type="button" class="btn ghost" @click="logout">Salir</button>
      </div>
    </header>

    <main class="main">
      <section class="hero parchment-panel">
        <div class="hero-ornament">※</div>
        <div class="hero-content">
          <h2>Mis personajes</h2>
          <p class="hero-text">Gestiona tus fichas de D&D 5e y llévalas a la partida.</p>
          <button type="button" class="btn primary btn-hero" @click="goCreate">
            <span class="btn-icon">+</span>
            Nuevo personaje
          </button>
        </div>
        <div class="hero-ornament">※</div>
      </section>

      <p v-if="error" class="error">{{ error }}</p>

      <div v-else-if="loading" class="loading-wrap">
        <div class="loader"></div>
        <p>Cargando personajes...</p>
      </div>

      <div v-else-if="characters.length === 0" class="empty parchment-panel">
        <div class="empty-icon">📜</div>
        <h3>Aún no tienes personajes</h3>
        <p>Crea tu primera ficha para empezar a jugar.</p>
        <button type="button" class="btn primary" @click="goCreate">Crear personaje</button>
      </div>

      <ul v-else class="list">
        <li
          v-for="(c, i) in characters"
          :key="c.id"
          class="card parchment-panel"
          :style="{ animationDelay: `${i * 0.07}s` }"
          @click="goCharacter(c.id)"
        >
          <div class="card-ribbon"></div>
          <div class="card-body">
            <span class="name">{{ c.name_es || c.name_en }}</span>
            <span class="meta">
              <span class="level">Nivel {{ c.level }}</span>
              <span class="dot">·</span>
              <span>{{ className(c.class_id) }}</span>
              <span class="dot">·</span>
              <span class="race">{{ c.race_id }}</span>
            </span>
            <div class="card-actions">
              <button type="button" class="btn card-btn" @click.stop="goCharacter(c.id)">Ficha</button>
              <button type="button" class="btn card-btn primary" @click.stop="goPlay(c.id)">En partida</button>
            </div>
          </div>
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
  font-size: 1.35rem;
  text-shadow: 0 0 12px var(--accent-glow);
  animation: shimmer 3s ease-in-out infinite;
}
.header h1 {
  font-family: var(--font-title);
  font-size: 1.5rem;
  margin: 0;
  letter-spacing: 0.2em;
  color: var(--accent-gold-light);
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
.user {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.username {
  color: var(--parchment-dark);
  font-size: 0.95rem;
}
.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family: var(--font-body);
}
.btn.primary {
  background: linear-gradient(180deg, var(--accent-gold-light) 0%, var(--accent-gold) 100%);
  color: var(--ink);
  border: 1px solid var(--parchment-shadow);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.2), inset 0 1px 0 rgba(255,255,255,0.3);
}
.btn.primary:hover {
  box-shadow: 0 4px 14px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.3);
}
.btn.ghost {
  background: transparent;
  color: var(--parchment-dark);
  border: 1px solid transparent;
}
.btn.ghost:hover {
  color: var(--parchment);
  border-color: var(--border-parchment);
}

.main {
  flex: 1;
  padding: 2rem 1.5rem;
  max-width: 920px;
  margin: 0 auto;
  width: 100%;
}

.hero {
  margin-bottom: 2.5rem;
  padding: 2rem 2.5rem;
  position: relative;
  animation: fadeIn 0.6s ease;
}
.hero-ornament {
  position: absolute;
  top: 1rem;
  color: var(--accent-gold);
  opacity: 0.5;
  font-size: 1rem;
}
.hero-ornament:first-of-type { left: 1.5rem; }
.hero-ornament:last-of-type { right: 1.5rem; }
.hero-content h2 {
  font-family: var(--font-title);
  margin: 0 0 0.5rem 0;
  font-size: 1.6rem;
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 0.08em;
}
.hero-text {
  margin: 0 0 1.5rem 0;
  color: var(--ink-muted);
  font-size: 1.05rem;
}
.btn-hero {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1.05rem;
}
.btn-icon {
  font-size: 1.2rem;
  line-height: 1;
}

.loading-wrap {
  text-align: center;
  padding: 3rem;
  color: var(--ink-muted);
  animation: fadeIn 0.4s ease;
}
.loader {
  width: 44px;
  height: 44px;
  margin: 0 auto 1rem;
  border: 3px solid var(--parchment-shadow);
  border-top-color: var(--accent-gold);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty {
  text-align: center;
  padding: 3rem 2rem;
  animation: fadeIn 0.5s ease;
}
.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.8;
  filter: grayscale(0.2);
}
.empty h3 {
  font-family: var(--font-title);
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: var(--ink);
  font-weight: 600;
}
.empty p {
  margin: 0 0 1.5rem 0;
  color: var(--ink-muted);
  font-size: 1rem;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.card {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  animation: cardIn 0.45s ease backwards;
}
@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow: var(--shadow-float), 0 0 0 1px var(--accent-gold);
}
.card-ribbon {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--accent-gold), transparent);
  opacity: 0.6;
}
.card-body {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.name {
  font-family: var(--font-title);
  font-weight: 600;
  font-size: 1.2rem;
  color: var(--ink);
  letter-spacing: 0.03em;
}
.meta {
  font-size: 0.95rem;
  color: var(--ink-muted);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.level {
  color: var(--accent-gold);
  font-weight: 600;
}
.dot {
  opacity: 0.6;
}
.race {
  text-transform: capitalize;
}
.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.card-btn {
  padding: 0.4rem 0.9rem;
  font-size: 0.9rem;
  background: rgba(44, 24, 16, 0.08);
  color: var(--ink);
  border: 1px solid var(--border-parchment);
}
.card-btn:hover {
  background: rgba(44, 24, 16, 0.12);
  border-color: var(--accent-gold);
  color: var(--accent-gold);
}
.card-btn.primary {
  background: linear-gradient(180deg, rgba(184, 134, 11, 0.25) 0%, rgba(184, 134, 11, 0.15) 100%);
  color: var(--accent-gold);
  border-color: var(--accent-gold);
}
.card-btn.primary:hover {
  background: linear-gradient(180deg, rgba(184, 134, 11, 0.35) 0%, rgba(184, 134, 11, 0.2) 100%);
  box-shadow: 0 2px 8px var(--accent-glow);
}
.error {
  color: #b71c1c;
  text-align: center;
  padding: 1rem;
  background: rgba(183, 28, 28, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(183, 28, 28, 0.3);
}
</style>
