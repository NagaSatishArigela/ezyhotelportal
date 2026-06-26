import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getPropertyStatus } from '@/lib/portal-api'
import {
  Clock, ArrowRight, CheckCircle2, Circle, Camera, Lock, AlertTriangle,
  RefreshCw, LayoutDashboard, Phone,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAuth } from '@/hooks/useAuth'
import { useOnboardingStore } from '@/store/onboarding.store'
import { StatusTracker } from '@/components/shared/StatusTracker'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STEPS = [
  { number: 1, label: 'Account & owner identity' },
  { number: 2, label: 'Property details & amenities' },
  { number: 3, label: 'Media & gallery' },
  { number: 4, label: 'Rooms & pricing' },
  { number: 5, label: 'Documents & KYC' },
  { number: 6, label: 'Bank & payouts' },
  { number: 7, label: 'Review & submit' },
]


export function OwnerStatusPage() {
  const { onboardingStatus } = useAuth()
  const navigate = useNavigate()
  const { completedSteps, currentStep, draftId } = useOnboardingStore(
    useShallow((s) => ({
      completedSteps: s.completedSteps,
      currentStep: s.currentStep,
      draftId: s.draftId,
    }))
  )

  // Refresh live status from backend if we have a draft ID
  const [liveTimeline, setLiveTimeline] = useState<{ label: string; status: 'done' | 'current' | 'pending'; at: string | null }[]>([])
  useEffect(() => {
    if (!draftId) return
    getPropertyStatus(draftId)
      .then((res) => { if (res.timeline) setLiveTimeline(res.timeline) })
      .catch(() => { /* use static fallback */ })
  }, [draftId])
  void liveTimeline // used by timeline renders below

  const firstIncompleteStep = STEPS.find((s) => !completedSteps.includes(s.number))?.number ?? currentStep ?? 1

  // ── Draft in Progress ─────────────────────────────────────────────────────
  if (onboardingStatus === 'in_progress' || onboardingStatus === 'not_started') {
    const doneCount = completedSteps.length
    const totalRequired = 7

    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Onboarding</p>
          <h1 className="font-display font-bold text-2xl text-navy-900 mt-1">Your application draft</h1>
          <p className="text-navy-500 text-sm mt-1">
            {doneCount === 0
              ? "You haven't started yet. Complete all 7 steps to go live."
              : `${doneCount} of ${totalRequired} steps complete — continue where you left off.`}
          </p>
        </div>

        {/* Progress summary */}
        <div className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-1">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-navy-900">Step progress</p>
            <Badge variant={doneCount === totalRequired ? 'green' : 'amber'}>
              {doneCount}/{totalRequired} complete
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-navy-100 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-primary-600 rounded-full transition-all"
              style={{ width: `${(doneCount / totalRequired) * 100}%` }}
            />
          </div>

          {/* Step list */}
          <div className="space-y-2">
            {STEPS.map(({ number, label }) => {
              const done = completedSteps.includes(number)
              const isCurrent = !done && number === firstIncompleteStep
              return (
                <button
                  key={number}
                  type="button"
                  onClick={() => navigate({ to: `/owner/onboarding/step${number}` as never })}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-[10px] p-3 text-left transition-colors',
                    done ? 'bg-success-50 hover:bg-success-50/80'
                      : isCurrent ? 'bg-primary-50 border border-primary-200 hover:bg-primary-50/80'
                      : 'bg-navy-50 hover:bg-navy-100',
                  )}
                >
                  {done
                    ? <CheckCircle2 size={18} className="text-success-700 shrink-0" />
                    : isCurrent
                    ? <Clock size={18} className="text-primary-600 shrink-0" />
                    : <Circle size={18} className="text-navy-300 shrink-0" />
                  }
                  <div className="flex-1">
                    <span className={cn(
                      'text-sm font-semibold',
                      done ? 'text-success-700' : isCurrent ? 'text-primary-700' : 'text-navy-500'
                    )}>
                      Step {number} — {label}
                    </span>
                  </div>
                  {isCurrent && (
                    <Badge variant="amber">Continue here</Badge>
                  )}
                  {done && (
                    <Badge variant="green">Done</Badge>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Primary CTA */}
        <Button
          className="w-full"
          size="lg"
          onClick={() => navigate({ to: `/owner/onboarding/step${firstIncompleteStep}` as never })}
        >
          {doneCount === 0 ? 'Start onboarding' : `Continue from Step ${firstIncompleteStep}`}
          <ArrowRight size={18} className="ml-2" />
        </Button>

        <p className="text-center text-xs text-navy-400">
          Your progress is auto-saved. You can return any time.
        </p>
      </div>
    )
  }

  // ── Submitted / Under review ─────────────────────────────────────────────
  if (onboardingStatus === 'submitted' || onboardingStatus === 'under_review') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-navy-900">Application status</h1>
          <p className="text-navy-500 text-sm mt-1">Track your property verification progress</p>
        </div>

        <StatusTracker status={onboardingStatus} referenceId={draftId ?? undefined} />

        {/* What's editable */}
        <div className="rounded-(--radius-lg) border border-border bg-white shadow-1 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="font-semibold text-navy-900">What you can update during review</p>
            <p className="text-xs text-navy-500 mt-0.5">
              Some sections are locked to protect the integrity of your KYC verification.
            </p>
          </div>

          <div className="divide-y divide-border">
            {/* Photos — EDITABLE */}
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-success-50 text-success-700 shrink-0">
                <Camera size={18} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-navy-900 text-sm">Media & gallery</p>
                <p className="text-xs text-navy-500 mt-0.5">
                  Add better photos anytime — helps the admin see your property clearly.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate({ to: '/owner/onboarding/step3' as never })}
              >
                Update photos
              </Button>
            </div>

            {/* All other steps — LOCKED */}
            {[
              { label: 'Owner identity & business details', step: 1 },
              { label: 'Property info, amenities & pricing policy', step: 2 },
              { label: 'Rooms & pricing', step: 4 },
              { label: 'Documents & KYC', step: 5 },
              { label: 'Bank & payouts', step: 6 },
            ].map(({ label, step }) => (
              <div key={step} className="flex items-center gap-4 px-5 py-3 bg-navy-50/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-navy-100 text-navy-400 shrink-0">
                  <Lock size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy-500">{label}</p>
                </div>
                <Badge variant="grey">Locked</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Support */}
        <div className="rounded-(--radius-lg) border border-border bg-white p-5 flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-50 text-primary-600 shrink-0">
            <Phone size={18} />
          </div>
          <div>
            <p className="font-semibold text-navy-900 text-sm">Need to make urgent changes?</p>
            <p className="text-xs text-navy-500 mt-0.5">
              Contact your onboarding manager at{' '}
              <a href="tel:+918049009000" className="text-primary-600 font-semibold hover:underline">
                +91 80-4900-9000
              </a>{' '}
              or email <span className="text-primary-600 font-semibold">partners@stayflex.in</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Revision requested ────────────────────────────────────────────────────
  if (onboardingStatus === 'revision_requested') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-navy-900">Revisions needed</h1>
          <p className="text-navy-500 text-sm mt-1">
            Our team has reviewed your application and needs a few changes before approval.
          </p>
        </div>

        <StatusTracker status={onboardingStatus} referenceId={draftId ?? undefined} />

        {/* Revision notes placeholder */}
        <div className="rounded-(--radius-lg) border border-warning-400 bg-warning-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-warning-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-navy-900">Reviewer notes</p>
              <ul className="mt-2 space-y-1.5 text-sm text-navy-600">
                <li>• Please upload a clearer photo of the property entrance</li>
                <li>• PAN card scan is blurry — re-upload a high-resolution copy</li>
                <li>• Update the description to include check-in timings</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick links to fix each step */}
        <div className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-1 space-y-3">
          <p className="font-semibold text-navy-900">Fix and resubmit</p>
          <p className="text-xs text-navy-500">All sections are unlocked. Update the flagged items and submit again.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {STEPS.slice(0, 6).map(({ number, label }) => (
              <button
                key={number}
                type="button"
                onClick={() => navigate({ to: `/owner/onboarding/step${number}` as never })}
                className="flex items-center gap-2.5 rounded-[10px] border border-border p-3 text-sm hover:bg-navy-50 hover:border-primary-300 transition-colors text-left"
              >
                <RefreshCw size={14} className="text-primary-600 shrink-0" />
                <span className="text-navy-700 font-medium">Step {number} — {label.split(' ').slice(0, 2).join(' ')}</span>
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={() => navigate({ to: '/owner/onboarding/step1' as never })}
        >
          <RefreshCw size={18} className="mr-2" />
          Review & resubmit
        </Button>
      </div>
    )
  }

  // ── Approved ──────────────────────────────────────────────────────────────
  if (onboardingStatus === 'approved') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
        <StatusTracker status="approved" referenceId={draftId ?? undefined} />
        <Button
          className="w-full"
          size="lg"
          onClick={() => navigate({ to: '/owner/dashboard' })}
        >
          <LayoutDashboard size={18} className="mr-2" />
          Go to your dashboard
        </Button>
      </div>
    )
  }

  // ── Rejected ──────────────────────────────────────────────────────────────
  if (onboardingStatus === 'rejected') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-navy-900">Application not approved</h1>
          <p className="text-navy-500 text-sm mt-1">Unfortunately we couldn't approve this listing.</p>
        </div>
        <StatusTracker status="rejected" referenceId={draftId ?? undefined} />
        <div className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-1">
          <p className="font-semibold text-navy-900 mb-2">Next steps</p>
          <p className="text-sm text-navy-600">
            Contact your onboarding manager to understand the reason and whether you can relist.
            Call{' '}
            <a href="tel:+918049009000" className="text-primary-600 font-semibold">+91 80-4900-9000</a>
            {' '}or email <span className="text-primary-600 font-semibold">partners@stayflex.in</span>
          </p>
        </div>
      </div>
    )
  }

  // ── Fallback (submitted / any other) ─────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      <div>
        <h1 className="font-display font-bold text-2xl text-navy-900">Application status</h1>
        <p className="text-navy-500 text-sm mt-1">Track your property verification progress</p>
      </div>
      <StatusTracker status={onboardingStatus} referenceId={draftId ?? undefined} />
    </div>
  )
}
