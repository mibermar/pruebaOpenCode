import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SwipeCard, type SwipeCardHandle } from '../components/SwipeCard'
import { PopularSidebar } from '../components/PopularSidebar'
import { Button, CircleButton, EmptyState, Select, Spinner } from '../components/ui'
import type { Bird, BirdSize, SwipeAction } from '../types'
import { ApiError, birds as birdsApi, swipes as swipesApi } from '../services'
import { useApp } from '../store/context'

interface Filters {
  species: string
  location: string
  size: BirdSize | ''
  maxAge: string // '' | '1' | '3' | '10'
}

const EMPTY_FILTERS: Filters = { species: '', location: '', size: '', maxAge: '' }

export default function Feed() {
  const { user, toast } = useApp()
  const navigate = useNavigate()
  const topCard = useRef<SwipeCardHandle>(null)

  const [feed, setFeed] = useState<{ birds: Bird[]; applied: Filters; ready: boolean }>({
    birds: [],
    applied: EMPTY_FILTERS,
    ready: false,
  })
  const [index, setIndex] = useState(0)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [options, setOptions] = useState<{ species: string[]; locations: string[] }>({
    species: [],
    locations: [],
  })
  const [hint, setHint] = useState<string | null>(null)
  /** cambia para que el lateral «Los más deseados» recargue su ranking */
  const [topVersion, setTopVersion] = useState(0)
  const hintTimer = useRef<number>(0)
  const loadSeq = useRef(0)

  const filtersActive = Object.values(filters).some(Boolean)
  const birds = feed.birds
  // cargando = aún no hay datos o los filtros activos aún no se han aplicado
  const loading = !feed.ready || feed.applied !== filters

  const load = useCallback(
    async (f: Filters) => {
      if (!user) return
      const seq = ++loadSeq.current
      const list = await swipesApi.getFeed(user.id, {
        species: f.species || undefined,
        location: f.location || undefined,
        size: f.size || undefined,
        maxAge: f.maxAge ? Number(f.maxAge) : undefined,
      })
      if (seq !== loadSeq.current) return // una carga más reciente ha ganado
      setFeed({ birds: list, applied: f, ready: true })
      setIndex(0)
    },
    [user],
  )

  // opciones de los desplegables (todas las disponibles, sin filtros)
  useEffect(() => {
    birdsApi.listBirds().then((all) => setOptions(birdsApi.getFilterOptions(all)))
  }, [])

  useEffect(() => {
    load(filters)
    return () => window.clearTimeout(hintTimer.current)
  }, [load, filters])

  function showHint(message: string) {
    setHint(message)
    window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setHint(null), 3500)
  }

  async function decide(action: SwipeAction, bird: Bird) {
    setIndex((i) => i + 1) // optimista
    if (action === 'superlike') showHint('⭐ ¡Super like enviado! Este match está cantado 💫')
    else if (action === 'like')
      showHint('¡Like enviado! La protectora te responderá enseguida ✨')
    try {
      await swipesApi.sendSwipe(user!.id, bird.id, action)
      // el ranking de likes del lateral se actualiza al momento
      if (action !== 'dislike') setTopVersion((v) => v + 1)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se pudo enviar tu valoración', '⚠️')
      await load(filters) // re-sincroniza con el servidor simulado
    }
  }

  async function undo() {
    if (index === 0) return
    const bird = birds[index - 1]
    try {
      await swipesApi.undoSwipe(user!.id, bird.id)
      setIndex((i) => i - 1)
      setTopVersion((v) => v + 1)
      showHint(`¡${bird.name} vuelve a la pila! 🐣`)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se pudo deshacer', '⚠️')
    }
  }

  async function resetSeen() {
    try {
      for (const s of swipesApi.listSwipes(user!.id)) {
        await swipesApi.undoSwipe(user!.id, s.birdId)
      }
      await load(filters)
      setTopVersion((v) => v + 1)
      toast('¡Vuelta a empezar! 🐦')
    } catch {
      toast('No se pudieron reiniciar los pajaritos', '⚠️')
    }
  }

  const visible = birds.slice(index, index + 3)
  const remaining = Math.max(birds.length - index, 0)
  const canUndo = index > 0

  return (
    <div className="mx-auto flex w-full max-w-3xl items-start justify-center gap-6">
      <div className="mx-auto w-full max-w-md">
        {/* Filtros */}
        <section className="mb-4 rounded-3xl bg-white p-4 shadow-soft">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="flex w-full items-center justify-between font-extrabold"
          >
            <span>
              🔎 Filtros {filtersActive && <span className="text-coral-dark">· activos</span>}
            </span>
            <span className="text-sm font-bold text-cocoa-light">
              {showFilters ? 'ocultar' : 'mostrar'}
            </span>
          </button>
          {showFilters && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Select
                label="Especie"
                name="species"
                value={filters.species}
                onChange={(e) => setFilters({ ...filters, species: e.target.value })}
              >
                <option value="">Todas</option>
                {options.species.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Select
                label="Ciudad"
                name="location"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              >
                <option value="">Todas</option>
                {options.locations.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
              <Select
                label="Tamaño"
                name="size"
                value={filters.size}
                onChange={(e) => setFilters({ ...filters, size: e.target.value as BirdSize | '' })}
              >
                <option value="">Cualquiera</option>
                <option value="pequeño">Pequeño</option>
                <option value="mediano">Mediano</option>
                <option value="grande">Grande</option>
              </Select>
              <Select
                label="Edad"
                name="maxAge"
                value={filters.maxAge}
                onChange={(e) => setFilters({ ...filters, maxAge: e.target.value })}
              >
                <option value="">Cualquier edad</option>
                <option value="1">Hasta 1 año</option>
                <option value="3">Hasta 3 años</option>
                <option value="10">Hasta 10 años</option>
              </Select>
              {filtersActive && (
                <Button
                  variant="ghost"
                  className="col-span-2 !py-2 text-sm"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}
        </section>

        {/* Pila de tarjetas */}
        <div className="relative mx-auto aspect-4/5 w-full">
          {loading && (
            <div className="absolute inset-0 grid place-items-center">
              <Spinner label="Buscando pajaritos…" />
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="absolute inset-0 grid place-items-center">
              {filtersActive ? (
                <EmptyState emoji="🔍" title="Ningún pájaro con esos filtros">
                  Prueba a quitar alguno: a veces el amor llega inesperado.
                </EmptyState>
              ) : (
                <EmptyState emoji="🎉" title="¡Los has visto todos!">
                  Ya conoces a toda la banda. ¿Reinicias o afilas los filtros?
                </EmptyState>
              )}
            </div>
          )}

          {/* de atrás hacia delante para que la superior quede encima */}
          {visible
            .map((bird, i) => ({ bird, i }))
            .reverse()
            .map(({ bird, i }) => (
              <SwipeCard
                key={bird.id}
                ref={i === 0 ? topCard : undefined}
                bird={bird}
                stackIndex={i}
                onDecide={decide}
                onOpen={(b) => navigate(`/pajarito/${b.id}`)}
              />
            ))}
        </div>

        {/* Acciones */}
        <div className="mt-5 flex items-center justify-center gap-4">
          <CircleButton emoji="↩️" label="Deshacer último" size="sm" disabled={!canUndo} onClick={undo} />
          <CircleButton emoji="✖️" label="No me convence" tone="nope" onClick={() => topCard.current?.swipe('dislike')} />
          <CircleButton emoji="⭐" label="Super like" tone="super" onClick={() => topCard.current?.swipe('superlike')} />
          <CircleButton emoji="💚" label="Me encanta" tone="like" onClick={() => topCard.current?.swipe('like')} />
        </div>

        {hint && (
          <p className="mt-3 text-center text-sm font-bold text-mint-dark animate-pop" role="status">
            {hint}
          </p>
        )}

        {!loading && (
          <p className="mt-4 text-center text-sm font-semibold text-cocoa-light">
            {remaining > 0 ? (
              <>
                {remaining} {remaining === 1 ? 'pajarito esperando' : 'pajaritos esperando'} 💛
              </>
            ) : (
              <button type="button" onClick={resetSeen} className="font-bold text-coral-dark hover:underline">
                Reiniciar los pajaritos vistos 🔄
              </button>
            )}
          </p>
        )}

        {/* crédito de la foto visible */}
        {!loading && visible[0] && visible[0].photoCredit.artist && (
          <p className="mt-2 text-center text-[10px] text-cocoa-light/70">
            Foto:{' '}
            {visible[0].photoCredit.page ? (
              <a
                href={visible[0].photoCredit.page}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {visible[0].photoCredit.artist}
              </a>
            ) : (
              visible[0].photoCredit.artist
            )}{' '}
            · {visible[0].photoCredit.license}
          </p>
        )}
      </div>

      {/* Ranking de los más deseados (solo pantallas lg+) */}
      <PopularSidebar refreshKey={topVersion} />
    </div>
  )
}
