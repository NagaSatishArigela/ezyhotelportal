import type { DormitoryDetails, OtherAccommodation } from '@/lib/accommodation'
import { api } from '@/lib/api'

export type PropertyStatus =
  | 'draft'
  | 'pending_review'
  | 'needs_revision'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'escalated'

export interface PropertyQueueItem {
  id: string
  name: string
  ownerId: string
  status: PropertyStatus
  submissionRef: string | null
  submittedAt: string | null
  revisionCount: number
}

export interface PropertyQueueResult {
  items: PropertyQueueItem[]
  total: number
  page: number
  limit: number
}

export interface RoomType {
  dormitory?: DormitoryDetails | null
  id: string
  type: string
  count: number
  hourlyRatePaise: number | null
  fulldayRatePaise: number | null
  maxOccupancy: number | null
}

export interface PropertyPhoto {
  id: string
  category: string
  url: string
  isPrimary: boolean
  sortOrder: number
}

export interface AdminComplianceDocument {
  type: string
  url: string
  status: string
  expiresAt: string | null
}

export interface AdminComplianceSummary {
  legalBusinessName: string
  gstin: string
  pan: string
  bankAccountNumber: string
  ifsc: string
  accountHolderName: string
  documents: AdminComplianceDocument[]
}

export interface AdminPropertyDetail {
  property: {
    id: string
    name: string
    ownerId: string
    status: PropertyStatus
    submissionRef: string | null
    submittedAt: string | null
    revisionCount: number
    revisionNotes: unknown
    otherAccommodation?: OtherAccommodation | null
    receptionMobile?: string | null
    receptionLandline?: string | null
    propertyType: string | null
    bookingPolicy: string | null
    category: string | null
    description: string | null
    addressLine1: string | null
    addressLine2: string | null
    city: string | null
    state: string | null
    pincode: string | null
    landmark: string | null
    amenities: string[]
    minBookingHours: number | null
    defaultCheckinTime: string | null
    defaultCheckoutTime: string | null
    seatingCapacity: number | null
  }
  roomTypes: RoomType[]
  photos: PropertyPhoto[]
  compliance: AdminComplianceSummary | null
}

export interface ModerationResult {
  propertyId: string
  status: PropertyStatus
}

export interface RevisionItem {
  field: string
  reason: string
}

export const adminPropertiesApi = {
  async listQueue(params: { status: PropertyStatus; page?: number; limit?: number }): Promise<PropertyQueueResult> {
    const res = await api.get<PropertyQueueResult>('/admin/properties', { params })
    return res.data
  },

  async getDetail(propertyId: string): Promise<AdminPropertyDetail> {
    const res = await api.get<AdminPropertyDetail>(`/admin/properties/${propertyId}`)
    return res.data
  },

  async approve(propertyId: string): Promise<ModerationResult> {
    const res = await api.post<ModerationResult>(`/admin/properties/${propertyId}/approve`)
    return res.data
  },

  async reject(propertyId: string, reason: string): Promise<ModerationResult> {
    const res = await api.post<ModerationResult>(`/admin/properties/${propertyId}/reject`, { reason })
    return res.data
  },

  async requestRevision(propertyId: string, items: RevisionItem[]): Promise<ModerationResult> {
    const res = await api.post<ModerationResult>(`/admin/properties/${propertyId}/request-revision`, { items })
    return res.data
  },
}
