import type { PropertyProfile } from '@/types/property'

export type RentalCostItemKey =
  | 'deposit'
  | 'keyMoney'
  | 'guaranteeDeposit'
  | 'agencyFee'
  | 'guaranteeCompanyFee'
  | 'fireInsurance'
  | 'keyReplacement'
  | 'currentMonthRent'
  | 'nextMonthRent'
  | 'currentMonthManagementFee'
  | 'nextMonthManagementFee'
  | 'cleaningFee'
  | 'contractAdminFee'

export const RENTAL_COST_ITEM_KEYS: RentalCostItemKey[] = [
  'deposit',
  'keyMoney',
  'guaranteeDeposit',
  'agencyFee',
  'guaranteeCompanyFee',
  'fireInsurance',
  'keyReplacement',
  'currentMonthRent',
  'nextMonthRent',
  'currentMonthManagementFee',
  'nextMonthManagementFee',
  'cleaningFee',
  'contractAdminFee',
]

export type RentalMaterialKey =
  | 'residenceCard'
  | 'residentCertificate'
  | 'incomeProof'
  | 'personalSeal'
  | 'sealCertificate'
  | 'idPhoto'
  | 'emergencyContact'
  | 'bankAccount'

export const RENTAL_MATERIAL_KEYS: RentalMaterialKey[] = [
  'residenceCard',
  'residentCertificate',
  'incomeProof',
  'personalSeal',
  'sealCertificate',
  'idPhoto',
  'emergencyContact',
  'bankAccount',
]

export interface RentalCostReportLineItem {
  key: RentalCostItemKey | string
  isCustom: boolean
  label?: string
  amount: number
}

export interface RentalCostReportMaterial {
  key: RentalMaterialKey | string
  isCustom: boolean
  label?: string
}

export interface RentalCostReport {
  reportId: string
  generatedAt: string
  locale: 'zh-CN' | 'ja-JP'
  monthlyRent: number | null
  moveInDate: string | null
  property: PropertyProfile
  items: RentalCostReportLineItem[]
  total: number
  materials: RentalCostReportMaterial[]
}

export interface RentalCostInput {
  monthlyRent: number | null
  moveInDate: string | null
  property: PropertyProfile
  costs: Record<RentalCostItemKey, number | null>
  customCosts: { id: string; label: string; amount: number | null }[]
  materials: RentalMaterialKey[]
  customMaterials: { id: string; label: string }[]
}

export interface RentalCostScenario {
  id: string
  input: RentalCostInput
  calculation: RentalCostReport
  ruleVersion: string
  savedAt: string
}
