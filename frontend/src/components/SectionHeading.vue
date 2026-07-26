<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description?: string
  align?: 'left' | 'center'
}>()
</script>

<template>
  <div class="section-heading" :class="{ centered: align === 'center' }">
    <span class="eyebrow">{{ eyebrow }}</span>
    <h2>{{ title }}</h2>
    <p v-if="description">{{ description }}</p>
  </div>
</template>
