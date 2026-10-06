import { createContext, useContext } from 'react'
import type { PublicUser } from '../types'
import type { RegisterInput } from '../services/auth'

export interface Toast {
  id: number
  message: string
  emoji: string
}

export interface AppState {
  user: PublicUser | null
  /** se incrementa cuando cambian datos compartidos (matches, solicitudes…) */
  version: number
  unread: number
  toasts: Toast[]
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  /** refresca versión + contador de no leídas */
  refresh: () => void
  toast: (message: string, emoji?: string) => void
}

export const AppContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
