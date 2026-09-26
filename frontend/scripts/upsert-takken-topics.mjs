#!/usr/bin/env node
/**
 * Insert or update takken topics (考点速查) through the takken API — see upsert-takken-questions.mjs
 * for why the data lives in MySQL and why this never needs to read the existing topics.
 *
 * Usage:
 *   node scripts/upsert-takken-topics.mjs <new-topics.json>
 *   cat new-topic.json | node scripts/upsert-takken-topics.mjs
 *   node scripts/upsert-takken-topics.mjs --dry-run <file>
 *   node scripts/upsert-takken-topics.mjs --import <file>     # seed/restore from a JSON backup
 *
 * Input is one topic object or an array:
 *   { id, tag, title: {zh, ja?}, source, sections: [{ heading, blocks: [...] }], examSprint? }
 * Block types: text/mnemonic/trap ({content:{zh,ja?}}), list ({style,items:[{zh,ja?}]}),
 * table ({headers:[{zh,ja?}], rows:[[{zh,ja?}]]}). By id: existing ids are replaced, new ids added.
 *
 * TakkenTopicsView renders these with no runtime normalization, so both this script and the server
 * validate the structure strictly before anything is written.
 */
import { validateBatch, validateTopic } from '../../server/validate.mjs'
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
    validateBatch(entries, validateTopic)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }

  const { apiUrl, token } = getConfig({ needToken: true })
  const query = new URLSearchParams()
  if (dryRun) query.set('dry_run', '1')
  if (importMode) query.set('mode', 'import')
  const suffix = query.size > 0 ? `?${query}` : ''

  const result = await apiRequest(`${apiUrl}/takken/topics${suffix}`, { method: 'POST', token, body: JSON.stringify(entries) })
  console.log(`${dryRun ? '[dry-run] ' : ''}${result.added} added, ${result.replaced} replaced — topics now ${result.total} entries.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
