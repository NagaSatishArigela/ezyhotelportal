import { beforeEach, expect, it, vi } from 'vitest'
import { useOnboardingStore } from '@/store/onboarding.store'
import { useAuthStore } from '@/store/auth.store'
beforeEach(() => { useOnboardingStore.getState().reset(); localStorage.clear() })
it('keeps compliance in memory but never persists bank, PAN or document values', () => {
  useOnboardingStore.getState().saveStepData(6, { accountNumber: 'SECRET_ACCOUNT', pan: 'SECRET_PAN' })
  useOnboardingStore.getState().saveStepData(5, { documents: [{ url: 'SECRET_DOCUMENT' }] })
  useOnboardingStore.getState().saveStepData(1, { gstNumber: 'SECRET_GST' })
  expect(localStorage.getItem('stayflex-onboarding')).not.toContain('SECRET_')
  expect(useOnboardingStore.getState().stepData[6]?.pan).toBe('SECRET_PAN')
})
it('purges legacy compliance on rehydration and preserves property details', async () => {
  localStorage.setItem('stayflex-onboarding', JSON.stringify({ state: { stepData: { 2: { propertyName: 'Hotel' }, 6: { pan: 'LEGACY_SECRET' } }, savedCompliance: { pan: 'LEGACY_SECRET' } }, version: 0 }))
  await useOnboardingStore.persist.rehydrate()
  expect(localStorage.getItem('stayflex-onboarding')).not.toContain('LEGACY_SECRET')
  expect(useOnboardingStore.getState().stepData[6]).toBeUndefined()
  expect(useOnboardingStore.getState().stepData[2]?.propertyName).toBe('Hotel')
})
it('clears both memory and persisted draft on logout', () => {
  useOnboardingStore.getState().saveStepData(6, { pan: 'SECRET' })
  useAuthStore.getState().logout()
  expect(useOnboardingStore.getState().stepData).toEqual({})
  expect(localStorage.getItem('stayflex-onboarding')).toBeNull()
})
it('requests backend refresh-session revocation on logout', () => {
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
  useAuthStore.getState().setRefreshToken('refresh-token')
  useAuthStore.getState().logout()
  expect(request).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST', body: JSON.stringify({ refreshToken: 'refresh-token' }) }))
  request.mockRestore()
})
