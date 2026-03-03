<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useCampaignStore } from '../stores/campaigns';
import AppHeader from '../components/AppHeader.vue';

const router = useRouter();
const campaignsStore = useCampaignStore();
const name = ref('');
const description = ref('');
const imageUrl = ref('');
const sending = ref(false);
const error = ref('');

async function submit() {
  if (!name.value.trim()) {
    error.value = 'El nombre de la campaña es obligatorio';
    return;
  }
  error.value = '';
  sending.value = true;
  try {
    const campaign = await campaignsStore.createCampaign({
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      image_url: imageUrl.value.trim() || undefined,
    });
    router.push(`/campanas/${campaign.id}`);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al crear la campaña';
  } finally {
    sending.value = false;
  }
}

function back() {
  router.push('/campanas');
}
</script>

<template>
  <div class="page">
    <AppHeader>
      <template #actions>
        <button type="button" class="btn ghost" @click="back">← Volver</button>
      </template>
    </AppHeader>

    <main class="main">
      <h2 class="title">Nueva campaña</h2>
      <p class="subtitle">Crea una campaña como Master. Luego podrás invitar jugadores y añadir contenido homebrew.</p>

      <form @submit.prevent="submit" class="form">
        <p v-if="error" class="error">{{ error }}</p>

        <section class="panel parchment-panel">
          <h3 class="panel-title">Datos de la campaña</h3>
          <div class="field">
            <label>Nombre de la campaña *</label>
            <input v-model="name" type="text" required placeholder="Ej. La senda del dragón" />
          </div>
          <div class="field">
            <label>Descripción</label>
            <textarea v-model="description" rows="3" placeholder="Resumen o ambientación de la partida (opcional)"></textarea>
          </div>
          <div class="field">
            <label>URL de imagen</label>
            <input v-model="imageUrl" type="url" placeholder="https://... (opcional)" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn ghost" @click="back">Cancelar</button>
            <button type="submit" class="btn primary" :disabled="sending">
              {{ sending ? 'Creando…' : 'Crear campaña' }}
            </button>
          </div>
        </section>
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
.btn.primary:hover:not(:disabled) {
  box-shadow: 0 4px 14px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.3);
}
.btn.primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
}
.title {
  font-family: var(--font-title);
  margin: 0 0 0.25rem 0;
  font-size: 1.6rem;
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 0.08em;
}
.subtitle {
  margin: 0 0 2rem 0;
  color: var(--ink-muted);
  font-size: 1rem;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.panel {
  padding: 1.5rem 2rem;
  border-radius: 8px;
}
.panel-title {
  font-family: var(--font-title);
  margin: 0 0 1.25rem 0;
  font-size: 1.1rem;
  color: var(--ink);
  font-weight: 600;
}
.field {
  margin-bottom: 1.25rem;
}
.field:last-of-type {
  margin-bottom: 0;
}
.field label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
}
.field input,
.field textarea {
  width: 100%;
  padding: 0.6rem 1rem;
  border: 1px solid var(--border-parchment);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.6);
  color: var(--ink);
  font-size: 1rem;
  font-family: var(--font-body);
}
.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--accent-gold);
  box-shadow: 0 0 0 2px var(--accent-glow);
}
.field textarea {
  resize: vertical;
  min-height: 80px;
}
.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}
.error {
  color: #b71c1c;
  padding: 1rem;
  background: rgba(183, 28, 28, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(183, 28, 28, 0.3);
}
</style>
