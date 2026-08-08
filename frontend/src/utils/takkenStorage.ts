import type { TakkenAttemptMap } from '@/types/takken'

const STORAGE_KEY = 'sunrise-diagnosis-takken-attempts'

export function loadTakkenAttempts(): TakkenAttemptMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as TakkenAttemptMap
  } catch {
    return {}
  }
}

export function saveTakkenAttempts(attempts: TakkenAttemptMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts))
  } catch {
    // storage unavailable (private browsing, quota exceeded, etc.) — practice continues, just without persistence
  }
}
