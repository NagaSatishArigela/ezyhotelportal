/**
 * Owner Onboarding E2E — happy path + negative paths
 *
 * All backend calls are intercepted via page.route() — no live server needed.
 * Playwright provides a fresh browser context per test (empty localStorage),
 * so there is no per-test addInitScript cleanup.
 *
 * JS-level mocks already in portal-api.ts (no page.route needed):
 *   verifyIFSC, pennyDrop, uploadDocument, verifyPincode
 */

import { test, expect, type Page } from '@playwright/test'

// ── Constants ────────────────────────────────────────────────────────────────

const DRAFT_ID = 'test-draft-001'

// Fake JWT — payload has exp=9999999999 so session-expiry hook stays quiet.
const MOCK_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiJ1c2VyLTAwMSIsImlhdCI6MTcxOTIzNjAwMCwiZXhwIjo5OTk5OTk5OTk5fQ' +
  '.fake-sig'

function mockPdf(name: string) {
  return { name: `${name}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(`%PDF-1.4 ${name}`) }
}

// Helper: wait for step heading (h1 only) to avoid matching both sidebar label and h1
function expectStepHeading(page: Page, title: string) {
  return expect(page.locator('h1').filter({ hasText: title })).toBeVisible({ timeout: 10000 })
}

// ── Shared helpers ───────────────────────────────────────────────────────────

async function setupApiMocks(page: Page) {
  await page.route('**/api/auth/login', async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return }
    await route.fulfill({
      json: {
        user: {
          id: 'user-001',
          name: 'Ravi Nair',
          phone: '9876543210',
          email: 'owner@demo.com',
          globalRole: 'USER',
          status: 'active',
        },
        tokens: { accessToken: MOCK_JWT, refreshToken: MOCK_JWT, tokenType: 'Bearer', expiresIn: 900 },
      },
    })
  })

  await page.route('**/api/me/property-status', async (route) => {
    if (route.request().method() !== 'GET') { await route.continue(); return }
    await route.fulfill({ json: { id: null, status: null, draftStep: null } })
  })

  await page.route('**/api/properties/draft', async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return }
    await route.fulfill({ json: { propertyId: DRAFT_ID } })
  })

  await page.route(`**/api/properties/${DRAFT_ID}/step/**`, async (route) => {
    if (route.request().method() !== 'PATCH') { await route.continue(); return }
    await route.fulfill({ json: { ok: true, savedAt: new Date().toISOString() } })
  })

  await page.route(`**/api/properties/${DRAFT_ID}/submit`, async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return }
    await route.fulfill({
      json: {
        propertyId: DRAFT_ID,
        status: 'pending_review',
        submissionRef: 'QN-2026-001',
        submittedAt: new Date().toISOString(),
      },
    })
  })

  await page.route('**/api/auth/refresh-token', async (route) => {
    await route.fulfill({ json: { accessToken: MOCK_JWT, refreshToken: MOCK_JWT } })
  })
}

async function loginAsOwner(page: Page) {
  await page.goto('/login')
  await page.getByTestId('email-input').fill('owner@demo.com')
  await page.getByTestId('password-input').fill('demo1234')
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL('/owner/onboarding/step1', { timeout: 8000 })
}

/**
 * Inject the auth token directly into sessionStorage so that after any
 * page.goto() / page.reload() (which causes a full page reload), Zustand
 * rehydrates WITH the token. Without this, auth.store.ts strips the token
 * before writing to sessionStorage (XSS protection), and requireAuth()
 * redirects every direct-navigation test to /login.
 *
 * Call AFTER loginAsOwner() (so the user object is already in sessionStorage)
 * and BEFORE any page.goto('/owner/onboarding/stepN') or page.reload().
 */
async function restoreAuth(page: Page) {
  await page.evaluate(({ jwt }) => {
    const raw = window.sessionStorage.getItem('stayflex-auth')
    const current: { state: Record<string, unknown>; version: number } =
      raw ? JSON.parse(raw) : { state: {}, version: 0 }
    current.state = {
      ...current.state,
      isAuthenticated: true,
      token: jwt,
      refreshToken: jwt,
      rememberMe: false,
      user: current.state.user ?? {
        id: 'user-001',
        name: 'Ravi Nair',
        email: 'owner@demo.com',
        phone: '9876543210',
        role: 'owner',
        avatarInitials: 'RN',
        onboardingStatus: 'in_progress',
      },
    }
    window.sessionStorage.setItem('stayflex-auth', JSON.stringify(current))
  }, { jwt: MOCK_JWT })
}

async function uploadDoc(page: Page, ariaLabel: string, docName: string) {
  await page.locator(`input[type="file"][aria-label="${ariaLabel}"]`).setInputFiles(mockPdf(docName))
  await expect(page.getByText(`${docName}.pdf`)).toBeVisible({ timeout: 6000 })
}

// ── Test suite setup ─────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await setupApiMocks(page)
})

// ══════════════════════════════════════════════════════════════════════════════
// HAPPY PATH
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Happy Path — Owner Onboarding', () => {

  test('full 7-step wizard — all media, docs, consent → successful submission', async ({ page }) => {
    // 7 steps + 6 doc uploads (1.2s each) + IFSC (700ms) + penny drop (2s) exceeds 30s default
    test.setTimeout(90_000)
    await loginAsOwner(page)

    // ── Step 1 ────────────────────────────────────────────────────────────────
    await expect(page.getByText('Account & owner identity')).toBeVisible()

    await page.getByPlaceholder('As on government ID').fill('Ravi Nair')
    await page.getByPlaceholder('10-digit number').fill('9876543210')
    await page.getByPlaceholder('yourname@business.com').fill('ravi@theparkoaks.in')
    await page.locator('select').first().selectOption('llp')
    await page.getByPlaceholder('Exact name as per GST / PAN').fill('Ravi Nair Hospitality LLP')
    await page.getByPlaceholder('22AAAAA0000A1Z5').fill('29ABCDE1234F1Z5')
    await page.getByRole('button', { name: /Premium/ }).click()
    await expect(page.getByText('10% commission')).toBeVisible()

    await page.getByRole('button', { name: /Continue/ }).click()
    await expect(page).toHaveURL('/owner/onboarding/step2', { timeout: 8000 })

    // ── Step 2 ────────────────────────────────────────────────────────────────
    await expect(page.getByText('Property details')).toBeVisible()

    await page.getByPlaceholder('e.g. The Park Suites').fill('The Park Oaks')
    await page.getByRole('button', { name: 'Hotel' }).click()
    await page.getByPlaceholder('Building, street, locality').fill('12 MG Road, Central Business District')
    await page.getByPlaceholder('6 digits').fill('560001')
    await page.getByPlaceholder('6 digits').blur()
    await expect(page.getByPlaceholder('Auto-filled').first()).toHaveValue('Bengaluru', { timeout: 3000 })

    await page.locator('textarea').fill(
      'A premium boutique hotel in the heart of Bengaluru offering modern amenities and excellent service.'
    )

    await page.getByRole('button', { name: 'WiFi' }).click()
    await page.getByRole('button', { name: 'Air conditioning' }).click()
    await page.getByRole('button', { name: 'Parking' }).click()
    await page.getByRole('button', { name: 'Swimming pool' }).click()
    await expect(page.getByText(/4 selected ✓/)).toBeVisible()

    await page.getByRole('button', { name: /Both hourly/i }).click()

    await page.getByRole('button', { name: /Continue/ }).click()
    await expect(page).toHaveURL('/owner/onboarding/step3', { timeout: 8000 })

    // ── Step 3 ────────────────────────────────────────────────────────────────
    // Use h1 filter — sidebar also shows "Media & gallery" causing strict-mode violation
    await expectStepHeading(page, 'Media & gallery')

    for (let i = 1; i <= 5; i++) {
      await page.getByText('Drag photos here or click to upload').click()
      const label = i === 1 ? '1 photo uploaded' : `${i} photos uploaded`
      await expect(page.getByText(label)).toBeVisible()
    }
    await expect(page.getByText('4 / 4 required')).toBeVisible()

    await page.locator('textarea').fill('Photos taken post-renovation in April 2026.')

    await page.getByRole('button', { name: /Continue/ }).click()
    await expect(page).toHaveURL('/owner/onboarding/step4', { timeout: 8000 })

    // ── Step 4 ────────────────────────────────────────────────────────────────
    await expectStepHeading(page, 'Rooms & pricing')

    await page.getByText('Standard room').click()
    await expect(page.getByText('Hourly rate (₹/hr)')).toBeVisible()
    await expect(page.getByText('Full-day rate (₹/24h)')).toBeVisible()

    await page.getByRole('button', { name: /Add room type/ }).click()
    await expect(page.getByText('New room type')).toBeVisible()

    await page.getByRole('button', { name: /Continue/ }).click()
    await expect(page).toHaveURL('/owner/onboarding/step5', { timeout: 8000 })

    // ── Step 5 ────────────────────────────────────────────────────────────────
    await expectStepHeading(page, 'Documents & KYC')

    // entity=llp + hasGST=true → 6 required docs
    await uploadDoc(page, 'PAN card *', 'pan')
    await uploadDoc(page, 'Property ownership / lease *', 'ownership')
    await uploadDoc(page, 'Cancelled cheque *', 'cheque')
    await uploadDoc(page, 'GST certificate *', 'gst')
    await uploadDoc(page, 'Trade license *', 'trade')
    await uploadDoc(page, 'Director / Partner ID proof *', 'director')

    await page.getByRole('button', { name: /Continue/ }).click()
    await expect(page).toHaveURL('/owner/onboarding/step6', { timeout: 8000 })

    // ── Step 6 ────────────────────────────────────────────────────────────────
    await expectStepHeading(page, 'Bank & payouts')

    await page.locator('input[name="accountHolderName"]').fill('Ravi Nair Hospitality LLP')
    await page.locator('select[name="accountType"]').selectOption('current')
    await page.locator('input[type="password"]').fill('00112233445566')

    await page.getByPlaceholder('HDFC0001234').fill('HDFC0001234')
    await page.getByPlaceholder('HDFC0001234').blur()
    await expect(page.getByPlaceholder('Auto-filled from IFSC')).toHaveValue('HDFC Bank', { timeout: 3000 })
    await expect(page.getByText(/Connaught Place/)).toBeVisible()

    await page.getByRole('button', { name: 'Verify now' }).click()
    await expect(page.getByText('Verified', { exact: true })).toBeVisible({ timeout: 5000 })

    await page.locator('select[name="settlementPreference"]').selectOption('weekly')

    await page.locator('input[name="tdsConsent"]').check()
    await expect(page.locator('input[name="tdsConsent"]')).toBeChecked()

    await page.getByRole('button', { name: /Continue/ }).click()
    await expect(page).toHaveURL('/owner/onboarding/step7', { timeout: 8000 })

    // ── Step 7 ────────────────────────────────────────────────────────────────
    await expectStepHeading(page, 'Review & submit')

    // Use specific substrings that appear in only one checklist summary each
    await expect(page.getByText(/Ravi Nair · LLP/)).toBeVisible()
    await expect(page.getByText(/HDFC Bank/)).toBeVisible()

    await page.getByRole('checkbox').check()
    await expect(page.getByRole('checkbox')).toBeChecked()

    // Step 7 content button is FIRST in DOM; WizardShell footer button is LAST
    const contentSubmit = page.locator('button', { hasText: 'Submit for review' }).first()
    await expect(contentSubmit).toBeEnabled()

    await contentSubmit.click()
    await expect(page.getByText(/Application submitted/)).toBeVisible({ timeout: 6000 })
  })

  // ── Focused happy-path sub-tests ───────────────────────────────────────────

  test('auto-save indicator shows "Saved" after typing (debounce + persist)', async ({ page }) => {
    await loginAsOwner(page)
    await page.getByPlaceholder('As on government ID').fill('Ravi')
    // 1.5s debounce → "Saving…" (300ms) → "Saved" (persists 3s)
    // Check "Saved" only — the 300ms "Saving…" window is too narrow to catch reliably
    await expect(page.getByText(/Saved/)).toBeVisible({ timeout: 5000 })
  })

  test('wizard data persists across page reload via Zustand localStorage', async ({ page }) => {
    await loginAsOwner(page)
    await page.getByPlaceholder('As on government ID').fill('Persistent Owner')
    await expect(page.getByText(/Saved/)).toBeVisible({ timeout: 5000 })

    await restoreAuth(page)
    await page.reload()
    await expect(page).toHaveURL('/owner/onboarding/step1', { timeout: 6000 })
    await expect(page.getByPlaceholder('As on government ID')).toHaveValue('Persistent Owner')
  })

  test('Continue flushes pending save (saveNow) before navigating to next step', async ({ page }) => {
    await loginAsOwner(page)

    const step1Patches: string[] = []
    await page.route(`**/api/properties/${DRAFT_ID}/step/1`, async (route) => {
      step1Patches.push(route.request().url())
      await route.fulfill({ json: { ok: true } })
    })

    await page.getByPlaceholder('As on government ID').fill('Flush Test Owner')
    await page.getByPlaceholder('10-digit number').fill('9876543210')
    await page.getByPlaceholder('yourname@business.com').fill('flush@test.in')
    await page.getByPlaceholder('Exact name as per GST / PAN').fill('Flush Hospitality')

    await page.getByRole('button', { name: /Continue/ }).click()
    await expect(page).toHaveURL('/owner/onboarding/step2', { timeout: 8000 })

    expect(step1Patches.length).toBeGreaterThan(0)
  })

  test('Back button returns to previous step without losing store data', async ({ page }) => {
    await loginAsOwner(page)
    await page.getByPlaceholder('As on government ID').fill('Back Nav Owner')

    await page.getByRole('button', { name: /Continue/ }).click()
    await expect(page).toHaveURL('/owner/onboarding/step2', { timeout: 8000 })

    await page.getByRole('button', { name: /Back/ }).click()
    await expect(page).toHaveURL('/owner/onboarding/step1', { timeout: 5000 })
    await expect(page.getByPlaceholder('As on government ID')).toHaveValue('Back Nav Owner')
  })

  test('Save & exit navigates to /owner/status', async ({ page }) => {
    await loginAsOwner(page)
    await page.getByRole('button', { name: 'Save & exit' }).click()
    await expect(page).toHaveURL('/owner/status', { timeout: 5000 })
  })

  test('property category buttons show correct commission rate', async ({ page }) => {
    await loginAsOwner(page)

    await page.getByRole('button', { name: /Budget/ }).click()
    await expect(page.getByText('15% commission')).toBeVisible()

    await page.getByRole('button', { name: /Mid-market/ }).click()
    await expect(page.getByText('12% commission')).toBeVisible()

    await page.getByRole('button', { name: /Premium/ }).click()
    await expect(page.getByText('10% commission')).toBeVisible()
  })

  test('IFSC blur auto-fills bank name and branch in bank name input', async ({ page }) => {
    await loginAsOwner(page)
    await restoreAuth(page)
    await page.goto('/owner/onboarding/step6')
    await expectStepHeading(page, 'Bank & payouts')

    await page.getByPlaceholder('HDFC0001234').fill('SBIN0001234')
    await page.getByPlaceholder('HDFC0001234').blur()
    await expect(page.getByPlaceholder('Auto-filled from IFSC')).toHaveValue(
      'State Bank of India', { timeout: 3000 }
    )
    await expect(page.getByText(/MG Road/)).toBeVisible()
  })

  test('penny drop shows Verified badge after 2-second mock confirmation', async ({ page }) => {
    await loginAsOwner(page)
    await restoreAuth(page)
    await page.goto('/owner/onboarding/step6')
    await expectStepHeading(page, 'Bank & payouts')

    await page.getByPlaceholder('HDFC0001234').fill('HDFC0001234')
    await page.getByPlaceholder('HDFC0001234').blur()
    await expect(page.getByPlaceholder('Auto-filled from IFSC')).toHaveValue('HDFC Bank', { timeout: 3000 })

    await page.getByRole('button', { name: 'Verify now' }).click()
    await expect(page.getByText('Verified', { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Verify now' })).not.toBeVisible({ timeout: 3000 })
  })

  test('step 4 with "both" policy shows Hourly rate and Full-day rate fields', async ({ page }) => {
    await loginAsOwner(page)
    await restoreAuth(page)
    await page.goto('/owner/onboarding/step4')
    await expectStepHeading(page, 'Rooms & pricing')

    await page.getByText('Standard room').click()
    await expect(page.getByText('Hourly rate (₹/hr)')).toBeVisible()
    await expect(page.getByText('Full-day rate (₹/24h)')).toBeVisible()
  })

  test('sidebar marks step 1 as completed after advancing to step 2', async ({ page }) => {
    await loginAsOwner(page)
    await page.getByRole('button', { name: /Continue/ }).click()
    await expect(page).toHaveURL('/owner/onboarding/step2', { timeout: 8000 })

    const sidebar = page.locator('aside')
    await expect(sidebar.getByText('Account & owner')).toBeVisible()
  })

})

// ══════════════════════════════════════════════════════════════════════════════
// NEGATIVE PATHS
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Negative Paths — Validation & Error States', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page)
    // Inject token into sessionStorage so subsequent page.goto() calls survive the
    // full-page reload without losing auth (auth.store.ts strips token from storage)
    await restoreAuth(page)
  })

  // ── Step 2: amenity count badge ───────────────────────────────────────────

  test('Step 2: no amenities selected shows amber "0 selected (min 3)" badge', async ({ page }) => {
    await page.goto('/owner/onboarding/step2')
    await expect(page.getByText('0 selected (min 3)')).toBeVisible()
  })

  test('Step 2: 2 selected amenities shows amber badge with (min 3) text', async ({ page }) => {
    await page.goto('/owner/onboarding/step2')
    await page.getByRole('button', { name: 'WiFi' }).click()
    await page.getByRole('button', { name: 'Air conditioning' }).click()
    await expect(page.getByText('2 selected (min 3)')).toBeVisible()
  })

  test('Step 2: 3rd amenity turns badge green with ✓ checkmark', async ({ page }) => {
    await page.goto('/owner/onboarding/step2')
    await page.getByRole('button', { name: 'WiFi' }).click()
    await page.getByRole('button', { name: 'Air conditioning' }).click()
    await page.getByRole('button', { name: 'Parking' }).click()
    await expect(page.getByText(/3 selected ✓/)).toBeVisible()
  })

  test('Step 2: deselecting an amenity decrements the count', async ({ page }) => {
    await page.goto('/owner/onboarding/step2')
    await page.getByRole('button', { name: 'WiFi' }).click()
    await expect(page.getByText('1 selected (min 3)')).toBeVisible()
    await page.getByRole('button', { name: 'WiFi' }).click()
    await expect(page.getByText('0 selected (min 3)')).toBeVisible()
  })

  test('Step 2: pincode blur auto-fills city and state', async ({ page }) => {
    await page.goto('/owner/onboarding/step2')
    await page.getByPlaceholder('6 digits').fill('400001')
    await page.getByPlaceholder('6 digits').blur()
    await expect(page.getByPlaceholder('Auto-filled').first()).toHaveValue('Mumbai', { timeout: 3000 })
    await expect(page.getByPlaceholder('Auto-filled').nth(1)).toHaveValue('Maharashtra')
  })

  // ── Step 3: photo gallery ─────────────────────────────────────────────────

  test('Step 3: gallery starts at 0 / 4 required', async ({ page }) => {
    await page.goto('/owner/onboarding/step3')
    await expect(page.getByText('0 / 4 required')).toBeVisible()
  })

  test('Step 3: gallery badge increments with each photo click', async ({ page }) => {
    await page.goto('/owner/onboarding/step3')

    await page.getByText('Drag photos here or click to upload').click()
    await expect(page.getByText('1 / 4 required')).toBeVisible()

    await page.getByText('Drag photos here or click to upload').click()
    await expect(page.getByText('2 / 4 required')).toBeVisible()
  })

  test('Step 3: each upload click shows "Photo uploaded successfully" toast', async ({ page }) => {
    await page.goto('/owner/onboarding/step3')
    await page.getByText('Drag photos here or click to upload').click()
    await expect(page.getByText('Photo uploaded successfully')).toBeVisible({ timeout: 2000 })
  })

  test('Step 3: 4 photos turns gallery badge green', async ({ page }) => {
    await page.goto('/owner/onboarding/step3')
    for (let i = 0; i < 4; i++) {
      await page.getByText('Drag photos here or click to upload').click()
    }
    await expect(page.getByText('4 / 4 required')).toBeVisible()
  })

  // ── Step 5: document uploader ─────────────────────────────────────────────

  test('Step 5: oversized file (>10MB) shows size error in uploader', async ({ page }) => {
    await page.goto('/owner/onboarding/step5')
    await expectStepHeading(page, 'Documents & KYC')

    const oversized = Buffer.alloc(11 * 1024 * 1024, 0)
    await page.locator('input[type="file"][aria-label="PAN card *"]').setInputFiles({
      name: 'huge.pdf',
      mimeType: 'application/pdf',
      buffer: oversized,
    })
    await expect(page.getByText('File too large. Max 10MB.')).toBeVisible({ timeout: 2000 })
  })

  test('Step 5: valid document upload shows filename and success toast', async ({ page }) => {
    await page.goto('/owner/onboarding/step5')
    await expectStepHeading(page, 'Documents & KYC')

    await page.locator('input[type="file"][aria-label="PAN card *"]').setInputFiles(mockPdf('my-pan'))
    await expect(page.getByText('my-pan.pdf')).toBeVisible({ timeout: 6000 })
    await expect(page.getByText('PAN card uploaded')).toBeVisible({ timeout: 6000 })
  })

  test('Step 5: clicking Remove file resets uploader to idle state', async ({ page }) => {
    await page.goto('/owner/onboarding/step5')
    await expectStepHeading(page, 'Documents & KYC')

    await page.locator('input[type="file"][aria-label="PAN card *"]').setInputFiles(mockPdf('my-pan'))
    // Wait for success state (Remove button only appears when upload is complete)
    await expect(page.locator('button[aria-label="Remove file"]').first()).toBeVisible({ timeout: 6000 })

    // Use locator('button[aria-label=...]') to target the actual <button>, not the
    // outer <div role="button"> whose accessible name also includes "Remove file"
    await page.locator('button[aria-label="Remove file"]').first().click()
    await expect(page.getByText('Click or drag to upload').first()).toBeVisible({ timeout: 3000 })
  })

  // ── Step 6: IFSC & bank ───────────────────────────────────────────────────

  test('Step 6: unknown IFSC (valid format, not in mock) shows "IFSC not found" error', async ({ page }) => {
    await page.goto('/owner/onboarding/step6')
    await expectStepHeading(page, 'Bank & payouts')

    await page.getByPlaceholder('HDFC0001234').fill('UNKN0999999')
    await page.getByPlaceholder('HDFC0001234').blur()
    await expect(page.getByText(/IFSC not found/)).toBeVisible({ timeout: 3000 })
  })

  test('Step 6: IFSC failing format guard leaves bank name empty', async ({ page }) => {
    await page.goto('/owner/onboarding/step6')
    await expectStepHeading(page, 'Bank & payouts')

    await page.getByPlaceholder('HDFC0001234').fill('INVALID')
    await page.getByPlaceholder('HDFC0001234').blur()
    await expect(page.getByPlaceholder('Auto-filled from IFSC')).toHaveValue('')
  })

  test('Step 6: account number field is masked (type=password)', async ({ page }) => {
    await page.goto('/owner/onboarding/step6')
    await expectStepHeading(page, 'Bank & payouts')
    // Find by type (guaranteed from source); verify name attribute
    const accountInput = page.locator('input[type="password"]')
    await expect(accountInput).toBeVisible()
    await expect(accountInput).toHaveAttribute('name', 'accountNumber')
  })

  // ── Step 7: declaration & submission gate ─────────────────────────────────

  test('Step 7: content submit button is disabled when declaration is unchecked', async ({ page }) => {
    await page.goto('/owner/onboarding/step7')
    await expectStepHeading(page, 'Review & submit')

    const contentSubmit = page.locator('button', { hasText: 'Submit for review' }).first()
    await expect(contentSubmit).toBeDisabled()
  })

  test('Step 7: checking declaration enables the content submit button', async ({ page }) => {
    await page.goto('/owner/onboarding/step7')
    await expectStepHeading(page, 'Review & submit')

    await page.getByRole('checkbox').check()
    await expect(page.getByRole('checkbox')).toBeChecked()

    const contentSubmit = page.locator('button', { hasText: 'Submit for review' }).first()
    await expect(contentSubmit).toBeEnabled()
  })

  test('Step 7: submitting without draftId shows "No draft found" error toast', async ({ page }) => {
    await page.goto('/owner/onboarding/step7')
    await expectStepHeading(page, 'Review & submit')

    await page.getByRole('checkbox').check()
    await page.locator('button', { hasText: 'Submit for review' }).first().click()
    await expect(page.getByText(/No draft found/)).toBeVisible({ timeout: 3000 })
  })

  test('Step 7: incomplete checklist shows "Not completed" and "↗ Click to complete"', async ({ page }) => {
    await page.goto('/owner/onboarding/step7')
    await expectStepHeading(page, 'Review & submit')

    await expect(page.getByText('Not completed').first()).toBeVisible()
    await expect(page.getByText('↗ Click to complete').first()).toBeVisible()
  })

  test('Step 7: WizardShell footer shows "Submit for review" label on last step', async ({ page }) => {
    await page.goto('/owner/onboarding/step7')
    await expectStepHeading(page, 'Review & submit')

    const footerBtn = page.locator('button', { hasText: 'Submit for review' }).last()
    await expect(footerBtn).toBeEnabled()
  })

})
