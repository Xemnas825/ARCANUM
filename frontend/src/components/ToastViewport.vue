<script setup lang="ts">
import { useToastStore } from '../stores/toasts';

const toasts = useToastStore();
</script>

<template>
  <Teleport to="body">
    <div v-if="toasts.list.length" class="toast-viewport" aria-live="polite" aria-atomic="false">
      <div
        v-for="toast in toasts.list"
        :key="toast.id"
        class="toast-item dark-card"
        :class="`toast-${toast.kind}`"
        role="status"
      >
        <span class="toast-msg">{{ toast.message }}</span>
        <button type="button" class="toast-close" aria-label="Cerrar aviso" @click="toasts.dismiss(toast.id)">×</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-viewport {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  width: min(360px, calc(100vw - 2rem));
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.toast-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.6rem 0.7rem;
}
.toast-msg {
  color: var(--text-primary);
  font-size: 0.9rem;
}
.toast-close {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1;
  padding: 0;
}
.toast-success { border-color: rgba(90, 144, 96, 0.35); }
.toast-error { border-color: rgba(216, 64, 64, 0.38); }
.toast-info { border-color: var(--border-arcane); }
</style>
