import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'
import { useOnboardingStore } from '@/store/onboarding.store'
import { api } from '@/lib/api'
import { withMembership } from '@/lib/hotel-access'
import type { HotelMembership } from '@/types'

export const Route = createFileRoute('/list-property')({
  beforeLoad: async () => {
    const { isAuthenticated, user, token } = useAuthStore.getState()
    if (!isAuthenticated || !user || !token) {
      throw redirect({ to: '/login', search: { intent: 'list-property' } })
    }
    if (['admin', 'super_admin', 'support'].includes(user.role)) throw redirect({ to: '/' })
    const { data: memberships } = await api.get<HotelMembership[]>('/me/properties')
    if (useAuthStore.getState().user?.id !== user.id) throw redirect({ to: '/login', search: { intent: 'list-property' } })
    const drafts = memberships.filter(m => m.isApplicant && ['draft', 'needs_revision'].includes(m.status))
    // Let the applicant select when more than one application can be resumed.
    if (drafts.length > 1) throw redirect({ to: '/owner/access' })
    const draft = drafts[0]
    useOnboardingStore.getState().bindOwner(user.id, draft?.propertyId)
    useAuthStore.getState().setUser(withMembership(user, draft, memberships))
    throw redirect({ to: '/owner/onboarding/step1' })
  },
  component: () => null,
})
