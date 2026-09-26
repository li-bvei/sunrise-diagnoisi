<script setup lang="ts">
// Shown only on paper (Cmd/Ctrl+P): the same title / brand / condition lines the downloaded
// payslip PDF opens with, so the printed page can drop the whole input form and stay on one sheet.
defineProps<{ title: string; brand: string; lines: string[] }>()
</script>

<template>
  <header class="print-only print-header">
    <div class="payslip-pdf-head">
      <h1>{{ title }}</h1>
      <span class="payslip-pdf-brand">{{ brand }}</span>
    </div>
    <div class="payslip-pdf-meta">
      <p v-for="line in lines" :key="line">{{ line }}</p>
    </div>
  </header>
</template>
