import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user) throw redirect({ to: '/login' })

    if (user.role === 'super_admin') throw redirect({ to: '/super-admin/dashboard' })
    if (user.role === 'admin')   throw redirect({ to: '/admin/verification' })
    if (user.role === 'support') throw redirect({ to: '/support/dashboard' })

    throw redirect({ to: '/owner/access' })
  },
  component: () => null,
})
