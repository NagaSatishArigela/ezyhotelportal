import { AlertTriangle, Building2, CheckCircle, Download, Search, Shield, Star, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AdminReviewsView } from './AdminReviewsView'
import { AdminPayoutsView } from './AdminPayoutsView'

const properties = [
  ['AUR-2401', 'Aurora Boutique', 'Mumbai', 'Ravi Nair', 'under review', '₹1.8L'],
  ['BLU-1812', 'Blue Palm Suites', 'Bengaluru', 'Kavya Rao', 'approved', '₹2.4L'],
  ['HIL-7730', 'Hill Crest Homestay', 'Pune', 'Imran Khan', 'revision', '₹86K'],
  ['SEA-4910', 'Sea Line Resort', 'Goa', 'Anika Dsouza', 'risk hold', '₹3.2L'],
]

const darkBadge: Record<string, BadgeProps['variant']> = {
  approved: 'green',
  'under review': 'amber',
  revision: 'teal',
  'risk hold': 'red',
  paid: 'green',
  pending: 'amber',
  escalated: 'red',
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

function DarkMetric({ label, value, delta, icon: Icon }: { label: string; value: string; delta: string; icon: React.ElementType }) {
  return (
    <DarkCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-navy-500">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold text-navy-900">{value}</p>
          <p className="mt-1 text-xs text-success-500">{delta}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-600/10 text-primary-600">
          <Icon size={18} aria-hidden />
        </span>
      </div>
    </DarkCard>
  )
}

function AdminSearch() {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" size={16} aria-hidden />
      <Input className="h-10 border-border bg-white pl-9 text-navy-900 placeholder:text-navy-500" placeholder="Search properties, owners..." aria-label="Search admin records" />
    </div>
  )
}

function PropertiesTable({ mode = 'properties' }: { mode?: 'properties' | 'payouts' | 'users' }) {
  return (
    <div className="overflow-x-auto rounded-(--radius-lg) border border-border bg-white shadow-2">
      <table className="w-full min-w-[780px] text-left text-sm">
        <caption className="sr-only">Admin {mode} table</caption>
        <thead className="bg-white text-xs font-bold uppercase tracking-wider text-navy-500">
          <tr>
            {(mode === 'payouts' ? ['Batch', 'Property', 'Amount', 'TDS', 'Status', 'Action'] : ['ID', 'Property', 'Market', 'Owner', 'Status', 'GMV', 'Action']).map((h) => (
              <th key={h} scope="col" className="px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {properties.map(([id, name, city, owner, status, gmv], i) => (
            <tr key={id} className="hover:bg-navy-50">
              <td className="px-4 py-4 font-mono text-xs font-bold text-navy-900">{mode === 'payouts' ? `PAY-${1028 - i}` : id}</td>
              <td className="px-4 py-4 font-semibold text-navy-900">{name}</td>
              <td className="px-4 py-4 text-navy-500">{mode === 'payouts' ? `₹${(i + 2) * 12000}` : city}</td>
              <td className="px-4 py-4 text-navy-500">{mode === 'payouts' ? `₹${(i + 1) * 1400}` : owner}</td>
              <td className="px-4 py-4"><Badge variant={darkBadge[mode === 'payouts' ? (i === 0 ? 'pending' : 'paid') : status]}>{mode === 'payouts' ? (i === 0 ? 'pending' : 'paid') : status}</Badge></td>
              <td className="px-4 py-4 font-bold text-navy-900">{gmv}</td>
              <td className="px-4 py-4"><Button variant="dark" size="sm">{mode === 'payouts' ? 'Review' : 'Open'}</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AdminPropertiesPage() {
  return (
    <div className="space-y-6">
      <AdminHeader title="Properties directory" subtitle="Portfolio health, market status, and listing governance." actions={<><AdminSearch /><Button variant="outline" size="sm"><Download size={16} /> Export</Button></>} />
      <PropertiesTable />
    </div>
  )
}

export function AdminPayoutsPage() {
  return (
    <div className="space-y-6">
      <AdminHeader title="Payouts · weekly settlement" subtitle="Batch review, holds, tax deductions, and release controls." />
      <AdminPayoutsView />
    </div>
  )
}

export function AdminReviewsPage() {
  return (
    <div className="space-y-6">
      <AdminHeader title="Review moderation queue" subtitle="Safety, policy, sentiment, and owner reply oversight." />
      <AdminReviewsView />
    </div>
  )
}

export function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <AdminHeader title="Users directory" subtitle="Owner, guest, admin and support user lookup." actions={<AdminSearch />} />
      <div className="grid gap-4 md:grid-cols-4">
        <DarkMetric label="Owners" value="2,418" delta="+42 this week" icon={Building2} />
        <DarkMetric label="Guests" value="84K" delta="+9% MoM" icon={Users} />
        <DarkMetric label="Support agents" value="38" delta="96% SLA" icon={Shield} />
        <DarkMetric label="Flagged users" value="21" delta="5 new" icon={AlertTriangle} />
      </div>
      <PropertiesTable mode="users" />
    </div>
  )
}

export function AdminAnalyticsPage() {
  const points = [22, 30, 28, 40, 46, 38, 50, 58, 54, 62, 70, 66]
  return (
    <div className="space-y-6">
      <AdminHeader title="Platform analytics" subtitle="Marketplace health, revenue, trust, and regional growth." actions={<Button variant="outline" size="sm"><Download size={16} /> Export</Button>} />
      <div className="grid gap-4 md:grid-cols-4">
        <DarkMetric label="GMV" value="₹12.4Cr" delta="+18% MoM" icon={TrendingUp} />
        <DarkMetric label="Bookings" value="42,812" delta="+11% MoM" icon={CheckCircle} />
        <DarkMetric label="Active supply" value="2,418" delta="+128 listings" icon={Building2} />
        <DarkMetric label="Avg rating" value="4.7" delta="Stable" icon={Star} />
      </div>
      <DarkCard title="Platform performance">
        <div className="flex h-80 items-end gap-3" aria-label="Platform GMV trend chart">
          {points.map((p, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-[8px] bg-gradient-to-t from-primary-700 to-primary-600" style={{ height: `${p}%` }} />
              <span className="text-[10px] text-navy-500">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}</span>
            </div>
          ))}
        </div>
      </DarkCard>
    </div>
  )
}
