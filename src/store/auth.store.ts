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
  setUser: (user: User) => void
  setToken: (token: string) => void
  setRefreshToken: (refreshToken: string) => void
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
    try {
      const parsed = JSON.parse(value) as { state?: { rememberMe?: boolean; token?: unknown; refreshToken?: unknown } }
      // Strip BOTH tokens before any persistence — tokens are memory-only.
      // sessionStorage is accessible to JS so an XSS payload could steal tokens
      // from it. By keeping tokens exclusively in the Zustand in-memory store
      // (not persisted), we eliminate the XSS token-theft attack surface.
      // Users re-authenticate on page reload — correct behaviour for a financial
      // operations portal where security outweighs convenience.
      const { token: _t, refreshToken: _rt, ...safeState } = parsed.state ?? {}
      const safe = JSON.stringify({ ...parsed, state: safeState })
      sessionStorage.setItem(name, safe)
      if (parsed?.state?.rememberMe) {
        localStorage.setItem(name, safe)
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

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),

      setRefreshToken: (refreshToken) => set({ refreshToken }),

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
      // Tokens are memory-only (stripped before persistence), so after a reload
      // no token survives. Persisting isAuthenticated:true without a token caused
      // an infinite /login <-> guard redirect loop. Force a clean unauthenticated
      // state on rehydration — the user re-authenticates, which is this portal's
      // intended reload behaviour. (Pilot: add cookie-backed session restore.)
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = false
          state.token = null
          state.refreshToken = null
        }
      },
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
