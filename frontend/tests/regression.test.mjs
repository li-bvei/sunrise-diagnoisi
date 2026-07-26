import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { build } from 'esbuild'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const universities = read('../src/data/universities/officialUniversities.ts')
const search = read('../src/data/universities/index.ts')
const calculator = read('../src/utils/highlySkilledCalculator.ts')
const view = read('../src/views/HighlySkilledView.vue')
const reportTypes = read('../src/types/highlySkilled.ts')
const help = read('../src/components/HelpPopover.vue')
const numeric = read('../src/utils/numericInput.ts')
const aliases = read('../src/data/universities/universityAliases.ts')
const selector = read('../src/components/highly-skilled/UniversitySelector.vue')
const reportView = read('../src/components/highly-skilled/DiagnosisReportView.vue')
const styles = read('../src/styles/index.css')

const bundled = await build({
  stdin: {
    contents: `
      export * from './src/utils/highlySkilledCalculator.ts'
      export * from './src/data/universities/index.ts'
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
    university: { countryCode: 'JP', universityId: null, searchText: '', manualReview: false, degreeAwardedByInstitution: false },
    multipleDegrees: false, japaneseUniversity: false, innovationOrganization: false,
    innovationSme: false, growthField: false, localGovernmentSupport: false,
    foreignQualification: false, baseActivityConfirmed: true, ...overrides,
  }
}

test('official PDF import contains the complete audited dataset', () => {
  assert.equal((universities.match(/manualReviewRequired: false/g) ?? []).length, 390)
  assert.equal((universities.match(/sourceDocument: "001335478\.pdf"/g) ?? []).length, 390)
  assert.match(universities, /sourcePage: 19/)
  assert.match(universities, /sourceTypes: \['world-ranking'\]/)
})

test('university search normalizes names and caps visible results', () => {
  assert.match(search, /\.normalize\('NFKC'\)/)
  assert.match(search, /replace\(\/&\/g, ' and '\)/)
  assert.match(search, /replace\(\/\^the\\s\+\/, ''\)/)
  assert.match(search, /limit = 20/)
  assert.match(search, /tooMany: matches\.length > limit/)
})

test('localized university names and multilingual search remain reliable', () => {
  assert.equal(runtime.universityAliasCount, 75)
  for (const [country, query, expected] of [
    ['CN', '北京大学', 'Peking University'],
    ['CN', '北大', 'Peking University'],
    ['HK', '香港理工大學', 'The Hong Kong Polytechnic University'],
    ['TW', '國立臺灣大學', 'National Taiwan University'],
    ['MO', '澳门大学', 'University of Macau'],
    ['US', 'MIT', 'Massachusetts Institute of Technology (MIT)'],
    ['JP', '東京大学', 'The University of Tokyo'],
  ]) {
    const found = runtime.searchUniversityRecords(country, query).results
    assert.equal(found[0]?.university.officialName, expected)
    assert.equal(new Set(found.map((item) => item.university.id)).size, found.length)
  }
  assert.equal(runtime.searchUniversityRecords('CN', '　北京　大学　').results[0].university.officialName, 'Peking University')
  assert.equal(runtime.searchUniversityRecords('CN', '北').results.length, 0)
  const fallback = runtime.universities.find((item) => item.id === 'aalto-university')
  assert.equal(runtime.getUniversityDisplayName(fallback, 'zh-CN'), fallback.officialName)
  assert.equal(fallback.officialName, 'Aalto University')
})

test('matched university is counted once and complex items remain pending', () => {
  assert.match(calculator, /selectedUniversity\?\.sourceTypes\.includes\('world-ranking'\)/)
  assert.match(calculator, /'topUniversity'.*'confirmed'/)
  for (const key of ['research', 'qualification', 'innovationOrganization', 'growthField', 'localGovernmentSupport', 'foreignQualification']) {
    assert.match(calculator, new RegExp(`'${key}'.*'pending'`))
  }
  assert.match(calculator, /confirmedTotal/)
  assert.match(calculator, /maximumTotal/)
})

test('Japanese degree is automatic, reactive, and N2 exclusion is applied', () => {
  const tokyo = runtime.searchUniversityRecords('JP', '东京大学').results[0].university
  const harvard = runtime.searchUniversityRecords('US', 'Harvard').results[0].university
  for (const education of ['bachelor', 'master', 'doctorate', 'professional_degree']) {
    const input = baseInput({
      education,
      university: { countryCode: 'JP', universityId: tokyo.id, searchText: tokyo.officialName, manualReview: false, degreeAwardedByInstitution: true },
    })
    assert.equal(runtime.isJapaneseHigherEducationDegree(input), true)
    assert.equal(runtime.calculateHighlySkilled(input).items.filter((item) => item.key === 'japaneseUniversity').length, 1)
  }
  const japaneseN2 = runtime.calculateHighlySkilled(baseInput({
    japaneseLevel: 'n2',
    university: { countryCode: 'JP', universityId: tokyo.id, searchText: tokyo.officialName, manualReview: false, degreeAwardedByInstitution: true },
  }))
  assert.equal(japaneseN2.items.find((item) => item.key === 'japaneseN2').status, 'excluded')
  const japaneseN1 = runtime.calculateHighlySkilled(baseInput({
    japaneseLevel: 'n1',
    university: { countryCode: 'JP', universityId: tokyo.id, searchText: tokyo.officialName, manualReview: false, degreeAwardedByInstitution: true },
  }))
  assert.equal(japaneseN1.items.find((item) => item.key === 'japaneseN1').points, 15)

  const foreign = baseInput({
    university: { countryCode: 'US', universityId: harvard.id, searchText: harvard.officialName, manualReview: false, degreeAwardedByInstitution: true },
  })
  assert.equal(runtime.isJapaneseHigherEducationDegree(foreign), false)
  assert.ok(runtime.calculateHighlySkilled(foreign).items.some((item) => item.key === 'topUniversity'))
  const uncertain = baseInput({
    education: 'other',
    university: { countryCode: 'JP', universityId: tokyo.id, searchText: tokyo.officialName, manualReview: false, degreeAwardedByInstitution: true },
  })
  assert.equal(runtime.isJapaneseHigherEducationDegree(uncertain), false)
  assert.ok(runtime.calculateHighlySkilled(uncertain).reviewFlags.includes('education'))
  assert.doesNotMatch(selector, /v-model="form\.japaneseUniversity"/)
})

test('date, income and experience controls use the required input model', () => {
  assert.equal((view.match(/format="YYYY\/MM\/DD"/g) ?? []).length, 2)
  assert.equal((view.match(/inputmode="numeric"/g) ?? []).length, 2)
  assert.doesNotMatch(view, /el-input-number v-model="form\.(annualIncome|experienceYears)"/)
  assert.match(numeric, /MAX_ANNUAL_INCOME_YEN = 1_000_000_000/)
  assert.match(numeric, /MAX_EXPERIENCE_YEARS = 70/)
  assert.match(numeric, /replace\(\/\[,，\\s\]\/g, ''\)/)
})

test('help and report structures retain sources and pending status', () => {
  assert.match(help, /@mouseenter="visible = true"/)
  assert.match(help, /@focus="visible = true"/)
  assert.match(help, /@click="visible = !visible"/)
  assert.match(help, /noopener noreferrer/)
  assert.match(help, /aria-label/)
  assert.match(reportTypes, /universityVerification/)
  assert.match(reportTypes, /pendingTotal/)
  assert.match(reportTypes, /maximumTotal/)
  assert.match(view, /HelpPopover/)
})

test('report reuses the result snapshot, masks phone, and includes printable charts', () => {
  const tokyo = runtime.searchUniversityRecords('JP', '东京大学').results[0].university
  const input = baseInput({
    japaneseLevel: 'n2',
    researchAchievements: 1,
    university: { countryCode: 'JP', universityId: tokyo.id, searchText: tokyo.officialName, manualReview: false, degreeAwardedByInstitution: true },
  })
  const result = runtime.calculateHighlySkilled(input)
  const report = runtime.createDiagnosisReport(input, result, 'zh-CN')
  assert.equal(report.result.confirmedTotal, result.confirmedTotal)
  assert.equal(report.result.pendingTotal, result.pendingTotal)
  assert.equal(report.result.maximumTotal, result.maximumTotal)
  assert.deepEqual(report.recommendations, result.suggestions)
  assert.equal(report.scoreChart.confirmed, result.confirmedTotal)
  assert.equal(report.scoreChart.pending, result.pendingTotal)
  assert.equal(report.universityAssessment.japaneseHigherEducationDegreeStatus, 'confirmed')
  assert.notEqual(report.applicant.maskedPhone, input.phone)
  assert.ok(report.categoryChart.some((row) => row.category === 'university'))
  assert.equal(report.breakdown.length, result.items.length)
  assert.ok(report.breakdown.every((item) => item.inputValue && item.reasonKey && item.evidence.length))
  assert.match(reportView, /ScoreProgressChart/)
  assert.match(reportView, /ScoreBreakdownChart/)
  assert.match(styles, /@media print/)
  assert.match(styles, /@page \{ size: A4 portrait/)
  assert.match(styles, /\.report-dialog \.el-dialog__footer \{ display: none/)
})
