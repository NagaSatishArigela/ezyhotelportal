import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import axios from 'axios'
import { useSessionExpiry } from '@/hooks/useSessionExpiry'
import { useAuthStore } from '@/store/auth.store'
import type { User } from '@/types'
const jwt = (seconds: number) => 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })) + '.signature'
afterEach(() => vi.restoreAllMocks())
it('renews automatically before expiry without logging out or waiting for an API 401', async () => {
  useAuthStore.setState({ user: { id: 'owner' } as User, token: jwt(30), refreshToken: 'refresh', isAuthenticated: true })
  const next = jwt(900)
  const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: next, refreshToken: 'rotated' } })
  const expired = vi.fn()
  const { result } = renderHook(() => useSessionExpiry(expired))
  await waitFor(() => expect(useAuthStore.getState().token).toBe(next))
  expect(post).toHaveBeenCalledTimes(1)
  expect(expired).not.toHaveBeenCalled()
  expect(result.current.showWarning).toBe(false)
})
it('keeps an expired access session recoverable when refresh fails temporarily', async () => {
  useAuthStore.setState({ user: { id: 'owner' } as User, token: jwt(-5), refreshToken: 'refresh', isAuthenticated: true })
  vi.spyOn(axios, 'post').mockRejectedValue(new Error('Offline'))
  const expired = vi.fn()
  const { result } = renderHook(() => useSessionExpiry(expired))
  await act(async () => {})
  await waitFor(() => expect(result.current.showWarning).toBe(true))
  expect(expired).not.toHaveBeenCalled()
  expect(useAuthStore.getState().isAuthenticated).toBe(true)
})
