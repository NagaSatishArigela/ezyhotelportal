import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] select-none',
  {
    variants: {
      variant: {
        primary:   'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
        secondary: 'bg-white text-primary-600 border border-primary-600 hover:bg-primary-50',
        ghost:     'bg-transparent text-primary-600 hover:bg-primary-50',
        danger:    'bg-error-500 text-white hover:bg-error-700',
        dark:      'bg-navy-900 text-white hover:bg-navy-800',
        outline:   'bg-white text-navy-700 border border-border hover:bg-navy-50',
      },
      size: {
        sm:      'h-9 px-3 text-[13px] rounded-[8px]',
        default: 'h-11 px-5 text-[15px] rounded-[10px]',
        lg:      'h-[52px] px-6 text-[16px] rounded-[10px]',
        icon:    'h-10 w-10 rounded-[10px]',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'

export { Button }
