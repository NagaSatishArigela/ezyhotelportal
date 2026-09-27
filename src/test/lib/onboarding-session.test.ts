import { beforeEach, expect, it, vi } from 'vitest'
import { ensureApplicationDraft, restoreApplication, submitApplication } from '@/lib/onboarding-session'
import { restorePortalSteps } from '@/lib/onboarding-restore'
import { useAuthStore } from '@/store/auth.store'
import { useOnboardingStore } from '@/store/onboarding.store'
import { queryClient } from '@/lib/queryClient'
import { createPropertyDraft, getPropertyDraft, type PropertyDraft } from '@/lib/portal-api'
import { api } from '@/lib/api'
import type { User } from '@/types'
vi.mock('@/lib/portal-api', () => ({ createPropertyDraft: vi.fn(), getPropertyDraft: vi.fn() }))
vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))
const user: User = { id: 'u1', name: 'Owner', email: 'owner@test.com', phone: '9876543210', role: 'applicant', avatarInitials: 'O', propertyId: 'p1', onboardingStatus: 'in_progress' }
const draft: PropertyDraft = { propertyId: 'p1', status: 'draft', draftStep: 5, draftData: {
  step1: { propertyName: 'Saved hotel', ownerFirstName: 'Ravi', ownerLastName: 'Kumar', businessEntity: 'individual', category: 'mid', bookingPolicy: 'hourly' },
  step2: { addressLine1: 'Saved address', city: 'Hyderabad', latitude: 17, longitude: 78 },
  step3: { rooms: [{ type: 'ac', count: 2, hourlyRate: 500, maxOccupancy: 2 }], amenities: ['wifi'], minBookingHours: '2' },
  step4: { photos: [{ category: 'exterior', url: 'https://files.test/photo.jpg', isPrimary: true }] },
}, compliance: { legalBusinessName: 'Business', gstinMasked: null, panMasked: '****1234F', bankAccountNumberMasked: '****6789', ifsc: 'HDFC0000123', accountHolderName: 'Ravi Kumar', documents: [{ type: 'fire_safety_cert', status: 'pending', expiresAt: null }] } }
beforeEach(() => {
  vi.clearAllMocks(); queryClient.clear(); useOnboardingStore.getState().reset()
  useAuthStore.getState().setAuth(user, 'token')
  vi.mocked(getPropertyDraft).mockResolvedValue(draft)
  vi.mocked(api.get).mockResolvedValue({ data: {} })
})
it('restores all server sections without placing masked values into editable fields', () => {
  const steps = restorePortalSteps(draft)
  expect(steps[1]).toMatchObject({ ownerName: 'Ravi Kumar', businessName: 'Business' })
  expect(steps[2]).toMatchObject({ propertyName: 'Saved hotel', address: 'Saved address', minBookingHours: 2 })
  expect(steps[3]?.photos).toEqual([expect.objectContaining({ url: 'https://files.test/photo.jpg', isPrimary: true })])
  expect(steps[4]?.rooms).toEqual([expect.objectContaining({ hourlyRate: 500 })])
  expect(steps[6]).not.toHaveProperty('pan'); expect(steps[6]).not.toHaveProperty('accountNumber')
  expect(steps[1]).not.toHaveProperty('gstNumber')
})
it('restores another property without mixing the previous property data', async () => {
  useOnboardingStore.setState({ ownerId: 'u1', draftId: 'other', stepData: { 1: { ownerName: 'Wrong owner' }, 2: { propertyName: 'Wrong hotel' } } })
  await restoreApplication('p1')
  expect(useOnboardingStore.getState().stepData[2]?.propertyName).toBe('Saved hotel')
  expect(useOnboardingStore.getState().useSavedCompliance).toBe(true)
})
it('restores incomplete forms from the encrypted server snapshot after local state is cleared', async () => {
  vi.mocked(api.get).mockResolvedValueOnce({ data: { 1: { ownerName: 'Draft owner' }, 5: { docUrls: { pan: 'https://api.test/private-document' } }, 6: { accountNumber: '123456789', bankName: 'Draft bank' } } })
  await restoreApplication('p1')
  expect(useOnboardingStore.getState().stepData[1]?.ownerName).toBe('Draft owner')
  expect(useOnboardingStore.getState().stepData[6]?.accountNumber).toBe('123456789')
  expect(localStorage.getItem('stayflex-onboarding')).not.toContain('123456789')
})
it('preserves unsaved local data for the same user and application', async () => {
  useOnboardingStore.getState().saveStepData(2, { propertyName: 'Unsaved change' })
  await restoreApplication('p1')
  expect(useOnboardingStore.getState().stepData[2]?.propertyName).toBe('Unsaved change')
})
it('does not replace current application data when restoration fails', async () => {
  vi.mocked(getPropertyDraft).mockRejectedValueOnce(new Error('offline'))
  useOnboardingStore.getState().saveStepData(2, { propertyName: 'Unsaved' })
  await expect(restoreApplication('p1')).rejects.toThrow('offline')
  expect(useOnboardingStore.getState().restoredDraftId).toBeNull()
  expect(useOnboardingStore.getState().stepData[2]?.propertyName).toBe('Unsaved')
})
it('ignores a delayed draft response after selecting another hotel', async () => {
  let resolve!: (value: PropertyDraft) => void
  vi.mocked(getPropertyDraft).mockReturnValueOnce(new Promise(r => { resolve = r }))
  const pending = restoreApplication('p1')
  useAuthStore.getState().setUser({ ...user, propertyId: 'p2' })
  resolve(draft)
  await expect(pending).rejects.toThrow('Application changed')
  expect(useAuthStore.getState().user?.propertyId).toBe('p2')
})
it('selects a newly created application and deduplicates concurrent saves', async () => {
  useOnboardingStore.getState().reset(); useAuthStore.getState().setUser({ ...user, propertyId: undefined })
  vi.mocked(createPropertyDraft).mockResolvedValueOnce('new')
  expect(await Promise.all([ensureApplicationDraft(), ensureApplicationDraft()])).toEqual(['new', 'new'])
  expect(createPropertyDraft).toHaveBeenCalledTimes(1)
  expect(useAuthStore.getState().user).toMatchObject({ propertyId: 'new', role: 'applicant', onboardingStatus: 'in_progress', permissions: [] })
  expect(queryClient.getQueryData(['hotel-memberships', 'u1'])).toEqual([expect.objectContaining({ propertyId: 'new', status: 'draft' })])
})
it('does not bind an old draft creation response after starting another application', async () => {
  useOnboardingStore.getState().reset()
  let resolve!: (value: string) => void
  vi.mocked(createPropertyDraft).mockReturnValueOnce(new Promise(r => { resolve = r }))
  const pending = ensureApplicationDraft()
  useOnboardingStore.getState().reset(); resolve('old')
  await expect(pending).rejects.toThrow('Application changed')
  expect(useOnboardingStore.getState().draftId).toBeNull()
})
it.each([['in_progress', 'post', '/submit'], ['revision_requested', 'patch', '/revise']] as const)('submits %s through the correct API and updates visible status', async (status, method, suffix) => {
  useAuthStore.getState().setUser({ ...user, onboardingStatus: status })
  vi.mocked(api[method]).mockResolvedValueOnce({ data: { status: 'pending_review' } })
  await submitApplication()
  expect(api[method]).toHaveBeenCalledWith('/properties/p1' + suffix)
  expect(useAuthStore.getState().user).toMatchObject({ onboardingStatus: 'submitted', propertyId: 'p1', permissions: [] })
})
