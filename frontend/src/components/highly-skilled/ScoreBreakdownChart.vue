<script setup lang="ts">
import { computed } from 'vue'
import type { DiagnosisReport } from '@/types/highlySkilled'

const props = defineProps<{
  rows: DiagnosisReport['categoryChart']
  locale: 'zh-CN' | 'ja-JP'
}>()
const max = computed(() => Math.max(10, ...props.rows.map((row) => row.confirmedPoints + row.pendingPoints)))
const labels: Record<string, [string, string]> = {
  education: ['学历', '学歴'], experience: ['工作经验', '実務経験'], income: ['年收入', '年収'],
  age: ['年龄', '年齢'], japanese: ['日语能力', '日本語能力'], research: ['研究成果', '研究実績'],
  qualification: ['日本国家资格', '日本の国家資格'], university: ['院校相关', '大学関連'],
  position: ['职位', '地位'], bonus: ['其他加分', 'その他加点'],
}
</script>

<template>
  <figure class="breakdown-chart">
    <div v-for="row in rows" :key="row.category" class="breakdown-bar-row">
      <span>{{ labels[row.category]?.[locale === 'zh-CN' ? 0 : 1] ?? row.category }}</span>
      <div class="breakdown-track">
        <i class="confirmed" :style="{ width: `${row.confirmedPoints / max * 100}%` }" />
        <i class="pending" :style="{ width: `${row.pendingPoints / max * 100}%` }" />
      </div>
      <strong>{{ row.confirmedPoints }}<small v-if="row.pendingPoints"> + {{ row.pendingPoints }}</small></strong>
    </div>
    <figcaption>{{ locale === 'zh-CN' ? '实色为确定分，斜纹为待确认分。' : '実線は確定点、斜線は確認待ち点です。' }}</figcaption>
  </figure>
</template>
