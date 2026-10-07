import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { birds as birdsApi } from '../services'
import type { BirdWithLikes } from '../services/birds'

const MEDALS = ['🥇', '🥈', '🥉']

/**
 * Lateral «Los más deseados»: top 5 de pajaritos disponibles por likes
 * (base ficticio del MVP + los swipes reales de la sesión).
 * Solo se muestra en pantallas lg+; en móvil queda oculto.
 */
export function PopularSidebar({ refreshKey = 0 }: { refreshKey?: number }) {
  const [top, setTop] = useState<BirdWithLikes[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    birdsApi.getTopBirds(5).then((list) => {
      if (!active) return
      setTop(list)
      setReady(true)
    })
    return () => {
      active = false
    }
  }, [refreshKey])

  return (
    <aside
      data-testid="top-popular"
      aria-label="Los más deseados"
      className="hidden w-72 shrink-0 lg:block"
    >
      <section className="rounded-3xl bg-white p-4 shadow-soft">
        <h2 className="font-extrabold">🔥 Los más deseados</h2>
        <p className="text-xs font-semibold text-cocoa-light">Top 5 con más likes 💛</p>

        {!ready ? (
          <p className="mt-3 text-sm text-cocoa-light">Calculando…</p>
        ) : (
          <ol className="mt-3 space-y-1">
            {top.map((bird, i) => (
              <li key={bird.id}>
                <Link
                  to={`/pajarito/${bird.id}`}
                  className="flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-cream focus-visible:bg-cream"
                >
                  <span
                    aria-hidden
                    className={`w-6 shrink-0 text-center text-sm ${i < 3 ? 'text-base' : 'font-extrabold text-cocoa-light'}`}
                  >
                    {i < 3 ? MEDALS[i] : i + 1}
                  </span>
                  <img
                    src={bird.photo}
                    alt=""
                    loading="lazy"
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{bird.name}</span>
                    <span className="block truncate text-xs text-cocoa-light">
                      {bird.species} · {bird.location}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-extrabold text-coral-dark">
                    ❤️ {bird.likes}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  )
}
