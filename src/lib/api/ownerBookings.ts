import { api } from '../api'

// Property-scoped booking reads; check-in/out require the server-issued permission.

export type OwnerBookingType = 'hourly' | 'fullday'
export type OwnerBookingStatus =
  'pending_payment' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show' | 'voided'

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
  checkIn: (id: string, qrCode: string) => api.post('/bookings/' + id + '/check-in', { qrCode }),
  checkOut: (id: string) => api.post('/bookings/' + id + '/check-out'),
  list(propertyId: string, page = 1, limit = 20): Promise<OwnerBookingsResult> {
    return api
      .get<OwnerBookingsResult>(`/owner/properties/${propertyId}/bookings`, {
        params: { page, limit },
      })
      .then((r) => r.data)
  },
}
