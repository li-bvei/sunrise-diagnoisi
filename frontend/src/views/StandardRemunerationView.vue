<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import PracticalToolHero from '@/components/practical/PracticalToolHero.vue'
import FinancialDisclaimer from '@/components/practical/FinancialDisclaimer.vue'
import MetricCard from '@/components/practical/MetricCard.vue'
import { practicalToolMessages } from '@/data/practicalToolMessages'
import { HEALTH_STANDARD_GRADES, PENSION_STANDARD_GRADES, PREFECTURE_HEALTH_RATES } from '@/data/financialParameters'
import { useSettingsStore } from '@/stores/settings'
import { calculateInsurance, findStandardGrade, formatYen } from '@/utils/financialCalculator'
import type { StandardRemunerationGrade } from '@/types/financial'

const settings = useSettingsStore()
const copy = computed(() => practicalToolMessages[settings.locale])
const mode = ref<'salary' | 'target'>('salary')
const salary = ref(310_000)
const targetStandard = ref(300_000)
const form = reactive({ age: 35, prefecture: '東京都', includeCare: false })
const money = (value: number) => formatYen(value, settings.locale)
const effectiveSalary = computed(() => {
  if (mode.value === 'salary') return Math.max(0, salary.value || 0)
  const target = HEALTH_STANDARD_GRADES.find((grade) => grade.monthly === targetStandard.value)
  return target?.lower ?? target?.monthly ?? 0
})
const healthGrade = computed(() => findStandardGrade(effectiveSalary.value, HEALTH_STANDARD_GRADES))
const pensionGrade = computed(() => findStandardGrade(effectiveSalary.value, PENSION_STANDARD_GRADES))
const range = (grade: StandardRemunerationGrade) => `${grade.lower === null ? '—' : money(grade.lower)} ～ ${grade.upper === null ? '—' : money(grade.upper - 1)}`
const neighbors = (grades: StandardRemunerationGrade[], current: StandardRemunerationGrade) => ({
  previous: grades[current.grade - 2] ?? null,
  current,
  next: grades[current.grade] ?? null,
})
const healthRows = computed(() => neighbors(HEALTH_STANDARD_GRADES, healthGrade.value))
const pensionRows = computed(() => neighbors(PENSION_STANDARD_GRADES, pensionGrade.value))
const sections = computed(() => [
  { key: 'health', title: copy.value.standard.health, rows: healthRows.value },
  { key: 'pension', title: copy.value.standard.pension, rows: pensionRows.value },
])
const insurance = computed(() => calculateInsurance(effectiveSalary.value, form.prefecture, form.includeCare))
const nextStart = computed(() => healthGrade.value.upper)
const distanceToNext = computed(() => nextStart.value === null ? 0 : Math.max(0, nextStart.value - effectiveSalary.value))
const nearbyRows = computed(() => [healthRows.value.previous, healthRows.value.current, healthRows.value.next].filter(Boolean).map((grade) => ({
  grade: grade!,
  insurance: calculateInsurance(grade!.lower ?? grade!.monthly, form.prefecture, form.includeCare).employee.total,
})))

watch(() => form.age, (age) => { form.includeCare = age >= 40 && age < 65 }, { immediate: true })
</script>

<template>
  <div class="page-surface">
    <PracticalToolHero :eyebrow="copy.standard.eyebrow" :title="copy.standard.title" :description="copy.standard.description" />
    <section class="section practical-section"><div class="container practical-stack">
      <el-card shadow="never" class="practical-panel compact-panel">
        <el-radio-group v-model="mode" class="mode-switch"><el-radio-button value="salary">{{ copy.standard.salaryMode }}</el-radio-button><el-radio-button value="target">{{ copy.standard.targetMode }}</el-radio-button></el-radio-group>
        <el-form label-position="top"><div class="practical-form-grid">
          <el-form-item v-if="mode === 'salary'" :label="copy.common.salary"><el-input-number v-model="salary" :min="0" :step="1_000" :controls="false" /><span class="input-suffix">{{ copy.common.yen }}</span></el-form-item>
          <el-form-item v-else :label="copy.standard.targetStandard"><el-select v-model="targetStandard"><el-option v-for="grade in HEALTH_STANDARD_GRADES" :key="grade.grade" :label="`${grade.grade} ${copy.common.grade} · ${money(grade.monthly)}`" :value="grade.monthly" /></el-select></el-form-item>
          <el-form-item :label="copy.common.age"><el-input-number v-model="form.age" :min="15" :max="99" /></el-form-item>
          <el-form-item :label="copy.common.prefecture"><el-select v-model="form.prefecture" filterable><el-option v-for="(_, prefecture) in PREFECTURE_HEALTH_RATES" :key="prefecture" :label="prefecture" :value="prefecture" /></el-select></el-form-item>
        </div><el-checkbox v-model="form.includeCare">{{ copy.common.care }}</el-checkbox></el-form>
      </el-card>
      <div class="practical-metrics three">
        <MetricCard :label="copy.standard.nextStart" :value="nextStart === null ? '—' : money(nextStart)" />
        <MetricCard :label="copy.standard.distance" :value="money(distanceToNext)" tone="primary" />
        <MetricCard :label="copy.standard.employerTotal" :value="money(insurance.employer.total)" />
      </div>
      <div class="grade-columns">
        <el-card v-for="section in sections" :key="section.key" shadow="never" class="practical-panel">
          <template #header><strong>{{ section.title }}</strong></template>
          <div class="grade-list">
            <article v-for="(grade, position) in section.rows" :key="position" :class="{ active: position === 'current' }">
              <span>{{ position === 'previous' ? copy.standard.previous : position === 'current' ? copy.standard.current : copy.standard.next }}</span>
              <template v-if="grade"><strong>{{ grade.grade }} {{ copy.common.grade }} · {{ money(grade.monthly) }}</strong><small>{{ copy.standard.range }} {{ range(grade) }}</small></template>
              <strong v-else>{{ copy.standard.noGrade }}</strong>
            </article>
          </div>
        </el-card>
      </div>
      <el-card shadow="never" class="practical-panel"><template #header><strong>{{ copy.standard.nearby }}</strong></template><div class="nearby-grid"><article v-for="row in nearbyRows" :key="row.grade.grade"><span>{{ row.grade.grade }} {{ copy.common.grade }}</span><strong>{{ money(row.grade.monthly) }}</strong><small>{{ copy.payroll.employeeInsurance }} {{ money(row.insurance) }}</small></article></div></el-card>
      <div class="practical-metrics"><MetricCard :label="copy.standard.employeeHealth" :value="money(insurance.employee.health + insurance.employee.care + insurance.employee.childSupport)" /><MetricCard :label="copy.standard.employeePension" :value="money(insurance.employee.pension)" /></div>
      <FinancialDisclaimer />
    </div></section>
  </div>
</template>
