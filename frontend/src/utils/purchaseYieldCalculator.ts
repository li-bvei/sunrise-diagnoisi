import type { BrokerageMode, PurchaseYieldInput, PurchaseYieldLine, PurchaseYieldResult } from '@/types/purchaseYield'

const valueOrZero = (value: number | null) => value ?? 0

export function estimateBrokerageFee(priceYen: number): number {
  if (priceYen <= 0) return 0
  // 800万円以下の低廉な空家等に係る特例上限（税込）。実際の適用には媒介契約時の合意が必要。
  if (priceYen <= 8_000_000) return 330_000
  const baseFee = priceYen <= 2_000_000
    ? priceYen * 0.05
    : priceYen <= 4_000_000
      ? priceYen * 0.04 + 20_000
      : priceYen * 0.03 + 60_000
  return Math.round(baseFee * 1.1)
}

export function brokerageFeeForMode(priceYen: number, mode: BrokerageMode): number {
  return mode === 'include' ? estimateBrokerageFee(priceYen) : 0
}

export function calculatePurchaseYield(input: PurchaseYieldInput, labels: {
  propertyPrice: string
  brokerageFee: string
  brokerageSeparate: string
  brokerageFree: string
  renovation: string
  otherInitial: string
  initialTotal: string
  annualRent: string
  repairReserve: string
  buildingManagement: string
  tenantPays: string
  rentalManagement: string
  propertyTax: string
  annualNet: string
  brokerageLimitNote: string
}): PurchaseYieldResult {
  const propertyPrice = Math.round(valueOrZero(input.priceManYen) * 10_000)
  const standardBrokerageFee = estimateBrokerageFee(propertyPrice)
  const brokerageMode = input.brokerageMode ?? 'free'
  const brokerageFee = brokerageFeeForMode(propertyPrice, brokerageMode)
  const renovationCost = valueOrZero(input.renovationCost)
  const otherInitialCosts = valueOrZero(input.otherInitialCosts)
  const initialInvestment = propertyPrice + brokerageFee + renovationCost + otherInitialCosts

  const annualRent = valueOrZero(input.monthlyRent) * 12
  const annualRepairReserve = valueOrZero(input.repairReserve) * 12
  const annualBuildingManagement = input.managementFeeTenantPays === true ? 0 : valueOrZero(input.property.managementFee) * 12
  const annualRentalManagement = valueOrZero(input.monthlyRentalManagement) * 12
  const annualPropertyTax = valueOrZero(input.annualPropertyTax)
  const annualNetIncome = annualRent - annualRepairReserve - annualBuildingManagement - annualRentalManagement - annualPropertyTax

  const initialLines: PurchaseYieldLine[] = [
    { label: labels.propertyPrice, amount: propertyPrice },
  ]
  if (brokerageMode === 'include') initialLines.push({ label: labels.brokerageFee, amount: brokerageFee, note: labels.brokerageLimitNote })
  if (brokerageMode === 'free') initialLines.push({ label: labels.brokerageFee, amount: 0, note: labels.brokerageFree })
  if (renovationCost > 0) initialLines.push({ label: labels.renovation, amount: renovationCost })
  if (otherInitialCosts > 0) initialLines.push({ label: labels.otherInitial, amount: otherInitialCosts })
  initialLines.push({ label: labels.initialTotal, amount: initialInvestment, kind: 'total' })
  if (brokerageMode === 'exclude' && propertyPrice > 0) {
    initialLines.push({ label: labels.brokerageFee, amount: standardBrokerageFee, note: labels.brokerageSeparate, kind: 'additional' })
  }

  const annualLines: PurchaseYieldLine[] = [
    { label: labels.annualRent, amount: annualRent },
    { label: labels.repairReserve, amount: -annualRepairReserve, kind: annualRepairReserve > 0 ? 'negative' : undefined },
  ]
  if (valueOrZero(input.property.managementFee) > 0) {
    annualLines.push(input.managementFeeTenantPays === true
      ? { label: labels.buildingManagement, amount: 0, note: labels.tenantPays }
      : { label: labels.buildingManagement, amount: -annualBuildingManagement, kind: 'negative' })
  }
  if (annualRentalManagement > 0) annualLines.push({ label: labels.rentalManagement, amount: -annualRentalManagement, kind: 'negative' })
  if (annualPropertyTax > 0) annualLines.push({ label: labels.propertyTax, amount: -annualPropertyTax, kind: 'negative' })
  annualLines.push({ label: labels.annualNet, amount: annualNetIncome, kind: 'total' })

  return {
    propertyPrice, brokerageFee, standardBrokerageFee, renovationCost, otherInitialCosts,
    initialInvestment, annualRent, annualRepairReserve, annualBuildingManagement,
    annualRentalManagement, annualPropertyTax, annualNetIncome,
    grossYieldOnPrice: propertyPrice > 0 ? annualRent / propertyPrice : 0,
    grossYieldOnInvestment: initialInvestment > 0 ? annualRent / initialInvestment : 0,
    netYield: initialInvestment > 0 ? annualNetIncome / initialInvestment : 0,
    paybackYears: annualNetIncome > 0 && initialInvestment > 0 ? initialInvestment / annualNetIncome : null,
    initialLines, annualLines, calculatedAt: new Date().toISOString(),
  }
}
