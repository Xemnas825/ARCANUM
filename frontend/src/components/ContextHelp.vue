<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string;
  tips: string[];
  compact?: boolean;
}>(), {
  compact: false,
});
</script>

<template>
  <details class="help-card dark-card" :class="{ compact: props.compact }">
    <summary class="help-summary">
      <span class="help-icon" aria-hidden="true">✦</span>
      <span>{{ props.title }}</span>
    </summary>
    <ul class="help-list" role="list">
      <li v-for="tip in props.tips" :key="tip" class="help-item" role="listitem">
        {{ tip }}
      </li>
    </ul>
  </details>
</template>

<style scoped>
.help-card {
  padding: 0.65rem 0.85rem;
  margin: 0 0 1rem 0;
}
.help-summary {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
  user-select: none;
  color: var(--text-primary);
  font-family: var(--font-data);
  font-size: 0.88rem;
}
.help-summary::-webkit-details-marker { display: none; }
.help-icon {
  color: var(--gold-light);
}
.help-list {
  margin: 0.65rem 0 0 1.2rem;
  padding: 0;
  color: var(--text-muted);
  display: grid;
  gap: 0.35rem;
  font-size: 0.9rem;
}
.help-item { line-height: 1.45; }
.compact .help-list {
  font-size: 0.84rem;
  gap: 0.25rem;
}
</style>
