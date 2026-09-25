import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ListingChecklist } from '@/components/owner/ListingChecklist'
import { documentRequirements } from '@/lib/document-requirements'
import { Step1PropertyDetails } from '@/pages/owner/onboarding/Step1PropertyDetails'
import { useOnboardingStore } from '@/store/onboarding.store'

it('shows preparation before the listing form and registers form validation after Start listing', async () => {
  useOnboardingStore.getState().reset()
  render(<Step1PropertyDetails />)
  const preparation = useOnboardingStore.getState().onBeforeNext
  expect(preparation).not.toBeNull()
  await expect(preparation!()).rejects.toThrow('Start listing')
  fireEvent.click(screen.getByRole('button', { name: 'Start listing' }))
  expect(screen.queryByRole('button', { name: 'Start listing' })).not.toBeInTheDocument()
  expect(useOnboardingStore.getState().onBeforeNext).not.toBeNull()
  expect(useOnboardingStore.getState().onBeforeNext).not.toBe(preparation)
})

it('shows formats, limits and conditional requirements before listing', () => {
  render(<ListingChecklist />)
  expect(screen.getByText('PAN card')).toBeVisible()
  expect(screen.getByText('Aadhaar / ID proof')).toBeVisible()
  expect(screen.queryByText('FSSAI license')).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'private_limited' } })
  expect(screen.getByText('Board resolution')).toBeVisible()
  expect(screen.getByText('GST certificate')).toBeVisible()
  expect(screen.queryByText('Aadhaar / ID proof')).not.toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Restaurant, bar or room service'))
  expect(screen.getByText('FSSAI license')).toBeVisible()
  expect(screen.getByText(/PDF, JPG or PNG, up to 10 MB/)).toBeVisible()
})
it('uses entity-specific requirements including LLP and partnership documents', () => {
  expect(documentRequirements('llp').map(d => d.type)).toContain('llp_agreement')
  expect(documentRequirements('partnership').map(d => d.type)).toContain('partnership_deed')
  expect(documentRequirements('individual').find(d => d.type === 'fire_safety_cert')?.required).toBe(true)
})
