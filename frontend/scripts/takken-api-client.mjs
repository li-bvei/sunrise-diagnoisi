/**
 * Shared helpers for the takken upsert/export scripts, which talk to the takken API (MySQL-backed).
 *
 * Config comes from the environment or a git-ignored `frontend/.env.takken` file:
 *   TAKKEN_API_URL=https://your-domain.example/server/api     (no trailing slash)
 *   TAKKEN_ADMIN_TOKEN=the same token set as TAKKEN_ADMIN_TOKEN in the server's .env
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONFIG_FILE = resolve(__dirname, '../.env.takken')

function loadConfigFile() {
  if (!existsSync(CONFIG_FILE)) return {}
  const values = {}
  for (const line of readFileSync(CONFIG_FILE, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return values
}

export function getConfig({ needToken }) {
  const file = loadConfigFile()
  const apiUrl = (process.env.TAKKEN_API_URL || file.TAKKEN_API_URL || '').replace(/\/+$/, '')
  const token = process.env.TAKKEN_ADMIN_TOKEN || file.TAKKEN_ADMIN_TOKEN || ''
  const missing = []
  if (!apiUrl) missing.push('TAKKEN_API_URL')
  if (needToken && !token) missing.push('TAKKEN_ADMIN_TOKEN')
  if (missing.length > 0) {
    console.error(
      `Missing ${missing.join(' and ')}. Set them in the environment or in frontend/.env.takken (see docs/TAKKEN_DATA_WORKFLOW.md).`,
    )
    process.exit(1)
  }
  return { apiUrl, token }
}

export function readInput() {
  const args = process.argv.slice(2)
  const filePath = args.find((arg) => !arg.startsWith('--'))
  const raw = filePath ? readFileSync(resolve(process.cwd(), filePath), 'utf8') : readFileSync(0, 'utf8')
  return { raw, dryRun: args.includes('--dry-run'), importMode: args.includes('--import') }
}

export async function apiRequest(url, { method = 'GET', token, body } = {}) {
  let response
  try {
    response = await fetch(url, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body,
    })
  } catch (error) {
    throw new Error(`Cannot reach ${url}: ${error.cause?.message || error.message}`)
  }
  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Unexpected response (HTTP ${response.status}) from ${url}: ${text.slice(0, 200)}`)
  }
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
  return data
}
