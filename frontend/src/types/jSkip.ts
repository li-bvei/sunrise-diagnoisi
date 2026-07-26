import type { EducationLevel, HighlySkilledActivity } from './highlySkilled'

export interface JSkipInput {
  activity: HighlySkilledActivity
  education: EducationLevel
  experienceYears: number
  annualIncome: number
  baseActivityConfirmed: boolean
}

export interface JSkipResult {
  eligible: boolean
  meetsIncome: boolean
  meetsEducationOrExperience: boolean
  route: 'degree' | 'experience' | 'management' | 'none'
  missingIncome: number
  missingExperience: number
}
