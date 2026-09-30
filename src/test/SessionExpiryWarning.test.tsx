import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import axios, { AxiosError } from 'axios'
import { SessionExpiryWarning } from '@/components/shared/SessionExpiryWarning'
import { refreshSession } from '@/lib/refresh-session'
import { useAuthStore } from '@/store/auth.store'
import { useOnboardingStore } from '@/store/onboarding.store'
import type { User } from '@/types'

const navigate = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
const jwt = (seconds: number) => 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })) + '.signature'
let session = 0
beforeEach(() => {
  vi.useFakeTimers()
  navigate.mockClear()
  useAuthStore.setState({ user: { id: 'owner' } as User, token: jwt(-5), refreshToken: 'refresh-' + ++session, isAuthenticated: true })
  useOnboardingStore.getState().reset()
  useOnboardingStore.getState().saveStepData(6, { accountHolderName: 'Owner' })
})
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

it('Stay logged in recovers after a temporary failure without losing the form', async () => {
  const next = jwt(900)
  const post = vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce({ data: { accessToken: next, refreshToken: 'rotated' } })
  await act(async () => { render(<SessionExpiryWarning />) })
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(screen.queryByText('0:00')).not.toBeInTheDocument()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Stay logged in' })) })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(useAuthStore.getState()).toMatchObject({ token: next, refreshToken: 'rotated', isAuthenticated: true })
  expect(useOnboardingStore.getState().stepData[6]?.accountHolderName).toBe('Owner')
  expect(navigate).not.toHaveBeenCalled()
  expect(post).toHaveBeenCalledTimes(2)
})

it('respects Retry-After across the dialog, automatic timer and other refresh callers, then recovers', async () => {
  const rateLimit = new AxiosError('Too many requests')
  rateLimit.response = { status: 429, data: {}, statusText: '', headers: { 'retry-after': '60' }, config: {} as never }
  const next = jwt(900)
  const post = vi.spyOn(axios, 'post').mockRejectedValueOnce(rateLimit)
    .mockResolvedValueOnce({ data: { accessToken: next, refreshToken: 'rotated' } })
  await act(async () => { render(<SessionExpiryWarning />) })
  expect(screen.getByRole('alert')).toHaveTextContent('temporarily limited')
  expect(screen.getByRole('button', { name: 'Retrying in 60s' })).toBeDisabled()
  await expect(refreshSession()).rejects.toThrow('temporarily limited')
  await act(async () => { await vi.advanceTimersByTimeAsync(59000) })
  expect(post).toHaveBeenCalledTimes(1)
  expect(useAuthStore.getState().isAuthenticated).toBe(true)
  await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
  expect(post).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(useOnboardingStore.getState().stepData[6]?.accountHolderName).toBe('Owner')
  expect(navigate).not.toHaveBeenCalled()
})

it('keeps Stay logged in pending while rotation crosses the access-token deadline', async () => {
  useAuthStore.setState({ token: jwt(1) })
  let resolve!: (value: unknown) => void
  vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('Offline'))
    .mockImplementationOnce(() => new Promise(done => { resolve = done }))
  await act(async () => { render(<SessionExpiryWarning />) })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Stay logged in' })) })
  await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
  expect(screen.getByRole('button', { name: 'Extending session…' })).toBeDisabled()
  expect(useAuthStore.getState().isAuthenticated).toBe(true)
  await act(async () => { resolve({ data: { accessToken: jwt(900), refreshToken: 'rotated' } }) })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(navigate).not.toHaveBeenCalled()
})

it('Log out deliberately ends the session', async () => {
  vi.spyOn(axios, 'post').mockRejectedValue(new Error('Offline'))
  const revoke = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
  await act(async () => { render(<SessionExpiryWarning />) })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Log out' })) })
  expect(useAuthStore.getState().isAuthenticated).toBe(false)
  expect(revoke).toHaveBeenCalledTimes(1)
  expect(navigate).toHaveBeenCalledWith({ to: '/login' })
})

it('redirects to login when automatic renewal confirms the refresh session was revoked', async () => {
  vi.spyOn(axios, 'post').mockRejectedValue({ response: { status: 401 } })
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
  await act(async () => { render(<SessionExpiryWarning />) })
  expect(useAuthStore.getState().isAuthenticated).toBe(false)
  expect(navigate).toHaveBeenCalledWith({ to: '/login' })
})
