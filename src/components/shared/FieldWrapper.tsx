import { cn } from '@/lib/utils'

interface FieldWrapperProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

export function FieldWrapper({ label, error, hint, required, className, children }: FieldWrapperProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium text-navy-700">
          {label}
          {required && <span className="text-error-500 ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-navy-400">{hint}</p>}
      {error && (
        <p className="text-xs text-error-500" role="alert">{error}</p>
      )}
    </div>
  )
}
