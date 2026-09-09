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
const form = reactive({ companyProfit: 12_000_000, age: 45, prefecture: '東京都', includeCare: true })
const residentOverride = ref<number | null>(null)
const compensations = ref([300_000, 500_000, 800_000])

const scenarios = computed(() =>
  compensations.value.map((value) =>
    calculateExecutiveScenario(value, form.companyProfit, form.prefecture, form.includeCare, residentOverride.value),
  ),
)
const money = (value: number) => formatYen(value, settings.locale)
const percent = (value: number) => `${Math.round(value * 100)}%`

function addScenario() { compensations.value.push(400_000) }
function toggleResidentAdjust() {
  residentOverride.value = residentOverride.value === null ? 0 : null
}

watch(() => form.age, (age) => { form.includeCare = age >= 40 && age < 65 }, { immediate: true })
</script>

<template>
  <div class="page-surface">
    <PracticalToolHero :eyebrow="copy.executive.eyebrow" :title="copy.executive.title" :description="copy.executive.description" />
    <section class="section practical-section"><div class="container practical-stack">
      <el-card shadow="never" class="practical-panel">
        <template #header>{{ copy.common.input }}</template>
        <el-form label-position="top">
          <div class="practical-form-grid">
            <el-form-item :label="copy.executive.companyProfit">
              <el-input-number v-model="form.companyProfit" :min="0" :step="1_000_000" :controls="false" />
              <span class="input-suffix">{{ copy.common.yen }}</span>
            </el-form-item>
            <el-form-item :label="copy.common.age">
              <el-input-number v-model="form.age" :min="15" :max="99" />
            </el-form-item>
            <el-form-item :label="copy.common.prefecture">
              <el-select v-model="form.prefecture" filterable>
                <el-option v-for="(_, prefecture) in PREFECTURE_HEALTH_RATES" :key="prefecture" :label="prefecture" :value="prefecture" />
              </el-select>
            </el-form-item>
            <el-form-item :label="copy.executive.residentOverride">
              <template v-if="residentOverride === null">
                <span class="resident-auto">{{ copy.common.estimated }}</span>
                <button type="button" class="inline-btn" @click="toggleResidentAdjust">{{ copy.common.adjust }}</button>
              </template>
              <template v-else>
                <el-input-number v-model="residentOverride" :min="0" :step="10_000" :controls="false" />
                <span class="input-suffix">{{ copy.common.yen }}</span>
                <button type="button" class="inline-btn" @click="toggleResidentAdjust">{{ copy.common.reset }}</button>
              </template>
            </el-form-item>
          </div>
          <el-checkbox v-model="form.includeCare">{{ copy.common.care }}</el-checkbox>
        </el-form>
      </el-card>

      <div class="scenario-toolbar">
        <h2>{{ copy.common.result }}</h2>
        <el-button :icon="Plus" @click="addScenario">{{ copy.executive.add }}</el-button>
      </div>

      <div class="scenario-grid">
        <el-card v-for="(scenario, index) in scenarios" :key="index" shadow="never" class="practical-panel scenario-card">
          <template #header>
            <div class="scenario-header">
              <span>{{ copy.executive.scenario }} {{ index + 1 }}</span>
              <el-button v-if="compensations.length > 1" text type="danger" :icon="Delete" @click="compensations.splice(index, 1)" />
            </div>
          </template>

          <el-form-item :label="copy.executive.compensation">
            <el-input-number v-model="compensations[index]" :min="0" :step="10_000" :controls="false" />
            <span class="input-suffix">{{ copy.common.yen }}</span>
          </el-form-item>

          <div class="scenario-key">
            <div><span>{{ copy.executive.personalTakeHome }}</span><strong>{{ money(scenario.personalTakeHomeAnnual) }}</strong></div>
            <div><span>{{ copy.executive.companyCost }}</span><strong>{{ money(scenario.companyCompensationCost) }}</strong></div>
            <div><span>{{ copy.executive.profitBeforeTax }}</span><strong :class="{ negative: scenario.profitBeforeTax < 0 }">{{ money(scenario.profitBeforeTax) }}</strong></div>
            <div>
              <span>{{ copy.executive.corporateTax }}</span>
              <strong>{{ money(scenario.corporateTax.total) }}<em v-if="!scenario.corporateTax.isDeficit"> · {{ percent(scenario.corporateTax.effectiveRate) }}</em></strong>
            </div>
            <div class="scenario-retained" :class="{ deficit: scenario.isDeficit }">
              <span>{{ copy.executive.retained }}</span>
              <strong>
                {{ money(scenario.retainedAfterTax) }}
                <em v-if="scenario.isDeficit" class="deficit-badge">{{ copy.executive.deficit }}</em>
              </strong>
            </div>
          </div>

          <details class="scenario-details">
            <summary>{{ copy.executive.personalDetail }}</summary>
            <div class="mini-rows">
              <div><span>{{ copy.executive.annualIncome }}</span><b>{{ money(scenario.annualCompensation) }}</b></div>
              <div><span>{{ copy.executive.employeeInsurance }}</span><b>{{ money(scenario.employeeInsuranceAnnual) }}</b></div>
              <div><span>{{ copy.executive.incomeTax }}</span><b>{{ money(scenario.incomeTaxAnnual) }}</b></div>
              <div><span>{{ copy.executive.residentTax }}</span><b>{{ money(scenario.residentTaxAnnual) }}</b></div>
              <div><span>{{ copy.executive.employerInsurance }}</span><b>{{ money(scenario.employerInsuranceAnnual) }}</b></div>
            </div>
          </details>
          <details v-if="!scenario.corporateTax.isDeficit" class="scenario-details">
            <summary>{{ copy.executive.corporateDetail }}</summary>
            <div class="mini-rows">
              <div><span>{{ copy.executive.nationalTax }}</span><b>{{ money(scenario.corporateTax.nationalTax) }}</b></div>
              <div><span>{{ copy.executive.localCorporateTax }}</span><b>{{ money(scenario.corporateTax.localCorporateTax) }}</b></div>
              <div><span>{{ copy.executive.inhabitantTax }}</span><b>{{ money(scenario.corporateTax.inhabitantTax) }}</b></div>
              <div><span>{{ copy.executive.enterpriseTax }}</span><b>{{ money(scenario.corporateTax.enterpriseTax) }}</b></div>
            </div>
          </details>
        </el-card>
      </div>

      <el-alert type="info" :closable="false" show-icon :title="copy.executive.note" />
      <FinancialDisclaimer />
    </div></section>
  </div>
</template>

<style scoped>
.inline-btn { margin-left: 10px; padding: 0; border: 0; background: transparent; color: var(--color-primary); font: inherit; font-size: 12px; cursor: pointer; }
.inline-btn:hover { text-decoration: underline; text-underline-offset: 2px; }
.resident-auto { color: var(--color-text-secondary); font-size: 13px; }
.scenario-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-weight: 500; }
.scenario-key { display: grid; gap: 0; margin-top: 6px; }
.scenario-key > div { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 11px 0; border-bottom: 1px solid var(--color-border-light); }
.scenario-key > div:last-child { border-bottom: 0; }
.scenario-key span { color: var(--color-text-secondary); font-size: 13px; }
.scenario-key strong { font-size: 15px; font-weight: 600; letter-spacing: -.01em; overflow-wrap: anywhere; text-align: right; font-variant-numeric: tabular-nums; }
.scenario-key strong em { color: var(--color-text-secondary); font-style: normal; font-weight: 400; font-size: 12px; }
.scenario-key strong.negative { color: var(--color-danger); }
.scenario-retained { margin-top: 4px; padding: 14px 16px !important; border: 0 !important; border-radius: var(--radius-sm); background: var(--color-success-surface); }
.scenario-retained strong { color: var(--color-success); font-size: 18px; }
.scenario-retained.deficit { background: var(--color-danger-surface); }
.scenario-retained.deficit strong { color: var(--color-danger); }
.deficit-badge { display: inline-block; margin-left: 8px; padding: 1px 8px; border-radius: 999px; background: var(--color-danger); color: white; font-size: 11px; font-style: normal; font-weight: 600; }
.scenario-details { margin-top: 12px; }
.scenario-details summary { color: var(--color-primary); font-size: 13px; cursor: pointer; }
.mini-rows { display: grid; gap: 0; margin-top: 8px; }
.mini-rows > div { display: flex; justify-content: space-between; gap: 14px; padding: 7px 0; border-bottom: 1px solid var(--color-border-light); font-size: 13px; }
.mini-rows > div:last-child { border-bottom: 0; }
.mini-rows span { color: var(--color-text-secondary); }
.mini-rows b { font-weight: 500; font-variant-numeric: tabular-nums; }
</style>
