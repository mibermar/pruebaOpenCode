import { useEffect, useState, type FormEvent } from 'react'
import { seedBirds } from '../data/birds'
import { shelters } from '../data/shelters'
import { handlePhotoError } from '../lib/photo'
import type { Bird, BirdSize } from '../types'
import { ApiError, birds as birdsApi } from '../services'
import { Button, Input, Select } from './ui'
import { useApp } from '../store/context'

interface Props {
  /** si viene, estamos editando */
  bird?: Bird
  shelterId: string
  onClose: () => void
  onSaved: () => void
}

const GALLERY = seedBirds.map((b) => ({ src: b.photo, label: b.species }))

export default function BirdForm({ bird, shelterId, onClose, onSaved }: Props) {
  const { toast } = useApp()
  const shelter = shelters.find((s) => s.id === shelterId)

  const [form, setForm] = useState({
    name: bird?.name ?? '',
    species: bird?.species ?? '',
    scientificName: bird?.scientificName ?? '',
    age: String(bird?.age ?? 1),
    sex: bird?.sex ?? 'desconocido',
    size: bird?.size ?? 'pequeño',
    location: bird?.location ?? shelter?.location ?? '',
    photo: bird?.photo ?? GALLERY[0].src,
    story: bird?.story ?? '',
    personality: bird?.personality.join(', ') ?? '',
    health: bird?.health ?? '',
    energy: String(bird?.energy ?? 3),
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // bloquear scroll del fondo mientras el modal está abierto
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const payload = {
      name: form.name,
      species: form.species,
      scientificName: form.scientificName,
      age: Number(form.age),
      sex: form.sex as Bird['sex'],
      size: form.size as BirdSize,
      location: form.location,
      photo: form.photo,
      story: form.story,
      personality: form.personality
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
      health: form.health,
      energy: Number(form.energy),
    }
    try {
      if (bird) {
        await birdsApi.updateBird(bird.id, payload)
        toast(`${payload.name} actualizado ✏️`)
      } else {
        await birdsApi.createBird(shelterId, payload)
        toast(`${payload.name} ya está en adopción 🐣`)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={bird ? `Editar a ${bird.name}` : 'Nuevo pajarito'}
    >
      <form
        onSubmit={submit}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-card sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">
            {bird ? `✏️ Editar a ${bird.name}` : '🐣 Nuevo pajarito'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-full bg-cream-dark font-bold hover:bg-cream"
          >
            ✖
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Nombre"
            name="bird-name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
          />
          <Input
            label="Especie"
            name="bird-species"
            value={form.species}
            onChange={(e) => set('species', e.target.value)}
            required
          />
          <Input
            label="Nombre científico"
            name="bird-sci"
            value={form.scientificName}
            onChange={(e) => set('scientificName', e.target.value)}
            placeholder="Opcional"
          />
          <Input
            label="Edad (años)"
            name="bird-age"
            type="number"
            min={0}
            max={80}
            value={form.age}
            onChange={(e) => set('age', e.target.value)}
            required
          />
          <Select
            label="Sexo"
            name="bird-sex"
            value={form.sex}
            onChange={(e) => set('sex', e.target.value)}
          >
            <option value="macho">Macho</option>
            <option value="hembra">Hembra</option>
            <option value="desconocido">Desconocido</option>
          </Select>
          <Select
            label="Tamaño"
            name="bird-size"
            value={form.size}
            onChange={(e) => set('size', e.target.value)}
          >
            <option value="pequeño">Pequeño</option>
            <option value="mediano">Mediano</option>
            <option value="grande">Grande</option>
          </Select>
          <Input
            label="Ciudad"
            name="bird-location"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            required
          />
          <Input
            label="Carácter (separado por comas)"
            name="bird-personality"
            value={form.personality}
            onChange={(e) => set('personality', e.target.value)}
            placeholder="sociable, tranquilo…"
          />
        </div>

        <label className="mt-3 block text-sm font-semibold">
          <span className="mb-1.5 block">Energía: {form.energy}/5</span>
          <input
            type="range"
            name="bird-energy"
            min={1}
            max={5}
            value={form.energy}
            onChange={(e) => set('energy', e.target.value)}
            className="w-full accent-[#FF8A80]"
          />
        </label>

        <fieldset className="mt-3">
          <legend className="mb-1.5 text-sm font-semibold">Foto</legend>
          <div className="grid grid-cols-5 gap-2">
            {GALLERY.map((g) => (
              <button
                key={g.src}
                type="button"
                title={g.label}
                aria-label={`Foto de ${g.label}`}
                aria-pressed={form.photo === g.src}
                onClick={() => set('photo', g.src)}
                className={`overflow-hidden rounded-xl border-3 transition-all ${
                  form.photo === g.src
                    ? 'border-coral scale-105'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={g.src} alt="" onError={handlePhotoError} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-3 block text-sm font-semibold">
          <span className="mb-1.5 block">Su historia</span>
          <textarea
            name="bird-story"
            rows={3}
            value={form.story}
            onChange={(e) => set('story', e.target.value)}
            placeholder="¿Cómo llegó a la protectora? ¿Qué necesita en su nuevo hogar?"
            className="w-full rounded-2xl border-2 border-cream-dark bg-white px-4 py-3 text-sm outline-none focus:border-coral"
          />
        </label>

        <Input
          label="Salud"
          name="bird-health"
          value={form.health}
          onChange={(e) => set('health', e.target.value)}
          placeholder="Vacunado, revisado…"
        />

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-bold text-coral-dark"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Guardando…' : bird ? 'Guardar cambios' : 'Publicar en adopción'}
          </Button>
        </div>
      </form>
    </div>
  )
}
