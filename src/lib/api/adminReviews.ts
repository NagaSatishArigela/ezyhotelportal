import { api } from '@/lib/api'
import type { ReviewListItem, ReviewStatus } from './ownerReviews'

export type { ReviewListItem, ReviewStatus }

export interface AdminReviewsResult {
  items: ReviewListItem[]
  total: number
  page: number
  limit: number
}

export interface AdminReviewsQuery {
  page?: number
  limit?: number
  status?: ReviewStatus
  propertyId?: string
  scoreMin?: number
  scoreMax?: number
}

export const adminReviewsApi = {
  async list(query: AdminReviewsQuery = {}): Promise<AdminReviewsResult> {
    const res = await api.get<AdminReviewsResult>('/admin/reviews', { params: query })
    return res.data
  },

  async listFlagged(page: number, limit: number): Promise<AdminReviewsResult> {
    const res = await api.get<AdminReviewsResult>('/admin/reviews/flagged', { params: { page, limit } })
    return res.data
  },

  async flaggedCount(): Promise<{ count: number }> {
    const res = await api.get<{ count: number }>('/admin/reviews/flagged-count')
    return res.data
  },

  async moderate(reviewId: string, action: 'publish' | 'remove', reason?: string): Promise<ReviewListItem> {
    const res = await api.post<ReviewListItem>(`/admin/reviews/${reviewId}/moderate`, { action, reason })
    return res.data
  },

  async remove(reviewId: string, reason: string): Promise<void> {
    await api.delete(`/admin/reviews/${reviewId}`, { data: { reason } })
  },
}
