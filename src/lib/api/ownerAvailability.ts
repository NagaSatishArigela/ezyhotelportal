import { api } from '../api'

export interface OwnerAvailability {
  roomTypeId: string
  date: string
  totalRooms: number
  bookedIntervals: { checkInAt: string; checkOutAt: string }[]
}

export const ownerAvailabilityApi = {
  get(propertyId: string, roomTypeId: string, date: string): Promise<OwnerAvailability> {
    return api
      .get<OwnerAvailability>(`/properties/${propertyId}/availability`, { params: { roomTypeId, date } })
      .then((r) => r.data)
  },
}
