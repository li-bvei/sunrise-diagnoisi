/**
 * Table definitions for the takken bank, shared by the API (db.mjs) and the seed-file generator
 * (make-seed.mjs) so both create exactly the same tables. Dependency-free on purpose.
 *
 * `data` is LONGTEXT, not the JSON column type: MySQL's JSON type re-orders object keys, which would make
 * every exported backup differ from the original even when nothing changed. `times_reported` is its own
 * column so re-reporting a question can be one atomic `times_reported + 1`.
 */
export const TABLES = {
  questions: { name: 'takken_questions', counted: true },
  topics: { name: 'takken_topics', counted: false },
}

export function createTableSql(kind) {
  const { name, counted } = TABLES[kind]
  return `CREATE TABLE IF NOT EXISTS \`${name}\` (
  seq INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id VARCHAR(64) NOT NULL,
  data LONGTEXT NOT NULL,
${counted ? '  times_reported INT UNSIGNED NOT NULL DEFAULT 1,\n' : ''}  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (seq),
  UNIQUE KEY uk_id (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
}
