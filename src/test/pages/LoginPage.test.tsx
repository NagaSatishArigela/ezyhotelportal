import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from '@/pages/auth/LoginPage'
import { portalLogin } from '@/lib/portal-api'
import { toast } from 'sonner'

// ── Minimal router + query wrapper ──────────────────────────
const mockNavigate = vi.fn()
const mockSetAuth = vi.fn()
vi.mock('@/lib/portal-api', () => ({ portalLogin: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  }
})

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (s: { setAuth: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ setAuth: mockSetAuth }),
}))

function renderLogin() {
  return render(<LoginPage />)
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    vi.clearAllMocks()
    vi.mocked(portalLogin).mockReset()
  })

  it('renders email, password, and submit button', () => {
    renderLogin()
    expect(screen.getByTestId('email-input')).toBeInTheDocument()
    expect(screen.getByTestId('password-input')).toBeInTheDocument()
    expect(screen.getByTestId('login-button')).toBeInTheDocument()
  })

  it('renders forgot password link', () => {
    renderLogin()
    expect(screen.getByText('Forgot password?')).toBeInTheDocument()
  })

  it('renders all 5 demo account buttons', () => {
    renderLogin()
    expect(screen.getByTestId('demo-owner')).toBeInTheDocument()
    expect(screen.getByTestId('demo-approved')).toBeInTheDocument()
    expect(screen.getByTestId('demo-admin')).toBeInTheDocument()
    expect(screen.getByTestId('demo-support')).toBeInTheDocument()
    expect(screen.getByTestId('demo-superadmin')).toBeInTheDocument()
  })

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByTestId('email-input'), 'notanemail')
    await user.click(screen.getByTestId('login-button'))
    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    })
  })

  it('shows validation error for short password', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByTestId('email-input'), 'owner@demo.com')
    await user.type(screen.getByTestId('password-input'), '123')
    await user.click(screen.getByTestId('login-button'))
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
    })
  })

  it('clicking a demo button fills the email field', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(screen.getByTestId('demo-owner'))
    expect((screen.getByTestId('email-input') as HTMLInputElement).value).toBe('owner@demo.com')
  })

  it('calls authApi.login with correct credentials', async () => {
    const user = userEvent.setup()
    const loginSpy = vi.mocked(portalLogin).mockResolvedValueOnce({
      user: {
        id: 'u1', name: 'Ravi Sharma', email: 'owner@demo.com', phone: '', role: 'owner',
        avatarInitials: 'RS', onboardingStatus: 'in_progress', onboardingStep: 1,
      },
      token: 'mock.token', refreshToken: 'mock.refresh',
    })
    renderLogin()
    await user.type(screen.getByTestId('email-input'), 'owner@demo.com')
    await user.type(screen.getByTestId('password-input'), 'demo1234')
    await user.click(screen.getByTestId('login-button'))
    await waitFor(() => expect(loginSpy).toHaveBeenCalledWith('owner@demo.com', 'demo1234'))
    expect(mockSetAuth).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }), 'mock.token', false, 'mock.refresh')
  })

  it('navigates to onboarding on owner in-progress login', async () => {
    const user = userEvent.setup()
    vi.mocked(portalLogin).mockResolvedValueOnce({
      user: {
        id: 'u1', name: 'Ravi Sharma', email: 'owner@demo.com', phone: '', role: 'owner',
        avatarInitials: 'RS', onboardingStatus: 'in_progress', onboardingStep: 1,
      },
      token: 'mock.token', refreshToken: 'mock.refresh',
    })
    renderLogin()
    await user.type(screen.getByTestId('email-input'), 'owner@demo.com')
    await user.type(screen.getByTestId('password-input'), 'demo1234')
    await user.click(screen.getByTestId('login-button'))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/owner/onboarding/step1' })
    })
  })

  it('navigates to admin on admin login', async () => {
    const user = userEvent.setup()
    vi.mocked(portalLogin).mockResolvedValueOnce({
      user: {
        id: 'u2', name: 'Ankit Verma', email: 'admin@demo.com', phone: '', role: 'admin',
        avatarInitials: 'AV',
      },
      token: 'mock.token', refreshToken: 'mock.refresh',
    })
    renderLogin()
    await user.type(screen.getByTestId('email-input'), 'admin@demo.com')
    await user.type(screen.getByTestId('password-input'), 'demo1234')
    await user.click(screen.getByTestId('login-button'))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/admin/verification' })
    })
  })

  it('shows error toast on wrong credentials', async () => {
    const user = userEvent.setup()
    vi.mocked(portalLogin).mockRejectedValueOnce(new Error('Invalid email or password.'))
    renderLogin()
    await user.type(screen.getByTestId('email-input'), 'wrong@test.com')
    await user.type(screen.getByTestId('password-input'), 'wrongpass')
    await user.click(screen.getByTestId('login-button'))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid email or password.'))
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockSetAuth).not.toHaveBeenCalled()
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderLogin()
    const input = screen.getByTestId('password-input') as HTMLInputElement
    expect(input.type).toBe('password')
    await user.click(screen.getByLabelText('Show password'))
    expect(input.type).toBe('text')
    await user.click(screen.getByLabelText('Hide password'))
    expect(input.type).toBe('password')
  })
})
