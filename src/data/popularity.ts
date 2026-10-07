/**
 * Popularidad ficticia del MVP: likes "acumulados antes de entrar en la demo".
 * No hay backend, así que estos números simulan la trayectoria de cada pajarito
 * y el ranking «Los más deseados» se ve vivo desde el primer segundo.
 *
 * El contador final en pantalla = este base + los swipes reales de la sesión
 * (like y superlike; los dislikes no cuentan). Ver `birds.getTopBirds()`.
 */
export const SEED_LIKES: Record<string, number> = {
  b1: 148, // Tornasol · Periquito
  b2: 96, // Canuto · Canario
  b3: 132, // Nube · Ninfa
  b4: 75, // Coral · Agapornis
  b5: 121, // Sol · Guacamayo
  b6: 64, // Verde · Cotorra
  b7: 88, // Diamantina · Diamante
  b8: 57, // Pintón · Jilguero
  b9: 43, // Pío · Gorrión
  b10: 71, // Azucena · Tórtola
  b11: 38, // Rayo · Arrendajo
  b12: 105, // Brasa · Petirrojo
  b13: 82, // Cielo · Herrerillo
  b14: 97, // Trueno · Carbonero
  b15: 29, // Pluma · Abubilla
}
