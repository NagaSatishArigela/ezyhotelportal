import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  error?: boolean
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, prefix, suffix, ...props }, ref) => {
    if (prefix || suffix) {
      return (
        <div className={cn(
          'flex items-center h-12 rounded-md border bg-white transition-all',
          error ? 'border-error-500 focus-within:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' : 'border-border focus-within:border-primary-600 focus-within:shadow-[0_0_0_3px_rgba(240,90,0,0.15)]',
          className
        )}>
          {prefix && <span className="pl-3 text-navy-500 text-sm shrink-0">{prefix}</span>}
          <input
            ref={ref}
            className="flex-1 h-full px-3 bg-transparent text-[15px] text-navy-900 placeholder:text-navy-400 outline-none"
            {...props}
          />
          {suffix && <span className="pr-3 text-navy-500 text-sm shrink-0">{suffix}</span>}
        </div>
      )
    }
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-12 w-full rounded-md border bg-white px-4 text-[15px] text-navy-900 placeholder:text-navy-400 outline-none transition-all',
          error
            ? 'border-error-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
            : 'border-border focus:border-primary-600 focus:shadow-[0_0_0_3px_rgba(240,90,0,0.15)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
