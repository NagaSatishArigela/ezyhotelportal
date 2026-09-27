import { expect, it } from 'vitest'
import { docsGateSchema, requiredDocumentsPresent, step2Schema } from '@/lib/onboarding-validation'

it('accepts an empty property description', () => {
  const result = step2Schema.safeParse({
    propertyName: 'Hotel',
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

it('accepts document payloads without an optional fire safety certificate', () => {
  expect(docsGateSchema.safeParse([]).success).toBe(true)
  expect(requiredDocumentsPresent({
    1: { businessEntity: 'individual', gstNumber: '' },
    2: { amenities: [] },
    5: {
      documents: [
        { type: 'pan_card', url: 'https://files.test/pan.pdf' },
        { type: 'id_proof', url: 'https://files.test/id.pdf' },
        { type: 'rental_agreement', url: 'https://files.test/lease.pdf' },
        { type: 'cancelled_cheque', url: 'https://files.test/cheque.pdf' },
      ],
    },
  })).toBe(true)
})
