import type { Bird, Match, Swipe, SwipeAction } from '../types'
import { delay, loadDb, now, uid, updateDb } from './db'
import { ApiError } from './errors'
import type { BirdFilters } from './birds'
import { filterBirds } from './birds'

/** Probabilidad de que la protectora corresponda a un like normal */
export const LIKE_BACK_PROBABILITY = 0.6
/** Ventana de revisión simulada: 1.5–4 s */
const REVIEW_MIN_MS = 1500
const REVIEW_WINDOW_MS = 2500

/** Pajaritos que el usuario aún no ha visto ni valorado */
export async function getFeed(
  userId: string,
  filters: BirdFilters = {},
): Promise<Bird[]> {
  await delay()
  const db = loadDb()
  const me = db.users.find((u) => u.id === userId)
  const swipedIds = new Set(db.swipes.filter((s) => s.userId === userId).map((s) => s.birdId))
  const candidates = db.birds.filter(
    (b) =>
      b.status === 'disponible' &&
      !swipedIds.has(b.id) &&
      // una protectora no se autolikea
      !(me?.shelterId && b.shelterId === me.shelterId),
  )
  return filterBirds(candidates, filters)
}

export async function sendSwipe(
  userId: string,
  birdId: string,
  action: SwipeAction,
): Promise<Swipe> {
  await delay()
  const db = loadDb()
  const bird = db.birds.find((b) => b.id === birdId)
  if (!bird) throw new ApiError('Este pajarito ya no está disponible 😔')
  if (bird.status !== 'disponible') throw new ApiError('Este pajarito ya tiene hogar.')
  if (db.swipes.some((s) => s.userId === userId && s.birdId === birdId))
    throw new ApiError('Ya has valorado a este pajarito.')

  const swipe: Swipe = {
    id: uid('sw'),
    userId,
    birdId,
    action,
    createdAt: now(),
  }

  const willMatch = decideMatch(db, userId, action)
  updateDb((d) => {
    d.swipes.push(swipe)
    if (action !== 'dislike') {
      d.pendingReviews.push({
        id: uid('pr'),
        swipeId: swipe.id,
        userId,
        birdId,
        shelterId: bird.shelterId,
        willMatch,
        dueAt: Date.now() + REVIEW_MIN_MS + Math.random() * REVIEW_WINDOW_MS,
      })
    }
  })
  return swipe
}

/**
 * Regla de decisión de la protectora (simulada):
 * - superlike: siempre
 * - primer like del usuario: siempre (para que nadie se quede sin ver la feature)
 * - like normal: probabilidad fija
 */
function decideMatch(db: ReturnType<typeof loadDb>, userId: string, action: SwipeAction): boolean {
  if (action === 'superlike') return true
  const hasMatch = db.matches.some((m) => m.userId === userId && m.status === 'aceptado')
  if (!hasMatch) return true
  return Math.random() < LIKE_BACK_PROBABILITY
}

/**
 * Resuelve las revisiones vencidas: crea matches + notificaciones.
 * Se invoca desde un ticker en la UI y al cargar la app.
 * Devuelve los matches creados.
 */
export function processPendingReviews(nowTs: number = Date.now()): Match[] {
  const db = loadDb()
  const due = db.pendingReviews.filter((p) => p.dueAt <= nowTs)
  if (due.length === 0) return []

  const created: Match[] = []
  updateDb((d) => {
    const stillPending = d.pendingReviews.filter((p) => p.dueAt > nowTs)
    for (const review of d.pendingReviews.filter((p) => p.dueAt <= nowTs)) {
      if (!review.willMatch) continue
      // idempotencia: no duplicar match del mismo swipe
      if (d.matches.some((m) => m.userId === review.userId && m.birdId === review.birdId)) continue

      const bird = d.birds.find((b) => b.id === review.birdId)
      if (!bird) continue
      const match: Match = {
        id: uid('m'),
        userId: review.userId,
        birdId: review.birdId,
        shelterId: review.shelterId,
        status: 'aceptado',
        createdAt: now(),
      }
      d.matches.push(match)
      created.push(match)

      const adoptante = d.users.find((u) => u.id === review.userId)
      d.notifications.push({
        id: uid('n'),
        userId: review.userId,
        type: 'match',
        title: `¡Tienes match con ${bird.name}! 💛`,
        body: `La protectora ha aceptado tu like. ¡Escríbeles para adoptarle!`,
        read: false,
        createdAt: now(),
        link: '/matches',
      })
      // la notificación para la protectora va a cada usuario de esa protectora
      for (const member of d.users.filter((u) => u.shelterId === review.shelterId)) {
        d.notifications.push({
          id: uid('n'),
          userId: member.id,
          type: 'match',
          title: `Nuevo match: ${bird.name} 🐦`,
          body: `${adoptante?.name ?? 'Alguien'} quiere adoptar a ${bird.name}.`,
          read: false,
          createdAt: now(),
          link: '/dashboard',
        })
      }
    }
    d.pendingReviews = stillPending
  })
  return created
}

/** Número de revisiones aún pendientes (para no crear timers inútiles) */
export function pendingReviewCount(): number {
  return loadDb().pendingReviews.length
}

/** Siguiente instante en que se resolverá alguna revisión, o null */
export function nextReviewDueAt(): number | null {
  const pending = loadDb().pendingReviews
  if (pending.length === 0) return null
  return Math.min(...pending.map((p) => p.dueAt))
}

/** Deshace el último swipe sobre un pájaro (permite volver a verlo en el feed) */
export async function undoSwipe(userId: string, birdId: string): Promise<void> {
  await delay()
  updateDb((d) => {
    d.swipes = d.swipes.filter((s) => !(s.userId === userId && s.birdId === birdId))
    d.pendingReviews = d.pendingReviews.filter(
      (p) => !(p.userId === userId && p.birdId === birdId),
    )
  })
}

/** Swipes del usuario (para tests y analytics de la demo) */
export function listSwipes(userId: string): Swipe[] {
  return loadDb().swipes.filter((s) => s.userId === userId)
}
