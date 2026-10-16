import { createFileRoute } from '@tanstack/react-router'
import { requireApproved } from '@/lib/guardHelpers'
import { OwnerAvailabilityPage } from '@/pages/owner/portal/OwnerPortalPages'

export const Route = createFileRoute('/owner/_portal/availability')({
  beforeLoad: () => requireApproved('/owner/availability'),
  component: OwnerAvailabilityPage,
})
