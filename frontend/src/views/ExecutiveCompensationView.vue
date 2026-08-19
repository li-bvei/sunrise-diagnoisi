<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import PracticalToolHero from '@/components/practical/PracticalToolHero.vue'
import FinancialDisclaimer from '@/components/practical/FinancialDisclaimer.vue'
import { practicalToolMessages } from '@/data/practicalToolMessages'
import { PREFECTURE_HEALTH_RATES } from '@/data/financialParameters'
import { useSettingsStore } from '@/stores/settings'
import { calculateExecutiveScenario, formatYen } from '@/utils/financialCalculator'

const settings = useSettingsStore()
const copy = computed(() => practicalToolMessages[settings.locale])
const form = reactive({ companyProfit: 12_000_000, age: 45, prefecture: '東京都', includeCare: true, residentTaxAnnual: 240_000 })
const compensations = ref([300_000, 400_000, 500_000])
const scenarios = computed(() => compensations.value.map((value) => calculateExecutiveScenario(value, form.companyProfit, form.prefecture, form.includeCare, form.residentTaxAnnual)))
const money = (value: number) => formatYen(value, settings.locale)
function addScenario() { compensations.value.push(400_000) }
watch(() => form.age, (age) => { form.includeCare = age >= 40 && age < 65 }, { immediate: true })
</script>

<template>
  <div class="page-surface">
    <PracticalToolHero :eyebrow="copy.executive.eyebrow" :title="copy.executive.title" :description="copy.executive.description" />
    <section class="section practical-section"><div class="container practical-stack">
      <el-card shadow="never" class="practical-panel">
        <template #header><strong>{{ copy.common.input }}</strong></template>
        <el-form label-position="top"><div class="practical-form-grid">
          <el-form-item :label="copy.executive.companyProfit"><el-input-number v-model="form.companyProfit" :min="0" :step="100_000" :controls="false" /><span class="input-suffix">{{ copy.common.yen }}</span></el-form-item>
          <el-form-item :label="copy.common.age"><el-input-number v-model="form.age" :min="15" :max="99" /></el-form-item>
          <el-form-item :label="copy.common.prefecture"><el-select v-model="form.prefecture" filterable><el-option v-for="(_, prefecture) in PREFECTURE_HEALTH_RATES" :key="prefecture" :label="prefecture" :value="prefecture" /></el-select></el-form-item>
          <el-form-item :label="copy.common.residentAnnual"><el-input-number v-model="form.residentTaxAnnual" :min="0" :step="10_000" :controls="false" /><span class="input-suffix">{{ copy.common.yen }}</span></el-form-item>
        </div><el-checkbox v-model="form.includeCare">{{ copy.common.care }}</el-checkbox></el-form>
      </el-card>

      <div class="scenario-toolbar"><h2>{{ copy.common.result }}</h2><el-button :icon="Plus" @click="addScenario">{{ copy.executive.add }}</el-button></div>
      <div class="scenario-grid">
        <el-card v-for="(scenario, index) in scenarios" :key="index" shadow="never" class="practical-panel scenario-card">
          <template #header><div class="scenario-header"><span>{{ copy.executive.compensation }}</span><el-button v-if="compensations.length > 1" text type="danger" :icon="Delete" @click="compensations.splice(index, 1)" /></div></template>
          <el-input-number v-model="compensations[index]" :min="0" :step="10_000" :controls="false" /><span class="input-suffix">{{ copy.common.yen }}</span>
          <div class="scenario-values">
            <div><span>{{ copy.executive.annualIncome }}</span><strong>{{ money(scenario.annualCompensation) }}</strong></div>
            <div><span>{{ copy.executive.employeeInsurance }}</span><strong>{{ money(scenario.employeeInsuranceAnnual) }}</strong></div>
            <div><span>{{ copy.executive.incomeTax }}</span><strong>{{ money(scenario.incomeTaxAnnual) }}</strong></div>
            <div><span>{{ copy.executive.residentTax }}</span><strong>{{ money(scenario.residentTaxAnnual) }}</strong></div>
            <div><span>{{ copy.executive.personalTakeHome }}</span><strong>{{ money(scenario.personalTakeHomeAnnual) }}</strong></div>
            <div><span>{{ copy.executive.employerInsurance }}</span><strong>{{ money(scenario.employerInsuranceAnnual) }}</strong></div>
            <div><span>{{ copy.executive.companyCost }}</span><strong>{{ money(scenario.companyCompensationCost) }}</strong></div>
            <div><span>{{ copy.executive.remaining }}</span><strong>{{ money(scenario.remainingCompanyProfit) }}</strong></div>
          </div>
        </el-card>
      </div>
      <el-alert type="info" :closable="false" show-icon :title="copy.executive.note" />
      <FinancialDisclaimer />
    </div></section>
  </div>
</template>
