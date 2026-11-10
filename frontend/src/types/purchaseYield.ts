import type { PropertyProfile } from '@/types/property'

export type BrokerageMode = 'free' | 'include' | 'exclude'

export interface PurchaseYieldInput {
  property: PropertyProfile
  priceManYen: number | null
  monthlyRent: number | null
  repairReserve: number | null
  managementFeeTenantPays: boolean | null
  brokerageMode: BrokerageMode | null
  renovationCost: number | null
  annualPropertyTax: number | null
  monthlyRentalManagement: number | null
  otherInitialCosts: number | null
}

export interface PurchaseYieldLine {
  label: string
  amount: number
  note?: string
  kind?: 'total' | 'additional' | 'negative'
}

export interface PurchaseYieldResult {
  propertyPrice: number
  brokerageFee: number
  standardBrokerageFee: number
  renovationCost: number
  otherInitialCosts: number
  initialInvestment: number
  annualRent: number
  annualRepairReserve: number
  annualBuildingManagement: number
  annualRentalManagement: number
  annualPropertyTax: number
  annualNetIncome: number
  grossYieldOnPrice: number
  grossYieldOnInvestment: number
  netYield: number
  paybackYears: number | null
  initialLines: PurchaseYieldLine[]
  annualLines: PurchaseYieldLine[]
  calculatedAt: string
}

export interface PurchaseYieldScenario {
  id: string
  input: PurchaseYieldInput
  calculation: PurchaseYieldResult
  ruleVersion: string
  netYield: number | null
  savedAt: string
}
