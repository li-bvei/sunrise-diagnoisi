export type HighlySkilledActivity = 'academic' | 'professional' | 'management'
export type EducationLevel = 'bachelor' | 'master' | 'doctorate' | 'professional_degree' | 'other'
export type JapaneseLevel = 'none' | 'n2' | 'n1'
export type ManagementPosition = 'none' | 'director' | 'representative'
export interface UniversitySelection {
  countryCode: string
  universityId: string | null
  searchText: string
}

export interface HighlySkilledInput {
  name: string
  phone: string
  birthDate: string
  diagnosisDate: string
  activity: HighlySkilledActivity
  age: number
  annualIncome: number
  education: EducationLevel
  experienceYears: number
  researchAchievements: 0 | 1 | 2
  japaneseLevel: JapaneseLevel
  qualificationCount: 0 | 1 | 2
  managementPosition: ManagementPosition
  university: UniversitySelection
  multipleDegrees: boolean
  japaneseUniversity: boolean
  innovationOrganization: boolean
  innovationSme: boolean
  growthField: boolean
  localGovernmentSupport: boolean
  foreignQualification: boolean
  baseActivityConfirmed: boolean
}

export type ScoreCategory =
  | 'education'
  | 'experience'
  | 'income'
  | 'age'
  | 'research'
  | 'qualification'
  | 'position'
  | 'bonus'

export interface ScoreItem {
  key: string
  category: ScoreCategory
  points: number
  status: 'included' | 'not-included' | 'not-applicable' | 'excluded'
  sourceUrl?: string
  evidenceKey?: string
  reasonKey?: string
}

export interface ImprovementSuggestion {
  key: string
  potentialPoints: number
  priority: 'high' | 'medium' | 'information'
}

export interface HighlySkilledResult {
  totalPoints: number
  items: ScoreItem[]
  reaches70: boolean
  reaches80: boolean
  pointsTo70: number
  pointsTo80: number
  meetsIncomeRequirement: boolean
  baseActivityConfirmed: boolean
  preliminaryEligible: boolean
  ageBand: 'under30' | '30to34' | '35to39' | '40plus'
  suggestions: ImprovementSuggestion[]
  rulesVersion: string
}

export interface DiagnosisReport {
  schemaVersion: '2.0'
  reportId: string
  reportType: 'highly-skilled-points'
  generatedAt: string
  locale: 'zh-CN' | 'ja-JP'
  rules: {
    version: string
    sourceUrl: string
    universityListEffectiveDate: string
    universitySourceDocument: string
  }
  applicant: {
    name: string
    maskedPhone: string
    birthDate: string
    age: number
  }
  diagnosis: {
    diagnosisDate: string
    calculatedAge: number
    activity: HighlySkilledActivity
    education: EducationLevel
    totalPoints: number
    reaches70: boolean
    reaches80: boolean
    pointsTo70: number
    pointsTo80: number
    minimumIncomeSatisfied: boolean
    status: 'reaches80' | 'reaches70' | 'below70'
    university: UniversitySelection
    universityVerification: {
      status: 'matched' | 'not-found' | 'not-selected'
      officialName?: string
      sourceDocument?: string
      sourcePage?: number
    }
    inputSnapshot: HighlySkilledInput
  }
  result: HighlySkilledResult
  universityAssessment?: {
    selectedUniversityId?: string
    displayName?: string
    officialName?: string
    countryCode?: string
    japaneseHigherEducationDegreeSelected: boolean
    rankingBonusStatus: 'included' | 'not-found'
    sourceDocument?: string
    sourcePage?: number
  }
  scoreChart: {
    totalPoints: number
    threshold70: 70
    threshold80: 80
  }
  categoryChart: Array<{
    category: string
    points: number
  }>
  breakdown: Array<{
    key: string
    category: string
    points: number
    status: ScoreItem['status']
  }>
  recommendations: ImprovementSuggestion[]
  disclaimer: string
}
