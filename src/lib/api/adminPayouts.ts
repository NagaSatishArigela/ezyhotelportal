import { api } from '@/lib/api'
import type { PayoutBatchStatus, PayoutItemStatus } from './ownerPayouts'

export type { PayoutBatchStatus, PayoutItemStatus }

export interface AdminPayoutItem {
  id: string
  propertyId: string
  ownerId: string
  status: PayoutItemStatus
  bookingCount: number
  grossAmountPaise: number
  tdsPaise: number
  netAmountPaise: number
  holdReason: string | null
  bankRef: string | null
  releasedAt: string | null
}

export interface AdminPayoutBatch {
  id: string
  batchRef: string
  cycleStartAt: string
  cycleEndAt: string
  status: PayoutBatchStatus
  totalGrossPaise: number
  totalTdsPaise: number
  totalNetPaise: number
  itemCount: number
  createdAt: string
  items?: AdminPayoutItem[]
}

export interface AdminPayoutsResult {
  items: AdminPayoutBatch[]
  total: number
  page: number
  limit: number
}

export interface AdminPayoutsSummary {
  pendingBatches: number
  onHoldItems: number
  releasedMtdPaise: number
  tdsMtdPaise: number
}

export const adminPayoutsApi = {
  async summary(): Promise<AdminPayoutsSummary> {
    const res = await api.get<AdminPayoutsSummary>('/admin/payouts/summary')
    return res.data
  },

  async list(status?: PayoutBatchStatus, page = 1, limit = 20): Promise<AdminPayoutsResult> {
    const res = await api.get<AdminPayoutsResult>('/admin/payouts', { params: { status, page, limit } })
    return res.data
  },

  async detail(batchId: string): Promise<AdminPayoutBatch> {
    const res = await api.get<AdminPayoutBatch>(`/admin/payouts/${batchId}`)
    return res.data
  },

  async generate(cycleStartAt: string, cycleEndAt: string): Promise<{ batchId: string; batchRef: string; itemCount: number; totalNetPaise: number }> {
    const res = await api.post('/admin/payouts/generate', { cycleStartAt, cycleEndAt })
    return res.data
  },

  async releaseBatch(batchId: string): Promise<{ released: number; skipped: number }> {
    const res = await api.post(`/admin/payouts/${batchId}/release`)
    return res.data
  },

  async holdItem(itemId: string, reason: string): Promise<AdminPayoutItem> {
    const res = await api.post<AdminPayoutItem>(`/admin/payouts/items/${itemId}/hold`, { reason })
    return res.data
  },

  async releaseItem(itemId: string): Promise<AdminPayoutItem> {
    const res = await api.post<AdminPayoutItem>(`/admin/payouts/items/${itemId}/release`)
    return res.data
  },
}
