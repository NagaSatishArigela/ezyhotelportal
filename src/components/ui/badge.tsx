import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
  {
    variants: {
      variant: {
        green:  'bg-success-50 text-success-700',
        amber:  'bg-primary-50 text-primary-700',
        red:    'bg-error-50 text-error-700',
        grey:   'bg-navy-100 text-navy-600',
        teal:   'bg-teal-50 text-teal-700',
        dark:   'bg-navy-800 text-white',
      },
    },
    defaultVariants: { variant: 'grey' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', {
          'bg-success-500': variant === 'green',
          'bg-primary-600': variant === 'amber',
          'bg-error-500':   variant === 'red',
          'bg-navy-400':    variant === 'grey',
          'bg-teal-500':    variant === 'teal',
        })} />
      )}
      {children}
    </span>
  )
}

export { Badge }
