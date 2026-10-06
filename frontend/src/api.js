// Centralised API layer. Every call goes to the real FastAPI backend; nothing is mocked.
export const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.status = status
  }
}

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${BASE}/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new ApiError(
      `Cannot reach the PRAGYA backend at ${BASE}. Start it with "cd backend && uvicorn main:app --reload".`,
      0,
    )
  }
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = Array.isArray(body.detail) ? body.detail.map((d) => `${(d.loc || []).slice(1).join('.')}: ${d.msg}`).join('; ') : body.detail
    } catch { /* body was not JSON */ }
    throw new ApiError(detail || `Request failed (HTTP ${res.status})`, res.status)
  }
  return res.json()
}

const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body ?? {}) })

export const api = {
  health: () => request('/health'),
  scenarios: () => request('/scenarios'),
  scenario: (id) => request(`/scenarios/${encodeURIComponent(id)}`),
  createMission: (scenario_id, seed) => post('/missions', seed === '' || seed == null ? { scenario_id } : { scenario_id, seed: Number(seed) }),
  missions: () => request('/missions'),
  mission: (id) => request(`/missions/${id}`),
  tick: (id, ticks = 1) => post(`/missions/${id}/tick`, { ticks }),
  decide: (id, decision) => post(`/missions/${id}/decision`, decision),
  aar: (id) => request(`/missions/${id}/aar`),
  replay: (id, view = 'trainee', tick) => request(`/missions/${id}/replay?view=${view}${tick == null ? '' : `&tick=${tick}`}`),
  analytics: () => request('/analytics'),
}
