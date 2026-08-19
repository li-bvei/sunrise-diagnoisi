export interface TravelRecord {
  id: string
  exitDate: string
  entryDate: string
  exitPort: string
  entryPort: string
  note: string
}

export interface TravelRecordDraft extends Omit<TravelRecord, 'id'> {}

export interface YearStaySummary {
  year: number
  daysInYear: number
  awayDays: number
  inJapanDays: number
  tripCount: number
  longestAwayDays: number
}
