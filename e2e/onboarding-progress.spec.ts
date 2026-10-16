import { test, expect } from '@playwright/test'
const id = '11111111-1111-4111-8111-111111111111'
test('walk all seven screens, revisit completed steps, and resume without local progress', async ({ page }) => {
  test.setTimeout(120000)
  let snapshot: Record<string, unknown> = {}
  let submitted = false
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path.endsWith('/application-state')) {
      if (route.request().method() === 'PATCH') { snapshot = route.request().postDataJSON(); return route.fulfill({ json: { saved: true } }) }
      return route.fulfill({ json: snapshot })
    }
    if (path.endsWith('/properties/draft')) return route.fulfill({ json: { propertyId: id } })
    if (path.endsWith('/draft')) return route.fulfill({ json: { propertyId: id, status: 'draft', draftStep: 0, draftData: {}, compliance: null } })
    if (path.includes('/step/')) return route.fulfill({ json: { saved: true } })
    if (path.endsWith('/me/properties')) return route.fulfill({ json: [] })
    if (path.endsWith('/submit')) { submitted = true; return route.fulfill({ json: { propertyId: id, status: 'pending_review' } }) }
    if (path.endsWith('/status')) return route.fulfill({ json: { propertyId: id, status: 'pending_review', timeline: [] } })
    if (path.endsWith('/uploads/presign')) {
      const input = route.request().postDataJSON()
      const key = 'properties/' + id + '/' + input.kind + '/22222222-2222-4222-8222-222222222222.' + (input.kind === 'photo' ? 'png' : 'pdf')
      return route.fulfill({ json: { key, url: 'https://storage.test/' + key, uploadUrl: 'https://storage.test/upload' } })
    }
    if (path.includes('/uploads/photos/')) return route.fulfill({ json: { url: 'https://storage.test/image.png' } })
    if (url.hostname === 'storage.test') {
      if (route.request().method() === 'PUT') return route.fulfill({ status: 200 })
      return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64') })
    }
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.fulfill({ status: 503, json: {} })
    return route.continue()
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/e2e/fixtures/walkthrough.html')
  await page.getByRole('button', { name: 'Start listing' }).click()
  const fill = (name: string, value: string) => page.locator('input[name="' + name + '"]').fill(value)
  const next = () => page.getByRole('button', { name: /Continue/ }).click()
  const current = (step: number) => expect(page.locator('[data-step="' + step + '"]')).toHaveAttribute('aria-current', 'step')
  const complete = async (step: number) => {
    const row = page.locator('[data-step="' + step + '"]')
    await expect(row).toHaveAttribute('data-completed', 'true')
    await expect(row.locator('div').first()).toHaveCSS('background-color', 'rgb(239, 106, 0)')
  }
  await fill('ownerName', 'Test Owner')
  await fill('phone', '9000000001')
  await fill('email', 'owner@example.test')
  await fill('businessName', 'Test Hospitality')
  await next(); await current(2)
  await complete(1)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await current(1); await complete(1)
  await page.screenshot({ path: 'onboarding-completed-current.png', fullPage: true })
  await next(); await current(2)
  await fill('propertyName', 'Progress Test Hotel')
  await fill('address', '123 Main Road')
  await fill('addressLine2', 'Near Central Station')
  await fill('pincode', '500001')
  await fill('city', 'Hyderabad')
  await fill('state', 'Telangana')
  await page.locator('textarea[name="description"]').fill('A comfortable centrally located hotel for short and long stays.')
  for (const name of ['WiFi', 'Parking', 'Air conditioning']) await page.getByRole('button', { name, exact: true }).click()
  await next(); await current(3); await complete(2)
  await page.getByLabel('Add Exterior / entrance photos', { exact: true }).setInputFiles({ name: 'hotel.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64') })
  await expect(page.getByRole('button', { name: 'Preview Exterior / entrance photo', exact: true })).toBeVisible()
  await next(); await current(4); await complete(3)
  await next(); await current(5); await complete(4)
  const files = page.locator('input[type="file"]')
  for (let i = 0; i < await files.count(); i++) {
    await files.nth(i).setInputFiles({ name: 'document-' + i + '.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') })
  }
  await expect.poll(() => ((snapshot['5'] as { documents?: unknown[] })?.documents?.length ?? 0)).toBeGreaterThanOrEqual(5)
  await next(); await current(6); await complete(5)
  await fill('accountHolderName', 'Test Owner')
  await fill('accountNumber', '123456789012')
  await fill('ifscCode', 'SBIN0000001')
  await fill('bankName', 'State Bank of India')
  await fill('pan', 'ABCDE1234F')
  await page.locator('input[name="tcAccepted"]').check()
  await page.locator('input[name="formCAcknowledged"]').check()
  await next(); await current(7)
  for (let step = 1; step <= 6; step++) await complete(step)
  await expect(page.getByText('Click to complete', { exact: false })).toHaveCount(0)
  await page.screenshot({ path: 'onboarding-review-desktop.png', fullPage: true })
  // A new browser state must reconstruct progress from saved fields, not local completion flags.
  await page.evaluate(() => localStorage.removeItem('stayflex-onboarding'))
  await page.goto('/e2e/fixtures/walkthrough.html?resume=1&step=7')
  await current(7)
  for (let step = 1; step <= 6; step++) await complete(step)
  await page.getByText('Owner identity', { exact: true }).click()
  await current(1); await complete(1)
  await fill('ownerName', '')
  await expect(page.locator('[data-step="1"]')).toHaveAttribute('data-completed', 'false')
  await next(); await current(1)
  await fill('ownerName', 'Test Owner')
  await complete(1)
  for (let step = 2; step <= 7; step++) { await next(); await current(step) }
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'Review & submit' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  await page.screenshot({ path: 'onboarding-review-mobile.png', fullPage: true })
  await page.locator('input[type="checkbox"]').check()
  await page.getByRole('button', { name: /Submit/ }).click()
  await expect.poll(() => submitted).toBe(true)
})

