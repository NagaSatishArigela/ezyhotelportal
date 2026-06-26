import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '@/lib/guardHelpers'

// This is the owner segment guard only — no shell here.
// Each child route renders its own shell (WizardShell for onboarding, OwnerShell for portal).
export const Route = createFileRoute('/owner')({
  beforeLoad: () => requireAuth('owner'),
  component: () => <Outlet />,
})
