import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { build } from 'esbuild'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const officialSource = read('../src/data/universities/officialUniversities.ts')
const machineNamesSource = read('../src/data/universities/machineTranslatedNames.ts')
const searchSource = read('../src/data/universities/index.ts')
const calculatorSource = read('../src/utils/highlySkilledCalculator.ts')
const viewSource = read('../src/views/HighlySkilledView.vue')
const reportTypesSource = read('../src/types/highlySkilled.ts')
const numericSource = read('../src/utils/numericInput.ts')
const selectorSource = read('../src/components/highly-skilled/UniversitySelector.vue')
const reportViewSource = read('../src/components/highly-skilled/DiagnosisReportView.vue')
const appSource = read('../src/App.vue')
const stylesSource = read('../src/styles/index.css')

const bundled = await build({
  stdin: {
    contents: `
      export * from './src/utils/highlySkilledCalculator.ts'
      export * from './src/data/universities/index.ts'
      export * from './src/data/universities/officialUniversities.ts'
      export * from './src/data/universities/universityAliases.ts'
      export * from './src/data/universities/machineTranslatedNames.ts'
      export * from './src/utils/numericInput.ts'
    `,
    resolveDir: resolve('.'),
    sourcefile: 'test-entry.ts',
  },
  alias: { '@': resolve('src') },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
})
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)

function baseInput(overrides = {}) {
  return {
    name: 'Test', phone: '09012345678', birthDate: '1996-01-01', diagnosisDate: '2026-01-01',
    activity: 'professional', age: 30, annualIncome: 8_000_000, education: 'master',
    experienceYears: 7, researchAchievements: 0, japaneseLevel: 'none', qualificationCount: 0,
    managementPosition: 'none',
    university: { countryCode: 'JP', universityId: null, searchText: '' },
    multipleDegrees: false, japaneseUniversity: false, innovationOrganization: false,
    innovationSme: false, growthField: false, localGovernmentSupport: false,
    foreignQualification: false, baseActivityConfirmed: true, ...overrides,
  }
}

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

test('official PDF import remains complete and immutable', () => {
  assert.equal(runtime.officialUniversities.length, 390)
  assert.equal(new Set(runtime.officialUniversities.map((item) => item.id)).size, 390)
  assert.equal((officialSource.match(/sourceDocument: "001335478\.pdf"/g) ?? []).length, 390)
  assert.equal(Math.max(...runtime.officialUniversities.map((item) => item.sourcePage ?? 0)), 19)
  assert.ok(runtime.officialUniversities.every((item) => item.sourceTypes.includes('world-ranking')))
})

test('all 390 universities have Chinese display names without overwriting the 75 curated names', () => {
  assert.equal(runtime.universityAliasCount, 75)
  assert.equal(runtime.machineTranslatedUniversityNameCount, 315)
  assert.equal(runtime.universities.length, 390)
  assert.ok(runtime.universities.every((item) => item.displayNames?.zh?.trim()))
  assert.equal(runtime.universities.filter((item) => item.translationStatus === 'machine-translated').length, 315)

  const curatedIds = new Set(Object.keys(runtime.universityAliases))
  const machineIds = new Set(runtime.machineTranslatedUniversityNames.map((item) => item.universityId))
  assert.equal([...curatedIds].filter((id) => machineIds.has(id)).length, 0)
  for (const [id, alias] of Object.entries(runtime.universityAliases)) {
    assert.equal(runtime.universities.find((item) => item.id === id)?.displayNames?.zh, alias.displayNames.zh)
  }
  for (const official of runtime.officialUniversities) {
    assert.equal(runtime.universities.find((item) => item.id === official.id)?.officialName, official.officialName)
  }
})

test('Chinese and English search cover every university and never merge stable IDs', () => {
  for (const university of runtime.universities) {
    const chinese = runtime.searchUniversityRecords(university.countryCode, university.displayNames.zh, 390).results
    const english = runtime.searchUniversityRecords(university.countryCode, university.officialName, 390).results
    assert.ok(chinese.some((match) => match.university.id === university.id), `Chinese search missed ${university.id}`)
    assert.ok(english.some((match) => match.university.id === university.id), `English search missed ${university.id}`)
    assert.equal(new Set(chinese.map((match) => match.university.id)).size, chinese.length)
  }
  assert.equal(runtime.searchUniversityRecords('CN', '北').results.length, 0)
  assert.match(searchSource, /\.normalize\('NFKC'\)/)
  assert.match(searchSource, /limit = 20/)
})

test('Japanese higher-education degree is a manual input independent of school selection', () => {
  const tokyo = runtime.searchUniversityRecords('JP', '东京大学').results[0].university
  const harvard = runtime.searchUniversityRecords('US', '哈佛大学').results[0].university
  const japaneseSchoolUnchecked = runtime.calculateHighlySkilled(baseInput({
    university: { countryCode: 'JP', universityId: tokyo.id, searchText: tokyo.officialName },
    japaneseUniversity: false,
  }))
  assert.equal(japaneseSchoolUnchecked.items.some((item) => item.key === 'japaneseUniversity'), false)

  const foreignSchoolChecked = runtime.calculateHighlySkilled(baseInput({
    university: { countryCode: 'US', universityId: harvard.id, searchText: harvard.officialName },
    japaneseUniversity: true,
  }))
  assert.equal(foreignSchoolChecked.items.find((item) => item.key === 'japaneseUniversity')?.points, 10)

  const n2Excluded = runtime.calculateHighlySkilled(baseInput({ japaneseUniversity: true, japaneseLevel: 'n2' }))
  assert.equal(n2Excluded.items.find((item) => item.key === 'japaneseN2')?.status, 'included')
  assert.equal(n2Excluded.items.find((item) => item.key === 'japaneseN2')?.points, 10)
  assert.equal(n2Excluded.items.find((item) => item.key === 'japaneseUniversity')?.status, 'excluded')
  const n2Counted = runtime.calculateHighlySkilled(baseInput({ japaneseUniversity: false, japaneseLevel: 'n2' }))
  assert.equal(n2Counted.items.find((item) => item.key === 'japaneseN2')?.points, 10)
  const n1WithDegree = runtime.calculateHighlySkilled(baseInput({ japaneseUniversity: true, japaneseLevel: 'n1' }))
  assert.equal(n1WithDegree.items.find((item) => item.key === 'japaneseN1')?.points, 15)
  assert.equal(n1WithDegree.items.some((item) => item.key === 'japaneseUniversity'), true)

  assert.equal((viewSource.match(/key: 'japaneseUniversity'/g) ?? []).length, 1)
  assert.match(viewSource, /if \(value === 'n2'\) form\.japaneseUniversity = false/)
  assert.match(viewSource, /bonus\.key === 'japaneseUniversity' && form\.japaneseLevel === 'n2'/)
  assert.doesNotMatch(viewSource, /form\.japaneseUniversity = true/)
  assert.ok(viewSource.indexOf("key: 'multipleDegrees'") < viewSource.indexOf("key: 'japaneseUniversity'"))
  assert.ok(viewSource.indexOf("key: 'japaneseUniversity'") < viewSource.indexOf("key: 'innovationOrganization'"))
  assert.doesNotMatch(selectorSource, /japaneseUniversity/)
})

test('ordinary scoring uses one predicted total and includes selected complex bonuses immediately', () => {
  const input = baseInput({
    researchAchievements: 1,
    qualificationCount: 2,
    multipleDegrees: true,
    innovationOrganization: true,
    innovationSme: true,
    growthField: true,
    localGovernmentSupport: true,
    foreignQualification: true,
  })
  const result = runtime.calculateHighlySkilled(input)
  const included = result.items.filter((item) => item.status === 'included')
  assert.equal(result.totalPoints, included.reduce((sum, item) => sum + item.points, 0))
  assert.equal(result.reaches70, result.totalPoints >= 70)
  assert.equal(result.reaches80, result.totalPoints >= 80)
  assert.equal(result.pointsTo70, Math.max(0, 70 - result.totalPoints))
  assert.equal(result.pointsTo80, Math.max(0, 80 - result.totalPoints))
  assert.equal(result.items.some((item) => item.status === 'pending' || item.status === 'confirmed'), false)
  for (const key of ['research', 'qualification', 'multipleDegrees', 'innovationOrganization', 'innovationSme', 'growthField', 'localGovernmentSupport', 'foreignQualification']) {
    assert.equal(result.items.find((item) => item.key === key)?.status, 'included', key)
  }
  for (const obsolete of ['total', 'confirmedTotal', 'pendingTotal', 'maximumTotal', 'meetsPointThreshold', 'maximumMeetsPointThreshold', 'reviewFlags']) {
    assert.equal(obsolete in result, false, obsolete)
  }

  const report = runtime.createDiagnosisReport(input, result, 'zh-CN')
  assert.equal(report.diagnosis.totalPoints, result.totalPoints)
  assert.equal(report.scoreChart.totalPoints, result.totalPoints)
  assert.ok(report.categoryChart.every((row) => Object.keys(row).sort().join(',') === 'category,points'))
  assert.equal(report.disclaimer, '本工具根据您填写和选择的内容计算预计积分。正式申请时，各项加分均需提交相应证明材料，并以出入国在留管理厅的最终审查结果为准。')
  assert.doesNotMatch(reportTypesSource, /confirmedPoints|pendingPoints|maximumEstimatedPoints|manual-review/)
  assert.doesNotMatch(calculatorSource, /status === 'pending'|status === 'confirmed'/)
  assert.doesNotMatch(reportViewSource, /待确认|確認待ち|最高可能|最大見込|人工确认|個別確認/)
})

test('all degree-award confirmation code and copy has been removed', () => {
  const source = sourceFiles(resolve('src'))
    .filter((path) => /\.(ts|vue|css|md)$/.test(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')
  assert.doesNotMatch(source, /degreeAwardedByInstitution/)
  assert.doesNotMatch(source, /autoJapaneseDegree/)
  assert.doesNotMatch(source, /学位授予确认|学位授与確認/)
})

test('annual income accepts ten-thousand-yen units and keeps yen internally', () => {
  assert.equal(runtime.parseIncomeManYenInput('400'), 4_000_000)
  assert.equal(runtime.parseIncomeManYenInput('1000'), 10_000_000)
  assert.equal(runtime.parseIncomeManYenInput('0.1'), 1_000)
  assert.equal(runtime.parseIncomeManYenInput('-1'), null)
  assert.equal(runtime.parseIncomeManYenInput(''), null)
  assert.equal(runtime.formatIncomeManYen(4_000_000), '400')
  assert.match(viewSource, /inputmode="decimal"/)
  assert.match(viewSource, /万日元/)
  assert.match(viewSource, /万円/)
  assert.doesNotMatch(viewSource, /el-input-number v-model="form\.(annualIncome|experienceYears)"/)
  assert.match(numericSource, /Math\.round\(manYen \* 10_000\)/)
})

test('income scoring and minimum-income checks use the converted yen value', () => {
  const atFourMillion = runtime.calculateHighlySkilled(baseInput({ age: 29, annualIncome: 4_000_000 }))
  assert.equal(atFourMillion.items.find((item) => item.key === 'income')?.points, 10)
  assert.equal(atFourMillion.meetsIncomeRequirement, true)
  const belowMinimum = runtime.calculateHighlySkilled(baseInput({ age: 29, annualIncome: 2_999_000 }))
  assert.equal(belowMinimum.meetsIncomeRequirement, false)

  const report = runtime.createDiagnosisReport(baseInput({ age: 29, annualIncome: 4_000_000 }), atFourMillion, 'zh-CN')
  assert.equal(report.diagnosis.inputSnapshot.annualIncome, 4_000_000)
  assert.match(reportViewSource, /万日元/)
  assert.match(reportViewSource, /万円/)
})

test('report and result breakdowns expose only item, points, and status', () => {
  const input = baseInput({ japaneseUniversity: true, japaneseLevel: 'n2', researchAchievements: 1 })
  const result = runtime.calculateHighlySkilled(input)
  const report = runtime.createDiagnosisReport(input, result, 'zh-CN')
  assert.equal(report.breakdown.length, result.items.length)
  assert.ok(report.breakdown.every((item) => (
    Object.keys(item).sort().join(',') === 'category,key,points,status'
  )))
  assert.equal('evidenceRequired' in report, false)
  assert.equal('manualChecks' in report, false)
  assert.equal('sources' in report, false)
  assert.doesNotMatch(reportTypesSource, /evidenceRequired|manualChecks|sources: Array/)
  assert.doesNotMatch(reportViewSource, /官方依据|公式根拠|需要证明的项目|証明が必要な項目|需要人工确认|個別確認が必要/)
  assert.doesNotMatch(reportViewSource, /inputValue|reasonKey|item\.evidence/)
  assert.doesNotMatch(stylesSource, /report-two-columns|report-sources/)
  assert.match(reportViewSource, /ScoreProgressChart/)
  assert.match(reportViewSource, /ScoreBreakdownChart/)
  assert.match(reportViewSource, /UniversityAssessmentCard/)
  assert.match(reportViewSource, /report\.recommendations/)
})

test('date pickers use stable values and numeric Chinese/Japanese calendar labels', () => {
  assert.equal((viewSource.match(/value-format="YYYY-MM-DD"/g) ?? []).length, 2)
  assert.equal((viewSource.match(/format="YYYY\/MM\/DD"/g) ?? []).length, 2)
  for (let month = 1; month <= 12; month += 1) {
    assert.match(appSource, new RegExp(`month${month}: '${month}月'`))
  }
  assert.match(appSource, /months: numericMonths/)
  assert.match(appSource, /mon: '月曜日'/)
  assert.match(appSource, /mon: '一'/)
  assert.doesNotMatch(appSource, /十二月|December/)
  assert.match(reportViewSource, /replace\(\/-\/g, '\/'\)/)
  assert.match(calculatorSource, /calculateAge/)
})

test('report remains printable and charts remain visible at all sizes', () => {
  assert.match(stylesSource, /@media print/)
  assert.match(stylesSource, /@page \{ size: A4 portrait/)
  assert.match(stylesSource, /\.report-dialog \.el-dialog__footer \{ display: none/)
  assert.match(stylesSource, /\.result-chart-grid/)
  assert.doesNotMatch(machineNamesSource, /officialName:/)
})
