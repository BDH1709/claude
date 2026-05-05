// Add these to src/lib/api.ts in your existing dashboard project

export interface PTCGArchetype {
  name: string
  tier: 'S' | 'A' | 'B' | 'C'
  top8s: number
  wins: number
  avg_placement: number
  appearances: number
  example_decklist: Array<{ name: string; count: number }> | null
}

export interface PTCGMetaResponse {
  archetypes: PTCGArchetype[]
  updated_at: string
}

export interface PTCGChange {
  type: 'new' | 'dropped' | 'tier_change'
  archetype: string
  tier?: string
  from_tier?: string
  to_tier?: string
}

export interface PTCGCatchUpResponse {
  current: PTCGArchetype[]
  previous: PTCGArchetype[] | null
  changes: PTCGChange[]
  snapshot_date: string | null
  updated_at: string
}

export interface PTCGTournament {
  id: string
  name: string
  date: string
  players: number
  format: string
  country: string
  top_decks: Array<{ archetype?: string; name?: string }>
}

export interface PTCGCard {
  id: string
  name: string
  number: string
  set: { name: string; id: string }
  images: { small: string; large: string }
}

export interface PTCGDeck {
  id: number
  name: string
  archetype: string
  cards: Array<{ id: string; name: string; image: string; count: number }>
  notes: string
  last_played: string | null
  created_at: string
}

// --- API functions (adapt BASE_URL to match your api.ts pattern) ---

const BASE = '/api/ptcg'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || res.statusText)
  }
  return res.json()
}

// Meta
export const getPTCGMeta = () => apiFetch<PTCGMetaResponse>('/meta')
export const refreshPTCGMeta = () => apiFetch<{ status: string }>('/meta/refresh', { method: 'POST' })
export const getPTCGCatchUp = () => apiFetch<PTCGCatchUpResponse>('/meta/catchup')

// Tournaments
export const getPTCGTournaments = () => apiFetch<PTCGTournament[]>('/tournaments')
export const refreshPTCGTournaments = () => apiFetch<{ status: string }>('/tournaments/refresh', { method: 'POST' })
export const getPTCGTournamentDetail = (id: string) => apiFetch<PTCGTournament>(`/tournaments/${id}`)

// Decks
export const getPTCGDecks = () => apiFetch<PTCGDeck[]>('/decks')
export const createPTCGDeck = (body: Omit<PTCGDeck, 'id' | 'created_at' | 'last_played'>) =>
  apiFetch<PTCGDeck>('/decks', { method: 'POST', body: JSON.stringify(body) })
export const updatePTCGDeck = (id: number, body: Partial<PTCGDeck>) =>
  apiFetch<PTCGDeck>(`/decks/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const markPTCGDeckPlayed = (id: number) =>
  apiFetch<PTCGDeck>(`/decks/${id}/played`, { method: 'PATCH' })
export const deletePTCGDeck = (id: number) =>
  apiFetch<{ ok: boolean }>(`/decks/${id}`, { method: 'DELETE' })

// Card search
export const searchPTCGCards = (q: string, page = 1) =>
  apiFetch<{ data: PTCGCard[]; totalCount: number }>(`/cards/search?q=${encodeURIComponent(q)}&page=${page}`)
