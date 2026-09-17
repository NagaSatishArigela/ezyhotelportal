import { canAccessHotelRoute } from './hotel-access'
import { redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'
import type { Role } from '@/types'

/**
 * Call at the top of any protected route's beforeLoad.
 * Redirects to /login if unauthenticated or token expired.
 * Does NOT call logout() — avoids Zustand state mutation inside beforeLoad.
 */
export function requireAuth(role?: Role) {
  const { isAuthenticated, user, token } = useAuthStore.getState()

  if (!isAuthenticated || !token || !user) {
    throw redirect({ to: '/login' })
  }

  const hotelRoles: Role[] = ['owner', 'applicant', 'hotel_admin', 'manager', 'staff']
  if (
    role &&
    user.role !== role &&
    !(role === 'owner' && hotelRoles.includes(user.role)) &&
    !(user.role === 'super_admin' && (role === 'admin' || role === 'support'))
  ) {
    throw redirect({ to: '/login' })
  }
}

export function requireApproved(route?: string) {
  const { user } = useAuthStore.getState()
  if (route && !canAccessHotelRoute(user, route)) throw redirect({ to: '/owner/access' })
  if (user?.onboardingStatus !== 'approved') {
    throw redirect({ to: '/owner/status' })
  }
}

export function requireSuperAdmin() {
  const { isAuthenticated, user, token } = useAuthStore.getState()
  if (!isAuthenticated || !token || !user) {
    throw redirect({ to: '/login' })
  }
  if (user.role !== 'super_admin') {
    throw redirect({ to: '/login' })
  }
}
