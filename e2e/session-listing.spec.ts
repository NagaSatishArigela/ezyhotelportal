import { test, expect, type Page } from '@playwright/test'

const propertyId = '11111111-1111-4111-8111-111111111111'
const token = (seconds: number) => 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })).toString('base64url') + '.sig'
async function setup(page: Page, options: { exp?: number; refreshFailure?: number; loginLimit?: boolean } = {}) {
  const calls: { path: string; method: string; body: any }[] = []
  let settings = { defaultCheckinTime: '12:00', defaultCheckoutTime: '12:00', minBookingHours: 2, isActive: true, houseRules: null }
  let renewals = 0
  let logins = 0
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== 'http://127.0.0.1:3188') return route.abort()
    if (!url.pathname.startsWith('/api/')) return route.continue()
    const path = url.pathname.slice(4)
    const method = route.request().method()
    const body = route.request().postDataJSON()
    calls.push({ path, method, body })
    let data: unknown = { items: [], total: 0, page: 1, limit: 20 }
    if (path === '/auth/login') {
      logins++
      if (options.loginLimit && logins === 1) return route.fulfill({ status: 429, headers: { 'Retry-After': '2' }, json: { message: 'Too Many Requests' } })
      data = { user: { id: 'test-owner', name: 'Owner', email: 'owner@example.test', phone: '', globalRole: 'USER', status: 'active' }, tokens: { accessToken: token(options.exp ?? 900), refreshToken: 'initial-refresh' } }
    } else if (path === '/me/properties') {
      data = [{ propertyId, name: 'Test hotel', status: 'approved', isActive: true, isApplicant: true, role: 'OWNER', roleName: 'OWNER', permissions: ['manage_settings', 'view_dashboard'] }]
    } else if (path === '/auth/refresh-token') {
      renewals++
      if (renewals === 1 && options.refreshFailure) return route.fulfill({ status: options.refreshFailure, headers: { 'Retry-After': '2' }, json: { message: 'Temporary failure' } })
      data = { accessToken: token(900), refreshToken: 'rotated-' + renewals }
    } else if (path.endsWith('/settings')) {
      if (method === 'PATCH') settings = { ...settings, ...body }
      data = settings
    } else if (path.endsWith('/unread-count')) data = { count: 0 }
    await route.fulfill({ json: data })
  })
  await page.goto('/login')
  await page.getByTestId('email-input').fill('owner@example.test')
  await page.getByTestId('password-input').fill('test-password')
  return calls
}
async function openSettings(page: Page) {
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL(/\/owner\/access/)
  await page.getByRole('button', { name: 'Open hotel' }).click()
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Public listing status' })).toBeVisible()
}

test('listing buttons remain exclusive and save OFF and ON', async ({ page }) => {
  const calls = await setup(page)
  await openSettings(page)
  const on = page.getByRole('button', { name: 'ON', exact: true })
  const off = page.getByRole('button', { name: 'OFF', exact: true })
  await expect(on).toHaveAttribute('aria-pressed', 'true')
  await expect(off).toHaveAttribute('aria-pressed', 'false')
  await off.click()
  await expect(on).toHaveAttribute('aria-pressed', 'false')
  await expect(off).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Settings saved', { exact: true })).toBeVisible()
  expect(calls.filter(c => c.method === 'PATCH').at(-1)?.body.isActive).toBe(false)
  await on.click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(() => calls.filter(c => c.method === 'PATCH').at(-1)?.body.isActive).toBe(true)
  await page.screenshot({ path: 'test-results/listing-on-off.png', fullPage: true })
})

test('login 429 waits for Retry-After and then signs in', async ({ page }) => {
  const calls = await setup(page, { loginLimit: true })
  await page.getByTestId('login-button').click()
  await expect(page.getByText('Too many sign-in attempts. Please wait before trying again.')).toBeVisible()
  await expect(page.getByTestId('login-button')).toBeDisabled()
  await page.getByTestId('password-input').press('Enter')
  expect(calls.filter(c => c.path === '/auth/login')).toHaveLength(1)
  await expect(page.getByTestId('login-button')).toBeEnabled({ timeout: 5000 })
  await openSettings(page)
  expect(calls.filter(c => c.path === '/auth/login')).toHaveLength(2)
})

test('listing controls fit on mobile and remain exclusive', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page)
  await openSettings(page)
  await page.getByRole('button', { name: 'OFF', exact: true }).click()
  await expect(page.getByRole('button', { name: 'OFF', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'ON', exact: true })).toHaveAttribute('aria-pressed', 'false')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/listing-mobile.png', fullPage: true })
})

test('Stay logged in recovers from 503 after access-token expiry', async ({ page }) => {
  const calls = await setup(page, { exp: 1, refreshFailure: 503 })
  await page.getByTestId('login-button').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable')
  await expect(page.getByText('Session renewal interrupted')).toBeVisible({ timeout: 4000 })
  await page.getByRole('button', { name: 'Stay logged in', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(calls.filter(c => c.path === '/auth/refresh-token')).toHaveLength(2)
  await expect(page).not.toHaveURL(/\/login/)
})

test('refresh 429 blocks repeated renewals and retries automatically', async ({ page }) => {
  test.setTimeout(30000)
  const calls = await setup(page, { exp: 1, refreshFailure: 429 })
  await page.getByTestId('login-button').click()
  await expect(page.getByRole('alert')).toContainText('temporarily limited')
  await expect(page.getByRole('button', { name: /Retrying in/ })).toBeDisabled()
  expect(calls.filter(c => c.path === '/auth/refresh-token')).toHaveLength(1)
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20000 })
  expect(calls.filter(c => c.path === '/auth/refresh-token')).toHaveLength(2)
  await expect(page).not.toHaveURL(/\/login/)
})
