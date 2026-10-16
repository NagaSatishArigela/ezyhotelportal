import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Step2RoomsPricing } from '@/pages/owner/onboarding/OnboardingScreens'
import { PROPERTY_TYPES } from '@/lib/accommodation'
import { receptionContactSchema } from '@/lib/reception-contact'
import { mapStep1 } from '@/lib/onboarding-mapping'
import { useOnboardingStore } from '@/store/onboarding.store'

vi.mock('@/lib/portal-api', () => ({
  uploadFile: vi.fn(), saveOnboardingStep: vi.fn(), createPropertyDraft: vi.fn(),
  submitOnboarding: vi.fn(), verifyIFSC: vi.fn(), pennyDrop: vi.fn(), verifyPincode: vi.fn(),
}))
beforeEach(() => useOnboardingStore.getState().reset())

it.each(PROPERTY_TYPES)('collects required reception mobile and optional landline for $label', ({ value }) => {
  useOnboardingStore.getState().saveStepData(2, { propertyType: value })
  render(<Step2RoomsPricing />)
  const mobile = screen.getByLabelText('Office Reception mobile number')
  expect(mobile).toHaveAttribute('aria-required', 'true')
  expect(screen.getByLabelText('Reception landline number')).not.toHaveAttribute('aria-required', 'true')
  fireEvent.change(mobile, { target: { value: '9876543210' } })
  fireEvent.change(screen.getByLabelText('Reception landline number'), { target: { value: '080 23456789' } })
  expect(useOnboardingStore.getState().stepData[2]).toMatchObject({ receptionMobile: '9876543210', receptionLandline: '080 23456789' })
  expect(mapStep1(useOnboardingStore.getState().stepData)).toMatchObject({ propertyType: value, receptionMobile: '9876543210', receptionLandline: '08023456789' })
})

it('normalizes the mobile country code and allows an omitted landline', () => {
  expect(receptionContactSchema.parse({ receptionMobile: '+91 98765-43210', receptionLandline: '' })).toEqual({ receptionMobile: '9876543210', receptionLandline: '' })
  expect(mapStep1({ 2: { receptionMobile: '9876543210' } })).toMatchObject({ receptionMobile: '9876543210', receptionLandline: null })
})

it.each(['', '12345', '1234567890', '987654321a'])('rejects invalid required reception mobile %j', (receptionMobile) => {
  expect(receptionContactSchema.safeParse({ receptionMobile, receptionLandline: '' }).success).toBe(false)
})

it('validates a landline when provided', () => {
  expect(receptionContactSchema.safeParse({ receptionMobile: '9876543210', receptionLandline: 'not a number' }).success).toBe(false)
})
