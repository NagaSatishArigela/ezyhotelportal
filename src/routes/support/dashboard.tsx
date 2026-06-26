import { createFileRoute } from '@tanstack/react-router'
import { SupportDashboardPage } from '@/pages/support/SupportDashboardPage'

export const Route = createFileRoute('/support/dashboard')({
  component: SupportDashboardPage,
})
