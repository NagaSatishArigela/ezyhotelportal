import { test, expect, type Page } from '@playwright/test'
import type {
  AdminDisputeListItem,
  Dispute,
  DisputeResolutionType,
  DisputeStatus,
} from '../src/lib/api/adminDisputes'
import type { AdminBooking } from '../src/lib/api/adminBookings'

const OPEN_STATUSES: DisputeStatus[] = ['filed', 'under_review', 'awaiting_hotel_response']

function makeDispute(overrides: Partial<Dispute> & { id: string; disputeRef: string }): Dispute {
  return {
    id: overrides.id,
    disputeRef: overrides.disputeRef,
    bookingId: 'b-1',
    guestId: 'guest-1',
    propertyId: 'prop-1',
    category: 'room_quality',
    description: 'The room had a strong smell and the AC was not working.',
    guestEvidence: null,
    requestedResolution: 'partial_refund',
    status: 'filed',
    hotelResponse: null,
    hotelEvidence: null,
    hotelResponseDeadline: null,
    resolutionType: null,
    refundAmountPaise: null,
    adminNotes: null,
    resolvedBy: null,
    filedAt: '2026-06-10T10:00:00.000Z',
    resolutionDeadline: '2026-06-13T10:00:00.000Z',
    resolvedAt: null,
    ...overrides,
  }
}

function makeBooking(overrides: Partial<AdminBooking> & { id: string; bookingRef: string }): AdminBooking {
  return {
    id: overrides.id,
    bookingRef: overrides.bookingRef,
    propertyId: 'prop-1',
    roomTypeId: 'rt-1',
    ownerId: 'owner-1',
    guestId: 'guest-1',
    bookingType: 'hourly',
    checkInAt: '2026-06-09T13:00:00.000Z',
    checkOutAt: '2026-06-09T16:00:00.000Z',
    durationHours: 3,
    guestCount: 2,
    baseAmountPaise: 240000,
    gstAmountPaise: 43200,
    platformFeePaise: 0,
    totalAmountPaise: 283200,
    status: 'completed',
    paymentStatus: 'success',
    paymentRef: 'mock_ref',
    qrCode: 'mock_qr',
    checkedInAt: null,
    checkedOutAt: null,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
    refundAmountPaise: 0,
    noShowAt: null,
    voidedAt: null,
    voidedBy: null,
    voidReason: null,
    extensionAmountPaise: null,
    isFlagged: false,
    flagType: null,
    flagNotes: null,
    createdAt: '2026-06-09T10:00:00.000Z',
    updatedAt: '2026-06-09T10:00:00.000Z',
    ...overrides,
  }
}

const BASE_DISPUTES: Dispute[] = [
  makeDispute({
    id: 'd-1', disputeRef: 'DSP-00001', bookingId: 'b-1', category: 'room_quality', status: 'filed',
    description: 'The room had a strong smell and the AC was not working.',
    requestedResolution: 'partial_refund',
    filedAt: '2026-06-10T10:00:00.000Z', resolutionDeadline: '2026-06-15T10:00:00.000Z',
  }),
  makeDispute({
    id: 'd-2', disputeRef: 'DSP-00002', bookingId: 'b-2', category: 'cleanliness', status: 'awaiting_hotel_response',
    description: 'Bathroom was not cleaned before check-in.',
    requestedResolution: 'full_refund',
    hotelResponseDeadline: '2026-06-17T10:00:00.000Z',
    filedAt: '2026-06-11T10:00:00.000Z', resolutionDeadline: '2026-06-16T10:00:00.000Z',
  }),
  makeDispute({
    id: 'd-3', disputeRef: 'DSP-00003', bookingId: 'b-1', category: 'safety', status: 'resolved_hotel',
    description: 'Fire exit was blocked by furniture.',
    requestedResolution: 'apology',
    resolutionType: 'no_action', adminNotes: 'Investigated on-site, no issue found.',
    filedAt: '2026-06-08T10:00:00.000Z', resolutionDeadline: '2026-06-11T10:00:00.000Z', resolvedAt: '2026-06-12T10:00:00.000Z',
  }),
]

const BASE_BOOKINGS: AdminBooking[] = [
  makeBooking({ id: 'b-1', bookingRef: 'PPH-B-00001' }),
  makeBooking({ id: 'b-2', bookingRef: 'PPH-B-00002' }),
]

const DEADLINES: Record<string, number> = { 'd-1': 120, 'd-2': 144, 'd-3': -240 }

async function mockAdminDisputesApi(page: Page, disputes: Dispute[], bookings: AdminBooking[]) {
  const store = new Map<string, Dispute>(disputes.map((d) => [d.id, d]))
  const bookingStore = new Map<string, AdminBooking>(bookings.map((b) => [b.id, b]))

  function unresolvedCount() {
    return Array.from(store.values()).filter((d) => OPEN_STATUSES.includes(d.status)).length
  }

  await page.route('**/api/admin/disputes**', async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())

    if (method === 'GET' && url.pathname.endsWith('/admin/disputes/unresolved-count')) {
      await route.fulfill({ json: { count: unresolvedCount() } })
      return
    }

    const requestResponseMatch = url.pathname.match(/\/admin\/disputes\/([^/]+)\/request-response$/)
    if (method === 'POST' && requestResponseMatch) {
      const dispute = store.get(requestResponseMatch[1])
      if (!dispute) {
        await route.fulfill({ status: 404, json: { message: 'Not found' } })
        return
      }
      dispute.status = 'awaiting_hotel_response'
      dispute.hotelResponseDeadline = '2026-06-18T10:00:00.000Z'
      await route.fulfill({ json: dispute })
      return
    }

    const resolveMatch = url.pathname.match(/\/admin\/disputes\/([^/]+)\/resolve$/)
    if (method === 'PATCH' && resolveMatch) {
      const dispute = store.get(resolveMatch[1])
      if (!dispute) {
        await route.fulfill({ status: 404, json: { message: 'Not found' } })
        return
      }
      const body = (request.postDataJSON() as {
        resolutionType: DisputeResolutionType
        refundAmountPaise?: number
        walletCreditAmountPaise?: number
        adminNotes: string
      }) ?? { resolutionType: 'no_action', adminNotes: '' }

      dispute.resolutionType = body.resolutionType
      dispute.refundAmountPaise = body.refundAmountPaise ?? null
      dispute.adminNotes = body.adminNotes
      dispute.resolvedBy = 'admin-1'
      dispute.resolvedAt = new Date().toISOString()
      dispute.status = body.resolutionType === 'escalated'
        ? 'escalated'
        : body.resolutionType === 'partial_refund'
          ? 'resolved_partial'
          : body.resolutionType === 'wallet_credit'
            ? 'resolved_wallet_credit'
            : body.resolutionType === 'full_refund'
              ? 'resolved_guest'
              : 'resolved_hotel'

      await route.fulfill({ json: dispute })
      return
    }

    const detailMatch = url.pathname.match(/\/admin\/disputes\/([^/]+)$/)
    if (method === 'GET' && detailMatch) {
      const dispute = store.get(detailMatch[1])
      if (!dispute) {
        await route.fulfill({ status: 404, json: { message: 'Not found' } })
        return
      }
      const booking = bookingStore.get(dispute.bookingId)
      await route.fulfill({
        json: {
          dispute,
          booking: booking
            ? {
                bookingRef: booking.bookingRef,
                checkInAt: booking.checkInAt,
                checkOutAt: booking.checkOutAt,
                totalAmountPaise: booking.totalAmountPaise,
                status: booking.status,
              }
            : null,
          guest: { phone: '9876500001', totalBookings: 3, pastDisputeCount: 1, hasReview: true },
          property: { name: 'PayPerHour Demo Suites', city: 'Bangalore', pastDisputeCount: 2 },
        },
      })
      return
    }

    if (method === 'GET' && url.pathname.endsWith('/admin/disputes')) {
      let items = Array.from(store.values())

      const status = url.searchParams.get('status')
      if (status) {
        const statuses = status.split(',')
        items = items.filter((d) => statuses.includes(d.status))
      }
      const category = url.searchParams.get('category')
      if (category) {
        const categories = category.split(',')
        items = items.filter((d) => categories.includes(d.category))
      }
      const dateFrom = url.searchParams.get('dateFrom')
      if (dateFrom) items = items.filter((d) => d.filedAt >= dateFrom)
      const dateTo = url.searchParams.get('dateTo')
      if (dateTo) items = items.filter((d) => d.filedAt <= dateTo)

      items = [...items].sort((a, b) => (a.filedAt < b.filedAt ? -1 : a.filedAt > b.filedAt ? 1 : 0))

      const listItems: AdminDisputeListItem[] = items.map((d) => {
        const booking = bookingStore.get(d.bookingId)
        return {
          id: d.id,
          disputeRef: d.disputeRef,
          bookingRef: booking?.bookingRef ?? null,
          guestPhone: '9876500001',
          propertyName: 'PayPerHour Demo Suites',
          category: d.category,
          filedAt: d.filedAt,
          resolutionDeadline: d.resolutionDeadline,
          status: d.status,
          hoursUntilDeadline: DEADLINES[d.id] ?? 0,
        }
      })

      await route.fulfill({ json: { items: listItems, total: listItems.length, page: 1, limit: 50 } })
      return
    }

    await route.continue()
  })

  await page.route('**/api/admin/anomalies/unresolved-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })

  await page.route('**/api/admin/reviews/flagged-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })

  await page.route('**/api/admin/bookings**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()

    if (method === 'GET' && url.pathname.endsWith('/admin/bookings/kpis')) {
      await route.fulfill({
        json: { totalBookings: bookingStore.size, totalGbvPaise: 0, cancellationRate: 0, avgBookingValuePaise: 0, noShowRate: 0 },
      })
      return
    }

    if (method === 'GET' && url.pathname.endsWith('/admin/bookings/active')) {
      await route.fulfill({ json: [] })
      return
    }

    const detailMatch = url.pathname.match(/\/admin\/bookings\/([^/]+)$/)
    if (method === 'GET' && detailMatch && detailMatch[1] !== 'active' && detailMatch[1] !== 'kpis') {
      const booking = bookingStore.get(detailMatch[1])
      if (!booking) {
        await route.fulfill({ status: 404, json: { message: 'Not found' } })
        return
      }
      await route.fulfill({
        json: {
          booking,
          property: { id: booking.propertyId, name: 'PayPerHour Demo Suites', city: 'Bangalore', area: 'Indiranagar' },
          guest: { id: booking.guestId, phone: '9876500001', email: 'guest@example.com' },
          timeline: [{ at: booking.createdAt, label: 'Booking created' }],
          adminActions: [],
        },
      })
      return
    }

    if (method === 'GET' && url.pathname.endsWith('/admin/bookings')) {
      await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 50 } })
      return
    }

    await route.continue()
  })

  return { store, bookingStore }
}

async function loginAsAdmin(page: Page) {
  await page.route('**/api/admin/properties**', async (route) => {
    await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 20 } })
  })

  await page.goto('/login')
  await page.evaluate(() => localStorage.removeItem('stayflex-auth'))
  await page.goto('/login')
  await page.getByTestId('email-input').fill('admin@demo.com')
  await page.getByTestId('password-input').fill('demo1234')
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL('/admin/verification', { timeout: 5000 })
}

test.describe('Admin — Disputes tab', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminDisputesApi(page, BASE_DISPUTES.map((d) => ({ ...d })), BASE_BOOKINGS.map((b) => ({ ...b })))
    await loginAsAdmin(page)
    await page.goto('/admin/bookings')
    await page.getByRole('button', { name: /Disputes/ }).click()
  })

  test('shows unresolved count badge and lists disputes', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Disputes/ })).toContainText('2')

    const rows = page.locator('table').first().locator('tbody tr')
    await expect(rows).toHaveCount(3)
    await expect(page.getByTestId('dispute-row-d-1')).toBeVisible()
    await expect(page.getByTestId('dispute-row-d-2')).toBeVisible()
    await expect(page.getByTestId('dispute-row-d-3')).toBeVisible()
  })

  test('status filter narrows the list', async ({ page }) => {
    await page.getByTestId('dispute-filter-status').click()
    await page.getByRole('menuitemcheckbox', { name: 'Awaiting hotel response' }).click()
    await page.keyboard.press('Escape')

    await expect(page.getByTestId('dispute-row-d-2')).toBeVisible()
    await expect(page.getByTestId('dispute-row-d-1')).not.toBeVisible()
    await expect(page.getByTestId('dispute-row-d-3')).not.toBeVisible()
  })

  test('category filter narrows the list', async ({ page }) => {
    await page.getByTestId('dispute-filter-category').click()
    await page.getByRole('menuitemcheckbox', { name: 'Safety' }).click()
    await page.keyboard.press('Escape')

    await expect(page.getByTestId('dispute-row-d-3')).toBeVisible()
    await expect(page.getByTestId('dispute-row-d-1')).not.toBeVisible()
    await expect(page.getByTestId('dispute-row-d-2')).not.toBeVisible()
  })

  test('opening a row shows the three detail sections', async ({ page }) => {
    await page.getByTestId('dispute-row-d-1').click()

    const drawer = page.getByTestId('dispute-detail-drawer')
    await expect(page.getByRole('heading', { name: 'DSP-00001' })).toBeVisible()
    await expect(drawer.getByText("Guest's complaint")).toBeVisible()
    await expect(drawer.getByText(/strong smell/)).toBeVisible()
    await expect(drawer.getByText("Hotel's response")).toBeVisible()
    await expect(drawer.getByText('No response requested yet.')).toBeVisible()
    await expect(drawer.getByText('Booking & payment context')).toBeVisible()
    await expect(drawer.getByText('PPH-B-00001', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Resolve dispute' })).toBeVisible()
  })

  test('request hotel response action updates the dispute', async ({ page }) => {
    await page.getByTestId('dispute-row-d-1').click()
    await page.getByRole('button', { name: 'Request hotel response' }).click()

    await expect(page.getByText('Hotel response requested').last()).toBeVisible({ timeout: 3000 })

    const drawer = page.getByTestId('dispute-detail-drawer')
    await expect(drawer.getByText('Awaiting hotel response', { exact: true })).toBeVisible()
    await expect(drawer.getByText(/Awaiting hotel response \(due/)).toBeVisible()
  })

  test('view booking opens the booking detail drawer', async ({ page }) => {
    await page.getByTestId('dispute-row-d-1').click()
    await page.getByRole('button', { name: 'View booking' }).click()

    await expect(page.getByRole('heading', { name: 'PPH-B-00001' })).toBeVisible()
  })

  test('resolve dispute — full refund flow updates status and unresolved count', async ({ page }) => {
    await page.getByTestId('dispute-row-d-2').click()
    await page.getByRole('button', { name: 'Resolve dispute' }).click()

    await expect(page.getByRole('dialog', { name: 'Resolve dispute' })).toBeVisible()
    await page.getByRole('radio', { name: 'Full refund' }).check()
    await page.getByLabel('Notes (mandatory)').fill('Guest complaint verified — issuing a full refund.')
    await page.getByRole('dialog').getByRole('button', { name: 'Resolve' }).click()

    await expect(page.getByText('Dispute resolved').last()).toBeVisible({ timeout: 3000 })

    const drawer = page.getByTestId('dispute-detail-drawer')
    await expect(drawer.getByText('Resolved – guest favour')).toBeVisible()
    await expect(drawer.getByText('Full refund', { exact: true })).toBeVisible()
    await expect(drawer.getByText('Guest complaint verified — issuing a full refund.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Resolve dispute' })).not.toBeVisible()

    await expect(page.getByRole('button', { name: /Disputes/ })).toContainText('1')
  })
})
