import { createFileRoute } from '@tanstack/react-router'
import { SSOPage } from '@/pages/auth/SSOPage'

// No beforeLoad auth guard — this is the entry point for new owners
// arriving from the public site registration flow.
export const Route = createFileRoute('/sso')({
  component: SSOPage,
})
