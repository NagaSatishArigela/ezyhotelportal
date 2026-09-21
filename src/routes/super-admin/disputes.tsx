import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/super-admin/disputes')({
  beforeLoad: () => {
    throw redirect({ to: '/super-admin/bookings', search: { tab: 'disputes' } })
  },
  component: () => null,
})
