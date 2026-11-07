<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
</script>

<template>
  <header class="site-header toolbox-header">
    <div class="container header-inner">
      <RouterLink class="toolbox-brand" to="/">{{ settings.locale === 'zh-CN' ? '工具箱' : 'ツールボックス' }}</RouterLink>
      <div class="language-switch" aria-label="Language">
        <button :class="{ active: settings.locale === 'zh-CN' }" type="button" @click="settings.setLocale('zh-CN')">中文</button>
        <button :class="{ active: settings.locale === 'ja-JP' }" type="button" @click="settings.setLocale('ja-JP')">日本語</button>
      </div>
    </div>
  </header>
</template>
