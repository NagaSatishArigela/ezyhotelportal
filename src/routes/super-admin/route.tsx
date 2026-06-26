import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireSuperAdmin } from '@/lib/guardHelpers'
import { SuperAdminShell } from '@/components/super-admin/SuperAdminShell'

export const Route = createFileRoute('/super-admin')({
  beforeLoad: requireSuperAdmin,
  component: () => (
    <SuperAdminShell>
      <Outlet />
    </SuperAdminShell>
  ),
})
