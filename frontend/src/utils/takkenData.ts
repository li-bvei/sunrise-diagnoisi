import type { TakkenTopic } from '@/types/takken'
import { setTakkenQuestionBank } from '@/utils/takkenQuestionModel'

/**
 * Loads the takken question bank and topic reference from the takken API (MySQL-backed) once per
 * page load. The router awaits this before entering any takken route, so the views themselves stay
 * synchronous. `import.meta.env.BASE_URL` keeps the request under the deploy prefix (e.g. /server/),
 * where the host Nginx strips the prefix and the container's Nginx proxies /api/ to the API service.
 */
export let TAKKEN_TOPICS: TakkenTopic[] = []

const API_BASE = `${import.meta.env.BASE_URL}api/takken`

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(`${API_BASE}/${path}`, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`加载 ${path} 失败（HTTP ${response.status}）`)
  return response.json()
}

let loading: Promise<void> | null = null

export function loadTakkenData(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      const [questions, topics] = await Promise.all([fetchJson('questions'), fetchJson('topics')])
      setTakkenQuestionBank(questions)
      TAKKEN_TOPICS = Array.isArray(topics) ? (topics as TakkenTopic[]) : []
    })().catch((error) => {
      loading = null // let the next navigation retry instead of caching the failure
      throw error
    })
  }
  return loading
}
