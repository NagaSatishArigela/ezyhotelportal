import { useState } from 'react'
import { restoreApplication } from '@/lib/onboarding-session'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api } from '@/lib/api'
import { withMembership, HOTEL_ROUTE_PERMISSIONS } from '@/lib/hotel-access'
import { useAuthStore } from '@/store/auth.store'
import { useOnboardingStore } from '@/store/onboarding.store'
import type { HotelMembership } from '@/types'
import { Button } from '@/components/ui/button'

export function HotelAccessPage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['hotel-memberships', user?.id],
    queryFn: async () => (await api.get<HotelMembership[]>('/me/properties')).data,
    refetchInterval: 15000,
  })
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState('')
  const open = async (m: HotelMembership) => {
    if (!user) return
    useOnboardingStore.getState().bindOwner(user.id, m.isApplicant ? m.propertyId : undefined)
    setUser(withMembership(user, m, data))
    if (m.role && m.status === 'approved') {
      const page = Object.entries(HOTEL_ROUTE_PERMISSIONS).find(([, p]) =>
        m.permissions.includes(p)
      )?.[0]
      if (page) void navigate({ to: '/owner/' + page })
    } else if (m.isApplicant) {
      setOpening(true)
      setOpenError('')
      try {
        if (['draft', 'needs_revision'].includes(m.status)) await restoreApplication(m.propertyId)
        void navigate({ to: '/owner/status' })
      } catch { setOpenError('Unable to restore this application. Please open it again to retry.') }
      finally { setOpening(false) }
    }
  }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Your hotels and applications</h1>
      <p>
        Hotel operations become available after platform approval. Your customer account remains
        unchanged.
      </p>
      {openError && <p role="alert">{openError}</p>}
      {isLoading && <p>Loading hotels...</p>}
      {isError && <p role="alert">Unable to load your memberships. Please retry.</p>}
      {data?.map((m) => (
        <div key={m.propertyId} className="rounded-lg border p-4 space-y-2">
          <h2 className="font-semibold">{m.name}</h2>
          <p>
            {m.status} -{' '}
            {m.status === 'approved'
              ? m.roleName
              : m.isApplicant
                ? 'Applicant'
                : 'Access suspended'}
          </p>
          <Button
            disabled={opening || (!m.isApplicant && (m.status !== 'approved' || !m.permissions.length))}
            onClick={() => open(m)}
          >
            Open hotel
          </Button>
        </div>
      ))}
      {data?.length === 0 && <p>You do not have a hotel membership or application yet.</p>}
      <Button
        disabled={opening}
        onClick={() => {
          if (!user) return
          useOnboardingStore.getState().reset()
          setUser(withMembership(user, undefined, data))
          void navigate({ to: '/owner/onboarding/step1' })
        }}
      >
        Apply to list a property
      </Button>
    </div>
  )
}
