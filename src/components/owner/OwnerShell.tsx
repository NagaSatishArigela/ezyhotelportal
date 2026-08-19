import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard, CalendarDays, BookOpen, BarChart2,
  Wallet, Star, Settings, BedDouble, Gavel, Menu, Bell, LogOut, Lock,
} from 'lucide-react'
import { EzyMark, EzyWordmark } from '@/components/brand/EzyLogo'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/store/ui.store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AutoSaveIndicator } from '@/components/shared/AutoSaveIndicator'
import { ownerNotificationsApi } from '@/lib/api/ownerNotifications'

const NAV_ITEMS = [
  { href: '/owner/dashboard', label: 'Dashboard',      icon: LayoutDashboard, needsApproval: true },
  { href: '/owner/bookings',  label: 'Bookings',       icon: BookOpen,        needsApproval: true },
  { href: '/owner/availability', label: 'Availability', icon: CalendarDays,   needsApproval: true },
  { href: '/owner/rooms',     label: 'Rooms & Pricing', icon: BedDouble,      needsApproval: true },
  { href: '/owner/analytics', label: 'Analytics',      icon: BarChart2,       needsApproval: true },
  { href: '/owner/reviews',   label: 'Reviews',        icon: Star,            needsApproval: true },
  { href: '/owner/disputes',  label: 'Disputes',       icon: Gavel,           needsApproval: true },
  { href: '/owner/payouts',   label: 'Payouts',        icon: Wallet,          needsApproval: true },
  { href: '/owner/notifications', label: 'Notifications', icon: Bell,         needsApproval: true },
  { href: '/owner/settings',  label: 'Settings',       icon: Settings,        needsApproval: true },
]

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const { user, isApproved, logout } = useAuth()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggle = useUIStore((s) => s.toggleSidebar)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: countData } = useQuery({
    queryKey: ['owner-notifications-count'],
    queryFn: ownerNotificationsApi.unreadCount,
    refetchInterval: 60_000,
    enabled: isApproved,
  })

  const { data: recentData } = useQuery({
    queryKey: ['owner-notifications-bell'],
    queryFn: () => ownerNotificationsApi.list(1, 10),
    enabled: isApproved,
    refetchInterval: 60_000,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => ownerNotificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-notifications'] })
      qc.invalidateQueries({ queryKey: ['owner-notifications-count'] })
      qc.invalidateQueries({ queryKey: ['owner-notifications-bell'] })
    },
  })

  const unreadCount = countData?.count ?? 0

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen overflow-hidden bg-navy-50">
        {/* Sidebar */}
        <aside className={cn(
          'hidden md:flex flex-col bg-white border-r border-border transition-all duration-200 shrink-0',
          collapsed ? 'w-16' : 'w-[232px]'
        )}>
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 px-4 border-b border-border">
            <EzyMark size={30} className="shrink-0" />
            {!collapsed && (
              <div>
                <EzyWordmark className="font-display font-bold text-[15px] leading-none" />
                <p className="text-[10px] text-navy-400 uppercase tracking-wider mt-0.5">Owner portal</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto thin-scroll py-3 space-y-0.5 px-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon, needsApproval }) => {
              const locked = needsApproval && !isApproved
              const active = pathname === href || pathname.startsWith(href + '/')

              const item = (
                <div>
                  {locked ? (
                    <div className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-not-allowed opacity-50',
                    )}>
                      <Icon size={18} className="shrink-0 text-navy-400" aria-hidden />
                      {!collapsed && <span className="flex-1 text-navy-400">{label}</span>}
                      {!collapsed && <Lock size={12} className="text-navy-300" aria-hidden />}
                    </div>
                  ) : (
                    <Link
                      to={href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary-50 text-primary-600 border-l-[3px] border-primary-600 pl-[9px]'
                          : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900',
                      )}
                    >
                      <Icon size={18} className="shrink-0" aria-hidden />
                      {!collapsed && <span>{label}</span>}
                    </Link>
                  )}
                </div>
              )

              if (collapsed) {
                return (
                  <Tooltip key={href}>
                    <TooltipTrigger asChild>
                      <div>{item}</div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {label}{locked ? ' (Pending approval)' : ''}
                    </TooltipContent>
                  </Tooltip>
                )
              }
              return <div key={href}>{item}</div>
            })}
          </nav>

          {/* Collapse toggle */}
          <div className="border-t border-border p-2">
            <button
              onClick={toggle}
              className="flex w-full items-center justify-center rounded-lg p-2 text-navy-400 hover:bg-navy-50 hover:text-navy-600 transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu size={18} aria-hidden />
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-6">
            <div className="flex items-center gap-3">
              <h1 className="font-display font-semibold text-navy-900 text-base">
                {NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label ?? 'Portal'}
              </h1>
              <AutoSaveIndicator />
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative text-navy-400 hover:text-navy-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded"
                    aria-label={unreadCount > 0 ? `Notifications — ${unreadCount} unread` : 'Notifications'}
                    data-testid="bell-btn"
                  >
                    <Bell size={20} aria-hidden />
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error-500 text-[9px] font-bold text-white"
                        aria-hidden
                        data-testid="bell-badge"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <p className="font-semibold text-navy-900 text-sm">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="text-xs text-navy-500">{unreadCount} unread</span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto" data-testid="bell-dropdown">
                    {!recentData || recentData.items.length === 0 ? (
                      <div className="py-8 text-center text-sm text-navy-400">No notifications yet</div>
                    ) : (
                      recentData.items.map((n) => (
                        <button
                          key={n.id}
                          className={cn(
                            'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-navy-50 border-b border-border last:border-0',
                            !n.isRead && 'bg-primary-50/40',
                          )}
                          onClick={() => {
                            if (!n.isRead) markRead.mutate(n.id)
                            if (n.actionUrl) navigate({ to: n.actionUrl as never })
                          }}
                          data-testid="bell-notification-item"
                        >
                          {!n.isRead && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-hidden />
                          )}
                          {n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />}
                          <div className="min-w-0">
                            <p className={cn('text-sm text-navy-900', !n.isRead && 'font-semibold')}>{n.title}</p>
                            <p className="mt-0.5 truncate text-xs text-navy-500">{n.body}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="border-t border-border px-4 py-2.5">
                    <Link
                      to="/owner/notifications"
                      className="text-xs font-medium text-primary-600 hover:underline"
                    >
                      View all notifications →
                    </Link>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Avatar + menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded-full">
                    <Avatar className="h-9 w-9 cursor-pointer">
                      <AvatarFallback className="bg-primary-100 text-primary-700 font-semibold text-sm">
                        {user?.avatarInitials ?? 'O'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-navy-900">{user?.name}</p>
                    <p className="text-xs text-navy-400 truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { logout(); navigate({ to: '/login' }) }}
                    className="text-error-500 hover:text-error-700"
                  >
                    <LogOut size={14} aria-hidden />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <nav className="md:hidden flex gap-2 overflow-x-auto border-b border-border bg-white px-4 py-2" aria-label="Owner mobile navigation">
            {NAV_ITEMS.map(({ href, label, needsApproval }) => {
              const locked = needsApproval && !isApproved
              const active = pathname === href || pathname.startsWith(href + '/')
              return locked ? (
                <span key={href} className="whitespace-nowrap rounded-[10px] px-3 py-2 text-sm font-semibold text-navy-300">
                  {label}
                </span>
              ) : (
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

          {/* Content */}
          <main className="flex-1 overflow-y-auto thin-scroll p-6">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
