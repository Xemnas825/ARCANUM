<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCampaignStore } from '../stores/campaigns';
import { api } from '../api/client';
import type { CampaignCharacterDto } from '../types/api';
import AppHeader from '../components/AppHeader.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const campaignsStore = useCampaignStore();

const campaignId = computed(() => route.params.id as string);
const characters = ref<CampaignCharacterDto[]>([]);
const loadingChars = ref(false);
const editing = ref(false);
const editName = ref('');
const editDescription = ref('');
const editImageUrl = ref('');
const saving = ref(false);
const deleteConfirm = ref(false);

const isMaster = computed(() => {
  const c = campaignsStore.current;
  return c?.role === 'master' || c?.master_user_id === auth.user?.id;
});

onMounted(() => {
  if (campaignId.value) {
    campaignsStore.fetchCampaign(campaignId.value).then(() => {
      if (campaignsStore.current) {
        editName.value = campaignsStore.current.name;
        editDescription.value = campaignsStore.current.description ?? '';
        editImageUrl.value = campaignsStore.current.image_url ?? '';
        loadCharacters();
      }
    });
  }
});

watch(campaignId, (id) => {
  if (id) {
    campaignsStore.fetchCampaign(id).then(() => {
      if (campaignsStore.current) {
        editName.value = campaignsStore.current.name;
        editDescription.value = campaignsStore.current.description ?? '';
        editImageUrl.value = campaignsStore.current.image_url ?? '';
        loadCharacters();
      }
    });
  }
});

async function loadCharacters() {
  if (!campaignId.value) return;
  loadingChars.value = true;
  try {
    characters.value = await api.get<CampaignCharacterDto[]>(`/campaigns/${campaignId.value}/characters`);
  } catch {
    characters.value = [];
  } finally {
    loadingChars.value = false;
  }
}

function startEdit() {
  if (!campaignsStore.current) return;
  editName.value = campaignsStore.current.name;
  editDescription.value = campaignsStore.current.description ?? '';
  editImageUrl.value = campaignsStore.current.image_url ?? '';
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
}

async function saveEdit() {
  if (!campaignId.value) return;
  saving.value = true;
  try {
    await campaignsStore.updateCampaign(campaignId.value, {
      name: editName.value.trim(),
      description: editDescription.value.trim() || undefined,
      image_url: editImageUrl.value.trim() || undefined,
    });
    editing.value = false;
  } catch (e) {
    campaignsStore.error = e instanceof Error ? e.message : 'Error al guardar';
  } finally {
    saving.value = false;
  }
}

async function doDelete() {
  if (!campaignId.value) return;
  try {
    await campaignsStore.deleteCampaign(campaignId.value);
    router.push('/campanas');
  } catch (e) {
    campaignsStore.error = e instanceof Error ? e.message : 'Error al eliminar';
  } finally {
    deleteConfirm.value = false;
  }
}

function goBack() {
  campaignsStore.clearCurrent();
  router.push('/campanas');
}

function goCharacter(id: string) {
  router.push(`/personajes/${id}`);
}

const classNames: Record<string, string> = {
  barbarian: 'Bárbaro', bard: 'Bardo', cleric: 'Clérigo', druid: 'Druida', fighter: 'Guerrero',
  monk: 'Monje', paladin: 'Paladín', ranger: 'Guardabosques', rogue: 'Pícaro', sorcerer: 'Hechicero',
  warlock: 'Brujo', wizard: 'Mago', artificer: 'Artífice',
};
function className(id: string) {
  return classNames[id] ?? id;
}

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="page">
    <AppHeader>
      <template #actions>
        <span class="username">{{ auth.user?.username }}</span>
        <button type="button" class="btn ghost" @click="logout">Salir</button>
      </template>
    </AppHeader>

    <main class="main">
      <div v-if="campaignsStore.loading && !campaignsStore.current" class="loading-wrap">
        <div class="loader"></div>
        <p>Cargando campaña...</p>
      </div>

      <template v-else-if="campaignsStore.current">
        <div class="breadcrumb">
          <button type="button" class="link" @click="goBack">← Campañas</button>
        </div>

        <section class="hero parchment-panel">
          <div class="hero-content">
            <div v-if="!editing" class="header-row">
              <h1 class="campaign-name">{{ campaignsStore.current.name }}</h1>
              <span class="role-badge" :class="campaignsStore.current.role">
                {{ campaignsStore.current.role === 'master' ? 'Master' : 'Jugador' }}
              </span>
              <button v-if="isMaster" type="button" class="btn ghost btn-sm" @click="startEdit">Editar</button>
            </div>
            <form v-else class="edit-form" @submit.prevent="saveEdit">
              <input v-model="editName" type="text" required class="edit-input" placeholder="Nombre" />
              <textarea v-model="editDescription" rows="2" class="edit-textarea" placeholder="Descripción"></textarea>
              <input v-model="editImageUrl" type="url" class="edit-input" placeholder="URL imagen" />
              <div class="edit-actions">
                <button type="button" class="btn ghost" @click="cancelEdit">Cancelar</button>
                <button type="submit" class="btn primary" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
              </div>
            </form>
            <p v-if="!editing && campaignsStore.current.description" class="description">
              {{ campaignsStore.current.description }}
            </p>
            <p v-if="campaignsStore.error" class="error">{{ campaignsStore.error }}</p>
            <div v-if="isMaster && !editing" class="danger-zone">
              <button
                type="button"
                class="btn danger"
                :disabled="deleteConfirm"
                @click="deleteConfirm = true"
              >
                {{ deleteConfirm ? '¿Eliminar campaña? Clic de nuevo para confirmar' : 'Eliminar campaña' }}
              </button>
              <button v-if="deleteConfirm" type="button" class="btn primary" @click="doDelete">Confirmar eliminación</button>
              <button v-if="deleteConfirm" type="button" class="btn ghost" @click="deleteConfirm = false">Cancelar</button>
            </div>
          </div>
        </section>

        <section class="section parchment-panel">
          <h2 class="section-title">Miembros</h2>
          <ul class="members-list">
            <li v-for="m in campaignsStore.current.members" :key="m.user_id" class="member">
              <span class="member-name">{{ m.username }}</span>
              <span class="role-badge small" :class="m.role">{{ m.role === 'master' ? 'Master' : 'Jugador' }}</span>
            </li>
          </ul>
        </section>

        <section class="section parchment-panel">
          <h2 class="section-title">Personajes en esta campaña</h2>
          <div v-if="loadingChars" class="loading-inline">Cargando...</div>
          <ul v-else-if="characters.length === 0" class="chars-list empty">
            <li>Ningún personaje asociado aún.</li>
          </ul>
          <ul v-else class="chars-list">
            <li
              v-for="ch in characters"
              :key="ch.id"
              class="char-item"
              @click="goCharacter(ch.id)"
            >
              <span class="char-name">{{ ch.name_es || ch.name_en }}</span>
              <span class="char-meta">Nivel {{ ch.level }} · {{ className(ch.class_id) }}</span>
              <span v-if="ch.username" class="char-user">{{ ch.username }}</span>
            </li>
          </ul>
        </section>
      </template>

      <div v-else class="empty parchment-panel">
        <p>Campaña no encontrada o sin acceso.</p>
        <button type="button" class="btn ghost" @click="goBack">Volver a campañas</button>
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
.btn.danger {
  background: rgba(183, 28, 28, 0.15);
  color: #b71c1c;
  border: 1px solid rgba(183, 28, 28, 0.4);
}
.btn.danger:hover:not(:disabled) {
  background: rgba(183, 28, 28, 0.25);
}
.btn-sm {
  padding: 0.4rem 0.75rem;
  font-size: 0.9rem;
}
.main {
  flex: 1;
  padding: 2rem 1.5rem;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}
.breadcrumb {
  margin-bottom: 1rem;
}
.link {
  background: none;
  border: none;
  color: var(--accent-gold);
  cursor: pointer;
  font-size: 0.95rem;
  font-family: var(--font-body);
}
.link:hover {
  text-decoration: underline;
}
.loading-wrap {
  text-align: center;
  padding: 3rem;
  color: var(--ink-muted);
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
.hero {
  padding: 1.5rem 2rem;
  margin-bottom: 1.5rem;
}
.hero-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.header-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.campaign-name {
  font-family: var(--font-title);
  font-size: 1.5rem;
  margin: 0;
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 0.05em;
}
.role-badge {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}
.role-badge.master {
  background: rgba(184, 134, 11, 0.2);
  color: var(--accent-gold);
  border: 1px solid var(--accent-gold);
}
.role-badge.player {
  background: rgba(44, 24, 16, 0.1);
  color: var(--ink-muted);
  border: 1px solid var(--border-parchment);
}
.role-badge.small {
  font-size: 0.75rem;
}
.description {
  margin: 0;
  color: var(--ink-muted);
  font-size: 1rem;
  line-height: 1.5;
}
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.edit-input,
.edit-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-parchment);
  border-radius: 4px;
  background: rgba(255,255,255,0.6);
  color: var(--ink);
  font-size: 1rem;
  font-family: var(--font-body);
}
.edit-actions {
  display: flex;
  gap: 0.5rem;
}
.danger-zone {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-parchment);
}
.error {
  color: #b71c1c;
  font-size: 0.95rem;
  margin: 0;
}
.section {
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
}
.section-title {
  font-family: var(--font-title);
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  color: var(--ink);
  font-weight: 600;
}
.members-list,
.chars-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.member {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-parchment);
}
.member:last-child {
  border-bottom: none;
}
.member-name {
  font-weight: 500;
  color: var(--ink);
}
.chars-list.empty {
  color: var(--ink-muted);
  font-style: italic;
  padding: 1rem 0;
}
.char-item {
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--border-parchment);
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.char-item:hover {
  background: rgba(184, 134, 11, 0.08);
  border-color: var(--accent-gold);
}
.char-name {
  font-weight: 600;
  color: var(--ink);
  display: block;
}
.char-meta {
  font-size: 0.9rem;
  color: var(--ink-muted);
}
.char-user {
  font-size: 0.85rem;
  color: var(--accent-gold);
  margin-top: 0.25rem;
  display: block;
}
.loading-inline {
  color: var(--ink-muted);
  padding: 0.5rem 0;
}
.empty {
  text-align: center;
  padding: 2rem;
}
.empty p {
  margin: 0 0 1rem 0;
  color: var(--ink-muted);
}
</style>
