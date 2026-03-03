<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCampaignStore } from '../stores/campaigns';
import { api } from '../api/client';
import type { CampaignCharacterDto, CampaignInviteLinkDto, CampaignInviteItemDto } from '../types/api';
import AppHeader from '../components/AppHeader.vue';
import ContextHelp from '../components/ContextHelp.vue';

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
const inviteDays = ref(7);
const inviteLink = ref('');
const creatingInvite = ref(false);
const inviteLinks = ref<CampaignInviteItemDto[]>([]);
const loadingInvites = ref(false);
const revokingToken = ref<string | null>(null);

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
        if (isMaster.value) loadInviteLinks();
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
        if (isMaster.value) loadInviteLinks();
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

async function createInviteLink() {
  if (!campaignId.value) return;
  creatingInvite.value = true;
  try {
    const data = await api.post<CampaignInviteLinkDto>(`/campaigns/${campaignId.value}/invite-link`, {
      expiresInDays: inviteDays.value,
    });
    inviteLink.value = data.inviteUrl;
    await loadInviteLinks();
  } catch (e) {
    campaignsStore.error = e instanceof Error ? e.message : 'Error al crear invitación';
  } finally {
    creatingInvite.value = false;
  }
}

async function copyInviteLink() {
  if (!inviteLink.value) return;
  try {
    await navigator.clipboard.writeText(inviteLink.value);
  } catch {
    campaignsStore.error = 'No se pudo copiar el enlace';
  }
}

async function copyInviteUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    campaignsStore.error = 'No se pudo copiar el enlace';
  }
}

async function loadInviteLinks() {
  if (!campaignId.value || !isMaster.value) return;
  loadingInvites.value = true;
  try {
    inviteLinks.value = await api.get<CampaignInviteItemDto[]>(`/campaigns/${campaignId.value}/invite-links`);
  } catch {
    inviteLinks.value = [];
  } finally {
    loadingInvites.value = false;
  }
}

async function revokeInvite(token: string) {
  if (!campaignId.value) return;
  revokingToken.value = token;
  try {
    await api.post(`/campaigns/${campaignId.value}/invite-links/${token}/revoke`, {});
    await loadInviteLinks();
  } catch (e) {
    campaignsStore.error = e instanceof Error ? e.message : 'Error al revocar invitación';
  } finally {
    revokingToken.value = null;
  }
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
      <div v-if="campaignsStore.loading && !campaignsStore.current" class="loader-wrap">
        <div class="loader"></div>
        <p>Cargando campaña...</p>
      </div>

      <template v-else-if="campaignsStore.current">
        <div class="breadcrumb animate-fade-in">
          <button type="button" class="back-link" @click="goBack">← Campañas</button>
        </div>
        <ContextHelp
          title="Gestión de campaña"
          :tips="[
            'Como Máster puedes editar esta campaña y administrar miembros.',
            'Revisa personajes vinculados para saltar directo a su ficha.',
            'Mantén descripción e imagen actualizadas para orientar al grupo.'
          ]"
          compact
        />

        <section class="hero dark-card animate-fade-in">
          <div class="hero-content">
            <div v-if="!editing" class="header-row">
              <h1 class="campaign-name">{{ campaignsStore.current.name }}</h1>
              <span
                class="badge"
                :class="campaignsStore.current.role === 'master' ? 'badge-gold' : 'badge-arcane'"
              >
                {{ campaignsStore.current.role === 'master' ? 'Máster' : 'Jugador' }}
              </span>
              <button v-if="isMaster" type="button" class="btn-ghost btn-sm" @click="startEdit" aria-label="Editar campaña">Editar</button>
            </div>
            <form v-else class="edit-form" @submit.prevent="saveEdit">
              <input v-model="editName" type="text" required placeholder="Nombre de la campaña" aria-label="Nombre" />
              <textarea v-model="editDescription" rows="2" placeholder="Descripción" aria-label="Descripción"></textarea>
              <input v-model="editImageUrl" type="url" placeholder="URL de imagen (opcional)" aria-label="URL imagen" />
              <div class="edit-actions">
                <button type="button" class="btn-ghost btn-sm" @click="cancelEdit">Cancelar</button>
                <button type="submit" class="btn-arc btn-sm" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
              </div>
            </form>
            <p v-if="!editing && campaignsStore.current.description" class="description">
              {{ campaignsStore.current.description }}
            </p>
            <div v-if="isMaster && !editing" class="invite-zone">
              <label for="invite-days" class="invite-label">Invitación por enlace</label>
              <div class="invite-row">
                <select id="invite-days" v-model.number="inviteDays" class="invite-select">
                  <option :value="1">1 día</option>
                  <option :value="3">3 días</option>
                  <option :value="7">7 días</option>
                  <option :value="14">14 días</option>
                  <option :value="30">30 días</option>
                </select>
                <button type="button" class="btn-arc btn-sm" :disabled="creatingInvite" @click="createInviteLink">
                  {{ creatingInvite ? 'Generando…' : 'Generar enlace' }}
                </button>
              </div>
              <div v-if="inviteLink" class="invite-result">
                <input :value="inviteLink" readonly class="invite-input" aria-label="Enlace de invitación" />
                <button type="button" class="btn-gold btn-sm" @click="copyInviteLink">Copiar</button>
              </div>
              <div class="invite-list-wrap">
                <p class="invite-list-title">Enlaces recientes</p>
                <p v-if="loadingInvites" class="empty-note">Cargando invitaciones...</p>
                <ul v-else-if="inviteLinks.length" class="invite-list" role="list">
                  <li v-for="link in inviteLinks.slice(0, 5)" :key="link.token" class="invite-item" role="listitem">
                    <span class="invite-expire">
                      Expira: {{ new Date(link.expiresAt).toLocaleDateString() }}
                      <span v-if="link.revoked" class="badge badge-danger">Revocada</span>
                    </span>
                    <div class="invite-item-actions">
                      <button type="button" class="btn-ghost btn-sm" @click="copyInviteUrl(link.inviteUrl)">Copiar</button>
                      <button
                        v-if="!link.revoked"
                        type="button"
                        class="btn-danger btn-sm"
                        :disabled="revokingToken === link.token"
                        @click="revokeInvite(link.token)"
                      >
                        {{ revokingToken === link.token ? '…' : 'Revocar' }}
                      </button>
                    </div>
                  </li>
                </ul>
                <p v-else class="empty-note">Aún no hay enlaces creados.</p>
              </div>
            </div>
            <div v-if="campaignsStore.error" class="error-banner" role="alert">{{ campaignsStore.error }}</div>
            <div v-if="isMaster && !editing" class="danger-zone">
              <button
                type="button"
                class="btn-danger btn-sm"
                :disabled="deleteConfirm"
                @click="deleteConfirm = true"
                aria-label="Iniciar proceso de eliminación"
              >
                {{ deleteConfirm ? '¿Seguro? Clic para confirmar' : 'Eliminar campaña' }}
              </button>
              <button v-if="deleteConfirm" type="button" class="btn-danger btn-sm" @click="doDelete" aria-label="Confirmar eliminación">Confirmar</button>
              <button v-if="deleteConfirm" type="button" class="btn-ghost btn-sm" @click="deleteConfirm = false">Cancelar</button>
            </div>
          </div>
        </section>

        <hr class="runic-separator" />

        <div class="detail-grid">
          <section class="section dark-card animate-fade-in" aria-labelledby="members-title">
            <h2 id="members-title" class="section-title">Miembros</h2>
            <ul class="members-list" role="list">
              <li v-for="m in campaignsStore.current.members" :key="m.user_id" class="member" role="listitem">
                <span class="member-avatar" aria-hidden="true">{{ m.username.charAt(0).toUpperCase() }}</span>
                <span class="member-name">{{ m.username }}</span>
                <span class="badge" :class="m.role === 'master' ? 'badge-gold' : 'badge-arcane'">
                  {{ m.role === 'master' ? 'Máster' : 'Jugador' }}
                </span>
              </li>
            </ul>
          </section>

          <section class="section dark-card animate-fade-in" aria-labelledby="chars-title">
            <h2 id="chars-title" class="section-title">Personajes en campaña</h2>
            <div v-if="loadingChars" class="loading-inline" aria-live="polite">Cargando...</div>
            <p v-else-if="characters.length === 0" class="empty-note">Ningún personaje asociado aún.</p>
            <ul v-else class="chars-list" role="list">
              <li
                v-for="ch in characters"
                :key="ch.id"
                class="char-item"
                role="listitem"
                tabindex="0"
                @click="goCharacter(ch.id)"
                @keydown.enter="goCharacter(ch.id)"
              >
                <span class="char-icon" aria-hidden="true">◈</span>
                <div class="char-details">
                  <span class="char-name">{{ ch.name_es || ch.name_en }}</span>
                  <span class="char-meta">Nivel {{ ch.level }} · {{ className(ch.class_id) }}</span>
                </div>
                <span v-if="ch.username" class="char-user">{{ ch.username }}</span>
              </li>
            </ul>
          </section>
        </div>
      </template>

      <div v-else class="empty-state dark-card animate-fade-in">
        <p class="empty-note">Campaña no encontrada o sin acceso.</p>
        <button type="button" class="btn-ghost" @click="goBack">Volver a campañas</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.main {
  flex: 1;
  padding: 2rem 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}
.breadcrumb { margin-bottom: 1rem; }
.back-link {
  background: none;
  border: none;
  color: var(--arcane);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.95rem;
  padding: 0.25rem 0;
  transition: color var(--ease-quick), text-shadow var(--ease-quick);
}
.back-link:hover { color: #93c5fd; text-shadow: 0 0 8px rgba(96,165,250,0.35); }

/* Hero */
.hero { padding: 1.5rem 1.75rem; margin-bottom: 0; }
.hero-content { display: flex; flex-direction: column; gap: 0.85rem; }
.header-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.campaign-name { font-family: var(--font-title); font-size: 1.6rem; margin: 0; font-weight: 600; letter-spacing: 0.05em; }

.description { margin: 0; color: var(--text-muted); font-size: 1rem; line-height: 1.6; }

.edit-form { display: flex; flex-direction: column; gap: 0.75rem; }
.edit-form input, .edit-form textarea { width: 100%; font-family: var(--font-body); }
.edit-form textarea { resize: vertical; }
.edit-actions { display: flex; gap: 0.5rem; }

.invite-zone {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.6rem 0;
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
}
.invite-label {
  color: var(--text-muted);
  font-family: var(--font-data);
  font-size: 0.8rem;
}
.invite-row { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.invite-select { width: 120px; }
.invite-result { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.invite-input {
  flex: 1;
  min-width: 220px;
  font-family: var(--font-data);
}
.invite-list-wrap { margin-top: 0.35rem; }
.invite-list-title {
  margin: 0 0 0.4rem 0;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-family: var(--font-data);
}
.invite-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.invite-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: rgba(255,255,255,0.02);
}
.invite-expire { color: var(--text-muted); font-size: 0.82rem; }
.invite-item-actions { display: flex; gap: 0.35rem; }

.danger-zone {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(248,113,113,0.15);
}

/* Grid de detalle */
.detail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
.section { padding: 1.25rem 1.5rem; }

/* Miembros */
.members-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.member { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.6rem; border-radius: 6px; transition: background var(--ease-quick); }
.member:hover { background: rgba(255,255,255,0.03); }
.member-avatar {
  width: 2rem; height: 2rem;
  display: flex; align-items: center; justify-content: center;
  background: var(--arcane-dim);
  border: 1px solid var(--border-arcane);
  border-radius: 50%;
  font-family: var(--font-title);
  font-size: 0.8rem;
  color: var(--arcane);
  flex-shrink: 0;
}
.member-name { flex: 1; font-weight: 500; color: var(--text-primary); font-size: 0.95rem; }

/* Personajes */
.chars-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.char-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  cursor: pointer;
  transition: background var(--ease-quick), border-color var(--ease-quick);
}
.char-item:hover { background: rgba(96,165,250,0.06); border-color: var(--border-arcane); }
.char-item:focus-visible { outline: 2px solid var(--arcane); outline-offset: 2px; }
.char-icon { color: var(--arcane); opacity: 0.5; font-size: 0.9rem; flex-shrink: 0; }
.char-details { flex: 1; min-width: 0; }
.char-name { font-weight: 600; color: var(--text-primary); font-size: 0.95rem; display: block; }
.char-meta { font-family: var(--font-data); font-size: 0.8rem; color: var(--text-muted); }
.char-user { font-family: var(--font-data); font-size: 0.78rem; color: var(--gold); }

.empty-note { color: var(--text-faint); font-style: italic; font-size: 0.9rem; margin: 0; }
.loading-inline { color: var(--text-muted); font-size: 0.9rem; }
.empty-state { text-align: center; padding: 3rem 2rem; max-width: 360px; margin: 2rem auto; }

@media (max-width: 560px) {
  .detail-grid { grid-template-columns: 1fr; }
  .header-row { gap: 0.5rem; }
}
</style>
