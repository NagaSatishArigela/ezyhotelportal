import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { Step2RoomsPricing } from '@/pages/owner/onboarding/OnboardingScreens'
import { OwnerSettingsPage } from '@/pages/owner/portal/OwnerPortalPages'
import { ownerSettingsApi, type OwnerSettings } from '@/lib/api/ownerSettings'
import { useOnboardingStore } from '@/store/onboarding.store'

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { propertyId: 'property' } }) }))
vi.mock('@/lib/api/ownerSettings', () => ({ ownerSettingsApi: { get: vi.fn(), update: vi.fn() } }))
vi.mock('@/lib/portal-api', () => ({
  createPropertyDraft: vi.fn().mockResolvedValue('draft'), saveOnboardingStep: vi.fn().mockResolvedValue({}),
  submitOnboarding: vi.fn(), verifyIFSC: vi.fn(), pennyDrop: vi.fn(), uploadFile: vi.fn(), verifyPincode: vi.fn(),
}))

let settings: OwnerSettings
beforeEach(() => {
  vi.clearAllMocks()
  useOnboardingStore.getState().reset()
  settings = { receptionMobile: null, receptionLandline: null, defaultCheckinTime: '12:00', defaultCheckoutTime: '11:00', minBookingHours: 2, isActive: true, houseRules: {} }
  vi.mocked(ownerSettingsApi.get).mockImplementation(async () => ({ ...settings }))
  vi.mocked(ownerSettingsApi.update).mockImplementation(async (_property, body) => {
    settings = { ...settings, ...body }
    return { ...settings }
  })
})

it.each([['boutique', 'hotel'], ['service_apt', 'homestay']])('resumes a legacy %s draft as %s without blocking Continue', async (legacy, canonical) => {
  useOnboardingStore.getState().saveStepData(2, {
    propertyType: legacy, propertyName: 'Legacy property', address: '123 Main Street', addressLine2: 'Near City Station',
    city: 'Delhi', state: 'Delhi', pincode: '110001', description: 'A comfortable centrally located property.',
    amenities: ['wifi', 'ac', 'parking'], receptionMobile: '9876543210', receptionLandline: '',
  })
  render(<Step2RoomsPricing />)
  await act(async () => { await useOnboardingStore.getState().onBeforeNext?.() })
  expect(useOnboardingStore.getState().stepData[2]).toMatchObject({ propertyType: canonical, propertyName: 'Legacy property' })
})

function renderSettings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(<QueryClientProvider client={client}><OwnerSettingsPage /></QueryClientProvider>)
  return { ...view, client }
}

it('allows an existing owner to pause the listing and change defaults without a reception number', async () => {
  const { client } = renderSettings()
  await screen.findByLabelText('Office Reception mobile number')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.change(screen.getByLabelText('Default check-in'), { target: { value: '10:00' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(ownerSettingsApi.update).toHaveBeenCalledWith('property', expect.objectContaining({ isActive: false, defaultCheckinTime: '10:00' })))
  expect(vi.mocked(ownerSettingsApi.update).mock.calls[0][1]).not.toHaveProperty('receptionMobile')
  expect(vi.mocked(ownerSettingsApi.update).mock.calls[0][1]).not.toHaveProperty('receptionLandline')
  client.clear()
})

it('validates contact saves separately and preserves unsaved booking defaults when contacts are saved', async () => {
  const { client } = renderSettings()
  const mobile = await screen.findByLabelText('Office Reception mobile number')
  fireEvent.click(screen.getByRole('button', { name: 'Save reception contact' }))
  await screen.findByText('Enter a valid 10-digit reception mobile number')
  expect(ownerSettingsApi.update).not.toHaveBeenCalled()
  fireEvent.change(mobile, { target: { value: '+91 98765 43210' } })
  fireEvent.change(screen.getByLabelText('Reception landline number'), { target: { value: '080 23456789' } })
  fireEvent.change(screen.getByLabelText('Default check-in'), { target: { value: '10:00' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save reception contact' }))
  await waitFor(() => expect(ownerSettingsApi.update).toHaveBeenCalledWith('property', { receptionMobile: '9876543210', receptionLandline: '08023456789' }))
  await waitFor(() => expect(ownerSettingsApi.get).toHaveBeenCalledTimes(2))
  expect(screen.getByLabelText('Default check-in')).toHaveValue('10:00')
  client.clear()
})
