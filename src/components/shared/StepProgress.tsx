import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  number: number
  label: string
  sublabel?: string
}

interface StepProgressProps {
  steps: Step[]
  currentStep: number
  completedSteps: number[]
}

export function StepProgress({ steps, currentStep, completedSteps }: StepProgressProps) {
  return (
    <nav aria-label="Onboarding progress">
      {/* Single rail behind all circles — absolute positioned per design */}
      <div className="relative">
        <div className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-border" aria-hidden />
        <div className="space-y-0">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.number)
            const isCurrent   = step.number === currentStep
            const isPending   = !isCompleted && !isCurrent

            return (
              <div key={step.number} className="flex gap-[14px] relative pb-[18px] items-start">
                {/* Circle — 28x28, design spec */}
                <div className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold z-10 transition-colors",
                  isCompleted && "bg-primary-600 text-white",
                  // current: white bg + amber border (design spec — unfilled)
                  isCurrent  && "bg-white border-2 border-primary-600 text-primary-600",
                  isPending  && "bg-navy-100 text-navy-400",
                )}>
                  {isCompleted ? <Check size={14} strokeWidth={3} aria-hidden /> : step.number}
                </div>

                {/* Labels */}
                <div className="pt-0.5">
                  <p className={cn(
                    "text-[13.5px] leading-tight",
                    isCurrent   && "font-bold text-navy-900",
                    isCompleted && "font-semibold text-navy-900",
                    isPending   && "font-semibold text-navy-400",
                  )}>
                    {step.label}
                  </p>
                  {step.sublabel && (
                    <p className="text-[12px] text-navy-400 mt-0.5">{step.sublabel}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
