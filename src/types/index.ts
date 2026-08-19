export type Role = 'owner' | 'admin' | 'support' | 'super_admin'

export type OnboardingStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'revision_requested'
  | 'approved'
  | 'rejected'
  | 'suspended'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  avatarInitials: string
  businessEntity?: 'individual' | 'sole_prop' | 'pvt_ltd' | 'partnership' | 'llp'
  onboardingStatus?: OnboardingStatus
  onboardingStep?: number   // 1-7, which onboarding step they're on
  propertyId?: string
}

export interface AuthTokenPayload {
  sub: string
  role: Role
  name: string
  email: string
  onboardingStatus: OnboardingStatus
  onboardingStep: number
  iat: number
  exp: number
}

export type Permission =
  // Owner
  | 'view_onboarding'
  | 'submit_onboarding'
  | 'view_approval_status'
  | 'update_media'
  | 'view_dashboard'
  | 'view_bookings'
  | 'manage_rooms'
  | 'view_analytics'
  | 'view_payouts'
  | 'manage_reviews'
  | 'view_availability'
  | 'manage_settings'
  // Admin
  | 'manage_verification_queue'
  | 'approve_property'
  | 'reject_property'
  | 'request_revision'
  | 'manage_all_users'
  | 'view_all_bookings'
  | 'process_payouts'
  | 'moderate_reviews'
  | 'resolve_disputes'
  | 'view_platform_analytics'
  | 'manage_properties_directory'
  // Support
  | 'view_support_tickets'
  | 'resolve_tickets'
  | 'lookup_users'
  | 'escalate_to_admin'
