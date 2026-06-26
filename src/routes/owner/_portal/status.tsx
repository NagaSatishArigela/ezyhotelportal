import { createFileRoute } from '@tanstack/react-router'
import { OwnerStatusPage } from '@/pages/owner/OwnerStatusPage'

export const Route = createFileRoute('/owner/_portal/status')({
  component: OwnerStatusPage,
})
