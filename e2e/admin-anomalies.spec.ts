import { test, expect, type Page } from '@playwright/test'
import type {
  Anomaly,
  AdminAnomalyListItem,
  AnomalyEntityRef,
  AnomalyStatus,
  AnomalySeverity,
} from '../src/lib/api/adminAnomalies'
import type { AdminBooking, AdminBookingAdminAction } from '../src/lib/api/adminBookings'

// Higher rank = more severe; "desc" sort (the table default) puts critical first.
const SEVERITY_RANK: Record<AnomalySeverity, number> = { critical: 3, high: 2, medium: 1, low: 0 }

function makeAnomaly(overrides: Partial<Anomaly> & { id: string; ruleId: string }): Anomaly {
  return {
    id: overrides.id,
    ruleId: overrides.ruleId,
    severity: 'medium',
    entityType: 'property',
    entityId: 'prop-1',
    description: 'Anomaly description',
    evidence: {},
    status: 'detected',
    resolutionType: null,
    resolutionNotes: null,
    resolvedBy: null,
    detectedAt: '2026-06-14T15:00:00.000Z',
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
    checkInAt: '2026-06-13T13:00:00.000Z',
    checkOutAt: '2026-06-13T16:00:00.000Z',
    durationHours: 3,
    guestCount: 2,
    baseAmountPaise: 240000,
    gstAmountPaise: 43200,
    platformFeePaise: 0,
    totalAmountPaise: 283200,
    status: 'no_show',
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

const ENTITY_REFS: Record<string, AnomalyEntityRef> = {
  'a-critical': { type: 'booking', id: 'b-1', label: 'PPH-B-00001', href: '/admin/bookings?bookingId=b-1' },
  'a-high': { type: 'property', id: 'prop-1', label: 'PayPerHour Demo Suites', href: '/admin/properties/prop-1' },
  'a-medium': { type: 'property', id: 'prop-1', label: 'PayPerHour Demo Suites', href: '/admin/properties/prop-1' },
  'a-medium2': { type: 'booking', id: 'b-1', label: 'PPH-B-00001', href: '/admin/bookings?bookingId=b-1' },
}

const EVIDENCE: Record<string, Record<string, unknown>> = {
  'a-critical': {
    roomTypeId: 'rt-1',
    overlapStart: '2026-06-13T13:00:00.000Z',
    overlapEnd: '2026-06-13T16:00:00.000Z',
    bookingA: {
      id: 'b-1', bookingRef: 'PPH-B-00001', status: 'no_show', totalAmountPaise: 283200,
      checkInAt: '2026-06-13T13:00:00.000Z', checkOutAt: '2026-06-13T16:00:00.000Z',
    },
    bookingB: {
      id: 'b-2', bookingRef: 'PPH-B-00002', status: 'cancelled', totalAmountPaise: 283200,
      checkInAt: '2026-06-13T13:00:00.000Z', checkOutAt: '2026-06-13T16:00:00.000Z',
    },
  },
  'a-high': { failedPaymentCount: 6, threshold: 5 },
  'a-medium': { cancellationRate: 50, threshold: 30 },
  'a-medium2': {
    bookingId: 'b-1',
    booking: {
      id: 'b-1', bookingRef: 'PPH-B-00001', status: 'no_show', totalAmountPaise: 283200,
      checkInAt: '2026-06-13T13:00:00.000Z', checkOutAt: '2026-06-13T16:00:00.000Z',
    },
  },
}

const BASE_ANOMALIES: Anomaly[] = [
  makeAnomaly({
    id: 'a-critical', ruleId: 'ANO-003', severity: 'critical', entityType: 'booking', entityId: 'b-1',
    description: 'Bookings PPH-B-00001 and PPH-B-00002 both reserve room type rt-1 with overlapping dates.',
    evidence: EVIDENCE['a-critical'], status: 'detected', detectedAt: '2026-06-14T15:00:00.000Z',
  }),
  makeAnomaly({
    id: 'a-high', ruleId: 'ANO-002', severity: 'high', entityType: 'property', entityId: 'prop-1',
    description: 'PayPerHour Demo Suites had 6 failed payments in the last hour (threshold: 5).',
    evidence: EVIDENCE['a-high'], status: 'detected', detectedAt: '2026-06-14T14:00:00.000Z',
  }),
  makeAnomaly({
    id: 'a-medium', ruleId: 'ANO-001', severity: 'medium', entityType: 'property', entityId: 'prop-1',
    description: 'PayPerHour Demo Suites had 1 cancellations out of 2 bookings in the last 7 days (50%, threshold: 30%).',
    evidence: EVIDENCE['a-medium'], status: 'detected', detectedAt: '2026-06-14T13:00:00.000Z',
  }),
  makeAnomaly({
    id: 'a-medium2', ruleId: 'ANO-010', severity: 'medium', entityType: 'booking', entityId: 'b-1',
    description: 'Booking PPH-B-00001 was manually flagged (suspicious): test flag',
    evidence: EVIDENCE['a-medium2'], status: 'detected', detectedAt: '2026-06-14T12:00:00.000Z',
  }),
]

const BASE_BOOKINGS: AdminBooking[] = [
  makeBooking({ id: 'b-1', bookingRef: 'PPH-B-00001', status: 'no_show', isFlagged: true, flagType: 'suspicious', flagNotes: 'test flag' }),
  makeBooking({ id: 'b-2', bookingRef: 'PPH-B-00002', status: 'cancelled' }),
]

async function mockAdminAnomaliesApi(page: Page, anomalies: Anomaly[], bookings: AdminBooking[]) {
  const store = new Map<string, Anomaly>(anomalies.map((a) => [a.id, a]))
  const bookingStore = new Map<string, AdminBooking>(bookings.map((b) => [b.id, b]))
  const relatedActions = new Map<string, AdminBookingAdminAction[]>([
    ['a-critical', [{ id: 'act-1', bookingId: 'b-1', adminId: 'admin-1', action: 'flag', reasonCategory: null, reasonText: 'Overlapping reservation', metadata: null, createdAt: '2026-06-14T15:00:00.000Z' }]],
  ])

  function unresolvedCount() {
    return Array.from(store.values()).filter((a) => a.status === 'detected' || a.status === 'investigating').length
  }

  await page.route('**/api/admin/disputes/unresolved-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })

  await page.route('**/api/admin/reviews/flagged-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })

  await page.route('**/api/admin/anomalies**', async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())

    if (method === 'GET' && url.pathname.endsWith('/admin/anomalies/unresolved-count')) {
      await route.fulfill({ json: { count: unresolvedCount() } })
      return
    }

    const detailMatch = url.pathname.match(/\/admin\/anomalies\/([^/]+)$/)
    if (method === 'GET' && detailMatch) {
      const id = detailMatch[1]
      const anomaly = store.get(id)
      if (!anomaly) {
        await route.fulfill({ status: 404, json: { message: 'Not found' } })
        return
      }
      if (anomaly.status === 'detected') {
        anomaly.status = 'investigating'
      }
      await route.fulfill({
        json: {
          anomaly,
          entity: ENTITY_REFS[id],
          evidence: EVIDENCE[id] ?? {},
          relatedActions: relatedActions.get(id) ?? [],
        },
      })
      return
    }

    if (method === 'PATCH' && detailMatch) {
      const id = detailMatch[1]
      const anomaly = store.get(id)
      if (!anomaly) {
        await route.fulfill({ status: 404, json: { message: 'Not found' } })
        return
      }
      if (anomaly.status === 'resolved_action' || anomaly.status === 'resolved_fp' || anomaly.status === 'escalated') {
        await route.fulfill({ status: 409, json: { message: 'Already resolved' } })
        return
      }
      const body = (request.postDataJSON() as { status: AnomalyStatus; resolutionType?: string; resolutionNotes?: string }) ?? {}
      anomaly.status = body.status
      anomaly.resolutionType = body.resolutionType ?? null
      anomaly.resolutionNotes = body.resolutionNotes ?? null
      anomaly.resolvedBy = 'admin-1'
      anomaly.resolvedAt = new Date().toISOString()
      await route.fulfill({ json: anomaly })
      return
    }

    if (method === 'GET' && url.pathname.endsWith('/admin/anomalies')) {
      let items = Array.from(store.values())

      const severity = url.searchParams.get('severity')
      if (severity) {
        const severities = severity.split(',')
        items = items.filter((a) => severities.includes(a.severity))
      }
      const status = url.searchParams.get('status')
      if (status) {
        const statuses = status.split(',')
        items = items.filter((a) => statuses.includes(a.status))
      }
      const ruleId = url.searchParams.get('ruleId')
      if (ruleId) items = items.filter((a) => a.ruleId === ruleId)

      const sort = url.searchParams.get('sort') ?? 'severity'
      const order = url.searchParams.get('order') ?? 'desc'
      items = [...items].sort((a, b) => {
        let cmp = 0
        if (sort === 'severity') cmp = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
        else if (sort === 'detectedAt') cmp = a.detectedAt < b.detectedAt ? -1 : a.detectedAt > b.detectedAt ? 1 : 0
        else if (sort === 'status') cmp = a.status < b.status ? -1 : a.status > b.status ? 1 : 0
        return order === 'asc' ? cmp : -cmp
      })

      const listItems: AdminAnomalyListItem[] = items.map((a) => ({
        id: a.id,
        ruleId: a.ruleId,
        severity: a.severity,
        entityType: a.entityType,
        entityId: a.entityId,
        entityLabel: ENTITY_REFS[a.id]?.label ?? null,
        description: a.description,
        status: a.status,
        detectedAt: a.detectedAt,
        resolvedAt: a.resolvedAt,
      }))

      await route.fulfill({ json: { items: listItems, total: listItems.length, page: 1, limit: 50 } })
      return
    }

    await route.continue()
  })

  await page.route('**/api/admin/bookings**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()

    if (method === 'GET' && url.pathname.endsWith('/admin/bookings/kpis')) {
      const all = Array.from(bookingStore.values())
      const totalBookings = all.length
      const totalGbvPaise = all.reduce((sum, b) => sum + b.totalAmountPaise, 0)
      await route.fulfill({
        json: {
          totalBookings,
          totalGbvPaise,
          cancellationRate: 0,
          avgBookingValuePaise: totalBookings ? Math.round(totalGbvPaise / totalBookings) : 0,
          noShowRate: 0,
        },
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
  await page.getByTestId('demo-admin').click()
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL('/admin/verification', { timeout: 5000 })
}

test.describe('Admin — Anomalies tab', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminAnomaliesApi(page, BASE_ANOMALIES.map((a) => ({ ...a })), BASE_BOOKINGS.map((b) => ({ ...b })))
    await loginAsAdmin(page)
    await page.goto('/admin/bookings')
    await page.getByRole('button', { name: /Anomalies/ }).click()
  })

  test('shows unresolved count badge and anomalies sorted by severity', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Anomalies/ })).toContainText('4')

    const rows = page.locator('table[aria-label], table').first().locator('tbody tr')
    await expect(rows).toHaveCount(4)
    await expect(rows.nth(0)).toContainText('ANO-003')
    await expect(rows.nth(0)).toContainText('Critical')
    await expect(rows.nth(1)).toContainText('ANO-002')
    await expect(rows.nth(1)).toContainText('High')
    await expect(rows.nth(2)).toContainText('ANO-001')
    await expect(rows.nth(3)).toContainText('ANO-010')
  })

  test('severity filter narrows the list', async ({ page }) => {
    await page.getByTestId('anomaly-filter-severity').click()
    await page.getByRole('menuitemcheckbox', { name: 'Critical' }).click()
    await page.keyboard.press('Escape')

    await expect(page.getByTestId('anomaly-row-a-critical')).toBeVisible()
    await expect(page.getByTestId('anomaly-row-a-high')).not.toBeVisible()
    await expect(page.getByTestId('anomaly-row-a-medium')).not.toBeVisible()
  })

  test('opening a row shows detail and auto-transitions to investigating', async ({ page }) => {
    await page.getByTestId('anomaly-row-a-critical').click()

    const drawer = page.getByTestId('anomaly-detail-drawer')
    await expect(page.getByRole('heading', { name: 'ANO-003' })).toBeVisible()
    await expect(drawer.getByText('Investigating')).toBeVisible()
    await expect(drawer.getByText(/overlapping dates/)).toBeVisible()
    await expect(drawer.getByText('PPH-B-00001', { exact: true }).first()).toBeVisible()
    await expect(drawer.getByText('PPH-B-00002', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Resolve — action taken' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Resolve — false positive' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Escalate' })).toBeVisible()
  })

  test('view booking opens the booking detail drawer from a booking-entity anomaly', async ({ page }) => {
    await page.getByTestId('anomaly-row-a-critical').click()
    await page.getByRole('button', { name: 'View booking' }).click()

    await expect(page.getByRole('heading', { name: 'PPH-B-00001' })).toBeVisible()
  })

  test('resolve — false positive flow updates status and unresolved count', async ({ page }) => {
    await page.getByTestId('anomaly-row-a-medium2').click()
    await page.getByRole('button', { name: 'Resolve — false positive' }).click()

    await expect(page.getByRole('dialog', { name: 'Resolve — false positive' })).toBeVisible()
    await page.getByLabel('Notes').fill('Verified manually — flag was raised in error.')
    await page.getByRole('button', { name: 'Mark as false positive' }).click()

    const drawer = page.getByTestId('anomaly-detail-drawer')
    await expect(page.getByText('Anomaly updated').last()).toBeVisible({ timeout: 3000 })
    await expect(drawer.getByText('Resolved – false positive')).toBeVisible()
    await expect(drawer.getByText('RESOLUTION NOTES', { exact: false })).toBeVisible()
    await expect(drawer.getByText('Verified manually — flag was raised in error.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Resolve — action taken' })).not.toBeVisible()

    await expect(page.getByRole('button', { name: /Anomalies/ })).toContainText('3')
  })

  test('resolve — action taken flow requires a resolution type and notes', async ({ page }) => {
    await page.getByTestId('anomaly-row-a-high').click()
    await page.getByRole('button', { name: 'Resolve — action taken' }).click()

    await expect(page.getByRole('dialog', { name: 'Resolve — action taken' })).toBeVisible()
    await page.getByLabel('Resolution type').selectOption('contacted_owner')
    await page.getByLabel('Notes').fill('Contacted the owner about repeated failed payments.')
    await page.getByRole('button', { name: 'Resolve' }).click()

    const drawer = page.getByTestId('anomaly-detail-drawer')
    await expect(page.getByText('Anomaly updated').last()).toBeVisible({ timeout: 3000 })
    await expect(drawer.getByText('Resolved – action taken')).toBeVisible()
    await expect(drawer.getByText('Contacted owner')).toBeVisible()
  })

  test('escalate flow marks the anomaly as escalated', async ({ page }) => {
    await page.getByTestId('anomaly-row-a-medium').click()
    await page.getByRole('button', { name: 'Escalate' }).click()

    await expect(page.getByRole('dialog', { name: 'Escalate' })).toBeVisible()
    await page.getByLabel('Notes').fill('Escalating to finance for manual review.')
    await page.getByRole('dialog').getByRole('button', { name: 'Escalate' }).click()

    const drawer = page.getByTestId('anomaly-detail-drawer')
    await expect(page.getByText('Anomaly updated').last()).toBeVisible({ timeout: 3000 })
    await expect(drawer.getByText('Escalated', { exact: true })).toBeVisible()
  })
})
