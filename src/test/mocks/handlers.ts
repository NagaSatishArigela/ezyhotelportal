import { http, HttpResponse } from 'msw'

// ── Auth ────────────────────────────────────────────────────────────────────

export const handlers = [
  http.post('/api/auth/logout', () => HttpResponse.json({ message: 'Logged out successfully' })),
  http.post('/api/auth/login', async ({ request }) => {
    const { email } = await request.json() as { email: string; password: string }
    const users: Record<string, object> = {
      'owner@demo.com':      { id: 'u1', name: 'Ravi Nair',     email, role: 'owner',       onboardingStatus: 'in_progress', onboardingStep: 1, avatarInitials: 'RN', phone: '9876543210' },
      'approved@demo.com':   { id: 'u2', name: 'Priya Singh',   email, role: 'owner',       onboardingStatus: 'approved',    onboardingStep: 7, avatarInitials: 'PS', phone: '9876543211' },
      'admin@demo.com':      { id: 'u3', name: 'Admin User',    email, role: 'admin',       onboardingStatus: 'approved',    onboardingStep: 0, avatarInitials: 'AU', phone: '9876543212' },
      'support@demo.com':    { id: 'u4', name: 'Support Agent', email, role: 'support',     onboardingStatus: 'approved',    onboardingStep: 0, avatarInitials: 'SA', phone: '9876543213' },
      'superadmin@demo.com': { id: 'u5', name: 'Super Admin',   email, role: 'super_admin', onboardingStatus: 'approved',    onboardingStep: 0, avatarInitials: 'SA', phone: '9876543214' },
    }
    const user = users[email]
    if (!user) return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    return HttpResponse.json({ user, token: `mock.${email}.token` })
  }),

  // ── Owner / me ─────────────────────────────────────────────────────────────

  http.get('/api/owner/status', () => HttpResponse.json({ status: 'in_progress' })),
  http.get('/api/me/onboarding', () => HttpResponse.json({ status: 'READY', canOnboardProperty: true, isAdmin: false, nextStep: 'CREATE_PROPERTY' })),
  http.get('/api/owners/me/notifications', () => HttpResponse.json({ items: [], total: 0, page: 1, limit: 10, unreadCount: 0 })),
  http.get('/api/owners/me/notifications/unread-count', () => HttpResponse.json({ count: 0 })),

  // ── Admin: property queue ──────────────────────────────────────────────────

  http.get('/api/admin/properties', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') ?? 'pending_review'
    const items = status === 'pending_review' ? [
      { id: 'prop-1', name: 'The Grand Oasis', ownerId: 'owner-1', status: 'pending_review', submissionRef: 'PPH-2026-00001', submittedAt: '2026-06-10T10:00:00Z', revisionCount: 0 },
      { id: 'prop-2', name: 'Luxury Suites Downtown', ownerId: 'owner-2', status: 'pending_review', submissionRef: 'PPH-2026-00002', submittedAt: '2026-06-11T09:00:00Z', revisionCount: 1 },
      { id: 'prop-3', name: 'The Posh Pad', ownerId: 'owner-3', status: 'pending_review', submissionRef: 'PPH-2026-00003', submittedAt: '2026-06-12T14:00:00Z', revisionCount: 0 },
    ] : []
    return HttpResponse.json({ items, total: items.length, page: 1, limit: 50 })
  }),

  http.get('/api/admin/properties/:id', ({ params }) => {
    const propMap: Record<string, object> = {
      'prop-1': { id: 'prop-1', name: 'The Grand Oasis', status: 'pending_review', propertyType: 'hotel', bookingPolicy: 'hourly', category: 'budget', ownerId: 'owner-1', submissionRef: 'PPH-2026-00001', submittedAt: '2026-06-10T10:00:00Z', revisionCount: 0, addressLine1: '12 MG Road', city: 'Bangalore', state: 'Karnataka', pincode: '560001', amenities: ['WiFi', 'AC', 'Parking'] },
      'prop-2': { id: 'prop-2', name: 'Luxury Suites Downtown', status: 'pending_review', propertyType: 'hotel', bookingPolicy: 'both', category: 'premium', ownerId: 'owner-2', submissionRef: 'PPH-2026-00002', submittedAt: '2026-06-11T09:00:00Z', revisionCount: 1, addressLine1: '45 Brigade Road', city: 'Bangalore', state: 'Karnataka', pincode: '560002', amenities: ['WiFi', 'AC', 'Pool', 'Gym'] },
    }
    const prop = propMap[String(params.id)] ?? propMap['prop-1']
    return HttpResponse.json({
      property: prop,
      roomTypes: [{ id: 'rt-1', type: 'ac', count: 10, hourlyRatePaise: 20000, fulldayRatePaise: 150000, maxOccupancy: 2 }],
      photos: [],
      compliance: { legalBusinessName: 'Demo Hotels Pvt Ltd', gstinMasked: '29XXXXX1234Z', panMasked: 'AXXXX1234X', bankAccountNumberMasked: 'XXXXXXXX4567', ifsc: 'HDFC0001234', accountHolderName: 'Demo Hotels', documents: [] },
    })
  }),

  http.post('/api/admin/properties/:id/approve', () => HttpResponse.json({ status: 'approved' })),
  http.post('/api/admin/properties/:id/reject', () => HttpResponse.json({ status: 'rejected' })),
  http.post('/api/admin/properties/:id/request-revision', () => HttpResponse.json({ status: 'needs_revision', revisionCount: 1 })),

  // ── Admin: bookings ────────────────────────────────────────────────────────

  http.get('/api/admin/bookings', () => HttpResponse.json({
    items: [
      { id: 'bk-1', bookingRef: 'PPH-B-AA001', propertyId: 'prop-1', propertyName: 'The Grand Oasis', ownerId: 'owner-1', guestId: 'guest-1', guestPhone: '9876543210', roomTypeId: 'rt-1', bookingType: 'hourly', status: 'confirmed', paymentStatus: 'paid', checkInAt: '2026-06-23T14:00:00Z', checkOutAt: '2026-06-23T17:00:00Z', durationHours: 3, guestCount: 2, totalAmountPaise: 70800, baseAmountPaise: 60000, gstAmountPaise: 10800, platformFeePaise: 0, refundAmountPaise: null, createdAt: '2026-06-23T10:00:00Z' },
      { id: 'bk-2', bookingRef: 'PPH-B-AA002', propertyId: 'prop-2', propertyName: 'Luxury Suites Downtown', ownerId: 'owner-2', guestId: 'guest-2', guestPhone: '9876543211', roomTypeId: 'rt-2', bookingType: 'hourly', status: 'completed', paymentStatus: 'paid', checkInAt: '2026-06-22T10:00:00Z', checkOutAt: '2026-06-22T16:00:00Z', durationHours: 6, guestCount: 2, totalAmountPaise: 212400, baseAmountPaise: 180000, gstAmountPaise: 32400, platformFeePaise: 0, refundAmountPaise: null, createdAt: '2026-06-22T08:00:00Z' },
    ],
    total: 2, page: 1, limit: 50,
  })),

  http.get('/api/admin/bookings/kpis', () => HttpResponse.json({
    totalBookings: 248, totalRevenuePaise: 18432000, avgBookingValuePaise: 74322,
    cancelledCount: 18, noShowCount: 4, activeNow: 7,
  })),

  http.get('/api/admin/bookings/active', () => HttpResponse.json({ items: [], total: 0 })),

  http.post('/api/bookings/:id/void', () => HttpResponse.json({ status: 'cancelled' })),

  // ── Admin: payouts ─────────────────────────────────────────────────────────

  http.get('/api/admin/payouts/summary', () => HttpResponse.json({
    pendingBatches: 2, onHoldItems: 3, releasedMtdPaise: 4560000, tdsMtdPaise: 46000,
  })),

  http.get('/api/admin/payouts', () => HttpResponse.json({
    items: [
      { id: 'batch-1', batchRef: 'PAY-20260615', status: 'pending', cycleStartAt: '2026-06-09T00:00:00Z', cycleEndAt: '2026-06-15T23:59:59Z', itemCount: 4, totalGrossPaise: 2400000, totalTdsPaise: 24000, totalNetPaise: 2376000, createdAt: '2026-06-16T00:00:00Z' },
      { id: 'batch-2', batchRef: 'PAY-20260608', status: 'released', cycleStartAt: '2026-06-02T00:00:00Z', cycleEndAt: '2026-06-08T23:59:59Z', itemCount: 6, totalGrossPaise: 3600000, totalTdsPaise: 36000, totalNetPaise: 3564000, createdAt: '2026-06-09T00:00:00Z' },
    ],
    total: 2, page: 1, limit: 50,
  })),

  http.get('/api/admin/payouts/:id', () => HttpResponse.json({
    id: 'batch-1', batchRef: 'PAY-20260615', status: 'pending', cycleStartAt: '2026-06-09T00:00:00Z', cycleEndAt: '2026-06-15T23:59:59Z', totalGrossPaise: 2400000, totalTdsPaise: 24000, totalNetPaise: 2376000,
    items: [
      { id: 'item-1', propertyId: 'prop-1', ownerId: 'owner-1', status: 'pending', bookingCount: 3, grossAmountPaise: 800000, tdsPaise: 8000, netAmountPaise: 792000, holdReason: null, bankRef: null, releasedAt: null },
      { id: 'item-2', propertyId: 'prop-2', ownerId: 'owner-2', status: 'on_hold', bookingCount: 2, grossAmountPaise: 600000, tdsPaise: 6000, netAmountPaise: 594000, holdReason: 'Dispute pending resolution', bankRef: null, releasedAt: null },
    ],
  })),

  http.post('/api/admin/payouts/items/:id/hold', () => HttpResponse.json({ status: 'on_hold' })),
  http.post('/api/admin/payouts/items/:id/release', () => HttpResponse.json({ status: 'released', releasedAt: new Date().toISOString() })),
  http.post('/api/admin/payouts/:id/release', () => HttpResponse.json({ released: 1, skipped: 1 })),
  http.post('/api/admin/payouts/generate', () => HttpResponse.json({ id: 'batch-new', batchRef: `PAY-${new Date().toISOString().slice(0,10).replace(/-/g,'')}`, status: 'pending', itemCount: 0, totalGrossPaise: 0, totalTdsPaise: 0, totalNetPaise: 0 })),

  // ── Admin: disputes ────────────────────────────────────────────────────────

  http.get('/api/admin/disputes', () => HttpResponse.json({
    items: [
      { id: 'disp-1', disputeRef: 'PPH-D-AA001', bookingId: 'bk-1', bookingRef: 'PPH-B-AA001', guestId: 'guest-1', propertyId: 'prop-1', propertyName: 'The Grand Oasis', ownerId: 'owner-1', category: 'cleanliness', status: 'filed', requestedResolution: 'full_refund', resolutionType: null, refundAmountPaise: null, filedAt: '2026-06-23T18:00:00Z', resolutionDeadline: '2026-06-30T18:00:00Z', resolvedAt: null },
      { id: 'disp-2', disputeRef: 'PPH-D-AA002', bookingId: 'bk-2', bookingRef: 'PPH-B-AA002', guestId: 'guest-2', propertyId: 'prop-2', propertyName: 'Luxury Suites Downtown', ownerId: 'owner-2', category: 'charges', status: 'under_review', requestedResolution: 'partial_refund', resolutionType: null, refundAmountPaise: null, filedAt: '2026-06-22T20:00:00Z', resolutionDeadline: '2026-06-29T20:00:00Z', resolvedAt: null },
    ],
    total: 2, page: 1, limit: 50, unresolvedCount: 2,
  })),

  http.get('/api/admin/disputes/:id', ({ params }) => HttpResponse.json({
    dispute: { id: params.id, disputeRef: 'PPH-D-AA001', bookingId: 'bk-1', guestId: 'guest-1', propertyId: 'prop-1', category: 'cleanliness', description: 'Room was not clean when we checked in. Bathroom had visible mould.', status: 'filed', requestedResolution: 'full_refund', hotelResponse: null, refundAmountPaise: null, adminNotes: null, filedAt: '2026-06-23T18:00:00Z', resolutionDeadline: '2026-06-30T18:00:00Z' },
    booking: { id: 'bk-1', bookingRef: 'PPH-B-AA001', checkInAt: '2026-06-23T14:00:00Z', checkOutAt: '2026-06-23T17:00:00Z', totalAmountPaise: 70800, status: 'completed' },
    guest: { id: 'guest-1', name: 'Rahul Sharma', phone: '9876543210', pastDisputeCount: 0 },
    property: { id: 'prop-1', name: 'The Grand Oasis' },
  })),

  http.post('/api/admin/disputes/:id/request-response', () => HttpResponse.json({ status: 'awaiting_hotel_response' })),
  http.patch('/api/admin/disputes/:id/resolve', () => HttpResponse.json({ status: 'resolved_guest', resolutionType: 'full_refund' })),

  // ── Admin: reviews ─────────────────────────────────────────────────────────

  http.get('/api/admin/reviews', () => HttpResponse.json({
    items: [
      { id: 'rev-1', bookingId: 'bk-2', propertyId: 'prop-2', guestId: 'guest-2', rating: 4, reviewText: 'Good stay overall. Room was clean and staff was helpful.', status: 'published', flagReason: null, createdAt: '2026-06-22T20:00:00Z', propertyName: 'Luxury Suites Downtown', guestName: 'Priya Singh' },
      { id: 'rev-2', bookingId: 'bk-1', propertyId: 'prop-1', guestId: 'guest-1', rating: 2, reviewText: 'Very disappointing. Room was not as described and AC was broken.', status: 'flagged', flagReason: 'inappropriate_content', createdAt: '2026-06-23T19:00:00Z', propertyName: 'The Grand Oasis', guestName: 'Rahul Sharma' },
    ],
    total: 2, page: 1, limit: 50, flaggedCount: 1,
  })),

  http.get('/api/admin/reviews/flagged-count', () => HttpResponse.json({ count: 1 })),
  http.post('/api/admin/reviews/:id/moderate', () => HttpResponse.json({ status: 'removed' })),
  http.delete('/api/admin/reviews/:id', () => HttpResponse.json(null, { status: 204 })),

  // ── Admin: users ───────────────────────────────────────────────────────────

  http.get('/api/admin/users', () => HttpResponse.json({
    items: [
      { id: 'guest-1', phone: '9876543210', email: 'rahul@demo.in', name: 'Rahul Sharma', globalRole: 'USER', status: 'active', isPhoneVerified: true, createdAt: '2026-06-01T00:00:00Z' },
      { id: 'guest-2', phone: '9876543211', email: 'priya@demo.in', name: 'Priya Singh', globalRole: 'USER', status: 'active', isPhoneVerified: true, createdAt: '2026-06-05T00:00:00Z' },
    ],
    total: 2, page: 1, limit: 50,
  })),

  // ── Admin: analytics ──────────────────────────────────────────────────────

  http.get('/api/admin/analytics', () => HttpResponse.json({
    totalBookings: 248, totalRevenuePaise: 18432000, activeProperties: 12, pendingVerification: 3,
    bookingsByDay: [30, 45, 38, 52, 41, 60, 55],
    revenueByDay: [2400000, 3600000, 3000000, 4200000, 3300000, 4800000, 4400000],
  })),

  // ── Admin: anomalies ──────────────────────────────────────────────────────

  http.get('/api/admin/anomalies', () => HttpResponse.json({ items: [], total: 0, page: 1, limit: 50 })),
  http.get('/api/admin/anomalies/unresolved-count', () => HttpResponse.json({ count: 0 })),

  // ── Super Admin ────────────────────────────────────────────────────────────

  http.get('/api/super-admin/stats', () => HttpResponse.json({
    totalUsers: 1842, totalProperties: 48, activeProperties: 36, totalBookings: 3241,
    totalRevenuePaise: 186432000, pendingVerification: 3, openDisputes: 2, onHoldPayouts: 1,
  })),

  http.get('/api/super-admin/admins', () => HttpResponse.json({
    items: [
      { id: 'admin-1', name: 'Admin User', phone: '9876543212', email: 'admin@demo.com', globalRole: 'ADMIN', status: 'active', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'admin-2', name: 'Ops Manager', phone: '9876543215', email: 'ops@demo.com', globalRole: 'ADMIN', status: 'active', createdAt: '2026-02-01T00:00:00Z' },
    ],
    total: 2, page: 1, limit: 20,
  })),

  http.post('/api/super-admin/admins', () => HttpResponse.json({ id: 'admin-new', name: 'New Admin', globalRole: 'ADMIN', status: 'active' })),
  http.patch('/api/super-admin/admins/:id/status', () => HttpResponse.json({ status: 'active' })),

  http.get('/api/super-admin/settings', () => HttpResponse.json({
    commissionPct: 12, payoutDayOfWeek: 1, minBookingHours: 2, maxBookingHours: 24, cancellationWindowHours: 1,
    updatedAt: '2026-06-01T00:00:00Z',
  })),

  http.patch('/api/super-admin/settings', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ ...(body as object), updatedAt: new Date().toISOString() })
  }),
]
