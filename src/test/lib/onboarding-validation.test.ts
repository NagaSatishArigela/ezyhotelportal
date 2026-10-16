import { expect, it } from 'vitest'
import { completedOnboardingSteps, docsGateSchema, requiredDocumentsPresent, step2Schema } from '@/lib/onboarding-validation'
import { documentRequirements } from '@/lib/document-requirements'
import { mapStep5, type PortalStepData } from '@/lib/onboarding-mapping'

it('accepts an empty property description', () => {
  const result = step2Schema.safeParse({
    propertyName: 'Hotel',
    receptionMobile: '9876543210', receptionLandline: '',
    propertyType: 'hotel',
    address: '123 Main Road',
    addressLine2: 'Suite 4',
    latitude: 12.9,
    longitude: 77.6,
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    description: '',
    amenities: ['wifi', 'parking', 'pool'],
    bookingPolicy: 'both',
    minBookingHours: 1,
    defaultCheckinTime: '12:00',
    defaultCheckoutTime: '12:00',
  })

  expect(result.success).toBe(true)
})

it.each(['restaurant', 'bar', 'room_service'])('completes PG documents without optional FSSAI for %s', (amenity) => {
  const data: PortalStepData = {
    1: { businessEntity: 'individual' },
    2: { propertyType: 'pg', amenities: [amenity] },
    5: { documents: [
      { type: 'pan_card', url: 'https://files.test/pan.pdf' },
      { type: 'id_proof', url: 'https://files.test/id.pdf' },
      { type: 'id_proof_back', url: 'https://files.test/id-back.pdf' },
      { type: 'trade_license', url: 'https://files.test/business.pdf' },
      { type: 'rental_agreement', url: 'https://files.test/lease.pdf' },
      { type: 'cancelled_cheque', url: 'https://files.test/cheque.pdf' },
    ] },
  }
  expect(documentRequirements('individual', false, [amenity]).find(d => d.type === 'fssai_license'))
    .toMatchObject({ required: false, show: true })
  expect(requiredDocumentsPresent(data)).toBe(true)
  expect(completedOnboardingSteps(data)).toContain(5)
  expect(mapStep5(data).documents).toEqual(data[5]?.documents)
  const withFssai = { ...data, 5: { documents: [...(mapStep5(data).documents ?? []), { type: 'fssai_license', url: 'https://files.test/fssai.pdf' }] } }
  expect(mapStep5(withFssai).documents).toContainEqual({ type: 'fssai_license', url: 'https://files.test/fssai.pdf' })
  expect(requiredDocumentsPresent({ ...data, 5: { documents: [] } })).toBe(false)
})

it('retains current KYC requirements and optional supporting documents', () => {
  expect(documentRequirements('individual', false, ['restaurant']).find(d => d.type === 'id_proof_back')?.required).toBe(true)
  expect(documentRequirements('individual', false, ['restaurant']).find(d => d.type === 'udyam_certificate')?.required).toBe(false)
  expect(requiredDocumentsPresent({
    1: { businessEntity: 'individual', gstNumber: '' },
    2: { amenities: ['restaurant'] },
    5: { documents: [] },
  })).toBe(false)

  expect(requiredDocumentsPresent({
    1: { businessEntity: 'partnership', gstNumber: '' },
    2: { amenities: ['restaurant'] },
    5: { documents: [] },
  })).toBe(false)

  expect(requiredDocumentsPresent({
    1: { businessEntity: 'partnership', gstNumber: '' },
    2: { amenities: ['restaurant'] },
    5: { documents: [{ type: 'partnership_deed', url: 'https://files.test/partnership.pdf' }] },
  })).toBe(false)
})

it('accepts document payloads without an optional fire safety certificate', () => {
  expect(docsGateSchema.safeParse([]).success).toBe(true)
  expect(requiredDocumentsPresent({
    1: { businessEntity: 'individual', gstNumber: '' },
    2: { amenities: [] },
    5: {
      documents: [
        { type: 'pan_card', url: 'https://files.test/pan.pdf' },
        { type: 'id_proof', url: 'https://files.test/id.pdf' },
        { type: 'id_proof_back', url: 'https://files.test/id-back.pdf' },
        { type: 'trade_license', url: 'https://files.test/business.pdf' },
        { type: 'rental_agreement', url: 'https://files.test/lease.pdf' },
        { type: 'cancelled_cheque', url: 'https://files.test/cheque.pdf' },
      ],
    },
  })).toBe(true)
})
