import { seedBirds } from '../data/birds'
import { shelters as seedShelters } from '../data/shelters'
import { seedUsers } from '../data/users'
import type { Database } from '../types'

const DB_KEY = 'piar:db:v1'
const SESSION_KEY = 'piar:session:v1'
const SCHEMA_VERSION = 1

/** Latencia simulada de la "API" (ms). Los tests la ponen a 0. */
let latency = 250

export function setLatency(ms: number): void {
  latency = ms
}

export function delay(ms = latency): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Identificador único sencillo y suficiente para la demo */
export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

/** Timestamp ISO actual (sobrescribible en tests) */
export function now(): string {
  return new Date().toISOString()
}

function emptyDb(): Database {
  return {
    version: SCHEMA_VERSION,
    users: [],
    shelters: [...seedShelters],
    birds: [...seedBirds],
    swipes: [],
    matches: [],
    requests: [],
    notifications: [],
    pendingReviews: [],
  }
}

/** Carga la BD desde localStorage; si no existe la siembra con los datos demo */
export function loadDb(): Database {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Database
      if (parsed.version === SCHEMA_VERSION) return parsed
    }
  } catch {
    // BD corrupta: se regenera desde cero
  }
  const fresh = emptyDb()
  // los usuarios semilla se insertan aquí para poder importar fakeHash
  fresh.users = [...seedUsers]
  saveDb(fresh)
  return fresh
}

export function saveDb(db: Database): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

/** Muta la BD con una función pura sobre el estado y persiste el resultado */
export function updateDb(mutator: (db: Database) => Database | void): Database {
  const db = loadDb()
  const result = mutator(db) ?? db
  saveDb(result)
  return result
}

/** Reinicia la BD a los datos de fábrica (útil en tests y en la demo) */
export function resetDb(): Database {
  localStorage.removeItem(DB_KEY)
  localStorage.removeItem(SESSION_KEY)
  return loadDb()
}

// ---- Sesión (usuario logueado) ----

export function loadSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

export function saveSessionUserId(userId: string): void {
  localStorage.setItem(SESSION_KEY, userId)
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
