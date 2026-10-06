import { Link } from 'react-router-dom'
import { Button, EmptyState } from '../components/ui'

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-cream p-4">
      <div className="text-center">
        <EmptyState emoji="🦜" title="Este pájaro se fue volando">
          La página que buscas no existe (o nunca la hubo).
        </EmptyState>
        <Link to="/">
          <Button className="mt-6">Volver al nido 🐣</Button>
        </Link>
      </div>
    </main>
  )
}
