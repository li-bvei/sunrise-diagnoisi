<script setup lang="ts">
import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const settings = useSettingsStore()

watchEffect(() => {
  const title = route.meta.title as { zh: string; ja: string } | undefined
  const localizedTitle = settings.locale === 'ja-JP' ? title?.ja : title?.zh
  document.title = localizedTitle ? `${localizedTitle} | SUNRISE` : settings.dictionary.brand
})
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main><RouterView /></main>
    <AppFooter />
  </div>
</template>
