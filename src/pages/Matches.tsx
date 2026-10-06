import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { shelters } from '../data/shelters'
import { handlePhotoError } from '../lib/photo'
import type { MatchWithBird } from '../services/matches'
import type { RequestWithContext } from '../services/requests'
import { ApiError, matches as matchesApi, requests as requestsApi } from '../services'
import { Button, EmptyState, RequestBadge, Spinner } from '../components/ui'
import { useApp } from '../store/context'

export default function Matches() {
  const { user, version, refresh, toast } = useApp()
  const [list, setList] = useState<MatchWithBird[] | null>(null)
  const [reqs, setReqs] = useState<RequestWithContext[]>([])
  const [openForm, setOpenForm] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    matchesApi.listMatchesForUser(user.id).then(setList)
    requestsApi.listRequestsForUser(user.id).then(setReqs)
  }, [user, version])

  async function submit(e: FormEvent, matchId: string) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    try {
      await requestsApi.createRequest(user.id, matchId, message)
      toast('Solicitud enviada a la protectora 📝')
      setMessage('')
      setOpenForm(null)
      refresh()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se pudo enviar', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  if (!list) return <Spinner label="Buscando tus matches…" />

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-md">
        <EmptyState emoji="💛" title="Aún no hay matches">
          Sigue deslizando: cuando la protectora corresponda a tu like, aparecerá aquí.
        </EmptyState>
        <div className="mt-6 text-center">
          <Link to="/">
            <Button>Descubrir pajaritos</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-2xl font-extrabold">Tus matches 💛</h1>
      <ul className="space-y-4">
        {list.map((m) => {
          const shelter = shelters.find((s) => s.id === m.shelterId)
          const req = reqs.find((r) => r.matchId === m.id)
          const isOpen = openForm === m.id
          return (
            <li key={m.id} className="overflow-hidden rounded-3xl bg-white shadow-soft">
              <div className="flex gap-4 p-4">
                <Link to={`/pajarito/${m.bird.id}`} className="shrink-0">
                  <img
                    src={m.bird.photo}
                    alt={m.bird.name}
                    onError={handlePhotoError}
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold">{m.bird.name}</h2>
                    {req && <RequestBadge status={req.status} />}
                  </div>
                  <p className="text-sm text-cocoa-light">
                    {m.bird.species} · {m.bird.location}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-mint-dark">
                    🦜 {shelter?.name ?? 'Protectora'}
                  </p>

                  {req ? (
                    <p className="mt-2 text-sm text-cocoa-light">
                      Solicitud enviada · {new Date(req.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  ) : (
                    <Button
                      className="mt-2 !px-4 !py-1.5 text-sm"
                      onClick={() => setOpenForm(isOpen ? null : m.id)}
                    >
                      {isOpen ? 'Cancelar' : 'Solicitar adopción 💌'}
                    </Button>
                  )}
                </div>
              </div>

              {isOpen && (
                <form onSubmit={(e) => submit(e, m.id)} className="border-t border-cream-dark p-4">
                  <label className="mb-1.5 block text-sm font-bold" htmlFor={`msg-${m.id}`}>
                    Cuéntale a {shelter?.name} por qué queréis adoptar a {m.bird.name}
                  </label>
                  <textarea
                    id={`msg-${m.id}`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    required
                    minLength={10}
                    placeholder="Tenemos una jaula grande, un balcón soleado y mucho cariño…"
                    className="w-full rounded-2xl border-2 border-cream-dark bg-white px-4 py-3 text-sm outline-none focus:border-coral"
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-4 !py-2 text-sm"
                      onClick={() => setOpenForm(null)}
                    >
                      Volver
                    </Button>
                    <Button type="submit" disabled={busy} className="!px-4 !py-2 text-sm">
                      {busy ? 'Enviando…' : 'Enviar solicitud'}
                    </Button>
                  </div>
                </form>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
