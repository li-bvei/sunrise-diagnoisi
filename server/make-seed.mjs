#!/usr/bin/env node
/**
 * Builds server/seed/takken-seed.sql from the JSON backups (frontend/src/data/takken-*.json): a plain SQL
 * file that creates the two tables and loads every question and topic. Import it in 宝塔 (数据库 → 导入)
 * or with `mysql <db> < takken-seed.sql` — no token, no scripts, no API needed.
 *
 * Safe to re-run against a database that already has data: rows are matched by id and their content is
 * refreshed, while `times_reported` only ever goes UP (GREATEST), so re-importing an old seed can never
 * wipe out a "重点关注" count that accumulated in the database since.
 *
 * Usage:  node server/make-seed.mjs      (dependency-free; run `npm run takken:seed` from frontend/)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TABLES, createTableSql } from './schema.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../frontend/src/data')
const outFile = resolve(__dirname, 'seed/takken-seed.sql')

// Standard MySQL string-literal escaping. The seed is imported through a utf8mb4 connection (SET NAMES
// below), and the content is Japanese/Chinese text with plenty of quotes, backslashes and newlines.
function sqlString(value) {
  return `'${value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z')}'`
}

function insertStatements(kind, entries) {
  const { name, counted } = TABLES[kind]
  return entries.map((entry) => {
    const { timesReported, ...data } = entry
    const json = sqlString(JSON.stringify(data))
    if (!counted) {
      return `INSERT INTO \`${name}\` (id, data) VALUES (${sqlString(entry.id)}, ${json}) ON DUPLICATE KEY UPDATE data = VALUES(data);`
    }
    const count = Number.isInteger(timesReported) && timesReported >= 1 ? timesReported : 1
    return `INSERT INTO \`${name}\` (id, data, times_reported) VALUES (${sqlString(entry.id)}, ${json}, ${count}) ON DUPLICATE KEY UPDATE data = VALUES(data), times_reported = GREATEST(times_reported, VALUES(times_reported));`
  })
}

const questions = JSON.parse(readFileSync(resolve(dataDir, 'takken-questions.json'), 'utf8'))
const topics = JSON.parse(readFileSync(resolve(dataDir, 'takken-topics.json'), 'utf8'))

const lines = [
  '-- 宅建题库种子文件（自动生成，请勿手改；由 server/make-seed.mjs 从 frontend/src/data/takken-*.json 生成）',
  `-- 错题 ${questions.length} 题，考点 ${topics.length} 条。可重复导入：按 id 覆盖内容，错误次数只增不减。`,
  '-- 用法：宝塔「数据库」→ 对应数据库「导入」→ 上传本文件；或 mysql <库名> < takken-seed.sql',
  '',
  'SET NAMES utf8mb4;',
  '',
  `${createTableSql('questions')};`,
  '',
  `${createTableSql('topics')};`,
  '',
  `-- ---- 错题 (${questions.length}) ----`,
  ...insertStatements('questions', questions),
  '',
  `-- ---- 考点 (${topics.length}) ----`,
  ...insertStatements('topics', topics),
  '',
]

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, lines.join('\n'), 'utf8')
console.log(`Wrote ${outFile} (${questions.length} questions, ${topics.length} topics).`)
