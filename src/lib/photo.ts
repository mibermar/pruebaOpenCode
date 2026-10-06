import type { SyntheticEvent } from 'react'

/** Muestra un SVG amable cuando la foto no carga */
export function handlePhotoError(e: SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget
  if (img.dataset.fallback === '1') return
  img.dataset.fallback = '1'
  img.src =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
        <rect width="400" height="500" fill="#FDEEE0"/>
        <circle cx="200" cy="215" r="95" fill="#FF8A80"/>
        <ellipse cx="200" cy="245" rx="55" ry="50" fill="#FFF8F0"/>
        <circle cx="230" cy="190" r="16" fill="#5C4F4A"/>
        <circle cx="236" cy="184" r="6" fill="#fff"/>
        <path d="M285 205 l55 12 -55 16z" fill="#FFD97D" stroke="#E8B94F" stroke-width="5" stroke-linejoin="round"/>
        <text x="200" y="420" font-family="sans-serif" font-size="26" fill="#8D7F78" text-anchor="middle">Foto en camino…</text>
      </svg>`,
    )
}
