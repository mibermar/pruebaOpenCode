import type { Bird, BirdSize } from '../types'
import { delay, loadDb, uid, updateDb } from './db'
import { ApiError } from './errors'

export interface BirdFilters {
  species?: string
  location?: string
  size?: BirdSize | ''
  /** edad máxima en años */
  maxAge?: number
}

export interface BirdInput {
  name: string
  species: string
  scientificName?: string
  age: number
  sex: Bird['sex']
  size: BirdSize
  location: string
  photo: string
  story: string
  personality: string[]
  health: string
  energy: number
}

/** Pajaritos disponibles para el feed (adoptados/fuera no aparecen) */
export async function listBirds(filters: BirdFilters = {}): Promise<Bird[]> {
  await delay()
  return filterBirds(loadDb().birds.filter((b) => b.status === 'disponible'), filters)
}

/** Todas las aves de una protectora, con cualquier estado */
export async function listShelterBirds(shelterId: string): Promise<Bird[]> {
  await delay()
  return loadDb().birds.filter((b) => b.shelterId === shelterId)
}

export async function getBird(id: string): Promise<Bird> {
  await delay()
  const bird = loadDb().birds.find((b) => b.id === id)
  if (!bird) throw new ApiError('Este pajarito ya no está disponible 😔')
  return bird
}

export function filterBirds(birds: Bird[], filters: BirdFilters): Bird[] {
  return birds.filter((b) => {
    if (filters.species && b.species !== filters.species) return false
    if (filters.location && b.location !== filters.location) return false
    if (filters.size && b.size !== filters.size) return false
    if (filters.maxAge != null && b.age > filters.maxAge) return false
    return true
  })
}

/** Especies y ciudades existentes, para los desplegables de filtros */
export function getFilterOptions(birds: Bird[]): { species: string[]; locations: string[] } {
  return {
    species: [...new Set(birds.map((b) => b.species))].sort(),
    locations: [...new Set(birds.map((b) => b.location))].sort(),
  }
}

export async function createBird(shelterId: string, input: BirdInput): Promise<Bird> {
  await delay()
  validate(input)
  const db = loadDb()
  if (!db.shelters.some((s) => s.id === shelterId))
    throw new ApiError('Protectora no encontrada.')

  const bird: Bird = {
    id: uid('b'),
    shelterId,
    status: 'disponible',
    photoCredit: { artist: 'Protectora', license: 'Uso propio', page: '' },
    ...input,
    scientificName: input.scientificName?.trim() ?? '',
    name: input.name.trim(),
    species: input.species.trim(),
    location: input.location.trim(),
    story: input.story.trim(),
    health: input.health.trim(),
  }
  updateDb((d) => {
    d.birds.push(bird)
  })
  return bird
}

export async function updateBird(id: string, patch: Partial<BirdInput>): Promise<Bird> {
  await delay()
  let updated: Bird | undefined
  updateDb((d) => {
    const bird = d.birds.find((b) => b.id === id)
    if (!bird) throw new ApiError('Pajarito no encontrado.')
    const merged = { ...bird, ...patch }
    validate(merged)
    Object.assign(bird, patch)
    updated = bird
  })
  if (!updated) throw new ApiError('Pajarito no encontrado.')
  return updated
}

export async function deleteBird(id: string): Promise<void> {
  await delay()
  updateDb((d) => {
    const bird = d.birds.find((b) => b.id === id)
    if (!bird) throw new ApiError('Pajarito no encontrado.')
    const active = d.requests.some(
      (r) => r.birdId === id && (r.status === 'pendiente' || r.status === 'aprobada'),
    )
    if (active)
      throw new ApiError('Hay solicitudes de adopción activas: resuélvelas antes de borrarlo.')
    d.birds = d.birds.filter((b) => b.id !== id)
  })
}

function validate(b: Partial<Bird>): void {
  if (!b.name?.trim()) throw new ApiError('El pajarito necesita un nombre.')
  if (!b.species?.trim()) throw new ApiError('Indica la especie.')
  if (!b.location?.trim()) throw new ApiError('Indica la ciudad donde está.')
  if (b.age == null || b.age < 0 || Number.isNaN(b.age))
    throw new ApiError('La edad no puede ser negativa.')
  if (!b.photo) throw new ApiError('Elige una foto para el pajarito.')
  if (b.energy == null || b.energy < 1 || b.energy > 5)
    throw new ApiError('La energía debe estar entre 1 y 5.')
}
