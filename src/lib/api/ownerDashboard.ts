import { api } from '../api'
import type { OwnerBookingItem } from './ownerBookings'

export interface OwnerDashboard {
  total: number
  today: number
  upcoming: number
  completed: number
  revenuePaise: number
  recent: OwnerBookingItem[]
}

export const ownerDashboardApi = {
  get(propertyId: string): Promise<OwnerDashboard> {
    return api.get<OwnerDashboard>(`/owner/properties/${propertyId}/dashboard`).then((r) => r.data)
  },
}
