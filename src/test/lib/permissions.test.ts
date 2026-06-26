import { describe, it, expect } from 'vitest'
import { hasPermission, ROLE_PERMISSIONS, APPROVAL_GATED } from '@/lib/permissions'

describe('ROLE_PERMISSIONS', () => {
  it('owner has view_dashboard', () => {
    expect(ROLE_PERMISSIONS.owner).toContain('view_dashboard')
  })

  it('admin has manage_verification_queue', () => {
    expect(ROLE_PERMISSIONS.admin).toContain('manage_verification_queue')
  })

  it('support has view_support_tickets', () => {
    expect(ROLE_PERMISSIONS.support).toContain('view_support_tickets')
  })

  it('super_admin has manage_all_users', () => {
    expect(ROLE_PERMISSIONS.super_admin).toContain('manage_all_users')
  })

  it('owner does not have admin-only permissions', () => {
    expect(ROLE_PERMISSIONS.owner).not.toContain('manage_verification_queue')
  })
})

describe('hasPermission', () => {
  it('returns true when role has the permission', () => {
    expect(hasPermission('owner', 'view_dashboard')).toBe(true)
    expect(hasPermission('admin', 'approve_property')).toBe(true)
    expect(hasPermission('support', 'resolve_tickets')).toBe(true)
    expect(hasPermission('super_admin', 'view_platform_analytics')).toBe(true)
  })

  it('returns false when role does not have the permission', () => {
    expect(hasPermission('owner', 'approve_property')).toBe(false)
    expect(hasPermission('support', 'process_payouts')).toBe(false)
  })

  it('returns false for an unknown role via nullish fallback', () => {
    expect(hasPermission('unknown' as never, 'view_dashboard')).toBe(false)
  })
})

describe('APPROVAL_GATED', () => {
  it('contains view_dashboard', () => {
    expect(APPROVAL_GATED.has('view_dashboard')).toBe(true)
  })

  it('contains view_payouts', () => {
    expect(APPROVAL_GATED.has('view_payouts')).toBe(true)
  })

  it('does not contain support-only permissions', () => {
    expect(APPROVAL_GATED.has('view_support_tickets')).toBe(false)
  })
})
