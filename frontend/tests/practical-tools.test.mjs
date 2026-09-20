import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { build } from 'esbuild'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const bundled = await build({
  stdin: {
    contents: `
      export * from './src/utils/financialCalculator.ts'
      export * from './src/utils/stayCalculator.ts'
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

test('the focus ring on inputs/selects is a real border, not a box-shadow ring, so it cannot visually exceed the rounded box', () => {
  const stylesSource = read('../src/styles/index.css')
  const wrapperRuleMatch = stylesSource.match(/\.el-input__wrapper, \.el-select__wrapper, \.el-textarea__inner \{[^}]*\}/)
  assert.ok(wrapperRuleMatch, 'expected a combined el-input__wrapper/el-select__wrapper rule')
  assert.match(wrapperRuleMatch[0], /overflow:\s*hidden/)
  assert.match(wrapperRuleMatch[0], /border-radius/)
  assert.match(wrapperRuleMatch[0], /border:\s*1px solid/)
  assert.match(wrapperRuleMatch[0], /box-shadow:\s*none/)

  const focusRuleMatch = stylesSource.match(/\.el-input__wrapper\.is-focus, \.el-select__wrapper\.is-focused \{[^}]*\}/)
  assert.ok(focusRuleMatch, 'expected a focus-state rule for the input/select wrapper')
  assert.match(focusRuleMatch[0], /border-color/)
  assert.doesNotMatch(focusRuleMatch[0], /box-shadow/, 'focus state must not reintroduce a shadow-based ring')
})

test('the dropdown popper and its white panel share one border-radius (the shadow-casting box must match the visible box)', () => {
  const stylesSource = read('../src/styles/index.css')
  // .el-popper is the outer box that actually carries the white background, border and
  // drop shadow for every select/date-picker/dropdown panel in the app; its child paints
  // at --el-border-radius-base (10px via our override). If .el-popper keeps Element Plus's
  // own hardcoded 4px default instead, the shadow reads as spilling past the rounded
  // white corner because the two nested boxes disagree on the curve.
  assert.match(stylesSource, /\.el-popper \{ border-radius: var\(--radius-sm\); \}/)
})
