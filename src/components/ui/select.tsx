import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'flex h-12 w-full appearance-none rounded-[10px] border bg-white px-4 pr-10 text-[15px] text-navy-900 outline-none transition-all',
          error
            ? 'border-error-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
            : 'border-border focus:border-primary-600 focus:shadow-[0_0_0_3px_rgba(240,90,0,0.15)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy-400"
        size={16}
        aria-hidden
      />
    </div>
  )
)
Select.displayName = 'Select'

export { Select }
