import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { shelters } from '../data/shelters'
import { handlePhotoError } from '../lib/photo'
import type { Bird } from '../types'
import { ApiError, birds as birdsApi, matches as matchesApi, swipes as swipesApi } from '../services'
import { Button, CircleButton, EmptyState, Spinner, Tag } from '../components/ui'
import { useApp } from '../store/context'

const STATUS_BADGE: Record<Bird['status'], { label: string; cls: string }> = {
  disponible: { label: 'En adopción 💚', cls: 'bg-mint text-cocoa' },
  reservado: { label: 'Reservado ⏳', cls: 'bg-sunflower text-cocoa' },
  adoptado: { label: 'Ya tiene hogar 🏡', cls: 'bg-sky text-cocoa' },
}

export default function BirdDetail() {
  const { id = '' } = useParams()
  const { user, toast, version } = useApp()
  const navigate = useNavigate()

  const [bird, setBird] = useState<Bird | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [alreadySwiped, setAlreadySwiped] = useState(false)
  const [hasMatch, setHasMatch] = useState(false)

  useEffect(() => {
    let active = true
    birdsApi
      .getBird(id)
      .then((b) => {
        if (!active) return
        setBird(b)
        if (user) {
          setAlreadySwiped(swipesApi.listSwipes(user.id).some((s) => s.birdId === id))
          setHasMatch(matchesApi.findMatch(user.id, id) != null)
        }
      })
      .catch((e: unknown) => active && setError(e instanceof ApiError ? e.message : 'Error'))
    return () => {
      active = false
    }
  }, [id, user, version])

  if (error) {
    return (
      <div className="mx-auto max-w-lg">
        <EmptyState emoji="🕊️" title={error}>
          Puede que otro usuario se le haya adelantado.
        </EmptyState>
        <div className="mt-6 text-center">
          <Link to="/">
            <Button>Volver al feed</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!bird) return <Spinner label="Cargando su historia…" />

  const shelter = shelters.find((s) => s.id === bird.shelterId)
  const badge = STATUS_BADGE[bird.status]
  const isAdoptante = user?.role === 'adoptante'

  async function decide(action: 'like' | 'dislike' | 'superlike') {
    if (!user || !bird) return
    setBusy(true)
    try {
      await swipesApi.sendSwipe(user.id, bird.id, action)
      toast(
        action === 'dislike'
          ? `Pasaste de ${bird.name} 👋`
          : `¡Like enviado a la protectora de ${bird.name}! ✨`,
        action === 'dislike' ? '👋' : '💚',
      )
      navigate('/')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se pudo enviar', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="mx-auto max-w-lg">
      <Link
        to="/"
        className="mb-3 inline-block rounded-full bg-white px-4 py-1.5 text-sm font-bold shadow-soft"
      >
        ← Volver
      </Link>

      <div className="relative overflow-hidden rounded-[2rem] bg-white shadow-card">
        <img
          src={bird.photo}
          alt={`${bird.name}, un ${bird.species.toLowerCase()}`}
          onError={handlePhotoError}
          className="aspect-4/5 w-full object-cover"
        />
        <span
          className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-extrabold ${badge.cls}`}
        >
          {badge.label}
        </span>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-12 text-white">
          <h1 className="text-4xl font-extrabold drop-shadow">{bird.name}</h1>
          <p className="text-sm font-semibold opacity-90">
            {bird.species} · <i>{bird.scientificName}</i>
          </p>
        </div>
      </div>

      {/* Ficha rápida */}
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Fact label="Edad" value={`${bird.age} ${bird.age === 1 ? 'año' : 'años'}`} />
        <Fact label="Sexo" value={bird.sex} />
        <Fact label="Tamaño" value={bird.size} />
        <Fact label="Ubicación" value={`📍 ${bird.location}`} />
      </dl>

      {/* Energía */}
      <div className="mt-4 rounded-3xl bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold">Energía</span>
          <span className="flex gap-1.5" aria-label={`Energía ${bird.energy} de 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`h-3 w-3 rounded-full ${n <= bird.energy ? 'bg-coral' : 'bg-cream-dark'}`}
              />
            ))}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {bird.personality.map((p) => (
            <Tag key={p}>{p}</Tag>
          ))}
        </div>
      </div>

      {/* Historia */}
      <section className="mt-4 rounded-3xl bg-white p-5 shadow-soft">
        <h2 className="mb-2 text-lg font-extrabold">Su historia 📖</h2>
        <p className="leading-relaxed text-cocoa">{bird.story}</p>
        <h3 className="mb-1 mt-4 text-sm font-extrabold">Salud 🩺</h3>
        <p className="text-sm text-cocoa-light">{bird.health}</p>
      </section>

      {/* Protectora */}
      {shelter && (
        <section className="mt-4 rounded-3xl border-2 border-dashed border-mint-dark/50 bg-mint/20 p-5">
          <h2 className="font-extrabold">Cuidado por {shelter.name} 🦜</h2>
          <p className="mt-1 text-sm text-cocoa-light">{shelter.description}</p>
        </section>
      )}

      {/* Acciones */}
      <div className="mt-5 mb-6">
        {hasMatch ? (
          <Link to="/matches" className="block">
            <Button className="w-full">💛 ¡Ya hay match! Ver solicitudes</Button>
          </Link>
        ) : isAdoptante && bird.status === 'disponible' ? (
          alreadySwiped ? (
            <p className="text-center text-sm font-bold text-cocoa-light">
              Ya has valorado a {bird.name} en el feed.
            </p>
          ) : (
            <div className="flex items-center justify-center gap-4">
              <CircleButton
                emoji="✖️"
                label="No me convence"
                tone="nope"
                disabled={busy}
                onClick={() => decide('dislike')}
              />
              <CircleButton
                emoji="⭐"
                label="Super like"
                tone="super"
                disabled={busy}
                onClick={() => decide('superlike')}
              />
              <CircleButton
                emoji="💚"
                label="Me encanta"
                tone="like"
                disabled={busy}
                onClick={() => decide('like')}
              />
            </div>
          )
        ) : (
          <p className="text-center text-sm font-bold text-cocoa-light">
            {bird.status === 'disponible'
              ? 'Inicia sesión como adoptante para valorarle.'
              : 'Este pajarito ya está en proceso de adopción.'}
          </p>
        )}
      </div>

      {/* Crédito de la foto */}
      <p className="mb-8 text-center text-[10px] text-cocoa-light/70">
        Foto:{' '}
        {bird.photoCredit.page ? (
          <a href={bird.photoCredit.page} target="_blank" rel="noreferrer" className="underline">
            {bird.photoCredit.artist}
          </a>
        ) : (
          bird.photoCredit.artist
        )}{' '}
        · {bird.photoCredit.license} · Wikimedia Commons
      </p>
    </article>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-soft">
      <dt className="text-xs font-bold text-cocoa-light">{label}</dt>
      <dd className="font-extrabold capitalize">{value}</dd>
    </div>
  )
}
