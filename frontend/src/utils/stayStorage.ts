import type { TravelRecord } from '@/types/stayRecords'

const STORAGE_KEY = 'sunrise-diagnosis-stay-records-v1'

export function loadTravelRecords(): TravelRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string') : []
  } catch {
    return []
  }
}

export function saveTravelRecords(records: TravelRecord[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    return true
  } catch {
    return false
  }
}
