import { cn } from '@/lib/utils'

interface SectionCardProps {
  title?: string
  subtitle?: string
  className?: string
  children: React.ReactNode
  action?: React.ReactNode
}

export function SectionCard({ title, subtitle, className, children, action }: SectionCardProps) {
  return (
    <div className={cn('bg-white rounded-(--radius-lg) border border-border shadow-1 p-6', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-5">
          <div>
            {title && (
              <h3 className="text-xs font-bold text-navy-400 uppercase tracking-wider">{title}</h3>
            )}
            {subtitle && <p className="text-sm text-navy-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
