import type { HotelMembership, User } from '@/types'
export const HOTEL_ROUTE_PERMISSIONS: Record<string, string> = {
  dashboard: 'view_dashboard',
  bookings: 'view_bookings',
  availability: 'view_availability',
  rooms: 'manage_rooms',
  analytics: 'view_analytics',
  reviews: 'manage_reviews',
  disputes: 'manage_disputes',
  settings: 'manage_settings',
  team: 'manage_staff',
}
export function withMembership(
  user: User,
  membership?: HotelMembership,
  memberships = user.memberships
): User {
  const status = membership?.status
  const onboardingStatus = !status
    ? 'not_started'
    : status === 'draft'
      ? 'in_progress'
      : status === 'pending_review'
        ? 'submitted'
        : status === 'needs_revision'
          ? 'revision_requested'
          : status === 'escalated'
            ? 'under_review'
            : (status as User['onboardingStatus'])
  const role =
    membership?.role === 'OWNER'
      ? 'owner'
      : membership?.role === 'HOTEL_ADMIN'
        ? 'hotel_admin'
        : membership?.role === 'MANAGER'
          ? 'manager'
          : membership?.role === 'STAFF'
            ? 'staff'
            : 'applicant'
  return {
    ...user,
    role,
    propertyId: membership?.propertyId,
    permissions: membership?.permissions ?? [],
    memberships,
    onboardingStatus,
  }
}
export function canAccessHotelRoute(user: User | null, route: string): boolean {
  if (!user) return false
  if (route === '/owner/onboarding' || route.startsWith('/owner/onboarding/')) {
    return (user.role === 'applicant' || user.role === 'owner') &&
      ['not_started', 'in_progress', 'revision_requested'].includes(user.onboardingStatus ?? '')
  }
  const page = route.split('/').filter(Boolean).pop() ?? ''
  if (page === 'access') return true
  if (page === 'status') return user.role === 'owner' || user.role === 'applicant'
  if (user.onboardingStatus !== 'approved') return false
  if (page === 'payouts' || page === 'notifications') return user.role === 'owner'
  const permission = HOTEL_ROUTE_PERMISSIONS[page]
  return !!permission && (user.permissions?.includes(permission) ?? false)
}
