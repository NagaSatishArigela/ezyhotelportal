import { detailGroups, propertyDetailsErrors, type PropertyDetails } from '@/lib/property-details'

export function PropertyDetailsFields({ propertyType, value, onChange, placement }: {
  propertyType: string; value: PropertyDetails; onChange: (next: PropertyDetails) => void; placement?: 'before' | 'after'
}) {
  const update = (id: string, next: PropertyDetails[string] | undefined) => {
    const values = { ...value }
    if (next === undefined) delete values[id]
    else values[id] = next
    onChange(values)
  }
  const inputClass = 'w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-primary-600'
  return <>
    {detailGroups(propertyType).filter(group => !placement || (placement === 'after') === (propertyType === 'banquet' && ['Decoration', 'Parking', 'Guest rooms / changing rooms', 'Other facilities'].includes(group.title))).map(group => <section key={group.title} className="rounded-2xl border border-border bg-white p-5">
      <h2 className="mb-4 font-bold text-navy-900">{group.title}</h2>
      {propertyType === 'farm' && group.title === 'Farm house details' && <p className="mb-4 text-sm text-navy-500">Use the selected land area unit for all areas. Guests must follow the farm rules.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {group.fields.map(field => {
          const selected = value[field.id]
          const id = 'property-detail-' + field.id
          return <div key={field.id} className={field.kind === 'multi' ? 'sm:col-span-2' : ''}>
            {field.kind === 'multi' ? <fieldset>
              <legend className="mb-2 text-sm font-semibold text-navy-700">{field.label}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {field.options?.map(option => <label key={option} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                  <input type="checkbox" className="accent-orange-600" checked={Array.isArray(selected) && selected.includes(option)}
                    onChange={event => update(field.id, event.target.checked ? [...(Array.isArray(selected) ? selected : []), option] : (Array.isArray(selected) ? selected : []).filter(item => item !== option))} />
                  {option}
                </label>)}
              </div>
            </fieldset> : <>
              <label htmlFor={id} className="mb-2 block text-sm font-semibold text-navy-700">{field.label}</label>
              {field.kind === 'select' || field.kind === 'boolean' ? <select id={id} className={inputClass}
                value={selected === undefined ? '' : String(selected)}
                onChange={event => update(field.id, event.target.value === '' ? undefined : field.kind === 'boolean' ? event.target.value === 'true' : event.target.value)}>
                <option value="">Select</option>
                {field.kind === 'boolean' ? <><option value="true">Yes</option><option value="false">No</option></> : field.options?.map(option => <option key={option}>{option}</option>)}
              </select> : <input id={id} className={inputClass} type={field.kind === 'number' ? 'number' : field.kind === 'time' ? 'time' : 'text'}
                min={field.kind === 'number' ? 0 : undefined} step={['totalLandArea', 'dryLand', 'wetLand', 'greenLand'].includes(field.id) ? 'any' : 1}
                maxLength={500} value={typeof selected === 'string' || typeof selected === 'number' ? selected : ''}
                onChange={event => update(field.id, event.target.value === '' ? undefined : field.kind === 'number' ? Number(event.target.value) : event.target.value)} />}
            </>}
          </div>
        })}
      </div>
    </section>)}
    {placement !== 'after' && propertyDetailsErrors(propertyType, value).map((error, index) => <p key={index} role="alert" className="text-sm text-error-500">{error}</p>)}
  </>
}
