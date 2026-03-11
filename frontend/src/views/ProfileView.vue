<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toasts';
import AppHeader from '../components/AppHeader.vue';

const router = useRouter();
const auth = useAuthStore();
const toasts = useToastStore();

const username  = ref(auth.user?.username ?? '');
const email     = ref(auth.user?.email ?? '');
const role      = ref<'player' | 'dm'>(auth.user?.role === 'dm' ? 'dm' : 'player');
const password  = ref('');
const password2 = ref('');
const saving    = ref(false);
const errorMsg  = ref('');

const roleBadge = computed(() => auth.user?.role === 'dm' ? '📖 DM' : '⚔️ Jugador');

async function save() {
  errorMsg.value = '';
  if (password.value && password.value !== password2.value) {
    errorMsg.value = 'Las contraseñas no coinciden';
    return;
  }
  if (password.value && password.value.length < 6) {
    errorMsg.value = 'La contraseña debe tener al menos 6 caracteres';
    return;
  }
  saving.value = true;
  try {
    const updates: Record<string, string> = {
      username: username.value.trim(),
      email: email.value.trim(),
      role: role.value,
    };
    if (password.value) updates.password = password.value;
    await auth.updateProfile(updates);
    password.value  = '';
    password2.value = '';
    toasts.push('Perfil actualizado correctamente', 'success');
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Error al guardar';
    toasts.push(errorMsg.value, 'error');
  } finally {
    saving.value = false;
  }
}

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="page">
    <AppHeader />
    <main class="main profile-main">
      <div class="profile-wrap animate-fade-in">
        <!-- Cabecera de perfil -->
        <div class="profile-hero dark-card">
          <div class="avatar-circle">
            {{ auth.user?.username?.charAt(0).toUpperCase() }}
          </div>
          <div class="hero-info">
            <h1 class="hero-name">{{ auth.user?.username }}</h1>
            <span class="hero-role-badge" :class="auth.user?.role">{{ roleBadge }}</span>
            <p class="hero-email">{{ auth.user?.email }}</p>
          </div>
        </div>

        <div class="profile-grid">
          <!-- Formulario de datos -->
          <section class="dark-card profile-section">
            <h2 class="section-heading">Datos de la cuenta</h2>
            <p v-if="errorMsg" class="error-banner">{{ errorMsg }}</p>

            <form @submit.prevent="save" class="profile-form">
              <div class="form-row">
                <label class="form-label">Nombre de usuario</label>
                <input v-model="username" type="text" required />
              </div>
              <div class="form-row">
                <label class="form-label">Correo electrónico</label>
                <input v-model="email" type="email" required />
              </div>

              <hr class="runic-separator" />
              <p class="change-pass-hint">Deja en blanco para no cambiar la contraseña</p>
              <div class="form-row">
                <label class="form-label">Nueva contraseña</label>
                <input v-model="password" type="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres" />
              </div>
              <div class="form-row">
                <label class="form-label">Confirmar contraseña</label>
                <input v-model="password2" type="password" autocomplete="new-password" placeholder="Repite la nueva contraseña" />
              </div>

              <button type="submit" class="btn-arc btn-lg save-btn" :disabled="saving">
                <span v-if="saving">Guardando…</span>
                <span v-else>Guardar cambios</span>
              </button>
            </form>
          </section>

          <!-- Selector de rol -->
          <section class="dark-card profile-section">
            <h2 class="section-heading">Tu rol en ARCANUM</h2>
            <p class="role-info-text">
              Este rol define tu experiencia predeterminada en la plataforma.
              Puedes cambiar de rol en cualquier campaña individual.
            </p>

            <div class="role-options">
              <button
                type="button"
                class="role-option"
                :class="{ active: role === 'player' }"
                @click="role = 'player'"
              >
                <div class="role-opt-icon">⚔️</div>
                <div class="role-opt-body">
                  <strong>Jugador</strong>
                  <p>Crea y gestiona tus personajes. Únete a campañas, lleva tu ficha al día, rastrea hechizos e inventario en partida.</p>
                </div>
                <span v-if="role === 'player'" class="role-check">✓</span>
              </button>

              <button
                type="button"
                class="role-option"
                :class="{ active: role === 'dm' }"
                @click="role = 'dm'"
              >
                <div class="role-opt-icon">📖</div>
                <div class="role-opt-body">
                  <strong>Dungeon Master</strong>
                  <p>Crea campañas, gestiona encuentros de combate, supervisa a los personajes del grupo y controla la narrativa.</p>
                </div>
                <span v-if="role === 'dm'" class="role-check">✓</span>
              </button>
            </div>

            <button
              type="button"
              class="btn-arc save-btn"
              :disabled="saving"
              @click="save"
            >
              Guardar rol
            </button>
          </section>
        </div>

        <!-- Zona de peligro -->
        <section class="dark-card profile-section danger-zone">
          <h2 class="section-heading danger-title">Sesión</h2>
          <p class="danger-desc">Cerrar sesión en todos los dispositivos en este navegador.</p>
          <button type="button" class="btn-danger" @click="logout">Cerrar sesión</button>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.profile-main {
  padding: 1.5rem;
  max-width: 860px;
  margin: 0 auto;
  width: 100%;
}

.profile-wrap { display: flex; flex-direction: column; gap: 1.25rem; }

/* Hero */
.profile-hero {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem 1.75rem;
}
.avatar-circle {
  width: 60px; height: 60px;
  border-radius: 50%;
  background: var(--arcane-dim);
  border: 2px solid var(--border-arcane);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-title);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--arcane);
  flex-shrink: 0;
}
.hero-name { font-family: var(--font-title); font-size: 1.4rem; margin: 0 0 0.3rem 0; }
.hero-email { color: var(--text-muted); font-family: var(--font-data); font-size: 0.88rem; margin: 0.25rem 0 0 0; }
.hero-role-badge {
  display: inline-block;
  font-family: var(--font-data);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 99px;
  background: var(--arcane-dim);
  color: var(--arcane);
  border: 1px solid var(--border-arcane);
}
.hero-role-badge.dm {
  background: var(--gold-dim);
  color: var(--gold-bright);
  border-color: var(--border-gold);
}

/* Grid de secciones */
.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}
@media (max-width: 640px) { .profile-grid { grid-template-columns: 1fr; } }

.profile-section { padding: 1.5rem; }
.section-heading {
  font-family: var(--font-title);
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

/* Formulario */
.profile-form { display: flex; flex-direction: column; gap: 0.85rem; }
.form-row { display: flex; flex-direction: column; gap: 0.3rem; }
.form-label { font-family: var(--font-data); font-size: 0.8rem; font-weight: 500; color: var(--text-muted); }
.form-row input { width: 100%; }
.change-pass-hint { font-family: var(--font-data); font-size: 0.78rem; color: var(--text-faint); margin: 0; }
.save-btn { margin-top: 0.5rem; width: 100%; justify-content: center; display: flex; }

/* Selector de rol */
.role-info-text { font-family: var(--font-data); font-size: 0.85rem; color: var(--text-muted); margin: 0 0 1rem 0; line-height: 1.4; }
.role-options { display: flex; flex-direction: column; gap: 0.65rem; margin-bottom: 1rem; }
.role-option {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: 7px;
  text-align: left;
  cursor: pointer;
  position: relative;
  transition: border-color var(--ease-quick), background var(--ease-quick);
}
.role-option:hover { border-color: var(--border-arcane); background: var(--bg-card-hover); }
.role-option.active {
  border-color: var(--arcane);
  background: var(--arcane-dim);
  box-shadow: var(--arcane-glow);
}
.role-opt-icon { font-size: 1.4rem; flex-shrink: 0; line-height: 1; padding-top: 0.1rem; }
.role-opt-body strong { font-family: var(--font-data); font-size: 0.88rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 0.2rem; }
.role-opt-body p { font-family: var(--font-data); font-size: 0.8rem; color: var(--text-muted); margin: 0; line-height: 1.4; }
.role-check { margin-left: auto; color: var(--arcane); font-size: 1rem; flex-shrink: 0; }

/* Zona de peligro */
.danger-zone { border-color: rgba(216, 64, 64, 0.2); }
.danger-title { color: #e86060; }
.danger-desc { font-family: var(--font-data); font-size: 0.88rem; color: var(--text-muted); margin: 0 0 1rem 0; }
</style>
