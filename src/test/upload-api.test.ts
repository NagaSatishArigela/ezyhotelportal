import { beforeEach, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { api } from '@/lib/api'
import { uploadFile } from '@/lib/portal-api'
import { useOnboardingStore } from '@/store/onboarding.store'

beforeEach(() => { vi.restoreAllMocks(); useOnboardingStore.getState().reset() })

it('surfaces the Railway nested 403 error without attempting a storage upload', async () => {
  const error = new AxiosError('Forbidden')
  error.response = { status: 403, data: { success: false, error: { message: 'Insufficient property role' } }, statusText: 'Forbidden', headers: {}, config: {} as never }
  vi.spyOn(api, 'post').mockRejectedValue(error)
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  await expect(uploadFile(new File(['jpg'], 'image.jpg', { type: 'image/jpeg' }), 'draft', 'photo')).rejects.toThrow('HTTP 403). Insufficient property role')
  expect(fetchSpy).not.toHaveBeenCalled()
})

it('rejects malformed presign replies instead of sending a file to an undefined URL', async () => {
  vi.spyOn(api, 'post').mockResolvedValue({ data: {} })
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  await expect(uploadFile(new File(['jpg'], 'image.jpg'), 'draft', 'photo')).rejects.toThrow('invalid upload URL')
  expect(fetchSpy).not.toHaveBeenCalled()
})

it('discards another account draft and adopts the property confirmed at login', () => {
  const store = useOnboardingStore.getState()
  store.bindOwner('owner-a', 'property-a')
  store.saveStepData(1, { ownerName: 'Owner A' })
  store.bindOwner('owner-b', 'property-b')
  expect(useOnboardingStore.getState()).toMatchObject({ ownerId: 'owner-b', draftId: 'property-b', stepData: {} })
})

it('retains a matching legacy draft and same-owner progress', () => {
  const store = useOnboardingStore.getState()
  store.setDraftId('property-a')
  store.saveStepData(1, { ownerName: 'Owner A' })
  store.bindOwner('owner-a', 'property-a')
  store.bindOwner('owner-a', 'property-a')
  expect(useOnboardingStore.getState().stepData[1]).toEqual({ ownerName: 'Owner A' })
})

it('clears a stale property when the server reports that the account has none', () => {
  const store = useOnboardingStore.getState()
  store.setDraftId('stale-property')
  store.bindOwner('new-owner')
  expect(useOnboardingStore.getState().draftId).toBeNull()
})
