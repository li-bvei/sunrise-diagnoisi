<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  total: number
  locale: 'zh-CN' | 'ja-JP'
}>()
const scale = computed(() => Math.max(100, props.total))
const totalWidth = computed(() => Math.min(100, props.total / scale.value * 100))
const threshold70 = computed(() => 70 / scale.value * 100)
const threshold80 = computed(() => 80 / scale.value * 100)
</script>

<template>
  <figure class="score-progress-chart" :aria-label="locale === 'zh-CN' ? '预计总分进度图' : '予想ポイント進捗図'">
    <div class="score-chart-number">
      <strong>{{ total }}</strong>
      <small>{{ locale === 'zh-CN' ? '预计总分' : '予想ポイント' }}</small>
    </div>
    <div class="score-scale">
      <div class="score-segment confirmed" :style="{ width: `${totalWidth}%` }" />
      <i class="threshold threshold-70" :style="{ left: `${threshold70}%` }"><span>70</span></i>
      <i class="threshold threshold-80" :style="{ left: `${threshold80}%` }"><span>80</span></i>
    </div>
    <figcaption>
      <span><i class="legend confirmed" />{{ locale === 'zh-CN' ? '预计积分' : '予想ポイント' }} {{ total }}</span>
      <span>{{ locale === 'zh-CN' ? `显示范围 0–${scale}` : `表示範囲 0–${scale}` }}</span>
    </figcaption>
  </figure>
</template>
