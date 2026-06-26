import { test, expect, type Page } from '@playwright/test'
import type { AdminUser, PlatformStats, PlatformSettings, AdminListResult } from '../src/lib/api/superAdminApi'

// ── Fixtures ────────────────────────────────────────────────────────────────

const STATS: PlatformStats = {
  totalProperties: 142,
  activeProperties: 118,
  totalBookings: 8432,
  bookingsThisMonth: 412,
  grossRevenuePaise: 184_200_000,
  grossRevenueThisMonthPaise: 9_100_000,
  totalPayoutsReleasedPaise: 156_000_000,
  totalTdsPaise: 1_560_000,
  activeAdmins: 4,
  totalOwners: 138,
  activeBookings: 23,
}

const ADMINS: AdminUser[] = [
  {
    id: 'sa-uuid-0001',
    name: 'Vikram Reddy',
    phone: '9000000001',
    email: 'vikram@stayflex.in',
    globalRole: 'SUPER_ADMIN',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'adm-uuid-0002',
    name: 'Ankit Verma',
    phone: '9000000002',
    email: 'ankit@stayflex.in',
    globalRole: 'ADMIN',
    status: 'active',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'adm-uuid-0003',
    name: 'Sneha Patel',
    phone: '9000000003',
    email: 'sneha@stayflex.in',
    globalRole: 'ADMIN',
    status: 'suspended',
    createdAt: '2026-03-01T00:00:00.000Z',
  },
]

const ADMIN_LIST: AdminListResult = { items: ADMINS, total: 3, page: 1, limit: 20 }

const SETTINGS: PlatformSettings = {
  id: 'singleton',
  commissionPct: 15,
  tdsPct: 1,
  payoutDayOfWeek: 1,
  minBookingHours: 1,
  maxBookingHours: 24,
  cancellationWindowHours: 24,
  updatedAt: '2026-06-17T00:00:00.000Z',
  updatedBy: null,
}

// ── Mock helper ─────────────────────────────────────────────────────────────

async function mockSuperAdminApi(page: Page) {
  await page.route('**/api/super-admin/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const method = route.request().method()

    if (path.endsWith('/stats')) {
      await route.fulfill({ json: STATS })
      return
    }

    if (path.endsWith('/settings')) {
      if (method === 'PATCH') {
        await route.fulfill({ json: { ...SETTINGS, updatedAt: new Date().toISOString() } })
        return
      }
      await route.fulfill({ json: SETTINGS })
      return
    }

    const statusMatch = path.match(/\/admins\/([^/]+)\/status$/)
    if (statusMatch && method === 'PATCH') {
      const body = JSON.parse(route.request().postData() ?? '{}')
      const target = ADMINS.find((a) => a.id === statusMatch[1])
      await route.fulfill({
        json: target ? { ...target, status: body.status } : ADMINS[1],
      })
      return
    }

    if (path.endsWith('/admins') && method === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}')
      const newAdmin: AdminUser = {
        id: 'adm-uuid-9999',
        name: body.name,
        phone: body.phone,
        email: body.email ?? `${body.phone}@stayflex.internal`,
        globalRole: 'ADMIN',
        status: 'active',
        createdAt: new Date().toISOString(),
      }
      await route.fulfill({ status: 201, json: newAdmin })
      return
    }

    if (path.endsWith('/admins')) {
      await route.fulfill({ json: ADMIN_LIST })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'Not found' } })
  })
}

async function loginAsSuperAdmin(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.removeItem('stayflex-auth'))
  await page.goto('/login')
  await page.getByTestId('demo-superadmin').click()
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL('/super-admin/dashboard', { timeout: 5000 })
}

// ── Dashboard suite ──────────────────────────────────────────────────────────

test.describe('Super Admin — Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockSuperAdminApi(page)
    await loginAsSuperAdmin(page)
  })

  test('redirects to /super-admin/dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL('/super-admin/dashboard')
  })

  test('renders the super admin shell', async ({ page }) => {
    await expect(page.getByTestId('super-admin-shell')).toBeVisible()
  })

  test('shows all 6 KPI cards with data', async ({ page }) => {
    const cards = page.getByTestId('kpi-card')
    await expect(cards).toHaveCount(6)
    await expect(cards.nth(0).getByText('142')).toBeVisible()
    await expect(cards.nth(1).getByText('23')).toBeVisible()
  })

  test('shows revenue MTD KPI formatted as INR', async ({ page }) => {
    await expect(page.getByTestId('super-admin-dashboard').getByText(/₹91,000/)).toBeVisible()
  })

  test('shows active admins count', async ({ page }) => {
    const kpiCards = page.getByTestId('kpi-card')
    const adminsCard = kpiCards.filter({ hasText: 'Active admins' })
    await expect(adminsCard.getByText('4', { exact: true })).toBeVisible()
  })

  test('shell nav links are all visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Admin Users' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
  })

  test('non-super-admin cannot access super admin routes', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('stayflex-auth'))
    await page.goto('/super-admin/dashboard')
    await expect(page).toHaveURL('/login')
  })
})

// ── Admin Users suite ────────────────────────────────────────────────────────

test.describe('Super Admin — Admin Users', () => {
  test.beforeEach(async ({ page }) => {
    await mockSuperAdminApi(page)
    await loginAsSuperAdmin(page)
    await page.goto('/super-admin/admins')
    await expect(page.getByTestId('super-admin-admins-page')).toBeVisible()
  })

  test('lists all admin rows', async ({ page }) => {
    const rows = page.getByTestId('admin-row')
    await expect(rows).toHaveCount(3)
  })

  test('shows SUPER_ADMIN badge for first row', async ({ page }) => {
    await expect(page.getByTestId('admin-row').first().getByText('Super Admin')).toBeVisible()
  })

  test('active admin shows suspend button', async ({ page }) => {
    const activeAdmin = page.getByTestId('admin-row').nth(1)
    await expect(activeAdmin.getByTestId('suspend-btn')).toBeVisible()
  })

  test('suspended admin shows activate button', async ({ page }) => {
    const suspended = page.getByTestId('admin-row').nth(2)
    await expect(suspended.getByTestId('activate-btn')).toBeVisible()
  })

  test('super admin row has no action buttons', async ({ page }) => {
    const superRow = page.getByTestId('admin-row').first()
    await expect(superRow.getByTestId('suspend-btn')).toHaveCount(0)
    await expect(superRow.getByTestId('activate-btn')).toHaveCount(0)
  })

  test('opens create admin dialog', async ({ page }) => {
    await page.getByTestId('create-admin-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByTestId('name-input')).toBeVisible()
    await expect(page.getByTestId('phone-input')).toBeVisible()
  })

  test('creates admin account successfully', async ({ page }) => {
    await page.getByTestId('create-admin-btn').click()
    await page.getByTestId('name-input').fill('New Admin')
    await page.getByTestId('phone-input').fill('9876543210')
    await page.getByTestId('confirm-create-btn').click()
    // Toast appears and dialog closes
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 3000 })
  })

  test('shows validation error for invalid phone', async ({ page }) => {
    await page.getByTestId('create-admin-btn').click()
    await page.getByTestId('name-input').fill('Test')
    await page.getByTestId('phone-input').fill('123')
    await page.getByTestId('confirm-create-btn').click()
    await expect(page.getByText('Exactly 10 digits')).toBeVisible()
  })

  test('suspends active admin on button click', async ({ page }) => {
    const activeRow = page.getByTestId('admin-row').nth(1)
    await activeRow.getByTestId('suspend-btn').click()
    // Toast or row update confirms action
    await expect(page.getByRole('status').or(page.locator('[data-sonner-toast]')).first()).toBeVisible({ timeout: 3000 })
  })
})

// ── Settings suite ───────────────────────────────────────────────────────────

test.describe('Super Admin — Settings', () => {
  test.beforeEach(async ({ page }) => {
    await mockSuperAdminApi(page)
    await loginAsSuperAdmin(page)
    await page.goto('/super-admin/settings')
    await expect(page.getByTestId('super-admin-settings-page')).toBeVisible()
  })

  test('shows platform settings form with values', async ({ page }) => {
    await expect(page.getByTestId('commission-pct-input')).toHaveValue('15')
    await expect(page.getByTestId('payout-day-input')).toHaveValue('1')
    await expect(page.getByTestId('min-hours-input')).toHaveValue('1')
    await expect(page.getByTestId('max-hours-input')).toHaveValue('24')
    await expect(page.getByTestId('cancellation-window-input')).toHaveValue('24')
  })

  test('save button is disabled when form is not dirty', async ({ page }) => {
    await expect(page.getByTestId('save-settings-btn')).toBeDisabled()
  })

  test('save button enables after changing a value', async ({ page }) => {
    await page.getByTestId('commission-pct-input').fill('18')
    await expect(page.getByTestId('save-settings-btn')).toBeEnabled()
  })

  test('saves settings successfully', async ({ page }) => {
    await page.getByTestId('commission-pct-input').fill('18')
    await page.getByTestId('save-settings-btn').click()
    await expect(page.getByRole('status').or(page.locator('[data-sonner-toast]')).first()).toBeVisible({ timeout: 3000 })
  })

  test('shows validation error for out-of-range commission', async ({ page }) => {
    await page.getByTestId('commission-pct-input').fill('99')
    await page.getByTestId('save-settings-btn').click()
    await expect(page.getByText('Max 30%')).toBeVisible()
  })
})
