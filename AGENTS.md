# AGENTS.md — Piar

Demo de adopción de pajaritos con swipe (React 19 + TS + Vite 8, Tailwind 4, React Router 7).
**Todo el contenido del repo está en español**: textos de UI, comentarios, tests y README — los cambios nuevos también.

## Comandos

- `npm test` — Vitest (una sola pasada, `vitest run`). Un archivo: `npm test -- feed`
- `npm run lint` — oxlint; debe terminar con **0 warnings**. No hay formatter ni CI (sin `.github/workflows`)
- `npm run build` — `tsc -b && vite build`; es el **único typecheck** (no existe script `typecheck`)
- Verificación mínima de un cambio: `npm run lint && npm test && npm run build`

## Capturas (`npm run capturas` → `scripts/screenshots.mjs`)

- El script tiene hardcodeado `http://localhost:5199`: antes hay que levantar `npm run dev -- --port 5199`
- Recorre la demo real en un flujo único con estado compartido (mismo navegador: el primer like hace match, cambia de usuario con `localStorage['piar:session:v1']`); sobrescribe los 11 PNG de `docs/screenshots/`
- Requiere `playwright-core`, que **no está en package.json**: en esta máquina es un symlink a `/tmp/opencode/node_modules/playwright-core` (un `npm install` limpio lo elimina; ver README §Capturas)
- Los emojis salen en tofu si falta la fuente Noto Color Emoji en `~/.local/share/fonts/`

## Arquitectura (lo que no se deduce de los nombres)

- **No hay backend**: `src/services/` es una fake API *stateless* sobre localStorage (`piar:db:v1` = datos, `piar:session:v1` = sesión) con latencia simulada (`setLatency`). Es la única frontera a sustituir por un backend real
- Las reglas de negocio (permisos, máquina de estados `pendiente → aprobada → completada`, probabilidad de match) viven **dentro de los servicios**, no en la UI → se prueban en `services.test.ts`
- Demo: primer like y todo super-like **siempre** hacen match; los likes siguientes, 60 %. La "revisión" de la protectora llega por un ticker (~2 s) en `AppProvider` (`src/store/context.ts`)
- Cuentas: `ana@piar.app` / `lucia@piar.app`, `demo1234` (ids `u1` adoptante, `u2` protectora). Para saltarse el login en scripts: `localStorage.setItem('piar:session:v1', 'u1')`
- Rutas protegidas por rol en `src/App.tsx`; `/dashboard` es solo para protectora

## Tests (Vitest + RTL, jsdom)

- Config en `vite.config.ts`; setup `src/test/setup.ts` (solo jest-dom, **no** limpia estado)
- **Cada archivo de test debe** empezar con `beforeEach(() => { localStorage.clear(); setLatency(0) })` y `loadDb()` si necesita la siembra: si no, el estado se arrastra de un test al siguiente dentro del mismo archivo
- Tarjetas del feed: `data-testid="card-b{n}"`

## Tailwind 4

- No hay `tailwind.config`: paleta (`cream`/`coral`/`mint`/…), sombras, animaciones y fuente Nunito se definen en `@theme` dentro de `src/index.css`

## Gotchas

- `backdrop-blur` / `transform` / `filter` en un ancestro crea *containing block* y **atrapa** a los `position:fixed` interiores (ya pasó con la hoja de notificaciones: se dibujaba fuera de pantalla). Los overlays fijos no deben vivir dentro de cabeceras desenfocadas — ver comentario en `src/components/Layout.tsx`
- Este directorio es un repositorio git **propio**, anidado dentro de `/var/www/MasterIA` (otro repo distinto): haz `cd` aquí antes de operar con git
