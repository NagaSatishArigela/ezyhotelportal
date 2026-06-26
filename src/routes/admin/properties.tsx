import { createFileRoute } from '@tanstack/react-router'
import { AdminPropertiesPage } from '@/pages/admin/AdminPortalPages'

export const Route = createFileRoute('/admin/properties')({
  component: AdminPropertiesPage,
})
