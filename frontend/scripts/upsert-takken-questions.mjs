#!/usr/bin/env node
/**
 * Insert or update takken questions in src/data/takken-questions.json WITHOUT ever printing the
 * existing 80+ questions back into the caller's context — the whole point of this script.
 *
 * The bank is a single JSON array. Reading it (even just to satisfy an editor's "read before
 * write" rule) pulls every existing question's Japanese/Chinese text through the caller — for an
 * LLM that means paying token cost proportional to the WHOLE file for every single addition. This
 * script does the read + merge + write entirely inside this one-off Node process; only a short
 * summary line comes back out.
 *
 * Usage:
 *   node scripts/upsert-takken-questions.mjs <new-questions.json>
 *   cat new-question.json | node scripts/upsert-takken-questions.mjs
 *
 * Input is either one question object or an array of question objects, in either the legacy
 * shape (options: string[], correct: number) or the modern shape (options: {id,text,explainZh}[],
 * correctOptionId: string) — same two shapes the app's normalizeTakkenQuestion() already accepts.
 *
 * By id: a question whose id already exists in the bank is REPLACED in place (fixing a typo);
 * a new id is appended at the end. Pass --dry-run to validate and report without writing.
 *
 * "重点关注" tracking: every question carries a `timesReported` count. A brand-new id starts at 1;
 * re-submitting an id that's already in the bank (you got the same real exam question wrong again,
 * in a different mock exam) auto-increments it. timesReported >= 2 is what the app highlights as
 * "反复出错" — pass an explicit `timesReported` in the input to override the auto-increment.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = resolve(__dirname, '../src/data/takken-questions.json')

function readInput() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const filePath = args.find((arg) => !arg.startsWith('--'))
  const raw = filePath ? readFileSync(resolve(process.cwd(), filePath), 'utf8') : readFileSync(0, 'utf8')
  return { raw, dryRun }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Minimal shape check — the app's own normalizeTakkenQuestion() does the full, authoritative
 * validation at build/run time; this is just a fast fail so a malformed entry never reaches the
 * data file at all. */
function validate(question, index) {
  const where = `entry #${index + 1}`
  if (!isRecord(question)) throw new Error(`${where}: not an object`)
  if (typeof question.id !== 'string' || !question.id.trim()) throw new Error(`${where}: missing "id"`)
  if ('timesReported' in question && (typeof question.timesReported !== 'number' || question.timesReported < 1)) {
    throw new Error(`${where} (${question.id}): "timesReported" must be a number >= 1 if provided`)
  }
  if (typeof question.tag !== 'string' || !question.tag.trim()) throw new Error(`${where} (${question.id}): missing "tag"`)
  if (typeof question.title !== 'string' || !question.title.trim()) throw new Error(`${where} (${question.id}): missing "title"`)
  if (typeof question.stem !== 'string' || !question.stem.trim()) throw new Error(`${where} (${question.id}): missing "stem"`)
  if (typeof question.explain !== 'string' || !question.explain.trim()) throw new Error(`${where} (${question.id}): missing "explain"`)
  if (typeof question.takeaway !== 'string' || !question.takeaway.trim()) throw new Error(`${where} (${question.id}): missing "takeaway"`)

  const options = question.options
  if (!Array.isArray(options) || options.length !== 4) throw new Error(`${where} (${question.id}): "options" must be an array of exactly 4 entries`)

  const isModern = isRecord(options[0])
  if (isModern) {
    if (!options.every((option) => isRecord(option) && typeof option.text === 'string' && option.text.trim())) {
      throw new Error(`${where} (${question.id}): every modern option needs a non-empty "text"`)
    }
    const ids = options.map((option) => option.id)
    if (typeof question.correctOptionId !== 'string' || !ids.includes(question.correctOptionId)) {
      throw new Error(`${where} (${question.id}): "correctOptionId" must match one of the options' ids`)
    }
  } else {
    if (!options.every((option) => typeof option === 'string' && option.trim())) {
      throw new Error(`${where} (${question.id}): every legacy option must be a non-empty string`)
    }
    if (typeof question.correct !== 'number' || question.correct < 0 || question.correct > 3) {
      throw new Error(`${where} (${question.id}): "correct" must be an index 0-3`)
    }
  }
}

function main() {
  const { raw, dryRun } = readInput()

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    console.error(`Input is not valid JSON: ${error.message}`)
    process.exitCode = 1
    return
  }
  const incoming = Array.isArray(parsed) ? parsed : [parsed]
  if (incoming.length === 0) {
    console.error('No questions provided.')
    process.exitCode = 1
    return
  }
  incoming.forEach(validate)

  const incomingIds = incoming.map((question) => question.id)
  const duplicateWithinInput = incomingIds.find((id, index) => incomingIds.indexOf(id) !== index)
  if (duplicateWithinInput) {
    console.error(`Input contains the same id twice: "${duplicateWithinInput}"`)
    process.exitCode = 1
    return
  }

  const bank = JSON.parse(readFileSync(DATA_PATH, 'utf8'))
  const beforeCount = bank.length
  const indexById = new Map(bank.map((question, index) => [question.id, index]))

  let added = 0
  let replaced = 0
  const flagged = []
  for (const question of incoming) {
    const existingIndex = indexById.get(question.id)
    if (existingIndex === undefined) {
      // A brand-new id defaults to timesReported: 1 unless the input explicitly says otherwise.
      bank.push({ ...question, timesReported: question.timesReported ?? 1 })
      indexById.set(question.id, bank.length - 1)
      added += 1
    } else {
      // Re-submitting an id that's already in the bank IS the signal that this exact question came
      // up again as a real mistake — auto-bump the counter unless the input explicitly overrides it
      // (e.g. to fix a wrong count by hand). This is what drives the "重点关注" highlighting in the
      // app: a question you keep reporting stands out instead of blending into the rest.
      const previous = bank[existingIndex]
      const timesReported = question.timesReported ?? (previous.timesReported ?? 1) + 1
      bank[existingIndex] = { ...question, timesReported }
      replaced += 1
      if (timesReported >= 2) flagged.push(`${question.id} (第 ${timesReported} 次)`)
    }
  }

  const verb = dryRun ? 'would go' : 'went'
  let summary = `${dryRun ? '[dry-run] ' : ''}${added} added, ${replaced} replaced — takken-questions.json ${verb} from ${beforeCount} to ${bank.length} entries.`
  if (flagged.length > 0) summary += ` 重点关注: ${flagged.join(', ')}`
  if (dryRun) {
    console.log(summary)
    return
  }

  writeFileSync(DATA_PATH, `${JSON.stringify(bank, null, 2)}\n`, 'utf8')
  console.log(summary)
}

main()
