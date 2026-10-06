/** Roles de usuario de Piar */
export type Role = 'adoptante' | 'protectora'

export interface User {
  id: string
  name: string
  email: string
  /** hash simulado — en un backend real vendría de bcrypt */
  passwordHash: string
  role: Role
  /** emoji de avatar, estilo cute */
  avatar: string
  /** solo para usuarios con rol protectora */
  shelterId?: string
}

/** Datos públicos del usuario (sin credenciales) */
export type PublicUser = Omit<User, 'passwordHash'>

export interface PhotoCredit {
  artist: string
  license: string
  page: string
}

export type BirdSize = 'pequeño' | 'mediano' | 'grande'
export type BirdSex = 'macho' | 'hembra' | 'desconocido'
export type BirdStatus = 'disponible' | 'reservado' | 'adoptado'

/** Un pajarito en adopción */
export interface Bird {
  id: string
  name: string
  species: string
  scientificName: string
  /** edad aproximada en años (puede ser 0 para crías) */
  age: number
  sex: BirdSex
  size: BirdSize
  location: string
  shelterId: string
  photo: string
  photoCredit: PhotoCredit
  /** historia corta para la ficha */
  story: string
  /** etiquetas de carácter: 'sociable', 'juguetón', 'tranquilo'... */
  personality: string[]
  health: string
  status: BirdStatus
  /** energía de 1 (muy tranquilo) a 5 (muy activo) */
  energy: number
}

export interface Shelter {
  id: string
  name: string
  location: string
  description: string
}

export type SwipeAction = 'like' | 'dislike' | 'superlike'

export interface Swipe {
  id: string
  userId: string
  birdId: string
  action: SwipeAction
  createdAt: string
}

export type MatchStatus = 'pendiente' | 'aceptado' | 'rechazado'

/** El usuario dio like y la protectora correspondió */
export interface Match {
  id: string
  userId: string
  birdId: string
  shelterId: string
  status: MatchStatus
  createdAt: string
}

export type RequestStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'completada'

/** Solicitud de adopción enviada tras un match */
export interface AdoptionRequest {
  id: string
  matchId: string
  birdId: string
  userId: string
  /** mensaje que el adoptante escribe a la protectora */
  message: string
  status: RequestStatus
  createdAt: string
  updatedAt: string
}

export type NotificationType = 'match' | 'solicitud' | 'estado' | 'sistema'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: string
  /** ruta interna a la que lleva la notificación */
  link?: string
}

/** Revisión de like pendiente por parte de la protectora (simulada) */
export interface PendingReview {
  id: string
  swipeId: string
  userId: string
  birdId: string
  shelterId: string
  /** si la protectora terminará aceptando el like */
  willMatch: boolean
  /** marca de tiempo (epoch ms) en la que se resuelve */
  dueAt: number
}

/** Estado completo de la "base de datos" simulada */
export interface Database {
  version: number
  users: User[]
  shelters: Shelter[]
  birds: Bird[]
  swipes: Swipe[]
  matches: Match[]
  requests: AdoptionRequest[]
  notifications: AppNotification[]
  pendingReviews: PendingReview[]
}
