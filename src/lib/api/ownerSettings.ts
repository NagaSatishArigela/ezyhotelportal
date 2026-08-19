import { api } from '../api'

export interface OwnerSettings {
  defaultCheckinTime: string | null
  defaultCheckoutTime: string | null
  minBookingHours: number | null
  isActive: boolean
  houseRules: unknown
}

export interface UpdateOwnerSettings {
  defaultCheckinTime?: string
  defaultCheckoutTime?: string
  minBookingHours?: number
  isActive?: boolean
}

export const ownerSettingsApi = {
  get(propertyId: string): Promise<OwnerSettings> {
    return api.get<OwnerSettings>(`/properties/${propertyId}/settings`).then((r) => r.data)
  },
  update(propertyId: string, body: UpdateOwnerSettings): Promise<OwnerSettings> {
    return api.patch<OwnerSettings>(`/properties/${propertyId}/settings`, body).then((r) => r.data)
  },
}
