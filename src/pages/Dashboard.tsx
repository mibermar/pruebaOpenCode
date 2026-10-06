import { useEffect, useState } from 'react'
import BirdForm from '../components/BirdForm'
import { Button, EmptyState, RequestBadge, Spinner } from '../components/ui'
import { handlePhotoError } from '../lib/photo'
import type { Bird } from '../types'
import {
  ApiError,
  birds as birdsApi,
  matches as matchesApi,
  requests as requestsApi,
} from '../services'
import type { RequestWithContext } from '../services/requests'
import { useApp } from '../store/context'

type Tab = 'solicitudes' | 'pajaritos'

const BIRD_STATUS: Record<Bird['status'], string> = {
  disponible: 'En adopción 💚',
  reservado: 'Reservado ⏳',
  adoptado: 'Adoptado 🏡',
}

export default function Dashboard() {
  const { user, version, refresh, toast } = useApp()
  const shelterId = user?.shelterId ?? ''

  const [tab, setTab] = useState<Tab>('solicitudes')
  const [reqs, setReqs] = useState<RequestWithContext[] | null>(null)
  const [birds, setBirds] = useState<Bird[] | null>(null)
  const [matchCount, setMatchCount] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Bird | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    if (!shelterId) return
    requestsApi.listRequestsForShelter(shelterId).then(setReqs)
    birdsApi.listShelterBirds(shelterId).then(setBirds)
    matchesApi.listMatchesForShelter(shelterId).then((m) => setMatchCount(m.length))
  }, [shelterId, version])

  async function act(requestId: string, status: 'aprobada' | 'rechazada' | 'completada') {
    try {
      await requestsApi.updateRequestStatus(requestId, user!.id, status)
      const msg = {
        aprobada: 'Solicitud aprobada 💚',
        rechazada: 'Solicitud rechazada',
        completada: '¡Adopción completada! 🏡',
      }[status]
      toast(msg, status === 'aprobada' ? '💚' : status === 'completada' ? '🏡' : '👋')
      refresh()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se pudo actualizar', '⚠️')
    }
  }

  async function remove(id: string) {
    try {
      await birdsApi.deleteBird(id)
      toast('Pajarito eliminado del listado')
      setConfirmDelete(null)
      refresh()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se pudo borrar', '⚠️')
    }
  }

  if (!reqs || !birds) return <Spinner label="Preparando el panel…" />

  const pendientes = reqs.filter((r) => r.status === 'pendiente')
  const completadas = reqs.filter((r) => r.status === 'completada')

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Panel de la protectora 🦜</h1>
          <p className="text-sm text-cocoa-light">Gestiona tus pajaritos y solicitudes</p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          + Nuevo pajarito
        </Button>
      </header>

      {/* Resumen */}
      <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat emoji="🐦" value={birds.length} label="Pajaritos" />
        <Stat emoji="⏳" value={pendientes.length} label="Pendientes" />
        <Stat emoji="💛" value={matchCount} label="Matches" />
        <Stat emoji="🏡" value={completadas.length} label="Adoptados" />
      </section>

      {/* Pestañas */}
      <div className="mb-4 flex gap-2">
        {(
          [
            ['solicitudes', `Solicitudes${pendientes.length ? ` (${pendientes.length})` : ''}`],
            ['pajaritos', 'Mis pajaritos'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm font-extrabold transition-colors ${
              tab === id ? 'bg-coral text-white shadow-soft' : 'bg-white text-cocoa hover:bg-cream'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'solicitudes' && (
        <section>
          {reqs.length === 0 ? (
            <EmptyState emoji="📭" title="Todavía no hay solicitudes">
              Cuando alguien con match te escriba, aparecerá aquí.
            </EmptyState>
          ) : (
            <ul className="space-y-4">
              {reqs.map((r) => (
                <li key={r.id} className="rounded-3xl bg-white p-4 shadow-soft">
                  <div className="flex gap-4">
                    <img
                      src={r.birdPhoto}
                      alt={r.birdName}
                      onError={handlePhotoError}
                      className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-extrabold">{r.birdName}</h3>
                        <RequestBadge status={r.status} />
                      </div>
                      <p className="text-sm text-cocoa-light">
                        🐤 {r.adoptanteName} · {new Date(r.createdAt).toLocaleDateString('es-ES')}
                      </p>
                      <p className="mt-2 rounded-2xl bg-cream px-3 py-2 text-sm italic text-cocoa">
                        «{r.message}»
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    {r.status === 'pendiente' && (
                      <>
                        <Button variant="danger" className="!px-4 !py-1.5 text-sm" onClick={() => act(r.id, 'rechazada')}>
                          Rechazar
                        </Button>
                        <Button variant="secondary" className="!px-4 !py-1.5 text-sm" onClick={() => act(r.id, 'aprobada')}>
                          Aprobar 💚
                        </Button>
                      </>
                    )}
                    {r.status === 'aprobada' && (
                      <Button variant="secondary" className="!px-4 !py-1.5 text-sm" onClick={() => act(r.id, 'completada')}>
                        Marcar entregada 🏡
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'pajaritos' && (
        <section>
          {birds.length === 0 ? (
            <EmptyState emoji="🐣" title="Aún no tienes pajaritos publicados">
              Crea la primera ficha para que alguien se enamore.
            </EmptyState>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {birds.map((b) => (
                <li key={b.id} className="rounded-3xl bg-white p-3 shadow-soft">
                  <div className="flex gap-3">
                    <img
                      src={b.photo}
                      alt={b.name}
                      onError={handlePhotoError}
                      className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold">{b.name}</h3>
                        <span className="rounded-full bg-cream-dark px-2 py-0.5 text-[10px] font-extrabold">
                          {BIRD_STATUS[b.status]}
                        </span>
                      </div>
                      <p className="text-xs text-cocoa-light">
                        {b.species} · {b.age} a. · {b.location}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Button
                          variant="ghost"
                          className="!px-3 !py-1 text-xs"
                          onClick={() => {
                            setEditing(b)
                            setFormOpen(true)
                          }}
                        >
                          Editar
                        </Button>
                        {confirmDelete === b.id ? (
                          <>
                            <Button
                              variant="danger"
                              className="!px-3 !py-1 text-xs"
                              onClick={() => setConfirmDelete(null)}
                            >
                              No
                            </Button>
                            <Button
                              variant="danger"
                              className="!px-3 !py-1 text-xs"
                              onClick={() => remove(b.id)}
                            >
                              Sí, borrar
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="danger"
                            className="!px-3 !py-1 text-xs"
                            onClick={() => setConfirmDelete(b.id)}
                          >
                            Borrar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {formOpen && (
        <BirdForm
          bird={editing}
          shelterId={shelterId}
          onClose={() => setFormOpen(false)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

function Stat({ emoji, value, label }: { emoji: string; value: number; label: string }) {
  return (
    <div className="rounded-3xl bg-white p-4 text-center shadow-soft">
      <div className="text-xl">{emoji}</div>
      <div className="text-2xl font-extrabold text-coral-dark">{value}</div>
      <div className="text-xs font-bold text-cocoa-light">{label}</div>
    </div>
  )
}
