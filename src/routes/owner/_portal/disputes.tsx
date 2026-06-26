import { createFileRoute } from '@tanstack/react-router'
import { requireApproved } from '@/lib/guardHelpers'
import { OwnerDisputesView } from '@/pages/owner/portal/OwnerDisputesView'

export const Route = createFileRoute('/owner/_portal/disputes')({
  beforeLoad: requireApproved,
  component: OwnerDisputesView,
})
