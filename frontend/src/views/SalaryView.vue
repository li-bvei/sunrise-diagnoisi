<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import PracticalToolHero from '@/components/practical/PracticalToolHero.vue'
import FinancialDisclaimer from '@/components/practical/FinancialDisclaimer.vue'
import MetricCard from '@/components/practical/MetricCard.vue'
import { practicalToolMessages } from '@/data/practicalToolMessages'
import { PREFECTURE_HEALTH_RATES } from '@/data/financialParameters'
import { useSettingsStore } from '@/stores/settings'
import { calculatePayroll, formatYen } from '@/utils/financialCalculator'
import { formatIncomeManYen, parseIncomeManYenInput } from '@/utils/numericInput'

const settings = useSettingsStore()
const copy = computed(() => practicalToolMessages[settings.locale])

const form = reactive({ monthlySalary: 350_000 as number | null, age: 35, prefecture: '東京都', includeCare: false, dependentCount: 0 })
const salaryText = ref(formatIncomeManYen(form.monthlySalary))
const residentOverride = ref<number | null>(null)

function updateSalary(value: string) {
  form.monthlySalary = parseIncomeManYenInput(value)
  salaryText.value = form.monthlySalary === null ? '' : value.replace(/，/g, ',')
}
function formatSalary() { salaryText.value = formatIncomeManYen(form.monthlySalary) }

const result = computed(() =>
  form.monthlySalary && form.monthlySalary > 0
    ? calculatePayroll({ ...form, monthlySalary: form.monthlySalary, residentTaxMonthlyOverride: residentOverride.value })
    : null,
)
const money = (value: number) => formatYen(value, settings.locale)
const percent = (value: number) => `${Math.round(value * 100)}%`
const gradeRange = (lower: number | null, upper: number | null) =>
  `${lower === null ? '—' : money(lower)} ～ ${upper === null ? '—' : money(upper - 1)}`

const toNextGrade = computed(() => {
  const upper = result.value?.healthGrade.upper
  if (!result.value || upper === null || upper === undefined || !form.monthlySalary) return null
  return Math.max(0, upper - form.monthlySalary)
})

function toggleResidentAdjust() {
  residentOverride.value = residentOverride.value === null ? (result.value?.residentTaxMonthly ?? 0) : null
}

watch(() => form.age, (age) => { form.includeCare = age >= 40 && age < 65 }, { immediate: true })
</script>

<template>
  <div class="page-surface">
    <PracticalToolHero :eyebrow="copy.salary.eyebrow" :title="copy.salary.title" :description="copy.salary.description" />
    <section class="section practical-section"><div class="container practical-stack">
      <el-card shadow="never" class="practical-panel">
        <template #header>{{ copy.common.input }}</template>
        <el-form label-position="top">
          <div class="practical-form-grid">
            <el-form-item :label="copy.common.salary">
              <el-input :model-value="salaryText" inputmode="decimal" autocomplete="off" placeholder="35" @input="updateSalary" @blur="formatSalary" />
              <span class="input-suffix">{{ copy.common.wan }}</span>
              <p class="field-help">{{ copy.salary.salaryHint }}</p>
            </el-form-item>
            <el-form-item :label="copy.common.age">
              <el-input-number v-model="form.age" :min="15" :max="99" />
            </el-form-item>
            <el-form-item :label="copy.common.prefecture">
              <el-select v-model="form.prefecture" filterable>
                <el-option v-for="(_, prefecture) in PREFECTURE_HEALTH_RATES" :key="prefecture" :label="prefecture" :value="prefecture" />
              </el-select>
            </el-form-item>
            <el-form-item :label="copy.common.dependents">
              <el-input-number v-model="form.dependentCount" :min="0" :max="10" />
              <p class="field-help">{{ copy.common.dependentsHint }}</p>
            </el-form-item>
          </div>
          <el-checkbox v-model="form.includeCare">{{ copy.common.care }}</el-checkbox>
        </el-form>
      </el-card>

      <template v-if="result">
        <div class="practical-metrics three">
          <MetricCard :label="copy.salary.takeHome" :value="money(result.takeHomeMonthly)" tone="success" />
          <MetricCard :label="copy.salary.takeHomeRatio" :value="percent(result.takeHomeRatio)" />
          <MetricCard :label="copy.salary.companyCost" :value="money(result.employerCostMonthly)" tone="primary" />
        </div>

        <el-card shadow="never" class="practical-panel">
          <template #header>{{ copy.salary.breakdown }}</template>
          <div class="payslip-wrap">
            <table class="payslip-table">
              <thead>
                <tr>
                  <th>{{ copy.payslip.paymentItem }}</th>
                  <th class="amount">{{ copy.payslip.amount }}</th>
                  <th>{{ copy.payslip.deductionItem }}</th>
                  <th class="amount">{{ copy.payslip.amount }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ copy.payslip.base }}</td>
                  <td class="amount">{{ money(form.monthlySalary!) }}</td>
                  <td>{{ copy.salary.health }}</td>
                  <td class="amount">{{ money(result.employee.health + result.employee.care + result.employee.childSupport) }}</td>
                </tr>
                <tr>
                  <td></td><td class="amount"></td>
                  <td>{{ copy.salary.pension }}</td>
                  <td class="amount">{{ money(result.employee.pension) }}</td>
                </tr>
                <tr>
                  <td></td><td class="amount"></td>
                  <td>{{ copy.salary.employment }}</td>
                  <td class="amount">{{ money(result.employee.employment) }}</td>
                </tr>
                <tr>
                  <td></td><td class="amount"></td>
                  <td>{{ copy.salary.incomeTax }}</td>
                  <td class="amount">{{ money(result.incomeTaxMonthly) }}</td>
                </tr>
                <tr>
                  <td></td><td class="amount"></td>
                  <td>
                    <span class="payslip-label-with-tag">
                      {{ copy.salary.residentTax }}
                      <em v-if="result.residentTaxIsEstimated" class="inline-tag">{{ copy.common.estimated }}</em>
                      <button type="button" class="inline-btn" @click="toggleResidentAdjust">
                        {{ result.residentTaxIsEstimated ? copy.common.adjust : copy.common.reset }}
                      </button>
                    </span>
                  </td>
                  <td class="amount">
                    <span v-if="result.residentTaxIsEstimated">{{ money(result.residentTaxMonthly) }}</span>
                    <span v-else class="inline-input">
                      <el-input-number v-model="residentOverride" :min="0" :step="1_000" :controls="false" size="small" />
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="payslip-subtotal">
                  <td>{{ copy.payslip.totalPayment }}</td>
                  <td class="amount">{{ money(form.monthlySalary!) }}</td>
                  <td>{{ copy.payslip.totalDeduction }}</td>
                  <td class="amount">{{ money(result.employee.total + result.incomeTaxMonthly + result.residentTaxMonthly) }}</td>
                </tr>
                <tr class="payslip-net">
                  <td colspan="3">{{ copy.payslip.netPay }}</td>
                  <td class="amount">{{ money(result.takeHomeMonthly) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p v-if="result.residentTaxIsEstimated" class="panel-note">{{ copy.salary.residentHint }}</p>
        </el-card>

        <el-card shadow="never" class="practical-panel">
          <template #header>{{ copy.salary.gradeTitle }}</template>
          <div class="grade-columns">
            <article class="grade-tile">
              <span>{{ copy.salary.healthGrade }}</span>
              <strong>{{ result.healthGrade.grade }} {{ copy.common.grade }} · {{ money(result.healthGrade.monthly) }}</strong>
              <small>{{ copy.salary.gradeRange }} {{ gradeRange(result.healthGrade.lower, result.healthGrade.upper) }}</small>
            </article>
            <article class="grade-tile">
              <span>{{ copy.salary.pensionGrade }}</span>
              <strong>{{ result.pensionGrade.grade }} {{ copy.common.grade }} · {{ money(result.pensionGrade.monthly) }}</strong>
              <small>{{ copy.salary.gradeRange }} {{ gradeRange(result.pensionGrade.lower, result.pensionGrade.upper) }}</small>
            </article>
          </div>
          <p class="panel-note">
            {{ toNextGrade === null ? copy.salary.atTopGrade : `${copy.salary.toNextGrade} ${money(toNextGrade)}` }}
            · {{ copy.salary.employerInsurance }} {{ money(result.employer.total) }}
          </p>
        </el-card>

        <div class="practical-metrics">
          <MetricCard :label="copy.salary.annualTakeHome" :value="money(result.annualTakeHome)" />
          <MetricCard :label="copy.salary.companyAnnual" :value="money(result.employerCostAnnual)" />
        </div>
      </template>
      <el-empty v-else :description="copy.common.empty" />

      <FinancialDisclaimer />
    </div></section>
  </div>
</template>

<style scoped>
.inline-tag { display: inline-block; margin: 0 6px; padding: 1px 7px; border-radius: 999px; background: var(--color-primary-light); color: var(--color-primary); font-size: 11px; font-style: normal; }
.inline-btn { padding: 0; border: 0; background: transparent; color: var(--color-primary); font: inherit; font-size: 12px; cursor: pointer; }
.inline-btn:hover { text-decoration: underline; text-underline-offset: 2px; }
.inline-input { display: inline-flex; align-items: center; gap: 6px; }
.inline-input .el-input-number { width: 110px; }
.panel-note { margin: 14px 0 0; color: var(--color-text-secondary); font-size: 12px; line-height: 1.6; }
.field-help { margin: 7px 0 0; color: var(--color-text-secondary); font-size: 12px; line-height: 1.6; }
.grade-tile { display: grid; gap: 4px; padding: 16px 18px; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); background: #f5f5f7; }
.grade-tile span, .grade-tile small { color: var(--color-text-secondary); font-size: 12px; }
.grade-tile strong { font-size: 15px; font-weight: 600; letter-spacing: -.01em; }
</style>
