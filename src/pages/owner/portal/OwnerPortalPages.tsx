import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  CalendarDays, ChevronLeft, ChevronRight, Download, IndianRupee, Plus,
  Search, Star, TrendingUp, Wallet, BedDouble, MoreHorizontal, Eye,
  LogIn, LogOut, XCircle, Edit2, Trash2, Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SectionCard } from '@/components/shared/SectionCard'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { OwnerReviewsView } from './OwnerReviewsView'
import { OwnerPayoutsView } from './OwnerPayoutsView'

// ── Static demo data ────────────────────────────────────────────────────────

const BOOKINGS = [
  { id: 'PPH-8K42-9X1', guest: 'Aarav Patel',   room: 'Deluxe AC · 204',     checkIn: '1 May, 2:00 PM',  duration: '4h',        amount: '₹2,182', status: 'confirmed' },
  { id: 'PPH-8K39-2A7', guest: 'Meera Iyer',     room: 'Premium · 301',       checkIn: '1 May, 3:30 PM',  duration: '6h',        amount: '₹4,512', status: 'checked-in' },
  { id: 'PPH-8K30-1B4', guest: 'Karan Shah',     room: 'Deluxe AC · 207',     checkIn: '1 May, 5:00 PM',  duration: '8h',        amount: '₹3,640', status: 'pending' },
  { id: 'PPH-8K28-7C2', guest: 'Neha Kapoor',    room: 'Standard · 105',      checkIn: '1 May, 7:00 PM',  duration: 'Overnight', amount: '₹2,890', status: 'confirmed' },
  { id: 'PPH-8K22-5D9', guest: 'Vikram Joshi',   room: 'Deluxe AC · 209',     checkIn: '30 Apr, 11:00 AM', duration: '4h',       amount: '₹2,182', status: 'completed' },
  { id: 'PPH-8K12-1F2', guest: 'Suresh Nair',    room: 'Standard · 102',      checkIn: '29 Apr, 2:00 PM', duration: '4h',        amount: '₹1,680', status: 'cancelled' },
]

const statusVariant: Record<string, BadgeProps['variant']> = {
  confirmed: 'green',
  'checked-in': 'teal',
  pending: 'amber',
  completed: 'grey',
  cancelled: 'red',
}

const ROOM_TYPES = [
  { id: 'r1', name: 'Standard non-AC', count: 8,  sleep: '2 · 220 sqft · King bed',     price: 299, amenities: ['Wi-Fi', 'TV', 'Attached bath'] },
  { id: 'r2', name: 'Deluxe AC',       count: 6,  sleep: '2 · 220 sqft · King bed',     price: 449, amenities: ['Wi-Fi', 'TV', 'Attached bath', 'Mini-bar'] },
  { id: 'r3', name: 'Premium Suite',   count: 3,  sleep: '3 · 360 sqft · Balcony',      price: 729, amenities: ['Wi-Fi', 'TV', 'Attached bath', 'Mini-bar', 'Balcony'] },
]

const tiers = (base: number) => [
  `₹${base}`,
  `₹${Math.round(base * 3.6)}`,
  `₹${Math.round(base * 6.8)}`,
  `₹${Math.round(base * 14.4)}`,
]

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

function SearchBar({ placeholder = 'Search bookings, guests...' }: { placeholder?: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" size={16} aria-hidden />
      <Input className="h-10 pl-9" placeholder={placeholder} />
    </div>
  )
}

// ── New Booking dialog ─────────────────────────────────────────────────────

function NewBookingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ guest: '', phone: '', room: 'Deluxe AC', date: '', time: '14:00', duration: '3' })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.guest || !form.phone || !form.date) { toast.error('Please fill all required fields'); return }
    toast.success(`Booking created for ${form.guest} — ${form.room} on ${form.date} at ${form.time}`)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
          <DialogDescription>Create a walk-in or phone booking directly.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-navy-500 uppercase tracking-wider col-span-2">
              Guest name *
              <Input className="mt-1 font-normal" placeholder="Full name as per ID" value={form.guest} onChange={set('guest')} />
            </label>
            <label className="text-xs font-bold text-navy-500 uppercase tracking-wider">
              Phone *
              <Input className="mt-1 font-normal" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={set('phone')} />
            </label>
            <label className="text-xs font-bold text-navy-500 uppercase tracking-wider">
              Room type *
              <Select className="mt-1 h-10" value={form.room} onChange={set('room')}>
                {ROOM_TYPES.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
              </Select>
            </label>
            <label className="text-xs font-bold text-navy-500 uppercase tracking-wider">
              Date *
              <Input className="mt-1 font-normal" type="date" value={form.date} onChange={set('date')} />
            </label>
            <label className="text-xs font-bold text-navy-500 uppercase tracking-wider">
              Check-in time
              <Input className="mt-1 font-normal" type="time" value={form.time} onChange={set('time')} />
            </label>
            <label className="text-xs font-bold text-navy-500 uppercase tracking-wider col-span-2">
              Duration (hours)
              <Select className="mt-1 h-10" value={form.duration} onChange={set('duration')}>
                {['1', '2', '3', '4', '6', '8', '12', '24'].map((h) => <option key={h} value={h}>{h === '24' ? '24h (overnight)' : `${h}h`}</option>)}
              </Select>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Create booking</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Booking detail dialog ──────────────────────────────────────────────────

function BookingDetailDialog({ booking, onClose }: { booking: typeof BOOKINGS[0] | null; onClose: () => void }) {
  const handleAction = (action: string) => {
    toast.success(`${action} for booking ${booking?.id}`)
    onClose()
  }
  return (
    <Dialog open={!!booking} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Booking {booking?.id}</DialogTitle>
          <DialogDescription>{booking?.guest} · {booking?.room}</DialogDescription>
        </DialogHeader>
        {booking && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-navy-500 text-xs font-bold uppercase">Check-in</p><p className="font-semibold text-navy-900 mt-0.5">{booking.checkIn}</p></div>
              <div><p className="text-navy-500 text-xs font-bold uppercase">Duration</p><p className="font-semibold text-navy-900 mt-0.5">{booking.duration}</p></div>
              <div><p className="text-navy-500 text-xs font-bold uppercase">Amount</p><p className="font-semibold text-navy-900 mt-0.5">{booking.amount}</p></div>
              <div><p className="text-navy-500 text-xs font-bold uppercase">Status</p><div className="mt-0.5"><Badge variant={statusVariant[booking.status]}>{booking.status}</Badge></div></div>
            </div>
            <div className="rounded-xl bg-navy-50 p-3 text-xs text-navy-500">
              <p className="font-bold text-navy-700 mb-1">Guest contact</p>
              <p>+91 98765 {booking.id.slice(-4)} · guest@example.com</p>
              <p className="mt-1">ID: Aadhar card verified ✓</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {booking.status === 'confirmed' && (
                <Button size="sm" onClick={() => handleAction('Check-in')} className="flex items-center gap-1.5"><LogIn size={14} /> Check-in</Button>
              )}
              {booking.status === 'checked-in' && (
                <Button size="sm" onClick={() => handleAction('Check-out')} className="flex items-center gap-1.5"><LogOut size={14} /> Check-out</Button>
              )}
              {(booking.status === 'confirmed' || booking.status === 'pending') && (
                <Button size="sm" variant="danger" onClick={() => handleAction('Cancel')} className="flex items-center gap-1.5"><XCircle size={14} /> Cancel</Button>
              )}
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
  const [selectedBooking, setSelectedBooking] = useState<typeof BOOKINGS[0] | null>(null)
  const list = compact ? BOOKINGS.slice(0, 5) : BOOKINGS

  const handleAction = (action: string, booking: typeof BOOKINGS[0]) => {
    if (action === 'view') { setSelectedBooking(booking); return }
    toast.success(`${action} applied to ${booking.id}`)
  }

  return (
    <>
      <div className="overflow-x-auto rounded-(--radius-lg) border border-border bg-white shadow-1">
        <table className="w-full min-w-[820px] text-left text-sm">
          <caption className="sr-only">Owner booking list</caption>
          <thead className="bg-navy-50 text-xs font-bold uppercase tracking-wider text-navy-500">
            <tr>
              {['Booking ID', 'Guest', 'Room', 'Check-in', 'Duration', 'Amount', 'Status', ''].map((h) => (
                <th key={h || 'actions'} scope="col" className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((b) => (
              <tr key={b.id} className="hover:bg-navy-50 cursor-pointer" onClick={() => setSelectedBooking(b)}>
                <td className="px-4 py-4 font-mono text-xs font-bold text-navy-900">{b.id}</td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-navy-900">{b.guest}</p>
                  <p className="text-xs text-navy-400">+91 98765 {b.id.slice(-4)}</p>
                </td>
                <td className="px-4 py-4 text-navy-700">{b.room}</td>
                <td className="px-4 py-4 text-navy-700">{b.checkIn}</td>
                <td className="px-4 py-4 text-navy-700">{b.duration}</td>
                <td className="px-4 py-4">
                  <p className="font-bold text-navy-900">{b.amount}</p>
                  <p className="text-xs text-success-700">{b.status === 'cancelled' ? 'refunded' : 'paid'}</p>
                </td>
                <td className="px-4 py-4">
                  <Badge variant={statusVariant[b.status]}>{b.status}</Badge>
                </td>
                <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" aria-label={`Actions for ${b.id}`}>
                        <MoreHorizontal size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => handleAction('view', b)}>
                        <Eye size={14} className="mr-2" /> View details
                      </DropdownMenuItem>
                      {b.status === 'confirmed' && (
                        <DropdownMenuItem onClick={() => handleAction('Check-in', b)}>
                          <LogIn size={14} className="mr-2" /> Check-in guest
                        </DropdownMenuItem>
                      )}
                      {b.status === 'checked-in' && (
                        <DropdownMenuItem onClick={() => handleAction('Check-out', b)}>
                          <LogOut size={14} className="mr-2" /> Check-out guest
                        </DropdownMenuItem>
                      )}
                      {(b.status === 'confirmed' || b.status === 'pending') && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleAction('Cancellation', b)}
                            className="text-error-500"
                          >
                            <XCircle size={14} className="mr-2" /> Cancel booking
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BookingDetailDialog booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
    </>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────

const QUEUE_ITEMS = [
  { text: '3 check-ins need ID verification', variant: 'amber',  href: '/owner/bookings' },
  { text: '2 payout invoices are ready',      variant: 'green',  href: '/owner/payouts' },
  { text: '1 low inventory warning — Deluxe AC', variant: 'red', href: '/owner/availability' },
  { text: '18 pricing recommendations',       variant: 'teal',   href: '/owner/availability' },
]

export function OwnerDashboardPage() {
  const navigate = useNavigate()
  const [newBookingOpen, setNewBookingOpen] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner portal · Daily operations"
        title="Dashboard"
        subtitle="Today at The Park Suites"
        actions={
          <>
            <SearchBar />
            <Button size="sm" onClick={() => setNewBookingOpen(true)}>
              <Plus size={16} aria-hidden /> New booking
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today bookings" value="42"     trend="+12% vs last week" icon={CalendarDays} />
        <MetricCard label="Net revenue"    value="₹84,210" trend="+18% vs last week" icon={IndianRupee} />
        <MetricCard label="Occupancy"      value="78%"    trend="+4 pts today"      icon={BedDouble} />
        <MetricCard label="Guest rating"   value="4.8"    trend="132 new reviews"   icon={Star} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <SectionCard title="Revenue trend" subtitle="Hourly and overnight mix across the last 14 days">
          <div className="flex h-64 items-end gap-2" aria-label="Revenue bar chart">
            {[45, 52, 39, 64, 58, 71, 82, 68, 74, 88, 76, 91, 84, 96].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-[8px] bg-primary-600" style={{ height: `${h}%` }} />
                <span className="text-[10px] text-navy-400">{i + 1}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Operations queue">
          <div className="space-y-3">
            {QUEUE_ITEMS.map(({ text, variant, href }) => (
              <div key={text} className="flex items-center justify-between rounded-[10px] border border-border p-3 hover:bg-navy-50 transition-colors">
                <p className="text-sm font-medium text-navy-700">{text}</p>
                <button
                  onClick={() => navigate({ to: href as never })}
                  className="focus-visible:outline-none"
                  aria-label={`Open: ${text}`}
                >
                  <Badge variant={variant as BadgeProps['variant']} className="cursor-pointer hover:opacity-80 transition-opacity">
                    Open →
                  </Badge>
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <BookingsTable compact />
      <NewBookingDialog open={newBookingOpen} onClose={() => setNewBookingOpen(false)} />
    </div>
  )
}

// ── Bookings ──────────────────────────────────────────────────────────────

export function OwnerBookingsPage() {
  const [newBookingOpen, setNewBookingOpen] = useState(false)
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle="Manage arrivals, duration changes, cancellations, and settlements."
        actions={
          <>
            <SearchBar />
            <Select className="h-10 w-44" aria-label="Filter bookings">
              <option>All statuses</option>
              <option>Confirmed</option>
              <option>Checked-in</option>
              <option>Pending</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </Select>
            <Button size="sm" onClick={() => setNewBookingOpen(true)}>
              <Plus size={16} aria-hidden /> New booking
            </Button>
          </>
        }
      />
      <BookingsTable />
      <NewBookingDialog open={newBookingOpen} onClose={() => setNewBookingOpen(false)} />
    </div>
  )
}

// ── Availability ──────────────────────────────────────────────────────────

function BulkEditDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [price, setPrice] = useState('')
  const [action, setAction] = useState('set_price')
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit</DialogTitle>
          <DialogDescription>Apply changes to multiple dates at once.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <label className="text-xs font-bold text-navy-500 uppercase tracking-wider block">
            Action
            <Select className="mt-1 h-10" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="set_price">Set custom price</option>
              <option value="block">Block dates</option>
              <option value="unblock">Unblock dates</option>
              <option value="reset">Reset to default price</option>
            </Select>
          </label>
          {action === 'set_price' && (
            <label className="text-xs font-bold text-navy-500 uppercase tracking-wider block">
              Price per hour (₹)
              <Input className="mt-1" type="number" placeholder="e.g. 550" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
          )}
          <label className="text-xs font-bold text-navy-500 uppercase tracking-wider block">
            Date range
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Input type="date" />
              <Input type="date" />
            </div>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { toast.success('Bulk edit applied successfully'); onClose() }}>Apply</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PricingRuleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('weekend_surge')
  const [pct, setPct] = useState('15')
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Pricing Rule</DialogTitle>
          <DialogDescription>Automatically adjust prices based on demand signals.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <label className="text-xs font-bold text-navy-500 uppercase tracking-wider block">
            Rule name
            <Input className="mt-1" placeholder="e.g. Weekend surge" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-xs font-bold text-navy-500 uppercase tracking-wider block">
            Rule type
            <Select className="mt-1 h-10" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="weekend_surge">Weekend surge</option>
              <option value="holiday_surge">Holiday surge</option>
              <option value="last_minute_discount">Last-minute discount</option>
              <option value="early_bird">Early bird discount</option>
              <option value="peak_hour">Peak-hour premium</option>
            </Select>
          </label>
          <label className="text-xs font-bold text-navy-500 uppercase tracking-wider block">
            Adjustment (%)
            <Input className="mt-1" type="number" min="-50" max="100" value={pct} onChange={(e) => setPct(e.target.value)} />
            <p className="mt-1 text-[11px] text-navy-400 font-normal">Positive = price increase · Negative = discount</p>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { toast.success(`Rule "${name || type}" created`); onClose() }}>Save rule</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DayEditDialog({ day, onClose, onSave }: { day: number | null; onClose: () => void; onSave: (day: number, price: number, blocked: boolean) => void }) {
  const [price, setPrice] = useState(String(420 + (day ?? 0)))
  const [blocked, setBlocked] = useState(false)
  if (!day) return null
  return (
    <Dialog open={!!day} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>May {day}, 2026</DialogTitle>
          <DialogDescription>Override price or block this date.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} className="h-4 w-4 accent-primary-600" />
            <span className="text-sm font-semibold text-navy-700">Block this date (no bookings)</span>
          </label>
          {!blocked && (
            <label className="text-xs font-bold text-navy-500 uppercase tracking-wider block">
              Custom price per hour (₹)
              <Input className="mt-1" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { onSave(day, Number(price), blocked); onClose() }}>
              {blocked ? 'Block date' : 'Save price'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function OwnerAvailabilityPage() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [ruleOpen, setRuleOpen] = useState(false)
  const [customPrices, setCustomPrices] = useState<Record<number, number>>({})
  const [blocked, setBlocked] = useState<Set<number>>(new Set())
  const [inventory, setInventory] = useState<Record<string, number>>({ 'Standard non-AC': 6, 'Deluxe AC': 4, 'Premium Suite': 2 })

  const detailRooms = ROOM_TYPES.map((r) => ({ ...r, available: inventory[r.name] ?? r.count - 2 }))

  const saveDay = (day: number, price: number, isBlocked: boolean) => {
    if (isBlocked) {
      setBlocked((prev) => new Set([...prev, day]))
      toast.success(`May ${day} blocked`)
    } else {
      setCustomPrices((prev) => ({ ...prev, [day]: price }))
      toast.success(`May ${day} price set to ₹${price}/hr`)
    }
  }

  const adjustInventory = (room: string, delta: number) => {
    setInventory((prev) => {
      const next = Math.max(0, (prev[room] ?? 0) + delta)
      toast.success(`${room}: ${next} rooms available`)
      return { ...prev, [room]: next }
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Availability & pricing"
        subtitle="May 2026 · The Park Suites"
        actions={
          <>
            <SearchBar />
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>Bulk edit</Button>
            <Button size="sm" onClick={() => setRuleOpen(true)}><Plus size={16} aria-hidden /> Pricing rule</Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <SectionCard
          title="Availability calendar"
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => toast('Navigating to April 2026')}><ChevronLeft size={16} /></Button>
              <Button variant="outline" size="icon" aria-label="Next month" onClick={() => toast('Navigating to June 2026')}><ChevronRight size={16} /></Button>
            </div>
          }
        >
          <div className="mb-4 flex flex-wrap gap-4 text-xs text-navy-500">
            {[
              { label: 'Available', cls: 'bg-white border-border' },
              { label: 'Custom price', cls: 'bg-primary-50 border-primary-200' },
              { label: 'Blocked', cls: 'bg-error-50 border-error-200' },
              { label: 'Today', cls: 'bg-navy-900' },
            ].map(({ label, cls }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={cn('h-3 w-3 rounded-[3px] border', cls)} />
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2" role="grid" aria-label="May 2026 availability calendar">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-xs font-bold text-navy-400">{d}</div>
            ))}
            {days.map((day) => {
              const isToday = day === 15
              const isBlocked = blocked.has(day)
              const hasCustom = customPrices[day] !== undefined
              const isSelected = selectedDay === day
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'min-h-20 rounded-[10px] border p-2 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                    isSelected && 'ring-2 ring-primary-600',
                    isToday ? 'bg-navy-900 text-white border-navy-900'
                      : isBlocked ? 'bg-error-50 border-error-200'
                      : hasCustom ? 'bg-primary-50 border-primary-200'
                      : day % 9 === 0 ? 'stripes bg-navy-50 border-border'
                      : 'bg-white border-border hover:bg-navy-50',
                  )}
                  aria-label={`May ${day} — click to edit`}
                  aria-pressed={isSelected}
                >
                  <span className="font-bold">{day}</span>
                  <p className={cn('mt-3 text-[10px]', isToday ? 'text-white/70' : isBlocked ? 'text-error-500' : 'opacity-60')}>
                    {isBlocked ? 'Blocked' : isToday ? 'Today' : `₹${customPrices[day] ?? (420 + day)}/hr`}
                  </p>
                </button>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard title={`${selectedDay ? `May ${selectedDay}` : 'Fri 15 May'} 2026`} subtitle="Room availability">
          <div className="space-y-4">
            {detailRooms.map((room) => (
              <div key={room.name} className="rounded-[10px] border border-border p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-navy-900 text-sm">{room.name}</p>
                    <p className="text-xs text-navy-500">{inventory[room.name] ?? room.count - 2} of {room.count} available</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => adjustInventory(room.name, -1)}
                      disabled={(inventory[room.name] ?? room.count - 2) <= 0}
                      aria-label={`Decrease ${room.name}`}
                    >−</Button>
                    <span className="w-6 text-center font-bold text-navy-900">{inventory[room.name] ?? room.count - 2}</span>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => adjustInventory(room.name, 1)}
                      disabled={(inventory[room.name] ?? room.count - 2) >= room.count}
                      aria-label={`Increase ${room.name}`}
                    >+</Button>
                  </div>
                </div>
              </div>
            ))}
            <Button className="w-full" size="sm" variant="outline" onClick={() => selectedDay && setSelectedDay(selectedDay)}>
              Edit May {selectedDay ?? 15} prices
            </Button>
          </div>
        </SectionCard>
      </div>

      <BulkEditDialog open={bulkOpen} onClose={() => setBulkOpen(false)} />
      <PricingRuleDialog open={ruleOpen} onClose={() => setRuleOpen(false)} />
      <DayEditDialog day={selectedDay} onClose={() => setSelectedDay(null)} onSave={saveDay} />
    </div>
  )
}

// ── Rooms & pricing ────────────────────────────────────────────────────────

function AddRoomTypeDialog({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void
  onAdd: (room: { name: string; count: number; price: number; sleep: string }) => void
}) {
  const [name, setName] = useState('')
  const [count, setCount] = useState('4')
  const [price, setPrice] = useState('399')
  const [sleep, setSleep] = useState('2 · King bed')
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) { toast.error('Room name is required'); return }
    onAdd({ name, count: Number(count), price: Number(price), sleep })
    toast.success(`Room type "${name}" added`)
    onClose()
    setName(''); setCount('4'); setPrice('399'); setSleep('2 · King bed')
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Room Type</DialogTitle>
          <DialogDescription>Define a new room category with pricing.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <label className="text-xs font-bold text-navy-500 uppercase tracking-wider block">
            Room name *
            <Input className="mt-1 font-normal" placeholder="e.g. Executive Suite" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-navy-500 uppercase tracking-wider">
              Total rooms
              <Input className="mt-1 font-normal" type="number" min="1" value={count} onChange={(e) => setCount(e.target.value)} />
            </label>
            <label className="text-xs font-bold text-navy-500 uppercase tracking-wider">
              Base price / hr (₹)
              <Input className="mt-1 font-normal" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
          </div>
          <label className="text-xs font-bold text-navy-500 uppercase tracking-wider block">
            Capacity description
            <Input className="mt-1 font-normal" placeholder="2 · 220 sqft · King bed" value={sleep} onChange={(e) => setSleep(e.target.value)} />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Add room type</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditRoomDialog({ room, onClose, onSave }: {
  room: { id: string; name: string; count: number; price: number; sleep: string; amenities: string[] } | null
  onClose: () => void
  onSave: (id: string, price: number, count: number) => void
}) {
  const [price, setPrice] = useState('0')
  const [count, setCount] = useState('0')
  useEffect(() => {
    if (room) { setPrice(String(room.price)); setCount(String(room.count)) }
  }, [room])
  if (!room) return null
  return (
    <Dialog open={!!room} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit: {room.name}</DialogTitle>
          <DialogDescription>{room.sleep}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-navy-500 uppercase tracking-wider">
              Total rooms
              <Input className="mt-1" type="number" min="1" value={count} onChange={(e) => setCount(e.target.value)} />
            </label>
            <label className="text-xs font-bold text-navy-500 uppercase tracking-wider">
              Base price / hr (₹)
              <Input className="mt-1" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
          </div>
          <div>
            <p className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">Auto-tier preview</p>
            <div className="grid grid-cols-4 gap-2">
              {['1h', '4h', '8h', '24h'].map((slot, i) => (
                <div key={slot} className="rounded-[8px] bg-navy-50 px-3 py-2 text-sm text-center">
                  <p className="text-navy-400 text-[10px]">{slot}</p>
                  <p className="font-bold text-navy-900">{tiers(Number(price))[i]}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { onSave(room.id, Number(price), Number(count)); toast.success(`${room.name} updated`); onClose() }}>
              Save changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DeleteRoomConfirm({ room, onClose, onDelete }: {
  room: { id: string; name: string } | null; onClose: () => void; onDelete: (id: string) => void
}) {
  if (!room) return null
  return (
    <Dialog open={!!room} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete "{room.name}"?</DialogTitle>
          <DialogDescription>This will remove the room type and all its pricing tiers. Existing bookings will not be affected.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => { onDelete(room.id); toast.success(`"${room.name}" deleted`); onClose() }}>
            Delete room type
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function OwnerRoomsPage() {
  const [rooms, setRooms] = useState(ROOM_TYPES)
  const [addOpen, setAddOpen] = useState(false)
  const [editRoom, setEditRoom] = useState<typeof ROOM_TYPES[0] | null>(null)
  const [deleteRoom, setDeleteRoom] = useState<{ id: string; name: string } | null>(null)

  const handleAdd = (r: { name: string; count: number; price: number; sleep: string }) => {
    setRooms((prev) => [...prev, { id: `r${Date.now()}`, amenities: ['Wi-Fi'], ...r }])
  }
  const handleSave = (id: string, price: number, count: number) => {
    setRooms((prev) => prev.map((r) => r.id === id ? { ...r, price, count } : r))
  }
  const handleDelete = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rooms & pricing"
        subtitle="Inventory, base pricing, and automatic slot tiers."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={16} aria-hidden /> Add room type
          </Button>
        }
      />

      <div className="space-y-4">
        {rooms.map((room) => (
          <section key={room.id} className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-1" aria-labelledby={`${room.id}-title`}>
            <div className="grid gap-4 lg:grid-cols-[1fr_220px_260px]">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 id={`${room.id}-title`} className="font-display text-lg font-bold text-navy-900">{room.name}</h2>
                    <p className="mt-1 text-sm text-navy-500">{room.count} rooms · Sleeps {room.sleep}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditRoom(room)} aria-label={`Edit ${room.name}`}>
                      <Edit2 size={14} className="text-navy-400" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteRoom({ id: room.id, name: room.name })} aria-label={`Delete ${room.name}`}>
                      <Trash2 size={14} className="text-error-400" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {room.amenities.map((a) => <Badge key={a} variant="grey">{a}</Badge>)}
                </div>
              </div>

              <label className="block text-sm font-semibold text-navy-700">
                Base price · per hour
                <Input
                  className="mt-2"
                  type="number"
                  value={room.price}
                  onChange={(e) => setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, price: Number(e.target.value) } : r))}
                />
                <Button size="sm" className="mt-2 w-full" variant="outline" onClick={() => toast.success(`${room.name} price saved`)}>
                  <Check size={14} className="mr-1" /> Save price
                </Button>
              </label>

              <div>
                <p className="text-sm font-semibold text-navy-700">Auto-tiers</p>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {['1h', '4h', '8h', '24h'].map((slot, i) => (
                    <div key={slot} className="flex justify-between rounded-[8px] bg-navy-50 px-3 py-2">
                      <dt>{slot}</dt>
                      <dd className="font-bold">{tiers(room.price)[i]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>
        ))}

        {rooms.length === 0 && (
          <div className="rounded-(--radius-lg) border border-dashed border-border p-12 text-center">
            <p className="text-navy-400 text-sm">No room types yet.</p>
            <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus size={16} aria-hidden /> Add your first room type
            </Button>
          </div>
        )}
      </div>

      <SectionCard title="Smart pricing · recommended">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm text-navy-600">
            Stayflex auto-adjusts prices up to 20% based on local demand, day-of-week and time-of-day. Owners using this feature earn 18% more on average.
          </p>
          <label className="flex items-center gap-2 font-semibold text-navy-700 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="h-5 w-5 accent-primary-600"
              onChange={(e) => toast.success(`Smart pricing ${e.target.checked ? 'enabled' : 'disabled'}`)}
            />
            On
          </label>
        </div>
      </SectionCard>

      <AddRoomTypeDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
      <EditRoomDialog room={editRoom} onClose={() => setEditRoom(null)} onSave={handleSave} />
      <DeleteRoomConfirm room={deleteRoom} onClose={() => setDeleteRoom(null)} onDelete={handleDelete} />
    </div>
  )
}

// ── Analytics ─────────────────────────────────────────────────────────────

export function OwnerAnalyticsPage() {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Last 30 days · vs previous 30 days"
        actions={
          <>
            <SearchBar />
            <Button variant="outline" size="sm" onClick={() => toast.success('Report exported to CSV')}>
              <Download size={16} aria-hidden /> Export
            </Button>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Bookings"           value="486"       trend="+22% vs last period" icon={CalendarDays} />
        <MetricCard label="Revenue (net)"      value="₹8,42,180" trend="+18% vs last period" icon={IndianRupee} />
        <MetricCard label="Occupancy"          value="78%"       trend="+4 pts vs last period" icon={TrendingUp} />
        <MetricCard label="Avg booking value"  value="₹1,733"    trend="-3% vs last period"  icon={Wallet} />
      </div>
      <SectionCard title="Booking density · 7-day × 24-hour" subtitle="Peak: Friday 7–10 PM · Slowest: Tuesday 4–7 AM">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="mb-2 ml-12 grid grid-cols-24 gap-1 text-[10px] text-navy-400">
              {hours.map((h) => <span key={h}>{String(h).padStart(2, '0')}</span>)}
            </div>
            {days.map((day, d) => (
              <div key={day} className="mb-1 flex items-center gap-2">
                <span className="w-10 text-xs font-bold text-navy-500">{day}</span>
                <div className="grid flex-1 grid-cols-24 gap-1">
                  {hours.map((h) => {
                    const hot = h > 11 && h < 23
                    const alpha = hot ? 0.25 + ((h + d) % 7) * 0.1 : 0.08
                    return <span key={h} className="h-8 rounded-[5px]" style={{ backgroundColor: `rgba(255,143,0,${alpha})` }} aria-hidden />
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
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
  const [saved, setSaved] = useState(false)
  const handleSave = () => { setSaved(true); toast.success('Settings saved'); setTimeout(() => setSaved(false), 2000) }
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Property profile, notifications, cancellation rules, and payout preferences." actions={
        <Button size="sm" onClick={handleSave}>
          {saved ? <><Check size={14} className="mr-1" /> Saved</> : 'Save changes'}
        </Button>
      } />
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Property profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-navy-700">Property name<Input className="mt-2" defaultValue="The Park Suites" /></label>
            <label className="text-sm font-semibold text-navy-700">City<Input className="mt-2" defaultValue="Mumbai" /></label>
            <label className="text-sm font-semibold text-navy-700 sm:col-span-2">Address<Input className="mt-2" defaultValue="42, Linking Road, Bandra West" /></label>
          </div>
        </SectionCard>
        <SectionCard title="Controls">
          <div className="space-y-4">
            {[
              { label: 'Instant booking', checked: false },
              { label: 'Smart pricing', checked: true },
              { label: 'WhatsApp guest alerts', checked: true },
              { label: 'Auto-generate tax invoices', checked: true },
            ].map(({ label, checked }) => (
              <label key={label} className="flex items-center justify-between rounded-[10px] border border-border p-3 font-semibold text-navy-700 cursor-pointer hover:bg-navy-50 transition-colors">
                {label}
                <input
                  type="checkbox"
                  defaultChecked={checked}
                  className="h-5 w-5 accent-primary-600"
                  onChange={(e) => toast.success(`${label} ${e.target.checked ? 'enabled' : 'disabled'}`)}
                />
              </label>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
