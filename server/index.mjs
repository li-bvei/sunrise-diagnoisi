import { createHash, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import { createPool, ensureSchema, listAll, ping, upsertMany } from './db.mjs'
import { validateBatch, validateQuestion, validateTopic } from './validate.mjs'

const PORT = Number(process.env.PORT || 3001)
const HOST = process.env.HOST || '0.0.0.0'
const ADMIN_TOKEN = process.env.TAKKEN_ADMIN_TOKEN || ''
const MAX_BODY_BYTES = 5 * 1024 * 1024

const KINDS = {
  questions: { validate: validateQuestion },
  topics: { validate: validateTopic },
}

const pool = createPool()

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers })
  res.end(payload)
}

function isAuthorized(req) {
  if (!ADMIN_TOKEN) return false
  const header = req.headers.authorization || ''
  const provided = header.startsWith('Bearer ') ? header.slice(7) : ''
  const a = Buffer.from(provided)
  const b = Buffer.from(ADMIN_TOKEN)
  return a.length === b.length && timingSafeEqual(a, b)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function handleRead(req, res, kind) {
  const body = JSON.stringify(await listAll(pool, kind))
  // Content changes rarely but must show up right after a write: always revalidate, and answer
  // unchanged data with a cheap 304 via a content hash instead of resending the whole bank.
  const etag = `"${createHash('sha1').update(body).digest('base64url')}"`
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' })
    res.end()
    return
  }
  send(res, 200, body, { ETag: etag, 'Cache-Control': 'no-cache' })
}

async function handleWrite(req, res, kind, url) {
  if (!ADMIN_TOKEN) return send(res, 503, { error: 'Writes are disabled: TAKKEN_ADMIN_TOKEN is not configured on the server.' })
  if (!isAuthorized(req)) return send(res, 401, { error: 'Missing or invalid token.' })

  let parsed
  try {
    parsed = JSON.parse(await readBody(req))
  } catch (error) {
    if (error.status) return send(res, error.status, { error: error.message })
    return send(res, 400, { error: 'Body is not valid JSON.' })
  }

  const entries = Array.isArray(parsed) ? parsed : [parsed]
  try {
    validateBatch(entries, KINDS[kind].validate)
  } catch (error) {
    return send(res, 400, { error: error.message })
  }

  const mode = url.searchParams.get('mode') === 'import' ? 'import' : 'upsert'
  const dryRun = url.searchParams.get('dry_run') === '1'
  const result = await upsertMany(pool, kind, entries, { mode, dryRun })
  send(res, 200, result)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost')
  try {
    if (url.pathname === '/api/health') {
      await ping(pool)
      return send(res, 200, { ok: true })
    }

    const match = url.pathname.match(/^\/api\/takken\/(questions|topics)$/)
    if (!match) return send(res, 404, { error: 'Not found' })
    const kind = match[1]

    if (req.method === 'GET') return await handleRead(req, res, kind)
    if (req.method === 'POST') return await handleWrite(req, res, kind, url)
    return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST' })
  } catch (error) {
    console.error(`${req.method} ${url.pathname} failed:`, error)
    send(res, 500, { error: 'Internal server error' })
  }
})

// The pool connects lazily, so create the tables up front and retry: on a cold `docker compose up`
// the database may need a few seconds, and crashing in a loop would just spam restarts.
async function start() {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await ensureSchema(pool)
      break
    } catch (error) {
      if (attempt >= 10) throw error
      console.error(`Database not ready (attempt ${attempt}/10): ${error.message}`)
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
  server.listen(PORT, HOST, () => console.log(`takken-api listening on ${HOST}:${PORT}`))
}

start().catch((error) => {
  console.error('Failed to start:', error)
  process.exit(1)
})
