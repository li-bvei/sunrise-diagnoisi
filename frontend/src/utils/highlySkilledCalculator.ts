import { universities, universityDatasetMetadata } from '@/data/universities'
import { officialSources } from '@/data/officialSources'
import type {
  DiagnosisReport,
  EducationLevel,
  HighlySkilledActivity,
  HighlySkilledInput,
  HighlySkilledResult,
  ImprovementSuggestion,
  ReviewFlag,
  ScoreItem,
} from '@/types/highlySkilled'

export const HIGHLY_SKILLED_RULES_VERSION = '2026-07'
export const HIGHLY_SKILLED_SOURCE_URL =
  'https://www.moj.go.jp/isa/applications/resources/newimmiact_3_evaluate_index.html'

export function calculateAge(birthDate: string, diagnosisDate: string): number {
  const birth = new Date(`${birthDate}T00:00:00`)
  const reference = new Date(`${diagnosisDate}T00:00:00`)
  if (Number.isNaN(birth.getTime()) || Number.isNaN(reference.getTime()) || birth > reference) return -1
  let age = reference.getFullYear() - birth.getFullYear()
  const birthdayPassed =
    reference.getMonth() > birth.getMonth()
    || (reference.getMonth() === birth.getMonth() && reference.getDate() >= birth.getDate())
  if (!birthdayPassed) age -= 1
  return age
}

function educationPoints(activity: HighlySkilledActivity, education: EducationLevel) {
  if (activity === 'academic') {
    if (education === 'doctorate') return 30
    if (education === 'master' || education === 'professional_degree') return 20
    return 0
  }
  if (activity === 'professional') {
    if (education === 'doctorate') return 30
    if (education === 'master' || education === 'professional_degree') return 20
    if (education === 'bachelor') return 10
    return 0
  }
  if (education === 'doctorate' || education === 'master' || education === 'professional_degree') return 20
  return education === 'bachelor' ? 10 : 0
}

function experiencePoints(activity: HighlySkilledActivity, years: number) {
  if (activity === 'academic') {
    if (years >= 7) return 15
    if (years >= 5) return 10
    return years >= 3 ? 5 : 0
  }
  if (activity === 'professional') {
    if (years >= 10) return 20
    if (years >= 7) return 15
    if (years >= 5) return 10
    return years >= 3 ? 5 : 0
  }
  if (years >= 10) return 25
  if (years >= 7) return 20
  if (years >= 5) return 15
  return years >= 3 ? 10 : 0
}

function incomePoints(activity: HighlySkilledActivity, age: number, income: number) {
  if (activity === 'management') {
    if (income >= 30_000_000) return 50
    if (income >= 25_000_000) return 40
    if (income >= 20_000_000) return 30
    if (income >= 15_000_000) return 20
    return income >= 10_000_000 ? 10 : 0
  }
  if (income >= 10_000_000) return 40
  if (income >= 9_000_000) return 35
  if (income >= 8_000_000) return 30
  if (income >= 7_000_000 && age < 40) return 25
  if (income >= 6_000_000 && age < 40) return 20
  if (income >= 5_000_000 && age < 35) return 15
  return income >= 4_000_000 && age < 30 ? 10 : 0
}

function agePoints(activity: HighlySkilledActivity, age: number) {
  if (activity === 'management') return 0
  if (age < 30) return 15
  if (age < 35) return 10
  return age < 40 ? 5 : 0
}

function researchPoints(activity: HighlySkilledActivity, achievements: 0 | 1 | 2) {
  if (activity === 'academic') return achievements >= 2 ? 25 : achievements === 1 ? 20 : 0
  return activity === 'professional' && achievements >= 1 ? 15 : 0
}

function add(
  items: ScoreItem[],
  key: string,
  category: ScoreItem['category'],
  points: number,
  status: ScoreItem['status'] = 'confirmed',
  sourceUrl?: string,
) {
  if (points > 0) items.push({ key, category, points, status, sourceUrl })
}

function addExcluded(items: ScoreItem[], key: string, category: ScoreItem['category'], reasonKey: string) {
  items.push({ key, category, points: 0, status: 'excluded', reasonKey })
}

function suggestions(input: HighlySkilledInput, total: number): ImprovementSuggestion[] {
  const result: ImprovementSuggestion[] = []
  if (total >= 70) {
    result.push({ key: 'prepareEvidence', potentialPoints: 0, priority: 'high' })
  } else {
    if (input.japaneseLevel === 'none') result.push({ key: 'japaneseN2', potentialPoints: 10, priority: 'high' })
    if (input.japaneseLevel === 'n2') result.push({ key: 'japaneseN1Upgrade', potentialPoints: 5, priority: 'medium' })
    if (!input.university.universityId) result.push({ key: 'verifyUniversity', potentialPoints: 10, priority: 'medium' })
    if (input.experienceYears < 3) result.push({ key: 'experience3', potentialPoints: 5, priority: 'medium' })
    if (input.activity !== 'management' && input.annualIncome < 4_000_000 && input.age < 30) {
      result.push({ key: 'income400', potentialPoints: 10, priority: 'medium' })
    }
    if (!input.multipleDegrees && ['master', 'doctorate', 'professional_degree'].includes(input.education)) {
      result.push({ key: 'multipleDegrees', potentialPoints: 5, priority: 'information' })
    }
    if (!input.japaneseUniversity) {
      result.push({ key: 'japaneseDegreeSelection', potentialPoints: 10, priority: 'information' })
    }
  }
  if (total < 80) result.push({ key: 'gapTo80', potentialPoints: 80 - total, priority: 'information' })
  if (input.activity === 'professional' && input.qualificationCount === 0) {
    result.push({ key: 'qualificationReview', potentialPoints: 5, priority: 'information' })
  }
  if (input.researchAchievements > 0) result.push({ key: 'researchEvidence', potentialPoints: 0, priority: 'high' })
  if (input.japaneseUniversity && input.japaneseLevel === 'n2') {
    result.unshift({ key: 'japaneseDegreeN2Exclusion', potentialPoints: 0, priority: 'high' })
  }
  if (input.education === 'other') result.unshift({ key: 'educationReview', potentialPoints: 0, priority: 'high' })
  if (!input.baseActivityConfirmed) result.unshift({ key: 'activityReview', potentialPoints: 0, priority: 'high' })
  return result.slice(0, 8)
}

export function calculateHighlySkilled(input: HighlySkilledInput): HighlySkilledResult {
  const items: ScoreItem[] = []
  add(items, 'education', 'education', educationPoints(input.activity, input.education))
  add(items, 'experience', 'experience', experiencePoints(input.activity, input.experienceYears))
  add(items, 'income', 'income', incomePoints(input.activity, input.age, input.annualIncome))
  add(items, 'age', 'age', agePoints(input.activity, input.age))
  add(items, 'research', 'research', researchPoints(input.activity, input.researchAchievements), 'pending', officialSources.research.url)
  add(items, 'qualification', 'qualification', input.activity === 'professional' ? Math.min(input.qualificationCount, 2) * 5 : 0, 'pending', officialSources.japaneseQualification.url)
  add(items, 'representative', 'position', input.activity === 'management' && input.managementPosition === 'representative' ? 10 : 0)
  add(items, 'director', 'position', input.activity === 'management' && input.managementPosition === 'director' ? 5 : 0)
  const graduateDegree = ['master', 'doctorate', 'professional_degree'].includes(input.education)
  add(items, 'multipleDegrees', 'bonus', input.multipleDegrees && graduateDegree ? 5 : 0, 'pending', officialSources.pointEvidence.url)
  const selectedUniversity = universities.find((item) => item.id === input.university.universityId)
  add(items, 'japaneseUniversity', 'bonus', input.japaneseUniversity ? 10 : 0, 'pending', officialSources.pointEvidence.url)
  add(items, 'topUniversity', 'bonus', input.education !== 'other' && selectedUniversity?.sourceTypes.includes('world-ranking') ? 10 : 0, 'confirmed', officialSources.university.url)
  add(items, 'japaneseN1', 'bonus', input.japaneseLevel === 'n1' ? 15 : 0)
  if (input.japaneseLevel === 'n2' && input.japaneseUniversity) {
    addExcluded(items, 'japaneseN2', 'bonus', 'excludedByJapaneseDegree')
  } else {
    add(items, 'japaneseN2', 'bonus', input.japaneseLevel === 'n2' ? 10 : 0)
  }
  add(items, 'innovationOrganization', 'bonus', input.innovationOrganization ? 10 : 0, 'pending', officialSources.innovation.url)
  add(items, 'innovationSme', 'bonus', input.innovationOrganization && input.innovationSme ? 10 : 0, 'pending', officialSources.innovation.url)
  add(items, 'growthField', 'bonus', input.growthField ? 10 : 0, 'pending', officialSources.growthField.url)
  add(items, 'localGovernmentSupport', 'bonus', input.localGovernmentSupport ? 10 : 0, 'pending', officialSources.localGovernment.url)
  add(items, 'foreignQualification', 'bonus', input.foreignQualification ? 5 : 0, 'pending', officialSources.foreignQualification.url)

  const confirmedTotal = items.filter((item) => item.status === 'confirmed').reduce((sum, item) => sum + item.points, 0)
  const pendingTotal = items.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.points, 0)
  const maximumTotal = confirmedTotal + pendingTotal
  const reviewFlags: ReviewFlag[] = []
  if (input.education === 'other') reviewFlags.push('education' as const)
  if (input.university.manualReview) reviewFlags.push('university' as const)
  if (!input.baseActivityConfirmed) reviewFlags.push('activity' as const)
  if (pendingTotal > 0 && !reviewFlags.includes('evidence')) reviewFlags.push('evidence')
  const meetsPointThreshold = confirmedTotal >= 70
  const meetsIncomeRequirement = input.activity === 'management' || input.annualIncome >= 3_000_000

  return {
    total: confirmedTotal,
    confirmedTotal,
    pendingTotal,
    maximumTotal,
    items,
    meetsPointThreshold,
    maximumMeetsPointThreshold: maximumTotal >= 70,
    confirmedMeets80: confirmedTotal >= 80,
    maximumMeets80: maximumTotal >= 80,
    meetsIncomeRequirement,
    baseActivityConfirmed: input.baseActivityConfirmed,
    preliminaryEligible: meetsPointThreshold && meetsIncomeRequirement && input.baseActivityConfirmed,
    missingPoints: Math.max(0, 70 - confirmedTotal),
    ageBand: input.age < 30 ? 'under30' : input.age < 35 ? '30to34' : input.age < 40 ? '35to39' : '40plus',
    reviewFlags,
    suggestions: suggestions(input, confirmedTotal),
    rulesVersion: HIGHLY_SKILLED_RULES_VERSION,
  }
}

export function createDiagnosisReport(
  input: HighlySkilledInput,
  result: HighlySkilledResult,
  locale: 'zh-CN' | 'ja-JP',
): DiagnosisReport {
  return {
    schemaVersion: '2.0',
    reportId: `HS-${Date.now().toString(36).toUpperCase()}`,
    reportType: 'highly-skilled-points',
    generatedAt: new Date().toISOString(),
    locale,
    rules: {
      version: result.rulesVersion,
      sourceUrl: HIGHLY_SKILLED_SOURCE_URL,
      universityListEffectiveDate: universityDatasetMetadata.effectiveDate,
      universitySourceDocument: universityDatasetMetadata.localSourceFile,
    },
    applicant: {
      name: input.name,
      maskedPhone: maskPhone(input.phone),
      birthDate: input.birthDate,
      age: input.age,
    },
    diagnosis: {
      diagnosisDate: input.diagnosisDate,
      calculatedAge: input.age,
      activity: input.activity,
      education: input.education,
      confirmedPoints: result.confirmedTotal,
      pendingPoints: result.pendingTotal,
      maximumEstimatedPoints: result.maximumTotal,
      reaches70Confirmed: result.meetsPointThreshold,
      reaches70Possible: result.maximumMeetsPointThreshold,
      reaches80Confirmed: result.confirmedMeets80,
      reaches80Possible: result.maximumMeets80,
      minimumIncomeSatisfied: result.meetsIncomeRequirement,
      status: result.meetsPointThreshold
        ? 'confirmed-threshold'
        : result.maximumMeetsPointThreshold
          ? 'possible-threshold'
          : 'below-threshold',
      university: { ...input.university },
      universityVerification: selectedUniversityForReport(input),
      inputSnapshot: JSON.parse(JSON.stringify(input)) as HighlySkilledInput,
    },
    result: JSON.parse(JSON.stringify(result)) as HighlySkilledResult,
    universityAssessment: createUniversityAssessment(input, locale),
    scoreChart: {
      confirmed: result.confirmedTotal,
      pending: result.pendingTotal,
      threshold70: 70,
      threshold80: 80,
    },
    categoryChart: buildCategoryChart(result.items),
    breakdown: buildReportBreakdown(result.items),
    recommendations: JSON.parse(JSON.stringify(result.suggestions)) as ImprovementSuggestion[],
    disclaimer: locale === 'zh-CN'
      ? '本报告仅为根据输入内容生成的自我检查，不构成许可保证或法律意见，最终由出入国在留管理厅审查。'
      : '本レポートは入力内容に基づくセルフチェックであり、許可保証や法的助言ではありません。最終判断は出入国在留管理庁が行います。',
  }
}

function selectedUniversityForReport(input: HighlySkilledInput): DiagnosisReport['diagnosis']['universityVerification'] {
  const selected = universities.find((item) => item.id === input.university.universityId)
  if (selected) {
    return {
      status: 'matched',
      officialName: selected.officialName,
      sourceDocument: selected.sourceDocument,
      sourcePage: selected.sourcePage,
    }
  }
  return { status: input.university.manualReview ? 'manual-review' : 'not-selected' }
}

function maskPhone(phone: string) {
  const compact = phone.replace(/\s/g, '')
  if (compact.length <= 4) return '****'
  return `${compact.slice(0, 3)}****${compact.slice(-3)}`
}

function createUniversityAssessment(
  input: HighlySkilledInput,
  locale: 'zh-CN' | 'ja-JP',
): NonNullable<DiagnosisReport['universityAssessment']> {
  const selected = universities.find((item) => item.id === input.university.universityId)
  return {
    selectedUniversityId: selected?.id,
    displayName: selected
      ? (locale === 'zh-CN' ? selected.displayNames?.zh : selected.displayNames?.ja) || selected.officialName
      : input.university.searchText || undefined,
    officialName: selected?.officialName,
    countryCode: selected?.countryCode ?? input.university.countryCode,
    japaneseHigherEducationDegreeSelected: input.japaneseUniversity,
    rankingBonusStatus: selected
      ? 'confirmed'
      : input.university.manualReview || input.university.searchText
        ? 'manual-review'
        : 'not-found',
    sourceDocument: selected?.sourceDocument,
    sourcePage: selected?.sourcePage,
  }
}

export function buildCategoryChart(items: ScoreItem[]) {
  const categoryFor = (key: string, fallback: string) => {
    if (key.startsWith('japaneseN')) return 'japanese'
    if (key === 'topUniversity' || key === 'japaneseUniversity') return 'university'
    if (key === 'research') return 'research'
    if (key === 'qualification') return 'qualification'
    return fallback
  }
  const rows = new Map<string, { category: string; confirmedPoints: number; pendingPoints: number }>()
  for (const item of items) {
    const category = categoryFor(item.key, item.category)
    const row = rows.get(category) ?? { category, confirmedPoints: 0, pendingPoints: 0 }
    if (item.status === 'confirmed') row.confirmedPoints += item.points
    if (item.status === 'pending') row.pendingPoints += item.points
    rows.set(category, row)
  }
  return Array.from(rows.values()).filter((row) => row.confirmedPoints || row.pendingPoints)
}

function buildReportBreakdown(items: ScoreItem[]): DiagnosisReport['breakdown'] {
  return items.map((item) => ({
    key: item.key,
    category: item.category,
    points: item.points,
    status: item.status,
  }))
}
