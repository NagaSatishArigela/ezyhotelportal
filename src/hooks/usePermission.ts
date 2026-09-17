import { useAuthStore } from '@/store/auth.store'
import { hasPermission, APPROVAL_GATED } from '@/lib/permissions'
import { HOTEL_ROUTE_PERMISSIONS } from '@/lib/hotel-access'
import type { Permission, User } from '@/types'

const hotelPermissions = new Set([...Object.values(HOTEL_ROUTE_PERMISSIONS), 'check_in_out'])
function allowed(user: User | null, permission: Permission): boolean {
  if (!user) return false
  if (['admin', 'super_admin', 'support'].includes(user.role))
    return hasPermission(user.role, permission)
  if (hotelPermissions.has(permission))
    return user.onboardingStatus === 'approved' && !!user.permissions?.includes(permission)
  if (APPROVAL_GATED.has(permission) && user.onboardingStatus !== 'approved') return false
  return hasPermission(user.role, permission)
}
export function usePermission(permission: Permission): boolean {
  return allowed(
    useAuthStore((s) => s.user),
    permission
  )
}
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const user = useAuthStore((s) => s.user)
  return permissions.some((permission) => allowed(user, permission))
}
