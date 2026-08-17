<script setup lang="ts">
import type { TakkenBilingualText } from '@/types/takken'

defineProps<{ content: TakkenBilingualText }>()
</script>

<template>
  <span class="tk-bilingual">
    <span v-if="content.ja" class="tk-ja">{{ content.ja }}</span>
    <span class="tk-zh">{{ content.zh }}</span>
  </span>
</template>
