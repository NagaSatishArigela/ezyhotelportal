import { createFileRoute } from '@tanstack/react-router'
import { requireApproved } from '@/lib/guardHelpers'
import { HotelTeamPage } from '@/pages/owner/HotelTeamPage'
export const Route = createFileRoute('/owner/_portal/team')({
  beforeLoad: () => requireApproved('/owner/team'),
  component: HotelTeamPage,
})
