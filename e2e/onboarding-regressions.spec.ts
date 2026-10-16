import { test, expect } from '@playwright/test'
const property = '11111111-1111-4111-8111-111111111111'
const file = '22222222-2222-4222-8222-222222222222.jpg'
let snapshot: Record<string, unknown>
let rotations: number
test.beforeEach(async ({ page }) => {
  rotations = 0
  snapshot = { 3: { photos: [{ id: 'photo', url: 'https://storage.test/properties/' + property + '/photo/' + file, category: 'exterior', isPrimary: true, sortOrder: 0 }] } }
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/application-state')) {
      if (route.request().method() === 'PATCH') { snapshot = route.request().postDataJSON(); return route.fulfill({ json: { saved: true } }) }
      return route.fulfill({ json: snapshot })
    }
    if (url.pathname.endsWith('/draft')) return route.fulfill({ json: { propertyId: property, status: 'draft', draftStep: 0, draftData: {}, compliance: null } })
    if (url.pathname.includes('/step/')) return route.fulfill({ json: { saved: true } })
    if (url.pathname.includes('/uploads/photos/')) return route.fulfill({ json: { url: 'https://storage.test/portrait.svg' } })
    if (url.pathname.endsWith('/auth/refresh-token')) {
      rotations++
      return route.fulfill({ json: { accessToken: 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64') + '.signature', refreshToken: 'rotated-refresh' } })
    }
    if (url.hostname === 'storage.test') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="1500"><rect width="100" height="1500" fill="orange"/></svg>' })
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.fulfill({ status: 503, json: { message: 'Unexpected external request blocked by test' } })
    return route.continue()
  })
})
test('portrait uploads keep their card size at phone and desktop widths', async ({ page }) => {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/e2e/fixtures/onboarding.html')
    const image = page.getByRole('img', { name: 'Exterior / entrance', exact: true })
    await expect(image).toBeVisible()
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(1500)
    const size = await image.boundingBox()
    expect(size!.width / size!.height).toBeCloseTo(4 / 3, 1)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    expect(overflow).toBe(false)
    await page.getByRole('button', { name: 'Preview Exterior / entrance photo', exact: true }).click()
    await expect(page.getByRole('dialog').getByRole('img')).toBeVisible()
    await page.keyboard.press('Escape')
  }
})
test('incomplete bank fields survive a browser reload and access-token renewal', async ({ page }) => {
  await page.goto('/e2e/fixtures/onboarding.html?screen=bank&renew=1')
  await page.locator('input[name="accountHolderName"]').fill('Draft Owner')
  await page.locator('input[name="accountNumber"]').fill('123456789')
  await expect.poll(() => (snapshot['6'] as Record<string, unknown>)?.accountNumber).toBe('123456789')
  await expect.poll(() => rotations).toBe(1)
  await expect(page.getByTestId('authenticated')).toHaveText('true')
  await page.reload()
  await expect(page.locator('input[name="accountNumber"]')).toHaveValue('123456789')
  await expect(page.locator('input[name="accountHolderName"]')).toHaveValue('Draft Owner')
})
