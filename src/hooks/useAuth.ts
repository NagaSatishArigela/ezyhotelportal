import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/store/auth.store'

export function useAuth() {
  return useAuthStore(
    useShallow((s) => ({
      user: s.user,
      token: s.token,
      isAuthenticated: s.isAuthenticated,
      role: s.user?.role ?? null,
      isApproved: s.user?.onboardingStatus === 'approved',
      onboardingStatus: s.user?.onboardingStatus ?? 'not_started',
      logout: s.logout,
      setAuth: s.setAuth,
      updateOnboardingStatus: s.updateOnboardingStatus,
    }))
  )
}
