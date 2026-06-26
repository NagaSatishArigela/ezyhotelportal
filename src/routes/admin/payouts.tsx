import { createFileRoute } from '@tanstack/react-router'
import { AdminPayoutsPage } from '@/pages/admin/AdminPortalPages'

export const Route = createFileRoute('/admin/payouts')({
  component: AdminPayoutsPage,
})
