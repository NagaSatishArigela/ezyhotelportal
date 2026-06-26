import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex w-full rounded-[10px] border bg-white px-4 py-3 text-[15px] text-navy-900 placeholder:text-navy-400 outline-none transition-all resize-none',
        error
          ? 'border-error-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
          : 'border-border focus:border-primary-600 focus:shadow-[0_0_0_3px_rgba(255,143,0,0.15)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export { Textarea }
