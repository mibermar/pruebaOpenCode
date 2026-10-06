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
  window.history.pushState({}, '', '/pajarito/b1')
})

describe('ficha del pajarito', () => {
  it('muestra historia, salud, datos y crédito de la foto', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Tornasol' })).toBeInTheDocument()
    expect(screen.getByText(/Melopsittacus undulatus/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /su historia/i })).toBeInTheDocument()
    expect(screen.getByText(/temblaba/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /salud/i })).toBeInTheDocument()
    expect(screen.getByText(/Vacunado y revisado/)).toBeInTheDocument()
    expect(screen.getByText(/cuidado por Ala de Barrio/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Energía 4 de 5')).toBeInTheDocument()
    // crédito de la foto (Wikimedia)
    expect(screen.getByText('Benjamint444')).toBeInTheDocument()
    expect(screen.getByText(/GFDL 1\.2/)).toBeInTheDocument()
  })

  it('permite dar like desde la ficha y vuelve al feed', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Tornasol' })

    await user.click(screen.getByRole('button', { name: 'Me encanta' }))

    await waitFor(() => expect(window.location.pathname).toBe('/'))
    expect(loadDb().swipes[0]).toMatchObject({ birdId: 'b1', action: 'like' })
  })

  it('si ya fue valorado, lo indica en vez de repetir el swipe', async () => {
    await swipes.sendSwipe('u1', 'b1', 'dislike')

    render(<App />)
    expect(await screen.findByText(/ya has valorado a Tornasol/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Me encanta' })).not.toBeInTheDocument()
  })

  it('muestra pantalla de error para un pájaro inexistente', async () => {
    window.history.pushState({}, '', '/pajarito/no-existe')
    render(<App />)
    expect(await screen.findByText(/ya no está disponible/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /volver al feed/i })).toBeInTheDocument()
  })
})
