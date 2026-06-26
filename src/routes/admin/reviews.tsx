import { createFileRoute } from '@tanstack/react-router'
import { AdminReviewsPage } from '@/pages/admin/AdminPortalPages'

export const Route = createFileRoute('/admin/reviews')({
  component: AdminReviewsPage,
})
