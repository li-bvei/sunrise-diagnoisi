<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PracticalToolHero from '@/components/practical/PracticalToolHero.vue'
import FinancialDisclaimer from '@/components/practical/FinancialDisclaimer.vue'
import MetricCard from '@/components/practical/MetricCard.vue'
import { practicalToolMessages } from '@/data/practicalToolMessages'
import { useSettingsStore } from '@/stores/settings'
import { calculatePensionEstimate, calculatePensionTarget, formatYen } from '@/utils/financialCalculator'

const settings = useSettingsStore()
const route = useRoute()
const router = useRouter()
const copy = computed(() => practicalToolMessages[settings.locale])
const activeTab = ref(route.query.tab === 'target' ? 'target' : 'estimate')
const form = reactive({ currentAge: 35, workUntilAge: 65, nationalPensionMonths: 24, employeePensionMonths: 120, existingAverageRemuneration: 320_000, futureAverageRemuneration: 400_000 })
const targetMonthly = ref(180_000)
const estimate = computed(() => calculatePensionEstimate(form))
const target = computed(() => calculatePensionTarget(form, targetMonthly.value || 0))
const comparisonPlans = computed(() => [300_000, 400_000, 500_000].map((remuneration) => ({
  remuneration,
  estimate: calculatePensionEstimate({ ...form, futureAverageRemuneration: remuneration }),
})))
const money = (value: number) => formatYen(value, settings.locale)
const rangeText = computed(() => target.value.requiredSalaryRange ? `${target.value.requiredSalaryRange.lower === null ? '—' : money(target.value.requiredSalaryRange.lower)} ～ ${target.value.requiredSalaryRange.upper === null ? '—' : money(target.value.requiredSalaryRange.upper - 1)}` : '—')

watch(activeTab, (tab) => void router.replace({ query: tab === 'target' ? { tab: 'target' } : {} }))
</script>

<template>
  <div class="page-surface">
    <PracticalToolHero :eyebrow="copy.pension.eyebrow" :title="copy.pension.title" :description="copy.pension.description" />
    <section class="section practical-section"><div class="container practical-stack">
      <el-tabs v-model="activeTab" class="practical-tabs">
        <el-tab-pane :label="copy.pension.estimateTab" name="estimate" />
        <el-tab-pane :label="copy.pension.targetTab" name="target" />
      </el-tabs>
      <el-card shadow="never" class="practical-panel">
        <template #header><strong>{{ copy.common.input }}</strong></template>
        <el-form label-position="top"><div class="practical-form-grid three">
          <el-form-item :label="copy.pension.currentAge"><el-input-number v-model="form.currentAge" :min="20" :max="80" /></el-form-item>
          <el-form-item :label="copy.pension.workUntil"><el-input-number v-model="form.workUntilAge" :min="form.currentAge" :max="80" /></el-form-item>
          <el-form-item :label="copy.pension.nationalMonths"><el-input-number v-model="form.nationalPensionMonths" :min="0" :max="480" /></el-form-item>
          <el-form-item :label="copy.pension.employeeMonths"><el-input-number v-model="form.employeePensionMonths" :min="0" :max="600" /></el-form-item>
          <el-form-item :label="copy.pension.existingAverage"><el-input-number v-model="form.existingAverageRemuneration" :min="0" :step="10_000" :controls="false" /><span class="input-suffix">{{ copy.common.yen }}</span></el-form-item>
          <el-form-item :label="copy.pension.futureAverage"><el-input-number v-model="form.futureAverageRemuneration" :min="0" :step="10_000" :controls="false" /><span class="input-suffix">{{ copy.common.yen }}</span></el-form-item>
          <el-form-item v-if="activeTab === 'target'" :label="copy.pension.targetMonthly"><el-input-number v-model="targetMonthly" :min="0" :step="10_000" :controls="false" /><span class="input-suffix">{{ copy.common.yen }}</span></el-form-item>
        </div></el-form>
      </el-card>

      <template v-if="activeTab === 'estimate'">
        <div class="practical-metrics"><MetricCard :label="copy.pension.totalMonthly" :value="money(estimate.totalMonthly)" tone="success" /><MetricCard :label="copy.pension.totalAnnual" :value="money(estimate.totalAnnual)" tone="primary" /></div>
        <el-card shadow="never" class="practical-panel"><div class="practical-breakdown">
          <div><span>{{ copy.pension.basic }}</span><strong>{{ money(estimate.basicAnnual) }}</strong></div>
          <div><span>{{ copy.pension.employee }}</span><strong>{{ money(estimate.employeeAnnualExisting + estimate.employeeAnnualFuture) }}</strong></div>
          <div><span>{{ copy.pension.covered }}</span><strong>{{ estimate.coveredBasicMonths }}</strong></div>
          <div><span>{{ copy.pension.futureMonths }}</span><strong>{{ estimate.futureEmployeeMonths }}</strong></div>
        </div></el-card>
      </template>
      <template v-else>
        <div class="practical-metrics"><MetricCard :label="copy.pension.targetMonthly" :value="money(target.targetMonthly)" /><MetricCard :label="copy.pension.required" :value="target.requiredFutureAverageRemuneration === null ? '—' : money(target.requiredFutureAverageRemuneration)" tone="warning" /></div>
        <el-card shadow="never" class="practical-panel"><div class="practical-breakdown">
          <div><span>{{ copy.pension.salaryRange }}</span><strong>{{ rangeText }}</strong></div>
          <div><span>{{ copy.pension.totalMonthly }}</span><strong>{{ money(target.currentProjection.totalMonthly) }}</strong></div>
          <div><span>{{ copy.pension.gap }}</span><strong>{{ money(target.monthlyGap) }}</strong></div>
          <div><span>{{ copy.pension.increase }}</span><strong>{{ money(target.monthlyGap * 12) }}</strong></div>
        </div></el-card>
        <el-card shadow="never" class="practical-panel"><template #header><strong>{{ copy.pension.plans }}</strong></template><div class="nearby-grid"><article v-for="plan in comparisonPlans" :key="plan.remuneration"><span>{{ copy.pension.futureAverage }}</span><strong>{{ money(plan.remuneration) }}</strong><small>{{ copy.pension.totalMonthly }} {{ money(plan.estimate.totalMonthly) }}</small></article></div></el-card>
        <el-alert v-if="target.requiredFutureAverageRemuneration === null" type="warning" :closable="false" show-icon :title="copy.pension.noMonths" />
        <el-alert v-else-if="target.exceedsCurrentCap" type="warning" :closable="false" show-icon :title="copy.pension.exceeds" />
      </template>
      <el-alert type="info" :closable="false" show-icon :title="copy.pension.note" />
      <FinancialDisclaimer />
    </div></section>
  </div>
</template>
