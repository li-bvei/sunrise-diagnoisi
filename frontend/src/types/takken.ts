export interface TakkenQuestionOption {
  id: string
  text: string
  explainZh?: string
}

/** Normalized shape used everywhere in the app. Always has stable per-option ids,
 * regardless of whether the source JSON used the legacy `options: string[] / correct: number`
 * shape or the new `options: {id,text}[] / correctOptionId` shape. See utils/takkenQuestionModel.ts. */
export interface TakkenQuestion {
  id: string
  category?: string
  topicId?: string
  /** Marks questions added in a review batch; the picker hides this label after first practice. */
  isNew?: boolean
  /** How many times this exact question has been reported as a real-world mistake — bumped by
   * scripts/upsert-takken-questions.mjs whenever the same id is submitted again. A question you
   * genuinely keep getting wrong across different mock exams should stand out, not blend into the
   * rest of the bank as "just one more entry". Always >= 1 after normalization. */
  timesReported: number
  tag: string
  title: string
  stem: string
  options: TakkenQuestionOption[]
  correctOptionId: string
  explain: string
  takeaway: string
}

export type TakkenAnswerResult = 'correct' | 'wrong'

export interface TakkenAttemptHistoryEntry {
  result: TakkenAnswerResult
  at: string
}

export interface TakkenAttemptRecord {
  attempts: number
  correct: number
  wrong: number
  lastResult: TakkenAnswerResult | null
  consecutiveCorrect: number
  lastAnsweredAt: string | null
  /** true once consecutiveCorrect reaches the mastery threshold; reset to false on the next wrong answer. */
  mastered: boolean
  /** spaced-repetition due date, recomputed after every answer (see utils/takkenStorage.ts). */
  nextReviewAt: string | null
  /** most recent answers only (capped), so storage does not grow without bound. */
  history: TakkenAttemptHistoryEntry[]
}

export type TakkenAttemptMap = Record<string, TakkenAttemptRecord>

export interface TakkenAttemptsStorage {
  version: number
  records: TakkenAttemptMap
}

export type TakkenPracticeMode = 'all' | 'wrong' | 'random' | 'unpracticed' | 'favorites' | 'dueToday'

export interface TakkenBilingualText {
  zh: string
  ja?: string
}

export interface TakkenTopicTextBlock {
  type: 'text'
  content: TakkenBilingualText
}

export interface TakkenTopicListBlock {
  type: 'list'
  style: 'ordered' | 'unordered'
  items: TakkenBilingualText[]
}

export interface TakkenTopicTableBlock {
  type: 'table'
  headers: TakkenBilingualText[]
  rows: TakkenBilingualText[][]
}

export interface TakkenTopicMnemonicBlock {
  type: 'mnemonic'
  content: TakkenBilingualText
}

export interface TakkenTopicTrapBlock {
  type: 'trap'
  content: TakkenBilingualText
}

export type TakkenTopicBlock =
  | TakkenTopicTextBlock
  | TakkenTopicListBlock
  | TakkenTopicTableBlock
  | TakkenTopicMnemonicBlock
  | TakkenTopicTrapBlock

export interface TakkenTopicSection {
  heading: string
  blocks: TakkenTopicBlock[]
}

export interface TakkenTopic {
  id: string
  isNew?: boolean
  tag: string
  title: TakkenBilingualText
  source: string
  sections: TakkenTopicSection[]
}

export interface TakkenUploadRecord {
  date: string
  label: string
  url: string | null
  correct: boolean
  categoryRaw: string
  subItemRaw: string
}

export interface TakkenUploadPayload {
  fileName: string
  uploadedAt: string
  records: TakkenUploadRecord[]
}
