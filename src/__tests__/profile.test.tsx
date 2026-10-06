import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import * as auth from '../services/auth'
import { swipes } from '../services'
import { loadDb, setLatency } from '../services/db'

beforeEach(async () => {
  localStorage.clear()
  setLatency(0)
  await auth.login('ana@piar.app', 'demo1234')
  window.history.pushState({}, '', '/perfil')
})

describe('perfil', () => {
  it('muestra identidad, rol y actividad del usuario', async () => {
    await swipes.sendSwipe('u1', 'b1', 'like')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Ana' })).toBeInTheDocument()
    expect(screen.getByText('ana@piar.app')).toBeInTheDocument()
    expect(screen.getByText('🐤 Adoptante')).toBeInTheDocument()
    expect(screen.getByText('Valoraciones')).toBeInTheDocument()
    expect((await screen.findAllByText('1')).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument()
  })

  it('la protectora ve el nombre de su refugio', async () => {
    await auth.login('lucia@piar.app', 'demo1234')
    render(<App />)
    expect(await screen.findByText(/Protectora · Ala de Barrio/)).toBeInTheDocument()
  })

  it('permite reiniciar la demo con confirmación', async () => {
    // algo de actividad previa
    await swipes.sendSwipe('u1', 'b1', 'dislike')
    expect(loadDb().swipes).toHaveLength(1)

    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ana' })

    await user.click(screen.getByRole('button', { name: /reiniciar la demo/i }))
    expect(screen.getByText(/borrar todo/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sí, reiniciar' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument())
    // la BD vuelve a fábrica
    const db = loadDb()
    expect(db.birds).toHaveLength(15)
    expect(db.swipes).toHaveLength(0)
    expect(db.users).toHaveLength(2)
  })
})
