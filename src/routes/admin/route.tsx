import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '@/lib/guardHelpers'
import { AdminShell } from '@/components/admin/AdminShell'

export const Route = createFileRoute('/admin')({
  beforeLoad: () => requireAuth('admin'),
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
})
