import { api } from '@/lib/api'

export type PayoutBatchStatus = 'pending' | 'processing' | 'released' | 'partial' | 'failed'
export type PayoutItemStatus = 'pending' | 'on_hold' | 'released' | 'failed'

export interface OwnerPayoutSummary {
  id: string
  batchRef: string
  cycleStartAt: string
  cycleEndAt: string
  batchStatus: PayoutBatchStatus
  status: PayoutItemStatus
  grossAmountPaise: number
  tdsPaise: number
  netAmountPaise: number
  bookingCount: number
  releasedAt: string | null
}

export interface OwnerPayoutDetail extends OwnerPayoutSummary {
  bankRef: string | null
  bookings: {
    bookingId: string
    ownerGrossPaise: number
    tdsPaise: number
  }[]
}

export interface OwnerPayoutsResult {
  items: OwnerPayoutSummary[]
  total: number
  page: number
  limit: number
}

export const ownerPayoutsApi = {
  async list(page = 1, limit = 20): Promise<OwnerPayoutsResult> {
    const res = await api.get<OwnerPayoutsResult>('/owner/payouts', { params: { page, limit } })
    return res.data
  },

  async detail(batchId: string): Promise<OwnerPayoutDetail> {
    const res = await api.get<OwnerPayoutDetail>(`/owner/payouts/${batchId}`)
    return res.data
  },
}
