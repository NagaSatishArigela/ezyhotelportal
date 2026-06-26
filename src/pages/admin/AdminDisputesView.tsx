import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { cn, formatINR } from '@/lib/utils'
import {
  adminDisputesApi,
  DISPUTE_CATEGORY_VALUES,
  DISPUTE_STATUS_VALUES,
  type AdminDisputeListItem,
  type DisputeCategory,
  type DisputeResolutionType,
  type DisputeStatus,
} from '@/lib/api/adminDisputes'

const PAGE_LIMIT = 50

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
  awaiting_hotel_response: 'Awaiting hotel response',
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
  resolved_guest: 'green',
  resolved_hotel: 'grey',
  resolved_partial: 'green',
  resolved_wallet_credit: 'green',
  escalated: 'red',
  closed_no_response: 'grey',
}

const OPEN_STATUSES: DisputeStatus[] = ['filed', 'under_review', 'awaiting_hotel_response']

const RESOLUTION_LABELS: Record<DisputeResolutionType, string> = {
  full_refund: 'Full refund',
  partial_refund: 'Partial refund',
  no_action: 'No action',
  wallet_credit: 'Wallet credit',
  escalated: 'Escalate',
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

function formatPaise(paise: number): string {
  return formatINR(Math.round(paise / 100))
}

function formatDeadline(hoursUntilDeadline: number): { text: string; urgent: boolean } {
  if (hoursUntilDeadline < 0) {
    return { text: `Overdue by ${Math.abs(hoursUntilDeadline)}h`, urgent: true }
  }
  return { text: `${hoursUntilDeadline}h left`, urgent: hoursUntilDeadline < 24 }
}

// ---------------------------------------------------------------------------
// Tab badge
// ---------------------------------------------------------------------------

export function DisputesTabBadge() {
  const { data } = useQuery({
    queryKey: ['admin-disputes-unresolved-count'],
    queryFn: () => adminDisputesApi.unresolvedCount(),
    refetchInterval: 60_000,
  })

  if (!data || data.count === 0) return null

  return (
    <Badge variant="red" className="ml-1">{data.count}</Badge>
  )
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

interface DisputeFilters {
  status: DisputeStatus[]
  category: DisputeCategory[]
  dateFrom?: string
  dateTo?: string
}

function MultiSelectDropdown<T extends string>({ label, options, labels, value, onChange }: {
  label: string
  options: readonly T[]
  labels: Record<T, string>
  value: T[]
  onChange: (next: T[]) => void
}) {
  function toggle(option: T) {
    if (value.includes(option)) onChange(value.filter((v) => v !== option))
    else onChange([...value, option])
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button
          variant="outline" size="sm" data-testid={`dispute-filter-${label.toLowerCase()}`}
          className="border-border bg-white text-navy-900 hover:bg-navy-50"
        >
          {label} {value.length > 0 ? `(${value.length})` : ''}
        </Button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          sideOffset={4}
          className="z-50 min-w-[220px] rounded-(--radius-md) border border-border bg-white p-1 shadow-2"
        >
          {options.map((option) => (
            <DropdownMenuPrimitive.CheckboxItem
              key={option}
              checked={value.includes(option)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => toggle(option)}
              className="flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm text-navy-900 outline-none transition-colors hover:bg-navy-50"
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-[4px] border border-border',
                  value.includes(option) && 'border-primary-600 bg-primary-600'
                )}
              >
                {value.includes(option) && <span className="h-1.5 w-1.5 rounded-[2px] bg-white" />}
              </span>
              {labels[option]}
            </DropdownMenuPrimitive.CheckboxItem>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

function DisputesFilterBar({ filters, onChange }: { filters: DisputeFilters; onChange: (next: DisputeFilters) => void }) {
  const hasFilters = Boolean(
    filters.status.length > 0 || filters.category.length > 0 || filters.dateFrom || filters.dateTo
  )

  return (
    <div className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-2">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-navy-500">Filters</h2>
      <div className="flex flex-wrap items-end gap-3">
        <MultiSelectDropdown
          label="Status"
          options={DISPUTE_STATUS_VALUES}
          labels={STATUS_LABELS}
          value={filters.status}
          onChange={(next) => onChange({ ...filters, status: next })}
        />
        <MultiSelectDropdown
          label="Category"
          options={DISPUTE_CATEGORY_VALUES}
          labels={CATEGORY_LABELS}
          value={filters.category}
          onChange={(next) => onChange({ ...filters, category: next })}
        />
        <label className="text-xs font-semibold text-navy-500">
          Filed from
          <Input
            type="date"
            className="mt-1 h-10 border-border bg-white text-navy-900"
            value={filters.dateFrom ? filters.dateFrom.slice(0, 10) : ''}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
          />
        </label>
        <label className="text-xs font-semibold text-navy-500">
          Filed to
          <Input
            type="date"
            className="mt-1 h-10 border-border bg-white text-navy-900"
            value={filters.dateTo ? filters.dateTo.slice(0, 10) : ''}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
          />
        </label>
        {hasFilters && (
          <Button
            variant="outline" size="sm" className="border-border bg-white text-navy-900 hover:bg-navy-50"
            onClick={() => onChange({ status: [], category: [], dateFrom: undefined, dateTo: undefined })}
          >
            <X size={14} /> Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function DisputesTable({ filters, onSelect }: { filters: DisputeFilters; onSelect: (id: string) => void }) {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-disputes-list', filters, page],
    queryFn: () => adminDisputesApi.list({
      status: filters.status.length > 0 ? filters.status : undefined,
      category: filters.category.length > 0 ? filters.category : undefined,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      page,
      limit: PAGE_LIMIT,
      order: 'asc',
    }),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-(--radius-lg) border border-border bg-white shadow-2">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <caption className="sr-only">Disputes table</caption>
          <thead className="bg-white text-xs font-bold uppercase tracking-wider text-navy-500">
            <tr>
              <th scope="col" className="px-4 py-3">Dispute ref</th>
              <th scope="col" className="px-4 py-3">Booking ref</th>
              <th scope="col" className="px-4 py-3">Guest</th>
              <th scope="col" className="px-4 py-3">Property</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3">Filed at</th>
              <th scope="col" className="px-4 py-3">Deadline</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-navy-500">Loading disputes…</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-navy-500">No disputes match these filters.</td></tr>
            )}
            {items.map((item: AdminDisputeListItem) => {
              const deadline = formatDeadline(item.hoursUntilDeadline)
              const showDeadline = OPEN_STATUSES.includes(item.status)
              return (
                <tr key={item.id} className="cursor-pointer hover:bg-navy-50" onClick={() => onSelect(item.id)} data-testid={`dispute-row-${item.id}`}>
                  <td className="px-4 py-4 font-mono text-xs font-bold text-navy-900">{item.disputeRef}</td>
                  <td className="px-4 py-4 font-mono text-xs text-navy-500">{item.bookingRef ?? '—'}</td>
                  <td className="px-4 py-4 font-mono text-xs text-navy-500">{item.guestPhone ?? '—'}</td>
                  <td className="px-4 py-4 text-navy-900">{item.propertyName ?? '—'}</td>
                  <td className="px-4 py-4 text-navy-500">{CATEGORY_LABELS[item.category]}</td>
                  <td className="px-4 py-4 text-navy-500">{formatDateTime(item.filedAt)}</td>
                  <td className="px-4 py-4">
                    {showDeadline ? (
                      <span className={cn('text-xs font-semibold', deadline.urgent ? 'text-error-500' : 'text-navy-500')}>
                        {deadline.text}
                      </span>
                    ) : (
                      <span className="text-xs text-navy-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4"><Badge variant={STATUS_BADGE[item.status]}>{STATUS_LABELS[item.status]}</Badge></td>
                  <td className="px-4 py-4"><Button variant="dark" size="sm">Open</Button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-navy-500">
        <p>{total.toLocaleString('en-IN')} {total === 1 ? 'dispute' : 'disputes'} · page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm" className="border-border bg-white text-navy-900 hover:bg-navy-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline" size="sm" className="border-border bg-white text-navy-900 hover:bg-navy-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Resolve dialog
// ---------------------------------------------------------------------------

const resolveSchema = z.object({
  resolutionType: z.enum(['full_refund', 'partial_refund', 'no_action', 'wallet_credit', 'escalated']),
  amountRupees: z.number().optional(),
  adminNotes: z.string().min(1, 'Required').max(2000),
}).refine((data) => {
  if (data.resolutionType === 'partial_refund' || data.resolutionType === 'wallet_credit') {
    return data.amountRupees != null && data.amountRupees > 0
  }
  return true
}, { message: 'Enter an amount greater than 0', path: ['amountRupees'] })

function ResolveDisputeDialog({ disputeId, totalAmountPaise, onClose, onSuccess }: {
  disputeId: string
  totalAmountPaise: number
  onClose: () => void
  onSuccess: () => void
}) {
  const form = useForm<z.infer<typeof resolveSchema>>({
    resolver: zodResolver(resolveSchema),
    defaultValues: { resolutionType: 'full_refund', amountRupees: undefined, adminNotes: '' },
  })

  const resolutionType = form.watch('resolutionType')

  const mutation = useMutation({
    mutationFn: async () => {
      const values = form.getValues()
      return adminDisputesApi.resolve(disputeId, {
        resolutionType: values.resolutionType,
        adminNotes: values.adminNotes,
        refundAmountPaise: values.resolutionType === 'partial_refund' && values.amountRupees
          ? Math.round(values.amountRupees * 100)
          : undefined,
        walletCreditAmountPaise: values.resolutionType === 'wallet_credit' && values.amountRupees
          ? Math.round(values.amountRupees * 100)
          : undefined,
      })
    },
    onSuccess: () => {
      toast.success('Dispute resolved')
      onSuccess()
      onClose()
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Action failed'
      toast.error(message)
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve dispute</DialogTitle>
          <DialogDescription>Choose a resolution and record your reasoning. The guest and hotel will be notified.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={form.handleSubmit(() => mutation.mutate())}>
          <fieldset className="space-y-2">
            {(['full_refund', 'partial_refund', 'no_action', 'wallet_credit', 'escalated'] as const).map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <input type="radio" value={type} {...form.register('resolutionType')} />
                {RESOLUTION_LABELS[type]}
              </label>
            ))}
          </fieldset>

          {resolutionType === 'partial_refund' && (
            <label className="text-sm font-semibold text-navy-900">
              Refund amount (₹) — max {formatPaise(totalAmountPaise)}
              <Input type="number" step="0.01" min={0} className="mt-1" {...form.register('amountRupees', { valueAsNumber: true })} />
              {form.formState.errors.amountRupees && (
                <p className="mt-1 text-xs text-error-600">{form.formState.errors.amountRupees.message}</p>
              )}
            </label>
          )}

          {resolutionType === 'wallet_credit' && (
            <label className="text-sm font-semibold text-navy-900">
              Wallet credit amount (₹)
              <Input type="number" step="0.01" min={0} className="mt-1" {...form.register('amountRupees', { valueAsNumber: true })} />
              {form.formState.errors.amountRupees && (
                <p className="mt-1 text-xs text-error-600">{form.formState.errors.amountRupees.message}</p>
              )}
            </label>
          )}

          <label className="text-sm font-semibold text-navy-900">
            Notes (mandatory)
            <Textarea className="mt-1" {...form.register('adminNotes')} />
            {form.formState.errors.adminNotes && (
              <p className="mt-1 text-xs text-error-600">{form.formState.errors.adminNotes.message}</p>
            )}
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant={resolutionType === 'escalated' ? 'danger' : 'primary'} loading={mutation.isPending}>
              {resolutionType === 'escalated' ? 'Escalate' : 'Resolve'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Detail drawer
// ---------------------------------------------------------------------------

export function DisputeDetailDrawer({ disputeId, onClose, onOpenBooking }: {
  disputeId: string
  onClose: () => void
  onOpenBooking: (bookingId: string) => void
}) {
  const queryClient = useQueryClient()
  const [showResolve, setShowResolve] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dispute-detail', disputeId],
    queryFn: () => adminDisputesApi.getDetail(disputeId),
  })

  const requestResponseMutation = useMutation({
    mutationFn: () => adminDisputesApi.requestResponse(disputeId),
    onSuccess: () => {
      toast.success('Hotel response requested')
      refreshAll()
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Action failed'
      toast.error(message)
    },
  })

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ['admin-dispute-detail', disputeId] })
    queryClient.invalidateQueries({ queryKey: ['admin-disputes-list'] })
    queryClient.invalidateQueries({ queryKey: ['admin-disputes-unresolved-count'] })
  }

  const dispute = data?.dispute
  const booking = data?.booking
  const guest = data?.guest
  const property = data?.property
  const isOpen = dispute ? OPEN_STATUSES.includes(dispute.status) : false

  return (
    <div className="fixed inset-0 z-40 flex justify-end" data-testid="dispute-detail-drawer">
      <div className="absolute inset-0 bg-navy-900/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-white shadow-2 thin-scroll">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Dispute detail</p>
            <h2 className="font-display text-lg font-bold text-navy-900">{dispute?.disputeRef ?? '...'}</h2>
          </div>
          <Button variant="outline" size="icon" className="border-border bg-white text-navy-900 hover:bg-navy-50" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        </div>

        <div className="flex-1 space-y-5 p-5">
          {isLoading && <p className="text-sm text-navy-500">Loading dispute…</p>}

          {data && dispute && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_BADGE[dispute.status]}>{STATUS_LABELS[dispute.status]}</Badge>
                <span className="text-xs text-navy-500">Filed {formatDateTime(dispute.filedAt)}</span>
              </div>

              <section className="rounded-(--radius-lg) border border-border bg-white p-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-500">Guest&apos;s complaint</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div><dt className="text-navy-500">Category</dt><dd className="font-semibold text-navy-900">{CATEGORY_LABELS[dispute.category]}</dd></div>
                  <div><dt className="text-navy-500">Requested resolution</dt><dd className="font-semibold text-navy-900 capitalize">{dispute.requestedResolution.replace(/_/g, ' ')}</dd></div>
                  <div><dt className="text-navy-500">Guest phone</dt><dd className="font-mono font-semibold text-navy-900">{guest?.phone ?? '—'}</dd></div>
                  <div><dt className="text-navy-500">Past disputes</dt><dd className="font-semibold text-navy-900">{guest?.pastDisputeCount ?? 0}</dd></div>
                </dl>
                <p className="text-sm text-navy-900">{dispute.description}</p>
                {dispute.guestEvidence && dispute.guestEvidence.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {dispute.guestEvidence.map((url) => (
                      <li key={url}><a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary-600 underline">{url}</a></li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-(--radius-lg) border border-border bg-white p-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-500">Hotel&apos;s response</h3>
                {dispute.hotelResponse ? (
                  <>
                    <p className="text-sm text-navy-900">{dispute.hotelResponse}</p>
                    {dispute.hotelEvidence && dispute.hotelEvidence.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {dispute.hotelEvidence.map((url) => (
                          <li key={url}><a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary-600 underline">{url}</a></li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : dispute.status === 'awaiting_hotel_response' ? (
                  <p className="text-sm text-navy-500">
                    Awaiting hotel response{dispute.hotelResponseDeadline ? ` (due ${formatDateTime(dispute.hotelResponseDeadline)})` : ''}.
                  </p>
                ) : dispute.status === 'filed' || dispute.status === 'under_review' ? (
                  <div className="space-y-2">
                    <p className="text-sm text-navy-500">No response requested yet.</p>
                    <Button variant="outline" size="sm" className="border-border bg-white text-navy-900 hover:bg-navy-50" loading={requestResponseMutation.isPending} onClick={() => requestResponseMutation.mutate()}>
                      Request hotel response
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-navy-500">No response was provided.</p>
                )}
              </section>

              <section className="rounded-(--radius-lg) border border-border bg-white p-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-500">Booking & payment context</h3>
                {booking ? (
                  <div className="space-y-2">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-navy-500">Booking ref</dt><dd className="font-mono font-semibold text-navy-900">{booking.bookingRef}</dd></div>
                      <div><dt className="text-navy-500">Status</dt><dd className="font-semibold text-navy-900 capitalize">{booking.status.replace(/_/g, ' ')}</dd></div>
                      <div><dt className="text-navy-500">Check-in</dt><dd className="font-semibold text-navy-900">{formatDateTime(booking.checkInAt)}</dd></div>
                      <div><dt className="text-navy-500">Check-out</dt><dd className="font-semibold text-navy-900">{formatDateTime(booking.checkOutAt)}</dd></div>
                      <div><dt className="text-navy-500">Total amount</dt><dd className="font-semibold text-navy-900">{formatPaise(booking.totalAmountPaise)}</dd></div>
                      <div><dt className="text-navy-500">Property</dt><dd className="font-semibold text-navy-900">{property?.name ?? '—'}</dd></div>
                    </dl>
                    <Button variant="outline" size="sm" className="border-border bg-white text-navy-900 hover:bg-navy-50" onClick={() => onOpenBooking(dispute.bookingId)}>
                      <ExternalLink size={14} /> View booking
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-navy-500">Booking not found.</p>
                )}
              </section>

              {!isOpen && dispute.resolutionType && (
                <section className="rounded-(--radius-lg) border border-border bg-white p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-500">Resolution</h3>
                  <p className="mb-1 text-sm font-semibold text-navy-900">{RESOLUTION_LABELS[dispute.resolutionType]}</p>
                  {dispute.refundAmountPaise != null && dispute.refundAmountPaise > 0 && (
                    <p className="text-xs text-navy-500">Refund: {formatPaise(dispute.refundAmountPaise)}</p>
                  )}
                  {dispute.adminNotes && <p className="mt-2 text-sm text-navy-900">{dispute.adminNotes}</p>}
                </section>
              )}
            </>
          )}
        </div>

        {dispute && isOpen && (
          <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-border bg-white p-4">
            <Button variant="primary" size="sm" onClick={() => setShowResolve(true)}>Resolve dispute</Button>
          </div>
        )}
      </div>

      {dispute && booking && showResolve && (
        <ResolveDisputeDialog
          disputeId={dispute.id}
          totalAmountPaise={booking.totalAmountPaise}
          onClose={() => setShowResolve(false)}
          onSuccess={refreshAll}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function AdminDisputesView({ onSelect }: { onSelect: (id: string) => void }) {
  const [filters, setFilters] = useState<DisputeFilters>({ status: [], category: [] })

  return (
    <div className="space-y-4">
      <DisputesFilterBar filters={filters} onChange={setFilters} />
      <DisputesTable filters={filters} onSelect={onSelect} />
    </div>
  )
}
