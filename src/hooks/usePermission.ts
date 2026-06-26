import { useAuthStore, selectRole, selectIsApproved } from '@/store/auth.store'
import { hasPermission, APPROVAL_GATED } from '@/lib/permissions'
import type { Permission } from '@/types'

export function usePermission(permission: Permission): boolean {
  const role = useAuthStore(selectRole)
  const isApproved = useAuthStore(selectIsApproved)

  if (!role) return false
  if (!hasPermission(role, permission)) return false

  // Owner: certain features need approved status
  if (role === 'owner' && APPROVAL_GATED.has(permission) && !isApproved) {
    return false
  }

  return true
}

export function useHasAnyPermission(permissions: Permission[]): boolean {
  const role = useAuthStore(selectRole)
  const isApproved = useAuthStore(selectIsApproved)
  if (!role) return false
  return permissions.some((p) => {
    if (!hasPermission(role, p)) return false
    if (role === 'owner' && APPROVAL_GATED.has(p) && !isApproved) return false
    return true
  })
}
