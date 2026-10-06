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
  const start = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(false)
  /** evita dobles commits entre puntero y teclado */
  const leavingRef = useRef(false)
  const isTop = stackIndex === 0

  const commit = useCallback(
    (action: SwipeAction) => {
      if (leavingRef.current) return
      leavingRef.current = true
      setLeaving(action)
      const { dx, dy } = exitVector(action)
      setPos({ x: dx, y: dy })
      window.setTimeout(() => onDecide(action, bird), FLY_MS)
    },
    [bird, onDecide],
  )

  useImperativeHandle(ref, () => ({ swipe: commit }), [commit])

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    if (!isTop || leaving) return
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
    if (!dragging || !start.current || leaving) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved.current = true
    setPos({ x: dx, y: dy })
  }

  function onPointerUp() {
    if (!dragging || leaving) return
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
    if (leaving) return
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
          transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.x / 18}deg)`,
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
        if (!isTop) return
        if (e.key === 'ArrowRight') commit('like')
        if (e.key === 'ArrowLeft') commit('dislike')
        if (e.key === 'ArrowUp') commit('superlike')
        if (e.key === 'Enter') onOpen(bird)
      }}
      className={`absolute inset-0 select-none overflow-hidden rounded-[2rem] bg-white shadow-card ${
        isTop ? 'cursor-grab touch-none active:cursor-grabbing' : ''
      }`}
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
