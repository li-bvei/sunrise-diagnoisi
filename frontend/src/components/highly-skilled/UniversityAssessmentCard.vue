<script setup lang="ts">
import type { DiagnosisReport } from '@/types/highlySkilled'

const props = defineProps<{
  assessment: NonNullable<DiagnosisReport['universityAssessment']>
  locale: 'zh-CN' | 'ja-JP'
}>()
function status(value: string) {
  const labels: Record<string, [string, string]> = {
    included: ['已计入', '算入済み'],
    'not-found': ['未匹配', '未一致'],
  }
  return labels[value]?.[props.locale === 'zh-CN' ? 0 : 1] ?? value
}
</script>

<template>
  <section class="report-card university-assessment">
    <h3>{{ locale === 'zh-CN' ? '院校判断' : '大学判定' }}</h3>
    <dl>
      <div><dt>{{ locale === 'zh-CN' ? '显示名称' : '表示名' }}</dt><dd>{{ assessment.displayName || '—' }}</dd></div>
      <div><dt>{{ locale === 'zh-CN' ? '官方名称' : '公式名' }}</dt><dd>{{ assessment.officialName || '—' }}</dd></div>
      <div><dt>{{ locale === 'zh-CN' ? '国家/地区' : '国・地域' }}</dt><dd>{{ assessment.countryCode || '—' }}</dd></div>
      <div><dt>{{ locale === 'zh-CN' ? '日本学位（用户选择）' : '日本の学位（本人選択）' }}</dt><dd>{{ assessment.japaneseHigherEducationDegreeSelected ? (locale === 'zh-CN' ? '是' : 'はい') : (locale === 'zh-CN' ? '否' : 'いいえ') }}</dd></div>
      <div><dt>{{ locale === 'zh-CN' ? '大学名单加分' : '大学一覧加点' }}</dt><dd>{{ status(assessment.rankingBonusStatus) }}</dd></div>
      <div v-if="assessment.sourceDocument"><dt>{{ locale === 'zh-CN' ? '来源' : '出典' }}</dt><dd>{{ assessment.sourceDocument }} · p.{{ assessment.sourcePage }}</dd></div>
    </dl>
    <p v-if="!assessment.officialName">{{ locale === 'zh-CN' ? '当前名单未匹配' : '現在のリストでは未確認' }}</p>
  </section>
</template>
