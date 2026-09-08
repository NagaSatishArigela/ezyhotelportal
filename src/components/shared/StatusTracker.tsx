import { Check, Clock, AlertCircle, XCircle, Zap, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OnboardingStatus } from '@/types'

interface StatusConfig {
  label: string
  description: string
  icon: React.ElementType
  colorClass: string
  bgClass: string
  borderClass: string
}

const STATUS_CONFIG: Record<OnboardingStatus, StatusConfig> = {
  not_started: {
    label: 'Not Started',
    description: 'Begin your property onboarding to list on EzyHotels.',
    icon: Clock, colorClass: 'text-navy-500', bgClass: 'bg-navy-50', borderClass: 'border-navy-200',
  },
  in_progress: {
    label: 'Draft in Progress',
    description: 'Complete all 6 steps to submit for review.',
    icon: Clock, colorClass: 'text-navy-500', bgClass: 'bg-navy-50', borderClass: 'border-navy-200',
  },
  submitted: {
    label: 'Submitted — Awaiting Review',
    description: 'Your application is in the queue. Admin review within 48 hours.',
    icon: Clock, colorClass: 'text-primary-600', bgClass: 'bg-primary-50', borderClass: 'border-primary-200',
  },
  under_review: {
    label: 'Under Review',
    description: 'An admin is currently reviewing your property details.',
    icon: Clock, colorClass: 'text-warning-600', bgClass: 'bg-warning-50', borderClass: 'border-warning-400',
  },
  revision_requested: {
    label: 'Revision Requested',
    description: 'Admin has flagged items that need your attention before approval.',
    icon: AlertCircle, colorClass: 'text-error-500', bgClass: 'bg-error-50', borderClass: 'border-error-500',
  },
  approved: {
    label: "Approved — You're Live!",
    description: 'Your property is live. Bookings are now enabled.',
    icon: Zap, colorClass: 'text-success-700', bgClass: 'bg-success-50', borderClass: 'border-success-500',
  },
  rejected: {
    label: 'Application Rejected',
    description: 'Admin has rejected this application. Contact support for details.',
    icon: XCircle, colorClass: 'text-error-700', bgClass: 'bg-error-50', borderClass: 'border-error-500',
  },
  suspended: {
    label: 'Listing Suspended',
    description: 'Your property has been suspended and is not currently accepting bookings. Contact support to resolve this.',
    icon: AlertCircle, colorClass: 'text-error-700', bgClass: 'bg-error-50', borderClass: 'border-error-500',
  },
}

// Single source of truth — STAGE_ORDER derived from TIMELINE_STAGES
const TIMELINE_STAGES = [
  { key: 'submitted'    as const, label: 'Submitted'   },
  { key: 'under_review' as const, label: 'Under Review' },
  { key: 'approved'     as const, label: 'Decision'    },
  { key: 'live'         as const, label: 'Live'        },
]
const STAGE_ORDER = TIMELINE_STAGES.map((s) => s.key)

interface StatusTrackerProps {
  status: OnboardingStatus
  referenceId?: string
}

export function StatusTracker({ status, referenceId }: StatusTrackerProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  const currentStageIdx = STAGE_ORDER.indexOf(status as typeof STAGE_ORDER[number])
  const showTimeline = ['submitted', 'under_review', 'approved'].includes(status)

  return (
    <div className={cn('rounded-(--radius-lg) border overflow-hidden', config.borderClass)}>
      {/* Radial gradient hero — per design spec */}
      <div className={cn('relative p-6', config.bgClass)}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(240,90,0,0.12) 0%, transparent 60%)' }}
          aria-hidden
        />

        <div className="relative text-center">
          {/* 72x72 icon circle with colored shadow — design spec */}
          <div className={cn(
            'w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto mb-[18px]',
            status === 'approved'
              ? 'bg-success-500 shadow-[0_8px_32px_rgba(34,197,94,0.35)]'
              : status === 'revision_requested' || status === 'rejected' || status === 'suspended'
              ? 'bg-error-500 shadow-[0_8px_32px_rgba(239,68,68,0.3)]'
              : 'bg-primary-600 shadow-[0_8px_32px_rgba(240,90,0,0.3)]',
          )}>
            <Icon size={36} className="text-white" aria-hidden />
          </div>

          {status === 'submitted' && (
            <p className="text-[11px] text-success-700 uppercase tracking-[0.8px] font-bold mb-1.5">
              Application submitted
            </p>
          )}

          <h2 className="font-display font-semibold text-[26px] text-navy-900 leading-tight mb-2">
            {status === 'submitted' ? "You're in our review queue" : config.label}
          </h2>
          <p className="text-[15px] text-navy-500 max-w-[520px] mx-auto leading-relaxed mb-4">
            {config.description}
          </p>

          {referenceId && (
            <p className="text-xs text-navy-500">
              Reference ID:{' '}
              <span className="font-mono text-primary-600 font-semibold">{referenceId}</span>
            </p>
          )}
        </div>

        {/* Inline-flex pill status tracker — design spec (not circles with connectors) */}
        {showTimeline && (
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center gap-4 bg-navy-50 rounded-full px-[22px] py-[14px]">
              {TIMELINE_STAGES.map((stage, i) => {
                const isDone    = i < currentStageIdx
                const isCurrent = i === currentStageIdx
                return (
                  <div key={stage.key} className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {/* 18x18 dot — design spec */}
                      <div className={cn(
                        'w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold',
                        isDone    && 'bg-success-500 text-white',
                        isCurrent && 'bg-primary-600 text-white',
                        !isDone && !isCurrent && 'bg-border text-navy-400',
                      )}>
                        {isDone ? <Check size={10} strokeWidth={3} aria-hidden /> : ''}
                      </div>
                      <span className={cn(
                        'text-[12.5px] font-semibold whitespace-nowrap',
                        isCurrent && 'text-primary-700 font-bold',
                        isDone    && 'text-navy-700',
                        !isDone && !isCurrent && 'text-navy-400',
                      )}>
                        {stage.label}
                      </span>
                    </div>
                    {i < TIMELINE_STAGES.length - 1 && (
                      <span className="text-navy-200 font-bold">—</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {status === 'submitted' && (
          <div className="mt-5 space-y-4">
            <p className="text-center text-sm font-medium text-navy-700">
              Please wait for your verification message. We will email you when your application is reviewed.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-[10px] border border-border bg-white/80 px-3 py-3 text-center">
                <Clock size={16} className="mx-auto mb-1 text-primary-600" aria-hidden />
                <p className="text-xs font-semibold text-navy-900">Verification</p>
                <p className="mt-0.5 text-xs text-navy-500">24–48 hours</p>
              </div>
              <div className="rounded-[10px] border border-border bg-white/80 px-3 py-3 text-center">
                <Mail size={16} className="mx-auto mb-1 text-primary-600" aria-hidden />
                <p className="text-xs font-semibold text-navy-900">Email notification</p>
                <p className="mt-0.5 text-xs text-navy-500">We will keep you posted</p>
              </div>
              <div className="rounded-[10px] border border-border bg-white/80 px-3 py-3 text-center">
                <Zap size={16} className="mx-auto mb-1 text-success-700" aria-hidden />
                <p className="text-xs font-semibold text-navy-900">Go live</p>
                <p className="mt-0.5 text-xs text-navy-500">Within 72 hours</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
