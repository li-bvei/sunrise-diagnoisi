#!/usr/bin/env node
/**
 * Insert or update takken topics (考点速查) in src/data/takken-topics.json WITHOUT ever printing
 * the existing 130+ entries back into the caller's context — same reasoning and pattern as
 * upsert-takken-questions.mjs (see that file's header for the full rationale).
 *
 * Unlike the question bank, TakkenTopicsView.vue imports this file with a raw `as TakkenTopic[]`
 * cast — there is NO runtime normalization/compat layer to gracefully degrade a malformed entry,
 * so validation here is stricter: every block's `type` and required fields are checked before
 * anything is written.
 *
 * Usage:
 *   node scripts/upsert-takken-topics.mjs <new-topics.json>
 *   cat new-topic.json | node scripts/upsert-takken-topics.mjs
 *   node scripts/upsert-takken-topics.mjs --dry-run <file>
 *
 * Input is one topic object or an array of topic objects:
 *   { id, tag, title: {zh, ja?}, source, sections: [{ heading, blocks: [...] }] }
 * Block types: text/mnemonic/trap ({content:{zh,ja?}}), list ({style,items:[{zh,ja?}]]}),
 * table ({headers:[{zh,ja?}], rows:[[{zh,ja?}]]}).
 *
 * By id: an existing id is REPLACED in place; a new id is appended at the end.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = resolve(__dirname, '../src/data/takken-topics.json')

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

function isBilingual(value, where) {
  if (!isRecord(value)) throw new Error(`${where}: expected {zh, ja?}`)
  if (typeof value.zh !== 'string' || !value.zh.trim()) throw new Error(`${where}: "zh" must be a non-empty string`)
  if ('ja' in value && typeof value.ja !== 'string') throw new Error(`${where}: "ja" must be a string if present`)
}

function validateBlock(block, where) {
  if (!isRecord(block)) throw new Error(`${where}: block is not an object`)
  const type = block.type
  if (type === 'text' || type === 'mnemonic' || type === 'trap') {
    isBilingual(block.content, `${where}.content`)
    return
  }
  if (type === 'list') {
    if (block.style !== 'ordered' && block.style !== 'unordered') throw new Error(`${where}.style must be "ordered" or "unordered"`)
    if (!Array.isArray(block.items) || block.items.length === 0) throw new Error(`${where}.items must be a non-empty array`)
    block.items.forEach((item, i) => isBilingual(item, `${where}.items[${i}]`))
    return
  }
  if (type === 'table') {
    if (!Array.isArray(block.headers) || block.headers.length === 0) throw new Error(`${where}.headers must be a non-empty array`)
    block.headers.forEach((header, i) => isBilingual(header, `${where}.headers[${i}]`))
    if (!Array.isArray(block.rows) || block.rows.length === 0) throw new Error(`${where}.rows must be a non-empty array`)
    block.rows.forEach((row, i) => {
      if (!Array.isArray(row) || row.length !== block.headers.length) {
        throw new Error(`${where}.rows[${i}] must have exactly ${block.headers.length} cells (matching headers)`)
      }
      row.forEach((cell, j) => isBilingual(cell, `${where}.rows[${i}][${j}]`))
    })
    return
  }
  throw new Error(`${where}: unknown block type "${type}" (expected text/list/table/mnemonic/trap)`)
}

function validate(topic, index) {
  const where = `entry #${index + 1}`
  if (!isRecord(topic)) throw new Error(`${where}: not an object`)
  if (typeof topic.id !== 'string' || !topic.id.trim()) throw new Error(`${where}: missing "id"`)
  if (typeof topic.tag !== 'string' || !topic.tag.trim()) throw new Error(`${where} (${topic.id}): missing "tag"`)
  isBilingual(topic.title, `${where} (${topic.id}).title`)
  if (typeof topic.source !== 'string' || !topic.source.trim()) throw new Error(`${where} (${topic.id}): missing "source"`)
  if (!Array.isArray(topic.sections) || topic.sections.length === 0) throw new Error(`${where} (${topic.id}): "sections" must be a non-empty array`)
  topic.sections.forEach((section, sIndex) => {
    const sectionWhere = `${where} (${topic.id}).sections[${sIndex}]`
    if (!isRecord(section) || typeof section.heading !== 'string' || !section.heading.trim()) {
      throw new Error(`${sectionWhere}: missing "heading"`)
    }
    if (!Array.isArray(section.blocks) || section.blocks.length === 0) throw new Error(`${sectionWhere}: "blocks" must be a non-empty array`)
    section.blocks.forEach((block, bIndex) => validateBlock(block, `${sectionWhere}.blocks[${bIndex}]`))
  })
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
    console.error('No topics provided.')
    process.exitCode = 1
    return
  }
  try {
    incoming.forEach(validate)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
    return
  }

  const incomingIds = incoming.map((topic) => topic.id)
  const duplicateWithinInput = incomingIds.find((id, index) => incomingIds.indexOf(id) !== index)
  if (duplicateWithinInput) {
    console.error(`Input contains the same id twice: "${duplicateWithinInput}"`)
    process.exitCode = 1
    return
  }

  const bank = JSON.parse(readFileSync(DATA_PATH, 'utf8'))
  const beforeCount = bank.length
  const indexById = new Map(bank.map((topic, index) => [topic.id, index]))

  let added = 0
  let replaced = 0
  for (const topic of incoming) {
    const existingIndex = indexById.get(topic.id)
    if (existingIndex === undefined) {
      bank.push(topic)
      indexById.set(topic.id, bank.length - 1)
      added += 1
    } else {
      bank[existingIndex] = topic
      replaced += 1
    }
  }

  const verb = dryRun ? 'would go' : 'went'
  const summary = `${dryRun ? '[dry-run] ' : ''}${added} added, ${replaced} replaced — takken-topics.json ${verb} from ${beforeCount} to ${bank.length} entries.`
  if (dryRun) {
    console.log(summary)
    return
  }

  writeFileSync(DATA_PATH, `${JSON.stringify(bank, null, 2)}\n`, 'utf8')
  console.log(summary)
}

main()
