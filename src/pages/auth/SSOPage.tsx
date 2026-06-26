import { useEffect } from 'react'
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const at = params.get('at')
    const rt = params.get('rt') ?? undefined
    const ph = params.get('ph') ?? ''
    const em = params.get('em') ?? ''

    // Clear tokens from URL immediately — never leave credentials in browser history
    window.history.replaceState({}, '', '/sso')

    if (!at) {
      toast.error('Invalid sign-in link. Please register again.')
      navigate({ to: '/login' })
      return
    }

    const payload = decodeJwtPayload(at)
    if (!payload?.id || typeof payload.id !== 'string') {
      toast.error('Expired or invalid link. Please register again.')
      navigate({ to: '/login' })
      return
    }

    // Build the portal user from SSO params
    const nameHint = em.split('@')[0] ?? 'owner'
    const initials = nameHint.slice(0, 2).toUpperCase()
    const user = {
      id: payload.id,
      name: nameHint,
      email: em,
      phone: ph,
      role: 'owner' as const,
      onboardingStatus: 'not_started' as const,
      onboardingStep: 1,
      avatarInitials: initials,
    }

    // Authenticate in the portal store
    setAuth(user, at, false, rt)

    // Fresh onboarding — reset any previous draft then pre-fill Step 1
    reset()
    saveStepData(1, { phone: ph, email: em })

    toast.success("Account created! Let's set up your property.")
    navigate({ to: '/owner/onboarding/step1' })
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
