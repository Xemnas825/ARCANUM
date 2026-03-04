<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const isRegister = ref(false);
const loading = ref(false);
const error = ref('');

const username = ref('');
const email = ref('');
const password = ref('');
const passwordConfirm = ref('');

const title = computed(() => (isRegister.value ? 'Crear cuenta' : 'Iniciar sesión'));
const submitLabel = computed(() => (isRegister.value ? 'Registrarse' : 'Entrar'));

const canSubmit = computed(() => {
  if (!email.value.trim() || !password.value) return false;
  if (isRegister.value) {
    if (!username.value.trim()) return false;
    if (password.value.length < 6) return false;
    if (password.value !== passwordConfirm.value) return false;
  }
  return true;
});

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    if (isRegister.value) {
      if (password.value !== passwordConfirm.value) {
        error.value = 'Las contraseñas no coinciden';
        return;
      }
      await auth.register(username.value.trim(), email.value.trim(), password.value);
    } else {
      await auth.login(email.value.trim(), password.value);
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '';
    const target = redirect.startsWith('/') ? redirect : '/personajes';
    router.replace(target);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al procesar';
  } finally {
    loading.value = false;
  }
}

function toggleMode() {
  isRegister.value = !isRegister.value;
  error.value = '';
}
</script>

<template>
  <div class="auth-bg">
    <!-- Partículas decorativas -->
    <div class="particles" aria-hidden="true">
      <span class="particle p1 arc">✦</span>
      <span class="particle p2 gold">◈</span>
      <span class="particle p3 arc">✦</span>
      <span class="particle p4 gold">◇</span>
      <span class="particle p5 arc">✦</span>
      <span class="particle p6 gold">⬡</span>
      <span class="particle p7 arc">◈</span>
    </div>

    <div class="auth-card animate-fade-in-scale" role="main">
      <div class="brand" aria-label="ARCANUM">
        <div class="brand-rune" aria-hidden="true">✦</div>
        <h1 class="brand-name">ARCANUM</h1>
        <p class="brand-tagline">Sistema de gestión D&amp;D 5e</p>
      </div>

      <hr class="runic-separator" />

      <div class="form-header">
        <h2 class="form-title">{{ title }}</h2>
      </div>

      <form class="form" @submit.prevent="submit" novalidate>
        <div v-if="isRegister" class="field">
          <label for="username" class="label">Usuario</label>
          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="Nombre de aventurero"
            required
            :aria-required="true"
          />
        </div>

        <div class="field">
          <label for="email" class="label">{{ isRegister ? 'Correo electrónico' : 'Usuario o correo' }}</label>
          <input
            id="email"
            v-model="email"
            :type="isRegister ? 'email' : 'text'"
            :autocomplete="isRegister ? 'email' : 'username'"
            :placeholder="isRegister ? 'tu@email.com' : 'Usuario o correo electrónico'"
            required
            :aria-required="true"
          />
        </div>

        <div class="field">
          <label for="password" class="label">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            required
            minlength="6"
          />
          <span v-if="isRegister" class="hint">Mínimo 6 caracteres</span>
        </div>

        <div v-if="isRegister" class="field">
          <label for="passwordConfirm" class="label">Repetir contraseña</label>
          <input
            id="passwordConfirm"
            v-model="passwordConfirm"
            type="password"
            autocomplete="new-password"
            placeholder="••••••••"
          />
          <span v-if="passwordConfirm && password !== passwordConfirm" class="hint hint-error" role="alert">
            Las contraseñas no coinciden
          </span>
        </div>

        <div v-if="error" class="error-banner" role="alert">{{ error }}</div>

        <button
          type="submit"
          class="btn-gold submit-btn btn-lg"
          :disabled="!canSubmit || loading"
          :aria-busy="loading"
        >
          <span v-if="loading" class="btn-spinner" aria-hidden="true"></span>
          {{ loading ? 'Espera...' : submitLabel }}
        </button>
      </form>

      <p class="toggle-row">
        <button type="button" class="link-btn" @click="toggleMode">
          {{ isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate' }}
        </button>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-bg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse 70% 55% at 50% 50%, rgba(167, 139, 250, 0.07) 0%, transparent 65%),
    radial-gradient(ellipse 50% 40% at 20% 80%, rgba(45, 212, 191, 0.04) 0%, transparent 50%);
}

/* Partículas flotantes decorativas */
.particles { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
.particle {
  position: absolute;
  opacity: 0;
  font-size: 0.8rem;
  animation: floatParticle 9s ease-in-out infinite;
}
.particle.arc  { color: var(--arcane); filter: drop-shadow(0 0 4px rgba(45,212,191,0.4)); }
.particle.gold { color: var(--magic);  filter: drop-shadow(0 0 4px rgba(167,139,250,0.4)); }
.p1 { left: 10%; top: 20%; animation-delay: 0s;   opacity: 0.22; }
.p2 { left: 85%; top: 15%; animation-delay: 1.5s; opacity: 0.16; font-size: 1.1rem; }
.p3 { left: 70%; top: 75%; animation-delay: 3s;   opacity: 0.20; }
.p4 { left: 20%; top: 70%; animation-delay: 4.5s; opacity: 0.14; font-size: 1.2rem; }
.p5 { left: 50%; top: 5%;  animation-delay: 2s;   opacity: 0.12; }
.p6 { left: 35%; top: 88%; animation-delay: 5.5s; opacity: 0.18; font-size: 1rem; }
.p7 { left: 92%; top: 55%; animation-delay: 0.8s; opacity: 0.14; font-size: 0.7rem; }

@keyframes floatParticle {
  0%, 100% { transform: translateY(0) rotate(0deg);   opacity: 0.12; }
  50%       { transform: translateY(-22px) rotate(18deg); opacity: 0.32; }
}

/* Tarjeta central */
.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border-arcane);
  border-radius: 12px;
  padding: 2.5rem 2.25rem;
  box-shadow: var(--shadow-raised), var(--arcane-glow);
  position: relative;
  z-index: 1;
}

/* Marca */
.brand { text-align: center; margin-bottom: 1.25rem; }
.brand-rune {
  font-size: 2rem;
  color: var(--gold);
  display: block;
  margin-bottom: 0.5rem;
  animation: shimmer 3s ease-in-out infinite;
  filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.45));
}
.brand-name {
  font-family: var(--font-title);
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: var(--text-primary);
  margin: 0 0 0.35rem 0;
  background: linear-gradient(135deg, var(--gold-light) 0%, var(--gold) 50%, var(--gold-light) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.brand-tagline {
  font-family: var(--font-data);
  font-size: 0.8rem;
  color: var(--text-faint);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0;
}

/* Encabezado de formulario */
.form-header { margin-bottom: 1.25rem; }
.form-title {
  font-family: var(--font-title);
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin: 0;
}

/* Formulario */
.form { display: flex; flex-direction: column; gap: 1.1rem; }
.field { display: flex; flex-direction: column; gap: 0.4rem; }
.label {
  font-family: var(--font-data);
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.field input { width: 100%; }

.hint { font-family: var(--font-data); font-size: 0.78rem; color: var(--text-faint); }
.hint-error { color: var(--danger); }

/* Botón de envío */
.submit-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
  font-family: var(--font-title);
  letter-spacing: 0.06em;
}
.btn-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(45, 212, 191, 0.2);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Toggle */
.toggle-row { margin: 1.25rem 0 0 0; text-align: center; }
.link-btn {
  background: none;
  border: none;
  color: var(--arcane);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.92rem;
  padding: 0.25rem;
  transition: color var(--ease-quick), text-shadow var(--ease-quick);
}
.link-btn:hover { color: var(--arcane); }
</style>
