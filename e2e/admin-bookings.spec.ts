import { test, expect, type Page } from '@playwright/test'
import type {
  AdminBooking,
  AdminBookingAdminAction,
  AdminBookingListItem,
  BookingAdminActionType,
  BookingStatus,
} from '../src/lib/api/adminBookings'

function makeBooking(overrides: Partial<AdminBooking> & { id: string; bookingRef: string }): AdminBooking {
  return {
    id: overrides.id,
    bookingRef: overrides.bookingRef,
    propertyId: 'prop-1',
    roomTypeId: 'rt-1',
    ownerId: 'owner-1',
    guestId: 'guest-1',
    bookingType: 'hourly',
    checkInAt: '2026-06-13T13:00:00.000Z',
    checkOutAt: '2026-06-13T16:00:00.000Z',
    durationHours: 3,
    guestCount: 2,
    baseAmountPaise: 240000,
    gstAmountPaise: 43200,
    platformFeePaise: 0,
    totalAmountPaise: 283200,
    status: 'confirmed',
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
    createdAt: '2026-06-13T10:00:00.000Z',
    updatedAt: '2026-06-13T10:00:00.000Z',
    ...overrides,
  }
}

function toListItem(b: AdminBooking): AdminBookingListItem {
  return {
    id: b.id,
    bookingRef: b.bookingRef,
    propertyId: b.propertyId,
    propertyName: 'PayPerHour Demo Suites',
    city: 'Bangalore',
    roomTypeId: b.roomTypeId,
    ownerId: b.ownerId,
    guestId: b.guestId,
    guestPhone: '9876500001',
    bookingType: b.bookingType,
    checkInAt: b.checkInAt,
    checkOutAt: b.checkOutAt,
    durationHours: b.durationHours,
    guestCount: b.guestCount,
    totalAmountPaise: b.totalAmountPaise,
    status: b.status,
    paymentStatus: b.paymentStatus,
    refundAmountPaise: b.refundAmountPaise,
    isFlagged: b.isFlagged,
    createdAt: b.createdAt,
  }
}

async function mockAdminBookingsApi(page: Page, bookings: AdminBooking[]) {
  const store = new Map<string, AdminBooking>(bookings.map((b) => [b.id, b]))
  const actions = new Map<string, AdminBookingAdminAction[]>()
  let actionSeq = 0

  function recordAction(bookingId: string, action: BookingAdminActionType, body: Record<string, unknown>) {
    const list = actions.get(bookingId) ?? []
    list.unshift({
      id: `action-${++actionSeq}`,
      bookingId,
      adminId: 'admin-1',
      action,
      reasonCategory: (body.reasonCategory as string) ?? null,
      reasonText: (body.reasonText as string) ?? null,
      metadata: null,
      createdAt: new Date().toISOString(),
    })
    actions.set(bookingId, list)
  }

  await page.route('**/api/admin/disputes/unresolved-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })

  await page.route('**/api/admin/anomalies/unresolved-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })

  await page.route('**/api/admin/reviews/flagged-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })

  await page.route('**/api/admin/bookings**', async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())

    const actionMatch = url.pathname.match(
      /\/admin\/bookings\/([^/]+)\/(void|cancel|refund|force-checkout|extend|flag|unflag)$/
    )
    if (actionMatch && method === 'POST') {
      const [, id, actionType] = actionMatch
      const booking = store.get(id)
      if (!booking) {
        await route.fulfill({ status: 404, json: { message: 'Not found' } })
        return
      }
      const body = (request.postDataJSON() as Record<string, unknown> | null) ?? {}

      switch (actionType) {
        case 'void':
          booking.status = 'voided'
          booking.voidedAt = new Date().toISOString()
          booking.voidedBy = 'admin:admin-1'
          booking.voidReason = (body.reasonText as string) ?? null
          booking.paymentStatus = 'refunded'
          booking.refundAmountPaise = booking.totalAmountPaise
          recordAction(id, 'void', body)
          break
        case 'cancel':
          booking.status = 'cancelled'
          booking.cancelledAt = new Date().toISOString()
          booking.cancelledBy = 'admin:admin-1'
          booking.cancelReason = (body.reasonText as string) ?? null
          booking.refundAmountPaise = 0
          recordAction(id, 'cancel', body)
          break
        case 'refund': {
          const amountPaise = body.amountPaise as number
          const already = booking.refundAmountPaise ?? 0
          const newTotal = already + amountPaise
          booking.refundAmountPaise = newTotal
          booking.paymentStatus = 'refunded'
          recordAction(id, newTotal < booking.totalAmountPaise ? 'refund_partial' : 'refund_full', body)
          break
        }
        case 'force-checkout':
          booking.status = 'completed'
          booking.checkedOutAt = new Date().toISOString()
          recordAction(id, 'force_checkout', body)
          break
        case 'extend': {
          const newCheckOutAt = body.newCheckOutAt as string
          const extensionAmountPaise = body.extensionAmountPaise as number
          booking.checkOutAt = newCheckOutAt
          booking.extensionAmountPaise = (booking.extensionAmountPaise ?? 0) + extensionAmountPaise
          booking.totalAmountPaise += extensionAmountPaise
          recordAction(id, 'extend', body)
          break
        }
        case 'flag':
          booking.isFlagged = true
          booking.flagType = (body.flagType as string) ?? null
          booking.flagNotes = (body.flagNotes as string) ?? null
          recordAction(id, 'flag', body)
          break
        case 'unflag':
          booking.isFlagged = false
          booking.flagType = null
          booking.flagNotes = null
          recordAction(id, 'unflag', body)
          break
      }

      await route.fulfill({ json: booking })
      return
    }

    const detailMatch = url.pathname.match(/\/admin\/bookings\/([^/]+)$/)
    if (method === 'GET' && detailMatch && detailMatch[1] !== 'active' && detailMatch[1] !== 'kpis') {
      const id = detailMatch[1]
      const booking = store.get(id)
      if (!booking) {
        await route.fulfill({ status: 404, json: { message: 'Not found' } })
        return
      }
      await route.fulfill({
        json: {
          booking,
          property: { id: booking.propertyId, name: 'PayPerHour Demo Suites', city: 'Bangalore', area: 'Indiranagar' },
          guest: { id: booking.guestId, phone: '9876500001', email: 'guest@example.com' },
          timeline: [
            { at: booking.createdAt, label: 'Booking created' },
            { at: booking.createdAt, label: 'Payment received', detail: 'success' },
          ],
          adminActions: actions.get(id) ?? [],
        },
      })
      return
    }

    if (method === 'GET' && url.pathname.endsWith('/admin/bookings/active')) {
      const items = Array.from(store.values())
        .filter((b) => b.status === 'checked_in')
        .map((b) => {
          const item = toListItem(b)
          const checkOut = new Date(b.checkOutAt).getTime()
          const timeRemainingSeconds = Math.round((checkOut - Date.now()) / 1000)
          return { ...item, timeRemainingSeconds, isOverdue: timeRemainingSeconds < 0 }
        })
      await route.fulfill({ json: items })
      return
    }

    if (method === 'GET' && url.pathname.endsWith('/admin/bookings/kpis')) {
      const all = Array.from(store.values())
      const totalBookings = all.length
      const totalGbvPaise = all.reduce((sum, b) => sum + b.totalAmountPaise, 0)
      const cancelled = all.filter((b) => b.status === 'cancelled').length
      const noShow = all.filter((b) => b.status === 'no_show').length
      await route.fulfill({
        json: {
          totalBookings,
          totalGbvPaise,
          cancellationRate: totalBookings ? Math.round((cancelled / totalBookings) * 100) : 0,
          avgBookingValuePaise: totalBookings ? Math.round(totalGbvPaise / totalBookings) : 0,
          noShowRate: totalBookings ? Math.round((noShow / totalBookings) * 100) : 0,
        },
      })
      return
    }

    if (method === 'GET' && url.pathname.endsWith('/admin/bookings')) {
      let items = Array.from(store.values()).map(toListItem)

      const bookingRef = url.searchParams.get('bookingRef')
      if (bookingRef) items = items.filter((i) => i.bookingRef.toLowerCase().includes(bookingRef.toLowerCase()))

      const status = url.searchParams.get('status')
      if (status) {
        const statuses = status.split(',') as BookingStatus[]
        items = items.filter((i) => statuses.includes(i.status))
      }

      const sort = url.searchParams.get('sort') ?? 'createdAt'
      const order = url.searchParams.get('order') ?? 'desc'
      items = [...items].sort((a, b) => {
        const av = (a as unknown as Record<string, string | number>)[sort]
        const bv = (b as unknown as Record<string, string | number>)[sort]
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return order === 'asc' ? cmp : -cmp
      })

      await route.fulfill({ json: { items, total: items.length, page: 1, limit: 50 } })
      return
    }

    await route.continue()
  })

  return store
}

async function loginAsAdmin(page: Page) {
  // Admin lands on /admin/verification first, which calls the properties queue API —
  // mock it so an unmocked 401 doesn't trigger logout and redirect back to /login.
  await page.route('**/api/admin/properties**', async (route) => {
    await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 20 } })
  })

  await page.goto('/login')
  await page.evaluate(() => localStorage.removeItem('stayflex-auth'))
  await page.goto('/login')
  await page.getByTestId('demo-admin').click()
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL('/admin/verification', { timeout: 5000 })
}

const BASE_BOOKINGS: AdminBooking[] = [
  makeBooking({
    id: 'b-confirmed',
    bookingRef: 'PPH-B-00010',
    status: 'confirmed',
    paymentStatus: 'success',
    totalAmountPaise: 283200,
    refundAmountPaise: 0,
  }),
  makeBooking({
    id: 'b-checked-in',
    bookingRef: 'PPH-B-00011',
    status: 'checked_in',
    paymentStatus: 'success',
    checkedInAt: '2026-06-13T13:05:00.000Z',
    checkOutAt: '2026-06-13T16:00:00.000Z',
    totalAmountPaise: 283200,
    refundAmountPaise: 0,
  }),
  makeBooking({
    id: 'b-cancelled-flagged',
    bookingRef: 'PPH-B-00012',
    status: 'cancelled',
    paymentStatus: 'success',
    isFlagged: true,
    flagType: 'suspicious',
    totalAmountPaise: 150000,
    refundAmountPaise: 0,
  }),
]

test.describe('Admin — Bookings list', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminBookingsApi(page, BASE_BOOKINGS.map((b) => ({ ...b })))
    await loginAsAdmin(page)
    await page.goto('/admin/bookings')
  })

  test('shows KPI strip and bookings table', async ({ page }) => {
    await expect(page.getByText('Total bookings')).toBeVisible()
    await expect(page.getByText('3', { exact: true }).first()).toBeVisible()
    await expect(page.getByTestId('booking-row-b-confirmed')).toBeVisible()
    await expect(page.getByTestId('booking-row-b-checked-in')).toBeVisible()
    await expect(page.getByTestId('booking-row-b-cancelled-flagged')).toBeVisible()
  })

  test('booking ref filter narrows the list and syncs the URL', async ({ page }) => {
    await page.getByPlaceholder('PPH-B-00001').fill('PPH-B-00011')
    await expect(page).toHaveURL(/bookingRef=PPH-B-00011/, { timeout: 3000 })
    await expect(page.getByTestId('booking-row-b-checked-in')).toBeVisible()
    await expect(page.getByTestId('booking-row-b-confirmed')).not.toBeVisible()
  })

  test('status filter shows only matching bookings', async ({ page }) => {
    await page.getByRole('button', { name: /^Status/ }).click()
    await page.getByRole('menuitemcheckbox', { name: 'Cancelled' }).click()
    await expect(page).toHaveURL(/status=/, { timeout: 3000 })
    await expect(page.getByTestId('booking-row-b-cancelled-flagged')).toBeVisible()
    await expect(page.getByTestId('booking-row-b-confirmed')).not.toBeVisible()
  })

  test('sortable amount column toggles sort order in the URL', async ({ page }) => {
    await page.getByRole('button', { name: /Amount/ }).click()
    await expect(page).toHaveURL(/sort=totalAmountPaise.*order=desc|order=desc.*sort=totalAmountPaise/, { timeout: 3000 })
    await page.getByRole('button', { name: /Amount/ }).click()
    await expect(page).toHaveURL(/order=asc/, { timeout: 3000 })
  })

  test('pagination is disabled when only one page of results exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
  })
})

test.describe('Admin — Active now', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminBookingsApi(page, BASE_BOOKINGS.map((b) => ({ ...b })))
    await loginAsAdmin(page)
    await page.goto('/admin/bookings')
  })

  test('shows checked-in guests on the Active now tab', async ({ page }) => {
    await page.getByRole('button', { name: /Active now/ }).click()
    await expect(page.getByText('1', { exact: true })).toBeVisible()
    await expect(page.getByText('guests currently checked in')).toBeVisible()
    await expect(page.getByText('PPH-B-00011')).toBeVisible()
  })
})

test.describe('Admin — Booking detail drawer & actions', () => {
  test('confirmed booking shows void/cancel/refund/flag actions', async ({ page }) => {
    await mockAdminBookingsApi(page, BASE_BOOKINGS.map((b) => ({ ...b })))
    await loginAsAdmin(page)
    await page.goto('/admin/bookings')

    await page.getByTestId('booking-row-b-confirmed').click()
    await expect(page.getByRole('heading', { name: 'PPH-B-00010' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Void' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Refund' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Flag' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Force checkout' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Extend' })).not.toBeVisible()
  })

  test('void flow transitions a confirmed booking to voided and refunds it', async ({ page }) => {
    await mockAdminBookingsApi(page, BASE_BOOKINGS.map((b) => ({ ...b })))
    await loginAsAdmin(page)
    await page.goto('/admin/bookings')

    await page.getByTestId('booking-row-b-confirmed').click()
    await page.getByRole('button', { name: 'Void' }).click()
    await expect(page.getByRole('dialog', { name: 'Void booking' })).toBeVisible()
    await page.getByRole('button', { name: 'Void booking' }).click()

    await expect(page.getByText('Action completed').last()).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByTestId('booking-row-b-confirmed')).toContainText('Voided')
    await expect(page.getByTestId('booking-row-b-confirmed')).toContainText('refunded')
    // Only Flag remains available for a voided booking
    await expect(page.getByRole('button', { name: 'Void' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Flag' })).toBeVisible()
  })

  test('cancel flow transitions a confirmed booking to cancelled', async ({ page }) => {
    await mockAdminBookingsApi(page, BASE_BOOKINGS.map((b) => ({ ...b })))
    await loginAsAdmin(page)
    await page.goto('/admin/bookings')

    await page.getByTestId('booking-row-b-confirmed').click()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('dialog', { name: 'Cancel booking' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel booking' }).click()

    await expect(page.getByText('Action completed').last()).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('booking-row-b-confirmed')).toContainText('Cancelled')
  })

  test('refund flow supports partial then full refund with double confirmation', async ({ page }) => {
    await mockAdminBookingsApi(page, BASE_BOOKINGS.map((b) => ({ ...b })))
    await loginAsAdmin(page)
    await page.goto('/admin/bookings')

    await page.getByTestId('booking-row-b-confirmed').click()
    await page.getByRole('button', { name: 'Refund' }).click()
    await expect(page.getByRole('dialog', { name: 'Issue refund' })).toBeVisible()
    await expect(page.getByText('Remaining refundable balance: ₹2,832')).toBeVisible()

    // Partial refund
    await page.getByLabel('Refund amount (₹)').fill('1000')
    await page.getByLabel('Reason').fill('Service issue')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('dialog', { name: 'Confirm refund' })).toBeVisible()
    await expect(page.getByText('You are about to refund')).toBeVisible()
    await expect(page.getByText('₹1,000')).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Confirm refund' }).getByText('PPH-B-00010')).toBeVisible()
    await page.getByRole('button', { name: 'Confirm refund' }).click()

    await expect(page.getByText('Action completed').last()).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('booking-row-b-confirmed')).toContainText('refunded')

    // Full refund of remaining balance
    await page.getByRole('button', { name: 'Refund' }).click()
    await expect(page.getByText('Remaining refundable balance: ₹1,832')).toBeVisible()
    await page.getByLabel('Refund amount (₹)').fill('1832')
    await page.getByLabel('Reason').fill('Goodwill - full refund')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Confirm refund' }).click()

    await expect(page.getByText('Action completed').last()).toBeVisible({ timeout: 3000 })
    // Refund button disappears once the remaining balance reaches zero
    await expect(page.getByRole('button', { name: 'Refund' })).not.toBeVisible()
  })

  test('checked-in booking shows refund/force-checkout/extend/flag actions', async ({ page }) => {
    await mockAdminBookingsApi(page, BASE_BOOKINGS.map((b) => ({ ...b })))
    await loginAsAdmin(page)
    await page.goto('/admin/bookings')

    await page.getByTestId('booking-row-b-checked-in').click()
    await expect(page.getByRole('heading', { name: 'PPH-B-00011' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Refund' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Force checkout' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Extend' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Void' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).not.toBeVisible()
  })

  test('force checkout flow transitions a checked-in booking to completed', async ({ page }) => {
    await mockAdminBookingsApi(page, BASE_BOOKINGS.map((b) => ({ ...b })))
    await loginAsAdmin(page)
    await page.goto('/admin/bookings')

    await page.getByTestId('booking-row-b-checked-in').click()
    await page.getByRole('button', { name: 'Force checkout' }).click()
    await expect(page.getByRole('dialog', { name: 'Force checkout' })).toBeVisible()
    await page.getByLabel('Reason').fill('Guest left without checking out')
    await page.getByRole('dialog').getByRole('button', { name: 'Force checkout' }).click()

    await expect(page.getByText('Action completed').last()).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('booking-row-b-checked-in')).toContainText('Completed')
    await expect(page.getByRole('button', { name: 'Force checkout' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Extend' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Refund' })).toBeVisible()
  })

  test('extend flow updates check-out time and total amount', async ({ page }) => {
    await mockAdminBookingsApi(page, BASE_BOOKINGS.map((b) => ({ ...b })))
    await loginAsAdmin(page)
    await page.goto('/admin/bookings')

    await page.getByTestId('booking-row-b-checked-in').click()
    await page.getByRole('button', { name: 'Extend' }).click()
    await expect(page.getByRole('dialog', { name: 'Extend booking' })).toBeVisible()

    await page.getByLabel('New check-out time').fill('2026-06-14T00:30')
    await page.getByLabel('Extension amount (₹)').fill('500')
    await page.getByRole('button', { name: 'Extend booking' }).click()

    await expect(page.getByText('Action completed').last()).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('booking-row-b-checked-in')).toContainText('₹3,332')
  })

  test('flag and unflag flow toggles the flagged state', async ({ page }) => {
    await mockAdminBookingsApi(page, BASE_BOOKINGS.map((b) => ({ ...b })))
    await loginAsAdmin(page)
    await page.goto('/admin/bookings')

    // Flag an unflagged booking
    await page.getByTestId('booking-row-b-confirmed').click()
    await page.getByRole('button', { name: 'Flag', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Flag booking' })).toBeVisible()
    await page.getByRole('button', { name: 'Flag booking' }).click()
    await expect(page.getByText('Action completed').last()).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: 'Remove flag' })).toBeVisible()

    // Unflag the already-flagged cancelled booking
    await page.getByRole('button', { name: 'Close' }).first().click()
    await page.getByTestId('booking-row-b-cancelled-flagged').click()
    await expect(page.getByRole('button', { name: 'Remove flag' })).toBeVisible()
    await page.getByRole('button', { name: 'Remove flag' }).click()
    await expect(page.getByRole('dialog', { name: 'Remove flag' })).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Remove flag' }).click()
    await expect(page.getByText('Action completed').last()).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: 'Flag', exact: true })).toBeVisible()
  })
})
