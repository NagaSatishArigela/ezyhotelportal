import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { requireAuth } from '@/lib/guardHelpers'
import { useAuthStore } from '@/store/auth.store'
import { restoreApplication } from '@/lib/onboarding-session'
import { WizardShell } from '@/components/owner/WizardShell'

export const Route = createFileRoute('/owner/onboarding')({
  beforeLoad: async () => {
    requireAuth('owner')
    const role = useAuthStore.getState().user?.role
    if (role !== 'applicant' && role !== 'owner') throw redirect({ to: '/owner/access' })
    const user = useAuthStore.getState().user
    if (user?.propertyId) {
      if (!['in_progress', 'revision_requested'].includes(user.onboardingStatus ?? '')) throw redirect({ to: '/owner/status' })
      const draft = await restoreApplication(user.propertyId)
      if (draft && !['draft', 'needs_revision'].includes(draft.status)) throw redirect({ to: '/owner/status' })
    }
  },
  component: () => (
    <WizardShell>
      <Outlet />
    </WizardShell>
  ),
})
