import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard, Ticket, Users, LogOut } from 'lucide-react'
import { EzyMark, EzyWordmark } from '@/components/brand/EzyLogo'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const NAV_ITEMS = [
  { href: '/support/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/support/tickets',   label: 'Tickets',   icon: Ticket },
  { href: '/support/users',     label: 'User Lookup', icon: Users },
]

export function SupportShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="flex h-screen overflow-hidden bg-navy-50">
      <aside className="hidden w-[220px] shrink-0 flex-col bg-white border-r border-border md:flex">
        <div className="flex h-16 items-center gap-2 px-5 border-b border-border">
          <EzyMark size={28} className="shrink-0" />
          <div>
            <EzyWordmark className="font-display font-bold text-sm" />
            <p className="text-[10px] text-navy-400">Support</p>
          </div>
        </div>

        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link key={href} to={href} className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-primary-50 text-primary-600 border-l-[3px] border-primary-600 pl-[9px]'
                       : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900',
              )}>
                <Icon size={18} aria-hidden />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-lg p-2 hover:bg-navy-50">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs font-semibold bg-navy-100 text-navy-600">
                    {user?.avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-semibold text-navy-900 truncate">{user?.name}</p>
                  <p className="text-[10px] text-navy-400">Support Agent</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => { logout(); navigate({ to: '/login' }) }}
                className="text-error-500"
              >
                <LogOut size={14} /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center px-6 border-b border-border bg-white">
          <h1 className="font-display font-semibold text-navy-900">
            {NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label ?? 'Support'}
          </h1>
        </header>
        <nav className="md:hidden flex gap-2 overflow-x-auto border-b border-border bg-white px-4 py-2" aria-label="Support mobile navigation">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname.startsWith(href)
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
        <main className="flex-1 overflow-y-auto thin-scroll p-6">{children}</main>
      </div>
    </div>
  )
}
