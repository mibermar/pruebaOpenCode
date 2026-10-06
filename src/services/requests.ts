import type { AdoptionRequest, RequestStatus } from '../types'
import { delay, loadDb, now, uid, updateDb } from './db'
import { ApiError } from './errors'

/** Solicitud con contexto para la UI */
export interface RequestWithContext extends AdoptionRequest {
  birdName: string
  birdPhoto: string
  shelterName: string
  adoptanteName: string
}

export async function createRequest(
  userId: string,
  matchId: string,
  message: string,
): Promise<AdoptionRequest> {
  await delay()
  const text = message.trim()
  if (text.length < 10)
    throw new ApiError('Cuéntale a la protectora por qué quieres adoptarle (mín. 10 caracteres).')

  const db = loadDb()
  const match = db.matches.find((m) => m.id === matchId)
  if (!match || match.userId !== userId) throw new ApiError('Match no encontrado.')
  if (match.status !== 'aceptado') throw new ApiError('Este match aún no está confirmado.')

  if (db.requests.some((r) => r.matchId === matchId))
    throw new ApiError('Ya enviaste una solicitud para este pajarito.')

  const bird = db.birds.find((b) => b.id === match.birdId)
  if (!bird) throw new ApiError('Este pajarito ya no está disponible 😔')
  if (bird.status !== 'disponible')
    throw new ApiError('¡Otra persona llegó primero! Este pajarito ya está reservado.')

  const request: AdoptionRequest = {
    id: uid('r'),
    matchId,
    birdId: match.birdId,
    userId,
    message: text,
    status: 'pendiente',
    createdAt: now(),
    updatedAt: now(),
  }

  updateDb((d) => {
    d.requests.push(request)
    const adoptante = d.users.find((u) => u.id === userId)
    for (const member of d.users.filter((u) => u.shelterId === match.shelterId)) {
      d.notifications.push({
        id: uid('n'),
        userId: member.id,
        type: 'solicitud',
        title: `Nueva solicitud para ${bird.name} 📝`,
        body: `${adoptante?.name ?? 'Alguien'} quiere adoptarle. ¡Revísala!`,
        read: false,
        createdAt: now(),
        link: '/dashboard',
      })
    }
  })
  return request
}

export async function listRequestsForUser(userId: string): Promise<RequestWithContext[]> {
  await delay()
  return gather((d) => d.requests.filter((r) => r.userId === userId))
}

export async function listRequestsForShelter(shelterId: string): Promise<RequestWithContext[]> {
  await delay()
  return gather((d) =>
    d.requests.filter((r) => {
      const bird = d.birds.find((b) => b.id === r.birdId)
      return bird?.shelterId === shelterId
    }),
  )
}

/**
 * Cambia el estado de una solicitud. Solo la protectora propietaria puede hacerlo.
 * Transiciones: pendiente → aprobada | rechazada ; aprobada → completada
 */
export async function updateRequestStatus(
  requestId: string,
  actorUserId: string,
  status: Extract<RequestStatus, 'aprobada' | 'rechazada' | 'completada'>,
): Promise<AdoptionRequest> {
  await delay()
  const actor = loadDb().users.find((u) => u.id === actorUserId)
  if (!actor?.shelterId) throw new ApiError('Solo la protectora puede gestionar solicitudes.')

  let result: AdoptionRequest | undefined
  updateDb((d) => {
    const req = d.requests.find((r) => r.id === requestId)
    if (!req) throw new ApiError('Solicitud no encontrada.')
    const bird = d.birds.find((b) => b.id === req.birdId)
    if (!bird || bird.shelterId !== actor.shelterId)
      throw new ApiError('Esta solicitud no pertenece a tu protectora.')

    const allowed: Record<string, RequestStatus[]> = {
      pendiente: ['aprobada', 'rechazada'],
      aprobada: ['completada'],
      rechazada: [],
      completada: [],
    }
    if (!allowed[req.status].includes(status))
      throw new ApiError(`No se puede pasar de «${req.status}» a «${status}».`)

    if (status === 'aprobada') {
      if (bird.status !== 'disponible')
        throw new ApiError('Este pajarito ya está reservado por otra solicitud.')
      bird.status = 'reservado'
    }
    if (status === 'rechazada' && bird.status === 'reservado') bird.status = 'disponible'
    if (status === 'completada') bird.status = 'adoptado'

    req.status = status
    req.updatedAt = now()
    result = req

    const messages: Record<string, { title: string; body: string; link: string }> = {
      aprobada: {
        title: `¡${bird.name} quiere conocerte! 🎉`,
        body: 'La protectora ha aprobado tu solicitud de adopción.',
        link: '/adopciones',
      },
      rechazada: {
        title: `Actualización sobre ${bird.name} 💔`,
        body: 'La protectora no pudo aprobar tu solicitud, pero hay más pajaritos esperando.',
        link: '/feed',
      },
      completada: {
        title: `¡${bird.name} ya tiene hogar! 🏡`,
        body: 'La adopción se ha completado. ¡Enhorabuena!',
        link: '/adopciones',
      },
    }
    const msg = messages[status]
    d.notifications.push({
      id: uid('n'),
      userId: req.userId,
      type: 'estado',
      title: msg.title,
      body: msg.body,
      read: false,
      createdAt: now(),
      link: msg.link,
    })
  })
  if (!result) throw new ApiError('Solicitud no encontrada.')
  return result
}

function gather(select: (db: ReturnType<typeof loadDb>) => AdoptionRequest[]): RequestWithContext[] {
  const db = loadDb()
  return select(db)
    .map((r) => {
      const bird = db.birds.find((b) => b.id === r.birdId)
      const shelter = db.shelters.find((s) => s.id === bird?.shelterId)
      const adoptante = db.users.find((u) => u.id === r.userId)
      return {
        ...r,
        birdName: bird?.name ?? '—',
        birdPhoto: bird?.photo ?? '',
        shelterName: shelter?.name ?? '—',
        adoptanteName: adoptante?.name ?? '—',
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
