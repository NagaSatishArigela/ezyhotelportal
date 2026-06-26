import { test, expect, type Page } from '@playwright/test'
import type { OwnerNotification, NotificationsListResult } from '../src/lib/api/ownerNotifications'

function makeNotification(overrides: Partial<OwnerNotification> & { id: string }): OwnerNotification {
  return {
    id: overrides.id,
    ownerId: 'owner-approved',
    propertyId: 'prop-1',
    type: 'payout_released',
    title: `Payout released — BATCH-${overrides.id}`,
    body: '₹4,950 has been credited to your bank account.',
    actionUrl: '/owner/payouts',
    isRead: false,
    createdAt: new Date(Date.now() - Number(overrides.id) * 60_000).toISOString(),
    ...overrides,
  }
}

const NOTIFICATIONS: OwnerNotification[] = [
  makeNotification({ id: '1', type: 'payout_released', title: 'Payout released — BATCH-2026-06', isRead: false }),
  makeNotification({ id: '2', type: 'review_new_on_property', title: 'New review on your property', body: 'A guest left a 4/5 review.', isRead: false }),
  makeNotification({ id: '3', type: 'booking_update', title: 'New booking confirmed', body: 'Booking BK-001 has been confirmed.', isRead: true }),
]

const LIST_RESULT: NotificationsListResult = {
  items: NOTIFICATIONS,
  total: 3,
  page: 1,
  limit: 20,
  unreadCount: 2,
}

async function mockNotificationsApi(page: Page, unreadCount = 2) {
  // Register general handler first (lower priority in Playwright)
  await page.route('**/api/owners/me/notifications**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())

    if (url.pathname.endsWith('/unread-count')) {
      await route.fulfill({ json: { count: unreadCount } })
      return
    }
    if (req.method() === 'PATCH') {
      if (url.pathname.endsWith('/read-all')) {
        await route.fulfill({ json: { updated: 2 } })
        return
      }
      await route.fulfill({ json: { ...NOTIFICATIONS.find((n) => url.pathname.includes(n.id)), isRead: true } })
      return
    }
    const params = url.searchParams
    const unreadOnly = params.get('unread') === 'true'
    const items = unreadOnly ? NOTIFICATIONS.filter((n) => !n.isRead) : NOTIFICATIONS
    await route.fulfill({
      json: { ...LIST_RESULT, items, total: items.length, unreadCount: 2 },
    })
  })
}

async function loginAsOwner(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.removeItem('stayflex-auth'))
  await page.goto('/login')
  await page.getByTestId('demo-approved').click()
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL('/owner/dashboard', { timeout: 5000 })
}

test.describe('Owner — Notification bell', () => {
  test.beforeEach(async ({ page }) => {
    await mockNotificationsApi(page)
    // Needed so navigating to /owner/payouts after clicking a notification doesn't 401
    await page.route('**/api/owner/payouts**', async (route) => {
      await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 20 } })
    })
    await page.route('**/api/owner/reviews**', async (route) => {
      await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 20 } })
    })
    await loginAsOwner(page)
  })

  test('bell badge shows unread count', async ({ page }) => {
    const badge = page.getByTestId('bell-badge')
    await expect(badge).toBeVisible({ timeout: 5000 })
    await expect(badge).toHaveText('2')
  })

  test('bell dropdown opens and shows notifications', async ({ page }) => {
    await page.getByTestId('bell-btn').click()
    const dropdown = page.getByTestId('bell-dropdown')
    await expect(dropdown).toBeVisible()
    await expect(dropdown.getByTestId('bell-notification-item')).toHaveCount(3)
  })

  test('first two bell items are unread (have dot)', async ({ page }) => {
    await page.getByTestId('bell-btn').click()
    const items = page.getByTestId('bell-notification-item')
    await expect(items.nth(0).locator('span.rounded-full')).toBeVisible()
    await expect(items.nth(1).locator('span.rounded-full')).toBeVisible()
  })

  test('dropdown has "View all" link to notifications page', async ({ page }) => {
    await page.getByTestId('bell-btn').click()
    const link = page.getByRole('link', { name: /view all notifications/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/owner/notifications')
  })

  test('clicking a notification item marks it read and navigates', async ({ page }) => {
    await page.getByTestId('bell-btn').click()
    const firstItem = page.getByTestId('bell-notification-item').first()
    await firstItem.click()
    await expect(page).toHaveURL('/owner/payouts', { timeout: 5000 })
  })
})

test.describe('Owner — Notifications inbox page', () => {
  test.beforeEach(async ({ page }) => {
    await mockNotificationsApi(page)
    await loginAsOwner(page)
    await page.goto('/owner/notifications')
    await expect(page.getByTestId('notifications-page')).toBeVisible({ timeout: 5000 })
  })

  test('page heading is "Notifications"', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Notifications' }).first()).toBeVisible()
  })

  test('lists all 3 notification rows', async ({ page }) => {
    await expect(page.getByTestId('notification-row')).toHaveCount(3)
  })

  test('unread rows have a highlighted left border indicator', async ({ page }) => {
    const rows = page.getByTestId('notification-row')
    await expect(rows.nth(0)).toHaveClass(/border-l-primary-600/)
    await expect(rows.nth(1)).toHaveClass(/border-l-primary-600/)
  })

  test('read row has no left-border highlight', async ({ page }) => {
    const rows = page.getByTestId('notification-row')
    const readRow = rows.nth(2)
    const classes = await readRow.getAttribute('class')
    expect(classes).not.toContain('border-l-primary-600')
  })

  test('unread-only filter shows only 2 rows', async ({ page }) => {
    await page.getByTestId('unread-filter').check()
    await expect(page.getByTestId('notification-row')).toHaveCount(2)
  })

  test('mark-all-read button is visible when there are unread items', async ({ page }) => {
    await expect(page.getByTestId('mark-all-read-btn')).toBeVisible()
  })

  test('mark-all-read calls the API', async ({ page }) => {
    let patchCalled = false
    await page.route('**/api/owners/me/notifications/read-all**', async (route) => {
      if (route.request().method() === 'PATCH') patchCalled = true
      await route.fulfill({ json: { updated: 2 } })
    })
    await page.getByTestId('mark-all-read-btn').click()
    await page.waitForTimeout(300)
    expect(patchCalled).toBe(true)
  })

  test('bell badge is absent when unreadCount is 0', async ({ page }) => {
    await page.route('**/api/owners/me/notifications/unread-count**', async (route) => {
      await route.fulfill({ json: { count: 0 } })
    })
    await page.reload()
    await expect(page.getByTestId('bell-badge')).not.toBeVisible()
  })
})
