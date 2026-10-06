import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { handlePhotoError } from '../lib/photo'
import type { RequestWithContext } from '../services/requests'
import { requests as requestsApi } from '../services'
import { Button, EmptyState, RequestBadge, Spinner } from '../components/ui'
import { useApp } from '../store/context'

const STATUS_HELP: Record<string, string> = {
  pendiente: 'La protectora revisará tu solicitud en breve.',
  aprobada: '¡Genial! Coordina la entrega con la protectora.',
  rechazada: 'No te preocupes: hay más pajaritos esperando hogar.',
  completada: '¡Felicidades! La adopción está completa.',
}

export default function Adoptions() {
  const { user, version } = useApp()
  const [list, setList] = useState<RequestWithContext[] | null>(null)

  useEffect(() => {
    if (!user) return
    requestsApi.listRequestsForUser(user.id).then(setList)
  }, [user, version])

  if (!list) return <Spinner label="Cargando tus adopciones…" />

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-md">
        <EmptyState emoji="🏡" title="Todavía no has solicitado ninguna adopción">
          Cuando tengas un match, pulsa «Solicitar adopción» y podrás seguir su estado aquí.
        </EmptyState>
        <div className="mt-6 text-center">
          <Link to="/">
            <Button>Ver pajaritos</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-2xl font-extrabold">Mis adopciones 🏡</h1>
      <ul className="space-y-4">
        {list.map((r) => (
          <li key={r.id} className="flex gap-4 rounded-3xl bg-white p-4 shadow-soft">
            <Link to={`/pajarito/${r.birdId}`} className="shrink-0">
              <img
                src={r.birdPhoto}
                alt={r.birdName}
                onError={handlePhotoError}
                className="h-20 w-20 rounded-2xl object-cover"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold">{r.birdName}</h2>
                <RequestBadge status={r.status} />
              </div>
              <p className="text-sm text-cocoa-light">🦜 {r.shelterName}</p>
              <p className="mt-1 text-sm text-cocoa">{STATUS_HELP[r.status]}</p>
              <p className="mt-2 text-xs text-cocoa-light/70">
                Enviada el {new Date(r.createdAt).toLocaleDateString('es-ES')}
                {r.updatedAt !== r.createdAt &&
                  ` · actualizada el ${new Date(r.updatedAt).toLocaleDateString('es-ES')}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
