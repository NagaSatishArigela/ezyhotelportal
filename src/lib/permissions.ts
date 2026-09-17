import type { Role, Permission } from '@/types'

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  applicant: ['view_onboarding', 'submit_onboarding', 'view_approval_status'],
  hotel_admin: [],
  manager: [],
  staff: [],
  owner: [
    'view_onboarding',
    'submit_onboarding',
    'view_approval_status',
    'update_media',
    'view_dashboard',
    'view_bookings',
    'manage_rooms',
    'view_analytics',
    'view_payouts',
    'manage_reviews',
    'view_availability',
    'manage_settings',
  ],
  admin: [
    'manage_verification_queue',
    'approve_property',
    'reject_property',
    'request_revision',
    'manage_all_users',
    'view_all_bookings',
    'process_payouts',
    'moderate_reviews',
    'resolve_disputes',
    'view_platform_analytics',
    'manage_properties_directory',
    'view_dashboard',
  ],
  support: [
    'view_support_tickets',
    'resolve_tickets',
    'lookup_users',
    'escalate_to_admin',
    'view_dashboard',
  ],
  super_admin: [
    'manage_all_users',
    'view_all_bookings',
    'process_payouts',
    'moderate_reviews',
    'resolve_disputes',
    'view_platform_analytics',
    'manage_properties_directory',
    'manage_verification_queue',
    'view_dashboard',
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return role === 'super_admin' || (ROLE_PERMISSIONS[role]?.includes(permission) ?? false)
}

/** Features that require "approved" status even if the role has the permission */
export const APPROVAL_GATED = new Set<Permission>([
  'view_dashboard',
  'view_bookings',
  'manage_rooms',
  'view_analytics',
  'view_payouts',
  'manage_reviews',
  'view_availability',
  'manage_settings',
])
