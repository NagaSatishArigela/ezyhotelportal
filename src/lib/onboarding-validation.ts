import { z } from 'zod'
import type { PortalStepData } from './onboarding-mapping'
import { documentRequirements } from './document-requirements'
import { propertyDetailsErrors, requiredBookingPolicy } from './property-details'
import { receptionContactSchema } from './reception-contact'
import { dormitorySchema, otherAccommodationSchema, PROPERTY_TYPES } from './accommodation'

export const step1Schema = z.object({
  ownerName:        z.string().min(2, 'At least 2 characters'),
  phone:            z.string().regex(/^\d{10}$/, 'Enter 10-digit mobile number'),
  email:            z.string().email('Enter a valid email'),
  businessEntity:   z.enum(['individual', 'sole_proprietor', 'partnership', 'llp', 'private_limited', 'public_limited']),
  businessName:     z.string().min(2, 'Required'),
  gstNumber:        z.string().trim().toUpperCase().refine(value => !value || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value), 'Enter a valid GST number or leave it blank').optional(),
  propertyCategory: z.enum(['budget', 'mid', 'premium']),
})
export type Step1Data = z.infer<typeof step1Schema>

export const step2Schema = z.object({
  ...receptionContactSchema.shape,
  propertyName:        z.string().min(2, 'Required'),
  propertyType:        z.enum(PROPERTY_TYPES.map(type => type.value)),
  otherAccommodation: otherAccommodationSchema.partial().optional(),
  detailsByType: z.record(z.string(), z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))).optional(),
  address:             z.string().min(5, 'Required'),
  addressLine2:        z.string().min(5, 'At least 5 characters').max(300, 'Max 300 characters'),
  latitude:            z.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude'),
  longitude:           z.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude'),
  city:                z.string().min(2, 'Required'),
  state:               z.string().min(2, 'Required'),
  pincode:             z.string().regex(/^\d{6}$/, '6-digit PIN code'),
  description:         z.string(),
  amenities:           z.array(z.string()).min(3, 'Select at least 3 amenities'),
  bookingPolicy:       z.enum(['hourly', 'fullday', 'both']),
  minBookingHours:     z.number().min(1).max(6),
  defaultCheckinTime:  z.string(),
  defaultCheckoutTime: z.string(),
}).superRefine((data, context) => {
  if (data.propertyType === 'other' && data.otherAccommodation !== undefined && !otherAccommodationSchema.safeParse(data.otherAccommodation).success) context.addIssue({ code: 'custom', path: ['otherAccommodation'], message: 'Complete all accommodation facility questions.' })
  const policy = requiredBookingPolicy(data.propertyType)
  if (policy && data.bookingPolicy !== policy) context.addIssue({ code: z.ZodIssueCode.custom, path: ['bookingPolicy'], message: policy === 'fullday' ? 'PG supports full-day bookings only' : 'Banquets support hourly bookings only' })
  for (const message of propertyDetailsErrors(data.propertyType, data.detailsByType?.[data.propertyType] ?? {})) context.addIssue({ code: z.ZodIssueCode.custom, path: ['detailsByType'], message })
})
export type Step2Data = z.infer<typeof step2Schema>

export const photosGateSchema = z
  .array(
    z.object({
      category: z.string(),
      url: z.string().url(),
      isPrimary: z.boolean().optional(),
    }),
  )
  .min(1, 'Add at least one photo before continuing.')
  .refine((photos) => photos.some((p) => p.isPrimary), 'Mark one photo as the cover image.')

export const roomSchema = z.object({
  id:           z.string(),
  name:         z.string().min(2, 'Required'),
  type:         z.enum(['ac', 'nonac', 'dorm', 'suite']),
  count:        z.number().min(1, 'At least 1 room'),
  maxOccupancy: z.number().int().min(1).max(500),
  bedType:      z.string(), // Display-only value; the server does not persist bed type.
  sizeNote:     z.string().optional(),
  amenities:    z.array(z.string()),
  hourlyRate:   z.number().min(100).max(100000).optional(),
  fulldayRate:  z.number().min(500).optional(),
  dormitory: dormitorySchema.partial().optional(),
}).superRefine((room, context) => {
  if (room.type === 'dorm' && room.dormitory !== undefined && !dormitorySchema.safeParse(room.dormitory).success) context.addIssue({ code: 'custom', path: ['dormitory'], message: 'Complete all dormitory specifications.' })
  if (room.type === 'dorm' && room.dormitory?.totalBeds && room.maxOccupancy > room.dormitory.totalBeds) context.addIssue({ code: 'custom', path: ['maxOccupancy'], message: 'Room capacity cannot exceed total beds.' })
  if (room.type !== 'dorm' && room.maxOccupancy > 20) context.addIssue({ code: 'custom', path: ['maxOccupancy'], message: 'Maximum 20 guests per room.' })
})

export const houseRulesSchema = z.object({
  couple_friendly:   z.enum(['yes', 'no', 'on_request']),
  pet_friendly:      z.enum(['yes', 'no', 'on_request']),
  party_allowed:     z.enum(['yes', 'no', 'on_request']),
  outside_food:      z.enum(['yes', 'no', 'on_request']),
  alcohol_allowed:   z.enum(['yes', 'no', 'not_allowed']),
  smoking_allowed:   z.enum(['yes', 'no', 'designated_area']),
  bachelor_groups:   z.enum(['yes', 'no']),
  id_proof_required: z.enum(['yes', 'no']),
  noiseCutoffTime:   z.string().optional(),
  alcoholPolicyNote: z.string().max(200, 'Max 200 characters').optional(),
})
export type HouseRulesData = z.infer<typeof houseRulesSchema>

export const step4Schema = z.object({
  rooms:           z.array(roomSchema).min(1, 'Add at least one room type'),
  seatingCapacity: z.number().min(50, 'Min 50').max(5000, 'Max 5000').optional(),
  houseRules:      houseRulesSchema,
})
export type Step4Data = z.infer<typeof step4Schema>
export type RoomData = z.infer<typeof roomSchema>

export const docsGateSchema = z.array(z.object({ type: z.string(), url: z.string().url() }))

export function requiredDocumentsPresent(data: PortalStepData): boolean {
  const step1 = data[1] as { businessEntity?: string; gstNumber?: string } | undefined
  const step2 = data[2] as { amenities?: string[] } | undefined
  const step5 = data[5] as { documents?: Array<{ type: string; url: string }> } | undefined
  const entity = step1?.businessEntity ?? 'individual'
  const hasGST = !!String(step1?.gstNumber ?? '').trim()
  const amenities = step2?.amenities ?? []
  const requiredTypes = documentRequirements(entity, hasGST, amenities)
    .filter((document) => document.required)
    .map((document) => document.type)
  const uploadedTypes = new Set((step5?.documents ?? []).map((document) => document.type))
  return requiredTypes.every((type) => uploadedTypes.has(type))
}

export const step6Schema = z.object({
  accountHolderName:    z.string().min(2, 'Required'),
  accountNumber:        z.string().min(9, 'Invalid account number').max(18),
  ifscCode:             z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format'),
  bankName:             z.string().min(2, 'Required'),
  accountType:          z.enum(['savings', 'current', 'cash_credit', 'other']),
  pan:                  z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN (e.g. ABCDE1234F)'),
  settlementPreference: z.enum(['d1', 'weekly']),
  tdsConsent:           z.boolean(),
  tcAccepted:           z.boolean().refine((v) => v === true, 'You must accept the Terms & Conditions'),
  formCAcknowledged:    z.boolean().refine((v) => v === true, 'You must acknowledge the Form C declaration'),
})
export type Step6Data = z.infer<typeof step6Schema>

/** Use the screen validators for both restored progress and review indicators. */
export function completedOnboardingSteps(data: PortalStepData, savedCompliance: boolean | { documents: Array<{ type: string }> } = false, submitted = false): number[] {
  const rooms = data[4]
  const seating = data[4]?.seatingCapacity
  const complete = [
    step1Schema.safeParse(data[1]).success,
    step2Schema.safeParse(data[2]).success,
    photosGateSchema.safeParse(data[3]?.photos).success,
    step4Schema.safeParse(rooms).success && (data[2]?.propertyType !== 'dormitory' || (rooms?.rooms as RoomData[] | undefined)?.every(room => room.type === 'dorm' && dormitorySchema.safeParse(room.dormitory).success) === true) && (data[2]?.propertyType !== 'banquet' || (typeof seating === 'number' && seating >= 50 && seating <= 5000)),
    typeof savedCompliance === 'object'
      ? requiredDocumentsPresent({ ...data, 5: { documents: savedCompliance.documents } })
      : savedCompliance || (docsGateSchema.safeParse(data[5]?.documents).success && requiredDocumentsPresent(data)),
    !!savedCompliance || step6Schema.safeParse(data[6]).success,
    submitted,
  ]
  return complete.flatMap((done, index) => done ? [index + 1] : [])
}
