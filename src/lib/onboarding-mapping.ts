/**
 * onboarding-mapping.ts — pure mapping layer between the 7-step portal wizard
 * (`onboarding.store.stepData`) and the FROZEN 5-step server contract
 * (`docs/onboarding-contract.md`, PATCH /properties/:id/step/:stepNum).
 *
 * The portal UX collects data across 7 screens; the server has 5 canonical
 * steps. These functions assemble each SERVER step payload from the accumulated
 * portal stepData using the exact server field names / enums. They ONLY ever
 * emit whitelisted server fields — portal-only fields are dropped so the
 * server's forbidNonWhitelisted rule never 400s.
 *
 * Increment 2B-1 scope: map what the portal already collects. Server-required
 * fields the portal does not yet collect are omitted (never invented) and
 * tracked in STILL_MISSING_REQUIRED_FIELDS for the next increment.
 */

// ── Accumulated portal stepData (matches onboarding.store) ───────────────────

import { AMENITY_IDS, normalizeAmenity } from './amenity-catalog'
import { requiredBookingPolicy, type PropertyDetails } from './property-details'

export type PortalStepData = Partial<
  Record<1 | 2 | 3 | 4 | 5 | 6 | 7, Record<string, unknown>>
>

// Loose views of what each portal screen stores (see OnboardingScreens.tsx).
interface PortalStep1 {
  ownerName?: string
  businessEntity?: string
  businessName?: string
  gstNumber?: string
  propertyCategory?: string
}
interface PortalStep2 {
  detailsByType?: Record<string, PropertyDetails>
  propertyName?: string
  propertyType?: string
  address?: string
  addressLine2?: string
  latitude?: number
  longitude?: number
  city?: string
  state?: string
  pincode?: string
  description?: string
  amenities?: string[]
  bookingPolicy?: string
  minBookingHours?: number
  defaultCheckinTime?: string
  defaultCheckoutTime?: string
}
interface PortalPhoto {
  category?: string
  url?: string
  isPrimary?: boolean
  sortOrder?: number
}
interface PortalStep3 {
  reviewerNotes?: string
  photos?: PortalPhoto[]
}
interface PortalDocument {
  type?: string
  url?: string
  expiresAt?: string
}
interface PortalStep5 {
  documents?: PortalDocument[]
}
interface PortalRoom {
  type?: string
  count?: number
  maxOccupancy?: number
  hourlyRate?: number
  fulldayRate?: number
}
interface PortalHouseRules {
  couple_friendly?: string
  pet_friendly?: string
  party_allowed?: string
  outside_food?: string
  alcohol_allowed?: string
  smoking_allowed?: string
  bachelor_groups?: string
  id_proof_required?: string
  noiseCutoffTime?: string
  alcoholPolicyNote?: string
}
interface PortalStep4 {
  rooms?: PortalRoom[]
  seatingCapacity?: number
  houseRules?: PortalHouseRules
}
interface PortalStep6 {
  accountType?: string
  accountHolderName?: string
  accountNumber?: string
  ifscCode?: string
  pan?: string
  tcAccepted?: boolean
  formCAcknowledged?: boolean
}

// ── Server payload shapes (exact contract field names) ───────────────────────

export interface ServerStep1Payload {
  propertyDetails?: PropertyDetails
  propertyName?: string
  propertyType?: string
  bookingPolicy?: string
  businessEntity?: string
  ownerFirstName?: string
  ownerMiddleName?: string
  ownerLastName?: string
  category?: string
  description?: string
}
export interface ServerStep2Payload {
  latitude?: number
  longitude?: number
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  pincode?: string
  specialNote?: string
}
export interface ServerStep3Room {
  type?: 'ac' | 'nonac' | 'dorm' | 'suite'
  count?: number
  maxOccupancy?: number
  hourlyRate?: number
  fulldayRate?: number
}
export interface ServerHouseRules {
  couple_friendly: string
  pet_friendly: string
  party_allowed: string
  outside_food: string
  alcohol_allowed: string
  smoking_allowed: string
  bachelor_groups: string
  id_proof_required: string
  noiseCutoffTime?: string
  alcoholPolicyNote?: string
}
export interface ServerStep3Payload {
  rooms?: ServerStep3Room[]
  minBookingHours?: '1' | '2' | '3'
  defaultCheckinTime?: string
  defaultCheckoutTime?: string
  seatingCapacity?: number
  amenities?: string[]
  houseRules?: ServerHouseRules
}
export interface ServerPhoto {
  category: 'exterior' | 'room' | 'reception' | 'washroom' | 'common'
  url: string
  isPrimary?: boolean
  sortOrder?: number
}
export interface ServerStep4Payload {
  photos?: ServerPhoto[]
}
export interface ServerDocument {
  type: string
  url: string
  expiresAt?: string
}
export interface ServerStep5Payload {
  accountType?: string
  gstin?: string
  legalBusinessName?: string
  pan?: string
  bankAccountNumber?: string
  ifsc?: string
  accountHolderName?: string
  tcAccepted?: true
  formCAcknowledged?: true
  documents?: ServerDocument[]
}

// ── Enum / value alignment tables (portal → server) ──────────────────────────

// Portal property types → contract PropertyType. boutique→hotel, service_apt→
// homestay per the increment brief; the rest already match the server enum.
const PROPERTY_TYPE_MAP: Record<string, string> = {
  hotel: 'hotel',
  boutique: 'hotel',
  service_apt: 'homestay',
  resort: 'resort',
  homestay: 'homestay',
  villa: 'villa',
  pg: 'pg',
  farm: 'farm',
  guest_house: 'guest_house',
  lodge: 'lodge',
  dormitory: 'dormitory',
  banquet: 'banquet',
  other: 'other',
}

// Portal businessEntity values → contract BusinessEntity. The portal picker now
// offers the full enum; `pvtltd` is retained to migrate any legacy stored value.
const BUSINESS_ENTITY_MAP: Record<string, string> = {
  individual: 'individual',
  sole_proprietor: 'sole_proprietor',
  partnership: 'partnership',
  llp: 'llp',
  private_limited: 'private_limited',
  public_limited: 'public_limited',
  pvtltd: 'private_limited',
}

// Valid server room types (contract §Step 3 RoomType).
const ROOM_TYPES = new Set(['ac', 'nonac', 'dorm', 'suite'])

// Valid values per houseRules key (contract §Step 3).
const HOUSE_RULE_ENUMS: Record<string, Set<string>> = {
  couple_friendly: new Set(['yes', 'no', 'on_request']),
  pet_friendly: new Set(['yes', 'no', 'on_request']),
  party_allowed: new Set(['yes', 'no', 'on_request']),
  outside_food: new Set(['yes', 'no', 'on_request']),
  alcohol_allowed: new Set(['yes', 'no', 'not_allowed']),
  smoking_allowed: new Set(['yes', 'no', 'designated_area']),
  bachelor_groups: new Set(['yes', 'no']),
  id_proof_required: new Set(['yes', 'no']),
}

// Includes retired IDs so editing existing drafts does not discard selections.
const CANONICAL_AMENITIES = new Set(AMENITY_IDS)

// Contract §Step 4 Photo.category vocabulary.
const PHOTO_CATEGORIES = new Set<ServerPhoto['category']>([
  'exterior', 'room', 'reception', 'washroom', 'common',
])

// Contract §3 DocumentType enum — filtered defensively so only valid types
// reach the server (portal maps docId → DocumentType before storing).
const DOCUMENT_TYPES = new Set([
  'owner_photo', 'id_proof', 'id_proof_back', 'pan_card', 'gstin_certificate', 'rental_agreement',
  'fire_safety_cert', 'fssai_license', 'trade_license', 'udyam_certificate', 'partnership_deed',
  'incorporation_certificate', 'board_resolution', 'llp_agreement',
  'cancelled_cheque', 'other',
])

// ── Small helpers ────────────────────────────────────────────────────────────

/** Assign a string field only when it is a non-empty trimmed string. */
function putStr<T extends object>(target: T, key: keyof T, value: unknown): void {
  if (typeof value === 'string' && value.trim() !== '') {
    ;(target as Record<string, unknown>)[key as string] = value.trim()
  }
}

/** Split a full name on whitespace into first / middle? / last. */
function splitOwnerName(full: string | undefined): {
  ownerFirstName?: string
  ownerMiddleName?: string
  ownerLastName?: string
} {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return {}
  if (parts.length === 1) return { ownerFirstName: parts[0] }
  const ownerFirstName = parts[0]
  const ownerLastName = parts[parts.length - 1]
  const middle = parts.slice(1, -1).join(' ')
  return middle
    ? { ownerFirstName, ownerMiddleName: middle, ownerLastName }
    : { ownerFirstName, ownerLastName }
}

// ── Per-server-step mappers (pure) ───────────────────────────────────────────

export function mapStep1(data: PortalStepData): ServerStep1Payload {
  const s1 = (data[1] ?? {}) as PortalStep1
  const s2 = (data[2] ?? {}) as PortalStep2
  const out: ServerStep1Payload = {}

  putStr(out, 'propertyName', s2.propertyName)
  if (s2.propertyType && PROPERTY_TYPE_MAP[s2.propertyType]) {
    out.propertyType = PROPERTY_TYPE_MAP[s2.propertyType]
  }
  putStr(out, 'bookingPolicy', requiredBookingPolicy(s2.propertyType ?? '') ?? s2.bookingPolicy)
  out.propertyDetails = s2.detailsByType?.[s2.propertyType ?? ''] ?? {}
  if (s1.businessEntity && BUSINESS_ENTITY_MAP[s1.businessEntity]) {
    out.businessEntity = BUSINESS_ENTITY_MAP[s1.businessEntity]
  }
  Object.assign(out, splitOwnerName(s1.ownerName))
  putStr(out, 'category', s1.propertyCategory)
  putStr(out, 'description', s2.description)

  return out
}

export function mapStep2(data: PortalStepData): ServerStep2Payload {
  const s2 = (data[2] ?? {}) as PortalStep2
  const s3 = (data[3] ?? {}) as PortalStep3
  const out: ServerStep2Payload = {}

  if (typeof s2.latitude === 'number' && Number.isFinite(s2.latitude)) {
    out.latitude = s2.latitude
  }
  if (typeof s2.longitude === 'number' && Number.isFinite(s2.longitude)) {
    out.longitude = s2.longitude
  }
  putStr(out, 'addressLine1', s2.address)
  putStr(out, 'addressLine2', s2.addressLine2)
  putStr(out, 'city', s2.city)
  putStr(out, 'state', s2.state)
  putStr(out, 'pincode', s2.pincode)
  // reviewerNotes has no server home of its own; reuse as specialNote.
  putStr(out, 'specialNote', s3.reviewerNotes)

  return out
}

export function mapStep3(data: PortalStepData): ServerStep3Payload {
  const s2 = (data[2] ?? {}) as PortalStep2
  const s4 = (data[4] ?? {}) as PortalStep4
  const out: ServerStep3Payload = {}

  if (Array.isArray(s4.rooms) && s4.rooms.length > 0) {
    out.rooms = s4.rooms.map((r): ServerStep3Room => {
      const room: ServerStep3Room = {}
      if (typeof r.type === 'string' && ROOM_TYPES.has(r.type)) {
        room.type = r.type as ServerStep3Room['type']
      }
      if (typeof r.count === 'number') room.count = r.count
      if (typeof r.maxOccupancy === 'number') room.maxOccupancy = r.maxOccupancy
      if (s2.propertyType !== 'pg' && typeof r.hourlyRate === 'number') room.hourlyRate = r.hourlyRate
      if (s2.propertyType !== 'banquet' && typeof r.fulldayRate === 'number') room.fulldayRate = r.fulldayRate
      return room
    })
  }

  if (typeof s2.minBookingHours === 'number') {
    const clamped = Math.min(Math.max(Math.round(s2.minBookingHours), 1), 3)
    out.minBookingHours = String(clamped) as '1' | '2' | '3'
  }
  putStr(out, 'defaultCheckinTime', s2.defaultCheckinTime)
  putStr(out, 'defaultCheckoutTime', s2.defaultCheckoutTime)

  // seatingCapacity is a valid step-3 field; the server only *requires* it for
  // banquet properties, so we emit it whenever a numeric value is present.
  if (typeof s4.seatingCapacity === 'number' && Number.isFinite(s4.seatingCapacity)) {
    out.seatingCapacity = s4.seatingCapacity
  }
  const banquetSeating = s2.detailsByType?.banquet?.seatingCapacity
  if (s2.propertyType === 'banquet' && typeof banquetSeating === 'number') out.seatingCapacity = banquetSeating

  if (Array.isArray(s2.amenities)) {
    const ids = [...new Set(s2.amenities.map(normalizeAmenity).filter((a) => CANONICAL_AMENITIES.has(a)))]
    if (ids.length > 0) out.amenities = ids
  }

  const houseRules = mapHouseRules(s4.houseRules)
  if (houseRules) out.houseRules = houseRules

  return out
}

/**
 * Build the contract houseRules object from the portal's stored (already
 * snake_case) shape. Emits only when all 8 required keys carry a valid enum
 * value; the two optional string fields are appended when present.
 */
function mapHouseRules(hr: PortalHouseRules | undefined): ServerHouseRules | undefined {
  if (!hr || typeof hr !== 'object') return undefined
  const requiredKeys = Object.keys(HOUSE_RULE_ENUMS) as (keyof PortalHouseRules)[]
  const collected: Record<string, string> = {}
  for (const key of requiredKeys) {
    const value = hr[key]
    if (typeof value !== 'string' || !HOUSE_RULE_ENUMS[key].has(value)) return undefined
    collected[key] = value
  }
  const out = collected as unknown as ServerHouseRules
  if (typeof hr.noiseCutoffTime === 'string' && hr.noiseCutoffTime.trim() !== '') {
    out.noiseCutoffTime = hr.noiseCutoffTime.trim()
  }
  if (typeof hr.alcoholPolicyNote === 'string' && hr.alcoholPolicyNote.trim() !== '') {
    out.alcoholPolicyNote = hr.alcoholPolicyNote.trim()
  }
  return out
}

// Step 4 — photos collected in UX step 3 (media). Each stored photo already
// carries the server-ready shape; we filter to valid categories + non-empty
// urls and re-derive sortOrder so it is always a clean 0-based sequence.
export function mapStep4(data: PortalStepData): ServerStep4Payload {
  const s3 = (data[3] ?? {}) as PortalStep3
  const out: ServerStep4Payload = {}

  if (Array.isArray(s3.photos)) {
    const photos = s3.photos
      .filter(
        (p): p is PortalPhoto & { category: ServerPhoto['category']; url: string } =>
          typeof p?.url === 'string' &&
          p.url.trim() !== '' &&
          typeof p?.category === 'string' &&
          PHOTO_CATEGORIES.has(p.category as ServerPhoto['category']),
      )
      .map((p, i): ServerPhoto => {
        const photo: ServerPhoto = {
          category: p.category,
          url: p.url.trim(),
          sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : i,
        }
        if (p.isPrimary === true) photo.isPrimary = true
        return photo
      })
    if (photos.length > 0) out.photos = photos
  }

  return out
}

export function mapStep5(data: PortalStepData): ServerStep5Payload {
  const s1 = (data[1] ?? {}) as PortalStep1
  const s5 = (data[5] ?? {}) as PortalStep5
  const s6 = (data[6] ?? {}) as PortalStep6
  const out: ServerStep5Payload = {}

  putStr(out, 'gstin', s1.gstNumber?.trim().toUpperCase())
  putStr(out, 'legalBusinessName', s1.businessName)
  if (typeof s6.pan === 'string' && s6.pan.trim() !== '') {
    out.pan = s6.pan.trim().toUpperCase()
  }
  putStr(out, 'bankAccountNumber', s6.accountNumber)
  if (typeof s6.ifscCode === 'string' && s6.ifscCode.trim() !== '') {
    out.ifsc = s6.ifscCode.trim().toUpperCase()
  }
  putStr(out, 'accountHolderName', s6.accountHolderName)
  putStr(out, 'accountType', s6.accountType)
  if (s6.tcAccepted === true) out.tcAccepted = true
  if (s6.formCAcknowledged === true) out.formCAcknowledged = true

  // Documents collected in UX step 5 (docId already mapped to DocumentType).
  // Filter to valid types + non-empty urls; carry expiresAt when present.
  if (Array.isArray(s5.documents)) {
    const documents = s5.documents
      .filter(
        (d): d is PortalDocument & { type: string; url: string } =>
          typeof d?.type === 'string' &&
          DOCUMENT_TYPES.has(d.type) &&
          typeof d?.url === 'string' &&
          d.url.trim() !== '',
      )
      .map((d): ServerDocument => {
        const doc: ServerDocument = { type: d.type, url: d.url.trim() }
        if (typeof d.expiresAt === 'string' && d.expiresAt.trim() !== '') {
          doc.expiresAt = d.expiresAt.trim()
        }
        return doc
      })
    if (documents.length > 0) out.documents = documents
  }

  return out
}

// ── Dispatcher: server step number → mapped payload ──────────────────────────

export function mapServerStep(
  serverStep: number,
  data: PortalStepData,
): Record<string, unknown> {
  switch (serverStep) {
    case 1: return { ...mapStep1(data) }
    case 2: return { ...mapStep2(data) }
    case 3: return { ...mapStep3(data) }
    case 4: return { ...mapStep4(data) }
    case 5: return { ...mapStep5(data) }
    default: return {}
  }
}

// ── Completeness gate ────────────────────────────────────────────────────────
// A server step spans multiple portal UX steps (e.g. server step 1 needs
// propertyName/propertyType/bookingPolicy which are collected in UX step 2).
// The server validates each PATCH against the FULL step DTO, so PATCHing a
// server step before all its feeder UX steps are filled 400s. We therefore only
// PATCH a server step once its DTO-required fields are all present; incomplete
// steps stay in the local draft and flush automatically once complete.

// DTO-required fields per server step (submit-time conditional fields like
// minBookingHours / hourlyRate are NOT required at step-save time).
const SERVER_STEP_REQUIRED: Record<number, string[]> = {
  1: ['propertyName', 'propertyType', 'bookingPolicy', 'businessEntity', 'ownerFirstName', 'category'],
  2: ['latitude', 'longitude', 'addressLine1', 'addressLine2', 'pincode', 'city', 'state'],
  3: [], // custom check below (rooms + amenities + houseRules)
  4: [], // custom check below (>=1 photo)
  5: ['legalBusinessName', 'pan', 'bankAccountNumber', 'ifsc', 'accountHolderName', 'tcAccepted', 'formCAcknowledged', 'documents'],
}

function present(v: unknown): boolean {
  if (v == null) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (Array.isArray(v)) return v.length > 0
  return true
}

/** True when the mapped payload has every DTO-required field the server needs to accept this step. */
export function isServerStepComplete(serverStep: number, payload: Record<string, unknown>): boolean {
  if (serverStep === 3) {
    const rooms = payload.rooms as unknown[] | undefined
    const roomsOk = Array.isArray(rooms) && rooms.length > 0 &&
      rooms.every((r) => present((r as ServerStep3Room).type) && (r as ServerStep3Room).count != null)
    return roomsOk && present(payload.amenities) && present(payload.houseRules)
  }
  if (serverStep === 4) {
    return present(payload.photos)
  }
  const required = SERVER_STEP_REQUIRED[serverStep] ?? []
  return required.every((f) => present(payload[f]))
}

/**
 * From the accumulated stepData, return the mapped payloads for every server
 * step that is now COMPLETE — the set the save layer should PATCH. Iterating all
 * steps (not just the ones a given UX step maps to) means a server step flushes
 * as soon as its last feeder field is entered, regardless of edit order.
 */
export function completeServerSteps(data: PortalStepData): Array<{ step: number; payload: Record<string, unknown> }> {
  const out: Array<{ step: number; payload: Record<string, unknown> }> = []
  for (let step = 1; step <= 5; step++) {
    const payload = mapServerStep(step, data)
    if (isServerStepComplete(step, payload)) out.push({ step, payload })
  }
  return out
}

/**
 * Which SERVER step(s) each portal UX step feeds. A portal screen can
 * contribute to more than one server step (e.g. Step 2 supplies basics,
 * location, and room policies). Mappers read the ACCUMULATED stepData, so
 * cross-step dependencies resolve regardless of edit order.
 */
export const PORTAL_TO_SERVER_STEPS: Record<number, number[]> = {
  1: [1, 5], // owner identity, business/legal + payout names
  2: [1, 2, 3], // property basics, location, room policies/amenities
  3: [2, 4], // media notes → specialNote; photos → step4
  4: [3], // room inventory
  5: [5], // KYC docs → step5 documents (+ re-syncs business/bank names)
  6: [5], // bank & payout
  7: [], // review & submit — no autosave
}

// ── Still-missing REQUIRED server fields (for the next increment) ────────────

export interface StillMissingRequiredFields {
  step1: readonly string[]
  step2: readonly string[]
  step3: readonly string[]
  step4: readonly string[]
  step5: readonly string[]
}

/**
 * Server-REQUIRED fields the portal does NOT yet collect, per SERVER step.
 * The build does not depend on any of these existing; they are emitted only if
 * a matching value is already present in stepData. Notes:
 *  - step1 businessEntity now covers the full contract enum (individual,
 *    sole_proprietor, partnership, llp, private_limited, public_limited).
 *  - step2 latitude/longitude come from the UX step-2 location inputs;
 *    addressLine2 is collected alongside addressLine1.
 *  - step3 rooms[].type, houseRules, and seatingCapacity are all collected in
 *    UX step 4. seatingCapacity is required by the server only for banquet
 *    properties, so it is emitted whenever present but not tracked as missing.
 *  - step5 pan / tcAccepted / formCAcknowledged are collected in UX step 6.
 *  - step4 photos are collected in UX step 3 (media) and step5 documents in UX
 *    step 5 (KYC) — both now flow through the real /uploads pipeline, so no
 *    server-required onboarding fields remain uncollected.
 */
export const STILL_MISSING_REQUIRED_FIELDS: StillMissingRequiredFields = {
  step1: [],
  step2: [],
  step3: [],
  step4: [],
  step5: [],
}
