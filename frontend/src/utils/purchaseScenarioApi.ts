import type { PurchaseYieldScenario } from '@/types/purchaseYield'

const OWNER_KEY = 'purchase-yield-owner-key'
const API_URL = `${import.meta.env.BASE_URL}api/purchase-yield/scenarios`

function ownerToken(): string {
  const saved = localStorage.getItem(OWNER_KEY)
  if (saved && /^[a-f0-9]{64}$/.test(saved)) return saved
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const token = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  localStorage.setItem(OWNER_KEY, token)
  return token
}

async function request(path = '', options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: 'no-store',
    headers: { 'X-Scenario-Owner': ownerToken(), ...options.headers },
  })
  if (!response.ok) throw new Error(`Scenario API ${response.status}`)
  return response.json()
}

export async function listPurchaseScenarios(): Promise<PurchaseYieldScenario[]> {
  return request() as Promise<PurchaseYieldScenario[]>
}

export async function savePurchaseScenario(scenario: Omit<PurchaseYieldScenario, 'savedAt'> & { savedAt?: string }): Promise<PurchaseYieldScenario> {
  return request('', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
  }) as Promise<PurchaseYieldScenario>
}

export async function deletePurchaseScenario(id: string): Promise<void> {
  await request(`/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
