import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'

export const Route = createFileRoute('/forgot-password')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) throw redirect({ to: '/' })
  },
  component: ForgotPasswordPage,
})
