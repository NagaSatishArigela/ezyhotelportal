import { test, expect, type Page } from '@playwright/test'
import type { ReviewListItem } from '../src/lib/api/adminReviews'

function makeReview(overrides: Partial<ReviewListItem> & { id: string }): ReviewListItem {
  return {
    bookingId: 'bk-' + overrides.id,
    bookingRef: 'PPH-B-0000' + overrides.id,
    guestName: 'Guest ' + overrides.id,
    scoreOverall: 3,
    displayScore: '3.50',
    scoreCleanliness: 4,
    scoreAmenities: 3,
    scoreAccuracy: 4,
    scoreValue: 3,
    scoreCheckin: 3,
    reviewText: 'Test review text for ' + overrides.id,
    photoUrls: [],
    status: 'flagged',
    ownerReply: null,
    ownerRepliedAt: null,
    replyWindowEnd: null,
    submittedAt: '2026-06-14T10:00:00.000Z',
    publishedAt: null,
    ...overrides,
  }
}

const BASE_FLAGGED: ReviewListItem[] = [
  makeReview({ id: 'rv-1', status: 'flagged', reviewText: 'Contains phone +91 9876543210 please delete.' }),
  makeReview({ id: 'rv-2', status: 'flagged', reviewText: 'This listing is completely fake.' }),
]

const ALL_REVIEWS: ReviewListItem[] = [
  makeReview({ id: 'rv-1', status: 'flagged' }),
  makeReview({ id: 'rv-2', status: 'flagged' }),
  makeReview({ id: 'rv-3', status: 'published', scoreOverall: 5, displayScore: '4.80', publishedAt: '2026-06-13T08:00:00.000Z' }),
]

async function mockAdminReviewsApi(page: Page, _flagged: ReviewListItem[], allReviews: ReviewListItem[]) {
  const store = new Map<string, ReviewListItem>(allReviews.map((r) => [r.id, r]))

  // Single handler for all /admin/reviews** requests — avoids glob ordering ambiguity
  await page.route('**/api/admin/reviews**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const method = route.request().method()

    if (method === 'POST') {
      const id = path.match(/\/admin\/reviews\/([^/]+)\/moderate/)?.[1]
      const body = JSON.parse(route.request().postData() ?? '{}')
      const review = id ? store.get(id) : undefined
      if (review) {
        review.status = body.action === 'publish' ? 'published' : 'removed'
        if (body.action === 'publish') review.publishedAt = new Date().toISOString()
      }
      await route.fulfill({ json: review ?? {} })
      return
    }

    if (path.endsWith('/flagged-count')) {
      const count = Array.from(store.values()).filter((r) => r.status === 'flagged').length
      await route.fulfill({ json: { count } })
      return
    }

    if (path.endsWith('/flagged')) {
      const items = Array.from(store.values()).filter((r) => r.status === 'flagged')
      await route.fulfill({ json: { items, total: items.length, page: 1, limit: 20 } })
      return
    }

    if (path.match(/\/admin\/reviews\/[^/]+\/audit/)) {
      await route.fulfill({ json: [] })
      return
    }

    // All reviews list
    const items = Array.from(store.values())
    await route.fulfill({ json: { items, total: items.length, page: 1, limit: 20 } })
  })

  // Verification page fires a property queue query — mock it so the 401 interceptor
  // doesn't fire while navigating through /admin/verification to /admin/reviews
  await page.route('**/api/admin/properties**', async (route) => {
    await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 20 } })
  })

  // Badge endpoints for other sidebar items
  await page.route('**/api/admin/disputes/unresolved-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })

  await page.route('**/api/admin/anomalies/unresolved-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })

  return { store }
}

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.removeItem('stayflex-auth'))
  await page.goto('/login')
  await page.getByTestId('demo-admin').click()
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL('/admin/verification', { timeout: 5000 })
}

test.describe('Admin — Reviews page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminReviewsApi(page, BASE_FLAGGED.map((r) => ({ ...r })), ALL_REVIEWS.map((r) => ({ ...r })))
    await loginAsAdmin(page)
    await page.goto('/admin/reviews')
  })

  test('shows Flagged tab as default and lists flagged reviews', async ({ page }) => {
    const tab = page.getByTestId('tab-flagged')
    await expect(tab).toHaveAttribute('aria-selected', 'true')

    const rows = page.getByTestId('flagged-review-row')
    await expect(rows).toHaveCount(2)
    await expect(rows.nth(0).getByText('Guest rv-1', { exact: true })).toBeVisible()
  })

  test('shows Publish and Remove buttons on flagged rows', async ({ page }) => {
    const firstRow = page.getByTestId('flagged-review-row').nth(0)
    await expect(firstRow.getByTestId('publish-btn')).toBeVisible()
    await expect(firstRow.getByTestId('remove-btn')).toBeVisible()
  })

  test('Publish action removes review from flagged queue', async ({ page }) => {
    await expect(page.getByTestId('flagged-review-row')).toHaveCount(2)

    await page.getByTestId('flagged-review-row').nth(0).getByTestId('publish-btn').click()

    await expect(page.getByTestId('flagged-review-row')).toHaveCount(1)
  })

  test('Remove action requires a reason in dialog', async ({ page }) => {
    await page.getByTestId('flagged-review-row').nth(0).getByTestId('remove-btn').click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Remove review' })).toBeVisible()

    // Submit without reason should show validation error
    await dialog.getByRole('button', { name: 'Remove review' }).click()
    await expect(dialog.getByText('Reason is required', { exact: true })).toBeVisible()
  })

  test('Remove with reason closes dialog and removes from queue', async ({ page }) => {
    await expect(page.getByTestId('flagged-review-row')).toHaveCount(2)

    await page.getByTestId('flagged-review-row').nth(0).getByTestId('remove-btn').click()
    const dialog = page.getByRole('dialog')
    await dialog.getByTestId('remove-reason').fill('Policy violation: PII detected')
    await dialog.getByRole('button', { name: 'Remove review' }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByTestId('flagged-review-row')).toHaveCount(1)
  })

  test('All Reviews tab shows all reviews including published', async ({ page }) => {
    await page.getByTestId('tab-all').click()

    await expect(page.getByTestId('tab-all')).toHaveAttribute('aria-selected', 'true')
    const rows = page.getByTestId('all-review-row')
    await expect(rows).toHaveCount(3)
  })

  test('sidebar badge shows flagged count from API', async ({ page }) => {
    // flagged-count returns 2 initially
    await expect(page.getByRole('navigation').getByText('2', { exact: true })).toBeVisible()
  })
})
