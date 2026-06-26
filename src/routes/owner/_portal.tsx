import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '@/lib/guardHelpers'
import { OwnerShell } from '@/components/owner/OwnerShell'

export const Route = createFileRoute('/owner/_portal')({
  beforeLoad: () => requireAuth('owner'),
  component: () => (
    <OwnerShell>
      <Outlet />
    </OwnerShell>
  ),
})
