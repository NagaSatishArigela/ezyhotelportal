import { api } from '../api'

export type OwnerRoomType = 'ac' | 'nonac' | 'dorm' | 'suite'

export interface OwnerRoom {
  id: string
  type: OwnerRoomType
  count: number
  hourlyRatePaise: number | null
  fulldayRatePaise: number | null
  maxOccupancy: number | null
}

export interface UpdateOwnerRoom {
  count?: number
  hourlyRate?: number // rupees
  fulldayRate?: number // rupees
  maxOccupancy?: number
}

export const ownerRoomsApi = {
  list(propertyId: string): Promise<OwnerRoom[]> {
    return api.get<OwnerRoom[]>(`/properties/${propertyId}/rooms`).then((r) => r.data)
  },
  update(propertyId: string, roomId: string, body: UpdateOwnerRoom): Promise<OwnerRoom> {
    return api.patch<OwnerRoom>(`/properties/${propertyId}/rooms/${roomId}`, body).then((r) => r.data)
  },
}
