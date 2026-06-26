import { api } from '@/lib/api'

export type DisputeCategory = 'room_quality' | 'cleanliness' | 'amenities' | 'staff' | 'safety' | 'charges' | 'other'

export type DisputeRequestedResolution = 'full_refund' | 'partial_refund' | 'credit' | 'apology'

export type DisputeStatus =
  | 'filed'
  | 'under_review'
  | 'awaiting_hotel_response'
  | 'resolved_guest'
  | 'resolved_hotel'
  | 'resolved_partial'
  | 'resolved_wallet_credit'
  | 'escalated'
  | 'closed_no_response'

export type DisputeResolutionType = 'full_refund' | 'partial_refund' | 'wallet_credit' | 'no_action' | 'escalated'

export const DISPUTE_STATUS_VALUES: DisputeStatus[] = [
  'filed',
  'under_review',
  'awaiting_hotel_response',
  'resolved_guest',
  'resolved_hotel',
  'resolved_partial',
  'resolved_wallet_credit',
  'escalated',
  'closed_no_response',
]

export const DISPUTE_CATEGORY_VALUES: DisputeCategory[] = [
  'room_quality',
  'cleanliness',
  'amenities',
  'staff',
  'safety',
  'charges',
  'other',
]

export interface AdminDisputeListItem {
  id: string
  disputeRef: string
  bookingRef: string | null
  guestPhone: string | null
  propertyName: string | null
  category: DisputeCategory
  filedAt: string
  resolutionDeadline: string
  status: DisputeStatus
  hoursUntilDeadline: number
}

export interface AdminDisputeListResult {
  items: AdminDisputeListItem[]
  total: number
  page: number
  limit: number
}

export interface Dispute {
  id: string
  disputeRef: string
  bookingId: string
  guestId: string
  propertyId: string
  category: DisputeCategory
  description: string
  guestEvidence: string[] | null
  requestedResolution: DisputeRequestedResolution
  status: DisputeStatus
  hotelResponse: string | null
  hotelEvidence: string[] | null
  hotelResponseDeadline: string | null
  resolutionType: DisputeResolutionType | null
  refundAmountPaise: number | null
  adminNotes: string | null
  resolvedBy: string | null
  filedAt: string
  resolutionDeadline: string
  resolvedAt: string | null
}

export interface AdminDisputeDetail {
  dispute: Dispute
  booking: {
    bookingRef: string
    checkInAt: string
    checkOutAt: string
    totalAmountPaise: number
    status: string
  } | null
  guest: { phone: string | null; totalBookings: number; pastDisputeCount: number; hasReview: boolean }
  property: { name: string | null; city: string | null; pastDisputeCount: number }
}

export interface AdminDisputeListParams {
  status?: DisputeStatus[]
  category?: DisputeCategory[]
  dateFrom?: string
  dateTo?: string
  propertyId?: string
  page?: number
  limit?: number
  order?: 'asc' | 'desc'
}

export interface ResolveDisputeBody {
  resolutionType: DisputeResolutionType
  refundAmountPaise?: number
  walletCreditAmountPaise?: number
  adminNotes: string
}

function toQueryParams(params: AdminDisputeListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {}
  if (params.status && params.status.length > 0) query.status = params.status.join(',')
  if (params.category && params.category.length > 0) query.category = params.category.join(',')
  if (params.dateFrom) query.dateFrom = params.dateFrom
  if (params.dateTo) query.dateTo = params.dateTo
  if (params.propertyId) query.propertyId = params.propertyId
  if (params.page != null) query.page = params.page
  if (params.limit != null) query.limit = params.limit
  if (params.order) query.order = params.order
  return query
}

export const adminDisputesApi = {
  async list(params: AdminDisputeListParams): Promise<AdminDisputeListResult> {
    const res = await api.get<AdminDisputeListResult>('/admin/disputes', { params: toQueryParams(params) })
    return res.data
  },

  async unresolvedCount(): Promise<{ count: number }> {
    const res = await api.get<{ count: number }>('/admin/disputes/unresolved-count')
    return res.data
  },

  async getDetail(id: string): Promise<AdminDisputeDetail> {
    const res = await api.get<AdminDisputeDetail>(`/admin/disputes/${id}`)
    return res.data
  },

  async requestResponse(id: string): Promise<Dispute> {
    const res = await api.post<Dispute>(`/admin/disputes/${id}/request-response`)
    return res.data
  },

  async resolve(id: string, body: ResolveDisputeBody): Promise<Dispute> {
    const res = await api.patch<Dispute>(`/admin/disputes/${id}/resolve`, body)
    return res.data
  },
}
