import { useEffect } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useShallow } from 'zustand/react/shallow'
import { Zap, Shield, LogOut } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboarding.store'
import { useAuth } from '@/hooks/useAuth'
import { StepProgress } from '@/components/shared/StepProgress'
import { AutoSaveIndicator } from '@/components/shared/AutoSaveIndicator'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const WIZARD_STEPS = [
  { number: 1, label: 'Account & owner',  sublabel: 'Identity verified' },
  { number: 2, label: 'Property info',    sublabel: 'Name, address, type' },
  { number: 3, label: 'Media & gallery',  sublabel: 'Photos, cover image' },
  { number: 4, label: 'Rooms & pricing',  sublabel: 'Inventory setup' },
  { number: 5, label: 'Documents & KYC',  sublabel: 'GST, PAN, ownership' },
  { number: 6, label: 'Bank & payouts',   sublabel: 'Where money lands' },
  { number: 7, label: 'Review & submit',  sublabel: 'Final confirmation' },
]

interface WizardShellProps {
  children: React.ReactNode
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  backLabel?: string
  nextLoading?: boolean
  nextDisabled?: boolean
  hideFooter?: boolean
}

export function WizardShell({
  children,
  onBack,
  onNext,
  nextLabel = 'Continue',
  backLabel = 'Back',
  nextLoading = false,
  nextDisabled = false,
  hideFooter = false,
}: WizardShellProps) {
  const { user, logout } = useAuth()
  const { currentStep, completedSteps, setCurrentStep, completeStep } = useOnboardingStore(
    useShallow((s) => ({
      currentStep: s.currentStep,
      completedSteps: s.completedSteps,
      setCurrentStep: s.setCurrentStep,
      completeStep: s.completeStep,
    }))
  )
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const routeStep = Number(pathname.match(/\/step(\d+)$/)?.[1])
  const activeStep = Number.isInteger(routeStep) && routeStep >= 1 && routeStep <= WIZARD_STEPS.length
    ? routeStep
    : currentStep

  useEffect(() => {
    if (activeStep !== currentStep) setCurrentStep(activeStep)
  }, [activeStep, currentStep, setCurrentStep])

  const handleBack = onBack ?? (activeStep > 1
    ? () => navigate({ to: `/owner/onboarding/step${activeStep - 1}` as never })
    : undefined)
  const handleNext = onNext ?? (() => {
    completeStep(activeStep)
    if (activeStep >= WIZARD_STEPS.length) {
      navigate({ to: '/owner/status' })
      return
    }
    navigate({ to: `/owner/onboarding/step${activeStep + 1}` as never })
  })

  return (
    <div className="flex h-screen overflow-hidden bg-navy-50">
      <aside className="hidden lg:flex w-80 shrink-0 flex-col bg-white border-r border-border">
        <div className="flex h-16 items-center gap-2.5 px-7 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <Zap size={18} className="text-white" strokeWidth={2.4} aria-hidden />
          </div>
          <div>
            <span className="font-display font-bold text-navy-900 text-base">stayflex</span>
            <span className="text-navy-400 font-normal text-sm ml-1">for partners</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto thin-scroll px-7 pt-7 pb-4">
          <p className="text-[11px] text-navy-400 uppercase font-bold tracking-[0.6px] mb-2">
            List your property
          </p>
          <h2 className="font-display font-semibold text-[22px] text-navy-900 leading-tight mb-1.5">
            Set up takes about 12 minutes
          </h2>
          <p className="text-[13.5px] text-navy-500 leading-relaxed mb-6">
            You can save and return any time. We typically verify within 24 hours.
          </p>
          <StepProgress steps={WIZARD_STEPS} currentStep={activeStep} completedSteps={completedSteps} />
        </div>

        <div className="px-7 py-5 border-t border-border">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-navy-500" aria-hidden />
            <span className="text-sm font-semibold text-navy-700">Need help?</span>
          </div>
          <p className="text-xs text-navy-400 leading-relaxed">
            Chat with onboarding{" "}
            <a href="tel:+918049009000" className="text-primary-600 font-semibold hover:underline">
              +91 80-4900-9000
            </a>
          </p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between bg-white border-b border-border px-6">
          <div className="flex items-center gap-3">
            <span className="lg:hidden text-sm font-semibold text-navy-700">
              Step {activeStep} of {WIZARD_STEPS.length}
            </span>
            <AutoSaveIndicator />
          </div>
          <div className="hidden max-lg:flex flex-1 mx-4 h-1.5 bg-navy-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300 rounded-full"
              style={{ width: `${(activeStep / WIZARD_STEPS.length) * 100}%` }}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded-full">
                <Avatar className="h-9 w-9 cursor-pointer">
                  <AvatarFallback className="bg-primary-100 text-primary-700 font-semibold text-sm">
                    {user?.avatarInitials ?? "O"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold text-navy-900">{user?.name}</p>
                <p className="text-xs text-navy-400 truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { logout(); navigate({ to: "/login" }) }}
                className="text-error-500"
              >
                <LogOut size={14} aria-hidden />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto thin-scroll">
          <div className="max-w-[920px] mx-auto px-6 lg:px-12 pt-8 pb-4">
            {children}
          </div>
        </main>

        {!hideFooter && (
          <div className="shrink-0 bg-white border-t border-border px-6 lg:px-12 py-[18px] flex items-center gap-3">
            {handleBack ? (
              <Button variant="secondary" onClick={handleBack} type="button">{backLabel}</Button>
            ) : (
              <div className="w-24" />
            )}
            <span className="text-xs text-navy-400">Step {activeStep} of {WIZARD_STEPS.length}</span>
            <div className="flex-1" />
            <Button variant="outline" type="button" onClick={() => navigate({ to: "/owner/status" })}>
              Save & exit
            </Button>
            <Button variant="primary" type="submit" onClick={handleNext} loading={nextLoading} disabled={nextDisabled}>
              {activeStep >= WIZARD_STEPS.length ? 'Submit for review' : nextLabel} &rarr;
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
