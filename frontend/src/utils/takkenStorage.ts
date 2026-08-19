import type { TakkenAttemptMap, TakkenUploadPayload } from '@/types/takken'

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

const EXAM_DATE_KEY = 'sunrise-diagnosis-takken-exam-date'

export function loadTakkenExamDate(): string | null {
  try {
    return localStorage.getItem(EXAM_DATE_KEY)
  } catch {
    return null
  }
}

export function saveTakkenExamDate(date: string | null) {
  try {
    if (date) localStorage.setItem(EXAM_DATE_KEY, date)
    else localStorage.removeItem(EXAM_DATE_KEY)
  } catch {
    // storage unavailable — countdown just won't persist across sessions
  }
}

const UPLOAD_KEY = 'sunrise-diagnosis-takken-upload'

export function loadTakkenUpload(): TakkenUploadPayload | null {
  try {
    const raw = localStorage.getItem(UPLOAD_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as TakkenUploadPayload).records)) return null
    return parsed as TakkenUploadPayload
  } catch {
    return null
  }
}

export function saveTakkenUpload(payload: TakkenUploadPayload) {
  try {
    localStorage.setItem(UPLOAD_KEY, JSON.stringify(payload))
  } catch {
    // storage unavailable — uploaded analysis just won't persist across sessions
  }
}

export function clearTakkenUpload() {
  try {
    localStorage.removeItem(UPLOAD_KEY)
  } catch {
    // ignore
  }
}
