import {
  CORPORATE_TAX_PARAMETERS,
  HEALTH_STANDARD_GRADES,
  INCOME_TAX_PARAMETERS,
  PENSION_STANDARD_GRADES,
  PREFECTURE_HEALTH_RATES,
  RESIDENT_TAX_PARAMETERS,
  SOCIAL_INSURANCE_RATES,
} from '@/data/financialParameters'
import type {
  CorporateTaxResult,
  ExecutiveScenarioResult,
  InsuranceBreakdown,
  PayrollInput,
  PayrollResult,
  StandardRemunerationGrade,
} from '@/types/financial'

const yen = (value: number) => Math.max(0, Math.round(Number.isFinite(value) ? value : 0))
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

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

/**
 * Rough personal resident tax for a given annual salary. Resident tax is levied the
 * following year on the prior year's income; this assumes a stable salary and skips
 * 調整控除 / 非課税限度額 / 自治体の超過課税, so it runs slightly high.
 */
export function estimateAnnualResidentTax(annualSalary: number, annualSocialInsurance: number): number {
  if (!Number.isFinite(annualSalary) || annualSalary <= 0) return 0
  const employmentIncome = salaryIncomeAmount(annualSalary)
  const taxable = Math.max(0, Math.floor((employmentIncome - annualSocialInsurance - RESIDENT_TAX_PARAMETERS.basicDeduction) / 1_000) * 1_000)
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
  const insurance = calculateInsurance(monthlySalary, input.prefecture, input.includeCare, true)
  const annualSalary = monthlySalary * 12
  const annualEmployeeInsurance = insurance.employee.total * 12
  const annualIncomeTax = estimateAnnualIncomeTax(annualSalary, annualEmployeeInsurance)
  const incomeTaxMonthly = yen(annualIncomeTax / 12)

  const residentTaxIsEstimated = input.residentTaxMonthlyOverride === null
  const residentTaxMonthly = residentTaxIsEstimated
    ? yen(estimateAnnualResidentTax(annualSalary, annualEmployeeInsurance) / 12)
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

/** Combined corporate tax burden for a small/medium company (資本金1億円以下), standard rates. */
export function estimateCorporateTax(taxableProfit: number): CorporateTaxResult {
  const profit = Number.isFinite(taxableProfit) ? Math.round(taxableProfit) : 0
  const p = CORPORATE_TAX_PARAMETERS
  if (profit <= 0) {
    return {
      taxableProfit: profit,
      nationalTax: 0,
      localCorporateTax: 0,
      inhabitantTax: p.inhabitantPerCapita,
      enterpriseTax: 0,
      total: p.inhabitantPerCapita,
      effectiveRate: 0,
      isDeficit: true,
    }
  }
  const nationalTax = p.nationalLowRate * Math.min(profit, p.nationalLowCap)
    + p.nationalHighRate * Math.max(0, profit - p.nationalLowCap)
  const localCorporateTax = nationalTax * p.localCorporateRate
  const inhabitantTax = nationalTax * p.inhabitantRate + p.inhabitantPerCapita
  let enterpriseBase = 0
  let lastUpper = 0
  for (const bracket of p.enterpriseBrackets) {
    const slice = clamp(profit - lastUpper, 0, bracket.upper - lastUpper)
    enterpriseBase += slice * bracket.rate
    lastUpper = bracket.upper
    if (profit <= bracket.upper) break
  }
  const enterpriseTax = enterpriseBase * (1 + p.specialEnterpriseSurcharge)
  const total = yen(nationalTax + localCorporateTax + inhabitantTax + enterpriseTax)
  return {
    taxableProfit: profit,
    nationalTax: yen(nationalTax),
    localCorporateTax: yen(localCorporateTax),
    inhabitantTax: yen(inhabitantTax),
    enterpriseTax: yen(enterpriseTax),
    total,
    effectiveRate: total / profit,
    isDeficit: false,
  }
}

export function calculateExecutiveScenario(
  monthlyCompensation: number,
  annualCompanyProfitBeforeCompensation: number,
  prefecture: string,
  includeCare: boolean,
  residentTaxAnnualOverride: number | null,
): ExecutiveScenarioResult {
  const compensation = Math.max(0, monthlyCompensation)
  const insurance = calculateInsurance(compensation, prefecture, includeCare, false)
  const annualCompensation = compensation * 12
  const employeeInsuranceAnnual = insurance.employee.total * 12
  const incomeTaxAnnual = estimateAnnualIncomeTax(annualCompensation, employeeInsuranceAnnual)
  const residentTaxAnnual = residentTaxAnnualOverride === null
    ? estimateAnnualResidentTax(annualCompensation, employeeInsuranceAnnual)
    : yen(residentTaxAnnualOverride)
  const employerInsuranceAnnual = insurance.employer.total * 12
  const companyCompensationCost = yen(annualCompensation + employerInsuranceAnnual)
  const profitBeforeTax = Math.round(annualCompanyProfitBeforeCompensation - companyCompensationCost)
  const corporateTax = estimateCorporateTax(profitBeforeTax)
  const retainedAfterTax = Math.round(profitBeforeTax - corporateTax.total)
  return {
    monthlyCompensation: yen(compensation),
    annualCompensation: yen(annualCompensation),
    employeeInsuranceAnnual: yen(employeeInsuranceAnnual),
    incomeTaxAnnual,
    residentTaxAnnual,
    personalTakeHomeAnnual: yen(annualCompensation - employeeInsuranceAnnual - incomeTaxAnnual - residentTaxAnnual),
    employerInsuranceAnnual: yen(employerInsuranceAnnual),
    companyCompensationCost,
    profitBeforeTax,
    corporateTax,
    retainedAfterTax,
    isDeficit: retainedAfterTax < 0,
  }
}

export function formatYen(value: number, locale: 'zh-CN' | 'ja-JP' = 'zh-CN'): string {
  const safe = Number.isFinite(value) ? value : 0
  const formatted = new Intl.NumberFormat(locale === 'ja-JP' ? 'ja-JP' : 'zh-CN', {
    style: 'currency', currency: 'JPY', maximumFractionDigits: 0,
  }).format(Math.abs(safe))
  return safe < 0 ? `-${formatted}` : formatted
}
