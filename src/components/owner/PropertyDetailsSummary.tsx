import { detailGroups } from '@/lib/property-details'
export function PropertyDetailsSummary({ propertyType, value }: { propertyType: string; value?: Record<string, unknown> | null }) {
  return <>{detailGroups(propertyType).map(group => {
    const fields = group.fields.filter(field => value?.[field.id] !== undefined)
    if (!fields.length) return null
    return <section key={group.title} className="rounded-xl border border-border bg-white p-4">
      <h3 className="mb-3 font-semibold text-navy-900">{group.title}</h3>
      <dl className="grid gap-3 sm:grid-cols-2">{fields.map(field => {
        const item = value?.[field.id]
        return <div key={field.id}><dt className="text-xs text-navy-500">{field.label}</dt>
          <dd className="text-sm text-navy-900">{Array.isArray(item) ? item.join(', ') : typeof item === 'boolean' ? item ? 'Yes' : 'No' : String(item)}</dd></div>
      })}</dl>
    </section>
  })}</>
}
