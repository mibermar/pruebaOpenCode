import type { AppNotification, NotificationType } from '../types'
import { delay, loadDb, now, uid, updateDb } from './db'

/** Inserta una notificación mutando la BD (helper para otros servicios) */
export function pushNotification(
  db: ReturnType<typeof loadDb>,
  input: {
    userId: string
    type: NotificationType
    title: string
    body: string
    link?: string
  },
): AppNotification {
  const notification: AppNotification = {
    id: uid('n'),
    read: false,
    createdAt: now(),
    ...input,
  }
  db.notifications.push(notification)
  return notification
}

export async function listNotifications(userId: string): Promise<AppNotification[]> {
  await delay()
  return loadDb()
    .notifications.filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function unreadCountSync(userId: string): number {
  return loadDb().notifications.filter((n) => n.userId === userId && !n.read).length
}

export async function markNotificationRead(id: string): Promise<void> {
  await delay(0)
  updateDb((d) => {
    const n = d.notifications.find((x) => x.id === id)
    if (n) n.read = true
  })
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await delay(0)
  updateDb((d) => {
    for (const n of d.notifications.filter((x) => x.userId === userId && !x.read)) n.read = true
  })
}
