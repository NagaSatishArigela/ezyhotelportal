import { test, expect, type Page } from '@playwright/test'
import type { ReviewListItem, PropertyRatingSummary } from '../src/lib/api/ownerReviews'

const replyWindowEnd = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

const BASE_REVIEWS: ReviewListItem[] = [
  {
    id: 'rv-1',
    bookingId: 'bk-1',
    bookingRef: 'PPH-B-00001',
    guestName: 'Priya Menon',
    scoreOverall: 5,
    displayScore: '4.70',
    scoreCleanliness: 5,
    scoreAmenities: 5,
    scoreAccuracy: 5,
    scoreValue: 4,
    scoreCheckin: 5,
    reviewText: 'Clean rooms and quick check-in. Highly recommend.',
    photoUrls: [],
    status: 'published',
    ownerReply: null,
    ownerRepliedAt: null,
    replyWindowEnd,
    submittedAt: '2026-06-14T15:00:00.000Z',
    publishedAt: '2026-06-14T15:00:00.000Z',
  },
  {
    id: 'rv-2',
    bookingId: 'bk-2',
    bookingRef: 'PPH-B-00002',
    guestName: 'Rahul Shah',
    scoreOverall: 4,
    displayScore: '3.90',
    scoreCleanliness: 4,
    scoreAmenities: 4,
    scoreAccuracy: 4,
    scoreValue: 4,
    scoreCheckin: 3,
    reviewText: 'Good stay, but check-in took a while.',
    photoUrls: [],
    status: 'published',
    ownerReply: 'Thank you for your feedback!',
    ownerRepliedAt: '2026-06-15T10:00:00.000Z',
    replyWindowEnd,
    submittedAt: '2026-06-13T09:00:00.000Z',
    publishedAt: '2026-06-13T09:00:00.000Z',
  },
  {
    id: 'rv-3',
    bookingId: 'bk-3',
    bookingRef: 'PPH-B-00003',
    guestName: 'Aditi Rao',
    scoreOverall: 2,
    displayScore: '2.40',
    scoreCleanliness: 2,
    scoreAmenities: 3,
    scoreAccuracy: 2,
    scoreValue: 3,
    scoreCheckin: 2,
    reviewText: 'Not as advertised.',
    photoUrls: [],
    status: 'flagged',
    ownerReply: null,
    ownerRepliedAt: null,
    replyWindowEnd: null,
    submittedAt: '2026-06-12T08:00:00.000Z',
    publishedAt: null,
  },
]

const SUMMARY: PropertyRatingSummary = {
  ratingAvg: 4.2,
  ratingCount: 8,
  breakdown: { '1': 0, '2': 1, '3': 1, '4': 3, '5': 3 },
  dimensions: { cleanliness: 4.5, amenities: 4.1, accuracy: 4.3, value: 4.0, checkin: 4.2 },
  meetsThreshold: true,
}

async function mockOwnerReviewsApi(page: Page, reviews: ReviewListItem[]) {
  const store = new Map<string, ReviewListItem>(reviews.map((r) => [r.id, r]))

  await page.route('**/api/owner/properties/**/reviews**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    const all = Array.from(store.values())
    await route.fulfill({ json: { items: all, total: all.length, page: 1, limit: 20 } })
  })

  await page.route('**/api/properties/*/reviews/summary', async (route) => {
    await route.fulfill({ json: SUMMARY })
  })

  await page.route('**/api/owner/reviews/*/reply', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    const id = new URL(route.request().url()).pathname.match(/\/owner\/reviews\/([^/]+)\/reply/)?.[1]
    const body = JSON.parse(route.request().postData() ?? '{}')
    const review = id ? store.get(id) : undefined
    if (review) {
      review.ownerReply = body.reply
      review.ownerRepliedAt = new Date().toISOString()
    }
    await route.fulfill({ json: review ?? {} })
  })

  await page.route('**/api/owner/reviews/*/flag', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    await route.fulfill({ status: 201, json: {} })
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

  return { store }
}

async function loginAsOwner(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.removeItem('stayflex-auth'))
  await page.goto('/login')
  await page.getByTestId('demo-approved').click()
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL('/owner/dashboard', { timeout: 5000 })
}

test.describe('Owner — Reviews page', () => {
  test.beforeEach(async ({ page }) => {
    await mockOwnerReviewsApi(page, BASE_REVIEWS.map((r) => ({ ...r })))
    await loginAsOwner(page)
    await page.goto('/owner/reviews')
    await expect(page.getByRole('main').locator('h1')).toHaveText('Reviews')
  })

  test('shows rating summary card with real data', async ({ page }) => {
    await expect(page.getByText('4.2', { exact: true })).toBeVisible()
    await expect(page.getByText('8 reviews')).toBeVisible()
    await expect(page.getByText('Cleanliness')).toBeVisible()
  })

  test('lists published and flagged reviews', async ({ page }) => {
    const rows = page.getByTestId('review-row')
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0).getByText('Priya Menon')).toBeVisible()
    await expect(rows.nth(0).getByText('Published')).toBeVisible()
    await expect(rows.nth(2).getByText('Flagged')).toBeVisible()
  })

  test('shows Reply button only for published reviews without a reply in window', async ({ page }) => {
    const rows = page.getByTestId('review-row')
    await expect(rows.nth(0).getByTestId('reply-btn')).toBeVisible()
    // rv-2 already has a reply
    await expect(rows.nth(1).getByTestId('reply-btn')).not.toBeVisible()
    // rv-3 is flagged
    await expect(rows.nth(2).getByTestId('reply-btn')).not.toBeVisible()
  })

  test('submits reply via dialog and updates row', async ({ page }) => {
    const firstRow = page.getByTestId('review-row').nth(0)
    await firstRow.getByTestId('reply-btn').click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Reply to review')).toBeVisible()

    await dialog.getByRole('textbox').fill('Thank you for your kind words!')
    await dialog.getByRole('button', { name: 'Post reply' }).click()

    await expect(dialog).not.toBeVisible()
    await expect(firstRow.getByText('Thank you for your kind words!')).toBeVisible()
  })

  test('shows existing reply in row without Reply button', async ({ page }) => {
    const secondRow = page.getByTestId('review-row').nth(1)
    await expect(secondRow.getByText('Thank you for your feedback!')).toBeVisible()
    await expect(secondRow.getByTestId('reply-btn')).not.toBeVisible()
  })

  test('opens flag dialog for published review', async ({ page }) => {
    const firstRow = page.getByTestId('review-row').nth(0)
    await firstRow.getByTestId('flag-btn').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Flag review' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Flag review' }).click()
    await expect(dialog).not.toBeVisible()
  })
})
