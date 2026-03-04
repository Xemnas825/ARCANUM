import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

export const useToastStore = defineStore('toasts', () => {
  const list = ref<ToastItem[]>([]);

  function push(message: string, kind: ToastKind = 'info', ttlMs = 2800) {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    list.value = [...list.value, { id, kind, message }];
    if (ttlMs > 0) {
      setTimeout(() => dismiss(id), ttlMs);
    }
  }

  function dismiss(id: string) {
    list.value = list.value.filter((t) => t.id !== id);
  }

  return { list, push, dismiss };
});
