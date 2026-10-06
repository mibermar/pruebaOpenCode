import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import * as auth from '../services/auth'
import { setLatency } from '../services/db'

beforeEach(() => {
  localStorage.clear()
  setLatency(0)
  window.history.pushState({}, '', '/')
})

describe('rutas y sesión', () => {
  it('muestra el login a los invitados', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Piar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument()
  })

  it('protege las rutas privadas sin sesión', () => {
    window.history.pushState({}, '', '/matches')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument()
  })

  it('la cuenta demo de Ana entra al feed y puede salir', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /entrar como ana/i }))

    expect(await screen.findByRole('link', { name: /descubrir/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /notificaciones/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /salir/i }))
    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument()
  })

  it('la protectora aterriza en su panel', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /entrar como lucía/i }))

    expect(await screen.findByRole('link', { name: /panel/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /descubrir/i })).not.toBeInTheDocument()
  })

  it('redirige al panel si una protectora visita el feed', async () => {
    await auth.login('lucia@piar.app', 'demo1234')
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(await screen.findByRole('link', { name: /panel/i })).toBeInTheDocument()
  })

  it('redirige al feed si un adoptante visita el panel', async () => {
    await auth.login('ana@piar.app', 'demo1234')
    window.history.pushState({}, '', '/dashboard')
    render(<App />)
    expect(await screen.findByRole('link', { name: /descubrir/i })).toBeInTheDocument()
  })

  it('el registro crea la cuenta y deja sesión iniciada', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/registro')
    render(<App />)

    await user.type(screen.getByLabelText('Nombre'), 'Marta')
    await user.type(screen.getByLabelText('Correo'), 'marta@test.com')
    await user.type(screen.getByLabelText('Contraseña'), 'secreto1')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    expect(await screen.findByText('Marta')).toBeInTheDocument()
  })

  it('la campana abre y cierra el panel de notificaciones', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /entrar como ana/i }))
    await screen.findByRole('link', { name: /descubrir/i })

    await user.click(screen.getByRole('button', { name: /notificaciones/i }))
    expect(await screen.findByText('Notificaciones')).toBeInTheDocument()
    expect(screen.getByText(/aún no tienes notificaciones/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar notificaciones' }))
    expect(screen.queryByText('Notificaciones')).not.toBeInTheDocument()
  })
})
