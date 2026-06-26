import { describe, it, expect, vi } from 'vitest'
import { cn, formatINR, formatDate, maskPhone, maskAccount, sleep, generateId } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })

  it('resolves Tailwind conflicts (last wins)', () => {
    const result = cn('px-2', 'px-4')
    expect(result).toBe('px-4')
  })

  it('returns empty string with no inputs', () => {
    expect(cn()).toBe('')
  })
})

describe('formatINR', () => {
  it('formats whole rupees with ₹ symbol', () => {
    expect(formatINR(1000)).toMatch(/₹/)
    expect(formatINR(1000)).toMatch(/1,000/)
  })

  it('formats zero', () => {
    expect(formatINR(0)).toMatch(/₹/)
  })

  it('formats large amounts with Indian grouping', () => {
    expect(formatINR(1_00_000)).toMatch(/1,00,000/)
  })
})

describe('formatDate', () => {
  it('formats a date string into day-month-year', () => {
    const result = formatDate('2026-06-15T00:00:00.000Z')
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2026/)
  })

  it('accepts a Date object', () => {
    const result = formatDate(new Date('2026-01-01'))
    expect(result).toMatch(/2026/)
  })
})

describe('maskPhone', () => {
  it('masks the middle 5 digits of a compact number', () => {
    // Regex expects +91[space?][2 digits][5 digits][3 digits] with no internal spaces
    expect(maskPhone('+91 9876543210')).toBe('+91 98•••••210')
  })

  it('returns original string if pattern does not match', () => {
    expect(maskPhone('12345')).toBe('12345')
  })
})

describe('maskAccount', () => {
  it('shows only last 4 digits', () => {
    expect(maskAccount('123456789012')).toBe('••••••••9012')
  })

  it('masks a 10-digit account number', () => {
    const result = maskAccount('1234567890')
    expect(result).toMatch(/7890$/)
    expect(result).toContain('••')
  })
})

describe('sleep', () => {
  it('resolves after the given delay', async () => {
    vi.useFakeTimers()
    const p = sleep(500)
    vi.advanceTimersByTime(500)
    await expect(p).resolves.toBeUndefined()
    vi.useRealTimers()
  })
})

describe('generateId', () => {
  it('uses the given prefix', () => {
    expect(generateId('TST')).toMatch(/^TST-/)
  })

  it('defaults to ID prefix', () => {
    expect(generateId()).toMatch(/^ID-/)
  })

  it('generates unique values', () => {
    const a = generateId()
    const b = generateId()
    expect(a).not.toBe(b)
  })
})
