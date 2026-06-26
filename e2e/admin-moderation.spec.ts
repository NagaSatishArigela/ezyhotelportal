import { test, expect, type Page } from '@playwright/test'
import type { AdminPropertyDetail, PropertyQueueItem, PropertyStatus } from '../src/lib/api/adminProperties'

const QUEUE_ITEMS: PropertyQueueItem[] = [
  {
    id: 'prop-1',
    name: 'Aurora Boutique',
    ownerId: 'owner-1',
    status: 'pending_review',
    submissionRef: 'SUB-1001',
    submittedAt: '2026-06-01T10:00:00.000Z',
    revisionCount: 0,
  },
  {
    id: 'prop-2',
    name: 'Sunset Heights',
    ownerId: 'owner-2',
    status: 'pending_review',
    submissionRef: 'SUB-1002',
    submittedAt: '2026-06-02T10:00:00.000Z',
    revisionCount: 3,
  },
  {
    id: 'prop-3',
    name: 'Marina Residency',
    ownerId: 'owner-3',
    status: 'needs_revision',
    submissionRef: 'SUB-1003',
    submittedAt: '2026-06-03T10:00:00.000Z',
    revisionCount: 1,
  },
  {
    id: 'prop-4',
    name: 'Hilltop Inn',
    ownerId: 'owner-4',
    status: 'escalated',
    submissionRef: 'SUB-1004',
    submittedAt: '2026-06-04T10:00:00.000Z',
    revisionCount: 4,
  },
  {
    id: 'prop-5',
    name: 'Garden View',
    ownerId: 'owner-5',
    status: 'approved',
    submissionRef: 'SUB-1005',
    submittedAt: '2026-06-05T10:00:00.000Z',
    revisionCount: 0,
  },
  {
    id: 'prop-6',
    name: 'Lakeside Stay',
    ownerId: 'owner-6',
    status: 'rejected',
    submissionRef: 'SUB-1006',
    submittedAt: '2026-06-06T10:00:00.000Z',
    revisionCount: 0,
  },
]

function buildDetail(item: PropertyQueueItem): AdminPropertyDetail {
  return {
    property: {
      id: item.id,
      name: item.name,
      ownerId: item.ownerId,
      status: item.status,
      submissionRef: item.submissionRef,
      submittedAt: item.submittedAt,
      revisionCount: item.revisionCount,
      revisionNotes: null,
      propertyType: 'hotel',
      bookingPolicy: 'hourly_and_fullday',
      category: 'mid_range',
      description: 'A lovely place to stay.',
      addressLine1: '123 Main Street',
      addressLine2: null,
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      landmark: null,
      amenities: ['WiFi', 'AC'],
      minBookingHours: 2,
      defaultCheckinTime: '12:00',
      defaultCheckoutTime: '11:00',
      seatingCapacity: null,
    },
    roomTypes: [
      { id: 'rt-1', type: 'Deluxe', count: 4, hourlyRatePaise: 50000, fulldayRatePaise: 250000, maxOccupancy: 2 },
    ],
    photos: [
      { id: 'photo-1', category: 'exterior', url: 'https://example.com/photo1.jpg', isPrimary: true, sortOrder: 0 },
    ],
    compliance: {
      legalBusinessName: `${item.name} Pvt Ltd`,
      gstin: '27ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      bankAccountNumber: '123456789012',
      ifsc: 'HDFC0000123',
      accountHolderName: `${item.name} Pvt Ltd`,
      documents: [
        { type: 'pan_card', url: 'https://example.com/pan.pdf', status: 'verified', expiresAt: null },
        { type: 'gst_certificate', url: 'https://example.com/gst.pdf', status: 'pending', expiresAt: null },
      ],
    },
  }
}

const DETAILS: Record<string, AdminPropertyDetail> = Object.fromEntries(
  QUEUE_ITEMS.map((item) => [item.id, buildDetail(item)]),
)

async function mockAdminPropertiesApi(page: Page) {
  await page.route('**/api/admin/reviews/flagged-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })

  await page.route('**/api/admin/disputes/unresolved-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })

  await page.route('**/api/admin/anomalies/unresolved-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })

  await page.route('**/api/admin/properties**', async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())

    const actionMatch = url.pathname.match(/\/admin\/properties\/([^/]+)\/(approve|reject|request-revision)$/)
    if (actionMatch) {
      const [, id, action] = actionMatch
      if (action === 'approve') {
        await route.fulfill({ json: { propertyId: id, status: 'approved' } })
        return
      }
      if (action === 'reject') {
        await route.fulfill({ json: { propertyId: id, status: 'rejected' } })
        return
      }
      // request-revision
      const item = QUEUE_ITEMS.find((i) => i.id === id)
      const newStatus: PropertyStatus = (item?.revisionCount ?? 0) >= 3 ? 'escalated' : 'needs_revision'
      await route.fulfill({ json: { propertyId: id, status: newStatus } })
      return
    }

    const detailMatch = url.pathname.match(/\/admin\/properties\/([^/]+)$/)
    if (method === 'GET' && detailMatch) {
      const id = detailMatch[1]
      await route.fulfill({ json: DETAILS[id] })
      return
    }

    if (method === 'GET' && url.pathname.endsWith('/admin/properties')) {
      const status = url.searchParams.get('status') as PropertyStatus | null
      const items = QUEUE_ITEMS.filter((i) => i.status === status)
      await route.fulfill({ json: { items, total: items.length, page: 1, limit: 20 } })
      return
    }

    await route.continue()
  })
}

test.describe('Admin — Property moderation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminPropertiesApi(page)

    await page.goto('/login')
    await page.evaluate(() => localStorage.removeItem('stayflex-auth'))
    await page.goto('/login')
    await page.getByTestId('demo-admin').click()
    await page.getByTestId('login-button').click()
    await expect(page).toHaveURL('/admin/verification', { timeout: 5000 })
  })

  test('shows pending review queue by default', async ({ page }) => {
    await expect(page.getByTestId('queue-row-prop-1')).toBeVisible()
    await expect(page.getByTestId('queue-row-prop-2')).toBeVisible()
    await expect(page.getByText('2 properties in this queue')).toBeVisible()
  })

  test('switching tabs loads the matching queue', async ({ page }) => {
    await page.getByRole('tab', { name: 'Needs revision' }).click()
    await expect(page.getByTestId('queue-row-prop-3')).toBeVisible()
    await expect(page.getByText('1 property in this queue')).toBeVisible()

    await page.getByRole('tab', { name: 'Escalated' }).click()
    await expect(page.getByTestId('queue-row-prop-4')).toBeVisible()

    await page.getByRole('tab', { name: 'Approved' }).click()
    await expect(page.getByTestId('queue-row-prop-5')).toBeVisible()

    await page.getByRole('tab', { name: 'Rejected' }).click()
    await expect(page.getByTestId('queue-row-prop-6')).toBeVisible()
  })

  test('opens property detail dialog with compliance info', async ({ page }) => {
    await page.getByTestId('review-prop-1').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Aurora Boutique Pvt Ltd').first()).toBeVisible()
    await expect(page.getByText('27ABCDE1234F1Z5')).toBeVisible()
    await expect(page.getByTestId('approve-btn')).toBeVisible()
    await expect(page.getByTestId('reject-btn')).toBeVisible()
    await expect(page.getByTestId('revise-btn')).toBeVisible()
  })

  test('approve flow approves the property and closes dialog', async ({ page }) => {
    await page.getByTestId('review-prop-1').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByTestId('approve-btn').click()
    await expect(page.getByText('Property approved')).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('reject flow requires a reason before confirming', async ({ page }) => {
    await page.getByTestId('review-prop-1').click()
    await page.getByTestId('reject-btn').click()
    await expect(page.getByTestId('confirm-reject-btn')).toBeDisabled()

    await page.getByTestId('reject-reason').fill('Photos do not match the listing.')
    await expect(page.getByTestId('confirm-reject-btn')).toBeEnabled()

    await page.getByTestId('confirm-reject-btn').click()
    await expect(page.getByText('Property rejected')).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('request revision flow supports adding and removing items', async ({ page }) => {
    await page.getByTestId('review-prop-1').click()
    await page.getByTestId('revise-btn').click()

    await expect(page.getByTestId('confirm-revision-btn')).toBeDisabled()

    await page.getByTestId('revision-field-0').fill('photos')
    await page.getByTestId('revision-reason-0').fill('Add more exterior photos.')
    await expect(page.getByTestId('confirm-revision-btn')).toBeEnabled()

    await page.getByTestId('add-revision-item-btn').click()
    await page.getByTestId('revision-field-1').fill('pricing')
    await page.getByTestId('revision-reason-1').fill('Clarify weekday vs weekend rates.')

    await page.getByTestId('confirm-revision-btn').click()
    await expect(page.getByText('Revision requested from owner')).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('requesting revision at the cycle cap escalates the property', async ({ page }) => {
    await page.getByTestId('review-prop-2').click()
    await page.getByTestId('revise-btn').click()

    await expect(page.getByText(/final revision cycle/i)).toBeVisible()

    await page.getByTestId('revision-field-0').fill('documents')
    await page.getByTestId('revision-reason-0').fill('Upload a valid fire NOC.')
    await page.getByTestId('confirm-revision-btn').click()

    await expect(page.getByText('Revision cycle cap reached — property escalated')).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
