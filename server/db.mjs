import mysql from 'mysql2/promise'
import { TABLES, createTableSql } from './schema.mjs'

/**
 * Storage layer for the takken question bank and topic reference (table definitions: schema.mjs).
 *
 * Each entry is one row: `id` (unique), `seq` (insertion order, stable across replaces), and the whole
 * entry as JSON text in `data`, so the application's own schema can keep evolving without column
 * migrations. Writes are per-row INSERT ... ON DUPLICATE KEY UPDATE, which is what removes the "two
 * writers overwrite each other's whole file" failure mode of the old single-JSON-file storage.
 *
 * `times_reported` lives in its own column (not inside `data`) so re-reporting a question can be a single
 * atomic `times_reported + 1` in SQL, safe even when two sessions submit at the same moment.
 */

export function createPool(env = process.env) {
  const common = {
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    charset: 'utf8mb4',
  }
  // A unix socket counts as a "localhost" connection for MySQL account matching, which is what a
  // 宝塔 database user restricted to「本地服务器」requires; a TCP connection from a container would not.
  const connection = env.DB_SOCKET
    ? { socketPath: env.DB_SOCKET }
    : { host: env.DB_HOST || '127.0.0.1', port: Number(env.DB_PORT || 3306) }
  return mysql.createPool({ ...common, ...connection })
}

export async function ensureSchema(pool) {
  for (const kind of Object.keys(TABLES)) await pool.query(createTableSql(kind))
}

export async function ping(pool) {
  await pool.query('SELECT 1')
}

function parseData(value) {
  // MySQL returns JSON columns already parsed; MariaDB's JSON is LONGTEXT and comes back as a string.
  return typeof value === 'string' ? JSON.parse(value) : value
}

export async function listAll(pool, kind) {
  const { name, counted } = TABLES[kind]
  const [rows] = await pool.query(`SELECT data${counted ? ', times_reported' : ''} FROM \`${name}\` ORDER BY seq`)
  return rows.map((row) => {
    const entry = parseData(row.data)
    return counted ? { ...entry, timesReported: row.times_reported } : entry
  })
}

/**
 * mode "upsert" (default): an id that already exists is REPLACED and, for questions, its
 *   times_reported goes up by one — re-submitting the same question is the "I got this wrong again"
 *   signal — unless the entry carries an explicit `timesReported`, which wins.
 * mode "import": replaces content but never bumps the counter (idempotent — safe to re-run when
 *   seeding or restoring from a JSON backup); an explicit `timesReported` still wins.
 * dryRun: does everything inside a transaction and rolls back, so callers can preview the counts.
 */
export async function upsertMany(pool, kind, entries, { mode = 'upsert', dryRun = false } = {}) {
  const { name, counted } = TABLES[kind]
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const ids = entries.map((entry) => entry.id)
    const [existingRows] = await conn.query(`SELECT id FROM \`${name}\` WHERE id IN (?) FOR UPDATE`, [ids])
    const existing = new Set(existingRows.map((row) => row.id))

    let added = 0
    let replaced = 0
    for (const entry of entries) {
      const { timesReported, ...data } = entry
      const explicit = counted && typeof timesReported === 'number' ? Math.floor(timesReported) : null
      const json = JSON.stringify(data)

      if (!counted) {
        await conn.query(
          `INSERT INTO \`${name}\` (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)`,
          [entry.id, json],
        )
      } else if (explicit !== null) {
        await conn.query(
          `INSERT INTO \`${name}\` (id, data, times_reported) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE data = VALUES(data), times_reported = VALUES(times_reported)`,
          [entry.id, json, explicit],
        )
      } else {
        const onDuplicate = mode === 'import' ? 'times_reported = times_reported' : 'times_reported = times_reported + 1'
        await conn.query(
          `INSERT INTO \`${name}\` (id, data, times_reported) VALUES (?, ?, 1)
           ON DUPLICATE KEY UPDATE data = VALUES(data), ${onDuplicate}`,
          [entry.id, json],
        )
      }

      if (existing.has(entry.id)) replaced += 1
      else added += 1
    }

    const [[{ total }]] = await conn.query(`SELECT COUNT(*) AS total FROM \`${name}\``)
    let flagged = []
    if (counted) {
      const [flaggedRows] = await conn.query(
        `SELECT id, times_reported FROM \`${name}\` WHERE id IN (?) AND times_reported >= 2 ORDER BY seq`,
        [ids],
      )
      flagged = flaggedRows.map((row) => ({ id: row.id, timesReported: row.times_reported }))
    }

    if (dryRun) await conn.rollback()
    else await conn.commit()
    return { added, replaced, total, flagged, dryRun }
  } catch (error) {
    await conn.rollback().catch(() => {})
    throw error
  } finally {
    conn.release()
  }
}
