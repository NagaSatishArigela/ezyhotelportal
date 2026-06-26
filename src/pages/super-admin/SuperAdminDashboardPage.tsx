import { useQuery } from '@tanstack/react-query'
import { Building2, Users, IndianRupee, Wallet, Receipt, UserCheck } from 'lucide-react'
import { superAdminApi } from '@/lib/api/superAdminApi'
import { SectionCard } from '@/components/shared/SectionCard'
import { Skeleton } from '@/components/ui/skeleton'

function fmt(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-5 shadow-sm" data-testid="kpi-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-navy-500">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold text-navy-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-navy-400">{sub}</p>}
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-50 text-primary-600">
          <Icon size={18} aria-hidden />
        </span>
      </div>
    </div>
  )
}

export function SuperAdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: superAdminApi.getStats,
    staleTime: 60_000,
  })

  return (
    <div className="space-y-6" data-testid="super-admin-dashboard">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Platform Dashboard</h1>
        <p className="mt-1 text-sm text-navy-500">Live aggregates across all schemas</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : !data ? null : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              label="Total properties"
              value={data.totalProperties.toLocaleString('en-IN')}
              sub={`${data.activeProperties} active`}
              icon={Building2}
            />
            <KpiCard
              label="Active bookings"
              value={data.activeBookings.toLocaleString('en-IN')}
              sub={`${data.bookingsThisMonth.toLocaleString('en-IN')} this month`}
              icon={Users}
            />
            <KpiCard
              label="Revenue MTD"
              value={fmt(data.grossRevenueThisMonthPaise)}
              sub={`${fmt(data.grossRevenuePaise)} all-time`}
              icon={IndianRupee}
            />
            <KpiCard
              label="Payouts released"
              value={fmt(data.totalPayoutsReleasedPaise)}
              sub="all-time net"
              icon={Wallet}
            />
            <KpiCard
              label="TDS collected"
              value={fmt(data.totalTdsPaise)}
              sub="Section 194O"
              icon={Receipt}
            />
            <KpiCard
              label="Active admins"
              value={data.activeAdmins}
              sub={`${data.totalOwners} registered owners`}
              icon={UserCheck}
            />
          </div>

          <SectionCard title="Platform health" subtitle="Snapshot at page load">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              {[
                ['Total bookings', data.totalBookings.toLocaleString('en-IN')],
                ['Total properties', data.totalProperties.toLocaleString('en-IN')],
                ['Total owners', data.totalOwners.toLocaleString('en-IN')],
                ['Active admins', data.activeAdmins],
              ].map(([label, val]) => (
                <div key={String(label)} className="rounded-[10px] bg-navy-50 px-4 py-3">
                  <dt className="text-xs font-medium text-navy-500 uppercase tracking-wide">{label}</dt>
                  <dd className="mt-1 font-bold text-navy-900">{val}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
        </>
      )}
    </div>
  )
}
