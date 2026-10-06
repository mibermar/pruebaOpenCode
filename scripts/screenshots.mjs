/**
 * Genera las capturas del README recorriendo la demo real (dev server en :5199).
 * Uso: node scripts/screenshots.mjs  (con `npm run dev` en marcha)
 */
import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'

const BASE = 'http://localhost:5199'
const OUT = 'docs/screenshots'
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('✓', name)
}

// 1. Login (invitado)
await page.goto(`${BASE}/login`)
await page.waitForSelector('text=Inicia sesión')
await page.waitForTimeout(500)
await shot('01-login')

// 2. Feed como Ana
await page.evaluate(() => localStorage.setItem('piar:session:v1', 'u1'))
await page.goto(`${BASE}/`)
await page.waitForSelector('[data-testid="card-b1"]')
await page.waitForTimeout(800) // carga de la foto
await shot('02-feed')

// 3. Ficha del pajarito
await page.goto(`${BASE}/pajarito/b1`)
await page.waitForSelector('h1:has-text("Tornasol")')
await page.waitForTimeout(600)
await shot('03-ficha')

// 4. Like → espera el toast de match (primera like siempre hace match)
await page.goto(`${BASE}/`)
await page.waitForSelector('[data-testid="card-b1"]')
await page.getByRole('button', { name: 'Me encanta' }).click()
await page.waitForSelector('text=/Tienes match con/', { timeout: 10000 })
await page.waitForTimeout(300)
await shot('04-match-toast')

// 5. Matches
await page.goto(`${BASE}/matches`)
await page.waitForSelector('text=Tus matches')
await page.waitForTimeout(400)
await shot('05-matches')

// 6. Formulario de solicitud
await page.getByRole('button', { name: /solicitar adopción/i }).click()
await page.waitForSelector('textarea')
await page.fill('textarea', 'Tenemos una jaula grande, un balcón soleado y mucho cariño.')
await page.waitForTimeout(300)
await shot('06-solicitud')
await page.getByRole('button', { name: /enviar solicitud/i }).click()
await page.waitForSelector('text=Pendiente ⏳', { timeout: 5000 })

// 7. Panel de la protectora (con la solicitud recién enviada — misma pestaña para compartir datos)
await page.evaluate(() => localStorage.setItem('piar:session:v1', 'u2'))
await page.goto(`${BASE}/dashboard`)
await page.waitForSelector('text=Panel de la protectora')
await page.waitForTimeout(600)
await shot('07-panel-protectora')

// 8. Gestión de solicitudes: aprobar para mostrar el estado
await page.getByRole('button', { name: /aprobar/i }).click()
await page.waitForSelector('text=Aprobada 💚', { timeout: 5000 })
await page.waitForTimeout(300)
await shot('08-panel-aprobada')

// 9. Adopciones de Ana (estado aprobado)
await page.evaluate(() => localStorage.setItem('piar:session:v1', 'u1'))
await page.goto(`${BASE}/adopciones`)
await page.waitForSelector('text=Mis adopciones')
await page.waitForTimeout(600)
await shot('09-adopciones')

// 10. Feed en móvil
const ctx3 = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})
const page3 = await ctx3.newPage()
await page3.goto(`${BASE}/login`)
await page3.waitForSelector('text=Inicia sesión')
await page3.evaluate(() => localStorage.setItem('piar:session:v1', 'u1'))
await page3.goto(`${BASE}/`)
await page3.waitForSelector('[data-testid="card-b3"]')
await page3.waitForTimeout(800)
await page3.screenshot({ path: `${OUT}/10-feed-mobile.png` })
console.log('✓ 10-feed-mobile')

// 11. Panel de notificaciones en móvil (hoja inferior, sin recortes)
await page3.getByRole('button', { name: /notificaciones/i }).click()
await page3.waitForSelector('text=Aún no tienes notificaciones')
await page3.waitForTimeout(400)
await page3.screenshot({ path: `${OUT}/11-notificaciones-mobile.png` })
console.log('✓ 11-notificaciones-mobile')

await browser.close()
console.log('Capturas listas en', OUT)
