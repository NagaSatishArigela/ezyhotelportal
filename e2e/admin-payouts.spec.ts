import { test, expect, type Page } from '@playwright/test'
import type { AdminPayoutBatch, AdminPayoutItem } from '../src/lib/api/adminPayouts'

function makeBatch(overrides: Partial<AdminPayoutBatch> & { id: string }): AdminPayoutBatch {
  return {
    id: overrides.id,
    batchRef: `PAY-202606${overrides.id.slice(-2)}`,
    cycleStartAt: '2026-06-09T00:00:00.000Z',
    cycleEndAt: '2026-06-15T23:59:59.999Z',
    status: 'pending',
    totalGrossPaise: 1_000_000,
    totalTdsPaise: 10_000,
    totalNetPaise: 990_000,
    itemCount: 2,
    createdAt: '2026-06-17T02:00:00.000Z',
    ...overrides,
  }
}

function makeItem(overrides: Partial<AdminPayoutItem> & { id: string }): AdminPayoutItem {
  return {
    id: overrides.id,
    propertyId: 'prop-' + overrides.id,
    ownerId: 'owner-' + overrides.id,
    status: 'pending',
    bookingCount: 3,
    grossAmountPaise: 500_000,
    tdsPaise: 5_000,
    netAmountPaise: 495_000,
    holdReason: null,
    bankRef: null,
    releasedAt: null,
    ...overrides,
  }
}

const BATCH_1 = makeBatch({ id: 'b1', batchRef: 'PAY-20260615' })
const BATCH_2 = makeBatch({ id: 'b2', batchRef: 'PAY-20260608', status: 'released', totalNetPaise: 800_000 })

const ITEMS: AdminPayoutItem[] = [
  makeItem({ id: 'i1', status: 'pending' }),
  makeItem({ id: 'i2', status: 'on_hold', holdReason: 'compliance review' }),
]

async function mockAdminPayoutsApi(page: Page) {
  const batchStore = new Map([[BATCH_1.id, { ...BATCH_1, items: ITEMS.map((i) => ({ ...i })) }], [BATCH_2.id, { ...BATCH_2, items: [] }]])
  const itemStore = new Map(ITEMS.map((i) => [i.id, { ...i }]))

  await page.route('**/api/admin/payouts**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const method = route.request().method()

    if (path.endsWith('/summary')) {
      await route.fulfill({ json: { pendingBatches: 1, onHoldItems: 1, releasedMtdPaise: 800_000, tdsMtdPaise: 8_000 } })
      return
    }

    if (path.match(/\/admin\/payouts\/items\/([^/]+)\/hold/)) {
      const itemId = path.match(/\/admin\/payouts\/items\/([^/]+)\/hold/)?.[1]
      const body = JSON.parse(route.request().postData() ?? '{}')
      const item = itemId ? itemStore.get(itemId) : undefined
      if (item) { item.status = 'on_hold'; item.holdReason = body.reason }
      await route.fulfill({ json: item ?? {} })
      return
    }

    if (path.match(/\/admin\/payouts\/items\/([^/]+)\/release/)) {
      const itemId = path.match(/\/admin\/payouts\/items\/([^/]+)\/release/)?.[1]
      const item = itemId ? itemStore.get(itemId) : undefined
      if (item) { item.status = 'released'; item.holdReason = null }
      await route.fulfill({ json: item ?? {} })
      return
    }

    if (path.match(/\/admin\/payouts\/([^/]+)\/release/) && method === 'POST') {
      const batchId = path.match(/\/admin\/payouts\/([^/]+)\/release/)?.[1]
      const batch = batchId ? batchStore.get(batchId) : undefined
      if (batch) {
        let released = 0; let skipped = 0
        for (const item of batch.items) {
          if (item.status === 'pending') { item.status = 'released'; released++ }
          else skipped++
        }
        batch.status = skipped === 0 ? 'released' : 'partial'
        await route.fulfill({ json: { released, skipped } })
      } else {
        await route.fulfill({ status: 404, json: {} })
      }
      return
    }

    if (path.endsWith('/generate') && method === 'POST') {
      await route.fulfill({ json: { batchId: 'new-batch', batchRef: 'PAY-20260622', itemCount: 5, totalNetPaise: 2_000_000 } })
      return
    }

    // Detail: /admin/payouts/:id
    const detailMatch = path.match(/\/admin\/payouts\/([^/]+)$/)
    if (detailMatch) {
      const batch = batchStore.get(detailMatch[1])
      if (batch) {
        await route.fulfill({ json: { ...batch, items: Array.from(itemStore.values()) } })
      } else {
        await route.fulfill({ status: 404, json: {} })
      }
      return
    }

    // List
    const batches = Array.from(batchStore.values()).map(({ items: _items, ...b }) => b)
    await route.fulfill({ json: { items: batches, total: batches.length, page: 1, limit: 20 } })
  })

  // Shared admin mocks
  await page.route('**/api/admin/properties**', async (route) => {
    await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 20 } })
  })
  await page.route('**/api/admin/reviews/flagged-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })
  await page.route('**/api/admin/disputes/unresolved-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })
  await page.route('**/api/admin/anomalies/unresolved-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })
}

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.removeItem('stayflex-auth'))
  await page.goto('/login')
  await page.getByTestId('email-input').fill('admin@demo.com')
  await page.getByTestId('password-input').fill('demo1234')
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL('/admin/verification', { timeout: 5000 })
}

test.describe('Admin — Payouts page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminPayoutsApi(page)
    await loginAsAdmin(page)
    await page.goto('/admin/payouts')
  })

  test('shows KPI summary strip', async ({ page }) => {
    await expect(page.getByText('Pending batches')).toBeVisible()
    await expect(page.getByText('1', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Items on hold')).toBeVisible()
    await expect(page.getByText('Released MTD')).toBeVisible()
    await expect(page.getByText('TDS withheld MTD')).toBeVisible()
  })

  test('lists payout batches in table', async ({ page }) => {
    const rows = page.getByTestId('batch-row')
    await expect(rows).toHaveCount(2)
    await expect(rows.nth(0).getByText('PAY-20260615')).toBeVisible()
    await expect(rows.nth(1).getByText('PAY-20260608')).toBeVisible()
  })

  test('opens batch detail dialog with items', async ({ page }) => {
    await page.getByTestId('batch-detail-btn').first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('PAY-20260615')).toBeVisible()

    const itemRows = dialog.getByTestId('batch-item-row')
    await expect(itemRows).toHaveCount(2)
  })

  test('hold flow: item pending → on_hold', async ({ page }) => {
    await page.getByTestId('batch-detail-btn').first().click()

    const dialog = page.getByRole('dialog')
    await dialog.getByTestId('hold-btn').first().click()

    const holdDialog = page.getByRole('dialog').last()
    await expect(holdDialog.getByRole('heading', { name: 'Hold payout item' })).toBeVisible()

    await holdDialog.getByTestId('hold-reason').fill('Compliance review in progress')
    await holdDialog.getByTestId('confirm-hold-btn').click()

    await expect(page.getByRole('heading', { name: 'Hold payout item' })).not.toBeVisible()
  })

  test('hold form requires minimum 10 characters', async ({ page }) => {
    await page.getByTestId('batch-detail-btn').first().click()

    const dialog = page.getByRole('dialog')
    await dialog.getByTestId('hold-btn').first().click()

    const holdDialog = page.getByRole('dialog').last()
    await holdDialog.getByTestId('hold-reason').fill('too short')
    await holdDialog.getByTestId('confirm-hold-btn').click()

    await expect(holdDialog.getByText('Minimum 10 characters')).toBeVisible()
  })

  test('release batch button releases pending items', async ({ page }) => {
    await page.getByTestId('batch-detail-btn').first().click()

    const dialog = page.getByRole('dialog')
    const releaseBtn = dialog.getByTestId('release-batch-btn')
    await expect(releaseBtn).toBeVisible()
    await releaseBtn.click()

    await expect(page.getByText(/Released \d+ item/)).toBeVisible()
  })
})
