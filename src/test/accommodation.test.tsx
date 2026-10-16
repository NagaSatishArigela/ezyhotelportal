import { beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { Step2RoomsPricing, Step4LegalTax } from '@/pages/owner/onboarding/OnboardingScreens'
import { useOnboardingStore } from '@/store/onboarding.store'
import { dormitorySchema, OTHER_FACILITIES, type DormitoryDetails, type OtherAccommodation } from '@/lib/accommodation'
import { completeServerSteps, isServerStepComplete, mapStep1, mapStep3 } from '@/lib/onboarding-mapping'

vi.mock('@/lib/portal-api', () => ({
  uploadFile: vi.fn(), saveOnboardingStep: vi.fn(), createPropertyDraft: vi.fn(),
  submitOnboarding: vi.fn(), verifyIFSC: vi.fn(), pennyDrop: vi.fn(), verifyPincode: vi.fn(),
}))
vi.mock('@/lib/save-application', () => ({ saveApplicationProgress: vi.fn().mockResolvedValue(undefined) }))

const facilities = {
  type: 'container_home', numberOfBeds: 3,
  ...Object.fromEntries(OTHER_FACILITIES.map(([key]) => [key, 'no'])),
} as OtherAccommodation
const dormitory: DormitoryDetails = {
  roomName: 'D-101', totalBeds: 24, bedLength: 200, bedWidth: 90,
  accommodationAllowedFor: 'Mixed-gender dormitory', category: 'Bunk-bed room',
  bedType: 'Single bunk', bedAllocation: 'Any available bed',
  sleepingArrangement: 'Shared room', attachedBathroom: 'No', bathroomType: 'Common',
  lockerAvailability: 'Individual locker', mattressType: 'Standard',
  chargingPoint: 'Each bed', readingLight: 'Shared', privacyScreen: 'Yes',
  linenProvided: ['Bedsheet', 'Pillow'],
}

beforeEach(() => useOnboardingStore.getState().reset())

it('shows the requested service order and reveals all Others facilities for each subtype', () => {
  render(<Step2RoomsPricing />)
  const others = screen.getByRole('button', { name: 'Others' })
  expect(within(others.parentElement!).getAllByRole('button').map((button) => button.textContent)).toEqual([
    'Hotels', 'Resorts', 'Villas', 'Guest Houses', 'Farm Houses', 'Homestays', 'PGs', 'Lodges', 'Dormitories', 'Banquet/Convention Hall', 'Others',
  ])
  expect(screen.queryByLabelText('Other accommodation facilities')).not.toBeInTheDocument()
  fireEvent.click(others)
  for (const type of ['container_home', 'tents_glamping', 'tree_house']) {
    fireEvent.change(screen.getByLabelText('Type of accommodation'), { target: { value: type } })
    for (const [, label] of OTHER_FACILITIES) expect(screen.getByLabelText(label)).toBeInTheDocument()
    expect(screen.getByLabelText('Number of beds').tagName).toBe('SELECT')
  }
  fireEvent.change(screen.getByLabelText('Windows are available'), { target: { value: 'no' } })
  expect(useOnboardingStore.getState().stepData[2]?.otherAccommodation).toMatchObject({ windows: 'no' })
  fireEvent.click(screen.getByRole('button', { name: 'Hotels' }))
  expect(screen.queryByLabelText('Other accommodation facilities')).not.toBeInTheDocument()
})

it('retains negative facility answers in API payloads and omits inactive Others details', () => {
  expect(mapStep1({ 2: { propertyType: 'other', otherAccommodation: facilities } }).otherAccommodation).toEqual(facilities)
  expect(mapStep1({ 2: { propertyType: 'hotel', otherAccommodation: facilities } })).not.toHaveProperty('otherAccommodation')
  expect(isServerStepComplete(1, { propertyType: 'other' })).toBe(false)
})

it.each(['guest_house', 'lodge', 'dormitory'])('preserves the new %s service in server mapping', (propertyType) => {
  expect(mapStep1({ 2: { propertyType } }).propertyType).toBe(propertyType)
})

it('preserves dormitory details and larger capacity through server mapping', () => {
  const rooms = [{ type: 'dorm', count: 1, maxOccupancy: 24, dormitory }]
  expect(mapStep3({ 4: { rooms } }).rooms?.[0]).toEqual(rooms[0])
  expect(dormitorySchema.safeParse(dormitory).success).toBe(true)
  expect(isServerStepComplete(3, { rooms: [{ type: 'dorm', count: 1 }], amenities: ['wifi'], houseRules: {} })).toBe(true)
})

it('shows dormitory specifications for dormitory properties and keeps values in the draft', () => {
  useOnboardingStore.getState().saveStepData(2, { propertyType: 'dormitory' })
  render(<Step4LegalTax />)
  fireEvent.click(screen.getByText('Standard room'))
  expect(screen.getByLabelText('Dormitory specifications')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Room number / name'), { target: { value: 'D-202' } })
  expect(useOnboardingStore.getState().stepData[4]?.rooms).toEqual([
    expect.objectContaining({ type: 'dorm', dormitory: expect.objectContaining({ roomName: 'D-202' }) }),
  ])
})


it('keeps a legacy dorm room optional until the owner adds specifications', async () => {
  useOnboardingStore.getState().saveStepData(2, { propertyType: 'hotel' })
  useOnboardingStore.getState().saveStepData(4, { rooms: [{ id: 'legacy', name: 'Old dorm', type: 'dorm', count: 1, maxOccupancy: 2, bedType: 'Single', amenities: [], hourlyRate: 500, fulldayRate: 1000 }] })
  render(<Step4LegalTax />)
  fireEvent.click(screen.getByText('Old dorm'))
  expect(screen.queryByLabelText('Dormitory specifications')).not.toBeInTheDocument()
  await act(async () => { await useOnboardingStore.getState().onBeforeNext?.() })
  fireEvent.click(screen.getByRole('button', { name: 'Add dormitory specifications' }))
  expect(screen.getByLabelText('Dormitory specifications')).toBeInTheDocument()
  await expect(useOnboardingStore.getState().onBeforeNext?.()).rejects.toThrow('Please fix')
})

it('does not persist incomplete opt-in specifications or invent details for legacy rooms', () => {
  const step1 = { ownerName: 'Ravi Kumar', businessEntity: 'individual', propertyCategory: 'mid' }
  const step2 = { propertyType: 'other', propertyName: 'Existing property', bookingPolicy: 'both' }
  expect(completeServerSteps({ 1: step1, 2: step2 }).some(({ step }) => step === 1)).toBe(true)
  expect(completeServerSteps({ 1: step1, 2: { ...step2, otherAccommodation: {} } }).some(({ step }) => step === 1)).toBe(false)
  expect(mapStep3({ 4: { rooms: [{ type: 'dorm', count: 1 }] } }).rooms?.[0]).not.toHaveProperty('dormitory')
})
