import { createFileRoute } from '@tanstack/react-router'
import { SupportTicketsPage } from '@/pages/support/SupportPortalPages'

export const Route = createFileRoute('/super-admin/tickets')({
  component: SupportTicketsPage,
})
