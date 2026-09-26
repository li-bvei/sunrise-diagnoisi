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
  /**
   * 通勤手当 per month (public-transit commuting). Income-tax free up to the monthly limit, but it
   * still counts as 報酬 for 社会保険 and as 賃金 for 雇用保険.
   */
  commutingAllowance?: number
  /** Taxable allowances (残業・役職・住宅・家族手当 …): taxed, and counted for 社会保険・雇用保険. */
  taxableAllowance?: number
  /** Non-taxable allowances paid as reimbursement of actual cost (出張旅費・日当 …): neither taxed nor counted. */
  otherNonTaxableAllowance?: number
}

export interface PayrollResult {
  /** 総支給: everything paid in the month, allowances included. */
  grossMonthly: number
  /** The part of the commuting allowance inside / above the non-taxable limit. */
  commutingNonTaxable: number
  commutingTaxable: number
  /** 給与所得として課税される月額（基本給 + 課税手当 + 通勤手当の限度超過分）。 */
  taxableMonthly: number
  /** 社会保険・雇用保険の算定基礎（基本給 + 課税手当 + 通勤手当全額）。標準報酬月額の等級はこれで決まる。 */
  insuranceBase: number
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
