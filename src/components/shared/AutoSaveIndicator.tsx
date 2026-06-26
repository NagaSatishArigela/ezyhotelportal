import { Check, CloudOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOnboardingStore } from '@/store/onboarding.store'

export function AutoSaveIndicator({ className }: { className?: string }) {
  const state = useOnboardingStore((s) => s.autoSaveState)
  const lastSavedAt = useOnboardingStore((s) => s.lastSavedAt)

  if (state === 'idle') return null

  const timeAgo = lastSavedAt
    ? (() => {
        const diff = Math.round((Date.now() - new Date(lastSavedAt).getTime()) / 1000)
        if (diff < 5) return 'just now'
        if (diff < 60) return `${diff}s ago`
        return `${Math.round(diff / 60)}m ago`
      })()
    : null

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', className, {
      'text-navy-400': state === 'saving',
      'text-success-700': state === 'saved',
      'text-error-500': state === 'error',
    })}>
      {state === 'saving' && <Loader2 size={12} className="animate-spin" aria-hidden />}
      {state === 'saved'  && <Check size={12} aria-hidden />}
      {state === 'error'  && <CloudOff size={12} aria-hidden />}
      {state === 'saving' && 'Saving…'}
      {state === 'saved'  && `Saved ${timeAgo}`}
      {state === 'error'  && 'Save failed'}
    </span>
  )
}
