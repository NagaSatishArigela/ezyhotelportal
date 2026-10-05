import type { PropertyDraft } from './portal-api'
import type { PortalStepData, ServerStep1Payload, ServerStep2Payload, ServerStep3Payload, ServerStep4Payload } from './onboarding-mapping'

/** Inverse of the existing five-server-step to seven-screen mapping.
 * Masked secrets never become editable values or outbound payloads. */
export function restorePortalSteps(draft: PropertyDraft): PortalStepData {
  const one = (draft.draftData.step1 ?? {}) as ServerStep1Payload
  const two = (draft.draftData.step2 ?? {}) as ServerStep2Payload
  const three = (draft.draftData.step3 ?? {}) as ServerStep3Payload
  const four = (draft.draftData.step4 ?? {}) as ServerStep4Payload
  const present = (data: Record<string, unknown>) => Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  return {
    1: present({ ownerName: one.ownerFirstName ? [one.ownerFirstName, one.ownerMiddleName, one.ownerLastName].filter(Boolean).join(' ') : undefined,
      businessEntity: one.businessEntity, propertyCategory: one.category, businessName: draft.compliance?.legalBusinessName }),
    2: present({ propertyName: one.propertyName, propertyType: one.propertyType, bookingPolicy: one.bookingPolicy, description: one.description,
      detailsByType: one.propertyType && one.propertyDetails ? { [one.propertyType]: one.propertyDetails } : undefined,
      address: two.addressLine1, addressLine2: two.addressLine2, latitude: two.latitude, longitude: two.longitude,
      city: two.city, state: two.state, pincode: two.pincode, amenities: three.amenities,
      minBookingHours: three.minBookingHours === undefined ? undefined : Number(three.minBookingHours),
      defaultCheckinTime: three.defaultCheckinTime, defaultCheckoutTime: three.defaultCheckoutTime }),
    3: present({ reviewerNotes: two.specialNote, photos: four.photos?.map((photo, i) => ({ ...photo, id: draft.propertyId + '-photo-' + i })) }),
    4: present({ rooms: three.rooms?.map((room, i) => ({ ...room, id: draft.propertyId + '-room-' + i,
      name: room.type ? room.type.toUpperCase() + ' room' : 'Room', bedType: '', amenities: [] })),
      houseRules: three.houseRules, seatingCapacity: three.seatingCapacity }),
    6: present({ accountHolderName: draft.compliance?.accountHolderName, ifscCode: draft.compliance?.ifsc, accountType: draft.compliance?.accountType }),
  }
}
