/**
 * Fake API de Piar.
 * Cada módulo es "stateless": lee/escribe la BD en localStorage con latencia simulada,
 * de modo que sustituirlo por un backend real solo requiere reimplementar este paquete.
 */
export * as auth from './auth'
export * as birds from './birds'
export * as matches from './matches'
export * as notifications from './notifications'
export * as requests from './requests'
export * as swipes from './swipes'
export { ApiError } from './errors'
export { loadDb, resetDb, setLatency, uid } from './db'
