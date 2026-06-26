import { createFileRoute } from '@tanstack/react-router'
import { SuperAdminSettingsPage } from '@/pages/super-admin/SuperAdminSettingsPage'

export const Route = createFileRoute('/super-admin/settings')({
  component: SuperAdminSettingsPage,
})
