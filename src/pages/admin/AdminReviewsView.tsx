import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CheckCircle, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { adminReviewsApi, type ReviewListItem, type ReviewStatus } from '@/lib/api/adminReviews'

const PAGE_LIMIT = 20

const STATUS_BADGE_VARIANT: Record<ReviewStatus, 'green' | 'amber' | 'red' | 'grey'> = {
  published: 'green',
  pending: 'amber',
  flagged: 'red',
  removed: 'grey',
}

// ---------------------------------------------------------------------------
// Sidebar badge (polls flagged count every 60s)
// ---------------------------------------------------------------------------

export function ReviewFlaggedBadge() {
  const { data } = useQuery({
    queryKey: ['admin-reviews-flagged-count'],
    queryFn: () => adminReviewsApi.flaggedCount(),
    refetchInterval: 60_000,
  })
  if (!data || data.count === 0) return null
  return <Badge variant="red" className="ml-1">{data.count}</Badge>
}

// ---------------------------------------------------------------------------
// Remove dialog
// ---------------------------------------------------------------------------

const removeSchema = z.object({ reason: z.string().min(1, 'Reason is required').max(2000) })

function RemoveDialog({ review, onClose, onSuccess }: {
  review: ReviewListItem
  onClose: () => void
  onSuccess: () => void
}) {
  const form = useForm<{ reason: string }>({ resolver: zodResolver(removeSchema) })
  const mutation = useMutation({
    mutationFn: ({ reason }: { reason: string }) =>
      adminReviewsApi.moderate(review.id, 'remove', reason),
    onSuccess: () => {
      toast.success('Review removed.')
      onSuccess()
      onClose()
    },
    onError: () => toast.error('Failed to remove review.'),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove review</DialogTitle>
          <DialogDescription>
            This review will be removed from the property listing. A reason is required.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-white p-3 text-sm text-navy-500">
          "{review.reviewText?.slice(0, 200) ?? 'No text'}{(review.reviewText?.length ?? 0) > 200 ? '…' : ''}"
        </div>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div>
            <Textarea
              {...form.register('reason')}
              placeholder="Reason for removal…"
              rows={3}
              maxLength={2000}
              data-testid="remove-reason"
            />
            {form.formState.errors.reason && (
              <p className="mt-1 text-xs text-error-500">{form.formState.errors.reason.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={mutation.isPending}>
              {mutation.isPending ? 'Removing…' : 'Remove review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Flagged queue
// ---------------------------------------------------------------------------

function FlaggedQueue() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [removeTarget, setRemoveTarget] = useState<ReviewListItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews-flagged', page],
    queryFn: () => adminReviewsApi.listFlagged(page, PAGE_LIMIT),
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => adminReviewsApi.moderate(id, 'publish'),
    onSuccess: () => {
      toast.success('Review published.')
      queryClient.invalidateQueries({ queryKey: ['admin-reviews-flagged'] })
      queryClient.invalidateQueries({ queryKey: ['admin-reviews-all'] })
      queryClient.invalidateQueries({ queryKey: ['admin-reviews-flagged-count'] })
    },
    onError: () => toast.error('Failed to publish review.'),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-reviews-flagged'] })
    queryClient.invalidateQueries({ queryKey: ['admin-reviews-all'] })
    queryClient.invalidateQueries({ queryKey: ['admin-reviews-flagged-count'] })
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_LIMIT) : 1

  if (isLoading) return <p className="text-sm text-navy-500">Loading…</p>

  if (!data?.items.length) {
    return (
      <div className="rounded-[10px] border border-border bg-white p-8 text-center text-sm text-navy-500">
        No flagged reviews — the queue is clear.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.items.map((review) => (
        <div
          key={review.id}
          data-testid="flagged-review-row"
          className="rounded-[10px] border border-border bg-white p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-navy-900">{review.guestName ?? 'Guest'}</p>
              <p className="text-xs text-navy-500">{review.bookingRef ?? review.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-sm text-navy-900">
                <Star size={13} className="fill-primary-600 text-primary-600" />
                {Number(review.displayScore).toFixed(1)}
              </span>
              <Badge variant={STATUS_BADGE_VARIANT[review.status]}>{review.status}</Badge>
            </div>
          </div>

          {review.reviewText && (
            <p className="text-sm text-navy-500 line-clamp-3">"{review.reviewText}"</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              data-testid="publish-btn"
              size="sm"
              variant="dark"
              onClick={() => publishMutation.mutate(review.id)}
              disabled={publishMutation.isPending}
            >
              <CheckCircle size={14} className="mr-1" />
              Publish
            </Button>
            <Button
              data-testid="remove-btn"
              size="sm"
              variant="outline"
              onClick={() => setRemoveTarget(review)}
            >
              <Trash2 size={14} className="mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-navy-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {removeTarget && (
        <RemoveDialog
          review={removeTarget}
          onClose={() => setRemoveTarget(null)}
          onSuccess={invalidate}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// All reviews list
// ---------------------------------------------------------------------------

function AllReviews() {
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const [removeTarget, setRemoveTarget] = useState<ReviewListItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews-all', page],
    queryFn: () => adminReviewsApi.list({ page, limit: PAGE_LIMIT }),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-reviews-all'] })
    queryClient.invalidateQueries({ queryKey: ['admin-reviews-flagged'] })
    queryClient.invalidateQueries({ queryKey: ['admin-reviews-flagged-count'] })
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_LIMIT) : 1

  if (isLoading) return <p className="text-sm text-navy-500">Loading…</p>

  if (!data?.items.length) {
    return (
      <div className="rounded-[10px] border border-border bg-white p-8 text-center text-sm text-navy-500">
        No reviews found.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {data.items.map((review) => (
        <div
          key={review.id}
          data-testid="all-review-row"
          className="flex items-center gap-4 rounded-[10px] border border-border bg-white px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-navy-900 truncate">{review.guestName ?? 'Guest'}</p>
            <p className="text-xs text-navy-500 truncate">
              {review.reviewText?.slice(0, 80) ?? '—'}
            </p>
          </div>
          <span className="flex items-center gap-1 text-sm text-navy-900 shrink-0">
            <Star size={13} className="fill-primary-600 text-primary-600" />
            {Number(review.displayScore).toFixed(1)}
          </span>
          <Badge variant={STATUS_BADGE_VARIANT[review.status]} className="shrink-0">
            {review.status}
          </Badge>
          {review.status !== 'removed' && (
            <Button
              data-testid="all-remove-btn"
              size="sm"
              variant="ghost"
              className="text-navy-500 hover:text-error-500 shrink-0"
              onClick={() => setRemoveTarget(review)}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-navy-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {removeTarget && (
        <RemoveDialog
          review={removeTarget}
          onClose={() => setRemoveTarget(null)}
          onSuccess={invalidate}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function AdminReviewsView() {
  const [tab, setTab] = useState<'flagged' | 'all'>('flagged')

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div
        className="flex gap-1 rounded-xl bg-white p-1 w-fit border border-border"
        role="tablist"
        aria-label="Review tabs"
      >
        {(['flagged', 'all'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            data-testid={`tab-${t}`}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-primary-50 text-primary-700 shadow'
                : 'text-navy-500 hover:text-navy-900'
            }`}
          >
            {t === 'flagged' ? (
              <span className="flex items-center gap-1">
                Flagged <ReviewFlaggedBadge />
              </span>
            ) : (
              'All Reviews'
            )}
          </button>
        ))}
      </div>

      {tab === 'flagged' ? <FlaggedQueue /> : <AllReviews />}
    </div>
  )
}
