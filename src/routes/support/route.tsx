import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '@/lib/guardHelpers'
import { SupportShell } from '@/components/support/SupportShell'

export const Route = createFileRoute('/support')({
  beforeLoad: () => requireAuth('support'),
  component: () => (
    <SupportShell>
      <Outlet />
    </SupportShell>
  ),
})
