import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-coral text-white shadow-soft hover:bg-coral-dark active:scale-95 disabled:bg-cocoa-light',
  secondary: 'bg-mint text-cocoa shadow-soft hover:bg-mint-dark active:scale-95',
  ghost: 'bg-white/70 text-cocoa hover:bg-white active:scale-95 border border-cream-dark',
  danger: 'bg-white text-coral-dark border border-coral/40 hover:bg-coral/10 active:scale-95',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`rounded-full px-5 py-2.5 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    />
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name
  return (
    <label className="block text-sm font-semibold" htmlFor={inputId}>
      {label && <span className="mb-1.5 block text-cocoa">{label}</span>}
      <input
        id={inputId}
        {...props}
        className={`w-full rounded-2xl border-2 bg-white px-4 py-3 text-base outline-none transition-colors placeholder:text-cocoa-light/60 focus:border-coral ${
          error ? 'border-coral' : 'border-cream-dark'
        } ${className}`}
      />
      {error && <span className="mt-1 block text-xs font-semibold text-coral-dark">{error}</span>}
    </label>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export function Select({ label, className = '', children, ...props }: SelectProps) {
  const id = props.name
  return (
    <label className="block text-sm font-semibold" htmlFor={id}>
      {label && <span className="mb-1.5 block text-cocoa">{label}</span>}
      <select
        id={id}
        {...props}
        className={`w-full cursor-pointer appearance-none rounded-2xl border-2 border-cream-dark bg-white px-4 py-3 text-base outline-none transition-colors focus:border-coral ${className}`}
      >
        {children}
      </select>
    </label>
  )
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-cream-dark px-3 py-1 text-xs font-bold text-cocoa-light">
      {children}
    </span>
  )
}

const REQUEST_BADGE: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente ⏳', cls: 'bg-sunflower text-cocoa' },
  aprobada: { label: 'Aprobada 💚', cls: 'bg-mint text-cocoa' },
  rechazada: { label: 'No fue posible 💔', cls: 'bg-coral/20 text-coral-dark' },
  completada: { label: '¡Adoptada! 🏡', cls: 'bg-sky text-cocoa' },
}

/** Estado de una solicitud de adopción */
export function RequestBadge({ status }: { status: string }) {
  const badge = REQUEST_BADGE[status] ?? { label: status, cls: 'bg-cream-dark text-cocoa' }
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${badge.cls}`}>
      {badge.label}
    </span>
  )
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-cocoa-light" role="status">
      <span className="text-4xl animate-wiggle">🐦</span>
      <span className="text-sm font-semibold">{label}</span>
    </div>
  )
}

export function EmptyState({
  emoji,
  title,
  children,
}: {
  emoji: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="mx-auto max-w-sm rounded-3xl bg-white p-8 text-center shadow-soft">
      <div className="mb-3 text-5xl animate-float">{emoji}</div>
      <h2 className="mb-2 text-lg font-extrabold text-cocoa">{title}</h2>
      <p className="text-sm text-cocoa-light">{children}</p>
    </div>
  )
}

/** Botón redondo grande para las acciones del swipe */
export function CircleButton({
  emoji,
  label,
  onClick,
  size = 'md',
  tone = 'plain',
  disabled = false,
}: {
  emoji: string
  label: string
  onClick?: () => void
  size?: 'sm' | 'md'
  tone?: 'plain' | 'like' | 'nope' | 'super'
  disabled?: boolean
}) {
  const tones = {
    plain: 'bg-white text-cocoa border-cream-dark hover:border-cocoa-light',
    like: 'bg-mint text-cocoa border-mint-dark hover:bg-mint-dark',
    nope: 'bg-white text-coral-dark border-coral/40 hover:bg-coral/10',
    super: 'bg-sky text-cocoa border-[#8f9fd6] hover:brightness-95',
  }
  const sizes = { sm: 'h-12 w-12 text-xl', md: 'h-14 w-14 text-2xl' }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid place-items-center rounded-full border-2 shadow-soft transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${sizes[size]}`}
    >
      {emoji}
    </button>
  )
}
