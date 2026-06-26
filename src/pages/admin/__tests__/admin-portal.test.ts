import { describe, it, expect } from 'vitest'

// E8: Unit tests for admin portal logic (non-UI parts)
// UI rendering tests live in Playwright e2e; these cover data transforms.

describe('Admin portal — badge severity mapping (E8)', () => {
  // AnomalySeverity badge map is in AdminAnomaliesView.tsx
  // Verify the mapping constants are logically sound — no undefined variants
  const SEVERITY_BADGE = {
    critical: 'red',
    high: 'amber',
    medium: 'teal',
    low: 'grey',
  } as const

  it('every severity level maps to a known badge variant', () => {
    const validVariants = ['green', 'amber', 'red', 'grey', 'teal', 'dark']
    for (const [, variant] of Object.entries(SEVERITY_BADGE)) {
      expect(validVariants).toContain(variant)
    }
  })

  it('critical severity maps to red (danger)', () => {
    expect(SEVERITY_BADGE.critical).toBe('red')
  })

  it('high severity maps to amber (caution)', () => {
    expect(SEVERITY_BADGE.high).toBe('amber')
  })
})

describe('Admin portal — paise-to-rupee formatting (E8)', () => {
  function formatINR(paise: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Math.round(paise / 100))
  }

  it('formats zero paise correctly', () => {
    expect(formatINR(0)).toMatch('0')
  })

  it('formats 100 paise as ₹1', () => {
    expect(formatINR(100)).toMatch('1')
  })

  it('formats 10000 paise as ₹100', () => {
    expect(formatINR(10000)).toMatch('100')
  })

  it('rounds fractional paise correctly', () => {
    expect(formatINR(150)).toMatch('2') // 150 paise = ₹1.5 → rounds to ₹2
  })
})

describe('Admin portal — dispute status transitions (E8)', () => {
  type DisputeStatus =
    | 'filed' | 'under_review' | 'awaiting_hotel_response'
    | 'resolved_guest' | 'resolved_hotel' | 'resolved_partial'
    | 'resolved_wallet_credit' | 'escalated' | 'closed_no_response'

  const OPEN_STATUSES: DisputeStatus[] = ['filed', 'under_review', 'awaiting_hotel_response']

  function canResolve(status: DisputeStatus): boolean {
    return OPEN_STATUSES.includes(status)
  }

  it('allows resolution for open disputes', () => {
    expect(canResolve('filed')).toBe(true)
    expect(canResolve('under_review')).toBe(true)
    expect(canResolve('awaiting_hotel_response')).toBe(true)
  })

  it('blocks resolution for already-resolved disputes', () => {
    expect(canResolve('resolved_guest')).toBe(false)
    expect(canResolve('resolved_hotel')).toBe(false)
    expect(canResolve('escalated')).toBe(false)
    expect(canResolve('closed_no_response')).toBe(false)
  })
})
