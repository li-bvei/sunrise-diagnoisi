import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { build } from 'esbuild'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const bundled = await build({
  stdin: {
    contents: `
      export * from './src/utils/financialCalculator.ts'
      export * from './src/utils/stayCalculator.ts'
      export * from './src/utils/csv.ts'
      export * from './src/utils/dateStamp.ts'
      export * from './src/data/financialParameters.ts'
    `,
    resolveDir: resolve('.'),
    sourcefile: 'practical-test-entry.ts',
  },
  alias: { '@': resolve('src') },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
})
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)

const payroll = (overrides = {}) => runtime.calculatePayroll({
  monthlySalary: 350_000, age: 35, prefecture: '東京都', includeCare: false, residentTaxMonthlyOverride: null, ...overrides,
})

test('standard remuneration boundaries are lower-inclusive and upper-exclusive', () => {
  assert.equal(runtime.findStandardGrade(289_999, runtime.HEALTH_STANDARD_GRADES).monthly, 280_000)
  assert.equal(runtime.findStandardGrade(290_000, runtime.HEALTH_STANDARD_GRADES).monthly, 300_000)
  assert.equal(runtime.findStandardGrade(309_999, runtime.HEALTH_STANDARD_GRADES).monthly, 300_000)
  assert.equal(runtime.findStandardGrade(310_000, runtime.HEALTH_STANDARD_GRADES).monthly, 320_000)
  assert.equal(runtime.findStandardGrade(-1, runtime.PENSION_STANDARD_GRADES).monthly, 88_000)
})

test('payroll handles empty and invalid amounts without negative or non-finite output', () => {
  for (const amount of [0, Number.NaN, -100]) {
    const result = payroll({ monthlySalary: amount })
    assert.ok(Number.isFinite(result.takeHomeMonthly))
    assert.ok(result.takeHomeMonthly >= 0)
    assert.ok(result.employerCostMonthly >= 0)
  }
  assert.match(runtime.formatYen(123_456, 'zh-CN'), /123,456/)
  assert.match(runtime.formatYen(123_456, 'ja-JP'), /123,456/)
  assert.match(runtime.formatYen(-5_000, 'ja-JP'), /^-/)
})

test('payroll estimates resident tax by default and honours a manual override', () => {
  const auto = payroll()
  assert.equal(auto.residentTaxIsEstimated, true)
  assert.ok(auto.residentTaxMonthly > 0, 'resident tax should be estimated, not zero')
  // take-home is always below gross and the ratio is a sane fraction
  assert.ok(auto.takeHomeMonthly < 350_000)
  assert.ok(auto.takeHomeRatio > 0.6 && auto.takeHomeRatio < 0.95)
  // company cost sits above gross because it carries the employer insurance share
  assert.ok(auto.employerCostMonthly > 350_000)

  const overridden = payroll({ residentTaxMonthlyOverride: 0 })
  assert.equal(overridden.residentTaxIsEstimated, false)
  assert.equal(overridden.residentTaxMonthly, 0)
  assert.ok(overridden.takeHomeMonthly > auto.takeHomeMonthly)
})

test('allowances follow payroll treatment: commuting is tax-free up to 15万円 but counts for insurance, taxable ones count for both, reimbursements for neither', () => {
  const base = payroll()
  // no allowances = exactly the previous behaviour
  assert.equal(base.grossMonthly, 350_000)
  assert.equal(base.insuranceBase, 350_000)
  assert.equal(base.taxableMonthly, 350_000)

  // 通勤手当 inside the limit: paid, not taxed, but part of 報酬 / 賃金 (雇用保険 = 365,000 × 0.5%)
  const commute = payroll({ commutingAllowance: 15_000 })
  assert.equal(runtime.ALLOWANCE_PARAMETERS.commutingNonTaxableMonthlyLimit, 150_000)
  assert.equal(commute.commutingNonTaxable, 15_000)
  assert.equal(commute.commutingTaxable, 0)
  assert.equal(commute.grossMonthly, 365_000)
  assert.equal(commute.taxableMonthly, 350_000)
  assert.equal(commute.insuranceBase, 365_000)
  assert.equal(commute.employee.employment, 1_825)
  assert.equal(commute.takeHomeMonthly, 365_000 - commute.employee.total - commute.incomeTaxMonthly - commute.residentTaxMonthly)

  // the same amount as a taxable allowance is taxed
  const taxable = payroll({ taxableAllowance: 15_000 })
  assert.equal(taxable.taxableMonthly, 365_000)
  assert.equal(taxable.insuranceBase, 365_000)
  assert.ok(taxable.incomeTaxMonthly > commute.incomeTaxMonthly)
  assert.ok(taxable.residentTaxMonthly > commute.residentTaxMonthly)

  // above the monthly limit the excess is taxable, and the whole amount still moves the insurance grade
  const large = payroll({ commutingAllowance: 200_000 })
  assert.equal(large.commutingNonTaxable, 150_000)
  assert.equal(large.commutingTaxable, 50_000)
  assert.equal(large.taxableMonthly, 400_000)
  assert.equal(large.insuranceBase, 550_000)
  assert.equal(large.healthGrade.monthly, runtime.findStandardGrade(550_000, runtime.HEALTH_STANDARD_GRADES).monthly)

  // a cost reimbursement is paid out and costs the company, but touches neither tax nor insurance
  const reimbursed = payroll({ otherNonTaxableAllowance: 30_000 })
  assert.equal(reimbursed.grossMonthly, 380_000)
  assert.equal(reimbursed.insuranceBase, 350_000)
  assert.deepEqual(reimbursed.employee, base.employee)
  assert.deepEqual(reimbursed.employer, base.employer)
  assert.equal(reimbursed.incomeTaxMonthly, base.incomeTaxMonthly)
  assert.equal(reimbursed.residentTaxMonthly, base.residentTaxMonthly)
  assert.equal(reimbursed.takeHomeMonthly, base.takeHomeMonthly + 30_000)
  assert.equal(reimbursed.employerCostMonthly, base.employerCostMonthly + 30_000)

  // junk allowance input never leaks negative or non-finite numbers
  const junk = payroll({ commutingAllowance: -5, taxableAllowance: Number.NaN, otherNonTaxableAllowance: -1 })
  assert.equal(junk.grossMonthly, 350_000)
  assert.deepEqual(junk.employee, base.employee)
})

test('the salary page takes allowances in yen and lists them as rows of the payslip', () => {
  const view = read('../src/views/SalaryView.vue')
  for (const key of ['commutingAllowance', 'taxableAllowance', 'otherNonTaxableAllowance']) {
    assert.match(view, new RegExp(`updateAllowance\\('${key}'`))
  }
  assert.match(view, /v-for="\(row, index\) in bodyRows"/)
  assert.match(view, /salary\.commutingNonTaxable/)
  // 支給合計 is everything paid (allowances included), never the base salary alone
  assert.match(view, /money\(result\.grossMonthly\)/)
  assert.doesNotMatch(view, /form\.monthlySalary!/)
  // the distance to the next insurance grade is measured on the insurance base, not the base salary
  assert.match(view, /result\.value\.insuranceBase/)
  // the allowance inputs stay in the (unprinted) input card, and are summarised in the print header
  assert.match(view, /form\.commutingAllowance > 0/)
})

test('executive compensation derives the monthly salary from a single annual input, with no company profit or corporate tax involved', () => {
  const auto = runtime.calculateExecutiveCompensation(6_000_000, '東京都', true, null)
  assert.equal(auto.annualCompensation, 6_000_000)
  assert.equal(auto.monthlyCompensation, 500_000)
  assert.equal(auto.residentTaxIsEstimated, true)
  assert.equal('corporateTax' in auto, false)
  assert.equal('profitBeforeTax' in auto, false)
  assert.equal('isDeficit' in auto, false)

  // monthly figures times 12 must land within a few yen of the annual figures (integer rounding only)
  assert.ok(Math.abs(auto.employeeInsuranceMonthly * 12 - auto.employeeInsuranceAnnual) <= 12)
  assert.ok(Math.abs(auto.incomeTaxMonthly * 12 - auto.incomeTaxAnnual) <= 12)
  assert.ok(Math.abs(auto.residentTaxMonthly * 12 - auto.residentTaxAnnual) <= 12)
  assert.ok(Math.abs(auto.takeHomeMonthly * 12 - auto.takeHomeAnnual) <= 24)
  assert.equal(auto.companyCostMonthly, auto.monthlyCompensation + auto.employerInsuranceMonthly)
  assert.equal(auto.companyCostAnnual, auto.annualCompensation + auto.employerInsuranceAnnual)
  assert.equal(auto.takeHomeMonthly, auto.monthlyCompensation - auto.employeeInsuranceMonthly - auto.incomeTaxMonthly - auto.residentTaxMonthly)
  assert.ok(auto.takeHomeMonthly > 0 && auto.takeHomeMonthly < auto.monthlyCompensation)

  // executives carry no employment insurance (雇用保険)
  assert.equal(auto.employeeInsuranceMonthly, runtime.calculateInsurance(500_000, '東京都', true, false).employee.total)

  // 健康保険 and 厚生年金 must be reported separately, not just lumped into one "social insurance" figure
  assert.equal(auto.healthInsuranceMonthly + auto.pensionInsuranceMonthly, auto.employeeInsuranceMonthly)
  assert.equal(auto.healthInsuranceAnnual + auto.pensionInsuranceAnnual, auto.employeeInsuranceAnnual)
  assert.ok(auto.healthInsuranceMonthly > 0 && auto.pensionInsuranceMonthly > 0)
  const insuranceBreakdown = runtime.calculateInsurance(500_000, '東京都', true, false)
  assert.equal(auto.pensionInsuranceMonthly, insuranceBreakdown.employee.pension)
  assert.equal(auto.healthInsuranceMonthly, insuranceBreakdown.employee.health + insuranceBreakdown.employee.care + insuranceBreakdown.employee.childSupport)

  const overridden = runtime.calculateExecutiveCompensation(6_000_000, '東京都', true, 0)
  assert.equal(overridden.residentTaxIsEstimated, false)
  assert.equal(overridden.residentTaxAnnual, 0)
  assert.equal(overridden.residentTaxMonthly, 0)

  // zero/invalid input never goes negative or non-finite
  for (const bad of [0, -1, Number.NaN]) {
    const safe = runtime.calculateExecutiveCompensation(bad, '東京都', true, null)
    assert.ok(Number.isFinite(safe.takeHomeMonthly) && safe.takeHomeMonthly >= 0)
  }
})

test('dependents lower taxable income (not the bracket rate) for both salary and executive tools', () => {
  const noDependents = payroll()
  const withDependents = payroll({ dependentCount: 2 })
  // same gross, same insurance, same tax brackets -> strictly less tax, strictly more take-home
  assert.ok(withDependents.incomeTaxMonthly < noDependents.incomeTaxMonthly)
  assert.ok(withDependents.residentTaxMonthly < noDependents.residentTaxMonthly)
  assert.ok(withDependents.takeHomeMonthly > noDependents.takeHomeMonthly)
  assert.equal(withDependents.employee.total, noDependents.employee.total, 'insurance premiums do not depend on dependents')

  // the deduction constants are exactly 380,000 (income tax) / 330,000 (resident tax) per dependent
  assert.equal(runtime.dependentIncomeTaxDeduction(2), 760_000)
  assert.equal(runtime.dependentResidentTaxDeduction(2), 660_000)
  assert.equal(runtime.dependentIncomeTaxDeduction(0), 0)
  assert.equal(runtime.dependentIncomeTaxDeduction(-3), 0, 'negative counts never subtract')

  // executive tool: same non-negotiable-rate-table, lower-taxable-income behaviour
  const execNoDependents = runtime.calculateExecutiveCompensation(6_000_000, '東京都', true, null, 0)
  const execWithDependents = runtime.calculateExecutiveCompensation(6_000_000, '東京都', true, null, 2)
  assert.ok(execWithDependents.incomeTaxAnnual < execNoDependents.incomeTaxAnnual)
  assert.ok(execWithDependents.residentTaxAnnual < execNoDependents.residentTaxAnnual)
  assert.ok(execWithDependents.takeHomeAnnual > execNoDependents.takeHomeAnnual)
  assert.equal(execWithDependents.healthInsuranceAnnual, execNoDependents.healthInsuranceAnnual)
  assert.equal(execWithDependents.pensionInsuranceAnnual, execNoDependents.pensionInsuranceAnnual)

  // defaulting to 0 dependents must reproduce the pre-existing behaviour exactly
  const execDefaulted = runtime.calculateExecutiveCompensation(6_000_000, '東京都', true, null)
  assert.equal(execDefaulted.incomeTaxAnnual, execNoDependents.incomeTaxAnnual)
})

test('stay records reject bad dates, count leap years, merge overlaps, and export CSV', () => {
  assert.equal(runtime.validateTravelPeriod('2026-03-10', '2026-03-09'), false)
  assert.equal(runtime.travelDays('bad', '2026-03-09'), 0)
  assert.equal(runtime.inJapanDaysBetween('2026-01-01', '2026-01-10'), 8)
  const records = [
    { id: '1', exitDate: '2024-02-01', entryDate: '2024-02-10', exitPort: 'NRT', entryPort: 'HND', note: 'one' },
    { id: '2', exitDate: '2024-02-05', entryDate: '2024-02-15', exitPort: 'NRT', entryPort: 'KIX', note: '"two"' },
  ]
  const summary = runtime.summarizeStayByYear(records)[0]
  assert.equal(summary.daysInYear, 366)
  assert.equal(summary.awayDays, 15)
  assert.equal(summary.inJapanDays, 351)
  assert.match(runtime.recordsToCsv(records), /^﻿/)
  assert.match(runtime.recordsToCsv(records), /""two""/)
})

test('the financial tools are merged into salary + executive with working redirects', () => {
  const tools = read('../src/data/tools.ts')
  const router = read('../src/router/index.ts')
  const messages = read('../src/data/practicalToolMessages.ts')

  for (const removed of ['business-readiness', 'home-purchase', 'company-payroll', "status: 'upcoming'", "id: 'pension", "id: 'standard-remuneration'"]) {
    assert.doesNotMatch(tools, new RegExp(removed))
  }
  for (const path of ['salary', 'executive-compensation', 'stay-days']) {
    assert.match(router, new RegExp(`tools/${path}'`))
  }
  for (const legacy of ['payroll', 'standard-remuneration', 'pension']) {
    assert.match(router, new RegExp(`path: 'tools/${legacy}', redirect:`))
  }
  assert.match(messages, /工资、社保与到手金额/)
  assert.match(messages, /給与・社会保険・手取り/)
})

test('salary and executive views use 万円 inputs and no print/PDF or company-profit/corporate-tax code', () => {
  const salaryView = read('../src/views/SalaryView.vue')
  const executiveView = read('../src/views/ExecutiveCompensationView.vue')
  const financialCalc = read('../src/utils/financialCalculator.ts')
  const financialTypes = read('../src/types/financial.ts')

  // salary's main input box is a 万円 text field, not a raw-yen el-input-number
  assert.match(salaryView, /parseIncomeManYenInput/)
  assert.match(salaryView, /copy\.common\.wan/)
  assert.doesNotMatch(salaryView, /el-input-number v-model="form\.monthlySalary"/)

  // executive comp: one annual-salary input (万円), monthly is derived, no scenario list
  assert.match(executiveView, /parseIncomeManYenInput/)
  assert.match(executiveView, /calculateExecutiveCompensation/)
  assert.doesNotMatch(executiveView, /添加方案|プランを追加|compensations\.value\.push|scenario-grid|companyProfit|corporateTax/)

  // 健康保険 and 厚生年金 are shown as separate lines, not lumped into one figure
  assert.match(executiveView, /result\.healthInsuranceMonthly/)
  assert.match(executiveView, /result\.pensionInsuranceMonthly/)
  assert.match(executiveView, /result\.healthInsuranceAnnual/)
  assert.match(executiveView, /result\.pensionInsuranceAnnual/)
  assert.match(executiveView, /includeEmployerBurden/)

  // company profit / corporate tax were removed entirely, not just hidden in the UI
  for (const source of [financialCalc, financialTypes]) {
    assert.doesNotMatch(source, /corporateTax|CorporateTax|companyProfit|estimateCorporateTax|calculateExecutiveScenario/)
  }

  for (const view of [salaryView, executiveView]) {
    assert.doesNotMatch(view, /printReport|window\.print\(\)|report-print-compact/)
    assert.match(view, /form\.dependentCount/)
    assert.match(view, /copy\.common\.dependents/)
  }
})

test('salary and executive breakdowns render as a real 給与明細 payslip table, not a card list', () => {
  const salaryView = read('../src/views/SalaryView.vue')
  const executiveView = read('../src/views/ExecutiveCompensationView.vue')
  const stylesSource = read('../src/styles/index.css')

  // the global payslip table styling exists and clips its own focus/border painting
  assert.match(stylesSource, /\.payslip-table\b/)
  assert.match(stylesSource, /\.payslip-table tfoot \.payslip-net/)

  for (const view of [salaryView, executiveView]) {
    assert.match(view, /class="payslip-table"/)
    assert.match(view, /<thead>/)
    assert.match(view, /copy\.payslip\.paymentItem/)
    assert.match(view, /copy\.payslip\.deductionItem/)
    assert.match(view, /copy\.payslip\.totalPayment/)
    assert.match(view, /copy\.payslip\.totalDeduction/)
    assert.match(view, /copy\.payslip\.netPay/)
    assert.match(view, /class="payslip-net"/)
  }
})

test('the executive view offers separate CSV and PDF downloads for the monthly and the annual breakdown table', () => {
  const executiveView = read('../src/views/ExecutiveCompensationView.vue')
  assert.match(executiveView, /import \{ buildFilename, downloadCsv, payslipToCsv, type PayslipData \} from '@\/utils\/csv'/)
  assert.match(executiveView, /import \{ downloadPayslipPdf \} from '@\/utils\/payslipPdf'/)
  for (const kind of ['monthly', 'annual']) {
    assert.match(executiveView, new RegExp(`@click="downloadPayslip\\('${kind}', 'pdf'\\)"`))
    assert.match(executiveView, new RegExp(`@click="downloadPayslip\\('${kind}', 'csv'\\)"`))
  }

  // each table's data is built from that table's own figures, never a mix of monthly and annual
  const monthly = executiveView.slice(executiveView.indexOf('function buildMonthlyPayslip'), executiveView.indexOf('function buildAnnualPayslip'))
  const annual = executiveView.slice(executiveView.indexOf('function buildAnnualPayslip'), executiveView.indexOf('const conditionLines'))
  assert.ok(monthly.length > 0 && annual.length > 0)
  assert.match(monthly, /healthInsuranceMonthly/)
  assert.match(monthly, /takeHomeMonthly/)
  assert.doesNotMatch(monthly, /healthInsuranceAnnual|takeHomeAnnual/)
  assert.match(annual, /healthInsuranceAnnual/)
  assert.match(annual, /takeHomeAnnual/)
  assert.doesNotMatch(annual, /healthInsuranceMonthly|takeHomeMonthly/)
})

test('the payslip PDF is a real generated file: lazy-loaded libs, CJK-safe raster, text set via textContent', () => {
  const pdfUtil = read('../src/utils/payslipPdf.ts')
  const pkg = JSON.parse(read('../package.json'))
  assert.ok(pkg.dependencies.jspdf && pkg.dependencies.html2canvas, 'jspdf + html2canvas must be declared dependencies')
  // heavy libs only load on click, never in the main bundle
  assert.match(pdfUtil, /import\('html2canvas'\)/)
  assert.match(pdfUtil, /import\('jspdf'\)/)
  assert.doesNotMatch(pdfUtil, /^import .* from '(jspdf|html2canvas)'/m)
  // rasterised (no CJK font embedding) and injection-safe
  assert.match(pdfUtil, /html2canvas\(sheet/)
  assert.doesNotMatch(pdfUtil, /innerHTML/)
  assert.match(pdfUtil, /sheet\.remove\(\)/, 'the off-screen sheet must always be cleaned up')
})

test('download file names read as customer documents, e.g. 役员报酬_每月支付明细_600万円_20260926.pdf', () => {
  assert.equal(runtime.buildFilename(['役员报酬', '每月支付明细', '600万円', '20260926'], 'pdf'), '役员报酬_每月支付明细_600万円_20260926.pdf')
  // characters an operating system rejects and stray whitespace never reach the name; empty parts are skipped
  assert.equal(runtime.buildFilename(['a/b', ' c:d ', '', 'e f'], 'csv'), 'ab_cd_ef.csv')
  assert.equal(runtime.localDateStamp(new Date(2026, 8, 6)), '20260906')
  assert.equal(runtime.issueDate(new Date(2026, 8, 6)), '2026/09/06')

  const executiveView = read('../src/views/ExecutiveCompensationView.vue')
  assert.match(executiveView, /buildFilename\(\[/)
  assert.match(executiveView, /\$\{formatIncomeManYen\(annualCompensation\.value\)\}万円/)
  assert.doesNotMatch(executiveView, /sunrise-executive-payslip/)
  // the CSV and the PDF share one name, differing only in the extension
  assert.match(executiveView, /\], format\)/)
})

test('customer-facing output carries no explanatory notes or disclaimers; 概算 stays as a label on the tax rows', () => {
  const salaryView = read('../src/views/SalaryView.vue')
  const executiveView = read('../src/views/ExecutiveCompensationView.vue')
  const messages = read('../src/data/practicalToolMessages.ts')
  for (const view of [salaryView, executiveView]) {
    assert.doesNotMatch(view, /FinancialDisclaimer|<el-alert|residentHint|personalOnlyNote|employerBurdenNote/)
  }
  assert.doesNotMatch(executiveView, /class="panel-note"/)
  assert.doesNotMatch(messages, /residentHint|personalOnlyNote|employerBurdenNote/)
  assert.doesNotMatch(read('../src/data/financialParameters.ts'), /FINANCIAL_DISCLAIMER/)
  assert.equal(existsSync(new URL('../src/components/practical/FinancialDisclaimer.vue', import.meta.url)), false)

  // the PDF is the table and its heading only
  const pdfUtil = read('../src/utils/payslipPdf.ts')
  assert.doesNotMatch(pdfUtil, /footnotes|payslip-pdf-notes/)
  assert.doesNotMatch(executiveView, /footnotes/)
  assert.doesNotMatch(read('../src/styles/index.css'), /\.payslip-pdf-notes|\.practical-disclaimer/)

  // 概算 travels in the row label (screen tag, CSV and PDF) now that there is no footnote to carry it
  assert.match(executiveView, /residentTaxLabel\.value/)
  assert.equal((executiveView.match(/class="inline-tag"/g) ?? []).length, 2, 'both the monthly and the annual table tag the resident tax')
})

test('the printed page is one A4 sheet: a print-only header replaces the input form and the repeated summary cards', () => {
  const styles = read('../src/styles/index.css')
  const printBlock = styles.slice(styles.indexOf('@media print'), styles.indexOf('@media (prefers-reduced-motion'))
  const header = read('../src/components/practical/PrintHeader.vue')
  assert.match(header, /class="print-only print-header"/)
  // hidden on screen (declared before the print block), shown on paper
  assert.match(styles.slice(0, styles.indexOf('@media print')), /\.print-only \{ display: none; \}/)
  assert.match(printBlock, /\.print-only \{ display: block; \}/)

  for (const path of ['../src/views/SalaryView.vue', '../src/views/ExecutiveCompensationView.vue']) {
    const view = read(path)
    assert.match(view, /<PrintHeader\b/)
    assert.match(view, /<PracticalToolHero class="no-print"/)
    assert.match(view, /class="practical-panel no-print"/, 'the input form must not be printed')
  }
  // the executive summary cards only repeat 基本給 / 差引支給額 from the tables below
  assert.match(read('../src/views/ExecutiveCompensationView.vue'), /class="practical-metrics no-print"/)
  // the salary page's stepper-style stacking (mobile rule) must not apply on paper
  assert.match(printBlock, /\.practical-metrics\.three/)
})

test('select / picker panels stay inside their own border and shadow', () => {
  const styles = read('../src/styles/index.css')
  // The panel is two boxes: the outer .el-popper draws border + shadow, the inner box the white
  // background. Their corners must share one curve...
  assert.match(styles, /^\.el-popper \{ border-radius: var\(--radius-sm\); \}$/m)
  // ...and their widths must agree. Every Element Plus popper carries role="tooltip", and the inner
  // select box gets min-width = the select's width, so a 420px cap on ALL poppers let a select wider
  // than 420px overflow its own white background and shadow. Only real (dark) tooltips are capped that hard.
  assert.doesNotMatch(styles, /\.el-popper\[role="tooltip"\] \{[^}]*min\(420px/)
  assert.match(styles, /\.el-popper\.is-dark\[role="tooltip"\] \{ max-width: min\(420px, calc\(100vw - 32px\)\); \}/)
  // the focus ring is a real border colour, never an inset box-shadow that can paint past the box
  const focusRule = styles.match(/\.el-input__wrapper\.is-focus, \.el-select__wrapper\.is-focused \{[^}]*\}/)?.[0] ?? ''
  assert.match(focusRule, /border-color/)
  assert.doesNotMatch(focusRule, /box-shadow/)
})

test('printing the page (Cmd+P) no longer prints the app shell or splits a panel in half', () => {
  const styles = read('../src/styles/index.css')
  const printBlock = styles.slice(styles.indexOf('@media print'), styles.indexOf('@media (prefers-reduced-motion'))
  assert.match(styles, /@page \{ size: A4 portrait; margin: 18mm 12mm; \}/)
  assert.ok(printBlock.length > 0)
  // sticky translucent header / mobile menu / footer / toasts are dropped from paper
  for (const selector of ['.site-header', '.site-footer', '.mobile-panel', '.el-message', '.no-print']) {
    assert.ok(printBlock.includes(selector), `${selector} must be hidden when printing`)
  }
  assert.match(printBlock, /\.app-shell \{ display: block; min-height: 0; \}/)
  // a card title must never be stranded at the bottom of a page while its table starts the next
  assert.match(printBlock, /break-inside:\s*avoid/)
  for (const selector of ['.el-card', '.practical-panel', '.payslip-wrap']) {
    assert.ok(printBlock.includes(selector), `${selector} must not be split across pages`)
  }
  // download buttons are wrapped in .no-print so they never appear on paper
  const executiveView = read('../src/views/ExecutiveCompensationView.vue')
  assert.match(executiveView, /class="panel-actions no-print"/)
})

test('payslipToCsv mirrors the on-screen payslip table (payment/deduction side by side, subtotal, net pay)', () => {
  const data = {
    title: '役员报酬模拟 · 每月支付明细',
    headers: ['支给项目', '金额', '控除项目', '金额'],
    payments: [{ label: '基本给', value: 500_000 }],
    deductions: [
      { label: '健康保险', value: 29_250 },
      { label: '厚生年金', value: 45_750 },
      { label: '所得税', value: 15_350 },
      { label: '住民税', value: 25_667 },
    ],
    totalPaymentLabel: '支给合计', totalPayment: 500_000,
    totalDeductionLabel: '控除合计', totalDeduction: 116_017,
    netPayLabel: '差引支给额（实际到手）', netPay: 383_983,
  }
  const csv = runtime.payslipToCsv(data)
  assert.match(csv, /^\uFEFF/)
  const lines = csv.slice(1).split('\n')
  // header + 4 body rows (payment padded to the longer deduction side) + subtotal + net = 7 lines
  assert.equal(lines.length, 7)
  assert.equal(lines[0], '"支给项目","金额","控除项目","金额"')
  assert.equal(lines[1], '"基本给","500000","健康保险","29250"')
  // payment side is blank once its single row is used, deduction side keeps listing
  assert.equal(lines[2], '"","","厚生年金","45750"')
  assert.equal(lines[3], '"","","所得税","15350"')
  assert.equal(lines[4], '"","","住民税","25667"')
  assert.equal(lines[5], '"支给合计","500000","控除合计","116017"')
  assert.equal(lines[6], '"差引支给额（实际到手）","","","383983"')

  // embedded quote characters must still be escaped per RFC 4180
  const escaped = runtime.payslipToCsv({ ...data, payments: [{ label: 'x "y"', value: 1 }], deductions: [] })
  assert.match(escaped, /""y""/)
})
