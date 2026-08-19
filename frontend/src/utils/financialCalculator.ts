import {
  HEALTH_STANDARD_GRADES,
  INCOME_TAX_PARAMETERS,
  PENSION_PARAMETERS,
  PENSION_STANDARD_GRADES,
  PREFECTURE_HEALTH_RATES,
  SOCIAL_INSURANCE_RATES,
} from '@/data/financialParameters'
import type {
  ExecutiveScenarioResult,
  InsuranceBreakdown,
  PayrollInput,
  PayrollResult,
  PensionEstimateInput,
  PensionEstimateResult,
  PensionTargetResult,
  StandardRemunerationGrade,
} from '@/types/financial'

const yen = (value: number) => Math.max(0, Math.round(Number.isFinite(value) ? value : 0))

export function findStandardGrade(amount: number, grades: StandardRemunerationGrade[]): StandardRemunerationGrade {
  const safeAmount = Math.max(0, Number.isFinite(amount) ? amount : 0)
  return grades.find((grade) =>
    (grade.lower === null || safeAmount >= grade.lower) &&
    (grade.upper === null || safeAmount < grade.upper),
  ) ?? grades[grades.length - 1]!
}

export function salaryIncomeAmount(annualSalary: number): number {
  const salary = Math.max(0, annualSalary)
  if (salary <= 740_999) return 0
  if (salary <= 2_190_999) return salary - 740_000
  if (salary <= 3_599_999) return Math.floor(salary / 4_000) * 1_000 * 2.8 - 80_000
  if (salary <= 6_599_999) return Math.floor(salary / 4_000) * 1_000 * 3.2 - 440_000
  if (salary <= 8_499_999) return salary * 0.9 - 1_100_000
  return salary - 1_950_000
}

export function salaryIncomeDeduction(annualSalary: number): number {
  return Math.max(0, annualSalary - salaryIncomeAmount(annualSalary))
}

export function basicIncomeDeduction(totalIncome: number): number {
  if (totalIncome <= 1_320_000) return 950_000
  if (totalIncome <= 3_360_000) return 880_000
  if (totalIncome <= 4_890_000) return 680_000
  if (totalIncome <= 6_550_000) return 630_000
  if (totalIncome <= 23_500_000) return 580_000
  if (totalIncome <= 24_000_000) return 480_000
  if (totalIncome <= 24_500_000) return 320_000
  if (totalIncome <= 25_000_000) return 160_000
  return 0
}

export function estimateAnnualIncomeTax(annualSalary: number, annualSocialInsurance: number): number {
  if (!Number.isFinite(annualSalary) || annualSalary <= 0) return 0
  const employmentIncome = salaryIncomeAmount(annualSalary)
  const taxable = Math.max(0, Math.floor((employmentIncome - annualSocialInsurance - basicIncomeDeduction(employmentIncome)) / 1_000) * 1_000)
  const bracket = INCOME_TAX_PARAMETERS.brackets.find((item) => taxable <= item.upper)!
  const baseTax = Math.max(0, taxable * bracket.rate - bracket.deduction)
  return yen(Math.floor(baseTax * (1 + INCOME_TAX_PARAMETERS.reconstructionSurcharge) / 100) * 100)
}

export function calculateInsurance(
  monthlySalary: number,
  prefecture = '東京都',
  includeCare = false,
  includeEmployment = true,
): { employee: InsuranceBreakdown; employer: InsuranceBreakdown; healthGrade: StandardRemunerationGrade; pensionGrade: StandardRemunerationGrade } {
  const salary = Math.max(0, monthlySalary)
  const healthGrade = findStandardGrade(salary, HEALTH_STANDARD_GRADES)
  const pensionGrade = findStandardGrade(salary, PENSION_STANDARD_GRADES)
  const healthRate = PREFECTURE_HEALTH_RATES[prefecture] ?? PREFECTURE_HEALTH_RATES['東京都']!
  const sharedHealth = healthGrade.monthly * healthRate * SOCIAL_INSURANCE_RATES.healthEmployeeShare
  const sharedCare = includeCare ? healthGrade.monthly * SOCIAL_INSURANCE_RATES.careTotal / 2 : 0
  const sharedChildSupport = healthGrade.monthly * SOCIAL_INSURANCE_RATES.childSupportTotal / 2
  const sharedPension = pensionGrade.monthly * SOCIAL_INSURANCE_RATES.pensionTotal / 2
  const employmentEmployee = includeEmployment ? salary * SOCIAL_INSURANCE_RATES.employmentEmployee : 0
  const employmentEmployer = includeEmployment ? salary * SOCIAL_INSURANCE_RATES.employmentEmployer : 0
  const employerChildContribution = pensionGrade.monthly * SOCIAL_INSURANCE_RATES.childContributionEmployer

  const employee: InsuranceBreakdown = {
    health: yen(sharedHealth), care: yen(sharedCare), childSupport: yen(sharedChildSupport), pension: yen(sharedPension),
    employment: yen(employmentEmployee), childContribution: 0, total: 0,
  }
  employee.total = employee.health + employee.care + employee.childSupport + employee.pension + employee.employment
  const employer: InsuranceBreakdown = {
    health: yen(sharedHealth), care: yen(sharedCare), childSupport: yen(sharedChildSupport), pension: yen(sharedPension),
    employment: yen(employmentEmployer), childContribution: yen(employerChildContribution), total: 0,
  }
  employer.total = employer.health + employer.care + employer.childSupport + employer.pension + employer.employment + employer.childContribution
  return { employee, employer, healthGrade, pensionGrade }
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  const monthlySalary = Math.max(0, input.monthlySalary)
  const insurance = calculateInsurance(monthlySalary, input.prefecture, input.includeCare, true)
  const annualSalary = monthlySalary * 12
  const annualIncomeTax = estimateAnnualIncomeTax(annualSalary, insurance.employee.total * 12)
  const incomeTaxMonthly = yen(annualIncomeTax / 12)
  const residentTaxMonthly = yen(input.residentTaxMonthly)
  return {
    ...insurance,
    incomeTaxMonthly,
    residentTaxMonthly,
    takeHomeMonthly: yen(monthlySalary - insurance.employee.total - incomeTaxMonthly - residentTaxMonthly),
    employerCostMonthly: yen(monthlySalary + insurance.employer.total),
    employerCostAnnual: yen((monthlySalary + insurance.employer.total) * 12),
  }
}

export function calculatePensionEstimate(input: PensionEstimateInput): PensionEstimateResult {
  const futureEmployeeMonths = Math.max(0, Math.round((input.workUntilAge - input.currentAge) * 12))
  const employeeMonths = Math.max(0, input.employeePensionMonths)
  const coveredBasicMonths = Math.min(PENSION_PARAMETERS.basicPensionFullMonths, Math.max(0, input.nationalPensionMonths + employeeMonths + futureEmployeeMonths))
  const basicAnnual = PENSION_PARAMETERS.basicPensionFullAnnual * coveredBasicMonths / PENSION_PARAMETERS.basicPensionFullMonths
  const employeeAnnualExisting = Math.max(0, input.existingAverageRemuneration) * PENSION_PARAMETERS.employeePensionCoefficient * employeeMonths
  const employeeAnnualFuture = Math.max(0, input.futureAverageRemuneration) * PENSION_PARAMETERS.employeePensionCoefficient * futureEmployeeMonths
  const totalAnnual = yen(basicAnnual + employeeAnnualExisting + employeeAnnualFuture)
  return {
    futureEmployeeMonths,
    coveredBasicMonths,
    basicAnnual: yen(basicAnnual),
    employeeAnnualExisting: yen(employeeAnnualExisting),
    employeeAnnualFuture: yen(employeeAnnualFuture),
    totalAnnual,
    totalMonthly: yen(totalAnnual / 12),
  }
}

export function calculatePensionTarget(input: PensionEstimateInput, targetMonthly: number): PensionTargetResult {
  const currentProjection = calculatePensionEstimate(input)
  const targetAnnual = Math.max(0, targetMonthly) * 12
  const fixedAnnual = currentProjection.basicAnnual + currentProjection.employeeAnnualExisting
  const months = currentProjection.futureEmployeeMonths
  const required = months > 0
    ? Math.max(0, (targetAnnual - fixedAnnual) / (PENSION_PARAMETERS.employeePensionCoefficient * months))
    : null
  const cappedRequired = required === null ? null : yen(required)
  const grade = cappedRequired === null ? null : findStandardGrade(cappedRequired, PENSION_STANDARD_GRADES)
  return {
    currentProjection,
    targetMonthly: yen(targetMonthly),
    monthlyGap: yen(Math.max(0, targetMonthly - currentProjection.totalMonthly)),
    requiredFutureAverageRemuneration: cappedRequired,
    requiredSalaryRange: grade ? { lower: grade.lower, upper: grade.upper } : null,
    exceedsCurrentCap: cappedRequired !== null && cappedRequired > PENSION_STANDARD_GRADES[PENSION_STANDARD_GRADES.length - 1]!.monthly,
  }
}

export function calculateExecutiveScenario(
  monthlyCompensation: number,
  annualCompanyProfitBeforeCompensation: number,
  prefecture: string,
  includeCare: boolean,
  residentTaxAnnual: number,
): ExecutiveScenarioResult {
  const compensation = Math.max(0, monthlyCompensation)
  const insurance = calculateInsurance(compensation, prefecture, includeCare, false)
  const annualCompensation = compensation * 12
  const employeeInsuranceAnnual = insurance.employee.total * 12
  const incomeTaxAnnual = estimateAnnualIncomeTax(annualCompensation, employeeInsuranceAnnual)
  const safeResidentTax = yen(residentTaxAnnual)
  const companyCompensationCost = yen(annualCompensation + insurance.employer.total * 12)
  return {
    monthlyCompensation: yen(compensation),
    annualCompensation: yen(annualCompensation),
    employeeInsuranceAnnual: yen(employeeInsuranceAnnual),
    incomeTaxAnnual,
    residentTaxAnnual: safeResidentTax,
    personalTakeHomeAnnual: yen(annualCompensation - employeeInsuranceAnnual - incomeTaxAnnual - safeResidentTax),
    employerInsuranceAnnual: yen(insurance.employer.total * 12),
    companyCompensationCost,
    remainingCompanyProfit: yen(Math.max(0, annualCompanyProfitBeforeCompensation - companyCompensationCost)),
  }
}

export function formatYen(value: number, locale: 'zh-CN' | 'ja-JP' = 'zh-CN'): string {
  return new Intl.NumberFormat(locale === 'ja-JP' ? 'ja-JP' : 'zh-CN', {
    style: 'currency', currency: 'JPY', maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)
}
