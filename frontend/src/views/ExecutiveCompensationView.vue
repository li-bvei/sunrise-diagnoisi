<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import PracticalToolHero from '@/components/practical/PracticalToolHero.vue'
import FinancialDisclaimer from '@/components/practical/FinancialDisclaimer.vue'
import MetricCard from '@/components/practical/MetricCard.vue'
import { practicalToolMessages } from '@/data/practicalToolMessages'
import { FINANCIAL_DISCLAIMER, PREFECTURE_HEALTH_RATES } from '@/data/financialParameters'
import { useSettingsStore } from '@/stores/settings'
import { calculateExecutiveCompensation, formatYen } from '@/utils/financialCalculator'
import { formatIncomeManYen, parseIncomeManYenInput } from '@/utils/numericInput'
import { downloadCsv, payslipToCsv, type PayslipData } from '@/utils/csv'
import { downloadPayslipPdf } from '@/utils/payslipPdf'

const settings = useSettingsStore()
const copy = computed(() => practicalToolMessages[settings.locale])
const form = reactive({ age: 45, prefecture: '東京都', includeCare: true, dependentCount: 0 })

// Annual compensation is the only input; monthly is derived from it.
const annualCompensation = ref(6_000_000)
const annualCompText = ref(formatIncomeManYen(annualCompensation.value))
function updateAnnualComp(value: string) {
  annualCompText.value = value.replace(/，/g, ',')
  const parsed = parseIncomeManYenInput(value)
  if (parsed !== null) annualCompensation.value = parsed
}
function formatAnnualComp() { annualCompText.value = formatIncomeManYen(annualCompensation.value) }

// Resident tax override (annual), optional, edited in 万円.
const residentOverrideActive = ref(false)
const residentOverrideText = ref('0')
const residentOverrideYen = computed(() => (
  residentOverrideActive.value ? (parseIncomeManYenInput(residentOverrideText.value) ?? 0) : null
))
function toggleResidentAdjust() {
  if (residentOverrideActive.value) {
    residentOverrideActive.value = false
    return
  }
  residentOverrideText.value = formatIncomeManYen(result.value.residentTaxAnnual)
  residentOverrideActive.value = true
}
function updateResidentOverride(value: string) { residentOverrideText.value = value.replace(/，/g, ',') }
function formatResidentOverride() { residentOverrideText.value = formatIncomeManYen(parseIncomeManYenInput(residentOverrideText.value) ?? 0) }

const result = computed(() => calculateExecutiveCompensation(
  annualCompensation.value, form.prefecture, form.includeCare, residentOverrideYen.value, form.dependentCount,
))
const money = (value: number) => formatYen(value, settings.locale)

// 年度总费用：老板自己是公司实际出资人时，公司负担的那部分保险费本质上也是自己出的钱，
// 所以给一个开关，让他能把公司负担并进"自己年度总费用"里一起看。
const includeEmployerBurden = ref(false)
const totalAnnualCost = computed(() => {
  const health = result.value.healthInsuranceAnnual
  const pension = result.value.pensionInsuranceAnnual
  const employerBurden = includeEmployerBurden.value ? result.value.employerInsuranceAnnual : 0
  const incomeTax = result.value.incomeTaxAnnual
  const residentTax = result.value.residentTaxAnnual
  return { health, pension, employerBurden, incomeTax, residentTax, total: health + pension + employerBurden + incomeTax + residentTax }
})

watch(() => form.age, (age) => { form.includeCare = age >= 40 && age < 65 }, { immediate: true })

function localDateStamp(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = `${now.getMonth() + 1}`.padStart(2, '0')
  const d = `${now.getDate()}`.padStart(2, '0')
  return `${y}${m}${d}`
}

const payslipHeaders = computed((): [string, string, string, string] => [
  copy.value.payslip.paymentItem, copy.value.payslip.amount, copy.value.payslip.deductionItem, copy.value.payslip.amount,
])

// The two payslip tables as plain data. The screen table, the CSV and the PDF all describe
// the same figures; each builder only ever reads its own (monthly or annual) fields.
function buildMonthlyPayslip(): PayslipData {
  return {
    title: `${copy.value.executive.title} · ${copy.value.executive.monthlyBreakdown}`,
    headers: payslipHeaders.value,
    payments: [{ label: copy.value.payslip.base, value: result.value.monthlyCompensation }],
    deductions: [
      { label: copy.value.executive.health, value: result.value.healthInsuranceMonthly },
      { label: copy.value.executive.pension, value: result.value.pensionInsuranceMonthly },
      { label: copy.value.executive.incomeTax, value: result.value.incomeTaxMonthly },
      { label: copy.value.executive.residentTax, value: result.value.residentTaxMonthly },
    ],
    totalPaymentLabel: copy.value.payslip.totalPayment, totalPayment: result.value.monthlyCompensation,
    totalDeductionLabel: copy.value.payslip.totalDeduction,
    totalDeduction: result.value.employeeInsuranceMonthly + result.value.incomeTaxMonthly + result.value.residentTaxMonthly,
    netPayLabel: copy.value.payslip.netPay, netPay: result.value.takeHomeMonthly,
  }
}

function buildAnnualPayslip(): PayslipData {
  return {
    title: `${copy.value.executive.title} · ${copy.value.executive.annualBreakdown}`,
    headers: payslipHeaders.value,
    payments: [{ label: copy.value.payslip.base, value: result.value.annualCompensation }],
    deductions: [
      { label: copy.value.executive.health, value: result.value.healthInsuranceAnnual },
      { label: copy.value.executive.pension, value: result.value.pensionInsuranceAnnual },
      { label: copy.value.executive.incomeTax, value: result.value.incomeTaxAnnual },
      { label: copy.value.executive.residentTax, value: result.value.residentTaxAnnual },
    ],
    totalPaymentLabel: copy.value.payslip.totalPayment, totalPayment: result.value.annualCompensation,
    totalDeductionLabel: copy.value.payslip.totalDeduction,
    totalDeduction: result.value.employeeInsuranceAnnual + result.value.incomeTaxAnnual + result.value.residentTaxAnnual,
    netPayLabel: copy.value.payslip.netPay, netPay: result.value.takeHomeAnnual,
  }
}

const issueDate = () => localDateStamp().replace(/^(\d{4})(\d{2})(\d{2})$/, '$1/$2/$3')

const pdfBusy = ref<'monthly' | 'annual' | null>(null)

async function downloadPayslip(kind: 'monthly' | 'annual', format: 'csv' | 'pdf') {
  const data = kind === 'monthly' ? buildMonthlyPayslip() : buildAnnualPayslip()
  const filename = `sunrise-executive-payslip-${kind}-${localDateStamp()}`
  if (format === 'csv') {
    downloadCsv(`${filename}.csv`, payslipToCsv(data))
    ElMessage.success(copy.value.payslip.downloaded)
    return
  }
  if (pdfBusy.value) return
  pdfBusy.value = kind
  try {
    await downloadPayslipPdf(`${filename}.pdf`, {
      data,
      brand: settings.dictionary.brand,
      format: money,
      metaLines: [
        `${copy.value.executive.compensationAnnual}：${money(result.value.annualCompensation)}`,
        `${copy.value.common.prefecture}：${form.prefecture}　${copy.value.common.dependents}：${form.dependentCount}`,
        issueDate(),
      ],
      footnotes: [
        ...(result.value.residentTaxIsEstimated ? [copy.value.executive.residentHint] : []),
        copy.value.executive.note,
        FINANCIAL_DISCLAIMER[settings.locale],
      ],
    })
    ElMessage.success(copy.value.payslip.pdfDownloaded)
  } catch {
    ElMessage.error(copy.value.payslip.pdfFailed)
  } finally {
    pdfBusy.value = null
  }
}
</script>

<template>
  <div class="page-surface">
    <PracticalToolHero :eyebrow="copy.executive.eyebrow" :title="copy.executive.title" :description="copy.executive.description" />
    <section class="section practical-section"><div class="container practical-stack">
      <el-card shadow="never" class="practical-panel">
        <template #header>{{ copy.common.input }}</template>
        <el-form label-position="top">
          <div class="practical-form-grid">
            <el-form-item :label="copy.executive.compensationAnnual">
              <el-input :model-value="annualCompText" inputmode="decimal" autocomplete="off" placeholder="600" @input="updateAnnualComp" @blur="formatAnnualComp" />
              <span class="input-suffix">{{ copy.common.wan }}</span>
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
              <template v-if="!residentOverrideActive">
                <span class="resident-auto">{{ copy.common.estimated }}</span>
                <button type="button" class="inline-btn" @click="toggleResidentAdjust">{{ copy.common.adjust }}</button>
              </template>
              <template v-else>
                <el-input :model-value="residentOverrideText" inputmode="decimal" autocomplete="off" size="default" @input="updateResidentOverride" @blur="formatResidentOverride" />
                <span class="input-suffix">{{ copy.common.wan }}</span>
                <button type="button" class="inline-btn" @click="toggleResidentAdjust">{{ copy.common.reset }}</button>
              </template>
            </el-form-item>
            <el-form-item :label="copy.common.dependents">
              <el-input-number v-model="form.dependentCount" :min="0" :max="10" />
              <p class="field-help">{{ copy.common.dependentsHint }}</p>
            </el-form-item>
          </div>
          <el-checkbox v-model="form.includeCare">{{ copy.common.care }}</el-checkbox>
        </el-form>
      </el-card>

      <div class="practical-metrics">
        <MetricCard :label="copy.executive.monthlyCompensation" :value="money(result.monthlyCompensation)" tone="primary" />
        <MetricCard :label="copy.executive.takeHomeAnnual" :value="money(result.takeHomeAnnual)" tone="success" />
      </div>

      <el-card shadow="never" class="practical-panel">
        <template #header>
          <div class="panel-header-row">
            <span>{{ copy.executive.totalCostTitle }}</span>
            <label class="switch-label">
              <el-switch v-model="includeEmployerBurden" />
              {{ copy.executive.includeEmployerBurden }}
            </label>
          </div>
        </template>
        <div class="practical-breakdown">
          <div><span>{{ copy.executive.incomeTax }}</span><strong>{{ money(totalAnnualCost.incomeTax) }}</strong></div>
          <div><span>{{ copy.executive.residentTax }}</span><strong>{{ money(totalAnnualCost.residentTax) }}</strong></div>
          <div><span>{{ copy.executive.health }}</span><strong>{{ money(totalAnnualCost.health) }}</strong></div>
          <div><span>{{ copy.executive.pension }}</span><strong>{{ money(totalAnnualCost.pension) }}</strong></div>
          <div v-if="includeEmployerBurden"><span>{{ copy.executive.employerBurdenLine }}</span><strong>{{ money(totalAnnualCost.employerBurden) }}</strong></div>
          <div class="total"><span>{{ copy.executive.totalCost }}</span><strong>{{ money(totalAnnualCost.total) }}</strong></div>
        </div>
        <p class="panel-note">{{ includeEmployerBurden ? copy.executive.employerBurdenNote : copy.executive.personalOnlyNote }}</p>
      </el-card>

      <el-card shadow="never" class="practical-panel">
        <template #header>
          <div class="panel-header-row">
            <span>{{ copy.executive.monthlyBreakdown }}</span>
            <span class="panel-actions no-print">
              <el-button size="small" :icon="Download" :loading="pdfBusy === 'monthly'" @click="downloadPayslip('monthly', 'pdf')">{{ copy.payslip.downloadPdf }}</el-button>
              <el-button size="small" :icon="Download" @click="downloadPayslip('monthly', 'csv')">{{ copy.payslip.download }}</el-button>
            </span>
          </div>
        </template>
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
                <td class="amount">{{ money(result.monthlyCompensation) }}</td>
                <td>{{ copy.executive.health }}</td>
                <td class="amount">{{ money(result.healthInsuranceMonthly) }}</td>
              </tr>
              <tr>
                <td></td><td class="amount"></td>
                <td>{{ copy.executive.pension }}</td>
                <td class="amount">{{ money(result.pensionInsuranceMonthly) }}</td>
              </tr>
              <tr>
                <td></td><td class="amount"></td>
                <td>{{ copy.executive.incomeTax }}</td>
                <td class="amount">{{ money(result.incomeTaxMonthly) }}</td>
              </tr>
              <tr>
                <td></td><td class="amount"></td>
                <td>
                  <span class="payslip-label-with-tag">
                    {{ copy.executive.residentTax }}
                    <em v-if="result.residentTaxIsEstimated" class="inline-tag">{{ copy.common.estimated }}</em>
                  </span>
                </td>
                <td class="amount">{{ money(result.residentTaxMonthly) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="payslip-subtotal">
                <td>{{ copy.payslip.totalPayment }}</td>
                <td class="amount">{{ money(result.monthlyCompensation) }}</td>
                <td>{{ copy.payslip.totalDeduction }}</td>
                <td class="amount">{{ money(result.employeeInsuranceMonthly + result.incomeTaxMonthly + result.residentTaxMonthly) }}</td>
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
        <template #header>
          <div class="panel-header-row">
            <span>{{ copy.executive.annualBreakdown }}</span>
            <span class="panel-actions no-print">
              <el-button size="small" :icon="Download" :loading="pdfBusy === 'annual'" @click="downloadPayslip('annual', 'pdf')">{{ copy.payslip.downloadPdf }}</el-button>
              <el-button size="small" :icon="Download" @click="downloadPayslip('annual', 'csv')">{{ copy.payslip.download }}</el-button>
            </span>
          </div>
        </template>
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
                <td class="amount">{{ money(result.annualCompensation) }}</td>
                <td>{{ copy.executive.health }}</td>
                <td class="amount">{{ money(result.healthInsuranceAnnual) }}</td>
              </tr>
              <tr>
                <td></td><td class="amount"></td>
                <td>{{ copy.executive.pension }}</td>
                <td class="amount">{{ money(result.pensionInsuranceAnnual) }}</td>
              </tr>
              <tr>
                <td></td><td class="amount"></td>
                <td>{{ copy.executive.incomeTax }}</td>
                <td class="amount">{{ money(result.incomeTaxAnnual) }}</td>
              </tr>
              <tr>
                <td></td><td class="amount"></td>
                <td>{{ copy.executive.residentTax }}</td>
                <td class="amount">{{ money(result.residentTaxAnnual) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="payslip-subtotal">
                <td>{{ copy.payslip.totalPayment }}</td>
                <td class="amount">{{ money(result.annualCompensation) }}</td>
                <td>{{ copy.payslip.totalDeduction }}</td>
                <td class="amount">{{ money(result.employeeInsuranceAnnual + result.incomeTaxAnnual + result.residentTaxAnnual) }}</td>
              </tr>
              <tr class="payslip-net">
                <td colspan="3">{{ copy.payslip.netPay }}</td>
                <td class="amount">{{ money(result.takeHomeAnnual) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p v-if="result.residentTaxIsEstimated" class="panel-note">{{ copy.executive.residentHint }}</p>
      </el-card>

      <el-alert type="info" :closable="false" show-icon :title="copy.executive.note" />
      <FinancialDisclaimer />
    </div></section>
  </div>
</template>

<style scoped>
.inline-btn { margin-left: 10px; padding: 0; border: 0; background: transparent; color: var(--color-primary); font: inherit; font-size: 12px; cursor: pointer; }
.inline-btn:hover { text-decoration: underline; text-underline-offset: 2px; }
.resident-auto { color: var(--color-text-secondary); font-size: 13px; }
.inline-tag { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 999px; background: var(--color-primary-light); color: var(--color-primary); font-size: 11px; font-style: normal; }
.panel-note { margin: 14px 0 0; color: var(--color-text-secondary); font-size: 12px; line-height: 1.6; }
.field-help { margin: 7px 0 0; color: var(--color-text-secondary); font-size: 12px; line-height: 1.6; }
.panel-header-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; width: 100%; }
.panel-actions { display: inline-flex; flex-wrap: wrap; gap: 8px; }
.panel-actions .el-button { margin-left: 0; }
.switch-label { display: inline-flex; align-items: center; gap: 8px; color: var(--color-text-secondary); font-size: 13px; font-weight: 400; cursor: pointer; }
</style>
