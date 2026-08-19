<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import PracticalToolHero from '@/components/practical/PracticalToolHero.vue'
import FinancialDisclaimer from '@/components/practical/FinancialDisclaimer.vue'
import MetricCard from '@/components/practical/MetricCard.vue'
import { practicalToolMessages } from '@/data/practicalToolMessages'
import { PREFECTURE_HEALTH_RATES } from '@/data/financialParameters'
import { useSettingsStore } from '@/stores/settings'
import { calculatePayroll, formatYen } from '@/utils/financialCalculator'

const settings = useSettingsStore()
const copy = computed(() => practicalToolMessages[settings.locale])
const form = reactive({ monthlySalary: 350_000, age: 35, prefecture: '東京都', includeCare: false, residentTaxMonthly: 15_000 })
const result = computed(() => form.monthlySalary > 0 ? calculatePayroll(form) : null)
const money = (value: number) => formatYen(value, settings.locale)
watch(() => form.age, (age) => { form.includeCare = age >= 40 && age < 65 }, { immediate: true })
</script>

<template>
  <div class="page-surface">
    <PracticalToolHero :eyebrow="copy.payroll.eyebrow" :title="copy.payroll.title" :description="copy.payroll.description" />
    <section class="section practical-section"><div class="container practical-layout">
      <el-card shadow="never" class="practical-panel">
        <template #header><strong>{{ copy.common.input }}</strong></template>
        <el-form label-position="top">
          <div class="practical-form-grid">
            <el-form-item :label="copy.common.salary"><el-input-number v-model="form.monthlySalary" :min="0" :step="10_000" :controls="false" /><span class="input-suffix">{{ copy.common.yen }}</span></el-form-item>
            <el-form-item :label="copy.common.age"><el-input-number v-model="form.age" :min="15" :max="99" /></el-form-item>
            <el-form-item :label="copy.common.prefecture"><el-select v-model="form.prefecture" filterable><el-option v-for="(_, prefecture) in PREFECTURE_HEALTH_RATES" :key="prefecture" :label="prefecture" :value="prefecture" /></el-select></el-form-item>
            <el-form-item :label="copy.common.residentMonthly"><el-input-number v-model="form.residentTaxMonthly" :min="0" :step="1_000" :controls="false" /><span class="input-suffix">{{ copy.common.yen }}</span></el-form-item>
          </div>
          <el-checkbox v-model="form.includeCare">{{ copy.common.care }}</el-checkbox>
        </el-form>
      </el-card>

      <div v-if="result" class="practical-results">
        <div class="practical-metrics three">
          <MetricCard :label="copy.payroll.takeHome" :value="money(result.takeHomeMonthly)" tone="success" />
          <MetricCard :label="copy.payroll.companyCost" :value="money(result.employerCostMonthly)" tone="primary" />
          <MetricCard :label="copy.payroll.companyAnnual" :value="money(result.employerCostAnnual)" />
        </div>
        <el-card shadow="never" class="practical-panel">
          <template #header><strong>{{ copy.payroll.detail }}</strong></template>
          <div class="practical-breakdown">
            <div><span>{{ copy.payroll.gross }}</span><strong>{{ money(form.monthlySalary) }}</strong></div>
            <div><span>{{ copy.payroll.healthInsurance }}</span><strong>- {{ money(result.employee.health + result.employee.care + result.employee.childSupport) }}</strong></div>
            <div><span>{{ copy.payroll.pensionInsurance }}</span><strong>- {{ money(result.employee.pension) }}</strong></div>
            <div><span>{{ copy.payroll.employmentInsurance }}</span><strong>- {{ money(result.employee.employment) }}</strong></div>
            <div><span>{{ copy.payroll.employeeInsurance }}</span><strong>- {{ money(result.employee.total) }}</strong></div>
            <div><span>{{ copy.payroll.employerInsurance }}</span><strong>{{ money(result.employer.total) }}</strong></div>
            <div><span>{{ copy.payroll.incomeTax }}</span><strong>- {{ money(result.incomeTaxMonthly) }}</strong></div>
            <div><span>{{ copy.payroll.residentTax }}</span><strong>- {{ money(result.residentTaxMonthly) }}</strong></div>
            <div class="total"><span>{{ copy.payroll.takeHome }}</span><strong>{{ money(result.takeHomeMonthly) }}</strong></div>
          </div>
          <div class="practical-grade-note">
            <span>{{ copy.standard.health }}：{{ result.healthGrade.grade }} {{ copy.common.grade }} / {{ money(result.healthGrade.monthly) }}</span>
            <span>{{ copy.standard.pension }}：{{ result.pensionGrade.grade }} {{ copy.common.grade }} / {{ money(result.pensionGrade.monthly) }}</span>
          </div>
        </el-card>
      </div>
      <el-empty v-else :description="copy.common.empty" />
      <FinancialDisclaimer />
    </div></section>
  </div>
</template>
