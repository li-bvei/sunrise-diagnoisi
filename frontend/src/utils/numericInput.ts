export const MAX_ANNUAL_INCOME_YEN = 1_000_000_000
export const MAX_ANNUAL_INCOME_MAN_YEN = MAX_ANNUAL_INCOME_YEN / 10_000
export const MAX_EXPERIENCE_YEARS = 70

export function parseIntegerInput(value: string, max: number): number | null {
  const normalized = value.normalize('NFKC').replace(/[,，\s]/g, '')
  if (!normalized) return null
  if (!/^\d+$/.test(normalized)) return null
  return Math.min(Number(normalized), max)
}

export function formatInteger(value: number | null): string {
  return value === null ? '' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export function parseIncomeManYenInput(value: string): number | null {
  const normalized = value.normalize('NFKC').replace(/[,，\s]/g, '')
  if (!normalized || !/^\d+(?:\.\d)?$/.test(normalized)) return null
  const manYen = Number(normalized)
  if (!Number.isFinite(manYen) || manYen > MAX_ANNUAL_INCOME_MAN_YEN) return null
  return Math.round(manYen * 10_000)
}

export function formatIncomeManYen(valueInYen: number | null): string {
  if (valueInYen === null) return ''
  const manYen = valueInYen / 10_000
  return Number.isInteger(manYen) ? String(manYen) : manYen.toFixed(1).replace(/\.0$/, '')
}
