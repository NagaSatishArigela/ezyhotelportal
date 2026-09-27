import { test, expect, type Page } from '@playwright/test'
import type { OwnerPayoutSummary, OwnerPayoutDetail } from '../src/lib/api/ownerPayouts'

function makeSummary(overrides: Partial<OwnerPayoutSummary> & { id: string }): OwnerPayoutSummary {
  return {
    id: overrides.id,
    batchRef: `PAY-202606${overrides.id}`,
    cycleStartAt: '2026-06-09T00:00:00.000Z',
    cycleEndAt: '2026-06-15T23:59:59.999Z',
    batchStatus: 'released',
    status: 'released',
    grossAmountPaise: 500_000,
    tdsPaise: 5_000,
    netAmountPaise: 495_000,
    bookingCount: 3,
    releasedAt: '2026-06-17T03:00:00.000Z',
    ...overrides,
  }
}

const PAYOUTS: OwnerPayoutSummary[] = [
  makeSummary({ id: '01', batchRef: 'PAY-20260615', status: 'released', netAmountPaise: 495_000 }),
  makeSummary({ id: '02', batchRef: 'PAY-20260608', status: 'pending', netAmountPaise: 200_000 }),
]

const DETAIL: OwnerPayoutDetail = {
  ...PAYOUTS[0],
  bankRef: 'MOCK-1234-abcd1234',
  bookings: [
    { bookingId: 'bk-aaaa-1111-bbbb-cccc', ownerGrossPaise: 200_000, tdsPaise: 2_000 },
    { bookingId: 'bk-bbbb-2222-cccc-dddd', ownerGrossPaise: 300_000, tdsPaise: 3_000 },
  ],
}

async function mockOwnerPayoutsApi(page: Page) {
  await page.route('**/api/owner/payouts**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname

    const detailMatch = path.match(/\/owner\/payouts\/([^/]+)$/)
    if (detailMatch) {
      await route.fulfill({ json: DETAIL })
      return
    }

    await route.fulfill({ json: { items: PAYOUTS, total: PAYOUTS.length, page: 1, limit: 20 } })
  })

  // Shared owner mocks
  await page.route('**/api/owner/properties/**/reviews**', async (route) => {
    await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 20 } })
  })
  await page.route('**/api/properties/*/reviews/summary', async (route) => {
    await route.fulfill({ json: { ratingAvg: 0, ratingCount: 0, breakdown: {}, dimensions: {}, meetsThreshold: false } })
  })
  await page.route('**/api/owners/me/notifications**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/unread-count')) {
      await route.fulfill({ json: { count: 0 } })
      return
    }
    if (route.request().method() === 'PATCH') {
      await route.fulfill({ json: { updated: 0 } })
      return
    }
    await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 20, unreadCount: 0 } })
  })
}

async function loginAsOwner(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.removeItem('stayflex-auth'))
  await page.goto('/login')
  await page.getByTestId('email-input').fill('approved@demo.com')
  await page.getByTestId('password-input').fill('demo1234')
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL('/owner/dashboard', { timeout: 5000 })
}

test.describe('Owner — Payouts page', () => {
  test.beforeEach(async ({ page }) => {
    await mockOwnerPayoutsApi(page)
    await loginAsOwner(page)
    await page.goto('/owner/payouts')
    await expect(page.getByRole('main').locator('h1')).toHaveText('Payouts')
  })

  test('shows KPI cards with data', async ({ page }) => {
    await expect(page.getByText('Upcoming settlement')).toBeVisible()
    await expect(page.getByText('Released (all time)')).toBeVisible()
    await expect(page.getByText('TDS deducted (all time)')).toBeVisible()
  })

  test('lists payout rows in table', async ({ page }) => {
    const rows = page.getByTestId('payout-row')
    await expect(rows).toHaveCount(2)
    await expect(rows.nth(0).getByText('PAY-20260615')).toBeVisible()
    await expect(rows.nth(1).getByText('PAY-20260608')).toBeVisible()
  })

  test('shows released and pending badges', async ({ page }) => {
    const rows = page.getByTestId('payout-row')
    await expect(rows.nth(0).getByText('Released')).toBeVisible()
    await expect(rows.nth(1).getByText('Pending')).toBeVisible()
  })

  test('detail dialog shows booking breakdown', async ({ page }) => {
    await page.getByTestId('payout-detail-btn').first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Settlement PAY-20260615')).toBeVisible()

    const table = dialog.getByTestId('booking-breakdown-table')
    await expect(table).toBeVisible()
    const bookingRows = table.locator('tbody tr')
    await expect(bookingRows).toHaveCount(2)
  })

  test('TDS certificate button is present (stub)', async ({ page }) => {
    await page.getByTestId('payout-detail-btn').first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: /TDS certificate/ })).toBeVisible()
  })
})
