<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api/client';
import type { JoinCampaignByInviteDto } from '../types/api';

const route = useRoute();
const router = useRouter();

const token = computed(() => route.params.token as string);
const loading = ref(true);
const error = ref('');
const joinedText = ref('');
const targetCampaignId = ref<string | null>(null);

onMounted(async () => {
  try {
    const data = await api.post<JoinCampaignByInviteDto>(`/campaigns/join/${token.value}`, {});
    targetCampaignId.value = data.campaignId;
    joinedText.value = data.alreadyMember
      ? `Ya formas parte de "${data.campaignName}".`
      : `Te has unido a "${data.campaignName}".`;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo procesar la invitación';
  } finally {
    loading.value = false;
  }
});

function goCampaign() {
  if (!targetCampaignId.value) return;
  router.push(`/campanas/${targetCampaignId.value}`);
}

function goList() {
  router.push('/campanas');
}
</script>

<template>
  <div class="page">
    <main class="main">
      <section class="panel dark-card">
        <h1 class="title">Invitación de campaña</h1>
        <p v-if="loading" class="text">Procesando invitación...</p>
        <template v-else-if="error">
          <p class="error-banner">{{ error }}</p>
          <button type="button" class="btn-ghost" @click="goList">Volver a campañas</button>
        </template>
        <template v-else>
          <p class="success-banner">{{ joinedText }}</p>
          <div class="actions">
            <button type="button" class="btn-gold" @click="goCampaign">Abrir campaña</button>
            <button type="button" class="btn-ghost" @click="goList">Ir al listado</button>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<style scoped>
.main {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}
.panel {
  width: 100%;
  max-width: 520px;
  padding: 1.25rem;
}
.title {
  margin: 0 0 0.65rem 0;
}
.text {
  color: var(--text-muted);
}
.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.85rem;
}
</style>
