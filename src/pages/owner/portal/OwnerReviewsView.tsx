import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Flag, MessageSquare, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { SectionCard } from '@/components/shared/SectionCard'
import { useAuth } from '@/hooks/useAuth'
import { ownerReviewsApi, type ReviewListItem, type ReviewStatus } from '@/lib/api/ownerReviews'

const PAGE_LIMIT = 20

const STATUS_BADGE: Record<ReviewStatus, BadgeProps['variant']> = {
  pending: 'amber',
  published: 'green',
  flagged: 'red',
  removed: 'grey',
}

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'Pending',
  published: 'Published',
  flagged: 'Flagged',
  removed: 'Removed',
}

function StarRow({ score, label }: { score: number; label: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-navy-600">{label}</span>
      <span className="font-semibold text-navy-900">{score.toFixed(1)} / 5</span>
    </div>
  )
}

function RatingSummaryCard({ propertyId }: { propertyId: string }) {
  const { data } = useQuery({
    queryKey: ['owner-review-summary', propertyId],
    queryFn: () => ownerReviewsApi.summary(propertyId),
  })

  if (!data) return null

  return (
    <SectionCard title="Rating snapshot">
      {data.meetsThreshold && data.ratingAvg !== null ? (
        <>
          <p className="font-display text-5xl font-bold text-navy-900">{data.ratingAvg.toFixed(1)}</p>
          <p className="mt-1 text-sm text-navy-500">{data.ratingCount} reviews</p>
        </>
      ) : (
        <div className="space-y-1">
          <p className="font-display text-3xl font-bold text-navy-900">—</p>
          <p className="text-sm text-navy-500">
            {data.ratingCount} review{data.ratingCount !== 1 ? 's' : ''} · {Math.max(0, 5 - data.ratingCount)} more needed to display average
          </p>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {([5, 4, 3, 2, 1] as const).map((star) => (
          <div key={star} className="flex items-center gap-2 text-sm">
            <span className="w-4 text-navy-600">{star}★</span>
            <div className="h-2 flex-1 rounded-full bg-navy-100">
              <div
                className="h-2 rounded-full bg-primary-600"
                style={{ width: data.ratingCount > 0 ? `${(data.breakdown[String(star) as '1'|'2'|'3'|'4'|'5'] / data.ratingCount) * 100}%` : '0%' }}
              />
            </div>
            <span className="w-4 text-right text-navy-500">{data.breakdown[String(star) as '1'|'2'|'3'|'4'|'5']}</span>
          </div>
        ))}
      </div>

      {data.ratingCount > 0 && (
        <div className="mt-5 space-y-2 border-t border-border pt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Dimensions</p>
          <StarRow score={data.dimensions.cleanliness} label="Cleanliness" />
          <StarRow score={data.dimensions.amenities} label="Amenities" />
          <StarRow score={data.dimensions.accuracy} label="Accuracy" />
          <StarRow score={data.dimensions.value} label="Value" />
          <StarRow score={data.dimensions.checkin} label="Check-in" />
        </div>
      )}
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Reply dialog
// ---------------------------------------------------------------------------

const replySchema = z.object({ reply: z.string().min(1, 'Required').max(1000) })

function ReplyDialog({ review, onClose, propertyId }: { review: ReviewListItem; onClose: () => void; propertyId: string }) {
  const queryClient = useQueryClient()
  const form = useForm<{ reply: string }>({ resolver: zodResolver(replySchema) })
  const mutation = useMutation({
    mutationFn: (reply: string) => ownerReviewsApi.reply(review.id, reply),
    onSuccess: () => {
      toast.success('Reply posted.')
      queryClient.invalidateQueries({ queryKey: ['owner-reviews-list', propertyId] })
      onClose()
    },
    onError: () => toast.error('Could not post reply. Please try again.'),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reply to review</DialogTitle>
          <DialogDescription>Your reply will be visible publicly alongside the guest's review.</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-navy-50 p-3 text-sm text-navy-600">
          "{review.reviewText ?? 'No text'}"
        </div>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v.reply))} className="space-y-4">
          <div>
            <Textarea
              {...form.register('reply')}
              placeholder="Write your reply… (max 1,000 chars)"
              rows={4}
              maxLength={1000}
            />
            {form.formState.errors.reply && (
              <p className="mt-1 text-xs text-error-500">{form.formState.errors.reply.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Posting…' : 'Post reply'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Flag dialog
// ---------------------------------------------------------------------------

const flagSchema = z.object({ reason: z.string().max(500).optional() })

function FlagDialog({ review, onClose, propertyId }: { review: ReviewListItem; onClose: () => void; propertyId: string }) {
  const queryClient = useQueryClient()
  const form = useForm<{ reason?: string }>({ resolver: zodResolver(flagSchema) })
  const mutation = useMutation({
    mutationFn: (reason?: string) => ownerReviewsApi.flag(review.id, reason),
    onSuccess: () => {
      toast.success('Review flagged for moderation.')
      queryClient.invalidateQueries({ queryKey: ['owner-reviews-list', propertyId] })
      onClose()
    },
    onError: (err: Error) => {
      const msg = err.message.includes('429') ? 'Flag rate limit reached (3 per week).' : 'Could not flag review.'
      toast.error(msg)
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flag review</DialogTitle>
          <DialogDescription>This review will be sent to the admin moderation queue.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v.reason))} className="space-y-4">
          <div>
            <Textarea
              {...form.register('reason')}
              placeholder="Reason (optional)"
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={mutation.isPending}>
              {mutation.isPending ? 'Flagging…' : 'Flag review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Review row
// ---------------------------------------------------------------------------

function ReviewRow({ review, propertyId }: { review: ReviewListItem; propertyId: string }) {
  const [showReply, setShowReply] = useState(false)
  const [showFlag, setShowFlag] = useState(false)

  const canReply =
    review.status === 'published' &&
    !review.ownerReply &&
    review.replyWindowEnd &&
    new Date(review.replyWindowEnd) > new Date()

  const canFlag = review.status === 'published'

  return (
    <>
      <article
        data-testid="review-row"
        className="rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-1"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="font-semibold text-navy-900">{review.guestName ?? 'Guest'}</p>
            <p className="text-sm text-navy-500">{review.bookingRef ?? ''}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-sm font-semibold text-primary-600">
              <Star size={14} className="fill-primary-600 text-primary-600" />
              {Number(review.displayScore).toFixed(1)}
            </span>
            <Badge variant={STATUS_BADGE[review.status]}>{STATUS_LABELS[review.status]}</Badge>
          </div>
        </div>

        {review.reviewText && (
          <p className="mt-3 text-sm text-navy-600 line-clamp-3">{review.reviewText}</p>
        )}

        {review.ownerReply && (
          <div className="mt-3 rounded-lg border border-border bg-navy-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-navy-500 mb-1">Your reply</p>
            <p className="text-sm text-navy-700">{review.ownerReply}</p>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {canReply && (
            <Button
              data-testid="reply-btn"
              variant="outline"
              size="sm"
              onClick={() => setShowReply(true)}
            >
              <MessageSquare size={14} className="mr-1" />
              Reply
            </Button>
          )}
          {canFlag && (
            <Button
              data-testid="flag-btn"
              variant="ghost"
              size="sm"
              className="text-navy-500 hover:text-error-500"
              onClick={() => setShowFlag(true)}
            >
              <Flag size={14} className="mr-1" />
              Flag
            </Button>
          )}
        </div>
      </article>

      {showReply && (
        <ReplyDialog review={review} onClose={() => setShowReply(false)} propertyId={propertyId} />
      )}
      {showFlag && (
        <FlagDialog review={review} onClose={() => setShowFlag(false)} propertyId={propertyId} />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function OwnerReviewsView() {
  const { user } = useAuth()
  const propertyId = user?.propertyId
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['owner-reviews-list', propertyId, page],
    queryFn: () => ownerReviewsApi.list(propertyId!, page, PAGE_LIMIT),
    enabled: Boolean(propertyId),
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_LIMIT) : 1

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {propertyId && <RatingSummaryCard propertyId={propertyId} />}

        <div className="space-y-4">
          {isLoading && (
            <p className="text-sm text-navy-500" role="status">Loading reviews…</p>
          )}

          {!isLoading && data?.items.length === 0 && (
            <div className="rounded-[var(--radius-lg)] border border-border bg-white p-8 text-center text-sm text-navy-500">
              No reviews yet. Reviews appear here once guests check out and submit feedback.
            </div>
          )}

          {data?.items.map((review) => (
            propertyId ? (
              <ReviewRow key={review.id} review={review} propertyId={propertyId} />
            ) : null
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-navy-500">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
