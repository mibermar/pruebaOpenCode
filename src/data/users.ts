import type { User } from '../types'

/**
 * Hash simulado: en un backend real sería un bcrypt/argon2.
 * Para la demo basta con que no se guarde la contraseña en claro.
 */
export function fakeHash(password: string): string {
  let h = 0
  for (let i = 0; i < password.length; i++) {
    h = (h * 31 + password.charCodeAt(i)) | 0
  }
  return `demo$${(h >>> 0).toString(16)}`
}

export const seedUsers: User[] = [
  {
    id: 'u1',
    name: 'Ana',
    email: 'ana@piar.app',
    passwordHash: fakeHash('demo1234'),
    role: 'adoptante',
    avatar: '🐤',
  },
  {
    id: 'u2',
    name: 'Lucía',
    email: 'lucia@piar.app',
    passwordHash: fakeHash('demo1234'),
    role: 'protectora',
    avatar: '🦜',
    shelterId: 's1',
  },
]
