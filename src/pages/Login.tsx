import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../services'
import { useApp } from '../store/context'
import { Button, Input } from '../components/ui'

export default function Login() {
  const { login, toast } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent, demoEmail?: string, demoPassword?: string) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(demoEmail ?? email, demoPassword ?? password)
      toast(`¡Hola de nuevo! 👋`)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Algo salió mal, inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-b from-cream via-white to-cream-dark/40 p-4">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <img src="/favicon.svg" alt="" className="mx-auto mb-3 h-16 w-16 animate-float" />
          <h1 className="text-4xl font-extrabold text-coral-dark">Piar</h1>
          <p className="mt-1 text-cocoa-light">Desliza, haz match y adopta 🐦</p>
        </header>

        <form
          onSubmit={(e) => submit(e)}
          className="space-y-4 rounded-3xl bg-white p-6 shadow-card"
        >
          <h2 className="text-lg font-extrabold">Inicia sesión</h2>
          <Input
            label="Correo"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-bold text-coral-dark">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Entrando…' : 'Entrar'}
          </Button>
          <p className="text-center text-sm text-cocoa-light">
            ¿Nuevo por aquí?{' '}
            <Link to="/registro" className="font-bold text-coral-dark hover:underline">
              Crea una cuenta
            </Link>
          </p>
        </form>

        <section className="mt-4 rounded-3xl border-2 border-dashed border-mint-dark/50 bg-mint/20 p-4 text-center">
          <p className="mb-2 text-sm font-extrabold text-cocoa">Cuentas de prueba 🎈</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="secondary"
              className="!px-4 !py-2 text-sm"
              disabled={busy}
              onClick={(e) => submit(e, 'ana@piar.app', 'demo1234')}
            >
              🐤 Entrar como Ana (adoptante)
            </Button>
            <Button
              variant="ghost"
              className="!px-4 !py-2 text-sm"
              disabled={busy}
              onClick={(e) => submit(e, 'lucia@piar.app', 'demo1234')}
            >
              🦜 Entrar como Lucía (protectora)
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
