import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import * as auth from '../services/auth'
import { loadDb, setLatency } from '../services/db'

const TOP_LABEL = 'Tornasol, Periquito'

beforeEach(async () => {
  localStorage.clear()
  setLatency(0)
  await auth.login('ana@piar.app', 'demo1234')
  window.history.pushState({}, '', '/')
})

describe('feed con swipe', () => {
  it('muestra la pila de tarjetas con el primer pajarito arriba', async () => {
    render(<App />)
    const top = await screen.findByRole('button', { name: TOP_LABEL })
    expect(top).toBeInTheDocument()
    // el de detrás también está pintado (pila visual)
    expect(screen.getByRole('heading', { name: /^Canuto/ })).toBeInTheDocument()
    expect(screen.getByText(/pajaritos esperando/)).toBeInTheDocument()
  })

  it('el botón «Me encanta» envía el like y avanza a la siguiente tarjeta', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('button', { name: TOP_LABEL })

    await user.click(screen.getByRole('button', { name: 'Me encanta' }))

    // la tarjeta sale volando y Canuto queda arriba
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /Tornasol/ })).not.toBeInTheDocument(),
    )
    expect(loadDb().swipes).toHaveLength(1)
    expect(loadDb().swipes[0]).toMatchObject({ birdId: 'b1', action: 'like' })
    expect(screen.getByText(/protectora te responderá/i)).toBeInTheDocument()
  })

  it('el gesto de arrastrar a la derecha hace like y a la izquierda dislike', async () => {
    render(<App />)
    const top = await screen.findByRole('button', { name: TOP_LABEL })

    fireEvent.pointerDown(top, { clientX: 10, clientY: 10, pointerId: 1 })
    fireEvent.pointerMove(top, { clientX: 200, clientY: 20, pointerId: 1 })
    fireEvent.pointerUp(top, { clientX: 200, clientY: 20, pointerId: 1 })

    await waitFor(() => expect(loadDb().swipes[0]?.action).toBe('like'))

    // ahora la segunda tarjeta hacia la izquierda
    const next = await screen.findByRole('button', { name: 'Canuto, Canario' })
    fireEvent.pointerDown(next, { clientX: 200, clientY: 20, pointerId: 2 })
    fireEvent.pointerMove(next, { clientX: 20, clientY: 25, pointerId: 2 })
    fireEvent.pointerUp(next, { clientX: 20, clientY: 25, pointerId: 2 })

    await waitFor(() => expect(loadDb().swipes[1]?.action).toBe('dislike'))
    expect(loadDb().swipes[1].birdId).toBe('b2')
  })

  it('arrastrar hacia arriba hace super like', async () => {
    render(<App />)
    const top = await screen.findByRole('button', { name: TOP_LABEL })

    fireEvent.pointerDown(top, { clientX: 100, clientY: 200, pointerId: 1 })
    fireEvent.pointerMove(top, { clientX: 105, clientY: 20, pointerId: 1 })
    fireEvent.pointerUp(top, { clientX: 105, clientY: 20, pointerId: 1 })

    await waitFor(() => expect(loadDb().swipes[0]?.action).toBe('superlike'))
  })

  it('deshacer devuelve la tarjeta anterior', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('button', { name: TOP_LABEL })

    await user.click(screen.getByRole('button', { name: 'Me encanta' }))
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /Tornasol/ })).not.toBeInTheDocument(),
    )

    const undo = screen.getByRole('button', { name: 'Deshacer último' })
    expect(undo).toBeEnabled()
    await user.click(undo)

    expect(await screen.findByRole('heading', { name: /Tornasol/ })).toBeInTheDocument()
    expect(loadDb().swipes).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Deshacer último' })).toBeDisabled()
  })

  it('abre la ficha al tocar la tarjeta sin arrastrar', async () => {
    render(<App />)
    const top = await screen.findByRole('button', { name: TOP_LABEL })

    fireEvent.pointerDown(top, { clientX: 50, clientY: 50, pointerId: 1 })
    fireEvent.pointerUp(top, { clientX: 50, clientY: 50, pointerId: 1 })

    await waitFor(() => expect(window.location.pathname).toBe('/pajarito/b1'))
  })

  it('el teclado también controla el swipe (← → ↑)', async () => {
    render(<App />)
    const top = await screen.findByRole('button', { name: TOP_LABEL })

    fireEvent.keyDown(top, { key: 'ArrowLeft' })
    await waitFor(() => expect(loadDb().swipes[0]?.action).toBe('dislike'))
  })

  it('filtra por especie y muestra el estado vacío adecuado', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('button', { name: TOP_LABEL })

    await user.click(screen.getByText('🔎 Filtros'))
    await user.selectOptions(screen.getByLabelText('Especie'), 'Periquito')

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Canuto, Canario' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: TOP_LABEL })).toBeInTheDocument()

    // lo valoro y la especie filtrada se agota
    await user.click(screen.getByRole('button', { name: 'Me encanta' }))
    expect(await screen.findByText(/Ningún pájaro con esos filtros/)).toBeInTheDocument()

    // limpiar filtros restaura el resto de pajaritos
    await user.click(screen.getByRole('button', { name: /limpiar filtros/i }))
    expect(await screen.findByRole('button', { name: 'Canuto, Canario' })).toBeInTheDocument()
  })
})
