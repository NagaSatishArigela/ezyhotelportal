import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { getRouteApi } from '@tanstack/react-router'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Ban, Clock, Download, Flag, FlagOff,
  Gavel, LogOut, RefreshCw, Search, ShieldAlert, TimerReset, X, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { cn, formatINR } from '@/lib/utils'
import {
  adminBookingsApi,
  BOOKING_STATUS_VALUES,
  type AdminActiveBookingItem,
  type AdminBookingDetail,
  type AdminBookingListItem,
  type AdminBookingsSearch,
  type BookingStatus,
  type BookingType,
} from '@/lib/api/adminBookings'
import { AnomalyDetailDrawer, AnomaliesTabBadge, AnomaliesView } from './AdminAnomaliesView'
import { AdminDisputesView, DisputeDetailDrawer, DisputesTabBadge } from './AdminDisputesView'

function useBookingsRouteApi() {
  const role = useAuthStore((state) => state.user?.role)
  return getRouteApi(role === 'super_admin' ? '/super-admin/bookings' : '/admin/bookings')
}

const PAGE_LIMIT = 50

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: 'Pending payment',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
  voided: 'Voided',
}

const STATUS_BADGE: Record<BookingStatus, BadgeProps['variant']> = {
  pending_payment: 'amber',
  confirmed: 'teal',
  checked_in: 'green',
  completed: 'grey',
  cancelled: 'red',
  no_show: 'red',
  voided: 'red',
}

const PAYMENT_BADGE: Record<string, BadgeProps['variant']> = {
  pending: 'amber',
  success: 'green',
  failed: 'red',
  refunded: 'teal',
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

function formatPaise(paise: number): string {
  return formatINR(Math.round(paise / 100))
}

function formatCountdown(seconds: number): string {
  const abs = Math.abs(Math.round(seconds))
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const text = `${h}h ${m}m`
  return seconds < 0 ? `Overdue by ${text}` : `${text} left`
}

function useDebouncedCallback<T extends (...args: never[]) => void>(callback: T, delay: number): T {
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  return ((...args: never[]) => {
    if (timer) clearTimeout(timer)
    const next = setTimeout(() => callback(...args), delay)
    setTimer(next)
  }) as T
}

function AdminHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Admin portal</p>
        <h1 className="font-display text-2xl font-bold text-navy-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

function DarkCard({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-(--radius-lg) border border-border bg-white p-5 shadow-2', className)}>
      {title && <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-navy-500">{title}</h2>}
      {children}
    </section>
  )
}

function DarkMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <DarkCard>
      <p className="text-sm text-navy-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-navy-900">{value}</p>
      <p className="mt-1 text-xs text-navy-500">{sub}</p>
    </DarkCard>
  )
}

// ---------------------------------------------------------------------------
// KPI strip
// ---------------------------------------------------------------------------

function KpiStrip({ search }: { search: AdminBookingsSearch }) {
  const { data } = useQuery({
    queryKey: ['admin-bookings-kpis', search],
    queryFn: () => adminBookingsApi.kpis({
      dateFrom: search.dateFrom,
      dateTo: search.dateTo,
      city: search.city,
      bookingType: search.bookingType,
      status: search.status,
      amountMin: search.amountMin,
      amountMax: search.amountMax,
      guestPhone: search.guestPhone,
      bookingRef: search.bookingRef,
    }),
  })

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <DarkMetric label="Total bookings" value={data ? data.totalBookings.toLocaleString('en-IN') : '—'} sub="Matching current filters" />
      <DarkMetric label="Gross booking value" value={data ? formatPaise(data.totalGbvPaise) : '—'} sub="Sum of totals" />
      <DarkMetric label="Avg. booking value" value={data ? formatPaise(data.avgBookingValuePaise) : '—'} sub="Per booking" />
      <DarkMetric label="Cancellation rate" value={data ? `${data.cancellationRate}%` : '—'} sub="Cancelled / total" />
      <DarkMetric label="No-show rate" value={data ? `${data.noShowRate}%` : '—'} sub="No-shows / total" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

const BOOKING_TYPE_OPTIONS: { value: BookingType; label: string }[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'fullday', label: 'Full day' },
]

function StatusMultiSelect({ value, onChange }: { value: BookingStatus[]; onChange: (next: BookingStatus[]) => void }) {
  function toggle(status: BookingStatus) {
    if (value.includes(status)) onChange(value.filter((s) => s !== status))
    else onChange([...value, status])
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button variant="outline" size="sm" className="border-border bg-white text-navy-900 hover:bg-navy-50">
          Status {value.length > 0 ? `(${value.length})` : ''}
        </Button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          sideOffset={4}
          className="z-50 min-w-[200px] rounded-(--radius-md) border border-border bg-white p-1 shadow-2"
        >
          {BOOKING_STATUS_VALUES.map((status) => (
            <DropdownMenuPrimitive.CheckboxItem
              key={status}
              checked={value.includes(status)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => toggle(status)}
              className="flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm text-navy-900 outline-none transition-colors hover:bg-navy-50"
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-[4px] border border-border',
                  value.includes(status) && 'border-primary-600 bg-primary-600'
                )}
              >
                {value.includes(status) && <span className="h-1.5 w-1.5 rounded-[2px] bg-white" />}
              </span>
              {STATUS_LABELS[status]}
            </DropdownMenuPrimitive.CheckboxItem>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

function FilterBar({ search }: { search: AdminBookingsSearch }) {
  const navigate = useBookingsRouteApi().useNavigate()

  const [bookingRef, setBookingRef] = useState(search.bookingRef ?? '')
  const [guestPhone, setGuestPhone] = useState(search.guestPhone ?? '')
  const [city, setCity] = useState(search.city ?? '')
  const [amountMin, setAmountMin] = useState(search.amountMin != null ? String(search.amountMin / 100) : '')
  const [amountMax, setAmountMax] = useState(search.amountMax != null ? String(search.amountMax / 100) : '')

  function applyFilters(patch: Partial<AdminBookingsSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }), replace: true })
  }

  const debouncedApply = useDebouncedCallback((patch: Partial<AdminBookingsSearch>) => applyFilters(patch), 300)

  function resetAll() {
    setBookingRef('')
    setGuestPhone('')
    setCity('')
    setAmountMin('')
    setAmountMax('')
    navigate({ search: { tab: search.tab }, replace: true })
  }

  const hasFilters = Boolean(
    search.dateFrom || search.dateTo || search.city || search.bookingType ||
    (search.status && search.status.length > 0) || search.amountMin != null ||
    search.amountMax != null || search.guestPhone || search.bookingRef
  )

  return (
    <DarkCard title="Filters">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-xs font-semibold text-navy-500">
          Booking ref
          <Input
            className="mt-1 h-10 border-border bg-white text-navy-900 placeholder:text-navy-500"
            placeholder="PPH-B-00001"
            value={bookingRef}
            onChange={(e) => { setBookingRef(e.target.value); debouncedApply({ bookingRef: e.target.value || undefined }) }}
          />
        </label>
        <label className="text-xs font-semibold text-navy-500">
          Guest phone
          <Input
            className="mt-1 h-10 border-border bg-white text-navy-900 placeholder:text-navy-500"
            placeholder="Min 3 digits"
            value={guestPhone}
            onChange={(e) => { setGuestPhone(e.target.value); debouncedApply({ guestPhone: e.target.value || undefined }) }}
          />
        </label>
        <label className="text-xs font-semibold text-navy-500">
          City
          <Input
            className="mt-1 h-10 border-border bg-white text-navy-900 placeholder:text-navy-500"
            placeholder="Mumbai"
            value={city}
            onChange={(e) => { setCity(e.target.value); debouncedApply({ city: e.target.value || undefined }) }}
          />
        </label>
        <label className="text-xs font-semibold text-navy-500">
          Booking type
          <Select
            className="mt-1 h-10 border-border bg-white text-navy-900"
            value={search.bookingType ?? ''}
            onChange={(e) => applyFilters({ bookingType: (e.target.value || undefined) as BookingType | undefined })}
          >
            <option value="">All types</option>
            {BOOKING_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </Select>
        </label>

        <label className="text-xs font-semibold text-navy-500">
          Check-in from
          <Input
            type="date"
            className="mt-1 h-10 border-border bg-white text-navy-900"
            value={search.dateFrom ? search.dateFrom.slice(0, 10) : ''}
            onChange={(e) => applyFilters({ dateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
          />
        </label>
        <label className="text-xs font-semibold text-navy-500">
          Check-in to
          <Input
            type="date"
            className="mt-1 h-10 border-border bg-white text-navy-900"
            value={search.dateTo ? search.dateTo.slice(0, 10) : ''}
            onChange={(e) => applyFilters({ dateTo: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
          />
        </label>
        <label className="text-xs font-semibold text-navy-500">
          Amount min (₹)
          <Input
            type="number"
            min={0}
            className="mt-1 h-10 border-border bg-white text-navy-900"
            value={amountMin}
            onChange={(e) => {
              setAmountMin(e.target.value)
              const num = e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100)
              debouncedApply({ amountMin: num })
            }}
          />
        </label>
        <label className="text-xs font-semibold text-navy-500">
          Amount max (₹)
          <Input
            type="number"
            min={0}
            className="mt-1 h-10 border-border bg-white text-navy-900"
            value={amountMax}
            onChange={(e) => {
              setAmountMax(e.target.value)
              const num = e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100)
              debouncedApply({ amountMax: num })
            }}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusMultiSelect
          value={search.status ?? []}
          onChange={(next) => applyFilters({ status: next.length > 0 ? next : undefined })}
        />
        {hasFilters && (
          <Button variant="outline" size="sm" className="border-border bg-white text-navy-900 hover:bg-navy-50" onClick={resetAll}>
            <X size={14} /> Clear filters
          </Button>
        )}
      </div>
    </DarkCard>
  )
}

// ---------------------------------------------------------------------------
// Bookings table
// ---------------------------------------------------------------------------

function SortableHeader({ field, label, search, onSort }: {
  field: AdminBookingsSearch['sort']
  label: string
  search: AdminBookingsSearch
  onSort: (field: AdminBookingsSearch['sort']) => void
}) {
  const currentSort = search.sort ?? 'createdAt'
  const currentOrder = search.order ?? 'desc'
  const active = currentSort === field
  return (
    <th scope="col" className="px-4 py-3">
      <button
        type="button"
        className="flex items-center gap-1 uppercase tracking-wider hover:text-navy-900"
        onClick={() => onSort(field)}
      >
        {label}
        {active ? (currentOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}
      </button>
    </th>
  )
}

function BookingsTable({ search, onSelect }: { search: AdminBookingsSearch; onSelect: (id: string) => void }) {
  const navigate = useBookingsRouteApi().useNavigate()
  const page = search.page ?? 1

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings-list', search],
    queryFn: () => adminBookingsApi.list({
      dateFrom: search.dateFrom,
      dateTo: search.dateTo,
      city: search.city,
      bookingType: search.bookingType,
      status: search.status,
      amountMin: search.amountMin,
      amountMax: search.amountMax,
      guestPhone: search.guestPhone,
      bookingRef: search.bookingRef,
      page,
      limit: PAGE_LIMIT,
      sort: search.sort ?? 'createdAt',
      order: search.order ?? 'desc',
    }),
  })

  function onSort(field: AdminBookingsSearch['sort']) {
    const currentSort = search.sort ?? 'createdAt'
    const currentOrder = search.order ?? 'desc'
    if (currentSort === field) {
      navigate({ search: (prev) => ({ ...prev, order: currentOrder === 'asc' ? 'desc' : 'asc' }), replace: true })
    } else {
      navigate({ search: (prev) => ({ ...prev, sort: field, order: 'desc' }), replace: true })
    }
  }

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-(--radius-lg) border border-border bg-white shadow-2">
        <table className="w-full min-w-[960px] text-left text-sm">
          <caption className="sr-only">Bookings table</caption>
          <thead className="bg-white text-xs font-bold uppercase tracking-wider text-navy-500">
            <tr>
              <th scope="col" className="px-4 py-3">Booking ref</th>
              <th scope="col" className="px-4 py-3">Property</th>
              <th scope="col" className="px-4 py-3">Guest</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <SortableHeader field="checkInAt" label="Check-in" search={search} onSort={onSort} />
              <SortableHeader field="checkOutAt" label="Check-out" search={search} onSort={onSort} />
              <SortableHeader field="totalAmountPaise" label="Amount" search={search} onSort={onSort} />
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Payment</th>
              <th scope="col" className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-navy-500">Loading bookings…</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-navy-500">No bookings match these filters.</td></tr>
            )}
            {items.map((item: AdminBookingListItem) => (
              <tr key={item.id} className="cursor-pointer hover:bg-navy-50" onClick={() => onSelect(item.id)} data-testid={`booking-row-${item.id}`}>
                <td className="px-4 py-4 font-mono text-xs font-bold text-navy-900">
                  {item.bookingRef}
                  {item.isFlagged && <Flag size={12} className="ml-1 inline text-error-500" aria-label="Flagged" />}
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-navy-900">{item.propertyName ?? '—'}</p>
                  <p className="text-xs text-navy-500">{item.city ?? '—'}</p>
                </td>
                <td className="px-4 py-4 font-mono text-xs text-navy-500">{item.guestPhone ?? '—'}</td>
                <td className="px-4 py-4 text-navy-500">{item.bookingType === 'hourly' ? 'Hourly' : 'Full day'}</td>
                <td className="px-4 py-4 text-navy-500">{formatDateTime(item.checkInAt)}</td>
                <td className="px-4 py-4 text-navy-500">{formatDateTime(item.checkOutAt)}</td>
                <td className="px-4 py-4 font-bold text-navy-900">{formatPaise(item.totalAmountPaise)}</td>
                <td className="px-4 py-4"><Badge variant={STATUS_BADGE[item.status]}>{STATUS_LABELS[item.status]}</Badge></td>
                <td className="px-4 py-4"><Badge variant={PAYMENT_BADGE[item.paymentStatus]}>{item.paymentStatus}</Badge></td>
                <td className="px-4 py-4"><Button variant="dark" size="sm">Open</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-navy-500">
        <p>{total.toLocaleString('en-IN')} {total === 1 ? 'booking' : 'bookings'} · page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm" className="border-border bg-white text-navy-900 hover:bg-navy-50"
            disabled={page <= 1}
            onClick={() => navigate({ search: (prev) => ({ ...prev, page: page - 1 }), replace: true })}
          >
            Previous
          </Button>
          <Button
            variant="outline" size="sm" className="border-border bg-white text-navy-900 hover:bg-navy-50"
            disabled={page >= totalPages}
            onClick={() => navigate({ search: (prev) => ({ ...prev, page: page + 1 }), replace: true })}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Active Now view
// ---------------------------------------------------------------------------

function ActiveBookingsView({ onSelect }: { onSelect: (id: string) => void }) {
  const { data, isFetching } = useQuery({
    queryKey: ['admin-bookings-active'],
    queryFn: () => adminBookingsApi.active(),
    refetchInterval: 15_000,
  })

  const items = data ?? []
  const overdueCount = items.filter((item) => item.isOverdue).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-(--radius-lg) border border-border bg-white px-4 py-3 shadow-2">
        <p className="flex items-center gap-2 text-sm text-navy-900">
          <Clock size={16} className="text-primary-600" />
          <strong className="text-navy-900">{items.length}</strong> guests currently checked in
          {overdueCount > 0 && <Badge variant="red">{overdueCount} overdue</Badge>}
        </p>
        <p className="flex items-center gap-1 text-xs text-navy-500">
          <RefreshCw size={12} className={cn(isFetching && 'animate-spin')} /> Refreshes every 15s
        </p>
      </div>

      <div className="overflow-x-auto rounded-(--radius-lg) border border-border bg-white shadow-2">
        <table className="w-full min-w-[820px] text-left text-sm">
          <caption className="sr-only">Active bookings table</caption>
          <thead className="bg-white text-xs font-bold uppercase tracking-wider text-navy-500">
            <tr>
              <th scope="col" className="px-4 py-3">Booking ref</th>
              <th scope="col" className="px-4 py-3">Property</th>
              <th scope="col" className="px-4 py-3">Guest</th>
              <th scope="col" className="px-4 py-3">Check-out</th>
              <th scope="col" className="px-4 py-3">Time remaining</th>
              <th scope="col" className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-navy-500">No guests currently checked in.</td></tr>
            )}
            {items.map((item: AdminActiveBookingItem) => (
              <tr key={item.id} className="cursor-pointer hover:bg-navy-50" onClick={() => onSelect(item.id)}>
                <td className="px-4 py-4 font-mono text-xs font-bold text-navy-900">{item.bookingRef}</td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-navy-900">{item.propertyName ?? '—'}</p>
                  <p className="text-xs text-navy-500">{item.city ?? '—'}</p>
                </td>
                <td className="px-4 py-4 font-mono text-xs text-navy-500">{item.guestPhone ?? '—'}</td>
                <td className="px-4 py-4 text-navy-500">{formatDateTime(item.checkOutAt)}</td>
                <td className="px-4 py-4"><Badge variant={item.isOverdue ? 'red' : 'green'}>{formatCountdown(item.timeRemainingSeconds)}</Badge></td>
                <td className="px-4 py-4"><Button variant="dark" size="sm">Open</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Action dialogs
// ---------------------------------------------------------------------------

const VOID_REASONS = ['fraud', 'emergency', 'duplicate', 'hotel_request', 'other'] as const
const CANCEL_REASONS = ['guest_request', 'hotel_request', 'admin_decision', 'system_error'] as const
const FLAG_TYPES = ['suspicious', 'quality_issue', 'partner_complaint', 'other'] as const

const voidSchema = z.object({
  reasonCategory: z.enum(VOID_REASONS),
  reasonText: z.string().max(500).optional(),
})
const cancelSchema = z.object({
  reasonCategory: z.enum(CANCEL_REASONS),
  reasonText: z.string().max(500).optional(),
})
const refundSchema = z.object({
  amountRupees: z.number({ message: 'Enter an amount' }).positive('Enter an amount greater than 0'),
  reasonCategory: z.string().min(1, 'Required').max(100),
  reasonText: z.string().max(500).optional(),
})
const forceCheckoutSchema = z.object({
  reasonText: z.string().min(1, 'Required').max(500),
})
const extendSchema = z.object({
  newCheckOutAt: z.string().min(1, 'Required'),
  extensionAmountRupees: z.number({ message: 'Enter an amount' }).positive('Enter an amount greater than 0'),
})
const flagSchema = z.object({
  flagType: z.enum(FLAG_TYPES),
  flagNotes: z.string().max(500).optional(),
})

type ActionType = 'void' | 'cancel' | 'refund' | 'force-checkout' | 'extend' | 'flag' | 'unflag'

function ActionDialog({ booking, action, onClose, onSuccess }: {
  booking: AdminBookingDetail['booking']
  action: ActionType
  onClose: () => void
  onSuccess: () => void
}) {
  const [refundConfirmStep, setRefundConfirmStep] = useState(false)

  const voidForm = useForm<z.infer<typeof voidSchema>>({ resolver: zodResolver(voidSchema), defaultValues: { reasonCategory: 'fraud', reasonText: '' } })
  const cancelForm = useForm<z.infer<typeof cancelSchema>>({ resolver: zodResolver(cancelSchema), defaultValues: { reasonCategory: 'guest_request', reasonText: '' } })
  const refundForm = useForm<z.infer<typeof refundSchema>>({ resolver: zodResolver(refundSchema), defaultValues: { amountRupees: undefined, reasonCategory: '', reasonText: '' } })
  const forceCheckoutForm = useForm<z.infer<typeof forceCheckoutSchema>>({ resolver: zodResolver(forceCheckoutSchema), defaultValues: { reasonText: '' } })
  const extendForm = useForm<z.infer<typeof extendSchema>>({ resolver: zodResolver(extendSchema), defaultValues: { newCheckOutAt: '', extensionAmountRupees: undefined } })
  const flagForm = useForm<z.infer<typeof flagSchema>>({ resolver: zodResolver(flagSchema), defaultValues: { flagType: 'suspicious', flagNotes: '' } })

  const mutation = useMutation({
    mutationFn: async () => {
      switch (action) {
        case 'void':
          return adminBookingsApi.void(booking.id, voidForm.getValues())
        case 'cancel':
          return adminBookingsApi.cancel(booking.id, cancelForm.getValues())
        case 'refund': {
          const values = refundForm.getValues()
          return adminBookingsApi.refund(booking.id, {
            amountPaise: Math.round(values.amountRupees * 100),
            reasonCategory: values.reasonCategory,
            reasonText: values.reasonText,
          })
        }
        case 'force-checkout':
          return adminBookingsApi.forceCheckout(booking.id, forceCheckoutForm.getValues())
        case 'extend': {
          const values = extendForm.getValues()
          return adminBookingsApi.extend(booking.id, {
            newCheckOutAt: new Date(values.newCheckOutAt).toISOString(),
            extensionAmountPaise: Math.round(values.extensionAmountRupees * 100),
          })
        }
        case 'flag':
          return adminBookingsApi.flag(booking.id, flagForm.getValues())
        case 'unflag':
          return adminBookingsApi.unflag(booking.id)
      }
    },
    onSuccess: () => {
      toast.success('Action completed')
      onSuccess()
      onClose()
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Action failed'
      toast.error(message)
    },
  })

  const remainingPaise = booking.totalAmountPaise - (booking.refundAmountPaise ?? 0)

  let title = ''
  let description = ''
  let content: React.ReactNode = null

  switch (action) {
    case 'void':
      title = 'Void booking'
      description = 'This refunds the guest in full and marks the booking as voided. This cannot be undone.'
      content = (
        <form className="space-y-3" onSubmit={voidForm.handleSubmit(() => mutation.mutate())}>
          <label className="text-sm font-semibold text-navy-900">
            Reason category
            <Select className="mt-1" {...voidForm.register('reasonCategory')}>
              {VOID_REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </Select>
          </label>
          <label className="text-sm font-semibold text-navy-900">
            Additional notes (optional)
            <Textarea className="mt-1" {...voidForm.register('reasonText')} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="danger" loading={mutation.isPending}>Void booking</Button>
          </div>
        </form>
      )
      break

    case 'cancel':
      title = 'Cancel booking'
      description = 'The guest will be refunded according to the cancellation policy.'
      content = (
        <form className="space-y-3" onSubmit={cancelForm.handleSubmit(() => mutation.mutate())}>
          <label className="text-sm font-semibold text-navy-900">
            Reason category
            <Select className="mt-1" {...cancelForm.register('reasonCategory')}>
              {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </Select>
          </label>
          <label className="text-sm font-semibold text-navy-900">
            Additional notes (optional)
            <Textarea className="mt-1" {...cancelForm.register('reasonText')} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Back</Button>
            <Button type="submit" variant="danger" loading={mutation.isPending}>Cancel booking</Button>
          </div>
        </form>
      )
      break

    case 'refund': {
      title = refundConfirmStep ? 'Confirm refund' : 'Issue refund'
      description = `Remaining refundable balance: ${formatPaise(Math.max(remainingPaise, 0))}`
      if (!refundConfirmStep) {
        content = (
          <form
            className="space-y-3"
            onSubmit={refundForm.handleSubmit(() => setRefundConfirmStep(true))}
          >
            <label className="text-sm font-semibold text-navy-900">
              Refund amount (₹)
              <Input type="number" step="0.01" min={0} className="mt-1" {...refundForm.register('amountRupees', { valueAsNumber: true })} />
              {refundForm.formState.errors.amountRupees && (
                <p className="mt-1 text-xs text-error-600">{refundForm.formState.errors.amountRupees.message}</p>
              )}
            </label>
            <label className="text-sm font-semibold text-navy-900">
              Reason
              <Input className="mt-1" placeholder="e.g. Goodwill, service issue" {...refundForm.register('reasonCategory')} />
              {refundForm.formState.errors.reasonCategory && (
                <p className="mt-1 text-xs text-error-600">{refundForm.formState.errors.reasonCategory.message}</p>
              )}
            </label>
            <label className="text-sm font-semibold text-navy-900">
              Additional notes (optional)
              <Textarea className="mt-1" {...refundForm.register('reasonText')} />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Continue</Button>
            </div>
          </form>
        )
      } else {
        const values = refundForm.getValues()
        content = (
          <div className="space-y-4">
            <p className="text-sm text-navy-700">
              You are about to refund <strong>{formatINR(values.amountRupees)}</strong> to the guest for booking{' '}
              <strong className="font-mono">{booking.bookingRef}</strong>. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setRefundConfirmStep(false)}>Back</Button>
              <Button type="button" variant="danger" loading={mutation.isPending} onClick={() => mutation.mutate()}>
                Confirm refund
              </Button>
            </div>
          </div>
        )
      }
      break
    }

    case 'force-checkout':
      title = 'Force checkout'
      description = 'The booking will be marked as completed immediately.'
      content = (
        <form className="space-y-3" onSubmit={forceCheckoutForm.handleSubmit(() => mutation.mutate())}>
          <label className="text-sm font-semibold text-navy-900">
            Reason
            <Textarea className="mt-1" placeholder="Why is this guest being checked out?" {...forceCheckoutForm.register('reasonText')} />
            {forceCheckoutForm.formState.errors.reasonText && (
              <p className="mt-1 text-xs text-error-600">{forceCheckoutForm.formState.errors.reasonText.message}</p>
            )}
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="danger" loading={mutation.isPending}>Force checkout</Button>
          </div>
        </form>
      )
      break

    case 'extend':
      title = 'Extend booking'
      description = 'Set a new check-out time and the extension surcharge to charge the guest.'
      content = (
        <form className="space-y-3" onSubmit={extendForm.handleSubmit(() => mutation.mutate())}>
          <label className="text-sm font-semibold text-navy-900">
            New check-out time
            <Input type="datetime-local" className="mt-1" {...extendForm.register('newCheckOutAt')} />
            {extendForm.formState.errors.newCheckOutAt && (
              <p className="mt-1 text-xs text-error-600">{extendForm.formState.errors.newCheckOutAt.message}</p>
            )}
          </label>
          <label className="text-sm font-semibold text-navy-900">
            Extension amount (₹)
            <Input type="number" step="0.01" min={0} className="mt-1" {...extendForm.register('extensionAmountRupees', { valueAsNumber: true })} />
            {extendForm.formState.errors.extensionAmountRupees && (
              <p className="mt-1 text-xs text-error-600">{extendForm.formState.errors.extensionAmountRupees.message}</p>
            )}
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>Extend booking</Button>
          </div>
        </form>
      )
      break

    case 'flag':
      title = 'Flag booking'
      description = 'Flagged bookings are highlighted for the operations team.'
      content = (
        <form className="space-y-3" onSubmit={flagForm.handleSubmit(() => mutation.mutate())}>
          <label className="text-sm font-semibold text-navy-900">
            Flag type
            <Select className="mt-1" {...flagForm.register('flagType')}>
              {FLAG_TYPES.map((f) => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
            </Select>
          </label>
          <label className="text-sm font-semibold text-navy-900">
            Notes (optional)
            <Textarea className="mt-1" {...flagForm.register('flagNotes')} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>Flag booking</Button>
          </div>
        </form>
      )
      break

    case 'unflag':
      title = 'Remove flag'
      description = 'This booking will no longer be highlighted for review.'
      content = (
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" loading={mutation.isPending} onClick={() => mutation.mutate()}>Remove flag</Button>
        </div>
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
// Booking detail drawer
// ---------------------------------------------------------------------------

const REFUNDABLE_STATUSES: BookingStatus[] = ['confirmed', 'checked_in', 'completed']

function BookingDetailDrawer({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [activeAction, setActiveAction] = useState<ActionType | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-booking-detail', bookingId],
    queryFn: () => adminBookingsApi.getDetail(bookingId),
  })

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ['admin-booking-detail', bookingId] })
    queryClient.invalidateQueries({ queryKey: ['admin-bookings-list'] })
    queryClient.invalidateQueries({ queryKey: ['admin-bookings-kpis'] })
    queryClient.invalidateQueries({ queryKey: ['admin-bookings-active'] })
  }

  const booking = data?.booking
  const remainingPaise = booking ? booking.totalAmountPaise - (booking.refundAmountPaise ?? 0) : 0

  const actions: { type: ActionType; label: string; icon: React.ElementType; available: boolean; variant: 'danger' | 'outline' | 'primary' }[] = booking ? [
    { type: 'void', label: 'Void', icon: Ban, available: booking.status === 'confirmed', variant: 'danger' },
    { type: 'cancel', label: 'Cancel', icon: XCircle, available: booking.status === 'confirmed', variant: 'danger' },
    { type: 'refund', label: 'Refund', icon: RefreshCw, available: REFUNDABLE_STATUSES.includes(booking.status) && remainingPaise > 0, variant: 'outline' },
    { type: 'force-checkout', label: 'Force checkout', icon: LogOut, available: booking.status === 'checked_in', variant: 'outline' },
    { type: 'extend', label: 'Extend', icon: TimerReset, available: booking.status === 'checked_in', variant: 'outline' },
    { type: booking.isFlagged ? 'unflag' : 'flag', label: booking.isFlagged ? 'Remove flag' : 'Flag', icon: booking.isFlagged ? FlagOff : Flag, available: true, variant: 'outline' },
  ] : []

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-navy-900/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-white shadow-2 thin-scroll">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Booking detail</p>
            <h2 className="font-display text-lg font-bold text-navy-900">{booking?.bookingRef ?? '...'}</h2>
          </div>
          <Button variant="outline" size="icon" className="border-border bg-white text-navy-900 hover:bg-navy-50" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        </div>

        <div className="flex-1 space-y-5 p-5">
          {isLoading && <p className="text-sm text-navy-500">Loading booking…</p>}

          {data && booking && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_BADGE[booking.status]}>{STATUS_LABELS[booking.status]}</Badge>
                <Badge variant={PAYMENT_BADGE[booking.paymentStatus]}>{booking.paymentStatus}</Badge>
                {booking.isFlagged && <Badge variant="red"><Flag size={10} /> Flagged{booking.flagType ? `: ${booking.flagType.replace(/_/g, ' ')}` : ''}</Badge>}
              </div>

              <DarkCard title="Property & guest">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-navy-500">Property</span><p className="font-semibold text-navy-900">{data.property.name || '—'}</p></div>
                  <div><span className="text-navy-500">City / area</span><p className="font-semibold text-navy-900">{[data.property.city, data.property.area].filter(Boolean).join(' · ') || '—'}</p></div>
                  <div><span className="text-navy-500">Guest phone</span><p className="font-mono font-semibold text-navy-900">{data.guest.phone || '—'}</p></div>
                  <div><span className="text-navy-500">Guest email</span><p className="font-semibold text-navy-900">{data.guest.email || '—'}</p></div>
                </div>
              </DarkCard>

              <DarkCard title="Booking summary">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-navy-500">Type</span><p className="font-semibold text-navy-900">{booking.bookingType === 'hourly' ? 'Hourly' : 'Full day'}</p></div>
                  <div><span className="text-navy-500">Guests</span><p className="font-semibold text-navy-900">{booking.guestCount}</p></div>
                  <div><span className="text-navy-500">Check-in</span><p className="font-semibold text-navy-900">{formatDateTime(booking.checkInAt)}</p></div>
                  <div><span className="text-navy-500">Check-out</span><p className="font-semibold text-navy-900">{formatDateTime(booking.checkOutAt)}</p></div>
                  <div><span className="text-navy-500">Duration</span><p className="font-semibold text-navy-900">{booking.durationHours}h</p></div>
                  <div><span className="text-navy-500">Total amount</span><p className="font-semibold text-navy-900">{formatPaise(booking.totalAmountPaise)}</p></div>
                  {booking.refundAmountPaise != null && booking.refundAmountPaise > 0 && (
                    <div><span className="text-navy-500">Refunded</span><p className="font-semibold text-navy-900">{formatPaise(booking.refundAmountPaise)}</p></div>
                  )}
                  {booking.extensionAmountPaise != null && (
                    <div><span className="text-navy-500">Extension charge</span><p className="font-semibold text-navy-900">{formatPaise(booking.extensionAmountPaise)}</p></div>
                  )}
                </div>
              </DarkCard>

              <DarkCard title="Timeline">
                <ol className="space-y-3">
                  {data.timeline.map((entry, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-primary-600" />
                      <div>
                        <p className="font-semibold text-navy-900">{entry.label}</p>
                        <p className="text-xs text-navy-500">{formatDateTime(entry.at)}{entry.detail ? ` · ${entry.detail}` : ''}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </DarkCard>

              {data.adminActions.length > 0 && (
                <DarkCard title="Admin actions">
                  <ul className="space-y-2 text-sm">
                    {data.adminActions.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 rounded-[8px] border border-border px-3 py-2">
                        <div>
                          <p className="font-semibold text-navy-900">{a.action.replace(/_/g, ' ')}</p>
                          {a.reasonText && <p className="text-xs text-navy-500">{a.reasonText}</p>}
                        </div>
                        <span className="text-xs text-navy-500">{formatDateTime(a.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </DarkCard>
              )}
            </>
          )}
        </div>

        {booking && (
          <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-border bg-white p-4">
            {actions.filter((a) => a.available).map((a) => (
              <Button
                key={a.type}
                variant={a.variant === 'danger' ? 'danger' : a.variant === 'primary' ? 'primary' : 'outline'}
                size="sm"
                className={a.variant === 'outline' ? 'border-border bg-white text-navy-900 hover:bg-navy-50' : ''}
                onClick={() => setActiveAction(a.type)}
              >
                <a.icon size={14} /> {a.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {booking && activeAction && (
        <ActionDialog booking={booking} action={activeAction} onClose={() => setActiveAction(null)} onSuccess={refreshAll} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AdminBookingsPage() {
  const search = useBookingsRouteApi().useSearch()
  const navigate = useBookingsRouteApi().useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null)
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null)

  const tab = search.tab ?? 'list'

  useEffect(() => {
    if (search.page == null) {
      navigate({ search: (prev) => ({ ...prev, page: 1 }), replace: true })
    }
  }, [navigate, search.page])

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Bookings"
        subtitle="Search, monitor, and manage bookings across the platform."
        actions={<Button variant="outline" size="sm" className="border-border bg-white text-navy-900 hover:bg-navy-50"><Download size={16} /> Export</Button>}
      />

      <div className="inline-flex items-center gap-1 rounded-(--radius-md) border border-border bg-white p-1">
        <button
          type="button"
          className={cn('rounded-[8px] px-4 py-2 text-sm font-semibold transition-colors', tab === 'list' ? 'bg-primary-600 text-white' : 'text-navy-500 hover:text-navy-900')}
          onClick={() => navigate({ search: (prev) => ({ ...prev, tab: 'list' }), replace: true })}
        >
          <Search size={14} className="mr-1 inline" /> All bookings
        </button>
        <button
          type="button"
          className={cn('rounded-[8px] px-4 py-2 text-sm font-semibold transition-colors', tab === 'active' ? 'bg-primary-600 text-white' : 'text-navy-500 hover:text-navy-900')}
          onClick={() => navigate({ search: (prev) => ({ ...prev, tab: 'active' }), replace: true })}
        >
          <ShieldAlert size={14} className="mr-1 inline" /> Active now
        </button>
        <button
          type="button"
          className={cn('rounded-[8px] px-4 py-2 text-sm font-semibold transition-colors', tab === 'anomalies' ? 'bg-primary-600 text-white' : 'text-navy-500 hover:text-navy-900')}
          onClick={() => navigate({ search: (prev) => ({ ...prev, tab: 'anomalies' }), replace: true })}
        >
          <AlertTriangle size={14} className="mr-1 inline" /> Anomalies <AnomaliesTabBadge />
        </button>
        <button
          type="button"
          className={cn('rounded-[8px] px-4 py-2 text-sm font-semibold transition-colors', tab === 'disputes' ? 'bg-primary-600 text-white' : 'text-navy-500 hover:text-navy-900')}
          onClick={() => navigate({ search: (prev) => ({ ...prev, tab: 'disputes' }), replace: true })}
        >
          <Gavel size={14} className="mr-1 inline" /> Disputes <DisputesTabBadge />
        </button>
      </div>

      {tab === 'active' ? (
        <ActiveBookingsView onSelect={setSelectedId} />
      ) : tab === 'anomalies' ? (
        <AnomaliesView onSelect={setSelectedAnomalyId} />
      ) : tab === 'disputes' ? (
        <AdminDisputesView onSelect={setSelectedDisputeId} />
      ) : (
        <>
          <KpiStrip search={search} />
          <FilterBar search={search} />
          <BookingsTable search={search} onSelect={setSelectedId} />
        </>
      )}

      {selectedId && <BookingDetailDrawer bookingId={selectedId} onClose={() => setSelectedId(null)} />}
      {selectedAnomalyId && (
        <AnomalyDetailDrawer
          anomalyId={selectedAnomalyId}
          onClose={() => setSelectedAnomalyId(null)}
          onOpenBooking={(bookingId) => setSelectedId(bookingId)}
        />
      )}
      {selectedDisputeId && (
        <DisputeDetailDrawer
          disputeId={selectedDisputeId}
          onClose={() => setSelectedDisputeId(null)}
          onOpenBooking={(bookingId) => setSelectedId(bookingId)}
        />
      )}
    </div>
  )
}
