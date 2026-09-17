import { api } from '@/lib/api'
import { withMembership } from '@/lib/hotel-access'
import type { HotelMembership } from '@/types'
import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Loader2, Zap } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useOnboardingStore } from '@/store/onboarding.store'

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(atob(parts[1])) as Record<string, unknown>
  } catch {
    return null
  }
}

export function SSOPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const saveStepData = useOnboardingStore((s) => s.saveStepData)
  const reset = useOnboardingStore((s) => s.reset)
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    // Clear params from URL immediately — the one-time code is single-use anyway.
    window.history.replaceState({}, '', '/sso')

    const fail = () => {
      toast.error('Invalid or expired sign-in link. Please register again.')
      navigate({ to: '/login' })
    }

    if (!code) {
      fail()
      return
    }

    const run = async () => {
      // Redeem the one-time code at the web app for the real tokens. Tokens
      // never travel in the URL. (PILOT: move redemption to the backend.)
      const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'http://localhost:3001'
      let tokens: { accessToken: string; refreshToken: string; phone?: string; email?: string }
      try {
        const res = await fetch(`${WEB_URL}/api/sso/handoff?code=${encodeURIComponent(code)}`)
        if (!res.ok) return fail()
        tokens = await res.json()
      } catch {
        return fail()
      }

      const payload = decodeJwtPayload(tokens.accessToken)
      if (!payload?.id || typeof payload.id !== 'string') return fail()

      // Phone/email arrive inside the redeemed payload, not the URL.
      const ph = tokens.phone ?? ''
      const em = tokens.email ?? ''
      const nameHint = em.split('@')[0] ?? 'owner'
      const initials = nameHint.slice(0, 2).toUpperCase()
      const user = {
        id: payload.id,
        name: nameHint,
        email: em,
        phone: ph,
        role: 'applicant' as const,
        onboardingStatus: 'not_started' as const,
        onboardingStep: 1,
        avatarInitials: initials,
      }

      const headers = { Authorization: `Bearer ${tokens.accessToken}` }
      const { data: profile } = await api.get<{ id: string; globalRole: string }>('/auth/me', { headers })
      if (profile.id !== user.id || profile.globalRole !== 'USER') return fail()
      const { data: memberships } = await api.get<HotelMembership[]>('/me/properties', { headers })
      setAuth(withMembership(user, memberships.find(m => m.role && m.status === 'approved') ?? memberships[0], memberships), tokens.accessToken, false, tokens.refreshToken)

      // Fresh onboarding — reset any previous draft then pre-fill Step 1
      reset()
      saveStepData(1, { phone: ph, email: em })

      toast.success("Account created! Let's set up your property.")
      navigate({ to: '/owner/access' })
    }

    void run().catch(fail)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-navy-50">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
        <Zap size={24} className="text-white" />
      </div>
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-navy-700 font-semibold">
          <Loader2 size={18} className="animate-spin text-primary-600" />
          Setting up your account…
        </div>
        <p className="text-sm text-navy-400">You'll land on your onboarding wizard in a moment.</p>
      </div>
    </div>
  )
}
