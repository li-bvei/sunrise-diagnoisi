<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, Close } from '@element-plus/icons-vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const route = useRoute()
const router = useRouter()
const drawerOpen = ref(false)

const navigation = [
  { key: 'home', to: '/' },
  { key: 'tools', to: '/tools' },
  { key: 'guide', to: '/guide' },
] as const

watch(() => route.fullPath, () => {
  drawerOpen.value = false
})

function contact() {
  drawerOpen.value = false
  if (route.path !== '/') {
    void router.push({ path: '/', hash: '#contact' })
    return
  }
  document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <RouterLink class="brand" to="/" aria-label="SUNRISE">
        <span class="brand-mark">S</span>
        <span class="brand-copy">
          <strong>SUNRISE</strong>
          <small>{{ settings.dictionary.brand.replace('SUNRISE ', '') }}</small>
        </span>
      </RouterLink>

      <nav class="desktop-nav" aria-label="Main navigation">
        <RouterLink v-for="item in navigation" :key="item.key" :to="item.to">
          {{ settings.dictionary.nav[item.key] }}
        </RouterLink>
        <button class="nav-contact" type="button" @click="contact">
          {{ settings.dictionary.nav.contact }}
        </button>
        <div class="language-switch" aria-label="Language">
          <button :class="{ active: settings.locale === 'zh-CN' }" type="button" @click="settings.setLocale('zh-CN')">中文</button>
          <span>/</span>
          <button :class="{ active: settings.locale === 'ja-JP' }" type="button" @click="settings.setLocale('ja-JP')">日本語</button>
        </div>
      </nav>

      <button class="mobile-menu-button" type="button" :aria-label="settings.dictionary.nav.menu" @click="drawerOpen = !drawerOpen">
        <el-icon :size="22"><Close v-if="drawerOpen" /><Menu v-else /></el-icon>
      </button>
    </div>

    <Transition name="menu">
      <div v-if="drawerOpen" class="mobile-panel">
        <nav class="container mobile-nav">
          <RouterLink v-for="item in navigation" :key="item.key" :to="item.to">
            {{ settings.dictionary.nav[item.key] }}
          </RouterLink>
          <button type="button" @click="contact">{{ settings.dictionary.nav.contact }}</button>
          <div class="mobile-language">
            <button :class="{ active: settings.locale === 'zh-CN' }" type="button" @click="settings.setLocale('zh-CN')">中文</button>
            <button :class="{ active: settings.locale === 'ja-JP' }" type="button" @click="settings.setLocale('ja-JP')">日本語</button>
          </div>
        </nav>
      </div>
    </Transition>
  </header>
</template>
