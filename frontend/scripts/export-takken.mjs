#!/usr/bin/env node
/**
 * Export the takken data from the API into the JSON backup files (src/data/takken-questions.json and
 * takken-topics.json). The database is the source of truth; these files are only a snapshot for git
 * history, offline reference, and the structural test — the app itself no longer imports them.
 *
 * Usage:  node scripts/export-takken.mjs        (needs only TAKKEN_API_URL; reads are public)
 */
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apiRequest, getConfig } from './takken-api-client.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../src/data')

async function main() {
  const { apiUrl } = getConfig({ needToken: false })

  const questions = await apiRequest(`${apiUrl}/takken/questions`)
  // timesReported 1 is the default — only write it when it carries information.
  const questionSnapshot = questions.map((question) => {
    const { timesReported, ...rest } = question
    return timesReported > 1 ? { ...rest, timesReported } : rest
  })
  writeFileSync(resolve(dataDir, 'takken-questions.json'), `${JSON.stringify(questionSnapshot, null, 2)}\n`, 'utf8')

  const topics = await apiRequest(`${apiUrl}/takken/topics`)
  writeFileSync(resolve(dataDir, 'takken-topics.json'), `${JSON.stringify(topics, null, 2)}\n`, 'utf8')

  console.log(`Exported ${questionSnapshot.length} questions and ${topics.length} topics to src/data/.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
