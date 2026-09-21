import { createFileRoute } from '@tanstack/react-router'
import { AdminBookingsPage } from '@/pages/admin/AdminBookingsPage'
import { adminBookingsSearchSchema } from '@/lib/api/adminBookings'

export const Route = createFileRoute('/super-admin/bookings')({
  validateSearch: adminBookingsSearchSchema,
  component: AdminBookingsPage,
})
