import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { shelters } from '../data/shelters'
import { Button, Spinner } from '../components/ui'
import {
  matches as matchesApi,
  requests as requestsApi,
  resetDb,
  swipes as swipesApi,
} from '../services'
import { useApp } from '../store/context'

export default function Profile() {
  const { user, version, logout } = useApp()
  const navigate = useNavigate()

  const [stats, setStats] = useState<{ swipes: number; likes: number; matches: number; reqs: number; done: number } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true
    const allSwipes = swipesApi.listSwipes(user.id)
    Promise.all([
      matchesApi.listMatchesForUser(user.id),
      requestsApi.listRequestsForUser(user.id),
    ]).then(([ms, rs]) => {
      if (!active) return
      setStats({
        swipes: allSwipes.length,
        likes: allSwipes.filter((s) => s.action !== 'dislike').length,
        matches: ms.length,
        reqs: rs.length,
        done: rs.filter((r) => r.status === 'completada').length,
      })
    })
    return () => {
      active = false
    }
  }, [user, version])

  if (!user) return <Spinner />

  const shelter = shelters.find((s) => s.id === user.shelterId)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  async function restartDemo() {
    resetDb() // vuelve a los datos de fábrica y limpia la sesión
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-md">
      <section className="rounded-3xl bg-white p-6 text-center shadow-card">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-cream-dark text-5xl">
          {user.avatar}
        </div>
        <h1 className="mt-3 text-2xl font-extrabold">{user.name}</h1>
        <p className="text-sm text-cocoa-light">{user.email}</p>
        <span className="mt-2 inline-block rounded-full bg-cream-dark px-3 py-1 text-xs font-extrabold">
          {user.role === 'protectora' ? `🦜 Protectora${shelter ? ` · ${shelter.name}` : ''}` : '🐤 Adoptante'}
        </span>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-soft">
        <h2 className="mb-3 font-extrabold">Tu actividad</h2>
        {!stats ? (
          <Spinner label="Calculando…" />
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Valoraciones" value={stats.swipes} />
            <Stat label="Likes enviados" value={stats.likes} />
            <Stat label="Matches" value={stats.matches} />
            <Stat label="Solicitudes" value={stats.reqs} />
            <Stat label="Adopciones" value={stats.done} />
          </dl>
        )}
      </section>

      {user.role === 'adoptante' && (
        <Link to="/adopciones" className="mt-4 block">
          <Button variant="secondary" className="w-full">
            🏡 Ver mis adopciones
          </Button>
        </Link>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <Button variant="ghost" onClick={handleLogout}>
          Cerrar sesión
        </Button>

        {confirmReset ? (
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-coral/10 px-4 py-3">
            <span className="text-sm font-bold text-coral-dark">
              ¿Borrar todo y volver a la demo de fábrica?
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => setConfirmReset(false)}>
                No
              </Button>
              <Button
                className="!px-3 !py-1.5 text-xs"
                onClick={() => {
                  void restartDemo()
                }}
              >
                Sí, reiniciar
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="text-center text-xs font-bold text-cocoa-light hover:text-coral-dark"
          >
            🧹 Reiniciar la demo (borra likes, matches y solicitudes)
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-cream px-3 py-2 text-center">
      <dt className="text-[11px] font-bold text-cocoa-light">{label}</dt>
      <dd className="text-xl font-extrabold text-coral-dark">{value}</dd>
    </div>
  )
}
