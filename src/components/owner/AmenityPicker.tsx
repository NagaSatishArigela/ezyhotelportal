import { CheckCheck } from 'lucide-react'
import { amenityLabel, amenitiesForProperty, normalizeAmenity } from '@/lib/amenity-catalog'
import { cn } from '@/lib/utils'

export function AmenityPicker({ propertyType, value, onChange }: {
  propertyType: string
  value: string[]
  onChange: (value: string[]) => void
}) {
  const options = amenitiesForProperty(propertyType)
  const selected = [...new Set(value.map(normalizeAmenity))]
  const available = new Set(options.map(option => option.id))
  const previous = selected.filter(id => !available.has(id))
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2" aria-label="Available amenities">
        {options.map(({ id, label }) => {
          const checked = selected.includes(id)
          return <button key={id} type="button" aria-pressed={checked}
            onClick={() => onChange(checked ? selected.filter(item => item !== id) : [...selected, id])}
            className={cn('flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
              checked ? 'border-primary-600 bg-primary-50 text-primary-700 font-semibold' : 'border-border text-navy-600 hover:border-navy-300')}>
            {checked ? <CheckCheck size={14} className="shrink-0 text-primary-600" /> : <span className="h-3.5 w-3.5 shrink-0 rounded border border-current" aria-hidden />}
            <span className="text-xs">{label}</span>
          </button>
        })}
      </div>
      {previous.length > 0 && <div className="mt-4 rounded-lg border border-border p-3">
        <p className="text-sm font-semibold text-navy-700">Previously selected amenities</p>
        <p className="mb-2 text-xs text-navy-500">These selections are saved. Remove any that no longer apply to your property.</p>
        <div className="flex flex-wrap gap-2">{previous.map(id =>
          <button key={id} type="button" onClick={() => onChange(selected.filter(item => item !== id))}
            aria-label={`Remove ${amenityLabel(id)}`} className="rounded-lg border border-border px-3 py-2 text-xs text-navy-700">
            {amenityLabel(id)} ×
          </button>
        )}</div>
      </div>}
    </>
  )
}
