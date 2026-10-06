import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Role } from '../types'
import { useApp } from '../store/context'

/**
 * Guardia de rutas:
 * - sin sesión → /login
 * - rol incorrecto → se redirige a su pantalla principal
 */
export function RequireAuth({ role }: { role?: Role }) {
  const { user } = useApp()
  const location = useLocation()

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (role && user.role !== role)
    return <Navigate to={user.role === 'protectora' ? '/dashboard' : '/'} replace />
  // la protectora no tiene feed: su casa es el panel
  if (!role && user.role === 'protectora' && location.pathname === '/')
    return <Navigate to="/dashboard" replace />
  return <Outlet />
}

/** Solo para invititos: si ya hay sesión, se manda a casa */
export function RequireGuest() {
  const { user } = useApp()
  if (user) return <Navigate to={user.role === 'protectora' ? '/dashboard' : '/'} replace />
  return <Outlet />
}
