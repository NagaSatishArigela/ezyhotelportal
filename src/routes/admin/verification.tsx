import { createFileRoute } from '@tanstack/react-router'
import { AdminVerificationPage } from '@/pages/admin/AdminVerificationPage'

export const Route = createFileRoute('/admin/verification')({
  component: AdminVerificationPage,
})
