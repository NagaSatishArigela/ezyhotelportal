import { api } from '@/lib/api'

export type NotificationType =
  | 'approval'
  | 'rejection'
  | 'revision_request'
  | 'booking_update'
  | 'dispute_update'
  | 'review_new_on_property'
  | 'payout_released'

export interface OwnerNotification {
  id: string
  ownerId: string
  propertyId: string | null
  type: NotificationType
  title: string
  body: string
  actionUrl: string | null
  isRead: boolean
  createdAt: string
}

export interface NotificationsListResult {
  items: OwnerNotification[]
  total: number
  page: number
  limit: number
  unreadCount: number
}

const BASE = '/owners/me/notifications'

export const ownerNotificationsApi = {
  unreadCount: (): Promise<{ count: number }> =>
    api.get<{ count: number }>(`${BASE}/unread-count`).then((r) => r.data),

  list: (page = 1, limit = 20, unread?: boolean): Promise<NotificationsListResult> =>
    api
      .get<NotificationsListResult>(BASE, { params: { page, limit, ...(unread ? { unread: true } : {}) } })
      .then((r) => r.data),

  markRead: (id: string): Promise<OwnerNotification> =>
    api.patch<OwnerNotification>(`${BASE}/${id}/read`).then((r) => r.data),

  markAllRead: (): Promise<{ updated: number }> =>
    api.patch<{ updated: number }>(`${BASE}/read-all`).then((r) => r.data),
}
