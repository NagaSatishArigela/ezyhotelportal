import { test, expect, type Page } from '@playwright/test'
import type { OwnerDisputeListItem } from '../src/lib/api/ownerDisputes'

const BASE_ITEMS: OwnerDisputeListItem[] = [
  {
    id: 'd-1',
    disputeRef: 'DSP-00001',
    bookingRef: 'PPH-B-00001',
    category: 'room_quality',
    filedAt: '2026-06-10T10:00:00.000Z',
    status: 'awaiting_hotel_response',
  },
  {
    id: 'd-2',
    disputeRef: 'DSP-00002',
    bookingRef: 'PPH-B-00002',
    category: 'safety',
    filedAt: '2026-06-08T10:00:00.000Z',
    status: 'resolved_hotel',
  },
]

async function mockOwnerDisputesApi(page: Page, items: OwnerDisputeListItem[]) {
  const store = new Map<string, OwnerDisputeListItem>(items.map((d) => [d.id, d]))

  await page.route('**/api/owner/properties/**/disputes**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    const all = Array.from(store.values())
    await route.fulfill({ json: { items: all, total: all.length, page: 1, limit: 20 } })
  })

  await page.route('**/api/disputes/*/hotel-response', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    const id = new URL(route.request().url()).pathname.match(/\/disputes\/([^/]+)\/hotel-response/)?.[1]
    const item = id ? store.get(id) : undefined
    if (item) item.status = 'under_review'
    await route.fulfill({ json: {} })
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
  await page.getByTestId('email-input').fill('approved@demo.com')
  await page.getByTestId('password-input').fill('demo1234')
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL('/owner/dashboard', { timeout: 5000 })
}

test.describe('Owner — Disputes page', () => {
  test.beforeEach(async ({ page }) => {
    await mockOwnerDisputesApi(page, BASE_ITEMS.map((d) => ({ ...d })))
    await loginAsOwner(page)
    await page.goto('/owner/disputes')
  })

  test('shows disputes filed against the property', async ({ page }) => {
    await expect(page.getByRole('main').locator('h1')).toHaveText('Disputes')
    await expect(page.getByTestId('owner-dispute-row-d-1')).toBeVisible()
    await expect(page.getByTestId('owner-dispute-row-d-2')).toBeVisible()

    const row1 = page.getByTestId('owner-dispute-row-d-1')
    await expect(row1).toContainText('DSP-00001')
    await expect(row1).toContainText('PPH-B-00001')
    await expect(row1).toContainText('Awaiting your response')

    const row2 = page.getByTestId('owner-dispute-row-d-2')
    await expect(row2).toContainText('Resolved – hotel favour')
  })

  test('respond to a dispute awaiting hotel response', async ({ page }) => {
    const row1 = page.getByTestId('owner-dispute-row-d-1')
    await row1.getByRole('button', { name: 'Respond' }).click()

    await expect(page.getByRole('dialog', { name: 'Respond to dispute' })).toBeVisible()
    await page.getByLabel('Your response').fill('We have cleaned the room and addressed the AC issue.')
    await page.getByRole('button', { name: 'Submit response' }).click()

    await expect(page.getByText('Response submitted').last()).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('dialog', { name: 'Respond to dispute' })).not.toBeVisible()
  })

  test('resolved disputes do not show a respond button', async ({ page }) => {
    const row2 = page.getByTestId('owner-dispute-row-d-2')
    await expect(row2.getByRole('button', { name: 'Respond' })).not.toBeVisible()
  })
})
