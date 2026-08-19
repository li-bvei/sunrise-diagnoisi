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
  residentTaxMonthly: number
}

export interface PayrollResult {
  healthGrade: StandardRemunerationGrade
  pensionGrade: StandardRemunerationGrade
  employee: InsuranceBreakdown
  employer: InsuranceBreakdown
  incomeTaxMonthly: number
  residentTaxMonthly: number
  takeHomeMonthly: number
  employerCostMonthly: number
  employerCostAnnual: number
}

export interface PensionEstimateInput {
  currentAge: number
  workUntilAge: number
  nationalPensionMonths: number
  employeePensionMonths: number
  existingAverageRemuneration: number
  futureAverageRemuneration: number
}

export interface PensionEstimateResult {
  futureEmployeeMonths: number
  coveredBasicMonths: number
  basicAnnual: number
  employeeAnnualExisting: number
  employeeAnnualFuture: number
  totalAnnual: number
  totalMonthly: number
}

export interface PensionTargetResult {
  currentProjection: PensionEstimateResult
  targetMonthly: number
  monthlyGap: number
  requiredFutureAverageRemuneration: number | null
  requiredSalaryRange: { lower: number | null; upper: number | null } | null
  exceedsCurrentCap: boolean
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
  remainingCompanyProfit: number
}
