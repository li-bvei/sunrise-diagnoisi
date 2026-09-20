import {
  DEPENDENT_DEDUCTION_PARAMETERS,
  HEALTH_STANDARD_GRADES,
  INCOME_TAX_PARAMETERS,
  PENSION_STANDARD_GRADES,
  PREFECTURE_HEALTH_RATES,
  RESIDENT_TAX_PARAMETERS,
  SOCIAL_INSURANCE_RATES,
} from '@/data/financialParameters'
import type {
  ExecutiveCompensationResult,
  InsuranceBreakdown,
  PayrollInput,
  PayrollResult,
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

/** 一般の控除対象扶養親族（16歳以上）を一律の人数で概算した所得税側の扶養控除額。 */
export function dependentIncomeTaxDeduction(dependentCount: number): number {
  const count = Math.max(0, Math.round(Number.isFinite(dependentCount) ? dependentCount : 0))
  return count * DEPENDENT_DEDUCTION_PARAMETERS.incomeTaxPerDependent
}

/** Same idea for the (higher, in this case actually lower-valued) resident-tax side deduction. */
export function dependentResidentTaxDeduction(dependentCount: number): number {
  const count = Math.max(0, Math.round(Number.isFinite(dependentCount) ? dependentCount : 0))
  return count * DEPENDENT_DEDUCTION_PARAMETERS.residentTaxPerDependent
}

export function estimateAnnualIncomeTax(annualSalary: number, annualSocialInsurance: number, dependentCount = 0): number {
  if (!Number.isFinite(annualSalary) || annualSalary <= 0) return 0
  const employmentIncome = salaryIncomeAmount(annualSalary)
  const taxable = Math.max(0, Math.floor((employmentIncome - annualSocialInsurance - basicIncomeDeduction(employmentIncome) - dependentIncomeTaxDeduction(dependentCount)) / 1_000) * 1_000)
  const bracket = INCOME_TAX_PARAMETERS.brackets.find((item) => taxable <= item.upper)!
  const baseTax = Math.max(0, taxable * bracket.rate - bracket.deduction)
  return yen(Math.floor(baseTax * (1 + INCOME_TAX_PARAMETERS.reconstructionSurcharge) / 100) * 100)
}

/**
 * Rough personal resident tax for a given annual salary. Resident tax is levied the
 * following year on the prior year's income; this assumes a stable salary and skips
 * 調整控除 / 非課税限度額 / 自治体の超過課税, so it runs slightly high.
 */
export function estimateAnnualResidentTax(annualSalary: number, annualSocialInsurance: number, dependentCount = 0): number {
  if (!Number.isFinite(annualSalary) || annualSalary <= 0) return 0
  const employmentIncome = salaryIncomeAmount(annualSalary)
  const taxable = Math.max(0, Math.floor((employmentIncome - annualSocialInsurance - RESIDENT_TAX_PARAMETERS.basicDeduction - dependentResidentTaxDeduction(dependentCount)) / 1_000) * 1_000)
  return yen(taxable * RESIDENT_TAX_PARAMETERS.incomeRate + (taxable > 0 ? RESIDENT_TAX_PARAMETERS.perCapita : 0))
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
  const dependentCount = input.dependentCount ?? 0
  const insurance = calculateInsurance(monthlySalary, input.prefecture, input.includeCare, true)
  const annualSalary = monthlySalary * 12
  const annualEmployeeInsurance = insurance.employee.total * 12
  const annualIncomeTax = estimateAnnualIncomeTax(annualSalary, annualEmployeeInsurance, dependentCount)
  const incomeTaxMonthly = yen(annualIncomeTax / 12)

  const residentTaxIsEstimated = input.residentTaxMonthlyOverride === null
  const residentTaxMonthly = residentTaxIsEstimated
    ? yen(estimateAnnualResidentTax(annualSalary, annualEmployeeInsurance, dependentCount) / 12)
    : yen(input.residentTaxMonthlyOverride ?? 0)

  const takeHomeMonthly = yen(monthlySalary - insurance.employee.total - incomeTaxMonthly - residentTaxMonthly)
  const employerCostMonthly = yen(monthlySalary + insurance.employer.total)
  return {
    ...insurance,
    incomeTaxMonthly,
    residentTaxMonthly,
    residentTaxIsEstimated,
    takeHomeMonthly,
    takeHomeRatio: monthlySalary > 0 ? takeHomeMonthly / monthlySalary : 0,
    employerCostMonthly,
    employerCostAnnual: yen(employerCostMonthly * 12),
    annualTakeHome: yen(takeHomeMonthly * 12),
  }
}

/**
 * Executive (役員) compensation: same personal tax/insurance mechanics as regular payroll,
 * but executives are not covered by employment insurance (雇用保険). No company profit or
 * corporate tax involved — just the monthly salary, and its monthly/annual payment breakdown.
 */
export function calculateExecutiveCompensation(
  annualCompensation: number,
  prefecture: string,
  includeCare: boolean,
  residentTaxAnnualOverride: number | null,
  dependentCount = 0,
): ExecutiveCompensationResult {
  const annual = Math.max(0, annualCompensation)
  const monthlyCompensation = Math.round(annual / 12)
  const insurance = calculateInsurance(monthlyCompensation, prefecture, includeCare, false)
  // Split out 健康保険（+介護・子育て拠出金）from 厚生年金 so the UI never has to guess what's bundled.
  const healthInsuranceMonthly = insurance.employee.health + insurance.employee.care + insurance.employee.childSupport
  const pensionInsuranceMonthly = insurance.employee.pension
  const employeeInsuranceMonthly = insurance.employee.total
  const employeeInsuranceAnnual = employeeInsuranceMonthly * 12
  const incomeTaxAnnual = estimateAnnualIncomeTax(annual, employeeInsuranceAnnual, dependentCount)
  const incomeTaxMonthly = yen(incomeTaxAnnual / 12)
  const residentTaxIsEstimated = residentTaxAnnualOverride === null
  const residentTaxAnnual = residentTaxIsEstimated
    ? estimateAnnualResidentTax(annual, employeeInsuranceAnnual, dependentCount)
    : yen(residentTaxAnnualOverride)
  const residentTaxMonthly = yen(residentTaxAnnual / 12)
  const employerInsuranceMonthly = insurance.employer.total
  const employerInsuranceAnnual = employerInsuranceMonthly * 12
  const takeHomeMonthly = yen(monthlyCompensation - employeeInsuranceMonthly - incomeTaxMonthly - residentTaxMonthly)
  return {
    monthlyCompensation: yen(monthlyCompensation),
    annualCompensation: yen(annual),
    healthInsuranceMonthly: yen(healthInsuranceMonthly),
    healthInsuranceAnnual: yen(healthInsuranceMonthly * 12),
    pensionInsuranceMonthly: yen(pensionInsuranceMonthly),
    pensionInsuranceAnnual: yen(pensionInsuranceMonthly * 12),
    employeeInsuranceMonthly: yen(employeeInsuranceMonthly),
    employeeInsuranceAnnual: yen(employeeInsuranceAnnual),
    incomeTaxMonthly,
    incomeTaxAnnual,
    residentTaxMonthly,
    residentTaxAnnual,
    residentTaxIsEstimated,
    takeHomeMonthly,
    takeHomeAnnual: yen(annual - employeeInsuranceAnnual - incomeTaxAnnual - residentTaxAnnual),
    employerInsuranceMonthly: yen(employerInsuranceMonthly),
    employerInsuranceAnnual: yen(employerInsuranceAnnual),
    companyCostMonthly: yen(monthlyCompensation + employerInsuranceMonthly),
    companyCostAnnual: yen(annual + employerInsuranceAnnual),
  }
}

export function formatYen(value: number, locale: 'zh-CN' | 'ja-JP' = 'zh-CN'): string {
  const safe = Number.isFinite(value) ? value : 0
  const formatted = new Intl.NumberFormat(locale === 'ja-JP' ? 'ja-JP' : 'zh-CN', {
    style: 'currency', currency: 'JPY', maximumFractionDigits: 0,
  }).format(Math.abs(safe))
  return safe < 0 ? `-${formatted}` : formatted
}
