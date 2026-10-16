import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useOnboardingStore } from '@/store/onboarding.store'
import { api } from '@/lib/api'
import type { HotelMembership } from '@/types'
import { canAccessHotelRoute, withMembership } from '@/lib/hotel-access'
import { useAuthStore } from '@/store/auth.store'
export function HotelAccessSync() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['hotel-memberships', user?.id],
    queryFn: async () => (await api.get<HotelMembership[]>('/me/properties')).data,
    refetchInterval: 15000,
  })
  useEffect(() => {
    if (!data || !user) return
    const next = withMembership(
      user,
      data.find((m) => m.propertyId === user.propertyId),
      data
    )
    if (next.onboardingStatus === 'revision_requested' && user.onboardingStatus !== next.onboardingStatus) {
      useOnboardingStore.setState({ restoredDraftId: null })
    }
    if (JSON.stringify(next) !== JSON.stringify(user)) setUser(next)
    if (!canAccessHotelRoute(next, pathname)) void navigate({ to: '/owner/access' })
  }, [data, user, pathname, navigate, setUser])
  return null
}
