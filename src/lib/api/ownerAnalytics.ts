import { api } from '../api'

export interface OwnerAnalytics {
  days: number
  totals: { bookings: number; revenuePaise: number; avgBookingValuePaise: number }
  byType: Record<string, number>
  byStatus: Record<string, number>
  revenueByDay: { date: string; revenuePaise: number }[]
}

export const ownerAnalyticsApi = {
  get(propertyId: string, days = 30): Promise<OwnerAnalytics> {
    return api
      .get<OwnerAnalytics>(`/owner/properties/${propertyId}/analytics`, { params: { days } })
      .then((r) => r.data)
  },
}
