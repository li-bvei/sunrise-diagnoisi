<script setup lang="ts">
import { itemDescription, itemLabel, materialLabel } from '@/utils/rentalCostCalculator'
import type { RentalCostItemKey, RentalCostReport, RentalMaterialKey } from '@/types/rentalCost'

const props = defineProps<{ report: RentalCostReport }>()
const zh = props.report.locale === 'zh-CN'

function formatYen(value: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)} ${zh ? '日元' : '円'}`
}
function formatDate(value: string) {
  return value.slice(0, 10).replace(/-/g, '/')
}
function lineLabel(item: RentalCostReport['items'][number]) {
  return item.isCustom ? item.label ?? '' : itemLabel(item.key as RentalCostItemKey, zh)
}
function lineNote(item: RentalCostReport['items'][number]) {
  return item.isCustom ? '' : itemDescription(item.key as RentalCostItemKey, zh)
}
function materialText(material: RentalCostReport['materials'][number]) {
  return material.isCustom ? material.label ?? '' : materialLabel(material.key as RentalMaterialKey, zh)
}
</script>

<template>
  <article class="diagnosis-report">
    <header class="report-brand">
      <div><span>SUNRISE</span><h1>{{ zh ? '租房初期费用清单' : '賃貸初期費用一覧' }}</h1></div>
      <small>{{ report.reportId }}<br>{{ formatDate(report.generatedAt) }}</small>
    </header>

    <section v-if="report.monthlyRent || report.moveInDate" class="report-card">
      <div class="report-profile">
        <div v-if="report.monthlyRent"><span>{{ zh ? '每月房租' : '月額賃料' }}</span><strong>{{ formatYen(report.monthlyRent) }}</strong></div>
        <div v-if="report.moveInDate"><span>{{ zh ? '入住日期' : '入居日' }}</span><strong>{{ formatDate(report.moveInDate) }}</strong></div>
      </div>
    </section>

    <section class="report-card">
      <h2>{{ zh ? '费用明细' : '費用内訳' }}</h2>
      <div class="cost-breakdown">
        <div v-for="item in report.items" :key="item.key" class="cost-breakdown-row">
          <div class="cost-breakdown-head"><span>{{ lineLabel(item) }}</span><strong>{{ formatYen(item.amount) }}</strong></div>
          <p v-if="lineNote(item)" class="cost-breakdown-note">{{ lineNote(item) }}</p>
        </div>
      </div>
      <div class="score-total"><span>{{ zh ? '合计' : '合計' }}</span><strong>{{ formatYen(report.total) }}</strong></div>
    </section>

    <section v-if="report.materials.length" class="report-card">
      <h2>{{ zh ? '需要准备的材料' : '必要書類' }}</h2>
      <ul>
        <li v-for="material in report.materials" :key="material.key">{{ materialText(material) }}</li>
      </ul>
    </section>
  </article>
</template>
