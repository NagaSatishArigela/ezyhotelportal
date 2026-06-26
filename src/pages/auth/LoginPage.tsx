import { useState, useEffect } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Zap, TrendingUp, Shield, Clock, IndianRupee } from 'lucide-react'
import { portalLogin } from '@/lib/portal-api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldWrapper } from '@/components/shared/FieldWrapper'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email:      z.string().email('Enter a valid email address'),
  password:   z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
})
type LoginForm = z.infer<typeof loginSchema>

const DEMO_ACCOUNTS = [
  { label: 'Owner — Onboarding', email: 'owner@demo.com',       colorCls: 'bg-primary-50 text-primary-700 hover:bg-primary-100' },
  { label: 'Owner — Approved',   email: 'approved@demo.com',    colorCls: 'bg-success-50 text-success-700 hover:bg-success-50' },
  { label: 'Admin',              email: 'admin@demo.com',       colorCls: 'bg-navy-100 text-navy-700 hover:bg-navy-200' },
  { label: 'Support',            email: 'support@demo.com',     colorCls: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
  { label: 'Super Admin',        email: 'superadmin@demo.com',  colorCls: 'bg-navy-800 text-white hover:bg-navy-700' },
]

const BRAND_FEATURES = [
  { icon: TrendingUp,    text: 'Real-time bookings & revenue dashboard' },
  { icon: IndianRupee,   text: 'Fast D+1 settlements with TDS tracking' },
  { icon: Clock,         text: 'Hourly & overnight pricing in one place' },
  { icon: Shield,        text: 'RBI-compliant KYC & secure payouts' },
]

export function LoginPage() {
  const navigate   = useNavigate()
  const setAuth    = useAuthStore((s) => s.setAuth)
  const [showPwd, setShowPwd] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [apiError, setApiError] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } =
    useForm<LoginForm>({
      resolver: zodResolver(loginSchema),
      defaultValues: { rememberMe: false },
    })

  // Single shake trigger — fires on validation errors OR API errors
  useEffect(() => {
    const hasError = Object.keys(errors).length > 0 || apiError
    if (!hasError) return
    setShaking(true)
    const t = setTimeout(() => { setShaking(false); setApiError(false) }, 500)
    return () => clearTimeout(t)
  }, [errors, apiError])

  const onSubmit = async ({ email, password, rememberMe }: LoginForm) => {
    try {
      const { user, token, refreshToken } = await portalLogin(email, password)
      setAuth(user, token, rememberMe, refreshToken)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)

      if (user.role === 'super_admin') return navigate({ to: '/super-admin/dashboard' })
      if (user.role === 'admin')   return navigate({ to: '/admin/verification' })
      if (user.role === 'support') return navigate({ to: '/support/dashboard' })

      // Owner: route by onboarding status
      const s = user.onboardingStatus
      if (s === 'approved') return navigate({ to: '/owner/dashboard' })
      if (s === 'submitted' || s === 'under_review' || s === 'revision_requested' || s === 'rejected')
        return navigate({ to: '/owner/status' })
      navigate({ to: '/owner/onboarding/step1' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
      setApiError(true)
    }
  }

  const fillDemo = (email: string) => {
    setValue('email', email, { shouldValidate: false })
    setValue('password', 'demo1234', { shouldValidate: false })
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left: form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-white overflow-y-auto">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-9">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 shadow-sm">
              <Zap size={20} className="text-white" aria-hidden />
            </div>
            <div>
              <p className="font-display font-bold text-navy-900 text-lg leading-none">Stayflex</p>
              <p className="text-[11px] text-navy-400 mt-0.5">Partner Portal</p>
            </div>
          </div>

          <h1 className="font-display font-bold text-[26px] text-navy-900 mb-1">Welcome back</h1>
          <p className="text-sm text-navy-500 mb-7">Sign in to manage your property</p>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className={cn(
              'space-y-4',
              shaking && 'animate-[shake_0.4s_ease-in-out]'
            )}
          >
            <FieldWrapper label="Email address" error={errors.email?.message} required>
              <Input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                error={!!errors.email}
                data-testid="email-input"
              />
            </FieldWrapper>

            <FieldWrapper label="Password" error={errors.password?.message} required>
              <Input
                {...register('password')}
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                error={!!errors.password}
                data-testid="password-input"
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPwd((p) => !p)}
                    tabIndex={-1}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                    className="text-navy-400 hover:text-navy-600"
                  >
                    {showPwd ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                  </button>
                }
              />
            </FieldWrapper>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  {...register('rememberMe')}
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-primary-600 accent-primary-600 focus:ring-primary-600"
                  data-testid="remember-me"
                />
                <span className="text-sm text-navy-600">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-primary-600 font-medium hover:text-primary-700 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              block
              loading={isSubmitting}
              className="mt-1"
              data-testid="login-button"
            >
              Sign in
            </Button>
          </form>

          {/* Demo accounts — only shown in development builds */}
          {import.meta.env.DEV && (
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-3">
                Demo accounts — click to fill
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc.email)}
                    className={cn(
                      'rounded-lg px-3 py-2 text-xs font-semibold text-left transition-colors',
                      acc.colorCls
                    )}
                    data-testid={`demo-${acc.email.split('@')[0]}`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-navy-300 mt-2">
                Password for all:{' '}
                <span className="font-mono bg-navy-50 px-1 rounded text-navy-500">demo1234</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: brand panel ── */}
      <div
        className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-700) 100%)' }}
        aria-hidden="true"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-sm w-full">
          {/* Hero icon */}
          <div className="flex h-20 w-20 mb-7 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20">
            <Zap size={40} className="text-white" />
          </div>

          <h2 className="font-display font-bold text-[30px] leading-tight mb-3">
            Grow your property business with Stayflex
          </h2>
          <p className="text-white/75 text-base leading-relaxed mb-8">
            India's fastest-growing hourly & overnight booking platform for hotels, resorts, and homestays.
          </p>

          {/* Feature list */}
          <div className="space-y-3.5">
            {BRAND_FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                  <Icon size={16} className="text-white" />
                </div>
                <p className="text-sm text-white/90 font-medium">{text}</p>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="mt-10 pt-6 border-t border-white/20 flex items-center gap-6">
            <div>
              <p className="font-display font-bold text-2xl">2,400+</p>
              <p className="text-xs text-white/70 mt-0.5">Properties listed</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="font-display font-bold text-2xl">₹12Cr+</p>
              <p className="text-xs text-white/70 mt-0.5">Paid out to owners</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="font-display font-bold text-2xl">4.8★</p>
              <p className="text-xs text-white/70 mt-0.5">Owner satisfaction</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
