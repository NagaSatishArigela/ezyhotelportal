import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '@/lib/guardHelpers'
import { WizardShell } from '@/components/owner/WizardShell'

export const Route = createFileRoute('/owner/onboarding')({
  beforeLoad: () => requireAuth('owner'),
  component: () => (
    <WizardShell>
      <Outlet />
    </WizardShell>
  ),
})
