import { createFileRoute } from '@tanstack/react-router'
import { SuperAdminDashboardPage } from '@/pages/super-admin/SuperAdminDashboardPage'

export const Route = createFileRoute('/super-admin/dashboard')({
  component: SuperAdminDashboardPage,
})
