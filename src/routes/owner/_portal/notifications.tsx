import { createFileRoute } from '@tanstack/react-router'
import { requireApproved } from '@/lib/guardHelpers'
import { OwnerNotificationsPage } from '@/pages/owner/portal/OwnerNotificationsPage'

export const Route = createFileRoute('/owner/_portal/notifications')({
  beforeLoad: requireApproved,
  component: OwnerNotificationsPage,
})
