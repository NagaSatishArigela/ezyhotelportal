import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { SectionCard } from '@/components/shared/SectionCard'
import { useAuth } from '@/hooks/useAuth'
import {
  ownerDisputesApi,
  type OwnerDisputeListItem,
} from '@/lib/api/ownerDisputes'
import type { DisputeCategory, DisputeStatus } from '@/lib/api/adminDisputes'

const PAGE_LIMIT = 20

const CATEGORY_LABELS: Record<DisputeCategory, string> = {
  room_quality: 'Room quality',
  cleanliness: 'Cleanliness',
  amenities: 'Amenities',
  staff: 'Staff',
  safety: 'Safety',
  charges: 'Charges',
  other: 'Other',
}

const STATUS_LABELS: Record<DisputeStatus, string> = {
  filed: 'Filed',
  under_review: 'Under review',
  awaiting_hotel_response: 'Awaiting your response',
  resolved_guest: 'Resolved – guest favour',
  resolved_hotel: 'Resolved – hotel favour',
  resolved_partial: 'Resolved – partial refund',
  resolved_wallet_credit: 'Resolved – wallet credit',
  escalated: 'Escalated',
  closed_no_response: 'Closed – no response',
}

const STATUS_BADGE: Record<DisputeStatus, BadgeProps['variant']> = {
  filed: 'amber',
  under_review: 'teal',
  awaiting_hotel_response: 'amber',
  resolved_guest: 'grey',
  resolved_hotel: 'green',
  resolved_partial: 'grey',
  resolved_wallet_credit: 'grey',
  escalated: 'red',
  closed_no_response: 'grey',
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

// ---------------------------------------------------------------------------
// Hotel response dialog
// ---------------------------------------------------------------------------

const responseSchema = z.object({
  response: z.string().min(1, 'Required').max(2000),
  evidenceUrl1: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  evidenceUrl2: z.string().url('Enter a valid URL').optional().or(z.literal('')),
})

function HotelResponseDialog({ disputeId, onClose, onSuccess }: {
  disputeId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const form = useForm<z.infer<typeof responseSchema>>({
    resolver: zodResolver(responseSchema),
    defaultValues: { response: '', evidenceUrl1: '', evidenceUrl2: '' },
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const values = form.getValues()
      const evidence = [values.evidenceUrl1, values.evidenceUrl2].filter((url): url is string => Boolean(url))
      return ownerDisputesApi.submitHotelResponse(disputeId, {
        response: values.response,
        evidence: evidence.length > 0 ? evidence : undefined,
      })
    },
    onSuccess: () => {
      toast.success('Response submitted')
      onSuccess()
      onClose()
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to submit response'
      toast.error(message)
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Respond to dispute</DialogTitle>
          <DialogDescription>Explain your side and attach any supporting evidence (photos, screenshots).</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={form.handleSubmit(() => mutation.mutate())}>
          <label className="text-sm font-semibold text-navy-900">
            Your response
            <Textarea className="mt-1" {...form.register('response')} />
            {form.formState.errors.response && (
              <p className="mt-1 text-xs text-error-600">{form.formState.errors.response.message}</p>
            )}
          </label>
          <label className="text-sm font-semibold text-navy-900">
            Evidence URL (optional)
            <Input className="mt-1" placeholder="https://..." {...form.register('evidenceUrl1')} />
            {form.formState.errors.evidenceUrl1 && (
              <p className="mt-1 text-xs text-error-600">{form.formState.errors.evidenceUrl1.message}</p>
            )}
          </label>
          <label className="text-sm font-semibold text-navy-900">
            Evidence URL (optional)
            <Input className="mt-1" placeholder="https://..." {...form.register('evidenceUrl2')} />
            {form.formState.errors.evidenceUrl2 && (
              <p className="mt-1 text-xs text-error-600">{form.formState.errors.evidenceUrl2.message}</p>
            )}
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>Submit response</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function OwnerDisputesView() {
  const { user } = useAuth()
  const propertyId = user?.propertyId
  const [page, setPage] = useState(1)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['owner-disputes-list', propertyId, page],
    queryFn: () => ownerDisputesApi.list(propertyId!, page, PAGE_LIMIT),
    enabled: Boolean(propertyId),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  function refreshList() {
    queryClient.invalidateQueries({ queryKey: ['owner-disputes-list', propertyId] })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Owner portal</p>
        <h1 className="font-display text-2xl font-bold text-navy-900">Disputes</h1>
        <p className="mt-1 text-sm text-navy-500">Guest complaints filed against your property and their resolution status.</p>
      </div>

      <SectionCard title="Disputes">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <caption className="sr-only">Disputes table</caption>
            <thead className="text-xs font-bold uppercase tracking-wider text-navy-400">
              <tr>
                <th scope="col" className="px-4 py-3">Dispute ref</th>
                <th scope="col" className="px-4 py-3">Booking ref</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Filed at</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-navy-500">Loading disputes…</td></tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-navy-500">No disputes have been filed for your property.</td></tr>
              )}
              {items.map((item: OwnerDisputeListItem) => (
                <tr key={item.id} data-testid={`owner-dispute-row-${item.id}`}>
                  <td className="px-4 py-4 font-mono text-xs font-bold text-navy-900">{item.disputeRef}</td>
                  <td className="px-4 py-4 font-mono text-xs text-navy-500">{item.bookingRef ?? '—'}</td>
                  <td className="px-4 py-4 text-navy-700">{CATEGORY_LABELS[item.category]}</td>
                  <td className="px-4 py-4 text-navy-500">{formatDateTime(item.filedAt)}</td>
                  <td className="px-4 py-4"><Badge variant={STATUS_BADGE[item.status]}>{STATUS_LABELS[item.status]}</Badge></td>
                  <td className="px-4 py-4">
                    {item.status === 'awaiting_hotel_response' && (
                      <Button size="sm" onClick={() => setRespondingId(item.id)}>Respond</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-navy-500">
          <p>{total.toLocaleString('en-IN')} {total === 1 ? 'dispute' : 'disputes'} · page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </SectionCard>

      {respondingId && (
        <HotelResponseDialog disputeId={respondingId} onClose={() => setRespondingId(null)} onSuccess={refreshList} />
      )}
    </div>
  )
}
