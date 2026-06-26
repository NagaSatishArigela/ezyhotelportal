import { z } from 'zod'
import { api } from '@/lib/api'

export type BookingType = 'hourly' | 'fullday'

export const BOOKING_STATUS_VALUES = [
  'pending_payment',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
  'voided',
] as const

export type BookingStatus = (typeof BOOKING_STATUS_VALUES)[number]

export const adminBookingsSearchSchema = z.object({
  tab: z.enum(['list', 'active', 'anomalies', 'disputes']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  city: z.string().optional(),
  bookingType: z.enum(['hourly', 'fullday']).optional(),
  status: z.array(z.enum(BOOKING_STATUS_VALUES)).optional(),
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
  guestPhone: z.string().optional(),
  bookingRef: z.string().optional(),
  page: z.number().optional(),
  sort: z.enum(['createdAt', 'checkInAt', 'checkOutAt', 'totalAmountPaise']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

export type AdminBookingsSearch = z.infer<typeof adminBookingsSearchSchema>
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded'
export type BookingAdminActionType =
  | 'void'
  | 'cancel'
  | 'refund_full'
  | 'refund_partial'
  | 'force_checkout'
  | 'extend'
  | 'flag'
  | 'unflag'

export interface AdminBookingListItem {
  id: string
  bookingRef: string
  propertyId: string
  propertyName: string | null
  city: string | null
  roomTypeId: string
  ownerId: string
  guestId: string
  guestPhone: string | null
  bookingType: BookingType
  checkInAt: string
  checkOutAt: string
  durationHours: number
  guestCount: number
  totalAmountPaise: number
  status: BookingStatus
  paymentStatus: PaymentStatus
  refundAmountPaise: number | null
  isFlagged: boolean
  createdAt: string
}

export interface AdminActiveBookingItem extends AdminBookingListItem {
  timeRemainingSeconds: number
  isOverdue: boolean
}

export interface AdminBookingListResult {
  items: AdminBookingListItem[]
  total: number
  page: number
  limit: number
}

export interface AdminBookingKpis {
  totalBookings: number
  totalGbvPaise: number
  cancellationRate: number
  avgBookingValuePaise: number
  noShowRate: number
}

export interface TimelineEntry {
  at: string
  label: string
  detail?: string
}

export interface AdminBooking {
  id: string
  bookingRef: string
  propertyId: string
  roomTypeId: string
  ownerId: string
  guestId: string
  bookingType: BookingType
  checkInAt: string
  checkOutAt: string
  durationHours: number
  guestCount: number
  baseAmountPaise: number
  gstAmountPaise: number
  platformFeePaise: number
  totalAmountPaise: number
  status: BookingStatus
  paymentStatus: PaymentStatus
  paymentRef: string | null
  qrCode: string | null
  checkedInAt: string | null
  checkedOutAt: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  cancelReason: string | null
  refundAmountPaise: number | null
  noShowAt: string | null
  voidedAt: string | null
  voidedBy: string | null
  voidReason: string | null
  extensionAmountPaise: number | null
  isFlagged: boolean
  flagType: string | null
  flagNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminBookingAdminAction {
  id: string
  bookingId: string
  adminId: string
  action: BookingAdminActionType
  reasonCategory: string | null
  reasonText: string | null
  metadata: unknown
  createdAt: string
}

export interface AdminBookingDetail {
  booking: AdminBooking
  property: { id: string; name: string; city: string; area: string | null }
  guest: { id: string; phone: string; email: string }
  timeline: TimelineEntry[]
  adminActions: AdminBookingAdminAction[]
}

export interface AdminBookingFilterParams {
  dateFrom?: string
  dateTo?: string
  city?: string
  propertyId?: string
  bookingType?: BookingType
  status?: BookingStatus[]
  amountMin?: number
  amountMax?: number
  guestPhone?: string
  bookingRef?: string
}

export interface AdminBookingListParams extends AdminBookingFilterParams {
  page?: number
  limit?: number
  sort?: 'createdAt' | 'checkInAt' | 'checkOutAt' | 'totalAmountPaise'
  order?: 'asc' | 'desc'
}

function toQueryParams(params: AdminBookingFilterParams): Record<string, string | number> {
  const query: Record<string, string | number> = {}
  if (params.dateFrom) query.dateFrom = params.dateFrom
  if (params.dateTo) query.dateTo = params.dateTo
  if (params.city) query.city = params.city
  if (params.propertyId) query.propertyId = params.propertyId
  if (params.bookingType) query.bookingType = params.bookingType
  if (params.status && params.status.length > 0) query.status = params.status.join(',')
  if (params.amountMin != null) query.amountMin = params.amountMin
  if (params.amountMax != null) query.amountMax = params.amountMax
  if (params.guestPhone) query.guestPhone = params.guestPhone
  if (params.bookingRef) query.bookingRef = params.bookingRef
  return query
}

export const adminBookingsApi = {
  async list(params: AdminBookingListParams): Promise<AdminBookingListResult> {
    const res = await api.get<AdminBookingListResult>('/admin/bookings', {
      params: {
        ...toQueryParams(params),
        page: params.page,
        limit: params.limit,
        sort: params.sort,
        order: params.order,
      },
    })
    return res.data
  },

  async kpis(params: AdminBookingFilterParams): Promise<AdminBookingKpis> {
    const res = await api.get<AdminBookingKpis>('/admin/bookings/kpis', { params: toQueryParams(params) })
    return res.data
  },

  async active(): Promise<AdminActiveBookingItem[]> {
    const res = await api.get<AdminActiveBookingItem[]>('/admin/bookings/active')
    return res.data
  },

  async getDetail(id: string): Promise<AdminBookingDetail> {
    const res = await api.get<AdminBookingDetail>(`/admin/bookings/${id}`)
    return res.data
  },

  async void(id: string, body: { reasonCategory: string; reasonText?: string }): Promise<AdminBooking> {
    const res = await api.post<AdminBooking>(`/admin/bookings/${id}/void`, body)
    return res.data
  },

  async cancel(id: string, body: { reasonCategory: string; reasonText?: string }): Promise<AdminBooking> {
    const res = await api.post<AdminBooking>(`/admin/bookings/${id}/cancel`, body)
    return res.data
  },

  async refund(id: string, body: { amountPaise: number; reasonCategory: string; reasonText?: string }): Promise<AdminBooking> {
    const res = await api.post<AdminBooking>(`/admin/bookings/${id}/refund`, body)
    return res.data
  },

  async forceCheckout(id: string, body: { reasonText: string }): Promise<AdminBooking> {
    const res = await api.post<AdminBooking>(`/admin/bookings/${id}/force-checkout`, body)
    return res.data
  },

  async extend(id: string, body: { newCheckOutAt: string; extensionAmountPaise: number }): Promise<AdminBooking> {
    const res = await api.post<AdminBooking>(`/admin/bookings/${id}/extend`, body)
    return res.data
  },

  async flag(id: string, body: { flagType: string; flagNotes?: string }): Promise<AdminBooking> {
    const res = await api.post<AdminBooking>(`/admin/bookings/${id}/flag`, body)
    return res.data
  },

  async unflag(id: string): Promise<AdminBooking> {
    const res = await api.post<AdminBooking>(`/admin/bookings/${id}/unflag`)
    return res.data
  },
}
