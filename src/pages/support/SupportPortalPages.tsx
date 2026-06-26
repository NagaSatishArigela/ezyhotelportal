import { Search, Ticket, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionCard } from '@/components/shared/SectionCard'

const tickets = [
  ['TKT-9012', 'Owner cannot upload GST certificate', 'Kavya Rao', 'high', '18 min'],
  ['TKT-9011', 'Guest refund not received', 'Rohan Mehta', 'urgent', '24 min'],
  ['TKT-9008', 'Change bank account request', 'Ravi Nair', 'normal', '1h 12m'],
  ['TKT-9005', 'Listing not visible in search', 'Blue Palm Suites', 'normal', '2h 03m'],
]

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Support portal</p>
        <h1 className="font-display text-2xl font-bold text-navy-900">{title}</h1>
        <p className="mt-1 text-sm text-navy-500">{subtitle}</p>
      </div>
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" size={16} aria-hidden />
        <Input className="h-10 pl-9" placeholder="Search tickets or users..." aria-label="Search support records" />
      </div>
    </div>
  )
}

function QueueTable() {
  return (
    <div className="overflow-x-auto rounded-(--radius-lg) border border-border bg-white shadow-1">
      <table className="w-full min-w-[760px] text-left text-sm">
        <caption className="sr-only">Support ticket queue</caption>
        <thead className="bg-navy-50 text-xs font-bold uppercase tracking-wider text-navy-500">
          <tr><th className="px-4 py-3">Ticket</th><th>Issue</th><th>User</th><th>Priority</th><th>SLA</th><th>Action</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tickets.map(([id, issue, user, priority, sla]) => (
            <tr key={id} className="hover:bg-navy-50">
              <td className="px-4 py-4 font-mono text-xs font-bold">{id}</td>
              <td className="font-semibold text-navy-900">{issue}</td>
              <td className="text-navy-600">{user}</td>
              <td><Badge variant={priority === 'urgent' ? 'red' : priority === 'high' ? 'amber' : 'grey'}>{priority}</Badge></td>
              <td className="font-semibold text-navy-700">{sla}</td>
              <td><Button variant="outline" size="sm">Open</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SupportDashboardPage() {
  return (
    <div className="space-y-6">
      <Header title="Dashboard" subtitle="Agent queue, SLA health, and quick user lookup." />
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Open tickets', '38', Ticket],
          ['SLA at risk', '5', AlertTriangle],
          ['Resolved today', '74', CheckCircle],
          ['Avg first reply', '8m', Clock],
        ].map(([label, value, Icon]) => (
          <div key={label as string} className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-1">
            <Icon className="text-primary-600" size={20} aria-hidden />
            <p className="mt-3 text-sm text-navy-500">{label as string}</p>
            <p className="font-display text-3xl font-bold text-navy-900">{value as string}</p>
          </div>
        ))}
      </div>
      <QueueTable />
    </div>
  )
}

export function SupportTicketsPage() {
  return (
    <div className="space-y-6">
      <Header title="Tickets" subtitle="Prioritized service queue with owner and guest context." />
      <QueueTable />
    </div>
  )
}

export function SupportUsersPage() {
  return (
    <div className="space-y-6">
      <Header title="User Lookup" subtitle="Find owners, guests, bookings, payouts, and verification state." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <SectionCard title="User profile">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700">RN</div>
            <div><p className="font-semibold text-navy-900">Ravi Nair</p><p className="text-sm text-navy-500">Owner · The Park Suites</p></div>
          </div>
          <div className="mt-5 space-y-3 text-sm text-navy-600">
            <p><strong className="text-navy-900">Email:</strong> ravi@parksuites.in</p>
            <p><strong className="text-navy-900">Phone:</strong> +91 98XXX 12340</p>
            <p><strong className="text-navy-900">Status:</strong> Approved</p>
          </div>
        </SectionCard>
        <SectionCard title="Recent activity">
          <ol className="space-y-3">
            {['Payout invoice downloaded', 'Updated Deluxe AC inventory', 'Resolved guest refund ticket'].map((item) => (
              <li key={item} className="rounded-[10px] border border-border p-3 text-sm text-navy-700">{item}</li>
            ))}
          </ol>
        </SectionCard>
      </div>
    </div>
  )
}
