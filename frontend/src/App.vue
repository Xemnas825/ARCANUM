<script setup lang="ts">
import ToastViewport from './components/ToastViewport.vue';
</script>

<template>
  <router-view />
  <ToastViewport />
</template>

<style>
#app {
  min-height: 100vh;
}
</style>
