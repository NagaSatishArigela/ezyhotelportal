import { createFileRoute } from '@tanstack/react-router'
import { AdminPayoutsPage } from '@/pages/admin/AdminPortalPages'

export const Route = createFileRoute('/super-admin/payouts')({
  component: AdminPayoutsPage,
})
