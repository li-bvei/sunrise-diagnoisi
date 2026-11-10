const TABLE = 'rental_cost_scenarios'
const MAX_SCENARIOS = 500
const COST_KEYS = new Set([
  'deposit', 'keyMoney', 'guaranteeDeposit', 'agencyFee', 'guaranteeCompanyFee',
  'fireInsurance', 'keyReplacement', 'currentMonthRent', 'nextMonthRent',
  'currentMonthManagementFee', 'nextMonthManagementFee', 'cleaningFee', 'contractAdminFee',
])
const MATERIAL_KEYS = new Set([
  'residenceCard', 'residentCertificate', 'incomeProof', 'personalSeal',
  'sealCertificate', 'idPhoto', 'emergencyContact', 'bankAccount',
])

const validNumber = (value) => value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 50_000_000)
const validText = (value, max = 300) => typeof value === 'string' && value.length <= max
const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9-]{12,64}$/.test(value)
const validDate = (value) => value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))

export function validateRentalScenario(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !validId(value.id)) return false
  const input = value.input
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false
  const property = input.property
  if (!property || typeof property !== 'object' || Array.isArray(property)) return false
  if (!validText(property.name, 200) || !validText(property.address) || !validText(property.station, 200) || !validText(property.layout, 80)) return false
  if (!['walkMinutes', 'area', 'buildingAge', 'managementFee'].every((key) => validNumber(property[key]))) return false
  if (!validNumber(input.monthlyRent) || !validDate(input.moveInDate)) return false
  if (!input.costs || typeof input.costs !== 'object' || Array.isArray(input.costs)) return false
  if (Object.keys(input.costs).length !== COST_KEYS.size || !Object.keys(input.costs).every((key) => COST_KEYS.has(key) && validNumber(input.costs[key]))) return false
  if (!Array.isArray(input.customCosts) || input.customCosts.length > 100 || !input.customCosts.every((item) => validId(item.id) && validText(item.label, 120) && validNumber(item.amount))) return false
  if (!Array.isArray(input.materials) || input.materials.length > MATERIAL_KEYS.size || !input.materials.every((key) => MATERIAL_KEYS.has(key))) return false
  if (!Array.isArray(input.customMaterials) || input.customMaterials.length > 100 || !input.customMaterials.every((item) => validId(item.id) && validText(item.label, 120))) return false
  if (!value.calculation || typeof value.calculation !== 'object' || !Array.isArray(value.calculation.items) || !Array.isArray(value.calculation.materials) || typeof value.calculation.total !== 'number' || !Number.isFinite(value.calculation.total)) return false
  if (!validText(value.ruleVersion, 40)) return false
  if (value.savedAt !== undefined && (typeof value.savedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(value.savedAt))) return false
  return true
}

const stored = (scenario) => ({
  id: scenario.id, input: scenario.input, calculation: scenario.calculation,
  ruleVersion: scenario.ruleVersion,
})
const parseRow = (row) => ({ ...JSON.parse(row.data), savedAt: row.saved_at })

export async function createRentalStore(mysqlPool) {
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
        return rows.map(parseRow)
      },
      async save(owner, scenario) {
        const savedAt = new Date().toISOString()
        const data = JSON.stringify(stored(scenario))
        await mysqlPool.query(`INSERT INTO \`${TABLE}\` (owner_hash, id, data, saved_at) VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE data = VALUES(data), saved_at = VALUES(saved_at)`, [owner, scenario.id, data, savedAt])
        return { ...stored(scenario), savedAt }
      },
      async remove(owner, id) { await mysqlPool.query(`DELETE FROM \`${TABLE}\` WHERE owner_hash = ? AND id = ?`, [owner, id]) },
      async ping() { await mysqlPool.query('SELECT 1') },
    }
  }

  const { DatabaseSync } = await import('node:sqlite')
  const { mkdirSync } = await import('node:fs')
  const { dirname, resolve } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const path = resolve(process.env.RENTAL_SQLITE_PATH || fileURLToPath(new URL('./data/rental-cost.sqlite', import.meta.url)))
  mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec(`CREATE TABLE IF NOT EXISTS ${TABLE} (
    owner_hash TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, saved_at TEXT NOT NULL,
    PRIMARY KEY (owner_hash, id)
  ); CREATE INDEX IF NOT EXISTS idx_rental_owner_saved ON ${TABLE} (owner_hash, saved_at);`)
  const list = db.prepare(`SELECT data, saved_at FROM ${TABLE} WHERE owner_hash = ? ORDER BY saved_at DESC LIMIT ?`)
  const save = db.prepare(`INSERT INTO ${TABLE} (owner_hash, id, data, saved_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(owner_hash, id) DO UPDATE SET data = excluded.data, saved_at = excluded.saved_at`)
  const remove = db.prepare(`DELETE FROM ${TABLE} WHERE owner_hash = ? AND id = ?`)
  return {
    async list(owner) { return list.all(owner, MAX_SCENARIOS).map(parseRow) },
    async save(owner, scenario) {
      const savedAt = new Date().toISOString()
      save.run(owner, scenario.id, JSON.stringify(stored(scenario)), savedAt)
      return { ...stored(scenario), savedAt }
    },
    async remove(owner, id) { remove.run(owner, id) },
    async ping() { db.prepare('SELECT 1').get() },
  }
}
