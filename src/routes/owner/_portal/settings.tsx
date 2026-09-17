import { createFileRoute } from '@tanstack/react-router'
import { requireApproved } from '@/lib/guardHelpers'
import { OwnerSettingsPage } from '@/pages/owner/portal/OwnerPortalPages'

export const Route = createFileRoute('/owner/_portal/settings')({
  beforeLoad: () => requireApproved('/owner/settings'),
  component: OwnerSettingsPage,
})
