import { createFileRoute } from '@tanstack/react-router'
import { requireApproved } from '@/lib/guardHelpers'
import { OwnerDashboardPage } from '@/pages/owner/portal/OwnerDashboardPage'

export const Route = createFileRoute('/owner/_portal/dashboard')({
  beforeLoad: () => requireApproved(),
  component: OwnerDashboardPage,
})
