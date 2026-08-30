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

test('standard remuneration boundaries are lower-inclusive and upper-exclusive', () => {
  assert.equal(runtime.findStandardGrade(289_999, runtime.HEALTH_STANDARD_GRADES).monthly, 280_000)
  assert.equal(runtime.findStandardGrade(290_000, runtime.HEALTH_STANDARD_GRADES).monthly, 300_000)
  assert.equal(runtime.findStandardGrade(309_999, runtime.HEALTH_STANDARD_GRADES).monthly, 300_000)
  assert.equal(runtime.findStandardGrade(310_000, runtime.HEALTH_STANDARD_GRADES).monthly, 320_000)
  assert.equal(runtime.findStandardGrade(-1, runtime.PENSION_STANDARD_GRADES).monthly, 88_000)
})

test('payroll handles empty and invalid amounts without negative or non-finite output', () => {
  for (const amount of [0, Number.NaN, -100]) {
    const result = runtime.calculatePayroll({ monthlySalary: amount, age: 35, prefecture: '東京都', includeCare: false, residentTaxMonthly: 0 })
    assert.ok(Number.isFinite(result.takeHomeMonthly))
    assert.ok(result.takeHomeMonthly >= 0)
    assert.ok(result.employerCostMonthly >= 0)
  }
  assert.match(runtime.formatYen(123_456, 'zh-CN'), /123,456/)
  assert.match(runtime.formatYen(123_456, 'ja-JP'), /123,456/)
})

test('pension forward estimate and target reverse calculation stay consistent', () => {
  const input = {
    currentAge: 35,
    workUntilAge: 65,
    nationalPensionMonths: 24,
    employeePensionMonths: 120,
    existingAverageRemuneration: 320_000,
    futureAverageRemuneration: 400_000,
  }
  const estimate = runtime.calculatePensionEstimate(input)
  const reverse = runtime.calculatePensionTarget(input, estimate.totalMonthly)
  assert.ok(Math.abs(reverse.requiredFutureAverageRemuneration - input.futureAverageRemuneration) < 5_000)
  assert.equal(reverse.exceedsCurrentCap, false)
  assert.ok(estimate.totalAnnual > 0)
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
  assert.match(runtime.recordsToCsv(records), /^\uFEFF/)
  assert.match(runtime.recordsToCsv(records), /""two""/)
})

test('all practical tools are real routes and placeholder entries are gone', () => {
  const tools = read('../src/data/tools.ts')
  const router = read('../src/router/index.ts')
  const messages = read('../src/data/practicalToolMessages.ts')
  const vite = read('../vite.config.ts')
  for (const removed of ['business-readiness', 'home-purchase', 'home-sale', 'company-payroll', 'departure-pension', "status: 'upcoming'"]) {
    assert.doesNotMatch(tools, new RegExp(removed))
  }
  for (const path of ['payroll', 'standard-remuneration', 'pension', 'executive-compensation', 'stay-days']) {
    assert.match(router, new RegExp(`tools/${path}`))
  }
  assert.match(messages, /工资手取与公司实际成本/)
  assert.match(messages, /給与手取り・会社実質負担/)
  assert.match(vite, /production' \? '\/server\/'/)
})
