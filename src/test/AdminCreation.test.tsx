import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuperAdminAdminsPage } from '@/pages/super-admin/SuperAdminAdminsPage'
import { superAdminApi } from '@/lib/api/superAdminApi'
import { AxiosError } from 'axios'

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'super' } }) }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }))
afterEach(() => vi.restoreAllMocks())
it('shows the duplicate-account explanation and a path to explicitly manage the existing user', async () => {
  vi.spyOn(superAdminApi, 'listAdmins').mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 })
  const error = new AxiosError('Request failed with status code 409')
  error.response = { status: 409, data: { error: { message: 'A user with this phone or email already exists' } }, statusText: 'Conflict', headers: {}, config: {} as never }
  const create = vi.spyOn(superAdminApi, 'createAdmin').mockRejectedValue(error)
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SuperAdminAdminsPage /></QueryClientProvider>)
  await userEvent.click(screen.getByTestId('create-admin-btn'))
  await userEvent.type(screen.getByTestId('name-input'), 'New Admin')
  await userEvent.type(screen.getByTestId('phone-input'), '9000000001')
  await userEvent.click(screen.getByTestId('confirm-create-btn'))
  expect(create).not.toHaveBeenCalled()
  await userEvent.type(screen.getByTestId('email-input'), 'ADMIN@example.test')
  await userEvent.click(screen.getByTestId('confirm-create-btn'))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('phone or email already exists'))
  expect(create).toHaveBeenCalledWith({ name: 'New Admin', phone: '9000000001', email: 'admin@example.test' })
  expect(screen.getByRole('link', { name: 'Manage the existing user' })).toHaveAttribute('href', '/super-admin/users')
})
