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

test('executive scenario adds corporate tax and shows a deficit instead of clamping to zero', () => {
  const healthy = runtime.calculateExecutiveScenario(500_000, 30_000_000, '東京都', true, null)
  assert.ok(healthy.corporateTax.total > 0)
  assert.ok(healthy.corporateTax.effectiveRate > 0.15 && healthy.corporateTax.effectiveRate < 0.45)
  assert.equal(healthy.retainedAfterTax, healthy.profitBeforeTax - healthy.corporateTax.total)
  assert.equal(healthy.isDeficit, false)

  // compensation far above the profit pool -> negative retained profit must be reported
  const deficit = runtime.calculateExecutiveScenario(3_000_000, 5_000_000, '東京都', true, null)
  assert.ok(deficit.profitBeforeTax < 0)
  assert.ok(deficit.retainedAfterTax < 0)
  assert.equal(deficit.isDeficit, true)
  assert.equal(deficit.corporateTax.isDeficit, true)
  assert.equal(deficit.corporateTax.total, runtime.CORPORATE_TAX_PARAMETERS.inhabitantPerCapita)
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
