import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { shelters } from '../data/shelters'
import { ApiError } from '../services'
import type { Role } from '../types'
import { useApp } from '../store/context'
import { Button, Input, Select } from '../components/ui'

export default function Register() {
  const { register, toast } = useApp()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('adoptante')
  const [shelterId, setShelterId] = useState(shelters[0].id)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await register({ name, email, password, role, shelterId: role === 'protectora' ? shelterId : undefined })
      toast(`¡Bienvenido/a, ${name.trim()}! 🎉`)
      navigate(role === 'protectora' ? '/dashboard' : '/', { replace: true })
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
          <h1 className="text-3xl font-extrabold text-coral-dark">Únete a Piar</h1>
          <p className="mt-1 text-cocoa-light">Hay un pajarito esperándote 💛</p>
        </header>

        <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-6 shadow-card">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-cocoa">¿Quién eres?</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: 'adoptante', emoji: '🐤', label: 'Quiero adoptar' },
                  { value: 'protectora', emoji: '🦜', label: 'Soy protectora' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`rounded-2xl border-2 px-3 py-3 text-sm font-bold transition-all ${
                    role === opt.value
                      ? 'border-coral bg-coral/10 text-coral-dark'
                      : 'border-cream-dark bg-white text-cocoa-light hover:border-cocoa-light'
                  }`}
                >
                  <span className="mr-1 block text-xl">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <Input
            label="Nombre"
            name="name"
            placeholder="Tu nombre o el de la protectora"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {role === 'protectora' && (
            <Select
              label="Protectora con la que colaboras"
              name="shelter"
              value={shelterId}
              onChange={(e) => setShelterId(e.target.value)}
            >
              {shelters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.location}
                </option>
              ))}
            </Select>
          )}

          {error && (
            <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-bold text-coral-dark">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Creando cuenta…' : 'Crear cuenta'}
          </Button>

          <p className="text-center text-sm text-cocoa-light">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-bold text-coral-dark hover:underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
