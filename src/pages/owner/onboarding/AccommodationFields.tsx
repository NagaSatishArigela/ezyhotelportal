import { FieldWrapper } from '@/components/shared/FieldWrapper'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  DORMITORY_SELECTS, OTHER_ACCOMMODATION_TYPES, OTHER_FACILITIES,
  type DormitoryDetails, type OtherAccommodation,
} from '@/lib/accommodation'

export function OtherAccommodationFields({ value = {}, onChange }: {
  value?: Partial<OtherAccommodation>
  onChange: (value: Partial<OtherAccommodation>) => void
}) {
  return (
    <section className="space-y-4" aria-label="Other accommodation facilities">
      <h2 className="font-display font-bold text-navy-900">Other accommodation facilities</h2>
      <p className="text-xs text-navy-500">Choose the accommodation type and answer every facility question.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FieldWrapper label="Type of accommodation" required>
          <Select aria-label="Type of accommodation" value={value.type ?? ''} onChange={(e) => onChange({ ...value, type: e.target.value ? e.target.value as OtherAccommodation['type'] : undefined })}>
            <option value="">Select type</option>
            {OTHER_ACCOMMODATION_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </Select>
        </FieldWrapper>
        {OTHER_FACILITIES.slice(0, 6).map(([key, label]) => (
          <FacilitySelect key={key} label={label} value={value[key]} onChange={(answer) => onChange({ ...value, [key]: answer })} />
        ))}
        <FieldWrapper label="Number of beds" required>
          <Select aria-label="Number of beds" value={value.numberOfBeds ?? ''} onChange={(e) => onChange({ ...value, numberOfBeds: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">Select number</option>
            {Array.from({ length: 500 }, (_, i) => i + 1).map((number) => <option key={number} value={number}>{number}</option>)}
          </Select>
        </FieldWrapper>
        {OTHER_FACILITIES.slice(6).map(([key, label]) => (
          <FacilitySelect key={key} label={label} value={value[key]} onChange={(answer) => onChange({ ...value, [key]: answer })} />
        ))}
      </div>
    </section>
  )
}

function FacilitySelect({ label, value, onChange }: {
  label: string
  value?: 'yes' | 'no'
  onChange: (value: 'yes' | 'no' | undefined) => void
}) {
  return (
    <FieldWrapper label={label} required>
      <Select aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value ? e.target.value as 'yes' | 'no' : undefined)}>
        <option value="">Select answer</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </Select>
    </FieldWrapper>
  )
}

export function DormitoryFields({ value = {}, onChange }: {
  value?: Partial<DormitoryDetails>
  onChange: (value: Partial<DormitoryDetails>) => void
}) {
  return (
    <section className="space-y-4" aria-label="Dormitory specifications">
      <h3 className="text-sm font-semibold text-navy-900">Dormitory specifications</h3>
      <p className="text-xs text-navy-500">Complete all specifications. Room capacity is set above.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FieldWrapper label="Room number / name" required>
          <Input aria-label="Room number / name" maxLength={100} value={value.roomName ?? ''} onChange={(e) => onChange({ ...value, roomName: e.target.value })} />
        </FieldWrapper>
        {DORMITORY_SELECTS.map(({ key, label, options }) => (
          <FieldWrapper key={key} label={label} required>
            <Select aria-label={label} value={value[key] ?? ''} onChange={(e) => onChange({ ...value, [key]: e.target.value || undefined })}>
              <option value="">Select option</option>
              {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
          </FieldWrapper>
        ))}
        {([
          ['totalBeds', 'Total beds in room', 1],
          ['bedLength', 'Bed length (cm)', 0.1],
          ['bedWidth', 'Bed width (cm)', 0.1],
        ] as const).map(([key, label, min]) => (
          <FieldWrapper key={key} label={label} required>
            <Input aria-label={label} type="number" min={min} max={500} step={min === 1 ? 1 : 0.1} value={value[key] ?? ''} onChange={(e) => onChange({ ...value, [key]: e.target.value ? Number(e.target.value) : undefined })} />
          </FieldWrapper>
        ))}
      </div>
      <fieldset>
        <legend className="text-sm font-semibold text-navy-700 mb-2">Linen provided</legend>
        <div className="flex flex-wrap gap-4">
          {(['Bedsheet', 'Pillow', 'Blanket'] as const).map((linen) => (
            <label key={linen} className="flex items-center gap-2 text-sm text-navy-600">
              <input type="checkbox" checked={value.linenProvided?.includes(linen) ?? false} onChange={(e) => onChange({
                ...value,
                linenProvided: e.target.checked ? [...(value.linenProvided ?? []), linen] : (value.linenProvided ?? []).filter((item) => item !== linen),
              })} />
              {linen}
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  )
}
