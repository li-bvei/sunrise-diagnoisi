<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, Close } from '@element-plus/icons-vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const route = useRoute()
const router = useRouter()
const drawerOpen = ref(false)
const panel = ref<HTMLElement | null>(null)

const navigation = [
  { key: 'home', to: '/' },
  { key: 'tools', to: '/tools' },
  { key: 'guide', to: '/guide' },
] as const

function closeDrawer() {
  drawerOpen.value = false
}

watch(() => route.fullPath, closeDrawer)

watch(drawerOpen, async (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) {
    await nextTick()
    panel.value?.querySelector<HTMLElement>('a, button')?.focus()
  }
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeDrawer()
}

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

function contact() {
  closeDrawer()
  if (route.path !== '/') {
    void router.push({ path: '/', hash: '#contact' })
    return
  }
  document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <header class="site-header" @keydown="onKeydown">
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

      <button
        class="mobile-menu-button"
        type="button"
        :aria-label="drawerOpen ? settings.dictionary.nav.menuClose : settings.dictionary.nav.menu"
        :aria-expanded="drawerOpen"
        aria-controls="mobile-panel"
        @click="drawerOpen = !drawerOpen"
      >
        <el-icon :size="22"><Close v-if="drawerOpen" /><Menu v-else /></el-icon>
      </button>
    </div>

    <Transition name="scrim">
      <div v-if="drawerOpen" class="mobile-scrim" @click="closeDrawer" />
    </Transition>

    <Transition name="menu">
      <div v-if="drawerOpen" id="mobile-panel" ref="panel" class="mobile-panel">
        <nav class="container mobile-nav" aria-label="Main navigation">
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
