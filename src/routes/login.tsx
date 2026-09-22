import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'
import { LoginPage } from '@/pages/auth/LoginPage'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { intent?: 'list-property' } => ({
    intent: search.intent === 'list-property' ? 'list-property' : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: search.intent === 'list-property' ? '/list-property' : '/' })
    }
  },
  component: LoginRoute,
})

function LoginRoute() {
  const { intent } = Route.useSearch()
  return <LoginPage listingProperty={intent === 'list-property'} />
}
