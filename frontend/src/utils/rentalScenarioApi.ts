import type { RentalCostScenario } from '@/types/rentalCost'

const OWNER_KEY = 'rental-cost-owner-key'
const API_URL = `${import.meta.env.BASE_URL}api/rental-cost/scenarios`

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
  if (!response.ok) throw new Error(`Rental scenario API ${response.status}`)
  return response.json()
}

export async function listRentalScenarios(): Promise<RentalCostScenario[]> {
  return request() as Promise<RentalCostScenario[]>
}

export async function saveRentalScenario(scenario: Omit<RentalCostScenario, 'savedAt'>): Promise<RentalCostScenario> {
  return request('', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scenario) }) as Promise<RentalCostScenario>
}

export async function deleteRentalScenario(id: string): Promise<void> {
  await request(`/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
