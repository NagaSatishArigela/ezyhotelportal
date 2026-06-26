import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { ownerNotificationsApi, type OwnerNotification } from '@/lib/api/ownerNotifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const LIMIT = 20

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const TYPE_LABEL: Record<string, string> = {
  approval: 'Approval',
  rejection: 'Rejection',
  revision_request: 'Revision',
  booking_update: 'Booking',
  dispute_update: 'Dispute',
  review_new_on_property: 'Review',
  payout_released: 'Payout',
}

const TYPE_VARIANT: Record<string, 'green' | 'red' | 'amber' | 'teal' | 'grey'> = {
  approval: 'green',
  rejection: 'red',
  revision_request: 'amber',
  booking_update: 'teal',
  dispute_update: 'amber',
  review_new_on_property: 'teal',
  payout_released: 'green',
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: OwnerNotification
  onMarkRead: (id: string) => void
}) {
  return (
    <div
      className={cn(
        'flex gap-4 rounded-lg border border-border bg-white p-4 transition-colors',
        !notification.isRead && 'border-l-[3px] border-l-primary-600 bg-primary-50/30',
      )}
      data-testid="notification-row"
    >
      <div className="mt-0.5 shrink-0">
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            notification.isRead ? 'bg-navy-100' : 'bg-primary-100',
          )}
        >
          <Bell size={14} className={notification.isRead ? 'text-navy-400' : 'text-primary-600'} aria-hidden />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn('text-sm font-semibold text-navy-900', !notification.isRead && 'font-bold')}>
              {notification.title}
            </p>
            <Badge variant={TYPE_VARIANT[notification.type] ?? 'grey'}>
              {TYPE_LABEL[notification.type] ?? notification.type}
            </Badge>
            {!notification.isRead && (
              <span className="h-2 w-2 rounded-full bg-primary-600" aria-label="Unread" />
            )}
          </div>
          <time
            dateTime={notification.createdAt}
            className="shrink-0 text-xs text-navy-400"
          >
            {formatRelative(notification.createdAt)}
          </time>
        </div>
        <p className="mt-1 text-sm text-navy-600">{notification.body}</p>
        {!notification.isRead && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="mt-2 text-xs font-medium text-primary-600 hover:underline"
            aria-label={`Mark "${notification.title}" as read`}
          >
            Mark as read
          </button>
        )}
      </div>
    </div>
  )
}

export function OwnerNotificationsPage() {
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['owner-notifications', page, unreadOnly],
    queryFn: () => ownerNotificationsApi.list(page, LIMIT, unreadOnly || undefined),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => ownerNotificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-notifications'] })
      qc.invalidateQueries({ queryKey: ['owner-notifications-count'] })
    },
  })

  const markAll = useMutation({
    mutationFn: () => ownerNotificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-notifications'] })
      qc.invalidateQueries({ queryKey: ['owner-notifications-count'] })
    },
  })

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1

  return (
    <div className="space-y-6" data-testid="notifications-page">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Notifications</h1>
          {data && data.unreadCount > 0 && (
            <p className="mt-1 text-sm text-navy-500">
              {data.unreadCount} unread message{data.unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-navy-600">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1) }}
              className="h-4 w-4 accent-primary-600"
              data-testid="unread-filter"
            />
            Unread only
          </label>
          {(data?.unreadCount ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              data-testid="mark-all-read-btn"
            >
              <CheckCheck size={14} aria-hidden />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-navy-100" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-white py-16 text-center">
          <Bell size={32} className="text-navy-300" aria-hidden />
          <p className="font-semibold text-navy-500">
            {unreadOnly ? 'All caught up!' : 'No notifications yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onMarkRead={(id) => markRead.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-navy-500" aria-label="Notifications pagination">
          <span>
            Page {page} of {totalPages} · {data?.total ?? 0} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
              data-testid="prev-page-btn"
            >
              <ChevronLeft size={14} aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
              data-testid="next-page-btn"
            >
              <ChevronRight size={14} aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
