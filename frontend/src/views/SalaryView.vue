<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import PracticalToolHero from '@/components/practical/PracticalToolHero.vue'
import PrintHeader from '@/components/practical/PrintHeader.vue'
import MetricCard from '@/components/practical/MetricCard.vue'
import { practicalToolMessages } from '@/data/practicalToolMessages'
import { PREFECTURE_HEALTH_RATES } from '@/data/financialParameters'
import { useSettingsStore } from '@/stores/settings'
import { calculatePayroll, formatYen } from '@/utils/financialCalculator'
import { formatIncomeManYen, formatInteger, parseIncomeManYenInput, parseIntegerInput } from '@/utils/numericInput'
import { issueDate } from '@/utils/dateStamp'

const settings = useSettingsStore()
const copy = computed(() => practicalToolMessages[settings.locale])

const MAX_ALLOWANCE_YEN = 10_000_000

const form = reactive({
  monthlySalary: 350_000 as number | null, age: 35, prefecture: '東京都', includeCare: false, dependentCount: 0,
  commutingAllowance: 0, taxableAllowance: 0, otherNonTaxableAllowance: 0,
})
const salaryText = ref(formatIncomeManYen(form.monthlySalary))
const residentOverride = ref<number | null>(null)

// Allowances are optional amounts in yen (a commuter pass is e.g. 12,340円, too fine for the 万円 salary box).
type AllowanceKey = 'commutingAllowance' | 'taxableAllowance' | 'otherNonTaxableAllowance'
const allowanceText = reactive<Record<AllowanceKey, string>>({ commutingAllowance: '', taxableAllowance: '', otherNonTaxableAllowance: '' })
function updateAllowance(key: AllowanceKey, value: string) {
  allowanceText[key] = value.replace(/，/g, ',')
  if (!value.trim()) { form[key] = 0; return }
  const parsed = parseIntegerInput(value, MAX_ALLOWANCE_YEN)
  if (parsed !== null) form[key] = parsed
}
function formatAllowance(key: AllowanceKey) { allowanceText[key] = form[key] ? formatInteger(form[key]) : '' }

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
  if (!result.value || upper === null || upper === undefined) return null
  return Math.max(0, upper - result.value.insuranceBase)
})

// The payslip's two sides. Allowance rows only appear once an amount is entered; the commuting
// allowance splits into its non-taxable part and (above the monthly limit) a taxable remainder.
const paymentRows = computed(() => {
  const r = result.value
  if (!r || form.monthlySalary === null) return []
  const { payslip, salary } = copy.value
  return [
    { label: payslip.base, value: form.monthlySalary },
    { label: salary.commutingNonTaxable, value: r.commutingNonTaxable },
    { label: salary.commutingTaxable, value: r.commutingTaxable },
    { label: salary.taxableAllowance, value: form.taxableAllowance },
    { label: salary.otherAllowance, value: form.otherNonTaxableAllowance },
  ].filter((row, index) => index === 0 || row.value > 0)
})
const deductionRows = computed(() => {
  const r = result.value
  if (!r) return []
  const { salary } = copy.value
  return [
    { key: 'health', label: salary.health, value: r.employee.health + r.employee.care + r.employee.childSupport },
    { key: 'pension', label: salary.pension, value: r.employee.pension },
    { key: 'employment', label: salary.employment, value: r.employee.employment },
    { key: 'incomeTax', label: salary.incomeTax, value: r.incomeTaxMonthly },
    { key: 'residentTax', label: salary.residentTax, value: r.residentTaxMonthly },
  ]
})
const bodyRows = computed(() => Array.from(
  { length: Math.max(paymentRows.value.length, deductionRows.value.length) },
  (_, index) => ({ payment: paymentRows.value[index], deduction: deductionRows.value[index] }),
))

function toggleResidentAdjust() {
  residentOverride.value = residentOverride.value === null ? (result.value?.residentTaxMonthly ?? 0) : null
}

// The inputs behind the figures, printed above the tables (the input form itself is not printed).
const conditionLines = computed(() => {
  const { common, payslip, salary } = copy.value
  return [
    [
      `${common.salary}：${money(form.monthlySalary ?? 0)}`,
      ...(form.commutingAllowance > 0 ? [`${salary.commuting}：${money(form.commutingAllowance)}`] : []),
      ...(form.taxableAllowance > 0 ? [`${salary.taxableAllowance}：${money(form.taxableAllowance)}`] : []),
      ...(form.otherNonTaxableAllowance > 0 ? [`${salary.otherAllowance}：${money(form.otherNonTaxableAllowance)}`] : []),
    ].join('　'),
    [
      `${common.age}：${form.age}${payslip.ageUnit}`,
      `${common.prefecture}：${form.prefecture}`,
      `${common.dependents}：${form.dependentCount}${payslip.peopleUnit}`,
      ...(form.includeCare ? [payslip.careIncluded] : []),
    ].join('　'),
    issueDate(),
  ]
})

watch(() => form.age, (age) => { form.includeCare = age >= 40 && age < 65 }, { immediate: true })
</script>

<template>
  <div class="page-surface">
    <PracticalToolHero class="no-print" :eyebrow="copy.salary.eyebrow" :title="copy.salary.title" :description="copy.salary.description" />
    <section class="section practical-section"><div class="container practical-stack">
      <PrintHeader v-if="result" :title="copy.salary.reportName" :brand="settings.dictionary.brand" :lines="conditionLines" />
      <el-card shadow="never" class="practical-panel no-print">
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

          <div class="form-section">
            <h3 class="form-section-title">{{ copy.salary.allowanceTitle }}</h3>
            <div class="practical-form-grid">
              <el-form-item :label="copy.salary.commuting">
                <el-input :model-value="allowanceText.commutingAllowance" inputmode="numeric" autocomplete="off" placeholder="0" @input="updateAllowance('commutingAllowance', $event)" @blur="formatAllowance('commutingAllowance')" />
                <span class="input-suffix">{{ copy.common.yen }}</span>
                <p class="field-help">{{ copy.salary.commutingHint }}</p>
              </el-form-item>
              <el-form-item :label="copy.salary.taxableAllowance">
                <el-input :model-value="allowanceText.taxableAllowance" inputmode="numeric" autocomplete="off" placeholder="0" @input="updateAllowance('taxableAllowance', $event)" @blur="formatAllowance('taxableAllowance')" />
                <span class="input-suffix">{{ copy.common.yen }}</span>
                <p class="field-help">{{ copy.salary.taxableAllowanceHint }}</p>
              </el-form-item>
              <el-form-item :label="copy.salary.otherAllowance">
                <el-input :model-value="allowanceText.otherNonTaxableAllowance" inputmode="numeric" autocomplete="off" placeholder="0" @input="updateAllowance('otherNonTaxableAllowance', $event)" @blur="formatAllowance('otherNonTaxableAllowance')" />
                <span class="input-suffix">{{ copy.common.yen }}</span>
                <p class="field-help">{{ copy.salary.otherAllowanceHint }}</p>
              </el-form-item>
            </div>
          </div>
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
                <tr v-for="(row, index) in bodyRows" :key="index">
                  <template v-if="row.payment">
                    <td>{{ row.payment.label }}</td>
                    <td class="amount">{{ money(row.payment.value) }}</td>
                  </template>
                  <template v-else><td></td><td class="amount"></td></template>
                  <template v-if="row.deduction && row.deduction.key === 'residentTax'">
                    <td>
                      <span class="payslip-label-with-tag">
                        {{ row.deduction.label }}
                        <em v-if="result.residentTaxIsEstimated" class="inline-tag">{{ copy.common.estimated }}</em>
                        <button type="button" class="inline-btn no-print" @click="toggleResidentAdjust">
                          {{ result.residentTaxIsEstimated ? copy.common.adjust : copy.common.reset }}
                        </button>
                      </span>
                    </td>
                    <td class="amount">
                      <span v-if="result.residentTaxIsEstimated">{{ money(row.deduction.value) }}</span>
                      <template v-else>
                        <span class="inline-input no-print">
                          <el-input-number v-model="residentOverride" :min="0" :step="1_000" :controls="false" size="small" />
                        </span>
                        <span class="print-only">{{ money(row.deduction.value) }}</span>
                      </template>
                    </td>
                  </template>
                  <template v-else-if="row.deduction">
                    <td>{{ row.deduction.label }}</td>
                    <td class="amount">{{ money(row.deduction.value) }}</td>
                  </template>
                  <template v-else><td></td><td class="amount"></td></template>
                </tr>
              </tbody>
              <tfoot>
                <tr class="payslip-subtotal">
                  <td>{{ copy.payslip.totalPayment }}</td>
                  <td class="amount">{{ money(result.grossMonthly) }}</td>
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
    </div></section>
  </div>
</template>

<style scoped>
.inline-tag { display: inline-block; margin: 0 6px; padding: 1px 7px; border-radius: 999px; background: var(--color-primary-light); color: var(--color-primary); font-size: 11px; font-style: normal; }
.inline-btn { padding: 0; border: 0; background: transparent; color: var(--color-primary); font: inherit; font-size: 12px; cursor: pointer; }
.inline-btn:hover { text-decoration: underline; text-underline-offset: 2px; }
.inline-input { display: inline-flex; align-items: center; gap: 6px; }
.inline-input .el-input-number { width: 110px; }
.form-section { margin-top: 22px; padding-top: 4px; border-top: 1px solid var(--color-border-light); }
.form-section-title { margin: 16px 0 14px; color: var(--color-text); font-size: 14px; font-weight: 500; }
.panel-note { margin: 14px 0 0; color: var(--color-text-secondary); font-size: 12px; line-height: 1.6; }
.field-help { margin: 7px 0 0; color: var(--color-text-secondary); font-size: 12px; line-height: 1.6; }
.grade-tile { display: grid; gap: 4px; padding: 16px 18px; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); background: #f5f5f7; }
.grade-tile span, .grade-tile small { color: var(--color-text-secondary); font-size: 12px; }
.grade-tile strong { font-size: 15px; font-weight: 600; letter-spacing: -.01em; }
</style>
