<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const copy = computed(() => settings.locale === 'zh-CN'
  ? ['页面未找到', '您访问的页面可能已移动，或地址输入有误。']
  : ['ページが見つかりません', 'お探しのページは移動したか、URLが正しくない可能性があります。'])
</script>

<template>
  <section class="not-found">
    <div class="container not-found-inner">
      <span>404</span><h1>{{ copy[0] }}</h1><p>{{ copy[1] }}</p>
      <el-button type="primary" size="large" @click="$router.push('/')">{{ settings.dictionary.common.home }}</el-button>
    </div>
  </section>
</template>
