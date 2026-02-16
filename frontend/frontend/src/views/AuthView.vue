<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();

const isRegister = ref(false);
const loading = ref(false);
const error = ref('');

const username = ref('');
const email = ref('');
const password = ref('');
const passwordConfirm = ref('');

const title = computed(() => (isRegister.value ? 'Registro' : 'Iniciar sesión'));
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
    router.push('/personajes');
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
  <div class="auth">
    <div class="auth-card parchment-panel animate-fade-in-scale">
      <div class="auth-ornament">✦</div>
      <h1 class="title">ARCANUM</h1>
      <p class="subtitle">{{ title }}</p>

      <form @submit.prevent="submit" class="form">
        <div v-if="isRegister" class="field">
          <label for="username">Usuario</label>
          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="Nombre de usuario"
            required
          />
        </div>
        <div class="field">
          <label for="email">{{ isRegister ? 'Email' : 'Usuario o correo' }}</label>
          <input
            id="email"
            v-model="email"
            :type="isRegister ? 'email' : 'text'"
            :autocomplete="isRegister ? 'email' : 'username'"
            :placeholder="isRegister ? 'tu@email.com' : 'Usuario o correo electrónico'"
            required
          />
        </div>
        <div class="field">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="password"
            placeholder="••••••••"
            required
          />
        </div>
        <div v-if="isRegister" class="field">
          <label for="passwordConfirm">Repetir contraseña</label>
          <input
            id="passwordConfirm"
            v-model="passwordConfirm"
            type="password"
            autocomplete="new-password"
            placeholder="••••••••"
          />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" class="btn primary" :disabled="!canSubmit || loading">
          {{ loading ? 'Espera...' : submitLabel }}
        </button>
      </form>

      <p class="toggle">
        <button type="button" class="link" @click="toggleMode">
          {{ isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate' }}
        </button>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background-image: radial-gradient(ellipse 80% 50% at 50% 50%, rgba(184, 134, 11, 0.06) 0%, transparent 70%);
}
.auth-card {
  width: 100%;
  max-width: 400px;
  border-radius: 6px;
  padding: 2.25rem;
  box-shadow: var(--shadow-paper), 0 20px 50px rgba(0, 0, 0, 0.25);
  position: relative;
}
.auth-ornament {
  position: absolute;
  top: 1rem;
  right: 1rem;
  color: var(--accent-gold);
  opacity: 0.5;
  font-size: 1.1rem;
}
.title {
  font-family: var(--font-title);
  font-size: 1.9rem;
  margin: 0 0 0.25rem 0;
  letter-spacing: 0.2em;
  color: var(--ink);
  font-weight: 700;
}
.subtitle {
  color: var(--ink-muted);
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.field label {
  font-size: 0.9rem;
  color: var(--ink-muted);
  font-weight: 600;
}
.field input {
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--border-parchment);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.5);
  color: var(--ink);
  font-size: 1rem;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}
.field input::placeholder {
  color: var(--ink-muted);
  opacity: 0.7;
}
.field input:focus {
  outline: none;
  border-color: var(--accent-gold);
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 0 0 2px var(--accent-glow);
}
.error {
  color: #b71c1c;
  font-size: 0.9rem;
  margin: 0;
  padding: 0.5rem;
  background: rgba(183, 28, 28, 0.08);
  border-radius: 4px;
  border: 1px solid rgba(183, 28, 28, 0.2);
}
.btn {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font-body);
  border: 1px solid var(--parchment-shadow);
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
.btn.primary {
  background: linear-gradient(180deg, var(--accent-gold-light) 0%, var(--accent-gold) 100%);
  color: var(--ink);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.2), inset 0 1px 0 rgba(255,255,255,0.3);
}
.btn.primary:hover:not(:disabled) {
  box-shadow: 0 4px 14px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.3);
}
.toggle {
  margin: 1.5rem 0 0 0;
  text-align: center;
}
.link {
  background: none;
  border: none;
  color: var(--accent-gold);
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.link:hover {
  color: var(--accent-gold-light);
}
</style>
