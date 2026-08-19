import type { TravelRecord, YearStaySummary } from '@/types/stayRecords'

const DAY = 86_400_000

export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date
}

export function validateTravelPeriod(exitDate: string, entryDate: string): boolean {
  const exit = parseIsoDate(exitDate)
  const entry = parseIsoDate(entryDate)
  return Boolean(exit && entry && entry.getTime() >= exit.getTime())
}

export function travelDays(exitDate: string, entryDate: string): number {
  if (!validateTravelPeriod(exitDate, entryDate)) return 0
  return Math.round((parseIsoDate(entryDate)!.getTime() - parseIsoDate(exitDate)!.getTime()) / DAY) + 1
}

export function inJapanDaysBetween(previousEntryDate: string, nextExitDate: string): number {
  if (!validateTravelPeriod(previousEntryDate, nextExitDate)) return 0
  return Math.max(0, travelDays(previousEntryDate, nextExitDate) - 2)
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY)
}

export function summarizeStayByYear(records: TravelRecord[]): YearStaySummary[] {
  const valid = records.filter((record) => validateTravelPeriod(record.exitDate, record.entryDate))
  if (!valid.length) return []
  const firstYear = Math.min(...valid.map((record) => parseIsoDate(record.exitDate)!.getUTCFullYear()))
  const lastYear = Math.max(...valid.map((record) => parseIsoDate(record.entryDate)!.getUTCFullYear()))
  const summaries: YearStaySummary[] = []

  for (let year = firstYear; year <= lastYear; year += 1) {
    const yearStart = new Date(Date.UTC(year, 0, 1))
    const yearEnd = new Date(Date.UTC(year, 11, 31))
    const intervals = valid
      .map((record) => {
        const start = parseIsoDate(record.exitDate)!
        const end = parseIsoDate(record.entryDate)!
        return { start: start < yearStart ? yearStart : start, end: end > yearEnd ? yearEnd : end }
      })
      .filter(({ start, end }) => start <= end)
      .sort((a, b) => a.start.getTime() - b.start.getTime())

    const merged: Array<{ start: Date; end: Date }> = []
    for (const interval of intervals) {
      const previous = merged[merged.length - 1]
      if (previous && interval.start <= addDays(previous.end, 1)) {
        if (interval.end > previous.end) previous.end = interval.end
      } else {
        merged.push({ ...interval })
      }
    }
    const awayLengths = merged.map((interval) => travelDays(iso(interval.start), iso(interval.end)))
    const abroadDays = awayLengths.reduce((sum, days) => sum + days, 0)
    const daysInYear = Math.round((yearEnd.getTime() - yearStart.getTime()) / DAY) + 1
    summaries.push({
      year,
      daysInYear,
      awayDays: abroadDays,
      inJapanDays: Math.max(0, daysInYear - abroadDays),
      tripCount: intervals.length,
      longestAwayDays: Math.max(0, ...awayLengths),
    })
  }
  return summaries.reverse()
}

export function summarizePeriod(records: TravelRecord[], startDate: string, endDate: string): { abroadDays: number; japanDays: number; totalDays: number } | null {
  if (!validateTravelPeriod(startDate, endDate)) return null
  const rangeStart = parseIsoDate(startDate)!
  const rangeEnd = parseIsoDate(endDate)!
  const clipped = records.flatMap((record) => {
    if (!validateTravelPeriod(record.exitDate, record.entryDate)) return []
    const start = parseIsoDate(record.exitDate)!
    const end = parseIsoDate(record.entryDate)!
    if (end < rangeStart || start > rangeEnd) return []
    return [{ ...record, exitDate: iso(start < rangeStart ? rangeStart : start), entryDate: iso(end > rangeEnd ? rangeEnd : end) }]
  })
  const abroadDays = summarizeStayByYear(clipped).reduce((sum, item) => sum + item.awayDays, 0)
  const totalDays = travelDays(startDate, endDate)
  return { abroadDays, japanDays: Math.max(0, totalDays - abroadDays), totalDays }
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

export function recordsToCsv(records: TravelRecord[]): string {
  const rows = [['id', 'exit_date', 'entry_date', 'days_abroad', 'exit_port', 'entry_port', 'note'], ...records.map((record) => [
    record.id, record.exitDate, record.entryDate, travelDays(record.exitDate, record.entryDate), record.exitPort, record.entryPort, record.note,
  ])]
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`
}
