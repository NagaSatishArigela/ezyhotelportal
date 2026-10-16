import { z } from 'zod'

export const PROPERTY_TYPES = [
  { value: 'hotel', label: 'Hotels' },
  { value: 'resort', label: 'Resorts' },
  { value: 'villa', label: 'Villas' },
  { value: 'guest_house', label: 'Guest Houses' },
  { value: 'farm', label: 'Farm Houses' },
  { value: 'homestay', label: 'Homestays' },
  { value: 'pg', label: 'PGs' },
  { value: 'lodge', label: 'Lodges' },
  { value: 'dormitory', label: 'Dormitories' },
  { value: 'banquet', label: 'Banquet/Convention Hall' },
  { value: 'other', label: 'Others' },
] as const

export function normalizePropertyType(value: unknown): typeof PROPERTY_TYPES[number]['value'] | undefined {
  const canonical = value === 'boutique' ? 'hotel' : value === 'service_apt' ? 'homestay' : value
  return PROPERTY_TYPES.find((type) => type.value === canonical)?.value
}

export const OTHER_ACCOMMODATION_TYPES = [
  { value: 'container_home', label: 'Container Home' },
  { value: 'tents_glamping', label: 'Tents & Glamping' },
  { value: 'tree_house', label: 'Tree Houses & Elevated Stays' },
] as const

export const OTHER_FACILITIES = [
  ['windows', 'Windows are available'],
  ['bathroom', 'Bathroom available'],
  ['roofInstallation', 'Roof installation'],
  ['rainWaterProtection', 'Rain water protection'],
  ['sunRoof', 'Sun roof'],
  ['electricity', 'Electricity available'],
  ['familiesAllowed', 'Families are allowed'],
  ['groupPartiesAllowed', 'Group parties are allowed'],
  ['soloAccommodationAllowed', 'Solo accommodation allowed'],
  ['childrenBeds', 'Children beds'],
  ['hotWater', 'Hot water service'],
  ['accommodationService', 'Accommodation service'],
  ['lockDoor', 'Lock door'],
  ['privacyProtection', 'Privacy protection'],
  ['pillowBlanket', 'Pillow & blanket'],
  ['luggageStorage', 'Luggage storage'],
  ['housekeeping', 'Housekeeping'],
  ['chargingSockets', 'Charging sockets'],
] as const

const yesNo = z.enum(['yes', 'no'])
export const otherAccommodationSchema = z.object({
  type: z.enum(['container_home', 'tents_glamping', 'tree_house']),
  numberOfBeds: z.number().int().min(1).max(500),
  windows: yesNo, bathroom: yesNo, roofInstallation: yesNo,
  rainWaterProtection: yesNo, sunRoof: yesNo, electricity: yesNo,
  familiesAllowed: yesNo, groupPartiesAllowed: yesNo,
  soloAccommodationAllowed: yesNo, childrenBeds: yesNo, hotWater: yesNo,
  accommodationService: yesNo, lockDoor: yesNo, privacyProtection: yesNo,
  pillowBlanket: yesNo, luggageStorage: yesNo, housekeeping: yesNo,
  chargingSockets: yesNo,
})
export type OtherAccommodation = z.infer<typeof otherAccommodationSchema>

export const DORMITORY_SELECTS = [
  { key: 'accommodationAllowedFor', label: 'Accommodation allowed for', options: ['Male dormitory', 'Female dormitory', 'Mixed-gender dormitory', 'Private room for family / group'] },
  { key: 'category', label: 'Dormitory category', options: ['Standard', 'Deluxe', 'AC', 'Non-AC', 'Capsule / Pod', 'Bunk-bed room'] },
  { key: 'bedType', label: 'Bed type', options: ['Single bunk', 'Upper bunk', 'Lower bunk', 'Single bed', 'Capsule / Pod'] },
  { key: 'bedAllocation', label: 'Bed allocation', options: ['Upper', 'Lower', 'Any available bed'] },
  { key: 'sleepingArrangement', label: 'Sleeping arrangement', options: ['Shared room', 'Private dormitory room'] },
  { key: 'attachedBathroom', label: 'Attached bathroom', options: ['Yes', 'No'] },
  { key: 'bathroomType', label: 'Bathroom type', options: ['Attached', 'Common'] },
  { key: 'lockerAvailability', label: 'Locker availability', options: ['Individual locker', 'Shared locker', 'None'] },
  { key: 'mattressType', label: 'Mattress type', options: ['Standard', 'Orthopedic', 'Other'] },
  { key: 'chargingPoint', label: 'Charging point', options: ['Each bed', 'Shared'] },
  { key: 'readingLight', label: 'Reading light', options: ['Each bed', 'Shared'] },
  { key: 'privacyScreen', label: 'Curtain or privacy screen', options: ['Yes', 'No'] },
] as const

export const dormitorySchema = z.object({
  roomName: z.string().trim().min(1).max(100),
  totalBeds: z.number().int().min(1).max(500),
  bedLength: z.number().min(0.1).max(500),
  bedWidth: z.number().min(0.1).max(500),
  linenProvided: z.array(z.enum(['Bedsheet', 'Pillow', 'Blanket'])),
  accommodationAllowedFor: z.enum(DORMITORY_SELECTS[0].options),
  category: z.enum(DORMITORY_SELECTS[1].options),
  bedType: z.enum(DORMITORY_SELECTS[2].options),
  bedAllocation: z.enum(DORMITORY_SELECTS[3].options),
  sleepingArrangement: z.enum(DORMITORY_SELECTS[4].options),
  attachedBathroom: z.enum(['Yes', 'No']),
  bathroomType: z.enum(['Attached', 'Common']),
  lockerAvailability: z.enum(DORMITORY_SELECTS[7].options),
  mattressType: z.enum(DORMITORY_SELECTS[8].options),
  chargingPoint: z.enum(['Each bed', 'Shared']),
  readingLight: z.enum(['Each bed', 'Shared']),
  privacyScreen: z.enum(['Yes', 'No']),
})
export type DormitoryDetails = z.infer<typeof dormitorySchema>
