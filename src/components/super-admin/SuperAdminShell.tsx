import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard, Users, Settings, LogOut, Menu, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/store/ui.store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

const NAV_ITEMS = [
  { href: '/super-admin/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/super-admin/admins',    label: 'Admin Users', icon: Users },
  { href: '/super-admin/settings',  label: 'Settings',    icon: Settings },
]

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggle = useUIStore((s) => s.toggleSidebar)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const initials = (user?.name ?? user?.phone ?? 'SA')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'SA'

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen bg-navy-50 font-body" data-testid="super-admin-shell">
        {/* Sidebar */}
        <aside
          className={cn(
            'flex flex-col border-r border-border bg-white transition-all duration-200',
            collapsed ? 'w-16' : 'w-56',
          )}
        >
          {/* Logo */}
          <div className={cn('flex h-16 items-center border-b border-border px-4', collapsed && 'justify-center px-0')}>
            {collapsed ? (
              <Zap size={22} className="text-primary-600" aria-label="Stayflex Super Admin" />
            ) : (
              <div className="flex items-center gap-2 select-none">
                <Zap size={20} className="text-primary-600" aria-hidden />
                <span className="font-display font-bold text-navy-900 leading-none">
                  Stayflex<br />
                  <span className="text-xs font-semibold text-primary-600 tracking-widest uppercase">
                    Super Admin
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3" aria-label="Super admin navigation">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>
                    <Link
                      to={href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors',
                        collapsed && 'justify-center px-0',
                        active
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900',
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon size={18} className={cn('shrink-0', active && 'text-primary-600')} aria-hidden />
                      {!collapsed && <span>{label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">{label}</TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </nav>

          {/* User row */}
          <div className={cn('border-t border-border p-3', collapsed && 'flex flex-col items-center gap-2 p-2')}>
            {!collapsed && (
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary-100 text-primary-700 text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-navy-900">{user?.name ?? user?.phone}</p>
                  <p className="text-[10px] text-navy-400 uppercase tracking-wide">Super Admin</p>
                </div>
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { logout(); navigate({ to: '/login' }) }}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-navy-500 hover:bg-navy-50 hover:text-error-600 transition-colors',
                    collapsed ? 'w-full justify-center' : 'w-full',
                  )}
                  aria-label="Sign out"
                  data-testid="super-admin-logout-btn"
                >
                  <LogOut size={15} aria-hidden />
                  {!collapsed && <span>Sign out</span>}
                </button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Sign out</TooltipContent>}
            </Tooltip>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-6">
            <button
              onClick={toggle}
              className="rounded-md p-1.5 text-navy-500 hover:bg-navy-50 hover:text-navy-900 transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              data-testid="sidebar-toggle"
            >
              <Menu size={18} aria-hidden />
            </button>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary-100 text-primary-700 text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-navy-700 sm:block">
                {user?.name ?? user?.phone}
              </span>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
