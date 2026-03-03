import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from './auth';
import type { CampaignDto, CampaignWithMembersDto, CampaignCharacterDto } from '../types/api';

const ACTIVE_CAMPAIGN_KEY = 'arcanum_active_campaign_id';

/** Re-export para compatibilidad con componentes que importan desde el store. */
export type Campaign = CampaignDto;
export type CampaignWithMembers = CampaignWithMembersDto;
export type CampaignCharacter = CampaignCharacterDto;

/** Devuelve la ruta con ?campaignId= si hay campaña activa (para inyección de homebrew). */
export function pathWithCampaign(path: string, campaignId: string | null | undefined): string {
  if (!campaignId) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}campaignId=${encodeURIComponent(campaignId)}`;
}

export const useCampaignStore = defineStore('campaigns', () => {
  const auth = useAuthStore();
  const list = ref<CampaignDto[]>([]);
  const current = ref<CampaignWithMembersDto | null>(null);
  const loading = ref(false);
  const error = ref('');

  const token = computed(() => auth.token);
  const isMaster = computed(() => (current.value?.role ?? current.value?.master_user_id === auth.user?.id) ?? false);

  let initialActive: string | null = null;
  try {
    initialActive = localStorage.getItem(ACTIVE_CAMPAIGN_KEY);
  } catch {
    initialActive = null;
  }
  const activeCampaignId = ref<string | null>(initialActive);

  const activeCampaign = computed(() => list.value.find((c) => c.id === activeCampaignId.value) ?? null);

  function setActiveCampaign(id: string | null) {
    activeCampaignId.value = id;
    if (id) localStorage.setItem(ACTIVE_CAMPAIGN_KEY, id);
    else localStorage.removeItem(ACTIVE_CAMPAIGN_KEY);
  }

  async function fetchCampaigns() {
    if (!token.value) return;
    loading.value = true;
    error.value = '';
    try {
      list.value = await api.get<CampaignDto[]>('/campaigns');
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar campañas';
      list.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchCampaign(id: string) {
    if (!token.value) return null;
    loading.value = true;
    error.value = '';
    try {
      const data = await api.get<CampaignWithMembersDto>(`/campaigns/${id}`);
      current.value = data;
      return data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar campaña';
      current.value = null;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createCampaign(payload: { name: string; description?: string; image_url?: string }) {
    const data = await api.post<CampaignDto>('/campaigns', payload);
    list.value = [data, ...list.value];
    return data;
  }

  async function updateCampaign(id: string, payload: { name?: string; description?: string; image_url?: string }) {
    const data = await api.patch<CampaignDto>(`/campaigns/${id}`, payload);
    const idx = list.value.findIndex((c) => c.id === id);
    if (idx >= 0) list.value[idx] = { ...list.value[idx], ...data };
    if (current.value?.id === id) current.value = { ...current.value, ...data };
    return data;
  }

  async function deleteCampaign(id: string) {
    await api.delete(`/campaigns/${id}`);
    list.value = list.value.filter((c) => c.id !== id);
    if (current.value?.id === id) current.value = null;
    if (activeCampaignId.value === id) setActiveCampaign(null);
  }

  function clearCurrent() {
    current.value = null;
  }

  return {
    list,
    current,
    loading,
    error,
    isMaster,
    activeCampaignId,
    activeCampaign,
    setActiveCampaign,
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    clearCurrent,
  };
});
