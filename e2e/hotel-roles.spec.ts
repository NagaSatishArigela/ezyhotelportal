import { expect, test, type Page } from '@playwright/test'
import type { HotelMembership } from '../src/types'
const hotel: HotelMembership = {
  propertyId: '11111111-1111-4111-8111-111111111111',
  name: 'First hotel',
  status: 'approved',
  isActive: true,
  isApplicant: true,
  role: 'OWNER',
  roleName: 'OWNER',
  permissions: ['view_bookings', 'manage_staff'],
}
async function setup(page: Page, memberships: HotelMembership[], globalRole = 'USER') {
  const requests: { path: string; method: string; body: unknown }[] = []
  const customRoles: { id: string; name: string; permissions: string[] }[] = []
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin !== 'http://127.0.0.1:3187') return route.abort()
    if (!url.pathname.startsWith('/api/')) return route.continue()
    const path = url.pathname.slice(4),
      method = route.request().method()
    const body = route.request().postDataJSON()
    requests.push({ path, method, body })
    let data: unknown = { items: [], total: 0, page: 1, limit: 20 }
    if (path === '/auth/login')
      data = {
        user: {
          id: 'user-1',
          name: 'Tester',
          email: 'test@example.com',
          phone: '',
          globalRole,
          status: 'active',
        },
        tokens: {
          accessToken:
            'header.' +
            Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString(
              'base64url'
            ) +
            '.sig',
          refreshToken: 'refresh',
        },
      }
    else if (path === '/me/properties') data = memberships
    else if (path === '/super-admin/stats') data = { totalProperties: 1, activeProperties: 1, totalBookings: 0, bookingsThisMonth: 0, grossRevenuePaise: 0, grossRevenueThisMonthPaise: 0, totalPayoutsReleasedPaise: 0, totalTdsPaise: 0, activeAdmins: 1, totalOwners: 1, activeBookings: 0 }
    else if (path.endsWith('/team/roles') && method === 'POST') {
      const role = { id: 'role-1', ...body }
      customRoles.push(role)
      data = role
    } else if (path.endsWith('/team'))
      data = {
        permissions: ['view_bookings', 'manage_rooms'],
        roles: { STAFF: ['view_bookings'] },
        customRoles,
        members: [
          {
            userId: 'user-1',
            role: 'OWNER',
            hotelRoleId: null,
            hotelRole: null,
            user: { id: 'user-1', name: 'Tester', email: 'test@example.com', status: 'active' },
          },
        ],
      }
    else if (path === '/super-admin/users')
      data = {
        items: [
          {
            id: 'customer-1',
            name: 'Customer',
            email: 'customer@example.com',
            phone: '',
            globalRole: 'USER',
            status: 'active',
            propertyRoles: [],
          },
        ],
        total: 1,
      }
    else if (path === '/super-admin/properties')
      data = {
        items: [
          {
            id: hotel.propertyId,
            name: hotel.name,
            city: 'Hyderabad',
            ownerId: 'user-1',
            status: 'approved',
            owner: { name: 'Owner', email: 'owner@example.com' },
          },
        ],
        total: 1,
      }
    else if (path.endsWith('/unread-count')) data = { count: 0 }
    else if (path.endsWith('/status'))
      data = { status: 'pending_review', revisionNotes: [], timeline: [] }
    await route.fulfill({ json: data })
  })
  await page.goto('/login')
  await page.getByTestId('email-input').fill('test@example.com')
  await page.getByTestId('password-input').fill('password123')
  await page.getByTestId('login-button').click()
  return requests
}
test('unapproved applicants have no operational links', async ({ page }) => {
  await setup(page, [
    { ...hotel, status: 'pending_review', role: null, roleName: null, permissions: [] },
  ])
  await expect(page).toHaveURL('/owner/access')
  await expect(page.getByRole('link', { name: 'Bookings', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Team & roles' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Open hotel' }).click()
  await expect(page).toHaveURL('/owner/status')
})
test('staff see assigned operations and can switch hotel scope', async ({ page }) => {
  await setup(page, [
    {
      ...hotel,
      isApplicant: false,
      role: 'STAFF',
      roleName: 'Reception',
      permissions: ['view_bookings'],
    },
    {
      ...hotel,
      propertyId: '22222222-2222-4222-8222-222222222222',
      name: 'Second hotel',
      isApplicant: false,
      role: 'MANAGER',
      roleName: 'Manager',
      permissions: ['manage_rooms'],
    },
  ])
  await page.getByRole('button', { name: 'Open hotel' }).first().click()
  await expect(page).toHaveURL('/owner/bookings')
  await expect(page.getByRole('link', { name: 'Team & roles' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Your hotels' }).click()
  await page.getByRole('button', { name: 'Open hotel' }).nth(1).click()
  await expect(page).toHaveURL('/owner/rooms')
  await expect(page.getByRole('link', { name: 'Bookings', exact: true })).toHaveCount(0)
})
test('approved owner creates a custom role and assigns an existing user', async ({ page }) => {
  const requests = await setup(page, [hotel])
  await page.getByRole('link', { name: 'Team & roles' }).click()
  await page.getByLabel('Role name', { exact: true }).fill('Reception')
  await page.getByRole('checkbox', { name: 'view bookings' }).check()
  await page.getByRole('button', { name: 'Save role' }).click()
  await expect(page.getByRole('option', { name: 'Reception' })).toHaveCount(1)
  await page.getByLabel('Member email').fill('staff@example.com')
  await page.getByLabel('Member role').selectOption('custom:role-1')
  await page.getByRole('button', { name: 'Assign member' }).click()
  await expect
    .poll(() => requests.find((r) => r.path.endsWith('/team/members'))?.body)
    .toEqual({ email: 'staff@example.com', hotelRoleId: 'role-1' })
  expect(requests.find((r) => r.path.endsWith('/team/roles') && r.method === 'POST')?.body).toEqual(
    { name: 'Reception', permissions: ['view_bookings'] }
  )
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toHaveCount(0)
})
test('super admin can manage users, hotels and access approvals', async ({ page }) => {
  const requests = await setup(page, [], 'SUPER_ADMIN')
  await page.getByRole('link', { name: 'All users', exact: true }).click()
  await expect(page.getByText('customer@example.com')).toBeVisible()
  await page.getByRole('button', { name: 'Manage user' }).click()
  await page.getByLabel('Account status').selectOption('suspended')
  await page.getByRole('button', { name: 'Save user' }).click()
  await expect
    .poll(() => requests.find((r) => r.path === '/super-admin/users/customer-1')?.body)
    .toEqual({ globalRole: 'USER', status: 'suspended' })
  await page.getByRole('link', { name: 'Hotels & owners' }).click()
  await page.getByRole('button', { name: 'Suspend hotel' }).click()
  await expect
    .poll(() => requests.find((r) => r.path.endsWith('/status') && r.method === 'PATCH')?.body)
    .toEqual({ suspended: true })
  await page.getByRole('link', { name: 'Property approvals', exact: true }).click()
  await expect(page).toHaveURL('/admin/verification')
})


test('a saved application restores property details and preserves masked compliance', async ({ page }) => {
  await setup(page, [{ ...hotel, status: 'draft', role: null, roleName: null, permissions: [] }])
  await page.route('**/api/properties/*/draft', route => route.fulfill({ json: {
    propertyId: hotel.propertyId, status: 'draft', draftStep: 5,
    draftData: {
      step1: { propertyName: 'Restored hotel', propertyType: 'hotel', bookingPolicy: 'hourly', ownerFirstName: 'Tester', businessEntity: 'individual', category: 'mid' },
      step2: { addressLine1: 'Saved street', city: 'Hyderabad', state: 'Telangana', pincode: '500001', latitude: 17, longitude: 78 },
      step3: { rooms: [{ type: 'ac', count: 2, hourlyRate: 500, maxOccupancy: 2 }], amenities: ['wifi'], minBookingHours: '2' },
      step4: { photos: [] },
    },
    compliance: { legalBusinessName: 'Saved business', gstinMasked: null, panMasked: '****1234F', bankAccountNumberMasked: '****6789', ifsc: 'HDFC0000123', accountHolderName: 'Tester', documents: [{ type: 'fire_safety_cert', status: 'pending', expiresAt: null }] },
  } }))
  await page.getByRole('button', { name: 'Open hotel' }).click()
  await page.getByRole('button', { name: /Step 2/ }).click()
  await expect(page.locator('input[name="propertyName"]')).toHaveValue('Restored hotel')
  for (const width of [1900, 390]) {
    await page.setViewportSize({ width, height: 850 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('button', { name: 'Save & exit' })).toBeInViewport()
    await page.locator('main').evaluate(el => { el.scrollTop = el.scrollHeight })
    await expect(page.getByRole('button', { name: 'Save & exit' })).toBeInViewport()
  }
  await page.setViewportSize({ width: 1280, height: 850 })

  await page.getByRole('button', { name: 'Save & exit' }).click()
  await page.getByRole('button', { name: /Step 5/ }).click()
  await expect(page.getByRole('heading', { name: 'Saved legal and payout details' })).toBeVisible()
  await expect(page.getByText('****1234F', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: /Continue/ }).click()
  await expect(page).toHaveURL('/owner/onboarding/step6')
  await expect(page.getByRole('heading', { name: 'Saved legal and payout details' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Team & roles' })).toHaveCount(0)
})
