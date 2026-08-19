import { api } from '../api'

// Read-only owner view of a property's bookings.
// Backend: GET /owner/properties/:propertyId/bookings (owner-scoped, paginated).
// NOTE: this endpoint is READ-ONLY — there is no owner endpoint to create a
// booking or to check-in/out/cancel, so the owner Bookings screen must not
// offer those actions.

export type OwnerBookingType = 'hourly' | 'fullday'
export type OwnerBookingStatus =
  | 'pending_payment' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show' | 'voided'

export interface OwnerBookingItem {
  id: string
  bookingRef: string
  roomTypeId: string
  bookingType: OwnerBookingType
  checkInAt: string
  checkOutAt: string
  durationHours: number
  guestCount: number
  guestName: string | null
  guestPhone: string | null
  totalAmountPaise: number
  status: OwnerBookingStatus
  createdAt: string
}

export interface OwnerBookingsResult {
  items: OwnerBookingItem[]
  total: number
  page: number
  limit: number
}

export const ownerBookingsApi = {
  list(propertyId: string, page = 1, limit = 20): Promise<OwnerBookingsResult> {
    return api
      .get<OwnerBookingsResult>(`/owner/properties/${propertyId}/bookings`, { params: { page, limit } })
      .then((r) => r.data)
  },
}
