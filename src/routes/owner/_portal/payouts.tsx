import { createFileRoute } from '@tanstack/react-router'
import { requireApproved } from '@/lib/guardHelpers'
import { OwnerPayoutsPage } from '@/pages/owner/portal/OwnerPortalPages'

export const Route = createFileRoute('/owner/_portal/payouts')({
  beforeLoad: requireApproved,
  component: OwnerPayoutsPage,
})
