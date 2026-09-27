import { beforeEach, expect, it, vi } from 'vitest'
import { saveApplicationProgress } from '@/lib/save-application'
import { api } from '@/lib/api'
import { saveOnboardingStep } from '@/lib/portal-api'
import { useOnboardingStore } from '@/store/onboarding.store'
import { useAuthStore } from '@/store/auth.store'
import type { User } from '@/types'
vi.mock('@/lib/api', () => ({ api: { patch: vi.fn() } }))
vi.mock('@/lib/portal-api', () => ({ saveOnboardingStep: vi.fn() }))
vi.mock('@/lib/onboarding-session', () => ({ ensureApplicationDraft: vi.fn().mockResolvedValue('draft') }))
beforeEach(() => {
  vi.clearAllMocks()
  useOnboardingStore.getState().reset()
  useAuthStore.setState({ user: { id: 'owner' } as User })
  vi.mocked(api.patch).mockResolvedValue({ data: { saved: true } })
})
it('saves incomplete form and document data even when no canonical step is complete', async () => {
  useOnboardingStore.getState().saveStepData(6, { bankName: 'Draft bank' })
  useOnboardingStore.getState().saveStepData(5, { docUrls: { pan: 'private-file' } })
  await saveApplicationProgress()
  expect(api.patch).toHaveBeenCalledWith('/properties/draft/application-state', { 5: { docUrls: { pan: 'private-file' } }, 6: { bankName: 'Draft bank' } })
  expect(saveOnboardingStep).not.toHaveBeenCalled()
})
it('serializes snapshots from different screens in editing order', async () => {
  let finish!: (value: unknown) => void
  vi.mocked(api.patch).mockImplementationOnce(() => new Promise(r => { finish = r }))
  useOnboardingStore.getState().saveStepData(1, { ownerName: 'Old' })
  const first = saveApplicationProgress()
  await vi.waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))
  useOnboardingStore.getState().saveStepData(1, { ownerName: 'Latest' })
  const second = saveApplicationProgress()
  expect(api.patch).toHaveBeenCalledTimes(1)
  finish({ data: { saved: true } })
  await Promise.all([first, second])
  expect(vi.mocked(api.patch).mock.calls[1][1]).toEqual({ 1: { ownerName: 'Latest' } })
})

it('keeps partial step 1 in the draft without calling a canonical endpoint too early', async () => {
  useOnboardingStore.getState().saveStepData(1, {
    ownerName: "O'Neil #1",
    businessEntity: 'individual',
    propertyCategory: 'mid',
  })

  await saveApplicationProgress(1)

  expect(api.patch).toHaveBeenCalledWith('/properties/draft/application-state', expect.objectContaining({
    1: expect.objectContaining({ ownerName: "O'Neil #1" }),
  }))
  expect(saveOnboardingStep).not.toHaveBeenCalled()
})

it('checkpoints a canonical step once its payload is complete', async () => {
  useOnboardingStore.getState().saveStepData(3, {
    photos: [{ category: 'exterior', url: 'https://files.example/exterior.jpg', isPrimary: true }],
  })

  await saveApplicationProgress(3)

  expect(saveOnboardingStep).toHaveBeenCalledWith('draft', 4, {
    photos: [{
      category: 'exterior',
      url: 'https://files.example/exterior.jpg',
      sortOrder: 0,
      isPrimary: true,
    }],
  })
})
