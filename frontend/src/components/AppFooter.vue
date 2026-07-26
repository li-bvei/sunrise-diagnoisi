<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const phone = import.meta.env.VITE_CONTACT_PHONE || '06-XXXX-XXXX'
const officialUrl = import.meta.env.VITE_SUNRISE_OFFICIAL_URL || ''
</script>

<template>
  <footer id="contact" class="site-footer">
    <div class="container footer-grid">
      <section class="footer-brand">
        <div class="brand brand-on-dark">
          <span class="brand-mark">S</span>
          <span class="brand-copy"><strong>SUNRISE</strong><small>{{ settings.dictionary.brand.replace('SUNRISE ', '') }}</small></span>
        </div>
        <p>{{ settings.dictionary.footer.summary }}</p>
        <span class="footer-company">{{ settings.dictionary.company }}</span>
      </section>
      <section>
        <h2>{{ settings.dictionary.footer.contact }}</h2>
        <a class="phone" :href="phone.includes('X') ? undefined : `tel:${phone}`">{{ phone }}</a>
        <p class="contact-note">{{ settings.locale === 'zh-CN' ? '服务时间及正式联系方式将在上线前公布。' : '受付時間および正式な連絡先は公開前にご案内します。' }}</p>
      </section>
      <section>
        <h2>{{ settings.dictionary.footer.legal }}</h2>
        <div class="footer-links">
          <RouterLink to="/privacy">{{ settings.dictionary.footer.privacy }}</RouterLink>
          <RouterLink to="/terms">{{ settings.dictionary.footer.terms }}</RouterLink>
          <RouterLink to="/disclaimer">{{ settings.dictionary.footer.disclaimer }}</RouterLink>
          <a v-if="officialUrl" :href="officialUrl" target="_blank" rel="noopener">{{ settings.dictionary.footer.official }}</a>
          <span v-else>{{ settings.dictionary.footer.unavailable }}</span>
        </div>
      </section>
    </div>
    <div class="container footer-bottom">{{ settings.dictionary.footer.rights }}</div>
  </footer>
</template>
