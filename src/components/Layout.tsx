import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { AppNotification } from '../types'
import { notifications as notificationsApi } from '../services'
import { useApp } from '../store/context'
import { Button } from './ui'

const TYPE_ICON: Record<AppNotification['type'], string> = {
  match: '💛',
  solicitud: '📝',
  estado: '📣',
  sistema: '🎉',
}

export default function Layout() {
  const { user, toasts, refresh, logout } = useApp()
  const navigate = useNavigate()

  const links =
    user?.role === 'protectora'
      ? [{ to: '/dashboard', emoji: '📋', label: 'Panel' }]
      : [
          { to: '/', emoji: '🐦', label: 'Descubrir' },
          { to: '/matches', emoji: '💛', label: 'Matches' },
          { to: '/adopciones', emoji: '🏡', label: 'Adopciones' },
        ]

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-cream-dark bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2" aria-label="Piar, inicio">
            <img src="/favicon.svg" alt="" className="h-9 w-9" />
            <span className="hidden text-xl font-extrabold text-coral-dark sm:block">Piar</span>
          </NavLink>

          <nav className="ml-2 flex flex-1 items-center gap-1 overflow-x-auto">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition-colors ${
                    isActive ? 'bg-coral text-white shadow-soft' : 'text-cocoa hover:bg-white'
                  }`
                }
              >
                <span aria-hidden>{l.emoji}</span>
                <span className="hidden sm:inline">{l.label}</span>
              </NavLink>
            ))}
          </nav>

          <Bell />

          <button
            type="button"
            onClick={() => navigate('/perfil')}
            className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-3 shadow-soft transition-transform active:scale-95"
            title="Mi perfil"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-cream-dark text-lg">
              {user?.avatar}
            </span>
            <span className="hidden text-sm font-bold sm:block">{user?.name}</span>
          </button>

          <Button
            variant="ghost"
            className="!px-3 !py-2 text-sm"
            onClick={async () => {
              await logout()
              navigate('/login')
              refresh()
            }}
          >
            Salir
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      {/* Aviso flotante de toasts */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-pop rounded-full bg-cocoa px-5 py-3 text-sm font-bold text-white shadow-card"
          >
            <span className="mr-2">{t.emoji}</span>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Campana de notificaciones con panel desplegable */
function Bell() {
  const { user, unread, version, refresh } = useApp()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (!open || !user) return
    let active = true
    notificationsApi.listNotifications(user.id).then((list) => {
      if (active) setItems(list)
    })
    return () => {
      active = false
    }
  }, [open, version, user])

  async function toggleAllRead() {
    if (!user) return
    await notificationsApi.markAllNotificationsRead(user.id)
    refresh()
    setOpen(false)
  }

  async function onItemClick(n: AppNotification) {
    await notificationsApi.markNotificationRead(n.id)
    refresh()
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ''}`}
        className="relative grid h-10 w-10 place-items-center rounded-full bg-white shadow-soft transition-transform active:scale-90"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] font-extrabold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar notificaciones"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-cream-dark px-4 py-3">
              <span className="font-extrabold">Notificaciones</span>
              {items.some((n) => !n.read) && (
                <button
                  type="button"
                  onClick={toggleAllRead}
                  className="text-xs font-bold text-coral-dark hover:underline"
                >
                  Marcar todo leído
                </button>
              )}
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {items.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-cocoa-light">
                  Aún no tienes notificaciones 🕊️
                </li>
              )}
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onItemClick(n)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-cream ${
                      n.read ? 'opacity-60' : ''
                    }`}
                  >
                    <span className="text-xl">{TYPE_ICON[n.type]}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{n.title}</span>
                      <span className="block text-xs text-cocoa-light">{n.body}</span>
                      <span className="mt-0.5 block text-[10px] text-cocoa-light/70">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                    {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-coral" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}
