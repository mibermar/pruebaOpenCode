import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as auth from '../services/auth'
import * as birds from '../services/birds'
import { loadDb, saveDb, setLatency, uid } from '../services/db'
import * as matches from '../services/matches'
import * as notifications from '../services/notifications'
import * as requests from '../services/requests'
import * as swipes from '../services/swipes'

beforeEach(() => {
  localStorage.clear()
  setLatency(0)
})

describe('db (siembra)', () => {
  it('carga 15 pajaritos, 3 protectoras y usuarios demo', () => {
    const db = loadDb()
    expect(db.birds).toHaveLength(15)
    expect(db.shelters).toHaveLength(3)
    expect(db.users).toHaveLength(2)
    expect(db.version).toBe(1)
  })

  it('persiste los cambios entre lecturas', async () => {
    await auth.login('ana@piar.app', 'demo1234')
    const db = loadDb()
    expect(db.users).toHaveLength(2)
  })
})

describe('auth', () => {
  it('registra un adoptante con sesión iniciada', async () => {
    const user = await auth.register({
      name: 'Pepe',
      email: 'pepe@test.com',
      password: 'secreto1',
      role: 'adoptante',
    })
    expect(user.role).toBe('adoptante')
    expect(user).not.toHaveProperty('passwordHash')
    expect(auth.getCurrentUserSync()?.id).toBe(user.id)
    // notificación de bienvenida
    const db = loadDb()
    expect(db.notifications.some((n) => n.userId === user.id && n.type === 'sistema')).toBe(true)
  })

  it('rechaza email inválido y contraseña corta', async () => {
    await expect(
      auth.register({ name: 'Pepe', email: 'no-es-email', password: 'secreto1', role: 'adoptante' }),
    ).rejects.toThrow(/correo/i)
    await expect(
      auth.register({ name: 'Pepe', email: 'ok@test.com', password: '123', role: 'adoptante' }),
    ).rejects.toThrow(/6 caracteres/)
  })

  it('rechaza registros duplicados (sin importar mayúsculas)', async () => {
    await expect(
      auth.register({ name: 'Ana', email: 'ANA@piar.app', password: 'otracosa', role: 'adoptante' }),
    ).rejects.toThrow(/ya existe/i)
  })

  it('hace login y logout correctamente', async () => {
    const user = await auth.login('ana@piar.app', 'demo1234')
    expect(user.name).toBe('Ana')
    await auth.logout()
    expect(auth.getCurrentUserSync()).toBeNull()
  })

  it('el login fallido no revela qué campo está mal', async () => {
    await expect(auth.login('ana@piar.app', 'mala')).rejects.toThrow(/no son correctos/)
    await expect(auth.login('nobody@piar.app', 'demo1234')).rejects.toThrow(/no son correctos/)
  })
})

describe('birds', () => {
  it('lista los 15 disponibles y filtra por especie, ciudad y edad', async () => {
    expect(await birds.listBirds()).toHaveLength(15)
    const periquitos = await birds.listBirds({ species: 'Periquito' })
    expect(periquitos.map((b) => b.name)).toEqual(['Tornasol'])
    const madrid = await birds.listBirds({ location: 'Madrid' })
    expect(madrid.length).toBeGreaterThan(0)
    expect(madrid.every((b) => b.location === 'Madrid')).toBe(true)
    const babies = await birds.listBirds({ maxAge: 1 })
    expect(babies.every((b) => b.age <= 1)).toBe(true)
  })

  it('combina filtros', async () => {
    const result = await birds.listBirds({ location: 'Madrid', size: 'pequeño', maxAge: 2 })
    expect(result.every((b) => b.location === 'Madrid' && b.size === 'pequeño' && b.age <= 2)).toBe(
      true,
    )
  })

  it('la protectora crea un pajarito válido', async () => {
    const bird = await birds.createBird('s1', {
      name: '  Naranja ',
      species: 'Pinzón',
      age: 2,
      sex: 'macho',
      size: 'pequeño',
      location: ' Madrid',
      photo: '/photos/jilguero.jpg',
      story: 'Historia de prueba.',
      personality: ['tranquilo'],
      health: 'Sano',
      energy: 3,
    })
    expect(bird.name).toBe('Naranja')
    expect(bird.location).toBe('Madrid')
    expect(bird.status).toBe('disponible')
    expect(await birds.listBirds()).toHaveLength(16)
  })

  it('valida los datos obligatorios al crear', async () => {
    await expect(
      birds.createBird('s1', {
        name: '',
        species: 'Pinzón',
        age: 2,
        sex: 'macho',
        size: 'pequeño',
        location: 'Madrid',
        photo: '/photos/jilguero.jpg',
        story: 'x',
        personality: [],
        health: 'x',
        energy: 3,
      }),
    ).rejects.toThrow(/nombre/)
    await expect(
      birds.createBird('s1', {
        name: 'X',
        species: 'Pinzón',
        age: -1,
        sex: 'macho',
        size: 'pequeño',
        location: 'Madrid',
        photo: '/photos/jilguero.jpg',
        story: 'x',
        personality: [],
        health: 'x',
        energy: 3,
      }),
    ).rejects.toThrow(/edad/i)
  })

  it('no deja borrar un pajarito con solicitudes activas', async () => {
    const bird = await birds.createBird('s1', {
      name: 'Temporal',
      species: 'Pinzón',
      age: 1,
      sex: 'macho',
      size: 'pequeño',
      location: 'Madrid',
      photo: '/photos/jilguero.jpg',
      story: 'x',
      personality: [],
      health: 'x',
      energy: 3,
    })
    const db = loadDb()
    db.requests.push({
      id: uid('r'),
      matchId: 'm_fake',
      birdId: bird.id,
      userId: 'u1',
      message: 'Quiero adoptarle',
      status: 'pendiente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    saveDb(db)

    await expect(birds.deleteBird(bird.id)).rejects.toThrow(/solicitudes/)
    // sin solicitudes sí se puede
    const db2 = loadDb()
    db2.requests = []
    saveDb(db2)
    await birds.deleteBird(bird.id)
    expect(loadDb().birds.some((b) => b.id === bird.id)).toBe(false)
  })
})

describe('swipes y matches', () => {
  /** Deja un match listo para el usuario demo sobre el pájaro indicado */
  async function makeMatch(birdId: string) {
    await swipes.sendSwipe('u1', birdId, 'superlike')
    return swipes.processPendingReviews(Date.now() + 60_000)[0]
  }

  it('el feed excluye pajaritos ya valorados', async () => {
    const feed = await swipes.getFeed('u1')
    expect(feed).toHaveLength(15)
    await swipes.sendSwipe('u1', 'b1', 'dislike')
    const after = await swipes.getFeed('u1')
    expect(after.some((b) => b.id === 'b1')).toBe(false)
    expect(after).toHaveLength(14)
  })

  it('el feed de la protectora excluye sus propios pájaros', async () => {
    const feed = await swipes.getFeed('u2') // Lucía, shelter s1
    expect(feed.length).toBeGreaterThan(0)
    expect(feed.some((b) => b.shelterId === 's1')).toBe(false)
  })

  it('un dislike no genera revisión de la protectora', async () => {
    await swipes.sendSwipe('u1', 'b1', 'dislike')
    expect(swipes.pendingReviewCount()).toBe(0)
    expect(swipes.processPendingReviews(Date.now() + 60_000)).toHaveLength(0)
  })

  it('el primer like siempre termina en match y notifica a ambos lados', async () => {
    await swipes.sendSwipe('u1', 'b1', 'like')
    // aún no venció: no hay match
    expect(swipes.processPendingReviews(Date.now() - 1)).toHaveLength(0)

    const created = swipes.processPendingReviews(Date.now() + 60_000)
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({ userId: 'u1', birdId: 'b1', status: 'aceptado' })

    const userNotes = (await notifications.listNotifications('u1')).filter((n) => n.type === 'match')
    expect(userNotes[0].title).toMatch(/match/i)
    const shelterNotes = (await notifications.listNotifications('u2')).filter(
      (n) => n.type === 'match',
    )
    expect(shelterNotes).toHaveLength(1)

    expect(await matches.listMatchesForUser('u1')).toHaveLength(1)
    expect(await matches.listMatchesForShelter('s1')).toHaveLength(1)
  })

  it('es idempotente: no duplica el match si se procesa dos veces', async () => {
    await swipes.sendSwipe('u1', 'b1', 'like')
    swipes.processPendingReviews(Date.now() + 60_000)
    expect(swipes.processPendingReviews(Date.now() + 60_000)).toHaveLength(0)
    expect(loadDb().matches).toHaveLength(1)
  })

  it('likes posteriores dependen de la probabilidad de la protectora', async () => {
    await makeMatch('b1') // primer match ya creado

    vi.spyOn(Math, 'random').mockReturnValue(0.9) // > 0.6 → sin match
    await swipes.sendSwipe('u1', 'b2', 'like')
    expect(swipes.processPendingReviews(Date.now() + 60_000)).toHaveLength(0)

    vi.spyOn(Math, 'random').mockReturnValue(0.1) // < 0.6 → sí match
    await swipes.sendSwipe('u1', 'b3', 'like')
    expect(swipes.processPendingReviews(Date.now() + 60_000)).toHaveLength(1)
  })

  it('el superlike siempre hace match', async () => {
    await makeMatch('b1')
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    await swipes.sendSwipe('u1', 'b2', 'superlike')
    expect(swipes.processPendingReviews(Date.now() + 60_000)).toHaveLength(1)
  })

  it('deshacer devuelve el pajarito al feed', async () => {
    await swipes.sendSwipe('u1', 'b1', 'dislike')
    expect((await swipes.getFeed('u1')).some((b) => b.id === 'b1')).toBe(false)
    await swipes.undoSwipe('u1', 'b1')
    expect((await swipes.getFeed('u1')).some((b) => b.id === 'b1')).toBe(true)
  })

  it('no deja valorar dos veces al mismo pajarito', async () => {
    await swipes.sendSwipe('u1', 'b1', 'dislike')
    await expect(swipes.sendSwipe('u1', 'b1', 'like')).rejects.toThrow(/valorado/)
  })
})

describe('solicitudes de adopción', () => {
  async function makeMatch(birdId: string) {
    await swipes.sendSwipe('u1', birdId, 'superlike')
    return swipes.processPendingReviews(Date.now() + 60_000)[0]
  }

  it('valida el mensaje y que exista un match', async () => {
    await expect(requests.createRequest('u1', 'nope', 'quiero adoptar')).rejects.toThrow(
      /match/i,
    )
    const match = await makeMatch('b1')
    await expect(requests.createRequest('u1', match.id, 'corto')).rejects.toThrow(/10 caracteres/)
  })

  it('rechaza la segunda solicitud para el mismo match', async () => {
    const match = await makeMatch('b1')
    await requests.createRequest('u1', match.id, 'Quiero que viva conmigo')
    await expect(
      requests.createRequest('u1', match.id, 'Otra vez por favor quiero'),
    ).rejects.toThrow(/ya enviaste/i)
  })

  it('flujo completo: solicitar → aprobar → completar cambia el estado del pájaro', async () => {
    const match = await makeMatch('b1')
    const req = await requests.createRequest('u1', match.id, 'Tengo jaula grande y mucho cariño')
    expect(req.status).toBe('pendiente')

    // la protectora recibe la solicitud
    const shelterNotes = (await notifications.listNotifications('u2')).filter(
      (n) => n.type === 'solicitud',
    )
    expect(shelterNotes).toHaveLength(1)

    const aprobada = await requests.updateRequestStatus(req.id, 'u2', 'aprobada')
    expect(aprobada.status).toBe('aprobada')
    expect((await birds.getBird('b1')).status).toBe('reservado')

    const completada = await requests.updateRequestStatus(req.id, 'u2', 'completada')
    expect(completada.status).toBe('completada')
    expect((await birds.getBird('b1')).status).toBe('adoptado')
    // desaparece del feed
    expect((await swipes.getFeed('u1')).some((b) => b.id === 'b1')).toBe(false)
    expect((await requests.listRequestsForUser('u1'))[0].birdName).toBe('Tornasol')
  })

  it('al rechazar, el pajarito vuelve a estar disponible', async () => {
    const match = await makeMatch('b2')
    const req = await requests.createRequest('u1', match.id, 'Le prometo jaula y amor')
    await requests.updateRequestStatus(req.id, 'u2', 'rechazada')
    expect((await birds.getBird('b2')).status).toBe('disponible')
  })

  it('no permite transiciones inválidas ni que otra protectora gestione', async () => {
    const match = await makeMatch('b1')
    const req = await requests.createRequest('u1', match.id, 'Solicitud con texto suficiente')
    // u1 es adoptante, no protectora
    await expect(requests.updateRequestStatus(req.id, 'u1', 'aprobada')).rejects.toThrow(
      /protectora/i,
    )
    await requests.updateRequestStatus(req.id, 'u2', 'aprobada')
    await expect(requests.updateRequestStatus(req.id, 'u2', 'rechazada')).rejects.toThrow(
      /no se puede pasar/i,
    )
  })

  it('impide aprobar si otra solicitud reservó primero al pájaro', async () => {
    // primera solicitud sobre b1
    const match1 = await makeMatch('b1')
    const req1 = await requests.createRequest('u1', match1.id, 'Solicitud con texto suficiente')

    // otro adoptante interesado en el mismo pájaro
    const otro = await auth.register({
      name: 'Bruno',
      email: 'bruno@test.com',
      password: 'secreto1',
      role: 'adoptante',
    })
    await swipes.sendSwipe(otro.id, 'b1', 'superlike')
    const match2 = swipes.processPendingReviews(Date.now() + 60_000).at(-1)!
    const req2 = await requests.createRequest(otro.id, match2.id, 'También yo quiero adoptarle')

    // la protectora aprueba la primera…
    await requests.updateRequestStatus(req1.id, 'u2', 'aprobada')
    // …y la segunda ya no puede aprobarse
    await expect(requests.updateRequestStatus(req2.id, 'u2', 'aprobada')).rejects.toThrow(
      /reservado/i,
    )
  })
})

describe('notificaciones', () => {
  it('cuenta no leídas y las marca como leídas', async () => {
    await swipes.sendSwipe('u1', 'b1', 'superlike')
    swipes.processPendingReviews(Date.now() + 60_000)
    expect(notifications.unreadCountSync('u1')).toBeGreaterThan(0)

    await notifications.markAllNotificationsRead('u1')
    expect(notifications.unreadCountSync('u1')).toBe(0)
  })
})
