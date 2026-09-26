#!/usr/bin/env node
/**
 * Insert or update takken questions (错题库) through the takken API — the data lives in MySQL, not in
 * a JSON file, so several people/sessions can add questions at the same time without overwriting each
 * other, and this script never needs to read the existing bank.
 *
 * Usage:
 *   node scripts/upsert-takken-questions.mjs <new-questions.json>
 *   cat new-question.json | node scripts/upsert-takken-questions.mjs
 *   node scripts/upsert-takken-questions.mjs --dry-run <file>     # validate + preview counts, write nothing
 *   node scripts/upsert-takken-questions.mjs --import <file>      # seed/restore: replace content, never bump timesReported
 *
 * Input is one question object or an array. Legacy shape (options: string[], correct: number) and
 * modern shape (options: {id,text,explainZh}[], correctOptionId) are both accepted.
 *
 * By id: an existing id is REPLACED and its `timesReported` goes up by one (re-submitting a question
 * means "I got this wrong again"; ≥ 2 is highlighted as 重点关注 in the app). Include an explicit
 * `timesReported` in the input to override. A new id is added with timesReported 1.
 *
 * Config: TAKKEN_API_URL / TAKKEN_ADMIN_TOKEN (environment or frontend/.env.takken).
 */
import { validateBatch, validateQuestion } from '../../server/validate.mjs'
import { apiRequest, getConfig, readInput } from './takken-api-client.mjs'

async function main() {
  const { raw, dryRun, importMode } = readInput()

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    console.error(`Input is not valid JSON: ${error.message}`)
    process.exit(1)
  }
  const entries = Array.isArray(parsed) ? parsed : [parsed]
  try {
    validateBatch(entries, validateQuestion)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }

  const { apiUrl, token } = getConfig({ needToken: true })
  const query = new URLSearchParams()
  if (dryRun) query.set('dry_run', '1')
  if (importMode) query.set('mode', 'import')
  const suffix = query.size > 0 ? `?${query}` : ''

  const result = await apiRequest(`${apiUrl}/takken/questions${suffix}`, { method: 'POST', token, body: JSON.stringify(entries) })
  let summary = `${dryRun ? '[dry-run] ' : ''}${result.added} added, ${result.replaced} replaced — questions now ${result.total} entries.`
  const flagged = result.flagged.map((item) => `${item.id} (第 ${item.timesReported} 次)`)
  if (flagged.length > 0) summary += ` 重点关注: ${flagged.join(', ')}`
  console.log(summary)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
