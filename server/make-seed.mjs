#!/usr/bin/env node
/**
 * Builds server/seed/takken-seed.sql from the JSON backups (frontend/src/data/takken-*.json): a plain SQL
 * file that creates the two tables and loads every question and topic. Import it in 宝塔 (数据库 → 导入)
 * or with `mysql <db> < takken-seed.sql` — no token, no scripts, no API needed.
 *
 * Non-destructive by design: the database is the source of truth, and this file is only a snapshot of it.
 * Rows whose id already exists are left completely untouched (`ON DUPLICATE KEY UPDATE id = id` is a
 * no-op), so importing the seed — even an old one, even repeatedly — can never overwrite content that was
 * edited in the database or reset a "重点关注" count. It only fills in ids that are missing. To deliberately
 * overwrite existing rows from a JSON file, use `upsert-takken-*.mjs --import` instead.
 *
 * `--overwrite` writes a second file, seed/takken-seed-overwrite.sql, for the one case where the JSON is
 * known to be newer than the database (e.g. every question's explanation was rewritten offline): questions
 * whose id exists have their content REPLACED (their "重点关注" count is kept, never lowered) and missing
 * ones are added; topics stay non-destructive. Anything in the database that the JSON doesn't contain is
 * left alone. Only import it deliberately.
 *
 * Usage:  node server/make-seed.mjs [--overwrite]   (dependency-free; run `npm run takken:seed` from frontend/)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TABLES, createTableSql } from './schema.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../frontend/src/data')
const overwrite = process.argv.includes('--overwrite')
const outFile = resolve(__dirname, overwrite ? 'seed/takken-seed-overwrite.sql' : 'seed/takken-seed.sql')

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
  // Topics have no counter to protect and are only ever filled in, never overwritten, even in --overwrite mode.
  const { name, counted } = TABLES[kind]
  return entries.map((entry) => {
    const { timesReported, ...data } = entry
    const json = sqlString(JSON.stringify(data))
    if (!counted) {
      return `INSERT INTO \`${name}\` (id, data) VALUES (${sqlString(entry.id)}, ${json}) ON DUPLICATE KEY UPDATE id = id;`
    }
    const count = Number.isInteger(timesReported) && timesReported >= 1 ? timesReported : 1
    const onDuplicate = overwrite ? 'data = VALUES(data), times_reported = GREATEST(times_reported, VALUES(times_reported))' : 'id = id'
    return `INSERT INTO \`${name}\` (id, data, times_reported) VALUES (${sqlString(entry.id)}, ${json}, ${count}) ON DUPLICATE KEY UPDATE ${onDuplicate};`
  })
}

const questions = JSON.parse(readFileSync(resolve(dataDir, 'takken-questions.json'), 'utf8'))
const topics = JSON.parse(readFileSync(resolve(dataDir, 'takken-topics.json'), 'utf8'))

const header = overwrite
  ? [
      '-- 宅建题库【覆盖版】种子文件（自动生成，请勿手改；由 server/make-seed.mjs --overwrite 生成）',
      `-- 错题 ${questions.length} 题：数据库里已有的 id 会被本文件的内容【覆盖】（错误次数保留，不会变小），没有的会新增；考点 ${topics.length} 条仍是只补缺、不覆盖。`,
      '-- 仅在「文件里的内容比数据库新」时导入（例如整批补全了中日双语解析）。数据库里有、本文件没有的题不受影响。',
    ]
  : [
      '-- 宅建题库种子文件（自动生成，请勿手改；由 server/make-seed.mjs 从 frontend/src/data/takken-*.json 生成）',
      `-- 错题 ${questions.length} 题，考点 ${topics.length} 条。只补缺的：数据库里已有的 id 完全不动（不覆盖内容、不改错误次数），可放心重复导入。`,
    ]

const lines = [
  ...header,
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
