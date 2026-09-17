import { createFileRoute } from '@tanstack/react-router'
import { HotelAccessPage } from '@/pages/owner/HotelAccessPage'
export const Route = createFileRoute('/owner/_portal/access')({ component: HotelAccessPage })
