import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Ticket, CheckCircle, AlertTriangle, ArrowUpCircle } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { SectionCard } from '@/components/shared/SectionCard'
import { supportApi, type SupportTicket, type SupportTicketStatus } from '@/lib/api/support'

const PRIORITY_VARIANT: Record<string, BadgeProps['variant']> = { high: 'red', medium: 'amber', low: 'grey' }
const STATUS_VARIANT: Record<SupportTicketStatus, BadgeProps['variant']> = {
  open: 'amber', in_progress: 'teal', resolved: 'green', escalated: 'red',
}
const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: 'Open', in_progress: 'In progress', resolved: 'Resolved', escalated: 'Escalated',
}
const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Support portal</p>
      <h1 className="font-display text-2xl font-bold text-navy-900">{title}</h1>
      <p className="mt-1 text-sm text-navy-500">{subtitle}</p>
    </div>
  )
}

function TicketDetailDialog({ ticket, onClose }: { ticket: SupportTicket | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  useEffect(() => { setNote('') }, [ticket?.id])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['support-queue'] })
  const resolve = useMutation({
    mutationFn: () => supportApi.resolve(ticket!.id, note),
    onSuccess: () => { toast.success('Ticket resolved'); invalidate(); onClose() },
    onError: () => toast.error('Could not resolve. Add a resolution note and retry.'),
  })
  const escalate = useMutation({
    mutationFn: () => supportApi.escalate(ticket!.id),
    onSuccess: () => { toast.success('Ticket escalated to admin'); invalidate(); onClose() },
    onError: () => toast.error('Could not escalate.'),
  })
  const busy = resolve.isPending || escalate.isPending

  return (
    <Dialog open={!!ticket} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{ticket?.subject}</DialogTitle>
          <DialogDescription>{ticket?.category ?? 'General'} · {ticket && STATUS_LABEL[ticket.status]}</DialogDescription>
        </DialogHeader>
        {ticket && (
          <div className="space-y-4 mt-2">
            <p className="rounded-[10px] bg-navy-50 p-3 text-sm text-navy-700">{ticket.description}</p>
            <div className="grid grid-cols-2 gap-3 text-xs text-navy-500">
              <p><strong className="text-navy-700">Raised:</strong> {fmt(ticket.createdAt)}</p>
              <p><strong className="text-navy-700">Priority:</strong> {ticket.priority}</p>
            </div>
            {ticket.resolutionNote && (
              <p className="rounded-[10px] border border-success-200 bg-success-50 p-3 text-sm text-navy-700">
                <strong>Resolution:</strong> {ticket.resolutionNote}
              </p>
            )}
            {ticket.status !== 'resolved' && (
              <>
                <label className="block text-sm font-semibold text-navy-700">Resolution note
                  <Textarea className="mt-2" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you do to resolve this?" />
                </label>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => escalate.mutate()} disabled={busy}>
                    <ArrowUpCircle size={14} className="mr-1" /> Escalate
                  </Button>
                  <Button size="sm" onClick={() => resolve.mutate()} disabled={busy || note.trim().length < 3}>
                    Resolve
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function QueueTable() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['support-queue', 'all'],
    queryFn: () => supportApi.queue({ limit: 100 }),
  })
  const [selected, setSelected] = useState<SupportTicket | null>(null)

  if (isLoading) return <div className="h-40 animate-pulse rounded-(--radius-lg) bg-navy-50" />
  if (isError) return <div className="text-sm text-error-600">Could not load the ticket queue.</div>
  const items = data?.items ?? []

  return (
    <>
      <div className="overflow-x-auto rounded-(--radius-lg) border border-border bg-white shadow-1">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">Support ticket queue</caption>
          <thead className="bg-navy-50 text-xs font-bold uppercase tracking-wider text-navy-500">
            <tr>{['Subject', 'Category', 'Priority', 'Status', 'Raised', ''].map((h) => <th key={h || 'a'} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((t) => (
              <tr key={t.id} className="hover:bg-navy-50 cursor-pointer" onClick={() => setSelected(t)}>
                <td className="px-4 py-4 font-semibold text-navy-900">{t.subject}</td>
                <td className="px-4 py-4 text-navy-600">{t.category ?? '—'}</td>
                <td className="px-4 py-4"><Badge variant={PRIORITY_VARIANT[t.priority] ?? 'grey'}>{t.priority}</Badge></td>
                <td className="px-4 py-4"><Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABEL[t.status]}</Badge></td>
                <td className="px-4 py-4 text-navy-500">{fmt(t.createdAt)}</td>
                <td className="px-4 py-4 text-right"><Button variant="outline" size="sm">Open</Button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-navy-400">No tickets in the queue.</td></tr>}
          </tbody>
        </table>
      </div>
      <TicketDetailDialog ticket={selected} onClose={() => setSelected(null)} />
    </>
  )
}

export function SupportDashboardPage() {
  const { data } = useQuery({ queryKey: ['support-queue', 'all'], queryFn: () => supportApi.queue({ limit: 100 }) })
  const items = data?.items ?? []
  const count = (s: SupportTicketStatus) => items.filter((t) => t.status === s).length
  const cards: [string, number, typeof Ticket][] = [
    ['Open', count('open'), Ticket],
    ['Escalated', count('escalated'), AlertTriangle],
    ['Resolved', count('resolved'), CheckCircle],
    ['Total', items.length, Ticket],
  ]
  return (
    <div className="space-y-6">
      <Header title="Dashboard" subtitle="Live agent queue and ticket health." />
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <div key={label} className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-1">
            <Icon className="text-primary-600" size={20} aria-hidden />
            <p className="mt-3 text-sm text-navy-500">{label}</p>
            <p className="font-display text-3xl font-bold text-navy-900">{value}</p>
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
      <Header title="Tickets" subtitle="Resolve or escalate open support tickets." />
      <QueueTable />
    </div>
  )
}

export function SupportUsersPage() {
  const [q, setQ] = useState('')
  const [submitted, setSubmitted] = useState('')
  const { data, isLoading, isError } = useQuery({
    queryKey: ['support-user-lookup', submitted],
    queryFn: () => supportApi.lookupUsers(submitted),
    enabled: submitted.trim().length >= 2,
  })

  return (
    <div className="space-y-6">
      <Header title="User lookup" subtitle="Find an owner or guest by email, phone, or name." />
      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); setSubmitted(q.trim()) }}
      >
        <div className="relative w-full sm:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" size={16} aria-hidden />
          <Input className="h-10 pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email, phone, or name (min 2 chars)" aria-label="Search users" />
        </div>
        <Button type="submit" disabled={q.trim().length < 2}>Search</Button>
      </form>

      {submitted.trim().length < 2 ? (
        <p className="text-sm text-navy-400">Enter at least 2 characters to search.</p>
      ) : isLoading ? (
        <div className="h-32 animate-pulse rounded-(--radius-lg) bg-navy-50" />
      ) : isError ? (
        <div className="text-sm text-error-600">Lookup failed.</div>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-navy-400">No users match “{submitted}”.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(data ?? []).map((u) => (
            <SectionCard key={u.id} title={u.name ?? u.email}>
              <div className="space-y-2 text-sm text-navy-600">
                <p><strong className="text-navy-900">Email:</strong> {u.email}</p>
                <p><strong className="text-navy-900">Phone:</strong> {u.phone}</p>
                <p><strong className="text-navy-900">Role:</strong> {u.globalRole}</p>
                <p><strong className="text-navy-900">Status:</strong> {u.status}</p>
                <p><strong className="text-navy-900">Joined:</strong> {fmt(u.createdAt)}</p>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  )
}
