export type HighlySkilledActivity = 'academic' | 'professional' | 'management'
export type EducationLevel = 'bachelor' | 'master' | 'doctorate' | 'professional_degree' | 'other'
export type JapaneseLevel = 'none' | 'n2' | 'n1'
export type ManagementPosition = 'none' | 'director' | 'representative'
export type ReviewFlag = 'education' | 'university' | 'activity' | 'evidence'

export interface UniversitySelection {
  countryCode: string
  universityId: string | null
  searchText: string
  manualReview: boolean
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
  status: 'confirmed' | 'pending' | 'excluded'
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
  /** Confirmed score retained for backwards-compatible consumers. */
  total: number
  confirmedTotal: number
  pendingTotal: number
  maximumTotal: number
  items: ScoreItem[]
  meetsPointThreshold: boolean
  maximumMeetsPointThreshold: boolean
  confirmedMeets80: boolean
  maximumMeets80: boolean
  meetsIncomeRequirement: boolean
  baseActivityConfirmed: boolean
  preliminaryEligible: boolean
  missingPoints: number
  ageBand: 'under30' | '30to34' | '35to39' | '40plus'
  reviewFlags: ReviewFlag[]
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
    confirmedPoints: number
    pendingPoints: number
    maximumEstimatedPoints: number
    reaches70Confirmed: boolean
    reaches70Possible: boolean
    reaches80Confirmed: boolean
    reaches80Possible: boolean
    minimumIncomeSatisfied: boolean
    status: 'confirmed-threshold' | 'possible-threshold' | 'below-threshold'
    university: UniversitySelection
    universityVerification: {
      status: 'matched' | 'manual-review' | 'not-selected'
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
    rankingBonusStatus: 'confirmed' | 'not-found' | 'manual-review'
    sourceDocument?: string
    sourcePage?: number
  }
  scoreChart: {
    confirmed: number
    pending: number
    threshold70: 70
    threshold80: 80
  }
  categoryChart: Array<{
    category: string
    confirmedPoints: number
    pendingPoints: number
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
