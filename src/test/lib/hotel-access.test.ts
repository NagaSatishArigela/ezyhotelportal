import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { withMembership, canAccessHotelRoute } from '@/lib/hotel-access'
import { requireAuth, requireApproved, requireSuperAdmin } from '@/lib/guardHelpers'
import { usePermission, useHasAnyPermission } from '@/hooks/usePermission'
import { useAuthStore } from '@/store/auth.store'
import { useOnboardingStore } from '@/store/onboarding.store'
import type { User, HotelMembership } from '@/types'
const user: User = {
  id: 'user-1',
  name: 'User',
  email: 'u@test.com',
  phone: '',
  role: 'applicant',
  avatarInitials: 'U',
}
const hotel: HotelMembership = {
  propertyId: 'hotel-1',
  name: 'Hotel',
  status: 'approved',
  isActive: true,
  isApplicant: false,
  role: 'STAFF',
  roleName: 'Reception',
  permissions: ['view_bookings', 'check_in_out'],
}
beforeEach(() => {
  useAuthStore.getState().logout()
  useOnboardingStore.getState().reset()
})
describe('property-scoped access', () => {
  it('keeps users without membership as applicants', () => {
    const applicant = withMembership(user)
    expect(applicant.role).toBe('applicant')
    expect(canAccessHotelRoute(applicant, '/owner/access')).toBe(true)
    expect(canAccessHotelRoute(applicant, '/owner/bookings')).toBe(false)
  })
  it.each(['draft', 'pending_review', 'needs_revision', 'rejected', 'suspended'])(
    'denies operations for %s',
    (status) => {
      const applicant = withMembership(user, { ...hotel, status, role: null, isApplicant: true })
      expect(canAccessHotelRoute(applicant, '/owner/bookings')).toBe(false)
      expect(applicant.role).toBe('applicant')
    }
  )
  it('uses explicit permissions without promoting hotel admins to platform admins', () => {
    const staff = withMembership(user, { ...hotel, role: 'HOTEL_ADMIN' })
    expect(staff.role).toBe('hotel_admin')
    expect(canAccessHotelRoute(staff, '/owner/bookings')).toBe(true)
    expect(canAccessHotelRoute(staff, '/owner/team')).toBe(false)
    useAuthStore.getState().setAuth(staff, 'token')
    expect(() => requireAuth('owner')).not.toThrow()
    expect(() => requireAuth('admin')).toThrow()
    expect(() => requireSuperAdmin()).toThrow()
  })
  it('replaces permissions when switching properties or removing membership', () => {
    const staff = withMembership(user, hotel)
    const other = withMembership(staff, {
      ...hotel,
      propertyId: 'hotel-2',
      permissions: ['view_availability'],
    })
    expect(canAccessHotelRoute(other, '/owner/bookings')).toBe(false)
    expect(canAccessHotelRoute(other, '/owner/availability')).toBe(true)
    expect(withMembership(other).permissions).toEqual([])
  })
  it('fails closed for legacy roles without server permissions', () => {
    expect(
      canAccessHotelRoute({ ...user, role: 'owner', onboardingStatus: 'approved' }, '/owner/team')
    ).toBe(false)
  })
  it('guards direct navigation and both permission hooks', () => {
    useAuthStore.getState().setAuth(withMembership(user, hotel), 'token')
    expect(() => requireApproved('/owner/bookings')).not.toThrow()
    expect(() => requireApproved('/owner/settings')).toThrow()
    expect(renderHook(() => usePermission('check_in_out')).result.current).toBe(true)
    expect(
      renderHook(() => useHasAnyPermission(['manage_rooms', 'manage_staff'])).result.current
    ).toBe(false)
  })
  it('keeps super admin in its own workspace with platform permissions', () => {
    useAuthStore.getState().setAuth({ ...user, role: 'super_admin' }, 'token')
    expect(() => requireAuth('admin')).toThrow()
    expect(() => requireAuth('support')).toThrow()
    expect(renderHook(() => usePermission('approve_property')).result.current).toBe(true)
  })
  it('clears draft data when selecting another property', () => {
    const store = useOnboardingStore.getState()
    store.bindOwner(user.id, 'hotel-1')
    store.saveStepData(1, { name: 'First hotel' })
    store.bindOwner(user.id, 'hotel-2')
    expect(useOnboardingStore.getState().stepData).toEqual({})
    expect(useOnboardingStore.getState().draftId).toBe('hotel-2')
  })
})

it.each(['not_started', 'in_progress', 'revision_requested'] as const)('allows applicant onboarding for %s without granting operations', (onboardingStatus) => {
  const applicant = { ...user, onboardingStatus }
  expect(canAccessHotelRoute(applicant, '/owner/onboarding/step2')).toBe(true)
  expect(canAccessHotelRoute(applicant, '/owner/bookings')).toBe(false)
})
it.each(['submitted', 'approved', 'rejected'] as const)('locks onboarding for %s', (onboardingStatus) => {
  expect(canAccessHotelRoute({ ...user, onboardingStatus }, '/owner/onboarding/step2')).toBe(false)
})

it.each(['admin', 'support', 'super_admin'] as const)('isolates the %s workspace', (role) => {
  useAuthStore.getState().setAuth({ ...user, role }, 'token')
  for (const workspace of ['admin', 'support', 'super_admin', 'owner'] as const) {
    if (workspace === role) expect(() => requireAuth(workspace)).not.toThrow()
    else expect(() => requireAuth(workspace)).toThrow()
  }
})
