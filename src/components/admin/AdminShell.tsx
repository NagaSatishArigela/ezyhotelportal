import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  ClipboardCheck, Building2, BookOpen, Wallet,
  AlertTriangle, Star, Users, BarChart2, LogOut, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ReviewFlaggedBadge } from '@/pages/admin/AdminReviewsView'

const NAV_ITEMS = [
  { href: '/admin/verification', label: 'Verification Queue', icon: ClipboardCheck, badge: 12 },
  { href: '/admin/properties',   label: 'Properties',         icon: Building2 },
  { href: '/admin/bookings',     label: 'Bookings',           icon: BookOpen },
  { href: '/admin/payouts',      label: 'Payouts',            icon: Wallet,         badge: 3 },
  { href: '/admin/disputes',     label: 'Disputes',           icon: AlertTriangle,  badge: 5 },
  { href: '/admin/reviews',      label: 'Review Moderation',  icon: Star },
  { href: '/admin/users',        label: 'Users',              icon: Users },
  { href: '/admin/analytics',    label: 'Analytics',          icon: BarChart2 },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="flex h-screen overflow-hidden bg-navy-50">
      <aside className="hidden w-[232px] shrink-0 flex-col bg-white border-r border-border md:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 px-5 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <Zap size={16} className="text-white" strokeWidth={2.4} aria-hidden />
          </div>
          <div>
            <p className="font-display font-bold text-navy-900 text-[15px] leading-none">stayflex</p>
            <p className="text-[10px] text-navy-400 uppercase tracking-wider mt-0.5">Admin Console</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto thin-scroll py-3 space-y-0.5 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-50 text-primary-600 border-l-[3px] border-primary-600 pl-[9px]'
                    : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900',
                )}
              >
                <Icon size={16} className="shrink-0" aria-hidden />
                <span className="flex-1">{label}</span>
                {href === '/admin/reviews' ? (
                  <ReviewFlaggedBadge />
                ) : badge !== undefined ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        {/* User panel */}
        <div className="border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-lg p-2 hover:bg-navy-50 transition-colors">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs font-semibold bg-primary-100 text-primary-700">
                    {user?.avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-semibold text-navy-900 truncate">{user?.name}</p>
                  <p className="text-[10px] text-navy-400 truncate">Admin</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => { logout(); navigate({ to: '/login' }) }}
                className="text-error-500"
              >
                <LogOut size={14} aria-hidden /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-white border-border">
          <div>
            <h1 className="font-display font-semibold text-navy-900 text-base">
              {NAV_ITEMS.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))?.label ?? 'Admin'}
            </h1>
            <p className="text-xs text-navy-400">Stayflex Operations Console</p>
          </div>
        </header>
        <nav className="md:hidden flex gap-2 overflow-x-auto border-b border-border bg-white px-4 py-2" aria-label="Admin mobile navigation">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  'whitespace-nowrap rounded-[10px] px-3 py-2 text-sm font-semibold',
                  active ? 'bg-primary-50 text-primary-700' : 'text-navy-600 hover:bg-navy-50'
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        <main className="flex-1 overflow-y-auto thin-scroll p-6 bg-navy-50">
          {children}
        </main>
      </div>
    </div>
  )
}
