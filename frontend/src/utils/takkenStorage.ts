import type { TakkenAttemptMap, TakkenAttemptRecord, TakkenAttemptsStorage, TakkenUploadPayload } from '@/types/takken'

const STORAGE_KEY = 'sunrise-diagnosis-takken-attempts'
const ATTEMPTS_VERSION = 2
const MAX_HISTORY = 20
const MASTERY_STREAK = 2

function emptyRecord(): TakkenAttemptRecord {
  return {
    attempts: 0,
    correct: 0,
    wrong: 0,
    lastResult: null,
    consecutiveCorrect: 0,
    lastAnsweredAt: null,
    mastered: false,
    nextReviewAt: null,
    history: [],
  }
}

/** Best-effort upgrade of one stored record — old or new shape — into the current TakkenAttemptRecord.
 * Old records only ever stored {attempts, correct}, so there is no way to recover the true answer
 * order. If every past attempt was correct (wrong === 0) we treat it as an existing streak and mark
 * it mastered; otherwise we conservatively treat it as "needs review" rather than guessing — this
 * never invents a false "mastered" status and never silently drops the user's practice history. */
export function migrateAttemptRecord(raw: unknown): TakkenAttemptRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>

  // Already current shape.
  if (typeof value.mastered === 'boolean' && typeof value.consecutiveCorrect === 'number' && Array.isArray(value.history)) {
    const attempts = typeof value.attempts === 'number' ? value.attempts : 0
    const correct = typeof value.correct === 'number' ? value.correct : 0
    return {
      attempts,
      correct,
      wrong: typeof value.wrong === 'number' ? value.wrong : Math.max(0, attempts - correct),
      lastResult: value.lastResult === 'correct' || value.lastResult === 'wrong' ? value.lastResult : null,
      consecutiveCorrect: value.consecutiveCorrect as number,
      lastAnsweredAt: typeof value.lastAnsweredAt === 'string' ? value.lastAnsweredAt : null,
      mastered: value.mastered as boolean,
      nextReviewAt: typeof value.nextReviewAt === 'string' ? value.nextReviewAt : null,
      history: (value.history as unknown[]).filter(
        (entry): entry is { result: 'correct' | 'wrong'; at: string } =>
          !!entry && typeof entry === 'object' && ((entry as { result?: unknown }).result === 'correct' || (entry as { result?: unknown }).result === 'wrong'),
      ).slice(-MAX_HISTORY),
    }
  }

  // Legacy shape: { attempts, correct } only.
  const attempts = typeof value.attempts === 'number' ? value.attempts : 0
  const correct = typeof value.correct === 'number' ? value.correct : 0
  if (attempts <= 0) return emptyRecord()
  const wrong = Math.max(0, attempts - correct)
  const cleanStreak = wrong === 0
  return {
    attempts,
    correct,
    wrong,
    lastResult: cleanStreak ? 'correct' : null,
    consecutiveCorrect: cleanStreak ? Math.min(attempts, MASTERY_STREAK) : 0,
    lastAnsweredAt: null,
    mastered: cleanStreak,
    nextReviewAt: null,
    history: [],
  }
}

export function loadTakkenAttempts(): TakkenAttemptMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}

    const source = 'records' in (parsed as Record<string, unknown>) && 'version' in (parsed as Record<string, unknown>)
      ? (parsed as TakkenAttemptsStorage).records
      : (parsed as Record<string, unknown>)

    if (!source || typeof source !== 'object') return {}
    const migrated: TakkenAttemptMap = {}
    for (const [id, value] of Object.entries(source)) {
      const record = migrateAttemptRecord(value)
      if (record) migrated[id] = record
    }
    return migrated
  } catch {
    return {}
  }
}

export function saveTakkenAttempts(attempts: TakkenAttemptMap) {
  try {
    const payload: TakkenAttemptsStorage = { version: ATTEMPTS_VERSION, records: attempts }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // storage unavailable (private browsing, quota exceeded, etc.) — practice continues, just without persistence
  }
}

/** How many days until the next review, given the answer that was just recorded. See spec:
 * wrong → 1 day; first correct → 3; two in a row → 7; three in a row → 14; four+ → 30. */
function reviewIntervalDays(correct: boolean, consecutiveCorrectAfter: number): number {
  if (!correct) return 1
  if (consecutiveCorrectAfter >= 4) return 30
  if (consecutiveCorrectAfter === 3) return 14
  if (consecutiveCorrectAfter === 2) return 7
  return 3
}

/** Pure function that folds one new answer into a question's attempt record. Used by the quiz page
 * and covered directly by tests, so the mastery/spaced-repetition rules stay in exactly one place. */
export function applyTakkenAnswer(previous: TakkenAttemptRecord | undefined, correct: boolean, now: Date = new Date()): TakkenAttemptRecord {
  const base = previous ?? emptyRecord()
  const consecutiveCorrect = correct ? base.consecutiveCorrect + 1 : 0
  const nowIso = now.toISOString()
  const history = [...base.history, { result: (correct ? 'correct' : 'wrong') as 'correct' | 'wrong', at: nowIso }].slice(-MAX_HISTORY)
  const next = new Date(now)
  next.setDate(next.getDate() + reviewIntervalDays(correct, consecutiveCorrect))
  return {
    attempts: base.attempts + 1,
    correct: base.correct + (correct ? 1 : 0),
    wrong: base.wrong + (correct ? 0 : 1),
    lastResult: correct ? 'correct' : 'wrong',
    consecutiveCorrect,
    lastAnsweredAt: nowIso,
    mastered: consecutiveCorrect >= MASTERY_STREAK,
    nextReviewAt: next.toISOString(),
    history,
  }
}

export function isUnpracticed(record: TakkenAttemptRecord | undefined): boolean {
  return !record || record.attempts === 0
}
export function isMastered(record: TakkenAttemptRecord | undefined): boolean {
  return !!record?.mastered
}
export function needsReview(record: TakkenAttemptRecord | undefined): boolean {
  return !!record && record.attempts > 0 && !record.mastered
}
export function isDueToday(record: TakkenAttemptRecord | undefined, now: Date = new Date()): boolean {
  if (!record?.nextReviewAt) return false
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)
  return new Date(record.nextReviewAt).getTime() <= endOfToday.getTime()
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

const FAVORITES_KEY = 'sunrise-diagnosis-takken-favorites'

export function loadTakkenFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((id): id is string => typeof id === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

export function saveTakkenFavorites(favorites: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]))
  } catch {
    // storage unavailable — favorites just won't persist across sessions
  }
}
