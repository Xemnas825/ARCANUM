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
    <div class="auth-card">
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
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="tu@email.com"
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
  padding: 1rem;
}
.auth-card {
  width: 100%;
  max-width: 380px;
  background: var(--card-bg, #1e1e2e);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
.title {
  font-size: 1.75rem;
  margin: 0 0 0.25rem 0;
  letter-spacing: 0.05em;
  color: var(--accent, #c9a227);
}
.subtitle {
  color: var(--text-muted, #888);
  margin: 0 0 1.5rem 0;
  font-size: 0.95rem;
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
  font-size: 0.85rem;
  color: var(--text-muted, #888);
}
.field input {
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--border, #333);
  border-radius: 8px;
  background: var(--input-bg, #252535);
  color: var(--text, #e0e0e0);
  font-size: 1rem;
}
.field input::placeholder {
  color: #666;
}
.field input:focus {
  outline: none;
  border-color: var(--accent, #c9a227);
}
.error {
  color: #e57373;
  font-size: 0.9rem;
  margin: 0;
}
.btn {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn.primary {
  background: var(--accent, #c9a227);
  color: #1a1a1a;
}
.toggle {
  margin: 1.25rem 0 0 0;
  text-align: center;
}
.link {
  background: none;
  border: none;
  color: var(--link, #8ab4f8);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
  text-decoration: underline;
}
.link:hover {
  color: #a3c5f9;
}
</style>
