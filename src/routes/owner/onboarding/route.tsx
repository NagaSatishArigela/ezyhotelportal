import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { requireAuth } from '@/lib/guardHelpers'
import { useAuthStore } from '@/store/auth.store'
import { WizardShell } from '@/components/owner/WizardShell'

export const Route = createFileRoute('/owner/onboarding')({
  beforeLoad: () => {
    requireAuth('owner')
    const role = useAuthStore.getState().user?.role
    if (role !== 'applicant' && role !== 'owner') throw redirect({ to: '/owner/access' })
  },
  component: () => (
    <WizardShell>
      <Outlet />
    </WizardShell>
  ),
})
