import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { receptionContactSchema, type ReceptionContact } from '@/lib/reception-contact'
import { FieldWrapper } from '@/components/shared/FieldWrapper'
import { useState, useEffect } from 'react'
import {
  CalendarDays, IndianRupee, Star, TrendingUp, Wallet, BedDouble,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SectionCard } from '@/components/shared/SectionCard'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { ownerSettingsApi } from '@/lib/api/ownerSettings'
import { ownerRoomsApi, type OwnerRoom, type OwnerRoomType } from '@/lib/api/ownerRooms'
import { ownerBookingsApi, type OwnerBookingItem, type OwnerBookingStatus } from '@/lib/api/ownerBookings'
import { ownerDashboardApi } from '@/lib/api/ownerDashboard'
import { ownerAnalyticsApi } from '@/lib/api/ownerAnalytics'
import { ownerAvailabilityApi } from '@/lib/api/ownerAvailability'
import { OwnerReviewsView } from './OwnerReviewsView'
import { OwnerPayoutsView } from './OwnerPayoutsView'

// ── Static demo data ────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<OwnerBookingStatus, BadgeProps['variant']> = {
  pending_payment: 'amber',
  confirmed: 'green',
  checked_in: 'teal',
  completed: 'grey',
  cancelled: 'red',
  no_show: 'red',
  voided: 'grey',
}
const STATUS_LABEL: Record<OwnerBookingStatus, string> = {
  pending_payment: 'Pending payment',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
  voided: 'Voided',
}
const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })

// ── Shared helpers ─────────────────────────────────────────────────────────

function PageHeader({ eyebrow, title, subtitle, actions }: {
  eyebrow?: string; title: string; subtitle?: string; actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-wider text-primary-600">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-bold text-navy-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

function MetricCard({ label, value, trend, icon: Icon }: { label: string; value: string; trend: string; icon: React.ElementType }) {
  return (
    <div className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-navy-500">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold text-navy-900">{value}</p>
          <p className="mt-1 text-xs text-success-700">{trend}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-50 text-primary-600">
          <Icon size={18} aria-hidden />
        </span>
      </div>
    </div>
  )
}

// ── Booking detail dialog (read-only) ──────────────────────────────────────

function BookingDetailDialog({ booking, onClose }: { booking: OwnerBookingItem | null; onClose: () => void }) {
  return (
    <Dialog open={!!booking} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Booking {booking?.bookingRef}</DialogTitle>
          <DialogDescription>{booking?.guestName ?? 'Guest'}</DialogDescription>
        </DialogHeader>
        {booking && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-navy-500 text-xs font-bold uppercase">Check-in</p><p className="font-semibold text-navy-900 mt-0.5">{fmtDateTime(booking.checkInAt)}</p></div>
              <div><p className="text-navy-500 text-xs font-bold uppercase">Check-out</p><p className="font-semibold text-navy-900 mt-0.5">{fmtDateTime(booking.checkOutAt)}</p></div>
              <div><p className="text-navy-500 text-xs font-bold uppercase">Duration</p><p className="font-semibold text-navy-900 mt-0.5">{booking.bookingType === 'hourly' ? `${booking.durationHours}h` : 'Full day'}</p></div>
              <div><p className="text-navy-500 text-xs font-bold uppercase">Guests</p><p className="font-semibold text-navy-900 mt-0.5">{booking.guestCount}</p></div>
              <div><p className="text-navy-500 text-xs font-bold uppercase">Amount</p><p className="font-semibold text-navy-900 mt-0.5">{rupees(booking.totalAmountPaise)}</p></div>
              <div><p className="text-navy-500 text-xs font-bold uppercase">Status</p><div className="mt-0.5"><Badge variant={STATUS_VARIANT[booking.status]}>{STATUS_LABEL[booking.status]}</Badge></div></div>
            </div>
            {(booking.guestName || booking.guestPhone) && (
              <div className="rounded-xl bg-navy-50 p-3 text-xs text-navy-500">
                <p className="font-bold text-navy-700 mb-1">Guest contact</p>
                <p>{booking.guestName ?? '—'}{booking.guestPhone ? ` · ${booking.guestPhone}` : ''}</p>
              </div>
            )}
            <div className="flex justify-end pt-1">
              <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Bookings table ─────────────────────────────────────────────────────────

function BookingsTable({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth()
  const propertyId = user?.propertyId
  const [selected, setSelected] = useState<OwnerBookingItem | null>(null)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner-bookings', propertyId],
    queryFn: () => ownerBookingsApi.list(propertyId as string, 1, 50),
    enabled: !!propertyId,
  })

  if (!propertyId) return <div className="text-sm text-navy-500">No property is linked to your account yet.</div>
  if (isLoading) return <div className="h-40 animate-pulse rounded-(--radius-lg) bg-navy-50" />
  if (isError) return <div className="text-sm text-error-600">Could not load bookings.</div>

  const items = data?.items ?? []
  const list = compact ? items.slice(0, 5) : items

  return (
    <>
      <div className="overflow-x-auto rounded-(--radius-lg) border border-border bg-white shadow-1">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">Owner booking list</caption>
          <thead className="bg-navy-50 text-xs font-bold uppercase tracking-wider text-navy-500">
            <tr>
              {['Booking', 'Guest', 'Check-in', 'Duration', 'Amount', 'Status'].map((h) => (
                <th key={h} scope="col" className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((b) => (
              <tr key={b.id} className="hover:bg-navy-50 cursor-pointer" onClick={() => setSelected(b)}>
                <td className="px-4 py-4 font-mono text-xs font-bold text-navy-900">{b.bookingRef}</td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-navy-900">{b.guestName ?? '—'}</p>
                  {b.guestPhone && <p className="text-xs text-navy-400">{b.guestPhone}</p>}
                </td>
                <td className="px-4 py-4 text-navy-700">{fmtDateTime(b.checkInAt)}</td>
                <td className="px-4 py-4 text-navy-700">{b.bookingType === 'hourly' ? `${b.durationHours}h` : 'Full day'}</td>
                <td className="px-4 py-4 font-bold text-navy-900">{rupees(b.totalAmountPaise)}</td>
                <td className="px-4 py-4"><Badge variant={STATUS_VARIANT[b.status]}>{STATUS_LABEL[b.status]}</Badge></td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-navy-400">No bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <BookingDetailDialog booking={selected} onClose={() => setSelected(null)} />
    </>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────


export function OwnerDashboardPage() {
  const { user } = useAuth()
  const propertyId = user?.propertyId
  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner-dashboard', propertyId],
    queryFn: () => ownerDashboardApi.get(propertyId as string),
    enabled: !!propertyId,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner portal · Daily operations"
        title="Dashboard"
        subtitle="A live snapshot of your property"
      />

      {!propertyId ? (
        <div className="text-sm text-navy-500">No property is linked to your account yet.</div>
      ) : isLoading ? (
        <div className="h-40 animate-pulse rounded-(--radius-lg) bg-navy-50" />
      ) : isError || !data ? (
        <div className="text-sm text-error-600">Could not load your dashboard.</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Check-ins today" value={String(data.today)} trend="Confirmed &amp; checked-in" icon={CalendarDays} />
            <MetricCard label="Upcoming" value={String(data.upcoming)} trend="Confirmed, future dates" icon={BedDouble} />
            <MetricCard label="Completed" value={String(data.completed)} trend="All-time stays" icon={Star} />
            <MetricCard label="Revenue · last 7 days" value={rupees(data.revenuePaise)} trend="Confirmed + completed" icon={IndianRupee} />
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-navy-900 mb-3">Recent bookings</h2>
            <BookingsTable compact />
          </div>
        </>
      )}
    </div>
  )
}

// ── Bookings ──────────────────────────────────────────────────────────────

export function OwnerBookingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle="Your property's bookings — click a row for full details."
      />
      <BookingsTable />
    </div>
  )
}

// ── Availability ──────────────────────────────────────────────────────────

export function OwnerAvailabilityPage() {
  const { user } = useAuth()
  const propertyId = user?.propertyId
  const { data: rooms } = useQuery({
    queryKey: ['owner-rooms', propertyId],
    queryFn: () => ownerRoomsApi.list(propertyId as string),
    enabled: !!propertyId,
  })
  const [roomTypeId, setRoomTypeId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (!roomTypeId && rooms && rooms.length > 0) setRoomTypeId(rooms[0].id)
  }, [rooms, roomTypeId])

  const { data: avail, isLoading, isError } = useQuery({
    queryKey: ['owner-availability', propertyId, roomTypeId, date],
    queryFn: () => ownerAvailabilityApi.get(propertyId as string, roomTypeId, date),
    enabled: !!propertyId && !!roomTypeId && !!date,
  })

  if (!propertyId) return <div className="text-sm text-navy-500">No property is linked to your account yet.</div>

  return (
    <div className="space-y-6">
      <PageHeader title="Availability" subtitle="See which rooms are already booked on a given day." />

      <SectionCard title="Check a day">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm font-semibold text-navy-700">Room type
            <select
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              className="mt-2 block w-56 rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-navy-800"
            >
              {(rooms ?? []).map((r) => (
                <option key={r.id} value={r.id}>{r.dormitory?.roomName ?? ROOM_TYPE_LABELS[r.type]} · {r.count} rooms</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-navy-700">Date
            <Input className="mt-2 w-44" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
      </SectionCard>

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-(--radius-lg) bg-navy-50" />
      ) : isError ? (
        <div className="text-sm text-error-600">Could not load availability.</div>
      ) : avail ? (
        <SectionCard
          title={`${date} · ${avail.totalRooms} room${avail.totalRooms === 1 ? '' : 's'} in this type`}
          subtitle={`${avail.bookedIntervals.length} booked slot${avail.bookedIntervals.length === 1 ? '' : 's'}`}
        >
          {avail.bookedIntervals.length === 0 ? (
            <p className="py-6 text-center text-sm text-navy-400">No bookings for this day — all rooms are available.</p>
          ) : (
            <ul className="space-y-2">
              {avail.bookedIntervals.map((iv, i) => (
                <li key={i} className="flex items-center justify-between rounded-[10px] border border-border px-3 py-2 text-sm">
                  <span className="font-medium text-navy-800">{fmtDateTime(iv.checkInAt)}</span>
                  <span className="text-navy-400">→</span>
                  <span className="font-medium text-navy-800">{fmtDateTime(iv.checkOutAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}
    </div>
  )
}

const ROOM_TYPE_LABELS: Record<OwnerRoomType, string> = {
  ac: 'AC Room',
  nonac: 'Non-AC Room',
  dorm: 'Dorm',
  suite: 'Suite',
}

function RoomEditorCard({ propertyId, room }: { propertyId: string; room: OwnerRoom }) {
  const qc = useQueryClient()
  const [count, setCount] = useState(room.count)
  const [hourly, setHourly] = useState(room.hourlyRatePaise != null ? Math.round(room.hourlyRatePaise / 100) : 0)
  const [fullday, setFullday] = useState(room.fulldayRatePaise != null ? Math.round(room.fulldayRatePaise / 100) : 0)
  const [occ, setOcc] = useState(room.maxOccupancy ?? 2)

  const save = useMutation({
    mutationFn: () =>
      ownerRoomsApi.update(propertyId, room.id, {
        count,
        hourlyRate: hourly > 0 ? hourly : undefined,
        fulldayRate: fullday > 0 ? fullday : undefined,
        maxOccupancy: occ,
      }),
    onSuccess: () => {
      toast.success(`${ROOM_TYPE_LABELS[room.type]} updated`)
      qc.invalidateQueries({ queryKey: ['owner-rooms', propertyId] })
    },
    onError: () => toast.error('Could not update this room. Check the values and try again.'),
  })

  return (
    <section className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-1">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-navy-900">{room.dormitory?.roomName ?? ROOM_TYPE_LABELS[room.type]}</h2>
          <p className="mt-1 text-sm text-navy-500">{count} room{count === 1 ? '' : 's'} · sleeps {occ}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm font-semibold text-navy-700">Rooms
          <Input className="mt-2" type="number" min={0} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </label>
        <label className="block text-sm font-semibold text-navy-700">Hourly rate (₹)
          <Input className="mt-2" type="number" min={0} value={hourly} onChange={(e) => setHourly(Number(e.target.value))} />
        </label>
        <label className="block text-sm font-semibold text-navy-700">Full-day rate (₹)
          <Input className="mt-2" type="number" min={0} value={fullday} onChange={(e) => setFullday(Number(e.target.value))} />
        </label>
        <label className="block text-sm font-semibold text-navy-700">Max occupancy
          <Input className="mt-2" type="number" min={1} max={room.type === 'dorm' ? room.dormitory?.totalBeds ?? 500 : 20} value={occ} onChange={(e) => setOcc(Number(e.target.value))} />
        </label>
      </div>
    </section>
  )
}

export function OwnerRoomsPage() {
  const { user } = useAuth()
  const propertyId = user?.propertyId
  const { data: rooms, isLoading, isError } = useQuery({
    queryKey: ['owner-rooms', propertyId],
    queryFn: () => ownerRoomsApi.list(propertyId as string),
    enabled: !!propertyId,
  })

  if (!propertyId) return <div className="text-sm text-navy-500">No property is linked to your account yet.</div>
  if (isLoading) return <div className="h-40 animate-pulse rounded-[10px] bg-navy-50" />
  if (isError) return <div className="text-sm text-error-600">Could not load rooms.</div>

  return (
    <div className="space-y-6">
      <PageHeader title="Rooms &amp; pricing" subtitle="Update inventory count, hourly and full-day rates, and occupancy." />
      <div className="space-y-4">
        {(rooms ?? []).map((room) => (
          <RoomEditorCard key={room.id} propertyId={propertyId} room={room} />
        ))}
        {rooms && rooms.length === 0 && (
          <div className="rounded-(--radius-lg) border border-dashed border-border p-12 text-center">
            <p className="text-navy-400 text-sm">No room types on this property.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Analytics ─────────────────────────────────────────────────────────────

export function OwnerAnalyticsPage() {
  const { user } = useAuth()
  const propertyId = user?.propertyId
  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner-analytics', propertyId],
    queryFn: () => ownerAnalyticsApi.get(propertyId as string, 30),
    enabled: !!propertyId,
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Last 30 days" />
      {!propertyId ? (
        <div className="text-sm text-navy-500">No property is linked to your account yet.</div>
      ) : isLoading ? (
        <div className="h-40 animate-pulse rounded-(--radius-lg) bg-navy-50" />
      ) : isError || !data ? (
        <div className="text-sm text-error-600">Could not load analytics.</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Bookings" value={String(data.totals.bookings)} trend="Last 30 days" icon={CalendarDays} />
            <MetricCard label="Revenue" value={rupees(data.totals.revenuePaise)} trend="Confirmed + completed" icon={IndianRupee} />
            <MetricCard label="Avg booking value" value={rupees(data.totals.avgBookingValuePaise)} trend="Per earning booking" icon={Wallet} />
            <MetricCard label="Hourly bookings" value={String(data.byType.hourly ?? 0)} trend={`${data.byType.fullday ?? 0} full-day`} icon={TrendingUp} />
          </div>
          <SectionCard title="Revenue by day" subtitle="Confirmed + completed bookings">
            {data.revenueByDay.length === 0 ? (
              <p className="py-8 text-center text-sm text-navy-400">No revenue in this window yet.</p>
            ) : (
              <div className="flex h-56 items-end gap-2 overflow-x-auto" aria-label="Revenue by day">
                {(() => {
                  const max = Math.max(...data.revenueByDay.map((d) => d.revenuePaise), 1)
                  return data.revenueByDay.map((d) => (
                    <div key={d.date} className="flex min-w-[28px] flex-1 flex-col items-center gap-2" title={`${d.date}: ${rupees(d.revenuePaise)}`}>
                      <div className="w-full rounded-t-[6px] bg-primary-600" style={{ height: `${Math.round((d.revenuePaise / max) * 100)}%` }} />
                      <span className="text-[9px] text-navy-400">{d.date.slice(5)}</span>
                    </div>
                  ))
                })()}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}

// ── Payouts ────────────────────────────────────────────────────────────────

export function OwnerPayoutsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Payouts" subtitle="Weekly settlements, TDS, and bank account health." />
      <OwnerPayoutsView />
    </div>
  )
}

// ── Reviews ────────────────────────────────────────────────────────────────

export function OwnerReviewsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" subtitle="Guest feedback, response queue, and service quality signals." />
      <OwnerReviewsView />
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────

export function OwnerSettingsPage() {
  const { user } = useAuth()
  const propertyId = user?.propertyId
  const qc = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner-settings', propertyId],
    queryFn: () => ownerSettingsApi.get(propertyId as string),
    enabled: !!propertyId,
  })

  const { register: registerContacts, handleSubmit: submitContacts, reset: resetContacts, formState: { errors: contactErrors } } = useForm<ReceptionContact>({ resolver: zodResolver(receptionContactSchema), defaultValues: { receptionMobile: '', receptionLandline: '' } })

  const [checkin, setCheckin] = useState('')
  const [checkout, setCheckout] = useState('')
  const [minHours, setMinHours] = useState('2')
  const [active, setActive] = useState(true)

  const savedMobile = data?.receptionMobile ?? ''
  const savedLandline = data?.receptionLandline ?? ''
  const savedCheckin = data?.defaultCheckinTime ?? ''
  const savedCheckout = data?.defaultCheckoutTime ?? ''
  const savedMinHours = String(data?.minBookingHours ?? 2)
  const savedActive = data?.isActive

  useEffect(() => {
    resetContacts({ receptionMobile: savedMobile, receptionLandline: savedLandline }, { keepDirtyValues: true })
  }, [savedMobile, savedLandline, resetContacts])

  useEffect(() => {
    if (savedActive === undefined) return
    setCheckin(savedCheckin)
    setCheckout(savedCheckout)
    setMinHours(savedMinHours)
    setActive(savedActive)
  }, [savedCheckin, savedCheckout, savedMinHours, savedActive])

  const saveContacts = useMutation({
    mutationFn: (contacts: ReceptionContact) => ownerSettingsApi.update(propertyId as string, {
      receptionMobile: contacts.receptionMobile,
      receptionLandline: contacts.receptionLandline || null,
    }),
    onSuccess: (updated) => {
      resetContacts({ receptionMobile: updated.receptionMobile ?? '', receptionLandline: updated.receptionLandline ?? '' })
      toast.success('Reception contact saved')
      qc.invalidateQueries({ queryKey: ['owner-settings', propertyId] })
    },
    onError: () => toast.error('Could not save reception contact. Please try again.'),
  })

  const save = useMutation({
    mutationFn: () =>
      ownerSettingsApi.update(propertyId as string, {
        defaultCheckinTime: checkin || undefined,
        defaultCheckoutTime: checkout || undefined,
        minBookingHours: Number(minHours),
        isActive: active,
      }),
    onSuccess: () => {
      toast.success('Settings saved')
      qc.invalidateQueries({ queryKey: ['owner-settings', propertyId] })
    },
    onError: () => toast.error('Could not save settings. Please try again.'),
  })

  if (!propertyId) {
    return <div className="text-sm text-navy-500">No property is linked to your account yet.</div>
  }
  if (isLoading) return <div className="h-40 animate-pulse rounded-[10px] bg-navy-50" />
  if (isError) return <div className="text-sm text-error-600">Could not load settings.</div>

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Operational defaults and public listing status." actions={
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      } />
      <SectionCard title="Reception contact" subtitle="For all property notifications and status updates across every service category." action={
        <Button type="button" size="sm" onClick={submitContacts((contacts) => saveContacts.mutate(contacts))} disabled={saveContacts.isPending}>
          {saveContacts.isPending ? 'Saving…' : 'Save reception contact'}
        </Button>
      }>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldWrapper label="Office Reception mobile number" required error={contactErrors.receptionMobile?.message}>
            <Input {...registerContacts('receptionMobile')} type="tel" aria-label="Office Reception mobile number" aria-required="true" placeholder="10-digit mobile number" />
          </FieldWrapper>
          <FieldWrapper label="Reception landline number" hint="Optional — include the STD code" error={contactErrors.receptionLandline?.message}>
            <Input {...registerContacts('receptionLandline')} type="tel" aria-label="Reception landline number" />
          </FieldWrapper>
        </div>
      </SectionCard>
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Booking defaults">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-navy-700">Default check-in
              <Input type="time" className="mt-2" value={checkin} onChange={(e) => setCheckin(e.target.value)} />
            </label>
            <label className="text-sm font-semibold text-navy-700">Default check-out
              <Input type="time" className="mt-2" value={checkout} onChange={(e) => setCheckout(e.target.value)} />
            </label>
            <label className="text-sm font-semibold text-navy-700 sm:col-span-2">Minimum hourly booking
              <select
                value={minHours}
                onChange={(e) => setMinHours(e.target.value)}
                className="mt-2 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-navy-800"
              >
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="3">3 hours</option>
              </select>
            </label>
          </div>
        </SectionCard>
        <SectionCard title="Public listing">
          <label className="flex items-center justify-between rounded-[10px] border border-border p-3 font-semibold text-navy-700 cursor-pointer hover:bg-navy-50 transition-colors">
            <span>
              {active ? 'Listing is live' : 'Listing is paused'}
              <span className="block text-xs font-normal text-navy-400">
                {active ? 'Guests can find and book your property.' : 'Hidden from the storefront — no new bookings.'}
              </span>
            </span>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5 accent-primary-600"
            />
          </label>
        </SectionCard>
      </div>
    </div>
  )
}
