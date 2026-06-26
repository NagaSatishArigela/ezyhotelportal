import { createFileRoute } from '@tanstack/react-router'
import { SupportUsersPage } from '@/pages/support/SupportPortalPages'

export const Route = createFileRoute('/support/users')({
  component: SupportUsersPage,
})
