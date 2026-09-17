import { createFileRoute } from '@tanstack/react-router'
import { requireApproved } from '@/lib/guardHelpers'
import { OwnerAnalyticsPage } from '@/pages/owner/portal/OwnerPortalPages'

export const Route = createFileRoute('/owner/_portal/analytics')({
  beforeLoad: () => requireApproved('/owner/analytics'),
  component: OwnerAnalyticsPage,
})
