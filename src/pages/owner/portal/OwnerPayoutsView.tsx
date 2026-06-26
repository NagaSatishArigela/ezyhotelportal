import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, IndianRupee, Wallet, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SectionCard } from '@/components/shared/SectionCard'
import { formatINR, formatDate } from '@/lib/utils'
import { ownerPayoutsApi, type OwnerPayoutSummary, type PayoutItemStatus } from '@/lib/api/ownerPayouts'

const STATUS_BADGE: Record<PayoutItemStatus, BadgeProps['variant']> = {
  pending: 'amber',
  on_hold: 'red',
  released: 'green',
  failed: 'red',
}

const STATUS_LABEL: Record<PayoutItemStatus, string> = {
  pending: 'Pending',
  on_hold: 'On hold',
  released: 'Released',
  failed: 'Failed',
}

function paise(p: number) {
  return formatINR(p / 100)
}

function KpiCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: React.ElementType }) {
  return (
    <div className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-navy-500">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-navy-900">{value}</p>
          <p className="mt-1 text-xs text-navy-400">{sub}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-50 text-primary-600">
          <Icon size={18} aria-hidden />
        </span>
      </div>
    </div>
  )
}

function DetailDialog({ item, open, onClose }: { item: OwnerPayoutSummary | null; open: boolean; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ['owner-payout-detail', item?.id],
    queryFn: () => ownerPayoutsApi.detail(item!.id),
    enabled: open && !!item,
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settlement {item?.batchRef}</DialogTitle>
        </DialogHeader>
        {data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-[10px] bg-navy-50 p-3">
                <p className="text-xs text-navy-500">Gross</p>
                <p className="mt-1 font-bold text-navy-900">{paise(data.grossAmountPaise)}</p>
              </div>
              <div className="rounded-[10px] bg-navy-50 p-3">
                <p className="text-xs text-navy-500">TDS (1%)</p>
                <p className="mt-1 font-bold text-navy-900">{paise(data.tdsPaise)}</p>
              </div>
              <div className="rounded-[10px] bg-primary-50 p-3">
                <p className="text-xs text-primary-700">Net payout</p>
                <p className="mt-1 font-bold text-primary-700">{paise(data.netAmountPaise)}</p>
              </div>
            </div>
            {data.bookings.length > 0 && (
              <div className="overflow-x-auto rounded-[10px] border border-border">
                <table className="w-full text-left text-sm" data-testid="booking-breakdown-table">
                  <thead className="bg-navy-50 text-xs font-bold uppercase tracking-wider text-navy-500">
                    <tr>
                      <th className="px-3 py-2">Booking ID</th>
                      <th className="px-3 py-2">Gross</th>
                      <th className="px-3 py-2">TDS</th>
                      <th className="px-3 py-2">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.bookings.map((b) => (
                      <tr key={b.bookingId} className="hover:bg-navy-50">
                        <td className="px-3 py-2 font-mono text-xs">{b.bookingId.slice(0, 8)}</td>
                        <td className="px-3 py-2">{paise(b.ownerGrossPaise)}</td>
                        <td className="px-3 py-2 text-warning-700">{paise(b.tdsPaise)}</td>
                        <td className="px-3 py-2 font-semibold">{paise(b.ownerGrossPaise - b.tdsPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" disabled aria-label="Download TDS certificate (coming soon)">
                <Download size={14} aria-hidden /> TDS certificate
              </Button>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-navy-500">Loading…</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function OwnerPayoutsView() {
  const [detailItem, setDetailItem] = useState<OwnerPayoutSummary | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['owner-payouts'],
    queryFn: () => ownerPayoutsApi.list(),
  })

  const items = data?.items ?? []

  const upcomingPaise = items
    .filter((i) => i.status === 'pending')
    .reduce((s, i) => s + i.netAmountPaise, 0)

  const releasedPaise = items
    .filter((i) => i.status === 'released')
    .reduce((s, i) => s + i.netAmountPaise, 0)

  const tdsPaise = items.reduce((s, i) => s + i.tdsPaise, 0)

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-navy-500">Loading payouts…</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Upcoming settlement" value={items.length ? paise(upcomingPaise) : '—'} sub="Pending batches" icon={Wallet} />
        <KpiCard label="Released (all time)" value={items.length ? paise(releasedPaise) : '—'} sub="Net credited" icon={IndianRupee} />
        <KpiCard label="TDS deducted (all time)" value={items.length ? paise(tdsPaise) : '—'} sub="Available in tax report" icon={Receipt} />
      </div>

      {items.length === 0 ? (
        <SectionCard>
          <p className="py-8 text-center text-sm text-navy-500">No payout history yet. Payouts are generated weekly after your first completed booking.</p>
        </SectionCard>
      ) : (
        <div className="overflow-x-auto rounded-(--radius-lg) border border-border bg-white shadow-1">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Payout settlement history</caption>
            <thead className="bg-navy-50 text-xs font-bold uppercase tracking-wider text-navy-500">
              <tr>
                <th className="px-4 py-3">Settlement ref</th>
                <th className="px-4 py-3">Cycle</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">TDS</th>
                <th className="px-4 py-3">Net</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-navy-50" data-testid="payout-row">
                  <td className="px-4 py-4 font-mono text-xs font-bold text-navy-900">{item.batchRef}</td>
                  <td className="px-4 py-4 text-navy-700 text-xs">
                    {formatDate(item.cycleStartAt)} – {formatDate(item.cycleEndAt)}
                  </td>
                  <td className="px-4 py-4 text-navy-700">{item.bookingCount}</td>
                  <td className="px-4 py-4 text-navy-700">{paise(item.grossAmountPaise)}</td>
                  <td className="px-4 py-4 text-warning-700">{paise(item.tdsPaise)}</td>
                  <td className="px-4 py-4 font-bold text-navy-900">{paise(item.netAmountPaise)}</td>
                  <td className="px-4 py-4">
                    <Badge variant={STATUS_BADGE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Button variant="ghost" size="sm" onClick={() => setDetailItem(item)} data-testid="payout-detail-btn">
                      Detail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailDialog item={detailItem} open={!!detailItem} onClose={() => setDetailItem(null)} />
    </div>
  )
}
