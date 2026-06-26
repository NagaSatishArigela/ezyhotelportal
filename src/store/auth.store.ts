import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Role, OnboardingStatus } from '@/types'
import { isTokenExpired } from '@/lib/token'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  rememberMe: boolean

  setAuth: (user: User, token: string, rememberMe?: boolean, refreshToken?: string) => void
  setToken: (token: string) => void
  updateOnboardingStatus: (status: OnboardingStatus, step?: number) => void
  logout: () => void
  checkTokenExpiry: () => boolean  // returns true if still valid
}

// Custom StateStorage: writes to both sessionStorage (always) and localStorage
// (only when rememberMe=true). On read, tries sessionStorage first so the
// current session wins, then falls back to localStorage for the remember-me path.
const authStateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem(name) ?? localStorage.getItem(name)
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(name, value)
    try {
      const parsed = JSON.parse(value) as { state?: { rememberMe?: boolean; token?: unknown } }
      if (parsed?.state?.rememberMe) {
        // Strip the access token before writing to localStorage — JWT tokens must
        // never be persisted to localStorage (XSS-readable). User identity (name,
        // role) is safe to keep; the token is re-acquired on the next session via
        // the login flow.
        const { token: _omit, ...safeState } = parsed.state ?? {}
        localStorage.setItem(name, JSON.stringify({ ...parsed, state: safeState }))
      } else {
        localStorage.removeItem(name)
      }
    } catch {
      localStorage.removeItem(name)
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(name)
    localStorage.removeItem(name)
  },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      rememberMe: false,

      setAuth: (user, token, rememberMe = false, refreshToken?) =>
        set({ user, token, refreshToken: refreshToken ?? null, isAuthenticated: true, rememberMe }),

      setToken: (token) => set({ token }),

      updateOnboardingStatus: (status, step) =>
        set((s) => ({
          user: s.user
            ? { ...s.user, onboardingStatus: status, onboardingStep: step ?? s.user.onboardingStep }
            : null,
        })),

      logout: () => set({ user: null, token: null, refreshToken: null, isAuthenticated: false, rememberMe: false }),

      checkTokenExpiry: () => {
        const { token, logout } = get()
        if (!token) return false
        // isTokenExpired uses seconds-based JWT exp (not milliseconds like mock tokens)
        if (isTokenExpired(token)) { logout(); return false }
        return true
      },
    }),
    {
      name: 'stayflex-auth',
      storage: createJSONStorage(() => authStateStorage),
    }
  )
)

// Derived selectors
export const selectUser = (s: AuthState) => s.user
export const selectRole = (s: AuthState): Role | null => s.user?.role ?? null
export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated
export const selectOnboardingStatus = (s: AuthState): OnboardingStatus =>
  s.user?.onboardingStatus ?? 'not_started'
export const selectIsApproved = (s: AuthState) =>
  s.user?.onboardingStatus === 'approved'
