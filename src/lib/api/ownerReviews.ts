import { api } from '@/lib/api'

export type ReviewStatus = 'pending' | 'published' | 'flagged' | 'removed'

export interface ReviewListItem {
  id: string
  bookingId: string
  bookingRef: string | null
  guestName: string | null
  scoreOverall: number
  displayScore: string
  scoreCleanliness: number
  scoreAmenities: number
  scoreAccuracy: number
  scoreValue: number
  scoreCheckin: number
  reviewText: string | null
  photoUrls: string[]
  status: ReviewStatus
  ownerReply: string | null
  ownerRepliedAt: string | null
  replyWindowEnd: string | null
  submittedAt: string | null
  publishedAt: string | null
}

export interface OwnerReviewsResult {
  items: ReviewListItem[]
  total: number
  page: number
  limit: number
}

export interface PropertyRatingSummary {
  ratingAvg: number | null
  ratingCount: number
  breakdown: Record<'1' | '2' | '3' | '4' | '5', number>
  dimensions: {
    cleanliness: number
    amenities: number
    accuracy: number
    value: number
    checkin: number
  }
  meetsThreshold: boolean
}

export const ownerReviewsApi = {
  async list(propertyId: string, page: number, limit: number): Promise<OwnerReviewsResult> {
    const res = await api.get<OwnerReviewsResult>(`/owner/properties/${propertyId}/reviews`, {
      params: { page, limit },
    })
    return res.data
  },

  async summary(propertyId: string): Promise<PropertyRatingSummary> {
    const res = await api.get<PropertyRatingSummary>(`/properties/${propertyId}/reviews/summary`)
    return res.data
  },

  async reply(reviewId: string, reply: string): Promise<ReviewListItem> {
    const res = await api.post<ReviewListItem>(`/owner/reviews/${reviewId}/reply`, { reply })
    return res.data
  },

  async flag(reviewId: string, reason?: string): Promise<void> {
    await api.post(`/owner/reviews/${reviewId}/flag`, { reason })
  },
}
