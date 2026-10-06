import { fakeHash } from '../data/users'
import type { PublicUser, Role, User } from '../types'
import {
  clearSession,
  delay,
  loadDb,
  loadSessionUserId,
  now,
  saveSessionUserId,
  uid,
  updateDb,
} from './db'
import { ApiError } from './errors'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface RegisterInput {
  name: string
  email: string
  password: string
  role: Role
  /** requerido si role === 'protectora' */
  shelterId?: string
  avatar?: string
}

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...rest } = user
  return rest
}

/** Usuario logueado de forma síncrona (para hidratar la UI sin parpadeo) */
export function getCurrentUserSync(): PublicUser | null {
  const id = loadSessionUserId()
  if (!id) return null
  const user = loadDb().users.find((u) => u.id === id)
  return user ? toPublicUser(user) : null
}

export async function register(input: RegisterInput): Promise<PublicUser> {
  await delay()
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()

  if (name.length < 2) throw new ApiError('Escribe tu nombre (mínimo 2 caracteres).')
  if (!EMAIL_RE.test(email)) throw new ApiError('Ese correo no parece válido 📧')
  if (input.password.length < 6)
    throw new ApiError('La contraseña necesita al menos 6 caracteres.')

  const db = loadDb()
  if (db.users.some((u) => u.email.toLowerCase() === email))
    throw new ApiError('Ya existe una cuenta con ese correo.')

  if (input.role === 'protectora') {
    if (!input.shelterId) throw new ApiError('Elige la protectora con la que colaboras.')
    if (!db.shelters.some((s) => s.id === input.shelterId))
      throw new ApiError('Esa protectora no existe.')
  }

  const user: User = {
    id: uid('u'),
    name,
    email,
    passwordHash: fakeHash(input.password),
    role: input.role,
    avatar: input.avatar ?? (input.role === 'protectora' ? '🦜' : '🐤'),
    shelterId: input.role === 'protectora' ? input.shelterId : undefined,
  }

  updateDb((d) => {
    d.users.push(user)
    d.notifications.push({
      id: uid('n'),
      userId: user.id,
      type: 'sistema',
      title: `¡Bienvenido/a a Piar, ${user.name}! 🎉`,
      body: 'Desliza para conocer a los pajaritos que buscan hogar.',
      read: false,
      createdAt: now(),
      link: '/',
    })
  })
  saveSessionUserId(user.id)
  return toPublicUser(user)
}

export async function login(email: string, password: string): Promise<PublicUser> {
  await delay()
  const normalized = email.trim().toLowerCase()
  const user = loadDb().users.find((u) => u.email.toLowerCase() === normalized)

  if (!user || user.passwordHash !== fakeHash(password))
    throw new ApiError('El correo o la contraseña no son correctos.')

  saveSessionUserId(user.id)
  return toPublicUser(user)
}

export async function logout(): Promise<void> {
  await delay(0)
  clearSession()
}
