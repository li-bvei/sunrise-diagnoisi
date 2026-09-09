<script setup lang="ts">
defineProps<{ label: string; value: string; tone?: 'primary' | 'success' | 'warning' | 'danger' }>()
</script>

<template><article class="practical-metric" :class="tone"><span>{{ label }}</span><strong>{{ value }}</strong><slot /></article></template>
