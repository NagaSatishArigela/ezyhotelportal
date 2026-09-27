import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import axios from 'axios'
import { refreshSession } from '@/lib/refresh-session'
import { useAuthStore } from '@/store/auth.store'
import { useOnboardingStore } from '@/store/onboarding.store'
import type { User } from '@/types'
const user = { id: 'owner', role: 'applicant' } as User
beforeEach(() => { useAuthStore.setState({ user, token: 'old', refreshToken: 'refresh', isAuthenticated: true }); useOnboardingStore.getState().reset() })
afterEach(() => vi.restoreAllMocks())
it('deduplicates concurrent session extension and API refresh requests', async () => {
  const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'new', refreshToken: 'rotated' } })
  expect(await Promise.all([refreshSession(), refreshSession(), refreshSession()])).toEqual(['new', 'new', 'new'])
  expect(post).toHaveBeenCalledTimes(1)
  expect(useAuthStore.getState()).toMatchObject({ token: 'new', refreshToken: 'rotated' })
})
it('retains authentication and form data on a temporary refresh failure', async () => {
  useOnboardingStore.getState().saveStepData(6, { accountHolderName: 'Owner' })
  vi.spyOn(axios, 'post').mockRejectedValue({ response: { status: 503 } })
  await expect(refreshSession()).rejects.toMatchObject({ response: { status: 503 } })
  expect(useAuthStore.getState().isAuthenticated).toBe(true)
  expect(useOnboardingStore.getState().stepData[6]?.accountHolderName).toBe('Owner')
})
it('does not overwrite another login when an old refresh completes', async () => {
  let resolve!: (value: unknown) => void
  vi.spyOn(axios, 'post').mockImplementation(() => new Promise(r => { resolve = r }))
  const pending = refreshSession()
  useAuthStore.setState({ user: { ...user, id: 'another' }, token: 'other', refreshToken: 'other-refresh' })
  resolve({ data: { accessToken: 'stale', refreshToken: 'stale-refresh' } })
  await expect(pending).rejects.toThrow('Session changed')
  expect(useAuthStore.getState().token).toBe('other')
})
