import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api/client';
import type { NotificationDto } from '../types/api';

export const useNotificationStore = defineStore('notifications', () => {
  const list = ref<NotificationDto[]>([]);
  const loading = ref(false);
  const error = ref('');

  const unreadCount = computed(() => list.value.filter((n) => !n.read_at).length);

  async function fetchNotifications() {
    loading.value = true;
    error.value = '';
    try {
      list.value = await api.get<NotificationDto[]>('/notifications');
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar notificaciones';
    } finally {
      loading.value = false;
    }
  }

  async function markRead(id: string) {
    await api.post(`/notifications/${id}/read`, {});
    const idx = list.value.findIndex((x) => x.id === id);
    if (idx >= 0) {
      const current = list.value[idx];
      if (!current) return;
      list.value[idx] = { ...current, read_at: new Date().toISOString() };
    }
  }

  async function markAllRead() {
    await api.post('/notifications/read-all', {});
    const now = new Date().toISOString();
    list.value = list.value.map((x) => ({ ...x, read_at: x.read_at ?? now }));
  }

  return {
    list,
    loading,
    error,
    unreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
  };
});
