<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  confirmed: number
  pending: number
  locale: 'zh-CN' | 'ja-JP'
}>()
const maximum = computed(() => props.confirmed + props.pending)
const scale = computed(() => Math.max(100, maximum.value))
const confirmedWidth = computed(() => Math.min(100, props.confirmed / scale.value * 100))
const pendingWidth = computed(() => Math.min(100 - confirmedWidth.value, props.pending / scale.value * 100))
const threshold70 = computed(() => 70 / scale.value * 100)
const threshold80 = computed(() => 80 / scale.value * 100)
</script>

<template>
  <figure class="score-progress-chart" :aria-label="locale === 'zh-CN' ? '总分进度图' : '合計点進捗図'">
    <div class="score-chart-number">
      <strong>{{ confirmed }}</strong><span>/ {{ maximum }}</span>
      <small>{{ locale === 'zh-CN' ? '确定分 / 最高可能分' : '確定点 / 最大見込点' }}</small>
    </div>
    <div class="score-scale">
      <div class="score-segment confirmed" :style="{ width: `${confirmedWidth}%` }" />
      <div class="score-segment pending" :style="{ left: `${confirmedWidth}%`, width: `${pendingWidth}%` }" />
      <i class="threshold threshold-70" :style="{ left: `${threshold70}%` }"><span>70</span></i>
      <i class="threshold threshold-80" :style="{ left: `${threshold80}%` }"><span>80</span></i>
    </div>
    <figcaption>
      <span><i class="legend confirmed" />{{ locale === 'zh-CN' ? '确定积分' : '確定点' }} {{ confirmed }}</span>
      <span><i class="legend pending" />{{ locale === 'zh-CN' ? '待确认积分' : '確認待ち' }} {{ pending }}</span>
      <span>{{ locale === 'zh-CN' ? `显示范围 0–${scale}` : `表示範囲 0–${scale}` }}</span>
    </figcaption>
  </figure>
</template>
