import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle, Wallet, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatINR, formatDate } from '@/lib/utils'
import {
  adminPayoutsApi,
  type AdminPayoutBatch,
  type AdminPayoutItem,
  type PayoutBatchStatus,
  type PayoutItemStatus,
} from '@/lib/api/adminPayouts'

function paise(p: number) {
  return formatINR(p / 100)
}

const BATCH_BADGE: Record<PayoutBatchStatus, BadgeProps['variant']> = {
  pending: 'amber',
  processing: 'teal',
  released: 'green',
  partial: 'amber',
  failed: 'red',
}

const ITEM_BADGE: Record<PayoutItemStatus, BadgeProps['variant']> = {
  pending: 'amber',
  on_hold: 'red',
  released: 'green',
  failed: 'red',
}

const ITEM_LABEL: Record<PayoutItemStatus, string> = {
  pending: 'Pending',
  on_hold: 'On hold',
  released: 'Released',
  failed: 'Failed',
}

const holdSchema = z.object({ reason: z.string().min(10, 'Minimum 10 characters').max(500) })
type HoldForm = z.infer<typeof holdSchema>

function HoldDialog({ item, open, onClose }: { item: AdminPayoutItem | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<HoldForm>({ resolver: zodResolver(holdSchema) })

  const mutation = useMutation({
    mutationFn: (reason: string) => adminPayoutsApi.holdItem(item!.id, reason),
    onSuccess: () => {
      toast.success('Item placed on hold')
      qc.invalidateQueries({ queryKey: ['admin-payouts'] })
      qc.invalidateQueries({ queryKey: ['admin-payout-detail'] })
      reset()
      onClose()
    },
    onError: () => toast.error('Failed to hold item'),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hold payout item</DialogTitle>
          <DialogDescription>Provide a reason for placing this item on hold. The owner will not be paid until the hold is lifted.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d.reason))}
          className="space-y-4"
        >
          <div>
            <Textarea
              {...register('reason')}
              placeholder="Compliance review, pending dispute resolution…"
              rows={3}
              data-testid="hold-reason"
            />
            {errors.reason && <p className="mt-1 text-xs text-error-500">{errors.reason.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={mutation.isPending} data-testid="confirm-hold-btn">
              {mutation.isPending ? 'Holding…' : 'Place on hold'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BatchDetailDialog({ batch, open, onClose }: { batch: AdminPayoutBatch | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [holdTarget, setHoldTarget] = useState<AdminPayoutItem | null>(null)

  const { data } = useQuery({
    queryKey: ['admin-payout-detail', batch?.id],
    queryFn: () => adminPayoutsApi.detail(batch!.id),
    enabled: open && !!batch,
  })

  const releaseItemMut = useMutation({
    mutationFn: (itemId: string) => adminPayoutsApi.releaseItem(itemId),
    onSuccess: () => {
      toast.success('Item released')
      qc.invalidateQueries({ queryKey: ['admin-payout-detail', batch?.id] })
      qc.invalidateQueries({ queryKey: ['admin-payouts'] })
    },
    onError: () => toast.error('Failed to release item'),
  })

  const releaseBatchMut = useMutation({
    mutationFn: () => adminPayoutsApi.releaseBatch(batch!.id),
    onSuccess: (r) => {
      toast.success(`Released ${r.released} items${r.skipped ? `, skipped ${r.skipped} on hold` : ''}`)
      qc.invalidateQueries({ queryKey: ['admin-payout-detail', batch?.id] })
      qc.invalidateQueries({ queryKey: ['admin-payouts'] })
    },
    onError: () => toast.error('Failed to release batch'),
  })

  const items = data?.items ?? []
  const pendingCount = items.filter((i) => i.status === 'pending').length

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Batch {batch?.batchRef}</DialogTitle>
            <DialogDescription>
              {batch && `${formatDate(batch.cycleStartAt)} – ${formatDate(batch.cycleEndAt)} · ${batch.itemCount} properties`}
            </DialogDescription>
          </DialogHeader>

          {data && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-[10px] bg-white p-3">
                  <p className="text-xs text-navy-500">Total gross</p>
                  <p className="mt-1 font-bold text-navy-900">{paise(data.totalGrossPaise)}</p>
                </div>
                <div className="rounded-[10px] bg-white p-3">
                  <p className="text-xs text-navy-500">TDS</p>
                  <p className="mt-1 font-bold text-warning-400">{paise(data.totalTdsPaise)}</p>
                </div>
                <div className="rounded-[10px] bg-white p-3">
                  <p className="text-xs text-navy-500">Net payout</p>
                  <p className="mt-1 font-bold text-success-500">{paise(data.totalNetPaise)}</p>
                </div>
              </div>

              {pendingCount > 0 && (
                <Button
                  onClick={() => releaseBatchMut.mutate()}
                  disabled={releaseBatchMut.isPending}
                  size="sm"
                  data-testid="release-batch-btn"
                >
                  {releaseBatchMut.isPending ? 'Releasing…' : `Release ${pendingCount} pending item${pendingCount > 1 ? 's' : ''}`}
                </Button>
              )}

              <div className="overflow-x-auto rounded-[10px] border border-border">
                <table className="w-full text-left text-sm" data-testid="batch-items-table">
                  <thead className="bg-white text-xs font-bold uppercase tracking-wider text-navy-500">
                    <tr>
                      <th className="px-3 py-2">Property</th>
                      <th className="px-3 py-2">Bookings</th>
                      <th className="px-3 py-2">Gross</th>
                      <th className="px-3 py-2">TDS</th>
                      <th className="px-3 py-2">Net</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-navy-50" data-testid="batch-item-row">
                        <td className="px-3 py-3 font-mono text-xs text-navy-900">{item.propertyId.slice(0, 8)}</td>
                        <td className="px-3 py-3 text-navy-500">{item.bookingCount}</td>
                        <td className="px-3 py-3 text-navy-500">{paise(item.grossAmountPaise)}</td>
                        <td className="px-3 py-3 text-warning-400">{paise(item.tdsPaise)}</td>
                        <td className="px-3 py-3 font-bold text-navy-900">{paise(item.netAmountPaise)}</td>
                        <td className="px-3 py-3">
                          <Badge variant={ITEM_BADGE[item.status]}>{ITEM_LABEL[item.status]}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            {item.status === 'pending' && (
                              <Button variant="dark" size="sm" onClick={() => setHoldTarget(item)} data-testid="hold-btn">
                                Hold
                              </Button>
                            )}
                            {item.status === 'on_hold' && (
                              <Button
                                variant="dark"
                                size="sm"
                                onClick={() => releaseItemMut.mutate(item.id)}
                                disabled={releaseItemMut.isPending}
                                data-testid="release-item-btn"
                              >
                                Release
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <HoldDialog item={holdTarget} open={!!holdTarget} onClose={() => setHoldTarget(null)} />
    </>
  )
}

export function AdminPayoutsView() {
  const [detailBatch, setDetailBatch] = useState<AdminPayoutBatch | null>(null)

  const { data: summary } = useQuery({
    queryKey: ['admin-payouts-summary'],
    queryFn: adminPayoutsApi.summary,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payouts'],
    queryFn: () => adminPayoutsApi.list(),
  })

  const batches = data?.items ?? []

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-navy-500">Pending batches</p>
              <p className="mt-2 font-display text-3xl font-bold text-navy-900">{summary?.pendingBatches ?? '—'}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-600/10 text-primary-600"><Wallet size={18} /></span>
          </div>
        </div>
        <div className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-navy-500">Items on hold</p>
              <p className="mt-2 font-display text-3xl font-bold text-navy-900">{summary?.onHoldItems ?? '—'}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-600/10 text-primary-600"><AlertTriangle size={18} /></span>
          </div>
        </div>
        <div className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-navy-500">Released MTD</p>
              <p className="mt-2 font-display text-3xl font-bold text-navy-900">{summary ? paise(summary.releasedMtdPaise) : '—'}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-600/10 text-primary-600"><CheckCircle size={18} /></span>
          </div>
        </div>
        <div className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-navy-500">TDS withheld MTD</p>
              <p className="mt-2 font-display text-3xl font-bold text-navy-900">{summary ? paise(summary.tdsMtdPaise) : '—'}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-600/10 text-primary-600"><IndianRupee size={18} /></span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-navy-500">Loading batches…</p>
      ) : batches.length === 0 ? (
        <div className="rounded-(--radius-lg) border border-border bg-white p-8 text-center text-sm text-navy-500">
          No payout batches yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-(--radius-lg) border border-border bg-white shadow-2">
          <table className="w-full min-w-[820px] text-left text-sm" data-testid="admin-batches-table">
            <caption className="sr-only">Payout batch list</caption>
            <thead className="bg-white text-xs font-bold uppercase tracking-wider text-navy-500">
              <tr>
                <th className="px-4 py-3">Batch ref</th>
                <th className="px-4 py-3">Cycle</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total net</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-navy-50" data-testid="batch-row">
                  <td className="px-4 py-4 font-mono text-xs font-bold text-navy-900">{batch.batchRef}</td>
                  <td className="px-4 py-4 text-navy-500 text-xs">
                    {formatDate(batch.cycleStartAt)} – {formatDate(batch.cycleEndAt)}
                  </td>
                  <td className="px-4 py-4 text-navy-500">{batch.itemCount}</td>
                  <td className="px-4 py-4 font-bold text-navy-900">{paise(batch.totalNetPaise)}</td>
                  <td className="px-4 py-4">
                    <Badge variant={BATCH_BADGE[batch.status]}>{batch.status}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Button variant="dark" size="sm" onClick={() => setDetailBatch(batch)} data-testid="batch-detail-btn">
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BatchDetailDialog batch={detailBatch} open={!!detailBatch} onClose={() => setDetailBatch(null)} />
    </div>
  )
}
