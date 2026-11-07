<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const phone = import.meta.env.VITE_CONTACT_PHONE || '06-7650-6385'
</script>

<template>
  <footer class="toolbox-footer">
    <div class="container toolbox-footer-inner">
      <a :href="phone.includes('X') ? undefined : `tel:${phone}`">{{ settings.dictionary.footer.contact }}：{{ phone }}</a>
      <nav :aria-label="settings.dictionary.footer.legal">
        <RouterLink to="/privacy">{{ settings.dictionary.footer.privacy }}</RouterLink>
        <RouterLink to="/terms">{{ settings.dictionary.footer.terms }}</RouterLink>
        <RouterLink to="/disclaimer">{{ settings.dictionary.footer.disclaimer }}</RouterLink>
      </nav>
    </div>
  </footer>
</template>
