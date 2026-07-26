export type UniversityBonusSource =
  | 'world-ranking'
  | 'super-global-university'
  | 'innovative-asia'
  | 'other-official'

export interface BonusUniversity {
  id: string
  countryCode: string
  officialName: string
  names: {
    en: string[]
    zh: string[]
    ja: string[]
    aliases: string[]
  }
  displayNames?: {
    zh?: string
    ja?: string
    en?: string
  }
  sourceTypes: UniversityBonusSource[]
  sourceDocument: string
  sourcePage?: number
  effectiveDate?: string
  verifiedAt: string
  translationStatus?: 'verified' | 'common-name' | 'machine-translated'
  manualReviewRequired: boolean
}

export type UniversityRecord = BonusUniversity
