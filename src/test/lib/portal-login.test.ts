import { beforeEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { portalLogin } from '@/lib/portal-api'
vi.mock('@/lib/api', () => ({ api: { post: vi.fn(), get: vi.fn() } }))
const profile = { id: 'user-1', name: 'Tester', email: 'test@example.com', phone: '', globalRole: 'USER', status: 'active' }
const tokens = { accessToken: 'fresh-token', refreshToken: 'refresh-token', expiresIn: 3600, tokenType: 'Bearer' }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(api.post).mockResolvedValue({ data: { user: profile, tokens } }) })
it('does not turn a global user into an owner without an approved membership', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: [{ propertyId: 'p', status: 'pending_review', isApplicant: true, role: null, permissions: [] }] })
  const result = await portalLogin('test@example.com', 'password')
  expect(result.user.role).toBe('applicant')
  expect(result.user.onboardingStatus).toBe('submitted')
  expect(api.get).toHaveBeenCalledWith('/me/properties', { headers: { Authorization: 'Bearer fresh-token' } })
})
it('uses approved hotel admin membership without granting platform admin', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: [{ propertyId: 'p', status: 'approved', isApplicant: false, role: 'HOTEL_ADMIN', permissions: ['view_bookings'] }] })
  const result = await portalLogin('test@example.com', 'password')
  expect(result.user.role).toBe('hotel_admin')
  expect(result.user.propertyId).toBe('p')
})
it('fails login closed when membership lookup fails', async () => {
  vi.mocked(api.get).mockRejectedValue(new Error('Unavailable'))
  await expect(portalLogin('test@example.com', 'password')).rejects.toThrow('Unavailable')
})
it('retains super admin global access without membership lookup', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { user: { ...profile, globalRole: 'SUPER_ADMIN' }, tokens } })
  expect((await portalLogin('test@example.com', 'password')).user.role).toBe('super_admin')
  expect(api.get).not.toHaveBeenCalled()
})
