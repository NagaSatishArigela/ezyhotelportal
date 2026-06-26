import { api } from '@/lib/api'
import type { DisputeCategory, DisputeStatus } from './adminDisputes'

export interface OwnerDisputeListItem {
  id: string
  disputeRef: string
  bookingRef: string | null
  category: DisputeCategory
  filedAt: string
  status: DisputeStatus
}

export interface OwnerDisputeListResult {
  items: OwnerDisputeListItem[]
  total: number
  page: number
  limit: number
}

export interface SubmitHotelResponseBody {
  response: string
  evidence?: string[]
}

export const ownerDisputesApi = {
  async list(propertyId: string, page: number, limit: number): Promise<OwnerDisputeListResult> {
    const res = await api.get<OwnerDisputeListResult>(`/owner/properties/${propertyId}/disputes`, {
      params: { page, limit },
    })
    return res.data
  },

  async submitHotelResponse(disputeId: string, body: SubmitHotelResponseBody): Promise<void> {
    await api.post(`/disputes/${disputeId}/hotel-response`, body)
  },
}
