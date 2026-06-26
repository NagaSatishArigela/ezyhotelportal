import { createFileRoute } from '@tanstack/react-router'
import { requireApproved } from '@/lib/guardHelpers'
import { OwnerRoomsPage } from '@/pages/owner/portal/OwnerPortalPages'

export const Route = createFileRoute('/owner/_portal/rooms')({
  beforeLoad: requireApproved,
  component: OwnerRoomsPage,
})
