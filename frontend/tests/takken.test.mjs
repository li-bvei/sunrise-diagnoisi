import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import test from 'node:test'
import { build } from 'esbuild'

const bundled = await build({
  stdin: {
    contents: `
      export * from './src/utils/takkenQuestionModel.ts'
      export * from './src/utils/takkenStorage.ts'
      export * from './src/utils/takkenCategories.ts'
    `,
    resolveDir: resolve('.'),
    sourcefile: 'takken-test-entry.ts',
  },
  alias: { '@': resolve('src') },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
})
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)

function legacyQuestion(overrides = {}) {
  return {
    id: 'legacy-1',
    tag: '权利关系・民法',
    title: '平成27年 問3',
    stem: 'テスト問題',
    options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
    correct: 1,
    explain: '選択肢2が正しい。',
    takeaway: '要点',
    ...overrides,
  }
}

function modernQuestion(overrides = {}) {
  return {
    id: 'modern-1',
    tag: '宅地建物取引业法等・重要事项说明',
    title: '令和3年10月 問11',
    stem: 'モダン問題',
    options: [
      { id: 'o1', text: 'A', explainZh: 'A解析' },
      { id: 'o2', text: 'B', explainZh: 'B解析' },
      { id: 'o3', text: 'C', explainZh: 'C解析' },
      { id: 'o4', text: 'D', explainZh: 'D解析' },
    ],
    correctOptionId: 'o3',
    explain: '总解析',
    takeaway: '要点',
    ...overrides,
  }
}

test('legacy options: string[] / correct: number normalizes into stable option ids', () => {
  const issues = []
  const question = runtime.normalizeTakkenQuestion(legacyQuestion(), issues)
  assert.ok(question)
  assert.equal(question.options.length, 4)
  assert.deepEqual(question.options.map((option) => option.id), ['legacy-1-o1', 'legacy-1-o2', 'legacy-1-o3', 'legacy-1-o4'])
  assert.equal(question.correctOptionId, 'legacy-1-o2')
  assert.equal(question.options[1].text, '選択肢2')
})

test('modern options already carry stable ids and are passed through unchanged', () => {
  const issues = []
  const question = runtime.normalizeTakkenQuestion(modernQuestion(), issues)
  assert.ok(question)
  assert.equal(issues.length, 0)
  assert.deepEqual(question.options.map((option) => option.id), ['o1', 'o2', 'o3', 'o4'])
  assert.equal(question.correctOptionId, 'o3')
  assert.equal(question.options[2].explainZh, 'C解析')
})

test('shuffling display order never changes correctOptionId or per-option explain', () => {
  const issues = []
  const question = runtime.normalizeTakkenQuestion(modernQuestion(), issues)
  const shuffledIds = ['o4', 'o1', 'o3', 'o2']
  const byId = new Map(question.options.map((option) => [option.id, option]))
  const displayed = shuffledIds.map((id) => byId.get(id))
  assert.equal(question.correctOptionId, 'o3')
  const correctDisplayed = displayed.find((option) => option.id === question.correctOptionId)
  assert.equal(correctDisplayed.explainZh, 'C解析')
  assert.equal(displayed[2].id, 'o3')
})

test('empty bank and malformed questions do not throw and produce diagnostic issues', () => {
  assert.deepEqual(runtime.normalizeTakkenQuestions([]), { questions: [], issues: [] })
  assert.deepEqual(runtime.normalizeTakkenQuestions(null).questions, [])
  assert.equal(runtime.normalizeTakkenQuestions(null).issues.length, 1)

  const { questions, issues } = runtime.normalizeTakkenQuestions([
    { id: '', tag: 'x', title: 'x', stem: 'x', options: ['a', 'b'], correct: 0, explain: 'x', takeaway: 'x' },
    { tag: 'missing id' },
    legacyQuestion({ id: 'dup' }),
    legacyQuestion({ id: 'dup' }),
    { id: 'bad-correct', tag: 'x', title: 'x', stem: 'x', options: ['a', 'b', 'c', 'd'], correct: 9, explain: 'x', takeaway: 'x' },
    modernQuestion({ id: 'bad-correct-option-id', correctOptionId: 'does-not-exist' }),
  ])
  assert.equal(questions.length, 1)
  assert.equal(questions[0].id, 'dup')
  assert.ok(issues.length >= 4)
})

test('the real question bank loads with stable ids and no fatal issues', () => {
  assert.ok(runtime.TAKKEN_QUESTIONS.length > 0)
  assert.ok(runtime.TAKKEN_QUESTIONS.every((question) => question.options.length === 4))
  assert.ok(runtime.TAKKEN_QUESTIONS.every((question) => question.options.some((option) => option.id === question.correctOptionId)))
  assert.equal(new Set(runtime.TAKKEN_QUESTIONS.map((question) => question.id)).size, runtime.TAKKEN_QUESTIONS.length)
})

test('a wrong answer puts a question into the needs-review queue', () => {
  const record = runtime.applyTakkenAnswer(undefined, false, new Date('2026-08-28T00:00:00+09:00'))
  assert.equal(record.attempts, 1)
  assert.equal(record.mastered, false)
  assert.equal(record.consecutiveCorrect, 0)
  assert.equal(runtime.needsReview(record), true)
  assert.equal(runtime.isMastered(record), false)
})

test('two consecutive correct answers move a question from weak to mastered', () => {
  let record = runtime.applyTakkenAnswer(undefined, false, new Date('2026-08-01T00:00:00+09:00'))
  record = runtime.applyTakkenAnswer(record, true, new Date('2026-08-02T00:00:00+09:00'))
  assert.equal(runtime.isMastered(record), false)
  record = runtime.applyTakkenAnswer(record, true, new Date('2026-08-03T00:00:00+09:00'))
  assert.equal(record.consecutiveCorrect, 2)
  assert.equal(runtime.isMastered(record), true)
  assert.equal(runtime.needsReview(record), false)
})

test('a wrong answer after mastery resets it back into the weak/needs-review state', () => {
  let record = runtime.applyTakkenAnswer(undefined, true, new Date('2026-08-01T00:00:00+09:00'))
  record = runtime.applyTakkenAnswer(record, true, new Date('2026-08-02T00:00:00+09:00'))
  assert.equal(runtime.isMastered(record), true)
  record = runtime.applyTakkenAnswer(record, false, new Date('2026-08-03T00:00:00+09:00'))
  assert.equal(runtime.isMastered(record), false)
  assert.equal(record.consecutiveCorrect, 0)
  assert.equal(runtime.needsReview(record), true)
})

test('spaced-repetition interval grows with the correct streak and resets to 1 day on a miss', () => {
  const start = new Date('2026-08-01T00:00:00+09:00')
  let record = runtime.applyTakkenAnswer(undefined, false, start)
  assert.equal(new Date(record.nextReviewAt).getTime() - start.getTime(), 24 * 60 * 60 * 1000)

  record = runtime.applyTakkenAnswer(record, true, start)
  assert.equal(new Date(record.nextReviewAt).getTime() - start.getTime(), 3 * 24 * 60 * 60 * 1000)

  record = runtime.applyTakkenAnswer(record, true, start)
  assert.equal(new Date(record.nextReviewAt).getTime() - start.getTime(), 7 * 24 * 60 * 60 * 1000)

  record = runtime.applyTakkenAnswer(record, true, start)
  assert.equal(new Date(record.nextReviewAt).getTime() - start.getTime(), 14 * 24 * 60 * 60 * 1000)

  record = runtime.applyTakkenAnswer(record, true, start)
  assert.equal(new Date(record.nextReviewAt).getTime() - start.getTime(), 30 * 24 * 60 * 60 * 1000)

  record = runtime.applyTakkenAnswer(record, false, start)
  assert.equal(new Date(record.nextReviewAt).getTime() - start.getTime(), 24 * 60 * 60 * 1000)
})

test('legacy localStorage records migrate without inventing a false mastered status', () => {
  const cleanStreak = runtime.migrateAttemptRecord({ attempts: 3, correct: 3 })
  assert.equal(cleanStreak.mastered, true)
  assert.equal(cleanStreak.wrong, 0)

  const mixedHistory = runtime.migrateAttemptRecord({ attempts: 3, correct: 1 })
  assert.equal(mixedHistory.mastered, false)
  assert.equal(mixedHistory.wrong, 2)
  assert.equal(mixedHistory.consecutiveCorrect, 0)

  const neverPracticed = runtime.migrateAttemptRecord({ attempts: 0, correct: 0 })
  assert.equal(neverPracticed.mastered, false)
  assert.equal(neverPracticed.attempts, 0)

  assert.equal(runtime.migrateAttemptRecord(null), null)
  assert.equal(runtime.migrateAttemptRecord(undefined), null)

  const alreadyCurrent = runtime.migrateAttemptRecord({
    attempts: 5, correct: 4, wrong: 1, lastResult: 'correct', consecutiveCorrect: 2,
    lastAnsweredAt: '2026-08-01T00:00:00+09:00', mastered: true, nextReviewAt: '2026-08-08T00:00:00+09:00',
    history: [{ result: 'correct', at: '2026-08-01T00:00:00+09:00' }],
  })
  assert.equal(alreadyCurrent.mastered, true)
  assert.equal(alreadyCurrent.history.length, 1)
})

test('question history is capped at the last 20 entries while cumulative counts keep growing', () => {
  let record
  for (let i = 0; i < 25; i += 1) {
    record = runtime.applyTakkenAnswer(record, true, new Date(2026, 0, i + 1))
  }
  assert.equal(record.attempts, 25)
  assert.equal(record.history.length, 20)
})

test('the question picker filter supports category, era, status, favorites, and keyword search', () => {
  const q1 = runtime.normalizeTakkenQuestion(legacyQuestion({ id: 'q1' }), [])
  const q2 = runtime.normalizeTakkenQuestion(modernQuestion({ id: 'q2' }), [])
  const questions = [q1, q2]
  const attempts = {
    q1: runtime.applyTakkenAnswer(undefined, false, new Date('2026-08-01T00:00:00+09:00')),
  }
  const favorites = new Set(['q2'])

  assert.deepEqual(
    runtime.filterTakkenQuestions(questions, attempts, favorites, { category: '权利关系' }).map((q) => q.id),
    ['q1'],
  )
  assert.deepEqual(
    runtime.filterTakkenQuestions(questions, attempts, favorites, { era: '令和3年10月' }).map((q) => q.id),
    ['q2'],
  )
  assert.deepEqual(
    runtime.filterTakkenQuestions(questions, attempts, favorites, { status: 'favorite' }).map((q) => q.id),
    ['q2'],
  )
  assert.deepEqual(
    runtime.filterTakkenQuestions(questions, attempts, favorites, { status: 'needsReview' }).map((q) => q.id),
    ['q1'],
  )
  assert.deepEqual(
    runtime.filterTakkenQuestions(questions, attempts, favorites, { status: 'unpracticed' }).map((q) => q.id),
    ['q2'],
  )
  assert.deepEqual(
    runtime.filterTakkenQuestions(questions, attempts, favorites, { keyword: 'モダン' }).map((q) => q.id),
    ['q2'],
  )
  assert.equal(runtime.filterTakkenQuestions(questions, attempts, favorites, {}).length, 2)
})

test('parseQuestionMeta splits era and question number for the picker filters', () => {
  assert.deepEqual(runtime.parseQuestionMeta('令和3年10月 問11'), { era: '令和3年10月', number: 11 })
  assert.deepEqual(runtime.parseQuestionMeta('平成27年 問3'), { era: '平成27年', number: 3 })
  assert.deepEqual(runtime.parseQuestionMeta('no match here'), { era: 'no match here', number: null })
})

test('timesReported defaults to 1 and survives normalization for both legacy and modern shapes', () => {
  const legacy = runtime.normalizeTakkenQuestion(legacyQuestion(), [])
  assert.equal(legacy.timesReported, 1)

  const reported = runtime.normalizeTakkenQuestion(legacyQuestion({ timesReported: 3 }), [])
  assert.equal(reported.timesReported, 3)

  const modern = runtime.normalizeTakkenQuestion(modernQuestion(), [])
  assert.equal(modern.timesReported, 1)

  // Malformed values (non-number, zero, negative) fall back to the safe default rather than
  // propagating garbage into the "反复出错" highlighting.
  const invalid = runtime.normalizeTakkenQuestion(legacyQuestion({ timesReported: 0 }), [])
  assert.equal(invalid.timesReported, 1)
  const negative = runtime.normalizeTakkenQuestion(legacyQuestion({ timesReported: -5 }), [])
  assert.equal(negative.timesReported, 1)
})
