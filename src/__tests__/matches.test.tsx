import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import * as auth from '../services/auth'
import { swipes, requests } from '../services'
import { setLatency } from '../services/db'

/** Crea un match real de la usuario demo sobre Tornasol (b1) */
async function seedMatch() {
  await swipes.sendSwipe('u1', 'b1', 'superlike')
  return swipes.processPendingReviews(Date.now() + 60_000)[0]
}

beforeEach(async () => {
  localStorage.clear()
  setLatency(0)
  await auth.login('ana@piar.app', 'demo1234')
})

describe('matches', () => {
  it('muestra el estado vacío cuando no hay matches', async () => {
    window.history.pushState({}, '', '/matches')
    render(<App />)
    expect(await screen.findByText(/aún no hay matches/i)).toBeInTheDocument()
  })

  it('lista el match con su pajarito y protectora', async () => {
    const match = await seedMatch()
    expect(match).toBeTruthy()

    window.history.pushState({}, '', '/matches')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Tornasol' })).toBeInTheDocument()
    expect(screen.getByText(/Ala de Barrio/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /solicitar adopción/i })).toBeInTheDocument()
  })

  it('permite enviar la solicitud con un mensaje válido', async () => {
    await seedMatch()
    const user = userEvent.setup()
    window.history.pushState({}, '', '/matches')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /solicitar adopción/i }))
    await user.type(
      screen.getByLabelText(/cuéntale a ala de barrio/i),
      'Tenemos una jaula grande y un balcón soleado.',
    )
    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }))

    expect(await screen.findByText(/solicitud enviada a la protectora/i)).toBeInTheDocument()
    expect(await screen.findByText('Pendiente ⏳')).toBeInTheDocument()
    // el formulario se cierra
    expect(screen.queryByRole('button', { name: /enviar solicitud/i })).not.toBeInTheDocument()
  })

  it('rechaza un mensaje demasiado corto con un aviso', async () => {
    await seedMatch()
    const user = userEvent.setup()
    window.history.pushState({}, '', '/matches')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /solicitar adopción/i }))
    await user.type(screen.getByLabelText(/cuéntale a ala de barrio/i), 'hola')
    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }))

    expect(await screen.findByText(/10 caracteres/i)).toBeInTheDocument()
    // el formulario sigue abierto para corregir el mensaje
    expect(screen.getByLabelText(/cuéntale a ala de barrio/i)).toBeInTheDocument()
  })
})

describe('adopciones', () => {
  it('muestra el estado vacío si no hay solicitudes', async () => {
    window.history.pushState({}, '', '/adopciones')
    render(<App />)
    expect(await screen.findByText(/no has solicitado ninguna adopción/i)).toBeInTheDocument()
  })

  it('sigue el estado: pendiente → aprobada por la protectora', async () => {
    const match = await seedMatch()
    await requests.createRequest('u1', match.id, 'Quiero que viva con nosotros')

    window.history.pushState({}, '', '/adopciones')
    const first = render(<App />)
    expect(await screen.findByText('Pendiente ⏳')).toBeInTheDocument()
    expect(screen.getByText(/revisará tu solicitud/i)).toBeInTheDocument()
    first.unmount()

    // la protectora aprueba (simulación directa del servicio)
    const req = (await requests.listRequestsForUser('u1'))[0]
    await requests.updateRequestStatus(req.id, 'u2', 'aprobada')

    render(<App />)
    expect(await screen.findByText('Aprobada 💚')).toBeInTheDocument()
    expect(screen.getByText(/coordina la entrega/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/enviada el/i)).toBeInTheDocument())
  })
})
