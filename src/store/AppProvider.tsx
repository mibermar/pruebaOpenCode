import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { PublicUser } from '../types'
import { auth, loadDb, swipes } from '../services'
import type { RegisterInput } from '../services/auth'
import { AppContext, type Toast } from './context'

const TOAST_MS = 4500

function countUnread(userId: string): number {
  return loadDb().notifications.filter((n) => n.userId === userId && !n.read).length
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(() => auth.getCurrentUserSync())
  const [version, setVersion] = useState(0)
  const [unread, setUnread] = useState(() => {
    const current = auth.getCurrentUserSync()
    return current ? countUnread(current.id) : 0
  })
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const refresh = useCallback(() => {
    setVersion((v) => v + 1)
    setUnread(user ? countUnread(user.id) : 0)
  }, [user])

  const toast = useCallback((message: string, emoji = '✨') => {
    const id = ++toastId.current
    setToasts((t) => [...t, { id, message, emoji }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), TOAST_MS)
  }, [])

  // Ticker: resuelve las revisiones de las protectoras (simula tiempo de respuesta real)
  useEffect(() => {
    if (!user) return
    const tick = () => {
      const created = swipes.processPendingReviews()
      if (created.length === 0) return
      const db = loadDb()
      for (const match of created) {
        if (match.userId !== user.id) continue
        const bird = db.birds.find((b) => b.id === match.birdId)
        toast(`¡Tienes match con ${bird?.name ?? 'un pajarito'}!`, '💛')
      }
      setUnread(countUnread(user.id))
      setVersion((v) => v + 1)
    }
    tick()
    const id = setInterval(tick, 2000)
    return () => clearInterval(id)
  }, [user, toast])

  const login = useCallback(async (email: string, password: string) => {
    const u = await auth.login(email, password)
    setUser(u)
    setUnread(countUnread(u.id))
    setVersion((v) => v + 1)
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const u = await auth.register(input)
    setUser(u)
    setUnread(countUnread(u.id))
    setVersion((v) => v + 1)
  }, [])

  const logout = useCallback(async () => {
    await auth.logout()
    setUser(null)
    setUnread(0)
  }, [])

  const value = useMemo(
    () => ({ user, version, unread, toasts, login, register, logout, refresh, toast }),
    [user, version, unread, toasts, login, register, logout, refresh, toast],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
