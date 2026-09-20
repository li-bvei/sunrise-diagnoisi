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
  /** Count of general dependents (一般の控除対象扶養親族, 16歳以上). Defaults to 0. */
  dependentCount?: number
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

export interface ExecutiveCompensationResult {
  monthlyCompensation: number
  annualCompensation: number
  healthInsuranceMonthly: number
  healthInsuranceAnnual: number
  pensionInsuranceMonthly: number
  pensionInsuranceAnnual: number
  employeeInsuranceMonthly: number
  employeeInsuranceAnnual: number
  incomeTaxMonthly: number
  incomeTaxAnnual: number
  residentTaxMonthly: number
  residentTaxAnnual: number
  residentTaxIsEstimated: boolean
  takeHomeMonthly: number
  takeHomeAnnual: number
  employerInsuranceMonthly: number
  employerInsuranceAnnual: number
  companyCostMonthly: number
  companyCostAnnual: number
}
