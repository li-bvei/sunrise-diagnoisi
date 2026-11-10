import { createHash } from 'node:crypto'

const TABLE = 'purchase_yield_scenarios'
const MAX_SCENARIOS = 500
const MODES = new Set(['free', 'include', 'exclude'])

function validNumber(value) {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000_000)
}

function validText(value, limit = 300) {
  return typeof value === 'string' && value.length <= limit
}

export function validateScenario(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  if (typeof value.id !== 'string' || !/^[a-zA-Z0-9-]{12,64}$/.test(value.id)) return false
  if (!value.input || typeof value.input !== 'object' || Array.isArray(value.input)) return false
  const { input } = value
  if (!input.property || typeof input.property !== 'object' || Array.isArray(input.property)) return false
  const property = input.property
  if (!validText(property.name, 200) || !validText(property.address) || !validText(property.station, 200) || !validText(property.layout, 80)) return false
  if (!['walkMinutes', 'area', 'buildingAge', 'managementFee'].every((key) => validNumber(property[key]))) return false
  if (!['priceManYen', 'monthlyRent', 'repairReserve', 'renovationCost', 'annualPropertyTax', 'monthlyRentalManagement', 'otherInitialCosts'].every((key) => validNumber(input[key]))) return false
  if (typeof input.priceManYen !== 'number' || input.priceManYen <= 0 || !property.name.trim()) return false
  if (typeof input.managementFeeTenantPays !== 'boolean' && input.managementFeeTenantPays !== null) return false
  if (!MODES.has(input.brokerageMode)) return false
  if (!value.calculation || typeof value.calculation !== 'object' || Array.isArray(value.calculation)) return false
  if (!Array.isArray(value.calculation.initialLines) || !Array.isArray(value.calculation.annualLines)) return false
  if (!validText(value.ruleVersion, 40)) return false
  if (value.savedAt !== undefined && (typeof value.savedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(value.savedAt))) return false
  return value.netYield === null || (typeof value.netYield === 'number' && Number.isFinite(value.netYield) && Math.abs(value.netYield) <= 1_000_000)
}

export function ownerHash(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null
  return createHash('sha256').update(token).digest('hex')
}

function parseScenario(row) {
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  return { ...data, savedAt: row.saved_at }
}

export async function createPurchaseStore(mysqlPool) {
  if (mysqlPool) {
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
      owner_hash CHAR(64) NOT NULL,
      id VARCHAR(64) NOT NULL,
      data LONGTEXT NOT NULL,
      saved_at VARCHAR(32) NOT NULL,
      PRIMARY KEY (owner_hash, id),
      KEY idx_owner_saved (owner_hash, saved_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    return {
      async list(owner) {
        const [rows] = await mysqlPool.query(`SELECT data, saved_at FROM \`${TABLE}\` WHERE owner_hash = ? ORDER BY saved_at DESC LIMIT ?`, [owner, MAX_SCENARIOS])
        return rows.map(parseScenario)
      },
      async save(owner, scenario) {
        const savedAt = scenario.savedAt || new Date().toISOString()
        const data = JSON.stringify({ id: scenario.id, input: scenario.input, calculation: scenario.calculation, ruleVersion: scenario.ruleVersion, netYield: scenario.netYield })
        await mysqlPool.query(`INSERT INTO \`${TABLE}\` (owner_hash, id, data, saved_at) VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE data = VALUES(data), saved_at = VALUES(saved_at)`, [owner, scenario.id, data, savedAt])
        return { id: scenario.id, input: scenario.input, calculation: scenario.calculation, ruleVersion: scenario.ruleVersion, netYield: scenario.netYield, savedAt }
      },
      async remove(owner, id) {
        await mysqlPool.query(`DELETE FROM \`${TABLE}\` WHERE owner_hash = ? AND id = ?`, [owner, id])
      },
      async ping() { await mysqlPool.query('SELECT 1') },
    }
  }

  // Local development keeps the same database-backed API without requiring the production MySQL server.
  const { DatabaseSync } = await import('node:sqlite')
  const { mkdirSync } = await import('node:fs')
  const { dirname, resolve } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const path = resolve(process.env.PURCHASE_SQLITE_PATH || fileURLToPath(new URL('./data/purchase-yield.sqlite', import.meta.url)))
  mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec(`CREATE TABLE IF NOT EXISTS ${TABLE} (
    owner_hash TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    saved_at TEXT NOT NULL,
    PRIMARY KEY (owner_hash, id)
  ); CREATE INDEX IF NOT EXISTS idx_purchase_owner_saved ON ${TABLE} (owner_hash, saved_at);`)
  const listStmt = db.prepare(`SELECT data, saved_at FROM ${TABLE} WHERE owner_hash = ? ORDER BY saved_at DESC LIMIT ?`)
  const saveStmt = db.prepare(`INSERT INTO ${TABLE} (owner_hash, id, data, saved_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(owner_hash, id) DO UPDATE SET data = excluded.data, saved_at = excluded.saved_at`)
  const deleteStmt = db.prepare(`DELETE FROM ${TABLE} WHERE owner_hash = ? AND id = ?`)
  return {
    async list(owner) { return listStmt.all(owner, MAX_SCENARIOS).map(parseScenario) },
    async save(owner, scenario) {
      const savedAt = scenario.savedAt || new Date().toISOString()
      saveStmt.run(owner, scenario.id, JSON.stringify({ id: scenario.id, input: scenario.input, calculation: scenario.calculation, ruleVersion: scenario.ruleVersion, netYield: scenario.netYield }), savedAt)
      return { id: scenario.id, input: scenario.input, calculation: scenario.calculation, ruleVersion: scenario.ruleVersion, netYield: scenario.netYield, savedAt }
    },
    async remove(owner, id) { deleteStmt.run(owner, id) },
    async ping() { db.prepare('SELECT 1').get() },
  }
}
