import { test, expect } from '@playwright/test'

test.describe('Auth — Login flows', () => {
  test.beforeEach(async ({ page }) => {
    // Clear persisted auth before each test
    await page.goto('/login')
    await page.evaluate(() => localStorage.removeItem('stayflex-auth'))
  })

  test('shows login page with demo accounts', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('email-input')).toBeVisible()
    await expect(page.getByTestId('password-input')).toBeVisible()
    await expect(page.getByTestId('login-button')).toBeVisible()
    await expect(page.getByTestId('demo-owner')).toBeVisible()
    await expect(page.getByTestId('demo-admin')).toBeVisible()
    await expect(page.getByTestId('demo-support')).toBeVisible()
  })

  test('Owner (onboarding) → redirects to /owner/onboarding/step1', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('demo-owner').click()
    await page.getByTestId('login-button').click()
    await expect(page).toHaveURL('/owner/onboarding/step1', { timeout: 5000 })
  })

  test('Owner (approved) → redirects to /owner/dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('demo-approved').click()
    await page.getByTestId('login-button').click()
    await expect(page).toHaveURL('/owner/dashboard', { timeout: 5000 })
  })

  test('Admin → redirects to /admin/verification', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('demo-admin').click()
    await page.getByTestId('login-button').click()
    await expect(page).toHaveURL('/admin/verification', { timeout: 5000 })
  })

  test('Support → redirects to /support/dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('demo-support').click()
    await page.getByTestId('login-button').click()
    await expect(page).toHaveURL('/support/dashboard', { timeout: 5000 })
  })

  test('wrong password → shows error toast, stays on login', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('email-input').fill('owner@demo.com')
    await page.getByTestId('password-input').fill('wrongpass')
    await page.getByTestId('login-button').click()
    await expect(page.getByText('Invalid email or password.')).toBeVisible({ timeout: 3000 })
    await expect(page).toHaveURL('/login')
  })

  test('empty form submit → shows validation errors', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-button').click()
    await expect(page.getByText('Enter a valid email address')).toBeVisible()
  })

  test('forgot password link navigates to forgot-password page', async ({ page }) => {
    await page.goto('/login')
    await page.getByText('Forgot password?').click()
    await expect(page).toHaveURL('/forgot-password')
  })

  test('forgot password form shows success state', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.getByPlaceholder('you@example.com').fill('owner@demo.com')
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByText('Check your inbox')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('owner@demo.com')).toBeVisible()
  })

  test('authenticated user visiting /login → redirected away', async ({ page }) => {
    // Admin lands on /admin/verification, which calls the live properties API —
    // mock it so an unmocked 401 doesn't trigger logout and redirect back to /login.
    await page.route('**/api/admin/properties**', async (route) => {
      await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 20 } })
    })

    // Log in first
    await page.goto('/login')
    await page.getByTestId('demo-admin').click()
    await page.getByTestId('login-button').click()
    await expect(page).toHaveURL('/admin/verification', { timeout: 5000 })

    // Now try to visit login again
    await page.goto('/login')
    await expect(page).not.toHaveURL('/login')
  })

  test('unauthenticated user visiting /owner/dashboard → redirected to /login', async ({ page }) => {
    await page.goto('/owner/dashboard')
    await expect(page).toHaveURL('/login', { timeout: 3000 })
  })

  test('password toggle shows/hides password', async ({ page }) => {
    await page.goto('/login')
    const pwdInput = page.getByTestId('password-input')
    await pwdInput.fill('demo1234')
    await expect(pwdInput).toHaveAttribute('type', 'password')
    await page.getByLabel('Show password').click()
    await expect(pwdInput).toHaveAttribute('type', 'text')
    await page.getByLabel('Hide password').click()
    await expect(pwdInput).toHaveAttribute('type', 'password')
  })
})
