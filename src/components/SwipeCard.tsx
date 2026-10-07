import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { Bird, SwipeAction } from '../types'
import { handlePhotoError } from '../lib/photo'

export interface SwipeCardHandle {
  /** Fuerza la salida animada de la tarjeta en una dirección */
  swipe: (action: SwipeAction) => void
}

interface Props {
  bird: Bird
  /** 0 = arriba del todo (interactiva) */
  stackIndex: number
  onDecide: (action: SwipeAction, bird: Bird) => void
  onOpen: (bird: Bird) => void
}

const THRESHOLD_X = 110
const THRESHOLD_Y = -110
const FLY_MS = 340
/** Pausa premium del super like: la tarjeta "se carga" con destellos antes de salir */
const BURST_MS = 240
/** Ángulos de los destellos radiales del super like (12 repartidos por 360°) */
const SPARKS = Array.from({ length: 12 }, (_, i) => (i * 360) / 12)

/** Dirección de salida animada según la acción */
function exitVector(action: SwipeAction): { dx: number; dy: number } {
  if (action === 'like') return { dx: 700, dy: -80 }
  if (action === 'superlike') return { dx: 0, dy: -900 }
  return { dx: -700, dy: -80 }
}

export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard(
  { bird, stackIndex, onDecide, onOpen },
  ref,
) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [leaving, setLeaving] = useState<SwipeAction | null>(null)
  /** destello premium activo durante el super like */
  const [burst, setBurst] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(false)
  /** evita dobles commits entre puntero y teclado */
  const leavingRef = useRef(false)
  const isTop = stackIndex === 0
  /** mientras hay un super like en curso la tarjeta no responde a gestos ni teclas */
  const locked = burst || leaving !== null

  const commit = useCallback(
    (action: SwipeAction) => {
      if (leavingRef.current) return
      leavingRef.current = true
      const launch = () => {
        setLeaving(action)
        const { dx, dy } = exitVector(action)
        setPos({ x: dx, y: dy })
        window.setTimeout(() => onDecide(action, bird), FLY_MS)
      }
      if (action === 'superlike') {
        setBurst(true) // destello premium: estrella, destellos y halo antes de despegar
        window.setTimeout(launch, BURST_MS)
        return
      }
      launch()
    },
    [bird, onDecide],
  )

  useImperativeHandle(ref, () => ({ swipe: commit }), [commit])

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    if (!isTop || locked) return
    moved.current = false
    start.current = { x: e.clientX, y: e.clientY }
    setDragging(true)
    const el = e.currentTarget
    try {
      el.setPointerCapture?.(e.pointerId)
    } catch {
      // jsdom/móviles sin soporte: seguimos sin captura
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    if (!dragging || !start.current || locked) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved.current = true
    setPos({ x: dx, y: dy })
  }

  function onPointerUp() {
    if (!dragging || locked) return
    setDragging(false)
    const { x, y } = pos
    if (!moved.current) {
      // fue un toque: abrir ficha
      setPos({ x: 0, y: 0 })
      onOpen(bird)
      return
    }
    if (x > THRESHOLD_X) return commit('like')
    if (x < -THRESHOLD_X) return commit('dislike')
    if (y < THRESHOLD_Y) return commit('superlike')
    setPos({ x: 0, y: 0 }) // rebota al centro
  }

  function onPointerCancel() {
    if (locked) return
    setDragging(false)
    setPos({ x: 0, y: 0 })
  }

  const likeOpacity = Math.min(Math.max(pos.x / THRESHOLD_X, 0), 1)
  const nopeOpacity = Math.min(Math.max(-pos.x / THRESHOLD_X, 0), 1)
  const superOpacity = Math.min(Math.max(-pos.y / -THRESHOLD_Y, 0), 1)

  if (stackIndex > 2) return null

  const style: CSSProperties =
    stackIndex === 0
      ? {
          zIndex: 30,
          transform:
            burst && !leaving
              ? 'scale(1.06)' // se infla mientras carga el destello
              : `translate(${pos.x}px, ${pos.y}px) rotate(${pos.x / 18}deg)`,
          opacity: leaving ? 0 : 1,
          transition: dragging
            ? 'none'
            : `transform ${leaving ? FLY_MS : 450}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${FLY_MS}ms ease`,
        }
      : {
          zIndex: 30 - stackIndex * 10,
          transform: `translateY(${stackIndex * 14}px) scale(${1 - stackIndex * 0.04})`,
          transition: 'transform 300ms ease',
        }

  return (
    <article
      data-testid={`card-${bird.id}`}
      aria-label={`${bird.name}, ${bird.species}`}
      role={isTop ? 'button' : undefined}
      tabIndex={isTop ? 0 : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={(e) => {
        if (!isTop || locked) return
        if (e.key === 'ArrowRight') commit('like')
        if (e.key === 'ArrowLeft') commit('dislike')
        if (e.key === 'ArrowUp') commit('superlike')
        if (e.key === 'Enter') onOpen(bird)
      }}
      className={`absolute inset-0 select-none overflow-hidden rounded-[2rem] bg-white shadow-card ${
        isTop ? 'cursor-grab touch-none active:cursor-grabbing' : ''
      } ${burst ? 'ring-4 ring-[#8f9fd6]' : ''}`}
      style={style}
    >
      <img
        src={bird.photo}
        alt={`${bird.name}, un ${bird.species.toLowerCase()} en adopción`}
        draggable={false}
        onError={handlePhotoError}
        className="h-full w-full object-cover"
      />

      {/* Sellos de decisión */}
      <div
        className="pointer-events-none absolute left-4 top-4 -rotate-12 rounded-xl border-4 border-mint-dark bg-white/80 px-3 py-1 text-2xl font-extrabold text-mint-dark"
        style={{ opacity: likeOpacity }}
      >
        LIKE
      </div>
      <div
        className="pointer-events-none absolute right-4 top-4 rotate-12 rounded-xl border-4 border-coral bg-white/80 px-3 py-1 text-2xl font-extrabold text-coral-dark"
        style={{ opacity: nopeOpacity }}
      >
        NOPE
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-6 mx-auto w-fit rounded-xl border-4 border-[#8f9fd6] bg-white/80 px-3 py-1 text-xl font-extrabold text-[#5b6bb5]"
        style={{ opacity: superOpacity }}
      >
        ⭐ ¡SUPER!
      </div>

      {/* Destello premium del super like: estrella + halo + destellos radiales */}
      {burst && (
        <div
          data-testid="super-like-burst"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-40 grid place-items-center"
        >
          <div className="relative grid h-28 w-28 place-items-center">
            <span className="absolute inset-0 rounded-full bg-sky blur-2xl animate-super-flash" />
            <span className="absolute inset-0 rounded-full border-4 border-white/70 animate-super-flash" />
            <span className="text-7xl drop-shadow-lg animate-super-star">⭐</span>
            {SPARKS.map((angle) => (
              <span
                key={angle}
                className="absolute left-1/2 top-1/2 -ml-[5px] -mt-[5px] h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_12px_#8f9fd6] animate-super-spark"
                style={{ '--angle': `${angle}deg` } as CSSProperties}
              />
            ))}
          </div>
        </div>
      )}

      {/* Datos */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent p-4 pt-14 text-white">
        <h2 className="text-3xl font-extrabold drop-shadow">
          {bird.name} <span className="text-xl font-bold opacity-90">· {bird.age} a.</span>
        </h2>
        <p className="text-sm font-semibold opacity-90">
          {bird.species} · {bird.sex} · {bird.location}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {bird.personality.slice(0, 3).map((p) => (
            <span
              key={p}
              className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-bold backdrop-blur-sm"
            >
              {p}
            </span>
          ))}
        </div>
        {isTop && (
          <p className="mt-2 text-xs font-semibold italic opacity-75">
            Arrastra o toca para ver su historia ↗
          </p>
        )}
      </div>
    </article>
  )
})
