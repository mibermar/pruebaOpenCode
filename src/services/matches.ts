import type { Bird, Match } from '../types'
import { delay, loadDb } from './db'
import { ApiError } from './errors'

/** Match con su pajarito ya resuelto, para la UI */
export interface MatchWithBird extends Match {
  bird: Bird
}

export async function listMatchesForUser(userId: string): Promise<MatchWithBird[]> {
  await delay()
  const db = loadDb()
  return db.matches
    .filter((m) => m.userId === userId && m.status === 'aceptado')
    .map((m) => ({ ...m, bird: db.birds.find((b) => b.id === m.birdId)! }))
    .filter((m) => m.bird != null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function listMatchesForShelter(shelterId: string): Promise<MatchWithBird[]> {
  await delay()
  const db = loadDb()
  return db.matches
    .filter((m) => m.shelterId === shelterId && m.status === 'aceptado')
    .map((m) => ({ ...m, bird: db.birds.find((b) => b.id === m.birdId)! }))
    .filter((m) => m.bird != null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getMatch(id: string): Promise<Match> {
  await delay()
  const match = loadDb().matches.find((m) => m.id === id)
  if (!match) throw new ApiError('Match no encontrado.')
  return match
}

/** Existe ya un match entre usuario y pájaro */
export function findMatch(userId: string, birdId: string): Match | null {
  return (
    loadDb().matches.find(
      (m) => m.userId === userId && m.birdId === birdId && m.status === 'aceptado',
    ) ?? null
  )
}
