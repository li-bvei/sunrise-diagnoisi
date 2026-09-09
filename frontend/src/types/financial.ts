export interface StandardRemunerationGrade {
  grade: number
  monthly: number
  lower: number | null
  upper: number | null
}

export interface InsuranceBreakdown {
  health: number
  care: number
  childSupport: number
  pension: number
  employment: number
  childContribution: number
  total: number
}

export interface PayrollInput {
  monthlySalary: number
  age: number
  prefecture: string
  includeCare: boolean
  /** Optional manual override for monthly resident tax. When null the tool estimates it. */
  residentTaxMonthlyOverride: number | null
}

export interface PayrollResult {
  healthGrade: StandardRemunerationGrade
  pensionGrade: StandardRemunerationGrade
  employee: InsuranceBreakdown
  employer: InsuranceBreakdown
  incomeTaxMonthly: number
  residentTaxMonthly: number
  residentTaxIsEstimated: boolean
  takeHomeMonthly: number
  takeHomeRatio: number
  employerCostMonthly: number
  employerCostAnnual: number
  annualTakeHome: number
}

export interface CorporateTaxResult {
  taxableProfit: number
  nationalTax: number
  localCorporateTax: number
  inhabitantTax: number
  enterpriseTax: number
  total: number
  effectiveRate: number
  isDeficit: boolean
}

export interface ExecutiveScenarioResult {
  monthlyCompensation: number
  annualCompensation: number
  employeeInsuranceAnnual: number
  incomeTaxAnnual: number
  residentTaxAnnual: number
  personalTakeHomeAnnual: number
  employerInsuranceAnnual: number
  companyCompensationCost: number
  profitBeforeTax: number
  corporateTax: CorporateTaxResult
  retainedAfterTax: number
  isDeficit: boolean
}
