import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import * as auth from '../services/auth'
import { birds, requests, swipes } from '../services'
import { loadDb, setLatency } from '../services/db'

/** Crea el flujo completo: like → match → solicitud sobre Tornasol (protectora s1) */
async function seedRequest() {
  await swipes.sendSwipe('u1', 'b1', 'superlike')
  const match = swipes.processPendingReviews(Date.now() + 60_000)[0]
  await requests.createRequest('u1', match.id, 'Tenemos jaula grande y mucho cariño')
}

async function openDashboard() {
  await auth.login('lucia@piar.app', 'demo1234')
  window.history.pushState({}, '', '/dashboard')
  render(<App />)
}

beforeEach(() => {
  localStorage.clear()
  setLatency(0)
})

describe('panel de la protectora', () => {
  it('muestra las estadísticas y el estado vacío de solicitudes', async () => {
    await openDashboard()
    expect(await screen.findByText('Panel de la protectora 🦜')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument() // pajaritos de s1
    expect(screen.getByText(/todavía no hay solicitudes/i)).toBeInTheDocument()
  })

  it('aprueba y completa una solicitud cambiando el estado del pájaro', async () => {
    await seedRequest()
    await openDashboard()

    expect(await screen.findByText('Tornasol')).toBeInTheDocument()
    expect(screen.getByText('Pendiente ⏳')).toBeInTheDocument()
    expect(screen.getByText(/tenemos jaula grande/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /aprobar/i }))
    expect(await screen.findByText('Aprobada 💚')).toBeInTheDocument()
    expect((await birds.getBird('b1')).status).toBe('reservado')
    expect(screen.getByRole('button', { name: /marcar entregada/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /marcar entregada/i }))
    expect(await screen.findByText('¡Adopción completada! 🏡')).toBeInTheDocument()
    expect((await birds.getBird('b1')).status).toBe('adoptado')
  })

  it('rechaza una solicitud', async () => {
    await seedRequest()
    await openDashboard()

    await userEvent.click(await screen.findByRole('button', { name: /rechazar/i }))
    expect(await screen.findByText('No fue posible 💔')).toBeInTheDocument()
    expect((await birds.getBird('b1')).status).toBe('disponible')
  })

  it('lista los pajaritos de la protectora con su estado', async () => {
    await openDashboard()
    await userEvent.click(await screen.findByRole('button', { name: 'Mis pajaritos' }))

    expect(await screen.findByRole('heading', { name: 'Tornasol' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Canuto' })).toBeInTheDocument()
    expect(screen.getAllByText('En adopción 💚').length).toBe(5)
  })

  it('muestra los likes de cada pajarito en «Mis pajaritos»', async () => {
    await swipes.sendSwipe('u1', 'b1', 'superlike')
    await swipes.sendSwipe('u1', 'b2', 'dislike')
    await openDashboard()
    await userEvent.click(await screen.findByRole('button', { name: 'Mis pajaritos' }))

    const tornasol = (await screen.findByRole('heading', { name: 'Tornasol' })).closest('li')!
    expect(within(tornasol).getByText('❤️ 149')).toBeInTheDocument() // 148 base + 1 super like

    const canuto = screen.getByRole('heading', { name: 'Canuto' }).closest('li')!
    expect(within(canuto).getByText('❤️ 96')).toBeInTheDocument() // los dislikes no suman
  })

  it('crea un pajarito nuevo con el formulario', async () => {
    await openDashboard()
    await userEvent.click(await screen.findByRole('button', { name: 'Mis pajaritos' }))
    await userEvent.click(await screen.findByRole('button', { name: /nuevo pajarito/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Nuevo pajarito' })
    await userEvent.type(within(dialog).getByLabelText('Nombre'), 'Rabito')
    await userEvent.type(within(dialog).getByLabelText('Especie'), 'Pinzón')
    await userEvent.type(
      within(dialog).getByLabelText('Su historia'),
      'Llegó a la protectora tras una fuga.',
    )
    await userEvent.click(within(dialog).getByRole('button', { name: /publicar en adopción/i }))

    expect(await screen.findByText(/ya está en adopción/i)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Rabito' })).toBeInTheDocument()
    expect(loadDb().birds).toHaveLength(16)
  })

  it('borra un pajarito con confirmación (y se niega si hay solicitudes activas)', async () => {
    await seedRequest() // Tornasol queda con solicitud activa
    await openDashboard()
    await userEvent.click(await screen.findByRole('button', { name: 'Mis pajaritos' }))

    // Tornasol tiene solicitud activa: no se puede borrar
    const card = (await screen.findByRole('heading', { name: 'Tornasol' })).closest('li')!
    await userEvent.click(within(card).getByRole('button', { name: 'Borrar' }))
    await userEvent.click(within(card).getByRole('button', { name: 'Sí, borrar' }))
    expect(await screen.findByText(/solicitudes de adopción activas/i)).toBeInTheDocument()
    expect(within(card).getByRole('heading', { name: 'Tornasol' })).toBeInTheDocument()

    // Canuto sí se puede borrar
    const card2 = screen.getByRole('heading', { name: 'Canuto' }).closest('li')!
    await userEvent.click(within(card2).getByRole('button', { name: 'Borrar' }))
    await userEvent.click(within(card2).getByRole('button', { name: 'Sí, borrar' }))
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Canuto' })).not.toBeInTheDocument(),
    )
    expect(loadDb().birds.some((b) => b.id === 'b2')).toBe(false)
  })
})
