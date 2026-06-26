import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { cn, formatINR } from '@/lib/utils'
import {
  adminAnomaliesApi,
  ANOMALY_RESOLUTION_TYPES,
  ANOMALY_SEVERITY_VALUES,
  ANOMALY_STATUS_VALUES,
  type AdminAnomalyListItem,
  type AnomalyResolutionType,
  type AnomalySeverity,
  type AnomalyStatus,
  type BookingEvidenceSummary,
} from '@/lib/api/adminAnomalies'

const PAGE_LIMIT = 50

const RULE_OPTIONS = ['ANO-001', 'ANO-002', 'ANO-003', 'ANO-004', 'ANO-006', 'ANO-007', 'ANO-009', 'ANO-010']

const SEVERITY_LABELS: Record<AnomalySeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const SEVERITY_BADGE: Record<AnomalySeverity, BadgeProps['variant']> = {
  critical: 'red',
  high: 'amber',
  medium: 'teal',
  low: 'grey',
}

const STATUS_LABELS: Record<AnomalyStatus, string> = {
  detected: 'Detected',
  investigating: 'Investigating',
  resolved_action: 'Resolved – action taken',
  resolved_fp: 'Resolved – false positive',
  escalated: 'Escalated',
}

const STATUS_BADGE: Record<AnomalyStatus, BadgeProps['variant']> = {
  detected: 'red',
  investigating: 'amber',
  resolved_action: 'green',
  resolved_fp: 'grey',
  escalated: 'teal',
}

const RESOLUTION_TYPE_LABELS: Record<AnomalyResolutionType, string> = {
  voided_booking: 'Voided booking',
  flagged_for_review: 'Flagged for review',
  contacted_owner: 'Contacted owner',
  no_action_needed: 'No action needed',
  other: 'Other',
}

const RESOLVED_STATUSES: AnomalyStatus[] = ['resolved_action', 'resolved_fp', 'escalated']

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

function formatPaise(paise: number): string {
  return formatINR(Math.round(paise / 100))
}

// ---------------------------------------------------------------------------
// Tab badge
// ---------------------------------------------------------------------------

export function AnomaliesTabBadge() {
  const { data } = useQuery({
    queryKey: ['admin-anomalies-unresolved-count'],
    queryFn: () => adminAnomaliesApi.unresolvedCount(),
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

interface AnomalyFilters {
  severity: AnomalySeverity[]
  status: AnomalyStatus[]
  ruleId?: string
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
          variant="outline" size="sm" data-testid={`anomaly-filter-${label.toLowerCase()}`}
          className="border-border bg-white text-navy-900 hover:bg-navy-50"
        >
          {label} {value.length > 0 ? `(${value.length})` : ''}
        </Button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          sideOffset={4}
          className="z-50 min-w-[200px] rounded-(--radius-md) border border-border bg-white p-1 shadow-2"
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

function AnomaliesFilterBar({ filters, onChange }: { filters: AnomalyFilters; onChange: (next: AnomalyFilters) => void }) {
  const hasFilters = Boolean(
    filters.severity.length > 0 || filters.status.length > 0 || filters.ruleId || filters.dateFrom || filters.dateTo
  )

  return (
    <div className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-2">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-navy-500">Filters</h2>
      <div className="flex flex-wrap items-end gap-3">
        <MultiSelectDropdown
          label="Severity"
          options={ANOMALY_SEVERITY_VALUES}
          labels={SEVERITY_LABELS}
          value={filters.severity}
          onChange={(next) => onChange({ ...filters, severity: next })}
        />
        <MultiSelectDropdown
          label="Status"
          options={ANOMALY_STATUS_VALUES}
          labels={STATUS_LABELS}
          value={filters.status}
          onChange={(next) => onChange({ ...filters, status: next })}
        />
        <label className="text-xs font-semibold text-navy-500">
          Rule
          <Select
            className="mt-1 h-10 border-border bg-white text-navy-900"
            value={filters.ruleId ?? ''}
            onChange={(e) => onChange({ ...filters, ruleId: e.target.value || undefined })}
          >
            <option value="">All rules</option>
            {RULE_OPTIONS.map((rule) => <option key={rule} value={rule}>{rule}</option>)}
          </Select>
        </label>
        <label className="text-xs font-semibold text-navy-500">
          Detected from
          <Input
            type="date"
            className="mt-1 h-10 border-border bg-white text-navy-900"
            value={filters.dateFrom ? filters.dateFrom.slice(0, 10) : ''}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
          />
        </label>
        <label className="text-xs font-semibold text-navy-500">
          Detected to
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
            onClick={() => onChange({ severity: [], status: [], ruleId: undefined, dateFrom: undefined, dateTo: undefined })}
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

type SortField = 'severity' | 'detectedAt' | 'status'

function SortableHeader({ field, label, sort, order, onSort }: {
  field: SortField
  label: string
  sort: SortField
  order: 'asc' | 'desc'
  onSort: (field: SortField) => void
}) {
  const active = sort === field
  return (
    <th scope="col" className="px-4 py-3">
      <button type="button" className="flex items-center gap-1 uppercase tracking-wider hover:text-navy-900" onClick={() => onSort(field)}>
        {label}
        {active ? (order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}
      </button>
    </th>
  )
}

function AnomaliesTable({ filters, onSelect }: { filters: AnomalyFilters; onSelect: (id: string) => void }) {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortField>('severity')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-anomalies-list', filters, page, sort, order],
    queryFn: () => adminAnomaliesApi.list({
      severity: filters.severity.length > 0 ? filters.severity : undefined,
      status: filters.status.length > 0 ? filters.status : undefined,
      ruleId: filters.ruleId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      page,
      limit: PAGE_LIMIT,
      sort,
      order,
    }),
  })

  function onSort(field: SortField) {
    if (sort === field) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(field)
      setOrder('desc')
    }
  }

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-(--radius-lg) border border-border bg-white shadow-2">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <caption className="sr-only">Anomalies table</caption>
          <thead className="bg-white text-xs font-bold uppercase tracking-wider text-navy-500">
            <tr>
              <th scope="col" className="px-4 py-3">Rule</th>
              <SortableHeader field="severity" label="Severity" sort={sort} order={order} onSort={onSort} />
              <th scope="col" className="px-4 py-3">Entity</th>
              <th scope="col" className="px-4 py-3">Description</th>
              <SortableHeader field="detectedAt" label="Detected at" sort={sort} order={order} onSort={onSort} />
              <SortableHeader field="status" label="Status" sort={sort} order={order} onSort={onSort} />
              <th scope="col" className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-navy-500">Loading anomalies…</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-navy-500">No anomalies match these filters.</td></tr>
            )}
            {items.map((item: AdminAnomalyListItem) => (
              <tr key={item.id} className="cursor-pointer hover:bg-navy-50" onClick={() => onSelect(item.id)} data-testid={`anomaly-row-${item.id}`}>
                <td className="px-4 py-4 font-mono text-xs font-bold text-navy-900">{item.ruleId}</td>
                <td className="px-4 py-4">
                  <Badge variant={SEVERITY_BADGE[item.severity]} className={cn(item.severity === 'critical' && 'animate-pulse')}>
                    {SEVERITY_LABELS[item.severity]}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-navy-900">{item.entityLabel ?? item.entityId}</p>
                  <p className="text-xs text-navy-500 capitalize">{item.entityType}</p>
                </td>
                <td className="px-4 py-4 max-w-md text-navy-500">{item.description}</td>
                <td className="px-4 py-4 text-navy-500">{formatDateTime(item.detectedAt)}</td>
                <td className="px-4 py-4"><Badge variant={STATUS_BADGE[item.status]}>{STATUS_LABELS[item.status]}</Badge></td>
                <td className="px-4 py-4"><Button variant="dark" size="sm">Open</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-navy-500">
        <p>{total.toLocaleString('en-IN')} {total === 1 ? 'anomaly' : 'anomalies'} · page {page} of {totalPages}</p>
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
// Resolution dialogs
// ---------------------------------------------------------------------------

const resolveActionSchema = z.object({
  resolutionType: z.enum(ANOMALY_RESOLUTION_TYPES),
  resolutionNotes: z.string().min(1, 'Required').max(1000),
})
const resolveFpSchema = z.object({
  resolutionNotes: z.string().min(1, 'Required').max(1000),
})
const escalateSchema = z.object({
  resolutionNotes: z.string().min(1, 'Required').max(1000),
})

type ResolutionAction = 'resolved_action' | 'resolved_fp' | 'escalated'

function ResolutionDialog({ anomalyId, action, onClose, onSuccess }: {
  anomalyId: string
  action: ResolutionAction
  onClose: () => void
  onSuccess: () => void
}) {
  const actionForm = useForm<z.infer<typeof resolveActionSchema>>({
    resolver: zodResolver(resolveActionSchema),
    defaultValues: { resolutionType: 'voided_booking', resolutionNotes: '' },
  })
  const fpForm = useForm<z.infer<typeof resolveFpSchema>>({
    resolver: zodResolver(resolveFpSchema),
    defaultValues: { resolutionNotes: '' },
  })
  const escalateForm = useForm<z.infer<typeof escalateSchema>>({
    resolver: zodResolver(escalateSchema),
    defaultValues: { resolutionNotes: '' },
  })

  const mutation = useMutation({
    mutationFn: async () => {
      switch (action) {
        case 'resolved_action': {
          const values = actionForm.getValues()
          return adminAnomaliesApi.updateStatus(anomalyId, {
            status: 'resolved_action',
            resolutionType: values.resolutionType,
            resolutionNotes: values.resolutionNotes,
          })
        }
        case 'resolved_fp':
          return adminAnomaliesApi.updateStatus(anomalyId, {
            status: 'resolved_fp',
            resolutionNotes: fpForm.getValues().resolutionNotes,
          })
        case 'escalated':
          return adminAnomaliesApi.updateStatus(anomalyId, {
            status: 'escalated',
            resolutionNotes: escalateForm.getValues().resolutionNotes,
          })
      }
    },
    onSuccess: () => {
      toast.success('Anomaly updated')
      onSuccess()
      onClose()
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Action failed'
      toast.error(message)
    },
  })

  let title = ''
  let description = ''
  let content: React.ReactNode = null

  switch (action) {
    case 'resolved_action':
      title = 'Resolve — action taken'
      description = 'Record the action you took to address this anomaly.'
      content = (
        <form className="space-y-3" onSubmit={actionForm.handleSubmit(() => mutation.mutate())}>
          <label className="text-sm font-semibold text-navy-900">
            Resolution type
            <Select className="mt-1" {...actionForm.register('resolutionType')}>
              {ANOMALY_RESOLUTION_TYPES.map((type) => <option key={type} value={type}>{RESOLUTION_TYPE_LABELS[type]}</option>)}
            </Select>
          </label>
          <label className="text-sm font-semibold text-navy-900">
            Notes
            <Textarea className="mt-1" {...actionForm.register('resolutionNotes')} />
            {actionForm.formState.errors.resolutionNotes && (
              <p className="mt-1 text-xs text-error-600">{actionForm.formState.errors.resolutionNotes.message}</p>
            )}
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>Resolve</Button>
          </div>
        </form>
      )
      break

    case 'resolved_fp':
      title = 'Resolve — false positive'
      description = 'Explain why this was flagged incorrectly. This helps tune the detection rules.'
      content = (
        <form className="space-y-3" onSubmit={fpForm.handleSubmit(() => mutation.mutate())}>
          <label className="text-sm font-semibold text-navy-900">
            Notes
            <Textarea className="mt-1" {...fpForm.register('resolutionNotes')} />
            {fpForm.formState.errors.resolutionNotes && (
              <p className="mt-1 text-xs text-error-600">{fpForm.formState.errors.resolutionNotes.message}</p>
            )}
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>Mark as false positive</Button>
          </div>
        </form>
      )
      break

    case 'escalated':
      title = 'Escalate'
      description = 'This marks the anomaly as handed off outside the system. No ticket is created automatically.'
      content = (
        <form className="space-y-3" onSubmit={escalateForm.handleSubmit(() => mutation.mutate())}>
          <label className="text-sm font-semibold text-navy-900">
            Notes
            <Textarea className="mt-1" {...escalateForm.register('resolutionNotes')} />
            {escalateForm.formState.errors.resolutionNotes && (
              <p className="mt-1 text-xs text-error-600">{escalateForm.formState.errors.resolutionNotes.message}</p>
            )}
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="danger" loading={mutation.isPending}>Escalate</Button>
          </div>
        </form>
      )
      break
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Detail drawer
// ---------------------------------------------------------------------------

function isBookingEvidenceSummary(value: unknown): value is BookingEvidenceSummary {
  return typeof value === 'object' && value !== null && 'bookingRef' in value && 'id' in value
}

function collectEvidenceBookings(evidence: Record<string, unknown>): BookingEvidenceSummary[] {
  const summaries: BookingEvidenceSummary[] = []
  for (const value of Object.values(evidence)) {
    if (isBookingEvidenceSummary(value)) {
      summaries.push(value)
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (isBookingEvidenceSummary(item)) summaries.push(item)
      }
    }
  }
  return summaries
}

export function AnomalyDetailDrawer({ anomalyId, onClose, onOpenBooking }: {
  anomalyId: string
  onClose: () => void
  onOpenBooking: (bookingId: string) => void
}) {
  const queryClient = useQueryClient()
  const [activeAction, setActiveAction] = useState<ResolutionAction | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-anomaly-detail', anomalyId],
    queryFn: () => adminAnomaliesApi.getDetail(anomalyId),
  })

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ['admin-anomaly-detail', anomalyId] })
    queryClient.invalidateQueries({ queryKey: ['admin-anomalies-list'] })
    queryClient.invalidateQueries({ queryKey: ['admin-anomalies-unresolved-count'] })
  }

  const anomaly = data?.anomaly
  const entity = data?.entity
  const evidence = data?.evidence ?? {}
  const evidenceBookings = collectEvidenceBookings(evidence)
  const isResolved = anomaly ? RESOLVED_STATUSES.includes(anomaly.status) : false

  const evidenceScalars = Object.entries(evidence).filter(
    ([, value]) => typeof value === 'string' || typeof value === 'number'
  ) as [string, string | number][]

  return (
    <div className="fixed inset-0 z-40 flex justify-end" data-testid="anomaly-detail-drawer">
      <div className="absolute inset-0 bg-navy-900/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-white shadow-2 thin-scroll">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Anomaly detail</p>
            <h2 className="font-display text-lg font-bold text-navy-900">{anomaly?.ruleId ?? '...'}</h2>
          </div>
          <Button variant="outline" size="icon" className="border-border bg-white text-navy-900 hover:bg-navy-50" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        </div>

        <div className="flex-1 space-y-5 p-5">
          {isLoading && <p className="text-sm text-navy-500">Loading anomaly…</p>}

          {data && anomaly && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant={SEVERITY_BADGE[anomaly.severity]} className={cn(anomaly.severity === 'critical' && 'animate-pulse')}>
                  {SEVERITY_LABELS[anomaly.severity]}
                </Badge>
                <Badge variant={STATUS_BADGE[anomaly.status]}>{STATUS_LABELS[anomaly.status]}</Badge>
                <span className="text-xs text-navy-500">Detected {formatDateTime(anomaly.detectedAt)}</span>
              </div>

              <section className="rounded-(--radius-lg) border border-border bg-white p-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-500">Description</h3>
                <p className="text-sm text-navy-900">{anomaly.description}</p>
              </section>

              {entity && (
                <section className="rounded-(--radius-lg) border border-border bg-white p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-500">Entity</h3>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-navy-900">{entity.label}</p>
                      <p className="text-xs capitalize text-navy-500">{entity.type}</p>
                    </div>
                    {entity.type === 'booking' && (
                      <Button variant="outline" size="sm" className="border-border bg-white text-navy-900 hover:bg-navy-50" onClick={() => onOpenBooking(entity.id)}>
                        <ExternalLink size={14} /> View booking
                      </Button>
                    )}
                  </div>
                </section>
              )}

              {evidenceScalars.length > 0 && (
                <section className="rounded-(--radius-lg) border border-border bg-white p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-500">Evidence</h3>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    {evidenceScalars.map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-navy-500">{key}</dt>
                        <dd className="font-semibold text-navy-900">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {evidenceBookings.length > 0 && (
                <section className="rounded-(--radius-lg) border border-border bg-white shadow-2">
                  <h3 className="px-4 pt-4 text-xs font-bold uppercase tracking-wider text-navy-500">Related bookings</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <caption className="sr-only">Related bookings</caption>
                      <thead className="text-xs font-bold uppercase tracking-wider text-navy-500">
                        <tr>
                          <th scope="col" className="px-4 py-3">Booking ref</th>
                          <th scope="col" className="px-4 py-3">Status</th>
                          <th scope="col" className="px-4 py-3">Amount</th>
                          <th scope="col" className="px-4 py-3">Check-in</th>
                          <th scope="col" className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {evidenceBookings.map((booking) => (
                          <tr key={booking.id} className="cursor-pointer hover:bg-navy-50" onClick={() => onOpenBooking(booking.id)}>
                            <td className="px-4 py-3 font-mono text-xs font-bold text-navy-900">{booking.bookingRef}</td>
                            <td className="px-4 py-3 text-navy-500">{booking.status.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3 font-bold text-navy-900">{formatPaise(booking.totalAmountPaise)}</td>
                            <td className="px-4 py-3 text-navy-500">{formatDateTime(booking.checkInAt)}</td>
                            <td className="px-4 py-3"><Button variant="dark" size="sm">Open</Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {data.relatedActions.length > 0 && (
                <section className="rounded-(--radius-lg) border border-border bg-white p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-500">Related admin actions</h3>
                  <ul className="space-y-2 text-sm">
                    {data.relatedActions.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 rounded-[8px] border border-border px-3 py-2">
                        <div>
                          <p className="font-semibold text-navy-900">{a.action.replace(/_/g, ' ')}</p>
                          {a.reasonText && <p className="text-xs text-navy-500">{a.reasonText}</p>}
                        </div>
                        <span className="text-xs text-navy-500">{formatDateTime(a.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {isResolved && anomaly.resolutionNotes && (
                <section className="rounded-(--radius-lg) border border-border bg-white p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-500">Resolution notes</h3>
                  {anomaly.resolutionType && (
                    <p className="mb-1 text-xs text-navy-500">{RESOLUTION_TYPE_LABELS[anomaly.resolutionType as AnomalyResolutionType] ?? anomaly.resolutionType}</p>
                  )}
                  <p className="text-sm text-navy-900">{anomaly.resolutionNotes}</p>
                </section>
              )}
            </>
          )}
        </div>

        {anomaly && !isResolved && (
          <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-border bg-white p-4">
            <Button variant="primary" size="sm" onClick={() => setActiveAction('resolved_action')}>Resolve — action taken</Button>
            <Button variant="outline" size="sm" className="border-border bg-white text-navy-900 hover:bg-navy-50" onClick={() => setActiveAction('resolved_fp')}>
              Resolve — false positive
            </Button>
            <Button variant="danger" size="sm" onClick={() => setActiveAction('escalated')}>Escalate</Button>
          </div>
        )}
      </div>

      {anomaly && activeAction && (
        <ResolutionDialog anomalyId={anomaly.id} action={activeAction} onClose={() => setActiveAction(null)} onSuccess={refreshAll} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function AnomaliesView({ onSelect }: { onSelect: (id: string) => void }) {
  const [filters, setFilters] = useState<AnomalyFilters>({ severity: [], status: [] })

  return (
    <div className="space-y-4">
      <AnomaliesFilterBar filters={filters} onChange={setFilters} />
      <AnomaliesTable filters={filters} onSelect={onSelect} />
    </div>
  )
}
