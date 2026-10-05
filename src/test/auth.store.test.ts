import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore, selectOnboardingStatus, selectIsApproved, selectRole } from '@/store/auth.store'
import type { User } from '@/types'

const mockOwner: User = {
  id: 'u1', name: 'Ravi Sharma', email: 'owner@demo.com', phone: '+91 98765 43210',
  role: 'owner', avatarInitials: 'RS', onboardingStatus: 'in_progress', onboardingStep: 1,
}

describe('auth.store', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it('starts unauthenticated', () => {
    const { isAuthenticated, user, token } = useAuthStore.getState()
    expect(isAuthenticated).toBe(false)
    expect(user).toBeNull()
    expect(token).toBeNull()
  })

  it('setAuth authenticates the user', () => {
    useAuthStore.getState().setAuth(mockOwner, 'token123')
    const { isAuthenticated, user, token } = useAuthStore.getState()
    expect(isAuthenticated).toBe(true)
    expect(user?.email).toBe('owner@demo.com')
    expect(token).toBe('token123')
  })

  it('logout clears auth state', () => {
    useAuthStore.getState().setAuth(mockOwner, 'token123')
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('updateOnboardingStatus updates status and step', () => {
    useAuthStore.getState().setAuth(mockOwner, 'tok')
    useAuthStore.getState().updateOnboardingStatus('submitted', 7)
    const { user } = useAuthStore.getState()
    expect(user?.onboardingStatus).toBe('submitted')
    expect(user?.onboardingStep).toBe(7)
  })

  it('checkTokenExpiry returns false when no token', () => {
    expect(useAuthStore.getState().checkTokenExpiry()).toBe(false)
  })

  it('checkTokenExpiry returns true for a valid (non-expired) token', () => {
    const futureExp = Date.now() + 86_400_000
    const payload = btoa(JSON.stringify({ sub: 'u1', exp: futureExp }))
    const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`
    useAuthStore.getState().setAuth(mockOwner, token)
    expect(useAuthStore.getState().checkTokenExpiry()).toBe(true)
  })

  it('checkTokenExpiry returns false and logs out for expired token', () => {
    // JWT exp is in seconds since epoch — must use Math.floor(Date.now() / 1000)
    const pastExp = Math.floor(Date.now() / 1000) - 60  // 60 seconds ago
    const payload = btoa(JSON.stringify({ sub: 'u1', exp: pastExp }))
    const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`
    useAuthStore.getState().setAuth(mockOwner, token)
    const result = useAuthStore.getState().checkTokenExpiry()
    expect(result).toBe(false)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('updateOnboardingStatus without step keeps existing step', () => {
    useAuthStore.getState().setAuth(mockOwner, 'tok')
    useAuthStore.getState().updateOnboardingStatus('submitted')
    expect(useAuthStore.getState().user?.onboardingStep).toBe(1)
  })

  it('keeps an expired access session available for renewal', () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }))
    useAuthStore.getState().setAuth(mockOwner, `header.${payload}.signature`, false, 'refresh')
    expect(useAuthStore.getState().checkTokenExpiry()).toBe(false)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().refreshToken).toBe('refresh')
  })

  it('updateOnboardingStatus when user is null keeps null', () => {
    useAuthStore.getState().updateOnboardingStatus('submitted', 3)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('selectOnboardingStatus returns not_started when no user', () => {
    expect(selectOnboardingStatus(useAuthStore.getState())).toBe('not_started')
  })

  it('selectIsApproved returns true when status is approved', () => {
    const approved = { ...mockOwner, onboardingStatus: 'approved' as const }
    useAuthStore.getState().setAuth(approved, 'tok')
    expect(selectIsApproved(useAuthStore.getState())).toBe(true)
  })

  it('selectIsApproved returns false when status is not approved', () => {
    useAuthStore.getState().setAuth(mockOwner, 'tok')
    expect(selectIsApproved(useAuthStore.getState())).toBe(false)
  })

  it('selectRole returns null when no user', () => {
    expect(selectRole(useAuthStore.getState())).toBeNull()
  })
})
