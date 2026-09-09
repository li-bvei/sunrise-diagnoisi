import rawQuestionsJson from '@/data/takken-questions.json'
import type { TakkenAttemptMap, TakkenQuestion, TakkenQuestionOption } from '@/types/takken'
import { classifyTakkenTag, type TakkenCategory } from '@/utils/takkenCategories'
import { isDueToday, isMastered, needsReview } from '@/utils/takkenStorage'

export interface TakkenQuestionIssue {
  id: string | null
  message: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** New-shape questions carry `options` as objects (`{id, text}`); legacy ones carry plain strings. */
function isModernOptionList(options: unknown): options is Array<Record<string, unknown>> {
  return Array.isArray(options) && options.length > 0 && isRecord(options[0]) && typeof options[0].id === 'string'
}

/**
 * Converts one raw question (either shape) into the normalized TakkenQuestion used everywhere
 * in the app. Stable option ids are derived from the *source array position*, never from the
 * shuffled display order, so a question's identity never depends on how it happens to render.
 */
export function normalizeTakkenQuestion(raw: unknown, issues: TakkenQuestionIssue[]): TakkenQuestion | null {
  if (!isRecord(raw)) {
    issues.push({ id: null, message: '题目不是有效对象，已跳过。' })
    return null
  }

  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  if (!id) {
    issues.push({ id: null, message: '存在缺少 id 的题目，已跳过。' })
    return null
  }

  const tag = typeof raw.tag === 'string' ? raw.tag : ''
  const title = typeof raw.title === 'string' ? raw.title : ''
  const stem = typeof raw.stem === 'string' ? raw.stem : ''
  const explain = typeof raw.explain === 'string' ? raw.explain : ''
  const takeaway = typeof raw.takeaway === 'string' ? raw.takeaway : ''
  const category = typeof raw.category === 'string' ? raw.category : undefined
  const topicId = typeof raw.topicId === 'string' ? raw.topicId : undefined
  const isNew = raw.isNew === true
  const timesReported = typeof raw.timesReported === 'number' && raw.timesReported >= 1 ? Math.floor(raw.timesReported) : 1

  if (!stem) issues.push({ id, message: '日语题干为空。' })
  if (!explain) issues.push({ id, message: '解析为空。' })

  let options: TakkenQuestionOption[]
  let correctOptionId: string

  if (isModernOptionList(raw.options)) {
    options = raw.options.map((option, index) => ({
      id: typeof option.id === 'string' && option.id ? option.id : `${id}-o${index + 1}`,
      text: typeof option.text === 'string' ? option.text : '',
      explainZh: typeof option.explainZh === 'string' ? option.explainZh : undefined,
    }))
    const rawCorrectId = typeof raw.correctOptionId === 'string' ? raw.correctOptionId : ''
    if (!options.some((option) => option.id === rawCorrectId)) {
      issues.push({ id, message: 'correctOptionId 未匹配任何选项，已跳过该题。' })
      return null
    }
    correctOptionId = rawCorrectId
  } else if (Array.isArray(raw.options)) {
    // legacy shape: options: string[], correct: number (0-based index into that array)
    const rawOptions = raw.options
    const correctIndex = typeof raw.correct === 'number' ? raw.correct : -1
    if (correctIndex < 0 || correctIndex >= rawOptions.length) {
      issues.push({ id, message: 'correct 下标越界，已跳过该题。' })
      return null
    }
    options = rawOptions.map((text, index) => ({
      id: `${id}-o${index + 1}`,
      text: typeof text === 'string' ? text : '',
    }))
    const correctOption = options[correctIndex]
    if (!correctOption) {
      issues.push({ id, message: 'correct 下标越界，已跳过该题。' })
      return null
    }
    correctOptionId = correctOption.id
  } else {
    issues.push({ id, message: 'options 字段缺失或格式无法识别，已跳过该题。' })
    return null
  }

  if (options.length !== 4) issues.push({ id, message: `选项数量应为 4 个，实际 ${options.length} 个。` })

  return { id, category, topicId, isNew, timesReported, tag, title, stem, options, correctOptionId, explain, takeaway }
}

export function normalizeTakkenQuestions(raw: unknown): { questions: TakkenQuestion[]; issues: TakkenQuestionIssue[] } {
  const issues: TakkenQuestionIssue[] = []
  const questions: TakkenQuestion[] = []
  if (!Array.isArray(raw)) {
    issues.push({ id: null, message: '题库文件不是数组，已忽略。' })
    return { questions, issues }
  }
  const seenIds = new Set<string>()
  for (const item of raw) {
    const normalized = normalizeTakkenQuestion(item, issues)
    if (!normalized) continue
    if (seenIds.has(normalized.id)) {
      issues.push({ id: normalized.id, message: '出现重复 id，已跳过后出现的重复项。' })
      continue
    }
    seenIds.add(normalized.id)
    questions.push(normalized)
  }
  return { questions, issues }
}

const normalizedBank = normalizeTakkenQuestions(rawQuestionsJson)

/** The single normalized question bank used by every takken view — always stable option ids. */
export const TAKKEN_QUESTIONS: TakkenQuestion[] = normalizedBank.questions
/** Any data-quality problems found while loading the bank (empty stem, bad id, etc.), for diagnostics. */
export const TAKKEN_QUESTION_ISSUES: TakkenQuestionIssue[] = normalizedBank.issues

export interface TakkenQuestionMeta {
  era: string
  number: number | null
}

const TITLE_PATTERN = /^(.*?)\s*問\s*(\d+)/

/** Splits a title like "令和3年10月 問11" into a sortable era label and question number, for the
 * question picker's 年份/题号 filters. Falls back gracefully when a title doesn't match the pattern. */
export function parseQuestionMeta(title: string): TakkenQuestionMeta {
  const match = title.match(TITLE_PATTERN)
  if (!match) return { era: title, number: null }
  const era = match[1]?.trim() ?? title
  const number = match[2] ? Number.parseInt(match[2], 10) : null
  return { era, number: Number.isFinite(number) ? number : null }
}

export type TakkenQuestionStatusFilter = 'all' | 'new' | 'unpracticed' | 'needsReview' | 'mastered' | 'favorite' | 'dueToday'

export interface TakkenQuestionFilter {
  keyword?: string
  category?: TakkenCategory | 'all'
  era?: string | 'all'
  status?: TakkenQuestionStatusFilter
}

export function takkenQuestionStatus(id: string, attempts: TakkenAttemptMap): 'unpracticed' | 'needsReview' | 'mastered' {
  const record = attempts[id]
  if (isMastered(record)) return 'mastered'
  if (needsReview(record)) return 'needsReview'
  return 'unpracticed'
}

/** Pure filter used by the question picker drawer — kept outside the component so it can be
 * unit-tested directly without mounting Vue. */
export function filterTakkenQuestions(
  questions: TakkenQuestion[],
  attempts: TakkenAttemptMap,
  favorites: Set<string>,
  filter: TakkenQuestionFilter,
): TakkenQuestion[] {
  const term = filter.keyword?.trim().toLowerCase() ?? ''
  return questions.filter((question) => {
    if (filter.category && filter.category !== 'all' && classifyTakkenTag(question.tag) !== filter.category) return false
    if (filter.era && filter.era !== 'all' && parseQuestionMeta(question.title).era !== filter.era) return false
    const status = filter.status ?? 'all'
    if (status === 'new' && !(question.isNew && !attempts[question.id])) return false
    if (status === 'favorite' && !favorites.has(question.id)) return false
    if (status === 'dueToday' && !isDueToday(attempts[question.id])) return false
    if (status === 'unpracticed' || status === 'needsReview' || status === 'mastered') {
      if (takkenQuestionStatus(question.id, attempts) !== status) return false
    }
    if (term) {
      const haystack = `${question.title} ${question.tag} ${question.stem}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })
}
