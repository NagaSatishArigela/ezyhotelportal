import { createFileRoute } from '@tanstack/react-router'
import { AdminAnalyticsPage } from '@/pages/admin/AdminPortalPages'

export const Route = createFileRoute('/admin/analytics')({
  component: AdminAnalyticsPage,
})
